from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from db.supabase import get_supabase
from models.schemas import JobCreate, JobUpdate, JobResponse, UserResponse
from api.dependencies import get_current_user

router = APIRouter()

@router.post("/", response_model=JobResponse)
def create_job(job: JobCreate, current_user: UserResponse = Depends(get_current_user), supabase: Client = Depends(get_supabase)):
    if current_user.role != "hiring":
        raise HTTPException(status_code=403, detail="Only hiring managers can create jobs")
    
    new_job = job.model_dump()
    new_job["created_by"] = current_user.id
    
    response = supabase.table("jobs").insert(new_job).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Error creating job")
    
    return response.data[0]

@router.get("/my", response_model=list[JobResponse])
def get_my_jobs(current_user: UserResponse = Depends(get_current_user), supabase: Client = Depends(get_supabase)):
    if current_user.role != "hiring":
        raise HTTPException(status_code=403, detail="Only hiring managers can view their jobs")
        
    response = supabase.table("jobs").select("*").eq("created_by", current_user.id).order('created_at', desc=True).execute()
    return response.data

@router.get("/public", response_model=list[JobResponse])
def get_public_jobs(current_user: UserResponse = Depends(get_current_user), supabase: Client = Depends(get_supabase)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can view public jobs")
        
    response = supabase.table("jobs").select("*").eq("status", "published").order('created_at', desc=True).execute()
    return response.data

@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: str, current_user: UserResponse = Depends(get_current_user), supabase: Client = Depends(get_supabase)):
    response = supabase.table("jobs").select("*").eq("id", job_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Job not found")
        
    job = response.data[0]
    
    # Students can only see published jobs. Hiring managers can only see their own jobs.
    if current_user.role == "student" and job["status"] != "published":
        raise HTTPException(status_code=403, detail="Not authorized to view this job")
    if current_user.role == "hiring" and job["created_by"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this job")
        
    return job

@router.put("/{job_id}", response_model=JobResponse)
def update_job(job_id: str, job_update: JobUpdate, current_user: UserResponse = Depends(get_current_user), supabase: Client = Depends(get_supabase)):
    if current_user.role != "hiring":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Check ownership
    existing = supabase.table("jobs").select("created_by").eq("id", job_id).execute()
    if not existing.data or existing.data[0]["created_by"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this job")
        
    update_data = {k: v for k, v in job_update.model_dump().items() if v is not None}
    
    response = supabase.table("jobs").update(update_data).eq("id", job_id).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Error updating job")
        
    return response.data[0]

@router.delete("/{job_id}")
def delete_job(job_id: str, current_user: UserResponse = Depends(get_current_user), supabase: Client = Depends(get_supabase)):
    if current_user.role != "hiring":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Check ownership
    existing = supabase.table("jobs").select("created_by").eq("id", job_id).execute()
    if not existing.data or existing.data[0]["created_by"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this job")
        
    response = supabase.table("jobs").delete().eq("id", job_id).execute()
    return {"message": "Job deleted successfully"}
