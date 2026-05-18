import os
import time
import uuid
import json
from datetime import datetime

try:
    from db import get_db
    DB_AVAILABLE = True
except ImportError:
    DB_AVAILABLE = False

def log_event(event_type: str, payload: dict) -> dict:
    """Append an event to the SQLite event store and return it."""
    event = {
        "id": str(uuid.uuid4())[:8],
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "epoch": time.time(),
        "type": event_type,
        "payload": payload
    }
    if DB_AVAILABLE:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO events (id, timestamp, epoch, type, payload) VALUES (?, ?, ?, ?, ?)",
            (event["id"], event["timestamp"], event["epoch"], event["type"], json.dumps(event["payload"]))
        )
        conn.commit()
        conn.close()
            
    return event

def get_events(event_type: str = None, limit: int = 500) -> list:
    """Retrieve events, optionally filtered by type."""
    if not DB_AVAILABLE:
        return []
        
    conn = get_db()
    cursor = conn.cursor()
    
    if event_type:
        cursor.execute("SELECT * FROM events WHERE type = ? ORDER BY epoch ASC LIMIT ?", (event_type, limit))
    else:
        cursor.execute("SELECT * FROM events ORDER BY epoch ASC LIMIT ?", (limit,))
        
    rows = cursor.fetchall()
    conn.close()
    
    events = []
    for row in rows:
        events.append({
            "id": row["id"],
            "timestamp": row["timestamp"],
            "epoch": row["epoch"],
            "type": row["type"],
            "payload": json.loads(row["payload"])
        })
        
    return events

def clear_events():
    """Clear all events (used on pipeline reset)."""
    if DB_AVAILABLE:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM events")
        conn.commit()
        conn.close()
