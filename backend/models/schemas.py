from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
import re

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str # "hiring" or "student"

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r"[A-Z]", v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r"[a-z]", v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r"[0-9]", v):
            raise ValueError('Password must contain at least one number')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    created_at: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# ---- JOBS ----
class JobBase(BaseModel):
    title: str
    department: str
    description: str
    skills_required: list[str]
    experience_level: str
    openings: int
    status: str = "published"
    config_json: dict = {}
    salary: Optional[str] = None

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    description: Optional[str] = None
    skills_required: Optional[list[str]] = None
    experience_level: Optional[str] = None
    openings: Optional[int] = None
    status: Optional[str] = None
    config_json: Optional[dict] = None

class JobResponse(JobBase):
    id: str
    created_by: str
    created_at: str

    class Config:
        from_attributes = True

# ---- APPLICATIONS ----
class ApplicationCreate(BaseModel):
    job_id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    resume_url: str
    linkedin: Optional[str] = None
    github: Optional[str] = None

class ApplicationResponse(BaseModel):
    id: str
    job_id: str
    student_id: Optional[str] = None
    full_name: str
    email: str
    phone: Optional[str] = None
    resume_url: str
    linkedin: Optional[str] = None
    github: Optional[str] = None
    status: str
    ai_score: int
    ai_strengths: list[str]
    ai_missing: list[str]
    ai_recommendation: Optional[str] = None
    applied_at: str

    class Config:
        from_attributes = True

# ---- ASSESSMENT LINKS ----
class AssessmentLinkCreate(BaseModel):
    application_id: str
    job_id: str
    email: str

class AssessmentLinkResponse(BaseModel):
    id: str
    application_id: str
    job_id: str
    email: str
    token: str
    status: str
    expires_at: str
    
    class Config:
        from_attributes = True
