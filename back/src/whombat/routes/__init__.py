"""Whombat REST API routes."""

from fastapi import APIRouter
from fastapi.params import Depends

from whombat.core.azure_auth import AzureADAuth
from whombat.routes.annotation_projects import annotation_projects_router
from whombat.routes.annotation_tasks import get_annotation_tasks_router
from whombat.routes.audio import audio_router
from whombat.routes.auth import get_auth_router
from whombat.routes.clip_annotations import get_clip_annotations_router
from whombat.routes.clip_evaluations import clip_evaluations_router
from whombat.routes.clip_predictions import clip_predictions_router
from whombat.routes.clips import clips_router
from whombat.routes.datasets import dataset_router
from whombat.routes.evaluation_sets import evaluation_sets_router
from whombat.routes.evaluations import evaluations_router
from whombat.routes.features import features_router
from whombat.routes.model_runs import model_runs_router
from whombat.routes.notes import notes_router
from whombat.routes.plugins import plugin_router
from whombat.routes.recordings import get_recording_router
from whombat.routes.sound_event_annotations import (
    get_sound_event_annotations_router,
)
from whombat.routes.sound_event_evaluations import (
    sound_event_evaluations_router,
)
from whombat.routes.sound_event_predictions import (
    sound_event_predictions_router,
)
from whombat.routes.sound_events import sound_events_router
from whombat.routes.spectrograms import spectrograms_router
from whombat.routes.tags import tags_router
from whombat.routes.user_runs import get_user_runs_router
from whombat.system.settings import Settings

__all__ = [
    "get_main_router",
]


def get_main_router(settings: Settings):
    auth_middleware = AzureADAuth(settings)
    main_router = APIRouter(prefix="/api/v1")

    # Admin
    auth_router = get_auth_router()
    main_router.include_router(
        auth_router,
        prefix="/auth",
        tags=["Auth"],
        dependencies=[Depends(auth_middleware)]
    )
    main_router.include_router(
        tags_router,
        prefix="/tags",
        tags=["Tags"],
        dependencies=[Depends(auth_middleware)]
    )
    main_router.include_router(
        features_router,
        prefix="/features",
        tags=["Features"],
        dependencies=[Depends(auth_middleware)]
    )
    main_router.include_router(
        notes_router,
        prefix="/notes",
        tags=["Notes"],
        dependencies=[Depends(auth_middleware)]
    )

    # Audio Metadata
    recording_router = get_recording_router(settings)
    main_router.include_router(
        recording_router,
        prefix="/recordings",
        tags=["Recordings"],
        dependencies=[Depends(auth_middleware)]
    )
    main_router.include_router(
        dataset_router,
        prefix="/datasets",
        tags=["Datasets"],
        dependencies=[Depends(auth_middleware)]
    )

    # Audio Content
    main_router.include_router(
        audio_router,
        prefix="/audio",
        tags=["Audio"],
    )
    main_router.include_router(
        spectrograms_router,
        prefix="/spectrograms",
        tags=["Spectrograms"],
    )

    # Acoustic Objects
    main_router.include_router(
        sound_events_router,
        prefix="/sound_events",
        tags=["Sound Events"],
        dependencies=[Depends(auth_middleware)]
    )
    main_router.include_router(
        clips_router,
        prefix="/clips",
        tags=["Clips"],
        dependencies=[Depends(auth_middleware)]
    )

    # Annotation
    sound_event_annotations_router = get_sound_event_annotations_router(
        settings
    )
    main_router.include_router(
        sound_event_annotations_router,
        prefix="/sound_event_annotations",
        tags=["Sound Event Annotations"],
        dependencies=[Depends(auth_middleware)]
    )
    clip_annotations_router = get_clip_annotations_router(settings)
    main_router.include_router(
        clip_annotations_router,
        prefix="/clip_annotations",
        tags=["Clip Annotations"],
        dependencies=[Depends(auth_middleware)]
    )
    annotation_tasks_router = get_annotation_tasks_router(settings)
    main_router.include_router(
        annotation_tasks_router,
        prefix="/annotation_tasks",
        tags=["Annotation Tasks"],
        dependencies=[Depends(auth_middleware)]
    )
    main_router.include_router(
        annotation_projects_router,
        prefix="/annotation_projects",
        tags=["Annotation Projects"],
        dependencies=[Depends(auth_middleware)]
    )

    # Predictions
    main_router.include_router(
        sound_event_predictions_router,
        prefix="/sound_event_predictions",
        tags=["Sound Event Predictions"],
        dependencies=[Depends(auth_middleware)]
    )
    main_router.include_router(
        clip_predictions_router,
        prefix="/clip_predictions",
        tags=["Clip Predictions"],
        dependencies=[Depends(auth_middleware)]
    )
    main_router.include_router(
        model_runs_router,
        prefix="/model_runs",
        tags=["Model Runs"],
        dependencies=[Depends(auth_middleware)]
    )
    user_runs_router = get_user_runs_router(settings)
    main_router.include_router(
        user_runs_router,
        prefix="/user_runs",
        tags=["User Runs"],
        dependencies=[Depends(auth_middleware)]
    )

    # Evaluation
    main_router.include_router(
        sound_event_evaluations_router,
        prefix="/sound_event_evaluations",
        tags=["Sound Event Evaluations"],
        dependencies=[Depends(auth_middleware)]
    )
    main_router.include_router(
        clip_evaluations_router,
        prefix="/clip_evaluations",
        tags=["Clip Evaluations"],
        dependencies=[Depends(auth_middleware)]
    )
    main_router.include_router(
        evaluation_sets_router,
        prefix="/evaluation_sets",
        tags=["Evaluation Sets"],
        dependencies=[Depends(auth_middleware)]
    )
    main_router.include_router(
        evaluations_router,
        prefix="/evaluations",
        tags=["Evaluations"],
        dependencies=[Depends(auth_middleware)]
    )

    # Extensions
    main_router.include_router(
        plugin_router,
        prefix="/plugins",
        tags=["Plugins"],
        dependencies=[Depends(auth_middleware)]
    )

    return main_router
