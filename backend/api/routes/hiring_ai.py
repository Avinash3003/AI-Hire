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
        questions = AIGenerationService.generate_coding_questions(
            total_questions=payload.total_questions,
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
        questions = AIGenerationService.generate_interview_questions(
            total_questions=payload.total_questions,
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
    supabase.table("assessment_config").upsert({"job_id": payload.job_id}).execute()
    
    # Save Coding Questions
    for cq in payload.coding_questions:
        q_data = {
            "job_id": payload.job_id,
            "title": cq["title"],
            "description": cq["description"],
            "function_signature": cq["function_signature"],
            "difficulty": cq["difficulty"],
            "public_testcases": cq.get("public_testcases", []),
            "hidden_testcases": cq.get("hidden_testcases", [])
        }
        supabase.table("coding_questions").insert(q_data).execute()
        
    # Save Interview Questions
    for iq in payload.interview_questions:
        q_data = {
            "job_id": payload.job_id,
            "question": iq["question"],
            "keywords": iq.get("keywords", []),
            "difficulty": iq["difficulty"]
        }
        supabase.table("interview_questions").insert(q_data).execute()
        
    return {"status": "success", "message": "Assessment Configured"}
