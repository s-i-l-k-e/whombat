from typing import Any, AnyStr, Annotated
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
import requests
import logging
from sqlalchemy.ext.asyncio import AsyncSession

from whombat.system import get_database_url
from whombat.system.database import get_async_session, create_async_db_engine
from whombat.system.settings import Settings
from whombat import exceptions, api, schemas

# Azure AD authentication logger
logger = logging.getLogger(__name__)


class AzureADAuth(HTTPBearer):
    def __init__(self, settings: Settings, auto_error: bool = True):
        print("AZURE AUTH: Initializing Azure AD authentication middleware")
        super().__init__(auto_error=auto_error)
        self.settings = settings
        self.tenant_id = settings.azure_tenant_id
        self.client_id = settings.azure_client_id
        self.issuer = f"https://login.microsoftonline.com/{self.tenant_id}/v2.0"
        self.jwks_uri = f"https://login.microsoftonline.com/{self.tenant_id}/discovery/v2.0/keys"
        self._jwks = None
        
        print(f"AZURE AUTH: Tenant ID: {self.tenant_id}")
        print(f"AZURE AUTH: Client ID: {self.client_id}")
        print(f"AZURE AUTH: Issuer: {self.issuer}")
        print(f"AZURE AUTH: JWKS URI: {self.jwks_uri}")

    async def __call__(
            self,
            request: Request) -> Any:
        print(f"AZURE AUTH: Processing request to {request.url.path}")
        print(f"AZURE AUTH: Request method: {request.method}")
        print(f"AZURE AUTH: Request headers: {dict(request.headers)}")
        
        credentials: HTTPAuthorizationCredentials = await super().__call__(request)

        if not credentials:
            print("AZURE AUTH: No credentials provided in Authorization header")
            if self.auto_error:
                raise HTTPException(status_code=401, detail="Invalid authorization credentials")
            return None

        try:
            token = credentials.credentials
            print(f"AZURE AUTH: Received bearer token (length: {len(token)})")
            print(f"AZURE AUTH: Token preview: {token[:50]}...")
            
            print("AZURE AUTH: Starting token validation")
            print(f"AZURE AUTH: Validating against Tenant ID: {self.tenant_id}")
            print(f"AZURE AUTH: Validating against Client ID: {self.client_id}")
            claims = self.validate_token(token)
            print(f"AZURE AUTH: Token validation successful. Claims: {claims}")
            
            print("AZURE AUTH: Getting database connection")
            url = get_database_url(self.settings)
            engine = create_async_db_engine(url)
            
            async with get_async_session(engine) as session:
                print("AZURE AUTH: Database session established")
                user = await self.get_or_create_user(session, claims)
                print(f"AZURE AUTH: User resolved: {user.username} (ID: {user.id})")
                request.state.user = user
                print("AZURE AUTH: User attached to request state")
            
            return user
        except Exception as e:
            print(f"AZURE AUTH ERROR: Authentication failed with error: {str(e)}")
            import traceback
            print(f"AZURE AUTH ERROR TRACEBACK: {traceback.format_exc()}")
            raise HTTPException(status_code=401, detail=str(e))


    def validate_token(self, token: str) -> dict:
        print("AZURE AUTH: Starting JWT token validation")
        
        if not self._jwks:
            print(f"AZURE AUTH: Fetching JWKS from {self.jwks_uri}")
            response = requests.get(self.jwks_uri)
            print(f"AZURE AUTH: JWKS response status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"AZURE AUTH ERROR: Failed to fetch JWKS. Status: {response.status_code}, Body: {response.text}")
                raise Exception(f"Failed to fetch JWKS from Azure AD: {response.status_code}")
            
            self._jwks = response.json()
            print(f"AZURE AUTH: JWKS fetched successfully. Keys count: {len(self._jwks.get('keys', []))}")
            print(f"AZURE AUTH: JWKS content: {self._jwks}")

        print("AZURE AUTH: Decoding JWT token")
        print(f"AZURE AUTH: Using Tenant ID: {self.tenant_id}")
        print(f"AZURE AUTH: Using Client ID: {self.client_id}")
        print(f"AZURE AUTH: Expected audience: {self.client_id}")
        print(f"AZURE AUTH: Expected issuer: {self.issuer}")
        
        try:
            claims = jwt.decode(
                token,
                self._jwks,
                algorithms=["RS256"],
                audience=self.client_id,
                issuer=self.issuer
            )
            print("AZURE AUTH: JWT token decoded successfully")
            print(f"AZURE AUTH: Decoded claims: {claims}")
            return claims
        except Exception as e:
            print(f"AZURE AUTH ERROR: JWT decode failed: {str(e)}")
            import traceback
            print(f"AZURE AUTH ERROR TRACEBACK: {traceback.format_exc()}")
            raise

    async def get_or_create_user(
            self,
            session: AsyncSession,
            claims: dict
    ) -> schemas.SimpleUser:
        """Get or create user from Azure AD claims."""
        logger.info("Azure AD Auth: Starting user resolution from claims")
        
        azure_oid = claims.get("oid")
        preferred_username = claims.get("preferred_username")
        name = claims.get("name")
        
        logger.info(f"Azure AD Auth: Looking up user with Azure OID: {azure_oid}")
        logger.info(f"Azure AD Auth: User details from claims - Username: {preferred_username}, Name: {name}")
        
        try:
            # Try to find user by Azure OID
            logger.info("Azure AD Auth: Searching for existing user by Azure OID")
            user = await api.users.get_by_azure_oid(session, azure_oid)
            logger.info(f"Azure AD Auth: Found existing user: {user.username} (ID: {user.id})")
            return user
        except exceptions.NotFoundError:
            logger.info("Azure AD Auth: User not found, creating new user")
            
            # Extract username from email (part before @)
            username = preferred_username.split("@")[0] if preferred_username else f"user_{azure_oid[:8]}"
            logger.info(f"Azure AD Auth: Creating user with username: {username}")
            
            # Create new user if not found
            user = await api.users.create(
                session=session,
                username=username,
                email=preferred_username,
                name=name,
                azure_oid=azure_oid,
                is_active=True
            )
            logger.info(f"Azure AD Auth: User created successfully: {user.username} (ID: {user.id})")
            
            await session.commit()
            logger.info("Azure AD Auth: Database transaction committed")

        return user