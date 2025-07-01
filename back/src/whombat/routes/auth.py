"""Module containing the router for the Auth."""

import logging
from fastapi import APIRouter, HTTPException
from starlette.requests import Request

logger = logging.getLogger(__name__)

__all__ = [
    "get_auth_router",
]


def get_auth_router() -> APIRouter:
    auth_router = APIRouter()

    @auth_router.get("/me")
    async def get_current_user(request: Request):
        """Get the current authenticated user's information."""
        logger.info("Auth Route: /me endpoint called")
        logger.info(f"Auth Route: Request state attributes: {dir(request.state)}")
        logger.info(f"Auth Route: Request state dict: {request.state.__dict__}")
        
        if not hasattr(request.state, "user"):
            logger.warning("Auth Route: User not found in request state - not authenticated")
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        user = request.state.user
        logger.info(f"Auth Route: Found authenticated user: {user.username} (ID: {user.id})")
        return user

    return auth_router

