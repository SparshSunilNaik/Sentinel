from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import Base, SessionLocal, engine
from app.routers import agents, audit, auth, dashboard, policies, requests
from app.seed import seed_database

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI Governance Control Plane for Financial Agents — American Express CodeStreet 2026",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = settings.api_prefix
app.include_router(auth.router, prefix=api)
app.include_router(agents.router, prefix=api)
app.include_router(policies.router, prefix=api)
app.include_router(requests.router, prefix=api)
app.include_router(audit.router, prefix=api)
app.include_router(dashboard.router, prefix=api)


@app.get("/health")
def health():
    return {"status": "ok", "service": "sentinel", "version": settings.app_version}
