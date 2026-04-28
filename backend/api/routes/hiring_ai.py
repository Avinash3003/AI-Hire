from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from db.supabase import get_supabase
from models.schemas import UserResponse
from api.dependencies import get_current_user
from services.ai_generation_service import AIGenerationService
from pydantic import BaseModel
from typing import List

router = APIRouter()

class GenerateRequest(BaseModel):
    total_questions: int
    difficulty_distribution: dict
    topics: List[str]
    role: str

@router.post("/generate/coding")
def generate_coding(payload: GenerateRequest, current_user: UserResponse = Depends(get_current_user)):
    if current_user.role != "hiring":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    try:
        # Generate an inflated AI Pool (3x the requested assignment count) to give Recruiters variation options
        pool_size = max(5, payload.total_questions * 3)
        questions = AIGenerationService.generate_coding_questions(
            total_questions=pool_size,
            difficulty_distribution=payload.difficulty_distribution,
            topics=payload.topics
        )
        return {"status": "success", "data": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate/interview")
def generate_interview(payload: GenerateRequest, current_user: UserResponse = Depends(get_current_user)):
    if current_user.role != "hiring":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    try:
        # Inflate AI pool to give variations
        pool_size = max(5, payload.total_questions * 3)
        questions = AIGenerationService.generate_interview_questions(
            total_questions=pool_size,
            difficulty_distribution=payload.difficulty_distribution,
            topics=payload.topics
        )
        return {"status": "success", "data": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SaveConfigRequest(BaseModel):
    job_id: str
    coding_questions: List[dict]
    interview_questions: List[dict]

@router.post("/save-config")
def save_config(payload: SaveConfigRequest, current_user: UserResponse = Depends(get_current_user), supabase: Client = Depends(get_supabase)):
    if current_user.role != "hiring":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    # Verify job ownership
    job_check = supabase.table("jobs").select("created_by").eq("id", payload.job_id).execute()
    if not job_check.data or job_check.data[0]["created_by"] != current_user.id:
         raise HTTPException(status_code=403, detail="Not authorized to configure this job")
         
    # Clear existing config/questions for this job to allow clean re-deploy
    supabase.table("coding_questions").delete().eq("job_id", payload.job_id).execute()
    supabase.table("interview_questions").delete().eq("job_id", payload.job_id).execute()
    
    config_check = supabase.table("assessment_config").select("id").eq("job_id", payload.job_id).execute()
    if not config_check.data:
        supabase.table("assessment_config").insert({"job_id": payload.job_id}).execute()
    
    # Save Coding Questions
    for cq in payload.coding_questions:
        q_data = {
            "job_id": payload.job_id,
            "title": cq.get("title", "Untitled Problem"),
            "description": cq.get("description", ""),
            "function_signature": cq.get("function_signature", "def solve():"),
            "difficulty": str(cq.get("difficulty", "Medium")).capitalize(),
            "technique": cq.get("technique", "General DSA"), # Fallback for manual
            "public_testcases": cq.get("public_testcases", []),
            "hidden_testcases": cq.get("hidden_testcases", [])
        }
        supabase.table("coding_questions").insert(q_data).execute()
        
    # Save Interview Questions
    for iq in payload.interview_questions:
        q_data = {
            "job_id": payload.job_id,
            "question": iq.get("question", ""),
            "keywords": iq.get("keywords", []),
            "expected_points": iq.get("expected_points", []),
            "difficulty": str(iq.get("difficulty", "Medium")).capitalize()
        }
        supabase.table("interview_questions").insert(q_data).execute()
        
    return {"status": "success", "message": "Assessment Configured"}

class LockConfigRequest(BaseModel):
    job_id: str

@router.post("/lock-config")
def lock_config(payload: LockConfigRequest, current_user: UserResponse = Depends(get_current_user), supabase: Client = Depends(get_supabase)):
    if current_user.role != "hiring":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    # Verify job ownership
    job_check = supabase.table("jobs").select("created_by").eq("id", payload.job_id).execute()
    if not job_check.data or job_check.data[0]["created_by"] != current_user.id:
         raise HTTPException(status_code=403, detail="Not authorized to configure this job")
         
    # Update status to locked
    response = supabase.table("assessment_config").update({"status": "locked"}).eq("job_id", payload.job_id).execute()
    if not response.data:
         raise HTTPException(status_code=500, detail="Failed to lock configuration")
         
    return {"status": "success", "message": "Assessment Locked"}

@router.get("/config/{job_id}")
def get_config(job_id: str, current_user: UserResponse = Depends(get_current_user), supabase: Client = Depends(get_supabase)):
    if current_user.role != "hiring":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    # Verify job ownership
    job_check = supabase.table("jobs").select("created_by").eq("id", job_id).execute()
    if not job_check.data or job_check.data[0]["created_by"] != current_user.id:
         raise HTTPException(status_code=403, detail="Not authorized to view this job")
         
    response = supabase.table("assessment_config").select("*").eq("job_id", job_id).execute()
    if not response.data:
        return {"status": "success", "data": {"status": "draft"}}
        
    return {"status": "success", "data": response.data[0]}
