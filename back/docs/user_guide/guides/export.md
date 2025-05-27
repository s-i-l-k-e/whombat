# Export Annotations for ML Development

**Whombat** is degined to facilitate the generation of high-quality labeled audio data.
But the real utility comes from using that data to train machine learning models.
This guide will show you how to take your Whombat annotations and build a simple species classifier in Python

## Data formats

Before we dive into the practical steps, let's take a moment to understand the importance of data formats in audio annotation.
The bioacoustics field employs various formats, such as Praat text files, Audacity annotations, and Raven annotations.
While these formats serve their purpose, they often present limitations:

1. They don't export all necessary metadata, such as recording info, tags, and user actions.
2. They lack information on annotation completeness and can't indicate if a clip or whole recording was annotated.
3. They have rigid ways of representing the ROI of a sound event.

To overcome these challenges and ensure that your valuable annotation data is fully preserved and readily usable for machine learning, Whombat utilizes a custom format called the Acoustic Object Exchange Format (AOEF).
This JSON-based format retains all the essential data and rich metadata required for effective model development.

## Exporting Your Work from Whombat

**Whombat** provides a convenient way to export your work, allowing you to share data and collaborate with others.
You can export various types of information:

- **Datasets**: Share the meticulously curated metadata of your recordings with colleagues or collaborators.
- **Annotation Projects**: Export complete annotation projects, including all annotations, user information, timestamps, and annotation statuses.
    This provides a comprehensive record of the annotation process.
- **Evaluation Sets**: Share predefined evaluation sets, containing specific clips and target sounds, to ensure standardized model evaluation and comparison across different teams or researchers.
- **Evaluations**: Download the results of model evaluations.
    This includes overall scores, detailed metrics, and a breakdown of individual predictions, facilitating in-depth analysis and transparent reporting of model performance.

## How to Export

Exporting your data from Whombat is a straightforward process:

1. **Navigate to the Detail View**: Open the detail view of the dataset, annotation project, evaluation set, or evaluation that you wish to export.
2. **Click "Download"**: In the top right section of the page, you'll find a "Download" button.
      Click this button to initiate the download process.
3. **Wait for File Preparation**: Whombat will prepare the export file, which may take a few seconds depending on the size of the data.
4. **Access the Downloaded File**: Once the download is complete, the file will be saved to your designated "Downloads" folder.

Exported files will have a descriptive filename.
For example, a downloaded dataset might have a name like: `dataset-3u98gjp294rn9p8sd.json`

The unique ID following the hyphen identifies the specific dataset.
Each exported file also includes information about the export timestamp, allowing you to keep track of different versions.

## Loading Annotations with `soundevent`

The `soundevent` library is a helpful tool for working with audio annotation data in Python.
It provides convenient functions for loading, manipulating, and analysing the annotated audio files as exported from Whombat.
We'll use it to load the exported JSON file from Whombat into a `soundevent.data.AnnotationProject` object.

```python
from soundevent import data, io

annotation_project = io.load("example_annotation_project.json")
```

This `AnnotationProject` object mirrors how Whombat organizes annotation data in its database.
Let's explore its contents:

```python
# See how many annotation tasks are in the project
print("Annotation tasks ", len(annotation_project.tasks))

# Check the number of annotation tags used
print("Annotation tags: ", len(annotation_project.annotation_tags))
```

## Data Cleaning and Preprocessing

Before we start building our classifier, it's essential to clean up our data.
This involves removing any incomplete or problematic annotations that could negatively impact the model's performance.

In this example, we'll filter out tasks that are not marked as complete or have associated issues.

```python
def task_is_complete(task: data.AnnotationTask) -> bool:
    """Check if an annotation task is complete.

    A task is considered complete if it has a 'completed' status badge
    and does not have a 'rejected' badge (indicating it needs review).
    """
    for badge in task.status_badges:
        if badge.state == data.AnnotationState.rejected:
            # Task needs review, so it's not considered complete.
            return False

        if badge.state == data.AnnotationState.completed:
            # Task is explicitly marked as complete.
            return True

    # If no 'completed' badge is found, the task is not complete.
    return False


# Create a dictionary mapping clip UUIDs to their completion status.
clip_status = {
    task.clip.uuid: task_is_complete(task)
    for task in annotation_project.tasks
}


def clip_annotation_is_complete(annotation: data.ClipAnnotation) -> bool:
    """Check if a clip annotation is complete based on its task status."""
    if annotation.clip.uuid not in clip_status:
        # If the clip is not part of the project's tasks, ignore it.
        return False

    # Return the pre-computed completion status from the clip_status dictionary.
    return clip_status[annotation.clip.uuid]


def clip_annotation_has_issues(annotation: data.ClipAnnotation) -> bool:
    """Check if a clip annotation has any associated issues."""
    return any(note.is_issue for note in annotation.notes)


# Filter the clip annotations to include only those that are complete and have
# no issues.
annotated_clips = [
    annotation
    for annotation in annotation_project.clip_annotations
    if not clip_annotation_has_issues(annotation)
    and clip_annotation_is_complete(annotation)
]
```

