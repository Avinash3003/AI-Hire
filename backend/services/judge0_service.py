import requests
from typing import List, Dict, Any

class Judge0Service:
    """
    Code execution using Piston API (https://emkc.org/api/v2/piston/execute)
    - Completely FREE, no API key required
    - No account needed
    - Supports Python 3, JavaScript, C++, Java and more
    """
    PISTON_URL = "https://emkc.org/api/v2/piston/execute"

    @staticmethod
    def evaluate_code(candidate_code: str, test_cases: List[Dict[str, str]], language_id: int = 71) -> Dict[str, Any]:
        """
        Executes candidate's code against test cases via Piston API.
        language_id is kept for API compatibility but Piston uses language names.
        """
        passed_count = 0
        total_count = len(test_cases)
        results = []

        for case in test_cases:
            expected_output = str(case["output"]).strip()
            raw_input = case["input"].strip()

            # Wrap candidate's solve() function with a runner
            wrapped_code = f"""{candidate_code}

# Auto-generated runner
if __name__ == "__main__":
    try:
        args = eval("({raw_input},)")
        if not isinstance(args, tuple):
            args = (args,)
        res = solve(*args)
        print(repr(res))
    except Exception as e:
        print(f"RUNTIME_ERROR: {{e}}")
"""

            payload = {
                "language": "python",
                "version": "3.10.0",
                "files": [
                    {
                        "name": "solution.py",
                        "content": wrapped_code
                    }
                ],
                "stdin": "",
                "args": [],
                "compile_timeout": 10000,
                "run_timeout": 5000,
                "compile_memory_limit": -1,
                "run_memory_limit": -1
            }

            try:
                resp = requests.post(Judge0Service.PISTON_URL, json=payload, timeout=15)
                if resp.status_code == 200:
                    data = resp.json()
                    run = data.get("run", {})
                    stdout = (run.get("stdout") or "").strip()
                    stderr = (run.get("stderr") or "").strip()

                    passed = str(stdout) == str(expected_output)
                    if passed:
                        passed_count += 1

                    results.append({
                        "input": raw_input,
                        "expected": expected_output,
                        "actual": stdout,
                        "stderr": stderr,
                        "passed": passed
                    })
                else:
                    results.append({
                        "input": raw_input,
                        "expected": expected_output,
                        "actual": "API_ERROR",
                        "passed": False
                    })
            except Exception as e:
                print(f"Piston execution error: {e}")
                results.append({
                    "input": raw_input,
                    "expected": expected_output,
                    "actual": "NETWORK_ERROR",
                    "passed": False
                })

        score_percentage = 0 if total_count == 0 else int((passed_count / total_count) * 100)

        return {
            "passed": passed_count,
            "total": total_count,
            "score": score_percentage,
            "details": results
        }
