from typing import Any, AnyStr, Annotated
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
import requests
from sqlalchemy.ext.asyncio import AsyncSession

from system import get_database_url
from system.database import get_async_session, create_async_db_engine
from whombat.system.settings import Settings
from whombat import exceptions, api, schemas


class AzureADAuth(HTTPBearer):
    def __init__(self, settings: Settings, auto_error: bool = True):
        super().__init__(auto_error=auto_error)
        self.settings = settings
        self.tenant_id = settings.azure_tenant_id
        self.client_id = settings.azure_client_id
        self.issuer = f"https://login.microsoftonline.com/{self.tenant_id}/v2.0"
        self.jwks_uri = f"https://login.microsoftonline.com/{self.tenant_id}/discovery/v2.0/keys"
        self._jwks = None

    async def __call__(
            self,
            request: Request) -> Any:
        credentials: HTTPAuthorizationCredentials = await super().__call__(request)

        if not credentials:
            if self.auto_error:
                raise HTTPException(status_code=401, detail="Invalid authorization credentials")
            return None

        try:
            token = credentials.credentials
            claims = self.validate_token(token)
            url = get_database_url(self.settings)
            engine = create_async_db_engine(url)
            async with get_async_session(engine) as session:
                user = await self.get_or_create_user(session, claims)
                request.state.user = user
            return user
        except Exception as e:
            raise HTTPException(status_code=401, detail=str(e))


    def validate_token(self, token: str) -> dict:
        if not self._jwks:
            response = requests.get(self.jwks_uri)
            self._jwks = response.json()

        claims = jwt.decode(
            token,
            self._jwks,
            algorithms=["RS256"],
            audience=self.client_id,
            issuer=self.issuer
        )
        return claims

    async def get_or_create_user(
            self,
            session: AsyncSession,
            claims: dict
    ) -> schemas.SimpleUser:
        """Get or create user from Azure AD claims."""
        try:
            # Try to find user by Azure OID
            user = await api.users.get_by_azure_oid(session, claims["oid"])
        except exceptions.NotFoundError:
            # Create new user if not found
            user = await api.users.create(
                session=session,
                username=claims["preferred_username"].split("@")[0],
                email=claims["preferred_username"],
                name=claims.get("name"),
                azure_oid=claims["oid"],
                is_active=True
            )
            await session.commit()

        return user