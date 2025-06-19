import uvicorn
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from src.config.configurations import ARS_ALLOCATION
from src.config.global_configs import GlobalConfigs
from src.libs.loggers import Logger
from src.middleware.default_middleware import DefaultMiddleware
from src.routes import (
    forecast_routes,
    stock_routes,
    default_routes,
    aos_routes,
    auto_closure_routes,
)

app = FastAPI()
logger = Logger("APP")
_GLOBAL_CONFIGS = GlobalConfigs()


async def http_exception_handler(request: Request, exc: HTTPException):
    logger.error(f"HTTP error occurred: {exc.detail}", "http_exception_handler")
    _GLOBAL_CONFIGS.reset()
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail},
    )


async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error occurred: {str(exc)}", "unhandled_exception_handler")
    _GLOBAL_CONFIGS.reset()
    return JSONResponse(
        status_code=500,
        content={"message": "An unexpected error occurred. Please try again later."},
    )


@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    return await http_exception_handler(request, exc)


@app.exception_handler(Exception)
async def custom_unhandled_exception_handler(request: Request, exc: Exception):
    return await unhandled_exception_handler(request, exc)


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=400,
        content={"detail": str(exc)},
    )


@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as exc:
        return await custom_unhandled_exception_handler(request, exc)


app.include_router(default_routes.router, prefix="")
app.include_router(forecast_routes.router, prefix="/forecast")
app.include_router(stock_routes.router, prefix="/stock-count")
app.include_router(aos_routes.router, prefix="/aos")
app.include_router(auto_closure_routes.router, prefix="/auto-closure")

allow_origins = ARS_ALLOCATION.get("FE_URL_CORS").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],  # You can restrict this to specific HTTP methods if needed
    allow_headers=["*"],  # You can restrict this to specific headers if needed
)

app.add_middleware(DefaultMiddleware)

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host=ARS_ALLOCATION.get("HOST"),
        port=ARS_ALLOCATION.get("PORT"),
        reload=True,
    )
