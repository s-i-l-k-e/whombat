"""Config routes for whombat."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from whombat.routes.dependencies.settings import get_settings
from whombat.system.settings import Settings

__all__ = [
    "config_router",
    "FrontendConfig",
]

class FrontendConfig(BaseModel):
    """Frontend configuration."""
    
    frontend_url: str
    """The full URL where the frontend is accessible."""

config_router = APIRouter()

@config_router.get("/frontend", response_model=FrontendConfig)
def get_frontend_config(
    settings: Settings = Depends(get_settings),
) -> FrontendConfig:
    """Get frontend configuration."""
    return FrontendConfig(frontend_url=settings.domain)