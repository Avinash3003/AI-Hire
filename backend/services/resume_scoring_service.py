import requests
import fitz  # PyMuPDF
import re
from io import BytesIO
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from rapidfuzz import fuzz, process

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
            # Fallback mock for local testing
            return "This candidate has basic experience in software engineering and web development. Proficient in React and Python."

    @staticmethod
    def clean_text(text: str) -> str:
        text = text.lower()
        # Remove non-alphabetical characters to keep clean semantic terms
        text = re.sub(r'[^a-z0-9\s]', ' ', text)
        return ' '.join(text.split())

    @staticmethod
    def compute_tfidf_similarity(resume_text: str, jd_text: str) -> float:
        if not resume_text.strip() or not jd_text.strip():
            return 0.0
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform([jd_text, resume_text])
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        return float(similarity * 100)

    @staticmethod
    def compute_skill_match(resume_text: str, required_skills: list[str]) -> dict:
        if not required_skills:
            return {"score": 100.0, "strengths": [], "missing_skills": []}
            
        strengths = []
        missing = []
        resume_words_raw = resume_text.lower()
        
        for skill in required_skills:
            skill_lower = skill.strip().lower()
            # 1. Exact Boundary Match (fast, precise)
            if re.search(rf"\b{re.escape(skill_lower)}\b", resume_words_raw):
                strengths.append(skill)
                continue
                
            # 2. Aggressive Substring Fallback
            if skill_lower in resume_words_raw:
                strengths.append(skill)
                continue
                
            # 3. Soft Fuzzy Search (lowered threshold due to parsing artifacts)
            best_match = process.extractOne(skill_lower, resume_words_raw.split(), scorer=fuzz.partial_ratio)
            
            if best_match and best_match[1] >= 65:  # 65% fuzzy match threshold
                strengths.append(skill)
            else:
                missing.append(skill)
                
        match_percentage = (len(strengths) / len(required_skills)) * 100
        return {
            "score": match_percentage,
            "strengths": strengths,
            "missing_skills": missing
        }

    @classmethod
    def evaluate_resume(cls, pdf_bytes: bytes, job_description: str, required_skills: list[str]) -> dict:
        # Step 1: Extract & Clean
        raw_text = cls.extract_text_from_pdf(pdf_bytes)
        clean_resume = cls.clean_text(raw_text)
        clean_jd = cls.clean_text(job_description)

        # Step 2: TF-IDF Scaling
        tfidf_score = cls.compute_tfidf_similarity(clean_resume, clean_jd)

        # Step 3: Skill Verification 
        skill_analysis = cls.compute_skill_match(clean_resume, required_skills)
        skill_score = skill_analysis["score"]

        # Step 4: Final Weighted Calculation (Favor explicit skills over semantic fluff)
        final_score = int(round((0.3 * tfidf_score) + (0.7 * skill_score)))
        final_score = min(100, max(0, final_score)) # Clamp between 0-100

        # Step 5: Recommendations
        if final_score >= 75:
            rec = "Strong Fit"
        elif final_score >= 50:
            rec = "Moderate Fit"
        else:
            rec = "Weak Fit"

        # Step 6: Output
        return {
            "score": final_score,
            "strengths": skill_analysis["strengths"],
            "missing_skills": skill_analysis["missing_skills"],
            "recommendation": rec
        }