## Preparing for Model Training: Train-Test Split and Evaluation Set

Now that we have a clean set of annotated clips, let's prepare the data for training a machine learning model.
This involves two key steps:

- **Splitting the data into training and testing sets**: This is crucial to evaluate how well our model generalizes to unseen data.
- **Creating an evaluation set**: This allows for standardized evaluation and comparison of different models.

### Splitting into Training and Testing Sets

This annotation project focuses on classifying bat species based on their echolocation calls.
However, there's a limitation: each species is represented by only one recording.
Ideally, we'd have multiple recordings per species to ensure a more robust and representative split.
While this isn't the case here, we'll proceed with the example for illustration purposes.

First, we'll extract the species information from each `ClipAnnotation` object.
Remember that each clip is derived from a longer recording, and the recording has associated tags, including the species.

```python
from sklearn.model_selection import train_test_split

example_annotation = annotated_clips[0]
recording = example_annotation.clip.recording

for tag in recording.tags:
    print(repr(tag))
```

Next, we'll determine the species of each clip and count how many examples we have per species.
To avoid issues with species having only one example, we'll exclude those for now.

```python
from collections import Counter

y_true = [
    data.find_tag(annotation.clip.recording.tags, "species").value
    for annotation in annotated_clips
]

examples_per_species = Counter(y_true)

annotated_clips, y_true = zip(
    *[
        (annotation, species)
        for annotation, species in zip(annotated_clips, y_true)
        if examples_per_species[species] > 1
    ]
)
```

We'll use the `train_test_split` function from scikit-learn to divide our data.
We'll perform a stratified split based on species to ensure a balanced representation in both training and testing sets.

```python
seed = 42
train_clips, test_clips, y_train, y_test = train_test_split(
    annotated_clips,
    y_true,
    test_size=0.3,  # 30 % of the data will be used for testing
    stratify=y_true,
    random_state=seed,
)
```

### Creating an Evaluation Set

An evaluation set allows us to assess the performance of our trained model on a held-out portion of the data.
This set can be saved to a file and shared, enabling others to evaluate their models on the same data and compare results.

To create an evaluation set, we need to define:

- **Target sounds**: The specific sounds or categories we want to evaluate.
    In this case, our target is the "species" tag.
- **Examples**: The specific annotated clips that will be used for evaluation.
    Here, we'll use the `test_clips` we created earlier.

```python
evaluation_tags = {
    data.find_tag(annotation.clip.recording.tags, "species")
    for annotation in test_clips
}
```

Now, let's construct the EvaluationSet object.

```python
import uuid

# Ignore this bit, it is just to make sure the uuid is unique but still
# deterministic
namespace = uuid.uuid5(uuid.NAMESPACE_DNS, "whombat")
evaluation_set_uuid = uuid.uuid5(namespace, "Example Evaluation Set")

# Now we can define the evaluation set
evaluation_set = data.EvaluationSet(
    uuid=evaluation_set_uuid,
    name="Example evaluation set",
    description="Example evaluation set for species classification",
    clip_annotations=test_clips,
    evaluation_tags=list(evaluation_tags),
)
```

Finally, we can save the evaluation set to a JSON file.

```python
io.save(evaluation_set, "example_evaluation_set.json")
```

This saved file can be easily loaded back into Python or even imported back into **Whombat**, allowing you to upload and analyze model predictions on this standardized evaluation set.

## Create a Simple Classifier with Features

In this section, we'll create a basic bat species classifier using manually engineered acoustic features.
This approach, common before the deep learning era, involves extracting specific features from echolocation calls and using them to train a machine learning model.

We'll use three readily available features from our annotated data:

- **Duration**: The length of the echolocation call.
- **Lowest Frequency**: The lowest frequency present in the call.
- **Highest Frequency**: The highest frequency present in the call.

These features can be derived directly from the bounding boxes we've annotated around each call.
Our classifier will attempt to predict the species of a bat based on these features.

### Collecting Training Data

First, let's gather all the annotated sound events from our training set.

```python
train_sound_events = [
    sound_event_annotation
    for clip_annotation in train_clips
    for sound_event_annotation in clip_annotation.sound_events
]
print(len(train_sound_events))
```

### Extracting Features

Now for each annotated sound event we will get all the features.

```python
def get_features(sound_event: data.SoundEvent) -> tuple[float, float, float]:
    """
    Extract acoustic features from a SoundEvent object.
    """
    return (
        data.find_feature(sound_event.features, "duration").value,
        data.find_feature(sound_event.features, "low_freq").value,
        data.find_feature(sound_event.features, "high_freq").value,
    )


X_train = [
    get_features(annotation.sound_event)
    for annotation in train_sound_events
]
```

### Extracting Species Labels

Now, let's extract the corresponding species label for each sound event.

```python
y_train = [
    data.find_tag(annotation.tags, "species").value
    for annotation in train_sound_events
]
```

