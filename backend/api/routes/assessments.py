from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from db.supabase import get_supabase
from datetime import datetime

router = APIRouter()

@router.get("/verify/{token}")
def verify_assessment(token: str, supabase: Client = Depends(get_supabase)):
    import random
    # Find link
    link_check = supabase.table("assessment_links").select("*, applications(*, jobs(*))").eq("token", token).execute()
    if not link_check.data:
        raise HTTPException(status_code=404, detail="Invalid assessment link")
    
    link_data = link_check.data[0]
    
    if link_data["status"] != "pending":
        raise HTTPException(status_code=400, detail="Assessment already completed or expired")
        
    try:
        # Supabase returns ISO formats with varying tz info
        exp_str = link_data["expires_at"].replace("Z", "").split("+")[0]
        if datetime.utcnow() > datetime.fromisoformat(exp_str):
            raise HTTPException(status_code=400, detail="Assessment has expired")
    except Exception as e:
        print(f"Time parsing error safely ignored: {e}")
        
    # Extract assigned limits safely from the recruiter's Job Config
    job_config = link_data.get("applications", {}).get("jobs", {}).get("config_json", {})
    rounds = job_config.get("rounds", {})
    req_coding_count = int(rounds.get("coding", {}).get("questions", 2))
    req_interview_count = int(rounds.get("interview", {}).get("questions", 2))
    
    job_id = link_data.get("applications", {}).get("job_id")
    if job_id:
        # FETCH ALL CODING QUESTIONS
        q_check = supabase.table("coding_questions").select("*").eq("job_id", job_id).execute()
        if q_check.data:
            random.seed(token + "_coding")
            pool = q_check.data
            selected_coding = random.sample(pool, min(req_coding_count, len(pool)))
            
            for q in selected_coding:
                q.pop("hidden_testcases", None)
                q.pop("technique", None)
            link_data["coding_questions"] = selected_coding
            
        # FETCH ALL INTERVIEW QUESTIONS
        i_check = supabase.table("interview_questions").select("*").eq("job_id", job_id).execute()
        if i_check.data:
            random.seed(token + "_ai_interview")
            pool = i_check.data
            selected_interview = random.sample(pool, min(req_interview_count, len(pool)))
            link_data["interview_questions"] = selected_interview
        
    return link_data

from pydantic import BaseModel
from typing import Optional

class InterviewSubmit(BaseModel):
    transcript: str
    question_id: Optional[str] = None

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks

# ... [imports handled above, modifying submit_interview]

def _process_interview_eval_async(target_id: str, job_id: str, question_id: str, transcript: str):
    from db.supabase import get_supabase
    from services.interview_scoring_service import InterviewScoringService
    
    supabase = get_supabase()
    query = supabase.table("interview_questions").select("*").eq("job_id", job_id)
    if question_id:
        query = query.eq("id", question_id)
    
    q_data = query.execute().data
    if not q_data:
        score_res = {"score": 0, "feedback": "Question not found for scoring."}
    else:
        question = q_data[0]
        score_res = InterviewScoringService.evaluate_answer(
            transcript=transcript,
            question=question["question"],
            keywords=question.get("keywords", []),
            expected_points=question.get("expected_points", [])
        )
    
    # Update the existing record with the calculated scores
    try:
        update_query = supabase.table("interview_results").update({
            "communication_score": score_res.get("score", 0),
            "technical_score": score_res.get("score", 0)
        }).eq("assessment_link_id", target_id)
        
        if question_id:
            try:
                update_query.eq("question_id", question_id).execute()
            except:
                # Column might not exist, fallback to most recent for this link
                latest = supabase.table("interview_results").select("id").eq("assessment_link_id", target_id).order("created_at", desc=True).limit(1).execute()
                if latest.data:
                    supabase.table("interview_results").update({
                        "communication_score": score_res.get("score", 0),
                        "technical_score": score_res.get("score", 0)
                    }).eq("id", latest.data[0]["id"]).execute()
        else:
            update_query.execute()
    except Exception as e:
        print(f"Async Scoring Update Failed: {e}")

