"""REST API routes for annotation projects."""

from typing import Annotated
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, UploadFile
from fastapi.responses import Response
from soundevent.io.aoef import to_aeof

from whombat import api, schemas
from whombat.api.io import aoef
from whombat.filters.annotation_projects import AnnotationProjectFilter
from whombat.routes.dependencies import Session, WhombatSettings
from whombat.routes.types import Limit, Offset
from whombat.system.settings import get_settings


__all__ = [
    "annotation_projects_router",
]


annotation_projects_router = APIRouter()


@annotation_projects_router.get(
    "/",
    response_model=schemas.Page[schemas.AnnotationProject],
)
async def get_annotation_projects(
    session: Session,
    filter: Annotated[
        AnnotationProjectFilter, Depends(AnnotationProjectFilter)  # type: ignore
    ],
    limit: Limit = 10,
    offset: Offset = 0,
):
    """Get a page of annotation projects."""
    projects, total = await api.annotation_projects.get_many(
        session,
        limit=limit,
        offset=offset,
        filters=[filter],
    )
    return schemas.Page(
        items=projects,
        total=total,
        limit=limit,
        offset=offset,
    )


@annotation_projects_router.post(
    "/",
    response_model=schemas.AnnotationProject,
)
async def create_annotation_project(
    session: Session,
    data: schemas.AnnotationProjectCreate,
):
    """Create an annotation project."""
    annotation_project = await api.annotation_projects.create(
        session,
        name=data.name,
        description=data.description,
        annotation_instructions=data.annotation_instructions,
    )
    await session.commit()
    return annotation_project


@annotation_projects_router.get(
    "/detail/",
    response_model=schemas.AnnotationProject,
)
async def get_annotation_project(
    session: Session,
    annotation_project_uuid: UUID,
):
    """Get an annotation project."""
    return await api.annotation_projects.get(session, annotation_project_uuid)


@annotation_projects_router.patch(
    "/detail/",
    response_model=schemas.AnnotationProject,
)
async def update_annotation_project(
    session: Session,
    annotation_project_uuid: UUID,
    data: schemas.AnnotationProjectUpdate,
):
    """Update an annotation project."""
    annotation_project = await api.annotation_projects.get(
        session,
        annotation_project_uuid,
    )
    annotation_project = await api.annotation_projects.update(
        session,
        annotation_project,
        data,
    )
    await session.commit()
    return annotation_project


@annotation_projects_router.delete(
    "/detail/",
    response_model=schemas.AnnotationProject,
)
async def delete_annotation_project(
    session: Session,
    annotation_project_uuid: UUID,
):
    """Delete an annotation project."""
    annotation_project = await api.annotation_projects.get(
        session,
        annotation_project_uuid,
    )
    project = await api.annotation_projects.delete(session, annotation_project)
    await session.commit()
    return project


@annotation_projects_router.post(
    "/detail/tags/",
    response_model=schemas.AnnotationProject,
)
async def add_tag_to_annotation_project(
    session: Session,
    annotation_project_uuid: UUID,
    key: str,
    value: str,
):
    """Add a tag to an annotation project."""
    annotation_project = await api.annotation_projects.get(
        session,
        annotation_project_uuid,
    )
    tag = await api.tags.get(session, (key, value))
    project = await api.annotation_projects.add_tag(
        session,
        annotation_project,
        tag,
    )
    await session.commit()
    return project


@annotation_projects_router.delete(
    "/detail/tags/",
    response_model=schemas.AnnotationProject,
)
async def remove_tag_from_annotation_project(
    session: Session,
    annotation_project_uuid: UUID,
    key: str,
    value: str,
):
    """Remove a tag from an annotation project."""
    annotation_project = await api.annotation_projects.get(
        session,
        annotation_project_uuid,
    )
    tag = await api.tags.get(session, (key, value))
    project = await api.annotation_projects.remove_tag(
        session,
        annotation_project,
        tag,
    )
    await session.commit()
    return project


@annotation_projects_router.get(
    "/detail/download/",
    response_model=schemas.Page[schemas.Recording],
)
async def download_annotation_project(
    session: Session,
    annotation_project_uuid: UUID,
):
    """Export an annotation project."""
    whombat_project = await api.annotation_projects.get(
        session, annotation_project_uuid
    )
    project = await api.annotation_projects.to_soundevent(
        session, whombat_project
    )
    base_dir: Path = await api.annotation_projects.get_base_dir(
        session, whombat_project
    )
    audio_dir = get_settings().audio_dir
    settings = get_settings()

    obj = to_aeof(project, audio_dir=audio_dir / base_dir)
    filename = f"{project.name}_{obj.created_on.isoformat()}.json"
    
    # Get the JSON and modify it to add URLs
    import json
    json_content = obj.model_dump_json()
    obj_dict = json.loads(json_content)
    
    # Construct base URL from domain and frontend port
    if settings.frontend_port in (80, 443):
        # Standard HTTP/HTTPS ports - don't include port in URL
        protocol = "https" if settings.frontend_port == 443 else "http"
        base_url = f"{protocol}://{settings.domain}"
    else:
        # Non-standard port - include it in the URL
        base_url = f"http://{settings.domain}:{settings.frontend_port}"
    
    # Add URLs to sound event annotations
    obj_dict = obj_dict['data']
    if 'sound_event_annotations' in obj_dict:
        for sound_event_annotation in obj_dict['sound_event_annotations']:
            if 'uuid' in sound_event_annotation:
                sound_event_annotation['whombat_url'] = f"{base_url}/sound_event_annotations?uuid={sound_event_annotation['uuid']}"
    
    # Convert back to JSON
    modified_json = json.dumps(obj_dict, indent=2)
    
    return Response(
        modified_json,
        media_type="application/json", 
        status_code=200,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@annotation_projects_router.post(
    "/import/",
    response_model=schemas.AnnotationProject,
)
async def import_annotation_project(
    settings: WhombatSettings,
    session: Session,
    annotation_project: UploadFile,
):
    """Import an annotation project."""
    db_project = await aoef.import_annotation_project(
        session,
        annotation_project.file,
        audio_dir=settings.audio_dir,
        base_audio_dir=settings.audio_dir,
    )
    await session.commit()
    await session.refresh(db_project)
    return schemas.AnnotationProject.model_validate(db_project)
