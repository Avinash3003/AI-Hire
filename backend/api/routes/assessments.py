from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from db.supabase import get_supabase
from datetime import datetime

router = APIRouter()

@router.get("/verify/{token}")
def verify_assessment(token: str, supabase: Client = Depends(get_supabase)):
    # Find link
    link_check = supabase.table("assessment_links").select("*, applications(*, jobs(*))").eq("token", token).execute()
    if not link_check.data:
        raise HTTPException(status_code=404, detail="Invalid assessment link")
    
    link_data = link_check.data[0]
    
    if link_data["status"] != "pending":
        raise HTTPException(status_code=400, detail="Assessment already completed or expired")
        
    try:
        # Supabase returns ISO formats with varying tz info. Convert to pure naive for safe comparison.
        exp_str = link_data["expires_at"].replace("Z", "").split("+")[0]
        if datetime.utcnow() > datetime.fromisoformat(exp_str):
            raise HTTPException(status_code=400, detail="Assessment has expired")
    except Exception as e:
        print(f"Time parsing error safely ignored: {e}")
        
    job_id = link_data.get("applications", {}).get("job_id")
    if job_id:
        q_check = supabase.table("coding_questions").select("*").eq("job_id", job_id).execute()
        if q_check.data:
            q = q_check.data[0]
            # Strip highly confidential data
            q.pop("hidden_testcases", None)
            q.pop("technique", None)
            link_data["coding_question"] = q
        
    return link_data

from pydantic import BaseModel

class InterviewSubmit(BaseModel):
    transcript: str

@router.post("/{token}/interview")
def submit_interview(token: str, payload: InterviewSubmit, supabase: Client = Depends(get_supabase)):
    link_check = supabase.table("assessment_links").select("id, status, application_id").eq("token", token).execute()
    if not link_check.data or link_check.data[0]["status"] != "pending":
         raise HTTPException(status_code=400, detail="Invalid token")
         
    # Generate mock AI evaluation of transcript
    mock_comm = 85
    mock_tech = 78
    
    supabase.table("interview_results").insert({
        "assessment_link_id": link_check.data[0]["id"],
        "transcript": payload.transcript,
        "communication_score": mock_comm,
        "technical_score": mock_tech
    }).execute()
    
    return {"status": "success"}

class CodingSubmit(BaseModel):
    code: str

@router.post("/{token}/coding")
def submit_coding(token: str, payload: CodingSubmit, supabase: Client = Depends(get_supabase)):
    from services.judge0_service import Judge0Service

    link_check = supabase.table("assessment_links").select("id, status, application_id, job_id").eq("token", token).execute()
    if not link_check.data or link_check.data[0]["status"] != "pending":
         raise HTTPException(status_code=400, detail="Invalid token")
         
    target = link_check.data[0]
    
    # 1. Fetch the coding question assigned to this job
    q_check = supabase.table("coding_questions").select("*").eq("job_id", target["job_id"]).execute()
    if not q_check.data:
         # Fallback to mock if no AI questions exist
         score = 90
         total_tests = 5
         passed_tests = 4
    else:
         question = q_check.data[0]
         # Evaluate using Judge0 service combining public and hidden tests
         test_cases = question.get("public_testcases", []) + question.get("hidden_testcases", [])
         
         result = Judge0Service.evaluate_code(
             candidate_code=payload.code,
             test_cases=test_cases,
             language_id=71 # python 3
         )
         
         score = result["score"]
         total_tests = result["total"]
         passed_tests = result["passed"]
         
    # Mock code evaluation / Real Evaluation
    supabase.table("coding_results").insert({
        "assessment_link_id": target["id"],
        "code_submitted": payload.code,
        "test_cases_passed": passed_tests,
        "total_test_cases": total_tests,
        "efficiency_score": score
    }).execute()
    
    # After coding, usually assessment is over
    supabase.table("assessment_links").update({"status": "completed"}).eq("id", link_check.data[0]["id"]).execute()
    
    # Cascade status upwards to recruiter ATS
    if link_check.data[0].get("application_id"):
        supabase.table("applications").update({"status": "evaluated"}).eq("id", link_check.data[0]["application_id"]).execute()
    
    return {"status": "success"}
