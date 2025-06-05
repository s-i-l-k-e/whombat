"""Module containing the router for the Auth."""

from fastapi import APIRouter, HTTPException
from starlette.requests import Request

__all__ = [
    "get_auth_router",
]


def get_auth_router() -> APIRouter:
    auth_router = APIRouter()

    @auth_router.get("/me")
    async def get_current_user(request: Request):
        """Get the current authenticated user's information."""
        if not hasattr(request.state, "user"):
            raise HTTPException(status_code=401, detail="Not authenticated")
        return request.state.user

    return auth_router

