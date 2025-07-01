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
        print(f"HTTP REQUEST: {request.method} {request.url}")
        print(f"HTTP HEADERS: {dict(request.headers)}")
        print(f"HTTP CLIENT: {request.client}")
        print(f"HTTP PATH PARAMS: {request.path_params}")
        print(f"HTTP QUERY PARAMS: {dict(request.query_params)}")
        
        # Log request body for non-GET requests (be careful with large bodies)
        if request.method != "GET":
            try:
                body = await request.body()
                if body:
                    body_str = body.decode('utf-8')[:1000]  # Limit to first 1000 chars
                    print(f"HTTP BODY: {body_str}")
            except Exception as e:
                print(f"HTTP BODY ERROR: {e}")
        
        # Process the request
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # Log response
            print(f"HTTP RESPONSE: {response.status_code} for {request.method} {request.url}")
            print(f"HTTP RESPONSE HEADERS: {dict(response.headers)}")
            print(f"HTTP RESPONSE TIME: {process_time:.4f}s")
            
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            print(f"HTTP ERROR: {request.method} {request.url} - Error: {str(e)}")
            print(f"HTTP ERROR DURATION: {process_time:.4f}s")
            import traceback
            print(f"HTTP ERROR TRACEBACK: {traceback.format_exc()}")
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
