import logging
import time
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from whombat.system.settings import Settings

logger = logging.getLogger(__name__)

__all__ = ["add_middlewares"]


class HTTPLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all HTTP requests and responses"""
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Log incoming request
        logger.info(f"HTTP Request: {request.method} {request.url}")
        logger.info(f"HTTP Request Headers: {dict(request.headers)}")
        logger.info(f"HTTP Request Client: {request.client}")
        logger.info(f"HTTP Request Path Params: {request.path_params}")
        logger.info(f"HTTP Request Query Params: {dict(request.query_params)}")
        
        # Log request body for non-GET requests (be careful with large bodies)
        if request.method != "GET":
            try:
                body = await request.body()
                if body:
                    body_str = body.decode('utf-8')[:1000]  # Limit to first 1000 chars
                    logger.info(f"HTTP Request Body (first 1000 chars): {body_str}")
            except Exception as e:
                logger.warning(f"Could not read request body: {e}")
        
        # Process the request
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # Log response
            logger.info(f"HTTP Response: {response.status_code} for {request.method} {request.url}")
            logger.info(f"HTTP Response Headers: {dict(response.headers)}")
            logger.info(f"HTTP Response Time: {process_time:.4f}s")
            
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(f"HTTP Request Failed: {request.method} {request.url} - Error: {str(e)}")
            logger.error(f"HTTP Request Duration: {process_time:.4f}s")
            logger.exception("HTTP Request Exception Details:")
            raise


def add_middlewares(app: FastAPI, settings: Settings):
    # Add HTTP logging middleware first (so it runs last, capturing all requests)
    app.add_middleware(HTTPLoggingMiddleware)
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
