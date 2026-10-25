"""
Pramāṇa — Automated KYC Document Verification System
Backend entry point (Person 1)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import Base, get_engine, check_db_connection, get_db
from app.services.seed_service import seed_initial_data
from app.routes import (
    auth_router,
    customers_router,
    documents_router,
    admin_router,
    audit_router,
)

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for customer document ingestion, verification engine, and admin review.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration to allow local Next.js / TanStack / Vite frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(customers_router)
app.include_router(documents_router)
app.include_router(admin_router)
app.include_router(audit_router)


def init_db():
    """
    Initializes tables and seeds data if DB is connected.
    Called explicitly or when server starts.
    """
    status = check_db_connection()
    if status.get("connected"):
        engine = get_engine()
        Base.metadata.create_all(bind=engine)
        db = next(get_db())
        try:
            seed_initial_data(db)
        finally:
            db.close()


@app.on_event("startup")
async def on_startup():
    # Only try to init if DB is reachable, avoiding blocking timeouts during test collection
    try:
        init_db()
    except Exception as exc:
        print(f"Startup notice: {exc}")


@app.get("/", tags=["General"])
async def root():
    """
    Root landing endpoint confirming the service is active.
    """
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": "1.0.0",
        "environment": settings.APP_ENV,
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Application health check endpoint.
    Reports API operational status and current database reachability without crashing if DB is offline.
    """
    db_status = check_db_connection()
    return {
        "status": "online",
        "app": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "database": db_status["connected"],
        "database_message": db_status["message"],
    }
