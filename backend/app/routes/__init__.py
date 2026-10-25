from app.routes.auth import router as auth_router
from app.routes.customers import router as customers_router
from app.routes.documents import router as documents_router
from app.routes.admin import router as admin_router
from app.routes.audit import router as audit_router

__all__ = [
    "auth_router",
    "customers_router",
    "documents_router",
    "admin_router",
    "audit_router",
]