@router.post("/{token}/interview")
def submit_interview(
    token: str, 
    payload: InterviewSubmit, 
    background_tasks: BackgroundTasks,
    supabase: Client = Depends(get_supabase)
):
    link_check = supabase.table("assessment_links").select("id, status, application_id, job_id").eq("token", token).execute()
    if not link_check.data or link_check.data[0]["status"] != "pending":
         raise HTTPException(status_code=400, detail="Invalid token")
    
    target = link_check.data[0]
    
    # AI Generation Service is explicitly decoupled from Active Runtime per Phase 4.3 specification.
    # We simply sink the transcript into DB payload safely. Recruiter evaluates this out-of-band manually.
    try:
        existing_id = None
        if payload.question_id:
            try:
                existing = supabase.table("interview_results").select("id").eq("assessment_link_id", target["id"]).eq("question_id", payload.question_id).execute()
                if existing.data:
                    existing_id = existing.data[0]["id"]
            except Exception:
                pass
                
        if existing_id:
            supabase.table("interview_results").update({
                "transcript": payload.transcript
            }).eq("id", existing_id).execute()
        else:
            row = {
                "assessment_link_id": target["id"],
                "transcript": payload.transcript,
                "communication_score": -1,
                "technical_score": -1
            }
            if payload.question_id:
                row["question_id"] = payload.question_id
                
            try:
                supabase.table("interview_results").insert(row).execute()
            except Exception as e:
                if "question_id" in str(e) or "PGRST204" in str(e):
                    row.pop("question_id")
                    supabase.table("interview_results").insert(row).execute()
                else:
                    raise
                    
        # Trigger async evaluation
        background_tasks.add_task(
            _process_interview_eval_async, 
            target["id"], 
            target["job_id"], 
            payload.question_id, 
            payload.transcript
        )
    except Exception as e:
        print(f"Transcript DB save warning: {e}")
    
    return {"status": "success", "message": "Transcript saved synchronously, queued for LLM review."}

class CodingSubmit(BaseModel):
    code: str
    question_id: Optional[str] = None
    language: Optional[str] = "python"
    is_final: Optional[bool] = False

@router.post("/{token}/coding")
def submit_coding(token: str, payload: CodingSubmit, supabase: Client = Depends(get_supabase)):
    from services.llm_evaluator import LLMEvaluatorService

    link_check = supabase.table("assessment_links").select("id, status, application_id, job_id").eq("token", token).execute()
    if not link_check.data or link_check.data[0]["status"] != "pending":
         raise HTTPException(status_code=400, detail="Invalid token")
         
    target = link_check.data[0]
    
    # Fetch the specific coding question (public + hidden for final submit)
    query = supabase.table("coding_questions").select("*").eq("job_id", target["job_id"])
    if payload.question_id:
        query = query.eq("id", payload.question_id)
        
    q_check = query.execute().data
    if not q_check:
        score, total_tests, passed_tests, curr_q_id = 0, 0, 0, None
    else:
        question   = q_check[0]
        curr_q_id  = question["id"]
        # Combine public + hidden test cases for final grading
        test_cases = question.get("public_testcases", []) + question.get("hidden_testcases", [])
        
        result = LLMEvaluatorService.evaluate(
            question  = question.get("description", ""),
            signature = question.get("function_signature", ""),
            code      = payload.code,
            test_cases= test_cases,
        )
        
        if "error" in result:
            # LLM quota / API error — still save the submission with score 0.
            # Never block a candidate's final submit because of an LLM outage.
            print(f"LLM eval error on submit (saved with score 0): {result['error']}")
            score, total_tests, passed_tests = 0, len(test_cases), 0
        else:
            score        = result["score"]
            total_tests  = result["total"]
            passed_tests = result["passed"]
         
    # Save specific results — handle both schema versions (with or without question_id column)
    result_row = {
        "assessment_link_id": target["id"],
        "code_submitted":     payload.code,
        "test_cases_passed":  passed_tests,
        "total_test_cases":   total_tests,
        "efficiency_score":   score
    }
    
    try:
        existing_id = None
        if curr_q_id:
            try:
                exist_check = supabase.table("coding_results").select("id").eq("assessment_link_id", target["id"]).eq("question_id", curr_q_id).execute()
                if exist_check.data:
                    existing_id = exist_check.data[0]["id"]
            except: pass

        if existing_id:
            supabase.table("coding_results").update(result_row).eq("id", existing_id).execute()
        else:
            if curr_q_id:
                result_row["question_id"] = curr_q_id
            
            try:
                supabase.table("coding_results").insert(result_row).execute()
            except Exception as db_err:
                if "question_id" in str(db_err) or "PGRST204" in str(db_err):
                    result_row.pop("question_id", None)
                    supabase.table("coding_results").insert(result_row).execute()
                else:
                    raise
    except Exception as e:
        print(f"Coding result DB save warning: {e}")
    
    # Only transition state at the end of the looping batch sequence
    if payload.is_final:
        supabase.table("assessment_links").update({"status": "completed"}).eq("id", target["id"]).execute()
        if target.get("application_id"):
            try:
                supabase.table("applications").update({"status": "evaluated"}).eq("id", target["application_id"]).execute()
            except Exception as e:
                print(f"Warning: Failed to update application status (check constraint): {e}")
    
    return {"status": "success"}

