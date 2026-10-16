import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
import app.models # ensure all models are imported for metadata reflection
from app.routers import auth_router, patient_router, doctor_router, ml_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database schema
    print("Initializing SQLite tables...")
    Base.metadata.create_all(bind=engine)
    print("SQLite database initialized successfully.")
    yield

app = FastAPI(
    title="IASYN AI Backend",
    description="AI-Assisted Knee Rehabilitation Monitoring and Physiotherapist Feedback System",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers under /api
app.include_router(auth_router, prefix="/api")
app.include_router(patient_router, prefix="/api")
app.include_router(doctor_router, prefix="/api")
app.include_router(ml_router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "app": "IASYN AI",
        "description": "AI-Assisted Knee Rehabilitation Monitoring and Physiotherapist Feedback System",
        "status": "online",
        "documentation": "/docs"
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "database": "sqlite",
        "portals": ["PATIENT", "DOCTOR"]
    }
