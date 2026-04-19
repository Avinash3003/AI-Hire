import json
from typing import List, Dict, Any
from services.ai_generation_service import AIGenerationService

class InterviewScoringService:
    @staticmethod
    def evaluate_answer(transcript: str, question: str, keywords: List[str], expected_points: List[str]) -> Dict[str, Any]:
        """
        Evaluates a candidate's answer based on keywords and semantic coverage of expected points.
        """
        if not transcript or transcript.strip() == "":
            return {
                "score": 0,
                "matched_keywords": [],
                "missing_keywords": keywords,
                "coverage": 0,
                "feedback": "No answer provided."
            }

        # 1. Deterministic Keyword Matching
        transcript_lower = transcript.lower()
        matched = [k for k in keywords if k.lower() in transcript_lower]
        missing = [k for k in keywords if k.lower() not in transcript_lower]
        keyword_score = (len(matched) / len(keywords) * 100) if keywords else 100

        # 2. Semantic Coverage Check (via LLM)
        points_str = "\n".join([f"- {p}" for p in expected_points])
        prompt = f"""
        Evaluate the following candidate interview answer against the provided ground truth points.
        
        Question: {question}
        Ground Truth Points:
        {points_str}
        
        Candidate Answer:
        {transcript}
        
        TASK:
        Determine how many of the Ground Truth Points were addressed or implied by the candidate.
        Provide a coverage percentage (0-100) and a brief justification.
        
        OUTPUT FORMAT (Strict JSON):
        {{
            "semantic_score": 85,
            "addressed_points": ["point 1", "point 2"],
            "missing_points": ["point 3"],
            "justification": "Candidate explained X and Y well but missed Z."
        }}
        """

        try:
            raw_eval = AIGenerationService._generate(prompt)
            eval_data = json.loads(raw_eval)
            semantic_score = eval_data.get("semantic_score", 0)
        except Exception as e:
            print(f"Semantic Evaluation Failed: {e}")
            semantic_score = keyword_score # Fallback

        # 3. Final Weighted Score
        # 30% Keywords, 70% Semantic coverage
        final_score = int((keyword_score * 0.3) + (semantic_score * 0.7))

        return {
            "score": final_score,
            "matched_keywords": matched,
            "missing_keywords": missing,
            "coverage": semantic_score,
            "feedback": eval_data.get("justification", "Automatic evaluation completed.") if 'eval_data' in locals() else "Keyword-based evaluation completed."
        }