@router.post("/{token}/coding/run")
def run_coding(token: str, payload: CodingSubmit, supabase: Client = Depends(get_supabase)):
    """Run-mode: evaluates public test cases only via LLM trace. Max 2 runs enforced on frontend."""
    from services.llm_evaluator import LLMEvaluatorService
    
    link_check = supabase.table("assessment_links").select("id, status, application_id, job_id").eq("token", token).execute()
    if not link_check.data or link_check.data[0]["status"] != "pending":
         raise HTTPException(status_code=400, detail="Invalid token")
         
    target = link_check.data[0]
    
    query = supabase.table("coding_questions").select("*").eq("job_id", target["job_id"])
    if payload.question_id:
        query = query.eq("id", payload.question_id)
        
    q_check = query.execute().data
    if not q_check:
         raise HTTPException(status_code=404, detail="Question not found")
         
    question     = q_check[0]
    public_cases = question.get("public_testcases", [])
    
    if not public_cases:
        return {"status": "success", "results": [{"input": "N/A", "expected": "N/A", "actual": "No public test cases", "passed": True}]}
    
    # LLM evaluates public test cases only (hidden ones saved for final submit)
    result = LLMEvaluatorService.evaluate(
        question  = question.get("description", ""),
        signature = question.get("function_signature", ""),
        code      = payload.code,
        test_cases= public_cases,
    )
    
    if "error" in result:
        # Distinguish quota/API errors from code errors.
        # quota_error=True tells the frontend not to decrement the run counter.
        err_msg = result["error"]
        is_quota = any(k in err_msg.lower() for k in ["quota", "rate", "limit", "429", "unavailable", "503"])
        return {
            "status":      "error",
            "error":       err_msg,
            "quota_error": is_quota,
        }
    
    return {
        "status":  "success",
        "results": result.get("results", []),
        "score":   result.get("score", 0),
    }

# ─── Proctoring Violation Capture ────────────────────────────────────────────
import base64
import os
from datetime import datetime
from pydantic import BaseModel

class ViolationPayload(BaseModel):
    type: str
    timestamp: str
    image_base64: str = ""

@router.post("/{token}/violation")
def record_violation(token: str, payload: ViolationPayload, supabase: Client = Depends(get_supabase)):
    """Store proctoring violations. Saves frame to disk if provided."""
    link_check = supabase.table("assessment_links").select("id, application_id").eq("token", token).execute()
    if not link_check.data:
        raise HTTPException(status_code=400, detail="Invalid token")
    
    link_id = link_check.data[0]["id"]
    image_url = ""
    
    # Decode and save violation frame if provided
    if payload.image_base64:
        try:
            violations_dir = os.path.join("uploads", "violations")
            os.makedirs(violations_dir, exist_ok=True)
            
            # Strip data URI prefix if present
            b64_data = payload.image_base64
            if "," in b64_data:
                b64_data = b64_data.split(",")[1]
            
            img_bytes = base64.b64decode(b64_data)
            filename = f"violation_{link_id[:8]}_{payload.type}_{int(datetime.utcnow().timestamp())}.jpg"
            filepath = os.path.join(violations_dir, filename)
            
            with open(filepath, "wb") as f:
                f.write(img_bytes)
            
            image_url = f"http://localhost:8000/api/applications/downloads/violations/{filename}"
        except Exception as e:
            print(f"Violation frame save error: {e}")
    
    # Store violation record in DB (append to JSON log or dedicated table)
    try:
        # We store in assessment_links metadata as a JSON array
        current = supabase.table("assessment_links").select("proctoring_log").eq("id", link_id).execute()
        existing_log = []
        if current.data and current.data[0].get("proctoring_log"):
            existing_log = current.data[0]["proctoring_log"]
        
        existing_log.append({
            "type": payload.type,
            "timestamp": payload.timestamp,
            "image_url": image_url
        })
        
        supabase.table("assessment_links").update({
            "proctoring_log": existing_log
        }).eq("id", link_id).execute()
    except Exception as e:
        print(f"Violation DB log warning (proctoring_log column may not exist yet): {e}")
    
    return {"status": "recorded", "image_url": image_url}


# ─── Recruiter: Full Candidate Report ────────────────────────────────────────
from api.dependencies import get_current_user
from models.schemas import UserResponse

