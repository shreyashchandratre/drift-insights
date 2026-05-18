"""
Event Store — Structured audit trail for all DriftInsights system events.
Logs predictions, drift alerts, SHAP results, adaptations, and deployments.
"""
import json
import os
import time
import uuid
from datetime import datetime

EVENT_LOG_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "event_log.json")

def _ensure_log():
    os.makedirs(os.path.dirname(EVENT_LOG_PATH), exist_ok=True)
    if not os.path.exists(EVENT_LOG_PATH):
        with open(EVENT_LOG_PATH, "w") as f:
            json.dump([], f)

def log_event(event_type: str, payload: dict) -> dict:
    """Append an event to the JSON event store and return it."""
    _ensure_log()
    event = {
        "id": str(uuid.uuid4())[:8],
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "epoch": time.time(),
        "type": event_type,
        "payload": payload
    }
    with open(EVENT_LOG_PATH, "r+") as f:
        events = json.load(f)
        events.append(event)
        f.seek(0)
        json.dump(events, f, indent=2)
    return event

def get_events(event_type: str = None, limit: int = 500) -> list:
    """Retrieve events, optionally filtered by type."""
    _ensure_log()
    with open(EVENT_LOG_PATH, "r") as f:
        events = json.load(f)
    if event_type:
        events = [e for e in events if e["type"] == event_type]
    return events[-limit:]

def clear_events():
    """Clear all events (used on pipeline reset)."""
    _ensure_log()
    with open(EVENT_LOG_PATH, "w") as f:
        json.dump([], f)
