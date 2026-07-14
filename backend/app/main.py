import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from .database import engine, Base, get_db
from .schemas import HealthStatus
from . import models

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Postman Clone API", version="1.0.0")

# Import and include routers
from .routers import runner, history, collections_env
app.include_router(runner.router)
app.include_router(history.router)
app.include_router(collections_env.router)

# CORS_ORIGINS is a comma-separated list in .env so individual deployments
# can whitelist their own frontend URL without code changes.
_raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000")
origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from sqlalchemy import text

@app.get("/api/health", response_model=HealthStatus)
def health_check(db: Session = Depends(get_db)):
    # Simple check to verify database connection
    db_status = "healthy"
    try:
        # Execute a simple query to verify connection
        db.execute(text("SELECT 1")).all()
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    return {"status": "ok", "database": db_status}
