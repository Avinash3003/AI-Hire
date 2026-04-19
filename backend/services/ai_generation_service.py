import os
import json
from google import genai
from typing import List, Dict, Any
from core.config import settings

class AIGenerationService:

    @staticmethod
    def _generate(prompt: str, json_mode: bool = True) -> str:
        """Internal helper — calls Gemini and returns raw text."""
        api_key = settings.GEMINI_API_KEY
        
        if not api_key:
            raise ValueError("GEMINI_API_KEY is missing in settings. Ensure it is set in .env")

        # Handle simple debug message directly
        if prompt.strip().upper() == "HI":
            return json.dumps([{"title": "Debug Test", "description": "Gemini is alive!"}])

        client = genai.Client(api_key=api_key)
        
        config = {
            "max_output_tokens": 4096, # Higher limit for large sets of questions
            "temperature": 0.7
        }
        
        if json_mode:
            config["response_mime_type"] = "application/json"

        try:
            response = client.models.generate_content(
                model="gemini-flash-latest",
                contents=prompt,
                config=config
            )
        except Exception as e:
            print(f"Gemini API Call Failed: {e}")
            raise ValueError(f"Gemini API Error: {str(e)}")

        if not response or not hasattr(response, 'text'):
            raise ValueError("Empty response from Gemini API")

        return response.text.strip()

    @staticmethod
    def generate_coding_questions(total_questions: int, difficulty_distribution: Dict[str, int], topics: List[str]) -> List[Dict[str, Any]]:
        """
        Generates clean, LeetCode-style coding questions focused on DSA.
        """
        topics_str = ", ".join(topics)
        dist_str = ", ".join([f"{count} {diff}" for diff, count in difficulty_distribution.items() if count > 0])
        
        prompt = f"""
        Generate EXACTLY {total_questions} standard Data Structures & Algorithms problems.
        Distribution: {dist_str}.
        Topics: {topics_str}.
        
        REQUIRED TOPIC RANGE: Arrays, Strings, HashMap, Two Pointers, Sliding Window, Sorting, Stack/Queue, Basic DP.
        STRICTLY FORBIDDEN: Cloud specific (Azure/AWS), DevOps, or domain-specific logic.

        OUTPUT FORMAT: Strict JSON only.
        {{
            "coding_questions": [
                {{
                    "title": "Title",
                    "description": "Problem statement and instructions.",
                    "function_signature": "def solve(...) -> ...:",
                    "constraints": "Space/Time complexity and input bounds.",
                    "difficulty": "easy | medium | hard",
                    "public_testcases": [{{"input": "str", "output": "str"}}],
                    "hidden_testcases": [{{"input": "str", "output": "str"}}, {{"input": "str", "output": "str"}}]
                }}
            ]
        }}

        RULES:
        - NO explanations, NO solution steps, NO extra text.
        - Function signature MUST be 'solve' with Python 3 type hints.
        - Test cases must be eval-compatible Python strings.
        """

        try:
            raw = AIGenerationService._generate(prompt)
            data = json.loads(raw)
            return data.get("coding_questions", [])
        except Exception as e:
            print(f"Error generating coding questions: {e}")
            raise ValueError(f"Failed to generate coding questions: {str(e)}")

    @staticmethod
    def generate_interview_questions(total_questions: int, difficulty_distribution: Dict[str, int], topics: List[str]) -> List[Dict[str, Any]]:
        """
        Generates concise, keyword-focused interview questions.
        """
        topics_str = ", ".join(topics)
        dist_str = ", ".join([f"{count} {diff}" for diff, count in difficulty_distribution.items() if count > 0])

        prompt = f"""
        Generate EXACTLY {total_questions} concise interview questions.
        Distribution: {dist_str}.
        Focus Areas: {topics_str}.

        OUTPUT FORMAT: Strict JSON only.
        {{
            "interview_questions": [
                {{
                    "question": "Question text",
                    "difficulty": "easy | medium | hard",
                    "keywords": ["key", "words", "only"]
                }}
            ]
        }}

        RULES:
        - NO long explanations, NO paragraph answers.
        - ONLY keywords for evaluation targets.
        """

        try:
            raw = AIGenerationService._generate(prompt)
            data = json.loads(raw)
            return data.get("interview_questions", [])
        except Exception as e:
            print(f"Error generating interview questions: {e}")
            raise ValueError(f"Failed to generate interview questions: {str(e)}")
