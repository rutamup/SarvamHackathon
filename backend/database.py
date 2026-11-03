"""Database initialization, schema, and SQLite helper operations for JanSuno."""
import sqlite3
import os
import json
from datetime import datetime
from typing import Optional, List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(__file__), "jansuno.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Issue Clusters: Groups complaints by normalised_locality + category
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS issue_clusters (
        id TEXT PRIMARY KEY,
        normalised_locality TEXT NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT NOT NULL DEFAULT 'medium',
        department TEXT NOT NULL,
        report_count INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'Submitted',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    # Complaints Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS complaints (
        id TEXT PRIMARY KEY,
        cluster_id TEXT,
        original_text TEXT NOT NULL,
        language_code TEXT NOT NULL DEFAULT 'mr-IN',
        translated_text TEXT,
        summary TEXT,
        category TEXT NOT NULL DEFAULT 'Unclassified',
        department TEXT NOT NULL DEFAULT 'General Administration',
        urgency TEXT NOT NULL DEFAULT 'medium',
        urgency_reason TEXT,
        suggested_action TEXT,
        normalised_locality TEXT,
        area_landmark TEXT,
        issue_duration TEXT,
        latitude REAL,
        longitude REAL,
        photo_url TEXT,
        citizen_name TEXT DEFAULT 'Anonymous',
        status TEXT NOT NULL DEFAULT 'Submitted',
        is_demo BOOLEAN NOT NULL DEFAULT 0,
        is_mock_ai BOOLEAN NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (cluster_id) REFERENCES issue_clusters(id)
    )
    """)

    # Status History Table (Audit trail of official status changes)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complaint_id TEXT NOT NULL,
        old_status TEXT,
        new_status TEXT NOT NULL,
        changed_by TEXT NOT NULL DEFAULT 'Officer',
        officer_note TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (complaint_id) REFERENCES complaints(id)
    )
    """)

    # Departments Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        name_en TEXT NOT NULL,
        name_mr TEXT NOT NULL,
        name_hi TEXT NOT NULL,
        contact_email TEXT,
        contact_phone TEXT
    )
    """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database schema initialized.")