### Model Training

With our features and labels prepared, we can now train a simple classifier.
We'll use a linear Support Vector Machine (SVM) for this purpose.

```python
from sklearn.svm import SVC

seed = 42
model = SVC(kernel="linear", random_state=seed)

model.fit(X_train, y_train)
```

### Generating Predictions

Let's use our trained model to predict the species of calls in the evaluation set.
For each clip, we'll iterate through the annotated sound events, extract the features, and use the model to predict the species.
We'll then attach this prediction as a `PredictedTag` to the sound event.

```python
model_run_uuid = uuid.uuid5(namespace, "Example Model Run (Features)")


def predict_sound_event(sound_event: data.SoundEvent):
    """
    Predict the species of a sound event and create a SoundEventPrediction.
    """
    features = get_features(sound_event)
    species = model.predict([features])[0]
    return data.SoundEventPrediction(
        tags=[
            data.PredictedTag(
                tag=data.Tag(key="species", value=species),
                score=1,
            )
        ],
        sound_event=sound_event,
        uuid=uuid.uuid5(model_run_uuid, f"sound_event_prediction_{sound_event.uuid}"),
    )


def process_clip(clip_annotation: data.ClipAnnotation):
    """
    Generate predictions for all sound events in a clip.
    """
    return data.ClipPrediction(
        clip=clip_annotation.clip,
        sound_events=[
            predict_sound_event(annotation.sound_event)
            for annotation in clip_annotation.sound_events
        ],
        uuid=uuid.uuid5(model_run_uuid, f"clip_prediction_{clip_annotation.uuid}"),
    )


predictions = [
    process_clip(clip_annotation)
    for clip_annotation in evaluation_set.clip_annotations
]
```

### Saving Model Predictions

We can now store these predictions in a `ModelRun` object and save it to a file.

```python
model_run = data.ModelRun(
    uuid=model_run_uuid,
    name="Support Vector Machine for Bats",
    # Usually you will continue to improve your model so it is a good
    # idea to provide a version number
    version="1.0",
    description="Model run using manually engineered features",
    clip_predictions=predictions,
)

io.save(model_run, "example_model_run.json")
```

This file can be imported into **Whombat** to visualize and analyze the model's predictions on the evaluation set.

### Evaluating the Model

Now that we have predictions from our bat species classifier, let's evaluate how well it performs.
We can use the `soundevent` library's `soundevent.evaluation.sound_event_detection` function to compare our model's predictions to the ground truth annotations in the evaluation set.

```python
from soundevent import evaluation

result = evaluation.sound_event_detection(
    clip_predictions=model_run.clip_predictions,
    clip_annotations=evaluation_set.clip_annotations,
    tags=evaluation_set.evaluation_tags,
)
```

The sound_event_detection function is designed to assess a model's ability to both detect sound events (i.e., locate them in the audio) and classify them (i.e., assign the correct species label).
It works by trying to match predicted sound events to the annotated sound events and then evaluating the accuracy of the species predictions.

In our case, we've simplified the task by providing the model with the exact locations of the sound events.
Our model doesn't actually perform sound event detection; it only performs classification.
Think of it as if we've already perfectly detected the bat calls, and now we're just assessing how well the model can identify the species of each call.

Therefore, this evaluation primarily focuses on the species classification accuracy.
The `sound_event_detection` function will still attempt to match predictions to annotations, but since we've provided the locations, all annotations will be perfectly matched with a prediction.

### Analyzing the Results

The sound_event_detection function returns an Evaluation object, which provides a wealth of information about the model's performance:

- **Overall Score**: A summary metric representing the overall performance.
- **Additional Metrics**: Other metrics like precision, recall, and F1-score, providing a more nuanced view of the model's capabilities.
- **Example-by-Example Breakdown**: A detailed analysis of how the model performed on each individual sound event, including which ones were misclassified.

This detailed breakdown is incredibly valuable for understanding the model's strengths and weaknesses.
You can identify patterns in the misclassifications, which might reveal areas where the model struggles or where the features are not informative enough.

```python
# Let's print out the overall score
print(f"Overall score: {result.score:.2%}")

# And all the global metrics
for metric in result.metrics:
    print(f"metric - {metric.name} - {metric.value:.2%}")
```

### Sharing the Evaluation

The `Evaluation` object can also be saved to a file, which can be shared with others to provide transparency about the model's performance.
This allows others to see exactly where the model succeeded and where it failed, facilitating further analysis and comparison with other models.

## Conclusions

This guide has demonstrated how to leverage annotated audio data from Whombat to train a machine learning model for bat species classification.
We covered key steps, including loading and preprocessing annotation data, splitting data into training and testing sets, creating an evaluation set, extracting features, training a simple classifier, and evaluating its performance.

While our example focused on a basic classifier using manually engineered features, the underlying principles and workflow apply to more complex models and tasks.
You can adapt and extend these techniques to explore different feature extraction methods, experiment with various machine learning algorithms (including deep learning), and tackle diverse audio analysis challenges.
