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
        Generates high-quality, non-trivial DSA problems with logical twists.
        """
        dist_str = ", ".join([f"{count} {diff}" for diff, count in difficulty_distribution.items() if count > 0])
        
        prompt = f"""
        Generate EXACTLY {total_questions} ADVANCED Data Structures & Algorithms problems.
        Distribution: {dist_str}.
        
        CRITICAL RULE:
        Generate ONLY pure Data Structures and Algorithms problems.
        DO NOT generate domain-specific or real-world system-based questions (e.g., no Azure, DevOps, Logs, MLOps, or Cloud).
        Focus ONLY on abstract problem solving like LeetCode / HackerRank.
        
        QUALITY REQUIREMENTS:
        - Avoid very basic problems (e.g., standard Two Sum, Contains Duplicate).
        - Introduce logical twists, multi-step reasoning, or specific edge-case constraints.
        - Topic focus: Arrays, Strings, HashMap, Two Pointers, Sliding Window, Sorting, Stack/Queue, Basic DP, Greedy.
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