@router.get("/report/{app_id}")
def get_candidate_report(
    app_id: str,
    current_user: UserResponse = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Aggregate all assessment data for a candidate. Hiring role only."""
    if current_user.role != "hiring":
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        # 1. Application + job info
        app_res = supabase.table("applications").select(
            "id, full_name, email, phone, resume_url, ai_score, ai_strengths, ai_missing, ai_recommendation, status, applied_at, jobs(title, department)"
        ).eq("id", app_id).execute()

        if not app_res.data:
            raise HTTPException(status_code=404, detail="Application not found")

        app = app_res.data[0]

        # Normalize the nested jobs join (Supabase can return dict or list)
        raw_job = app.get("jobs") or {}
        if isinstance(raw_job, list):
            raw_job = raw_job[0] if raw_job else {}

        # 2. Assessment link
        link_res = supabase.table("assessment_links").select(
            "id, status, proctoring_log, created_at"
        ).eq("application_id", app_id).execute()
        link = link_res.data[0] if link_res.data else None

        # 3. Coding results - Deduplicate by question_id (keep latest)
        coding_results = []
        if link:
            try:
                cr_res = supabase.table("coding_results").select(
                    "*, coding_questions(title, difficulty, description)"
                ).eq("assessment_link_id", link["id"]).execute()
                
                raw_coding = cr_res.data or []
                seen_q = set()
                for r in reversed(raw_coding):
                    q_id = r.get("question_id") or r.get("id")
                    if q_id not in seen_q:
                        coding_results.append(r)
                        seen_q.add(q_id)
                coding_results.reverse()
            except Exception as e:
                print(f"coding_results fetch warning: {e}")
                cr_res = supabase.table("coding_results").select("*").eq("assessment_link_id", link["id"]).execute()
                coding_results = cr_res.data or []

        # 4. Interview results - Deduplicate by question_id (keep latest)
        interview_results = []
        if link:
            try:
                ir_res = supabase.table("interview_results").select(
                    "*, interview_questions(id, question)"
                ).eq("assessment_link_id", link["id"]).execute()
                
                raw_ir = ir_res.data or []
                seen_iq = set()
                for r in reversed(raw_ir):
                    iq_id = r.get("question_id") or r.get("id")
                    if iq_id not in seen_iq:
                        interview_results.append(r)
                        seen_iq.add(iq_id)
                interview_results.reverse()
            except Exception as e:
                print(f"interview_results fetch warning: {e}")
                ir_res = supabase.table("interview_results").select("*").eq("assessment_link_id", link["id"]).execute()
                interview_results = ir_res.data or []

        # 5. Aggregate scores
        resume_score  = int(app.get("ai_score") or 0)
        
        # Only use valid positive scores for averages
        coding_scores = [int(r.get("efficiency_score") or 0) for r in coding_results if (r.get("efficiency_score") or 0) >= 0]
        coding_score  = int(sum(coding_scores) / len(coding_scores)) if coding_scores else 0

        comm_scores = [int(r["communication_score"]) for r in interview_results if r.get("communication_score") is not None and r.get("communication_score") >= 0]
        interview_score = int(sum(comm_scores) / len(comm_scores)) if comm_scores else 0

        # Weighted final: resume 30%, coding 40%, interview 30%
        # If a score is 0 because it's missing/pending, we still weight it, 
        # but the individual components show 'Pending' in UI.
        final_score = int(resume_score * 0.30 + coding_score * 0.40 + interview_score * 0.30)

        # 6. Proctoring violations
        violations     = list(link.get("proctoring_log") or []) if link else []
        warnings_count = len(violations)

        return {
            "candidate": {
                "id":         app["id"],
                "name":       app["full_name"],
                "email":      app["email"],
                "phone":      app.get("phone") or "",
                "resume_url": app.get("resume_url") or "",
                "applied_at": app.get("applied_at") or "",
                "status":     app["status"],
            },
            "job": raw_job,
            "scores": {
                "resume_score":    resume_score,
                "coding_score":    coding_score,
                "interview_score": interview_score,
                "final_score":     final_score,
            },
            "resume_analysis": {
                "recommendation": app.get("ai_recommendation") or "",
                "strengths":      app.get("ai_strengths") or [],
                "missing_skills": app.get("ai_missing") or [],
            },
            "coding_results":    coding_results,
            "interview_results": interview_results,
            "proctoring": {
                "warnings_count": warnings_count,
                "violations":     violations,
            },
            "assessment_status": link["status"] if link else "not_started",
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Report endpoint error for app_id={app_id}: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")
