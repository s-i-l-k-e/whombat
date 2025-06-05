"""Authentication dependencies."""

from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi_users import FastAPIUsers
from fastapi_users.authentication import AuthenticationBackend
from starlette.requests import Request

import schemas
from schemas import SimpleUser
from whombat import models
from whombat.routes.dependencies.session import Session
from whombat.routes.dependencies.settings import WhombatSettings
from whombat.routes.dependencies.users import get_user_manager
from whombat.system import auth


async def get_current_user(request: Request) -> schemas.SimpleUser:
    """Get the currently logged in user from the request state."""
    if not hasattr(request.state, "user"):
        raise HTTPException(status_code=401, detail="Invalid authorization credentials")

    return request.state.user
