import json
import hashlib
from typing import List, Dict, Any
from google import genai
from core.config import settings

# Global cache for evaluated code to avoid redundant LLM calls
_EVAL_CACHE = {}

class LLMEvaluatorService:
    """Zero-cost, Gemini-only code evaluation service with aggressive caching."""

    @staticmethod
    def _get_cache_key(code: str, test_cases: List[Dict]) -> str:
        # Create a stable hash from code and test cases
        raw = f"{code}:::{json.dumps(test_cases, sort_keys=True)}"
        return hashlib.md5(raw.encode('utf-8')).hexdigest()

    @staticmethod
    def evaluate(question: str, signature: str, code: str, test_cases: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not code or not code.strip():
            return {"error": "Invalid or incomplete code"}

        # Check Cache
        cache_key = LLMEvaluatorService._get_cache_key(code, test_cases)
        if cache_key in _EVAL_CACHE:
            return _EVAL_CACHE[cache_key]

        # Prepare short-key testcases
        short_tcs = [{"i": str(tc.get("input", "")), "o": str(tc.get("output", ""))} for tc in test_cases]

        # Build strict, low-token prompt
        prompt = json.dumps({
            "q": question,
            "f": signature,
            "code": code,
            "t": short_tcs
        })
        
        sys_prompt = (
            "You are a strict code evaluator.\n"
            "Given:\n- Problem\n- Function signature\n- Code\n- Testcases\n\n"
            "Task:\n- Simulate logic\n- Compute actual output\n- Compare with expected\n"
            "- Be strict\n- Do NOT assume correctness\n\n"
            "Return ONLY JSON:\n"
            "{\n"
            '  "passed": number,\n'
            '  "total": number,\n'
            '  "r": [\n'
            '    {"i": "...", "e": "...", "a": "...", "s": "pass/fail"}\n'
            "  ],\n"
            '  "score": number\n'
            "}\n"
        )

        try:
            raw = LLMEvaluatorService._call_gemini(f"{sys_prompt}\n\nINPUT:\n{prompt}")
            parsed = LLMEvaluatorService._parse_and_normalize(raw, test_cases)
            
            # Cache the successful evaluation
            _EVAL_CACHE[cache_key] = parsed
            return parsed
        except Exception as e:
            if "invalid" in str(e).lower() or "syntax" in str(e).lower():
                return {"error": "Invalid or incomplete code"}
            return {"error": f"Evaluation error: {str(e)}"}

    @staticmethod
    def _call_gemini(prompt: str) -> str:
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise ValueError("GEMINI_API_KEY missing")
        
        client = genai.Client(api_key=api_key)
        config = {
            "max_output_tokens": 1024,
            "temperature": 0.0, # Deterministic
            "response_mime_type": "application/json"
        }
        
        models = ["gemini-2.0-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash-lite"]
        last_e = None
        for m in models:
            try:
                res = client.models.generate_content(model=m, contents=prompt, config=config)
                if res and hasattr(res, 'text'):
                    return res.text.strip()
            except Exception as e:
                last_e = e
        raise last_e or Exception("All Gemini models failed")

    @staticmethod
    def _parse_and_normalize(raw: str, test_cases: List[Dict]) -> Dict[str, Any]:
        raw = raw.strip()
        if raw.startswith("```json"): raw = raw[7:]
        elif raw.startswith("```"): raw = raw[3:]
        if raw.endswith("```"): raw = raw[:-3]
        
        try:
            data = json.loads(raw.strip())
        except json.JSONDecodeError:
            raise ValueError("Invalid JSON returned from LLM")
            
        results = data.get("r", [])
        norm_results = []
        
        for i, tc in enumerate(test_cases):
            expected = str(tc.get("output", "")).strip()
            input_val = str(tc.get("input", "")).strip()
            
            if i < len(results):
                r = results[i]
                actual = str(r.get("a", "N/A")).strip()
                status = str(r.get("s", "")).strip().lower()
                passed = (status == "pass" or actual == expected)
            else:
                actual = "N/A"
                passed = False
                
            norm_results.append({
                "input": input_val,
                "expected": expected,
                "actual": actual,
                "passed": passed
            })
            
        passed_count = sum(1 for r in norm_results if r["passed"])
        total = len(test_cases)
        score = int((passed_count / total) * 100) if total > 0 else 0
        
        return {
            "passed": passed_count,
            "total": total,
            "score": score,
            "results": norm_results,
            "syntax_error": None # Mapped away, if invalid it returns {"error": ...} at root
        }
