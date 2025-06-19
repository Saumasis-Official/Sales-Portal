from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

class DefaultMiddleware(BaseHTTPMiddleware):
    CSP_POLICY = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "font-src 'self' https: data:;"
    )
    async def dispatch(self, request, call_next):
        response: Response = await call_next(request)

        # Removes server header and adds CSP header 
        if "server" in response.headers:
            del response.headers["server"]
        response.headers["Content-Security-Policy"] = self.CSP_POLICY
        return response
