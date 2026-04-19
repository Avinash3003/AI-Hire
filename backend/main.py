from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from api.routes import auth, jobs, applications, assessments, hiring_ai

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(applications.router, prefix="/api/applications", tags=["applications"])
app.include_router(assessments.router, prefix="/api/assessments", tags=["assessments"])
app.include_router(hiring_ai.router, prefix="/api/hiring-ai", tags=["hiring-ai"])

@app.get("/")
def read_root():
    return {"message": "Welcome to AI Hiring System API"}
