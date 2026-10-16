from app.routers.auth import router as auth_router
from app.routers.patient import router as patient_router
from app.routers.doctor import router as doctor_router
from app.routers.ml_router import router as ml_router

__all__ = ["auth_router", "patient_router", "doctor_router", "ml_router"]
