import { useMemo, useState, useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import useAudioSettings from "@/app/hooks/settings/useAudioSettings";
import useSpectrogramSettings from "@/app/hooks/settings/useSpectrogramSettings";

import AnnotationProgress from "@/lib/components/annotation/AnnotationProgress";
import AnnotationTaskBase from "@/lib/components/annotation/AnnotationTask";
import AnnotationTaskStatus from "@/lib/components/annotation_tasks/AnnotationTaskStatus";
import AnnotationTaskFilter from "@/lib/components/filters/AnnotationTaskFilter";

import useAnnotateTasks from "@/lib/hooks/annotation/useAnnotateTasks";
import useAnnotationTagPallete from "@/lib/hooks/annotation/useAnnotationTagPalette";

import type { AnnotationProject, AnnotationTask, SoundEventAnnotation } from "@/lib/types";

import ClipAnnotationNotes from "../clip_annotations/ClipAnnotationNotes";
import ClipAnnotationTags from "../clip_annotations/ClipAnnotationTags";
import SoundEventAnnotationList from "../sound_event_annotations/SoundEventAnnotationList";
import TagSearchBar from "../tags/TagSearchBar";
import ClipAnnotationSpectrogram from "./AnnotationClip";
import AnnotationContext from "./AnnotationContext";
import AnnotationTagPalette from "./AnnotationTagPalette";

export default function AnnotateTasks({
  annotationProject,
  annotationTask,
  initialSoundEventAnnotationUUID,
}: {
  annotationProject: AnnotationProject;
  annotationTask?: AnnotationTask;
  initialSoundEventAnnotationUUID?: string | null;
}) {
  const audioSettings = useAudioSettings();

  const spectrogramSettings = useSpectrogramSettings();

  const tagPalette = useAnnotationTagPallete();

  const [selectedSoundEventAnnotation, setSelectedSoundEventAnnotation] = useState<SoundEventAnnotation | null>(null);

  const filter = useMemo(
    () => ({ annotation_project: annotationProject }),
    [annotationProject],
  );

  const tasks = useAnnotateTasks({
    annotationTask,
    filter,
  });

  // Set the initial selected annotation based on the UUID parameter
  useEffect(() => {
    if (initialSoundEventAnnotationUUID && tasks.annotations.data?.sound_events) {
      const initialAnnotation = tasks.annotations.data.sound_events.find(
        annotation => annotation.uuid === initialSoundEventAnnotationUUID
      );
      if (initialAnnotation) {
        setSelectedSoundEventAnnotation(initialAnnotation);
      }
    }
  }, [initialSoundEventAnnotationUUID, tasks.annotations.data?.sound_events]);

  useHotkeys("n", tasks.nextTask, {
    description: "Go to next task",
  });

  useHotkeys("p", tasks.prevTask, {
    description: "Go to previous task",
  });

  useHotkeys("g", () => tasks.markCompleted.mutate(), {
    description: "Mark current task as completed",
  });

  useHotkeys("r", () => tasks.markRejected.mutate(), {
    description: "Mark current task as rejected (for review)",
  });

  useHotkeys("v", () => tasks.markVerified.mutate(), {
    description: "Mark current task as verified",
  });

  useHotkeys("c", () => tagPalette.clearTags(), {
    description: "Clear all tags from the tag palette",
  });

  return (
    <AnnotationTaskBase
      selectedTask={tasks.task}
      TaskStatus={
        <AnnotationTaskStatus
          task={tasks.task || undefined}
          onDone={tasks.markCompleted.mutate}
          onReview={tasks.markRejected.mutate}
          onVerify={tasks.markVerified.mutate}
          onRemoveBadge={tasks.removeBadge.mutate}
        />
      }
      Progress={
        <AnnotationProgress
          tasks={tasks.tasks}
          instructions={annotationProject.annotation_instructions || ""}
          onNext={tasks.nextTask}
          onPrevious={tasks.prevTask}
          current={tasks.current}
          filter={tasks.filter}
          fixedFilterFields={["annotation_project"]}
          onSetFilterField={tasks.setFilter}
          onClearFilterField={tasks.clearFilter}
          FilterMenu={() => (
            <AnnotationTaskFilter
              filter={tasks.filter}
              onChangeField={tasks.setFilter}
              onClearField={tasks.clearFilter}
              TagSearchBar={TagSearchBar}
            />
          )}
        />
      }
      Context={
        tasks.task != null ? (
          <AnnotationContext task={tasks.task} onTagClick={tagPalette.addTag} />
        ) : undefined
      }
      TagPalette={
        <AnnotationTagPalette
          tags={tagPalette.tags}
          clipAnnotation={tasks.annotations.data}
          onAddTag={tagPalette.addTag}
          onRemoveTag={tagPalette.removeTag}
        />
      }
      AnnotationList={
        tasks.annotations.data != null ? (
          <SoundEventAnnotationList
            clipAnnotation={tasks.annotations.data}
            selectedAnnotation={selectedSoundEventAnnotation}
            onSelectAnnotation={setSelectedSoundEventAnnotation}
          />
        ) : undefined
      }
      ClipTags={
        tasks.annotations.data != null ? (
          <ClipAnnotationTags clipAnnotation={tasks.annotations.data} />
        ) : undefined
      }
      ClipNotes={
        tasks.annotations.data != null ? (
          <ClipAnnotationNotes clipAnnotation={tasks.annotations.data} />
        ) : undefined
      }
      Spectrogram={
        tasks.annotations.data != null ? (
          <ClipAnnotationSpectrogram
            clipAnnotation={tasks.annotations.data}
            audioSettings={audioSettings}
            spectrogramSettings={spectrogramSettings}
            tagPalette={tagPalette}
            initialSoundEventAnnotationUUID={initialSoundEventAnnotationUUID}
            selectedSoundEventAnnotation={selectedSoundEventAnnotation}
            onSelectedSoundEventAnnotationChange={setSelectedSoundEventAnnotation}
          />
        ) : undefined
      }
    />
  );
}
