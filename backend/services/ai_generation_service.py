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
            "max_output_tokens": 8192, # Higher limit for large sets of questions
            "temperature": 0.7
        }
        
        if json_mode:
            config["response_mime_type"] = "application/json"

        # Robust array of free-tier compatible models in order of preference
        models_to_try = [
            "gemini-2.0-flash",
            "gemini-2.5-flash-lite",
            "gemini-2.0-flash-lite",
            "gemini-2.5-flash"
        ]
        
        last_error = None
        for model_name in models_to_try:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=config
                )
                if response and hasattr(response, 'text'):
                    return response.text.strip()
            except Exception as e:
                print(f"Model {model_name} failed: {e}")
                last_error = e

        raise ValueError(f"All backup Gemini models failed or reached quota. Last Error: {str(last_error)}")

    @staticmethod
    def generate_coding_questions(total_questions: int, difficulty_distribution: Dict[str, int], topics: List[str]) -> List[Dict[str, Any]]:
        """
        Generates high-quality, non-trivial DSA problems with logical twists.
        """
        topics_str = ", ".join(topics) if topics else "General Algorithms, Arrays, HashMaps"
        dist_str = ", ".join([f"{count} {diff}" for diff, count in difficulty_distribution.items() if count > 0])
        
        prompt = f"""
        Generate EXACTLY {total_questions} ADVANCED Data Structures & Algorithms problems.
        
        REQUIRED DIFFICULTY DISTRIBUTION: {dist_str}.
        CRITICAL: Ensure the exact count of easy, medium, and hard questions aligns strictly with the distribution requested above.
        
        REQUIRED TOPICS:
        You MUST focus strictly on the following specific topics: {topics_str}.
        Every single question generated MUST be solvable using these requested algorithms/concepts.
        
        CRITICAL RULE:
        Generate ONLY pure Data Structures and Algorithms problems.
        DO NOT generate domain-specific or real-world system-based questions (e.g., no Azure, DevOps, Logs, MLOps, or Cloud).
        Focus ONLY on abstract problem solving like LeetCode / HackerRank.
        
        STRICT LANGUAGE-AGNOSTIC RULE:
        Do NOT mention specific programming languages (like Java, Go, Python, C++) in the question titles, constraints, or descriptions.
        Do NOT append language tags to the titles. The questions MUST be 100% language-agnostic because the execution environment handles the language separately.
        
        QUALITY REQUIREMENTS:
        - Bring variety to the questions.
        - Introduce logical twists, multi-step reasoning, or specific edge-case constraints.
        - Problems should be "Interview-Level" reflecting real-world complexity but purely algorithmic.

        OUTPUT FORMAT: Strict JSON only.
        {{
            "coding_questions": [
                {{
                    "title": "Title",
                    "description": "Problem statement with specific constraints and edge cases.",
                    "function_signature": "def solve(...) -> ...:",
                    "constraints": "Space/Time complexity targets.",
                    "difficulty": "easy | medium | hard",
                    "public_testcases": [{{"input": "str", "output": "str"}}],
                    "hidden_testcases": [{{"input": "str", "output": "str"}}, {{"input": "str", "output": "str"}}]
                }}
            ]
        }}

        RULES:
        - NO explanations, NO solution hints.
        - Function signature MUST be 'solve' with Python 3 type hints.
        """

        max_retries = 3
        last_error = None
        for attempt in range(max_retries):
            try:
                raw = AIGenerationService._generate(prompt)
                # Clean markdown formatting if present
                raw = raw.strip()
                if raw.startswith("```json"):
                    raw = raw[7:]
                elif raw.startswith("```"):
                    raw = raw[3:]
                if raw.endswith("```"):
                    raw = raw[:-3]
                raw = raw.strip()
                
                data = json.loads(raw)
                return data.get("coding_questions", [])
            except json.JSONDecodeError as e:
                print(f"JSON Parse Error on attempt {attempt + 1}: {e}\nRetrying...")
                last_error = e
            except Exception as e:
                print(f"Error generating coding questions: {e}\nRaw LLM output: {raw if 'raw' in locals() else 'None'}")
                raise ValueError(f"Failed to generate coding questions: {str(e)}")
                
        raise ValueError(f"Failed to generate valid JSON after {max_retries} attempts. Last error: {str(last_error)}")

    @staticmethod
    def generate_interview_questions(total_questions: int, difficulty_distribution: Dict[str, int], topics: List[str]) -> List[Dict[str, Any]]:
        """
        Generates concise interview questions with robust ground truth (expected_points).
        """
        topics_str = ", ".join(topics)
        dist_str = ", ".join([f"{count} {diff}" for diff, count in difficulty_distribution.items() if count > 0])

        prompt = f"""
        Generate EXACTLY {total_questions} professional interview questions.
        Distribution: {dist_str}.
        Focus Areas: {topics_str}.

        GROUND TRUTH REQUIREMENT:
        - For each question, provide 3 to 5 'expected_points' that represents a high-quality answer.
        - Provide 'keywords' for evaluation.

        OUTPUT FORMAT: Strict JSON only.
        {{
            "interview_questions": [
                {{
                    "question": "Question text",
                    "difficulty": "easy | medium | hard",
                    "keywords": ["key", "words"],
                    "expected_points": ["point 1", "point 2", "point 3"]
                }}
            ]
        }}

        RULES:
        - NO paragraph answers, NO conversational text.
        """

        max_retries = 3
        last_error = None
        for attempt in range(max_retries):
            try:
                raw = AIGenerationService._generate(prompt)
                # Clean markdown formatting if present
                raw = raw.strip()
                if raw.startswith("```json"):
                    raw = raw[7:]
                elif raw.startswith("```"):
                    raw = raw[3:]
                if raw.endswith("```"):
                    raw = raw[:-3]
                raw = raw.strip()

                data = json.loads(raw)
                return data.get("interview_questions", [])
            except json.JSONDecodeError as e:
                print(f"JSON Parse Error on attempt {attempt + 1}: {e}\nRetrying...")
                last_error = e
            except Exception as e:
                print(f"Error generating interview questions: {e}\nRaw LLM output: {raw if 'raw' in locals() else 'None'}")
                raise ValueError(f"Failed to generate interview questions: {str(e)}")
                
        raise ValueError(f"Failed to generate valid JSON after {max_retries} attempts. Last error: {str(last_error)}")
