from fastapi import FastAPI,Request
from fastapi.middleware.cors import CORSMiddleware
from src.routes import urls, po_urls, invoice_urls,shopify_urls
from starlette.middleware.base import BaseHTTPMiddleware
import uvicorn
from src.config.configurations import APP
from src.middleware.default_middleware import DefaultMiddleware

app = FastAPI()

app.include_router(urls.router, prefix="/mt-ecom/api/v1")
app.include_router(po_urls.router, prefix="/mt-ecom/api/v1/po")
app.include_router(invoice_urls.router, prefix="/mt-ecom/api/v1/invoice")
app.include_router(shopify_urls.router, prefix="/mt-ecom/api/v1/shopify")
allow_origins = [APP.get('FE_URL_CORS')]
# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],  # You can restrict this to specific HTTP methods if needed
    allow_headers=["*"],  # You can restrict this to specific headers if needed
)
app.add_middleware(DefaultMiddleware)

if __name__ == "__main__":
    uvicorn.run("app:app", host=APP.get('MT_ECOM_HOST'), port=APP.get('MT_ECOM_PORT'), reload=True,workers=10)