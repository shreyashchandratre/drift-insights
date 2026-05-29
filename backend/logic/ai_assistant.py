import os
import json
from dotenv import load_dotenv
from cerebras.cloud.sdk import Cerebras

load_dotenv()

def ask_cerebras(question: str, context_state: dict) -> str:
    """
    Sends a question to the Cerebras API along with the current ML pipeline state.
    """
    api_key = os.getenv("CEREBRAS_API_KEY")
    if not api_key:
        return "Error: CEREBRAS_API_KEY is not set in the environment variables."

    client = Cerebras(api_key=api_key)

    # Summarize context to avoid exceeding token limits
    context_str = json.dumps({
        "current_phase": context_state.get("phase", "Unknown"),
        "model_type": context_state.get("model_type"),
        "baseline_accuracy": (context_state.get("baseline_report") or {}).get("baseline_accuracy"),
        "drift_detected": (context_state.get("drift_results") or {}).get("change_point") is not None if context_state.get("drift_results") else False,
        "drift_type": (context_state.get("drift_type_result") or {}).get("drift_type"),
        "shap_severity": (context_state.get("severity") or {}).get("severity"),
        "top_drifting_features": [f["feature"] for f in (context_state.get("shap_report") or [])[:3]] if context_state.get("shap_report") else [],
        "adaptation_status": "Success" if (context_state.get("adaptation_result") or {}).get("success") else "None"
    }, indent=2)

    system_prompt = (
        "You are an expert Machine Learning assistant integrated into 'DriftInsights', a concept drift detection dashboard.\n"
        "Your role is to help the user understand the current state of their machine learning pipeline, explain drift phenomena, "
        "and interpret SHAP Delta E values. Be concise, technical yet accessible, and directly reference the current context.\n\n"
        f"CURRENT PIPELINE CONTEXT:\n{context_str}\n"
    )

    try:
        response = client.chat.completions.create(
            model="llama3.1-8b", # Using Llama 3.1 8B available on Cerebras
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": question}
            ],
            max_tokens=500,
            temperature=0.3
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error communicating with Cerebras API: {str(e)}"
