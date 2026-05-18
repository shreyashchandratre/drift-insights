import sqlite3
import os
import json

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "drift_insights.db")

def get_db():
    # Ensure data directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    # Connect with dictionary row factory for dict-like access
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    
    # Initialize schema if not exists
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            timestamp TEXT,
            epoch REAL,
            type TEXT,
            payload TEXT
        )
    ''')
    conn.commit()
    
    return conn
