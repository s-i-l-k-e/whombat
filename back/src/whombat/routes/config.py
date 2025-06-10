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
    protocol = "https" if settings.frontend_port == 443 else "http"
    port_suffix = "" if settings.frontend_port in (80, 443) else f":{settings.frontend_port}"
    frontend_url = f"{protocol}://{settings.domain}{port_suffix}"
    
    return FrontendConfig(frontend_url=frontend_url)