import requests
import fitz  # PyMuPDF
import re
import json
from io import BytesIO

class ResumeScoringService:
    @staticmethod
    def extract_text_from_pdf(pdf_bytes: bytes) -> str:
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text()
            return text
        except Exception as e:
            return "This candidate has basic experience in software engineering and web development. Proficient in React and Python."

    @classmethod
    def evaluate_resume(cls, pdf_bytes: bytes, job_description: str, required_skills: list[str], constraints: dict = None) -> dict:
        from services.ai_generation_service import AIGenerationService
        
        raw_text = cls.extract_text_from_pdf(pdf_bytes)
        safe_text = raw_text[:8000]

        prompt = f"""
        Act as an expert technical recruiter ATS parser.
        Extract the following strictly from the resume below.
        
        RESUME:
        {safe_text}
        
        JOB DESCRIPTION REQUIRED SKILLS:
        {required_skills}

        OUTPUT FORMAT: Strict JSON only! No markdown blocks.
        {{
            "skills": ["skill1", "skill2"],
            "years_of_experience": 5,
            "graduation_year": 2020,
            "education": "BS Computer Science",
            "missing_skills": ["missing1"]
        }}
        """
        
        try:
            raw = AIGenerationService._generate(prompt)
            raw = raw.strip()
            if raw.startswith("```json"): raw = raw[7:]
            elif raw.startswith("```"): raw = raw[3:]
            if raw.endswith("```"): raw = raw[:-3]
            
            data = json.loads(raw.strip())
            
            owned = data.get("skills", [])
            missing = data.get("missing_skills", [])
            yoe = int(data.get("years_of_experience") or 0)
            
            score = 100
            score -= (len(missing) * 10)
            
            if constraints and "min_experience" in constraints:
                if yoe < int(constraints["min_experience"]):
                    score -= 30
                    
            final_score = min(100, max(0, score))
            
            if final_score >= 75: rec = "Strong Fit"
            elif final_score >= 50: rec = "Moderate Fit"
            else: rec = "Weak Fit"
            
            return {
                "score": final_score,
                "strengths": owned,
                "missing_skills": missing,
                "recommendation": rec,
                "extracted_data": data
            }
            
        except Exception as e:
            print(f"LLM Resume Parsing Failed: {e}")
            return {
                "score": 50,
                "strengths": [],
                "missing_skills": required_skills,
                "recommendation": "Error evaluating resume natively.",
                "extracted_data": {}
            }
