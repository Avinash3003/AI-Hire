from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.responses import FileResponse
from supabase import Client
from db.supabase import get_supabase
from models.schemas import ApplicationCreate, ApplicationResponse, AssessmentLinkResponse, UserResponse
from api.dependencies import get_current_user
from typing import Optional
import secrets
import os
from datetime import datetime, timedelta
from services.resume_scoring_service import ResumeScoringService

router = APIRouter()

# Ensure uploads dir exists
os.makedirs("uploads", exist_ok=True)

# ─────────────────────────────────────────
# IMPORTANT: Fixed-path routes MUST be
# declared BEFORE wildcard /{app_id} routes
# to prevent FastAPI treating "hiring" or
# "my" as an app_id UUID.
# ─────────────────────────────────────────

@router.get("/hiring/stats")
def get_hiring_stats(current_user: UserResponse = Depends(get_current_user), supabase: Client = Depends(get_supabase)):
    if current_user.role != "hiring":
        raise HTTPException(status_code=403, detail="Only recruiters can view stats")

    # Fetch all jobs owned by this recruiter
    jobs_resp = supabase.table("jobs").select("id").eq("created_by", current_user.id).execute()
    job_ids = [j["id"] for j in jobs_resp.data]

    if not job_ids:
        return {"total_applicants": 0, "active_jobs": 0, "shortlisted": 0, "new_applicants": 0}

    # Count ALL applications across ALL recruiter's jobs (every status)
    apps_resp = supabase.table("applications").select("status").in_("job_id", job_ids).execute()
    apps = apps_resp.data

    return {
        "total_applicants": len(apps),                                              # Everyone who ever applied
        "active_jobs": len(job_ids),                                                # All jobs this recruiter owns
        "shortlisted": len([a for a in apps if a["status"] == "accepted"]),        # Accepted into exam stage
        "new_applicants": len([a for a in apps if a["status"] == "applied"]),      # Not yet reviewed
    }


@router.get("/my")
def get_my_applications(current_user: UserResponse = Depends(get_current_user), supabase: Client = Depends(get_supabase)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can view their applications")

    response = supabase.table("applications").select("*, assessment_links(*)").eq("email", current_user.email).order('applied_at', desc=True).execute()
    return response.data


@router.get("/job/{job_id}")
def get_job_applications(job_id: str, current_user: UserResponse = Depends(get_current_user), supabase: Client = Depends(get_supabase)):
    if current_user.role != "hiring":
        raise HTTPException(status_code=403, detail="Only recruiters can view ATS applicants")

    response = supabase.table("applications").select("*, assessment_links(*, coding_results(*), interview_results(*))").eq("job_id", job_id).order('ai_score', desc=True).execute()
    return response.data


@router.post("/apply", response_model=ApplicationResponse)
async def apply_to_job(
    job_id: str = Form(...),
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    linkedin: str = Form(""),
    github: str = Form(""),
    resume: UploadFile = File(...),
    supabase: Client = Depends(get_supabase)
):
    job_check = supabase.table("jobs").select("status, description, skills_required").eq("id", job_id).execute()
    if not job_check.data or job_check.data[0]["status"] != "published":
        raise HTTPException(status_code=404, detail="Job not found or not open for applications")

    target_job = job_check.data[0]
    description = target_job.get("description", "")
    skills = target_job.get("skills_required", [])

    pdf_bytes = await resume.read()

    safe_filename = f"{secrets.token_hex(8)}_{resume.filename}"
    file_path = os.path.join("uploads", safe_filename)
    with open(file_path, "wb") as f:
        f.write(pdf_bytes)

    resume_url_path = f"http://localhost:8000/api/applications/downloads/{safe_filename}"

    try:
        evaluation = ResumeScoringService.evaluate_resume(pdf_bytes, description, skills)
        ai_score = evaluation["score"]
        ai_strengths = evaluation["strengths"]
        ai_missing = evaluation["missing_skills"]
        ai_rec = evaluation["recommendation"]
    except Exception as e:
        print(f"Resume parsing error: {e}")
        ai_score = 50
        ai_strengths = []
        ai_missing = skills
        ai_rec = "Error evaluating resume automatically."

    new_app = {
        "job_id": job_id,
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "resume_url": resume_url_path,
        "linkedin": linkedin,
        "github": github,
        "status": "applied",
        "ai_score": ai_score,
        "ai_strengths": ai_strengths,
        "ai_missing": ai_missing,
        "ai_recommendation": ai_rec
    }

    response = supabase.table("applications").insert(new_app).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Error submitting application")

    return response.data[0]


@router.get("/downloads/{filename}")
def download_resume(filename: str):
    file_path = os.path.join("uploads", filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)


# ─── Wildcard routes LAST ───────────────────────────────────────────────────

@router.post("/{app_id}/accept", response_model=AssessmentLinkResponse)
def accept_application(app_id: str, current_user: UserResponse = Depends(get_current_user), supabase: Client = Depends(get_supabase)):
    if current_user.role != "hiring":
        raise HTTPException(status_code=403, detail="Only recruiters can accept applications")

    app_check = supabase.table("applications").select("*").eq("id", app_id).execute()
    if not app_check.data:
        raise HTTPException(status_code=404, detail="Application not found")

    target_app = app_check.data[0]

    supabase.table("applications").update({"status": "accepted"}).eq("id", app_id).execute()

    expires_at = (datetime.utcnow() + timedelta(days=7)).isoformat()
    token = secrets.token_urlsafe(32)

    new_link = {
        "application_id": app_id,
        "job_id": target_app["job_id"],
        "email": target_app["email"],
        "token": token,
        "status": "pending",
        "expires_at": expires_at
    }

    response = supabase.table("assessment_links").insert(new_link).execute()
    return response.data[0]


@router.post("/{app_id}/reject")
def reject_application(app_id: str, current_user: UserResponse = Depends(get_current_user), supabase: Client = Depends(get_supabase)):
    if current_user.role != "hiring":
        raise HTTPException(status_code=403, detail="Only recruiters can reject applications")

    supabase.table("applications").update({"status": "rejected"}).eq("id", app_id).execute()
    return {"message": "Rejected successfully"}
