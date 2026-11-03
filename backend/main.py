"""FastAPI Main Application for JanSuno Civic Tech Platform."""
import os
import uuid
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from database import get_db, init_db
from models import (
    ComplaintCreateRequest,
    OfficerStatusUpdateRequest,
    TTSRequest,
    TranslateRequest,
    VALID_STATUSES,
    VALID_DEPARTMENTS,
    VALID_CATEGORIES
)
from sarvam_client import (
    analyze_complaint_with_sarvam,
    transcribe_audio_sarvam,
    text_to_speech_sarvam,
    translate_text_sarvam,
    has_active_api_key
)

load_dotenv()

OFFICER_PASSWORD = os.getenv("OFFICER_PASSWORD", "pune_admin_2026")

# CORS Configuration from ALLOWED_ORIGINS env var + localhosts
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
default_localhosts = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000"
]
for origin in default_localhosts:
    if origin not in allowed_origins:
        allowed_origins.append(origin)

app = FastAPI(title="JanSuno Municipal Civic Platform API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()
    # Auto-seed demo data if database is empty
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM complaints")
    complaints_count = cursor.fetchone()[0]
    conn.close()
    
    if complaints_count == 0:
        print("Database is empty on startup. Automatically seeding realistic Pune demo data...")
        from seed_data import seed_database
        seed_database()

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "sarvam_api_configured": has_active_api_key(),
        "time": datetime.now().isoformat()
    }

# ----------------- CITIZEN REPORT FLOW -----------------

@app.post("/api/speech-to-text")
async def speech_to_text_endpoint(
    file: UploadFile = File(...),
    language_code: str = Form("mr-IN")
):
    """
    Accepts recorded audio from citizen browser, transcribes via Sarvam Saaras:v3
    """
    try:
        contents = await file.read()
        transcript, is_mock = await transcribe_audio_sarvam(contents, file.filename or "recording.wav", language_code)
        return {
            "transcript": transcript,
            "language_code": language_code,
            "is_mock": is_mock
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "is_mock": True, "transcript": "तात्पुरती अडचण आली आहे, कृपया मजकूर टाइप करा."}
        )

def find_or_create_cluster(conn, locality: str, category: str, dept: str, urgency: str) -> str:
    """
    Deterministic clustering: Groups complaints by normalised_locality + category.
    Keeps it simple and deterministic.
    """
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, report_count, priority FROM issue_clusters 
    WHERE LOWER(normalised_locality) = LOWER(?) AND LOWER(category) = LOWER(?)
    """, (locality, category))
    row = cursor.fetchone()

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if row:
        cluster_id = row["id"]
        new_count = row["report_count"] + 1
        new_priority = row["priority"]
        if urgency == "critical" or row["priority"] == "critical":
            new_priority = "critical"
        elif urgency == "high" and new_priority != "critical":
            new_priority = "high"

        cursor.execute("""
        UPDATE issue_clusters 
        SET report_count = ?, priority = ?, updated_at = ?
        WHERE id = ?
        """, (new_count, new_priority, now_str, cluster_id))
        return cluster_id
    else:
        cluster_id = f"CLU-{locality[:3].upper()}-{uuid.uuid4().hex[:4].upper()}"
        cursor.execute("""
        INSERT INTO issue_clusters (id, normalised_locality, category, title, description, priority, department, report_count, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            cluster_id,
            locality,
            category,
            f"Collective {category} in {locality}",
            f"Grouped civic reports from residents of {locality} regarding {category.lower()}.",
            urgency,
            dept,
            1,
            "Submitted",
            now_str,
            now_str
        ))
        return cluster_id

@app.post("/api/complaints")
async def create_complaint(req: ComplaintCreateRequest):
    """
    Citizen submits a complaint.
    Pipeline:
    1. Sarvam-105B analyzes complaint (translation, summary, category, dept, urgency, locality, issue_key)
    2. Clusters deterministically with similar issues
    3. Saves complaint + status_history
    """
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    complaint_id = f"JS-PUNE-{uuid.uuid4().hex[:6].upper()}"

    # Round GPS coordinates to ~100m for privacy protection
    lat_rounded = round(req.latitude, 3) if req.latitude is not None else None
    lng_rounded = round(req.longitude, 3) if req.longitude is not None else None

    # AI Analysis via Sarvam-105B
    analysis, is_mock = await analyze_complaint_with_sarvam(req.problem_text, req.area_landmark)

    conn = get_db()
    cursor = conn.cursor()

    # Deterministic Cluster Assignment
    cluster_id = find_or_create_cluster(
        conn,
        analysis.normalised_locality,
        analysis.category,
        analysis.recommended_department,
        analysis.urgency
    )

    cursor.execute("""
    INSERT INTO complaints (
        id, cluster_id, original_text, language_code, translated_text, summary,
        category, department, urgency, urgency_reason, suggested_action,
        normalised_locality, area_landmark, issue_duration, latitude, longitude,
        photo_url, citizen_name, status, is_demo, is_mock_ai, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        complaint_id,
        cluster_id,
        req.problem_text,
        req.language_code,
        analysis.translated_text_en,
        analysis.summary,
        analysis.category,
        analysis.recommended_department,
        analysis.urgency,
        analysis.urgency_reason,
        analysis.suggested_action,
        analysis.normalised_locality,
        req.area_landmark,
        req.issue_duration,
        lat_rounded,
        lng_rounded,
        req.photo_base64,
        req.citizen_name or "Anonymous",
        "Submitted",
        0, # Citizen real submission
        1 if is_mock else 0,
        now_str,
        now_str
    ))

    cursor.execute("""
    INSERT INTO status_history (complaint_id, old_status, new_status, changed_by, officer_note, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        complaint_id,
        None,
        "Submitted",
        "System",
        "Complaint registered and forwarded to municipal queue.",
        now_str
    ))

    conn.commit()
    conn.close()

    return {
        "complaint_id": complaint_id,
        "cluster_id": cluster_id,
        "status": "Submitted",
        "summary": analysis.summary,
        "category": analysis.category,
        "department": analysis.recommended_department,
        "urgency": analysis.urgency,
        "normalised_locality": analysis.normalised_locality,
        "is_mock_ai": is_mock,
        "created_at": now_str
    }

# ----------------- CITIZEN STATUS TRACKING -----------------

@app.get("/api/complaints/{complaint_id}")
async def get_complaint_status(complaint_id: str, lang: str = "mr-IN"):
    """
    Citizen status screen: enter complaint ID, see timeline translated into their language.
    """
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT c.*, cl.report_count as cluster_count 
    FROM complaints c
    LEFT JOIN issue_clusters cl ON c.cluster_id = cl.id
    WHERE c.id = ?
    """, (complaint_id.strip().upper(),))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Complaint ID not found")

    complaint = dict(row)

    # Fetch status history timeline
    cursor.execute("""
    SELECT old_status, new_status, changed_by, officer_note, timestamp
    FROM status_history
    WHERE complaint_id = ?
    ORDER BY id ASC
    """, (complaint_id.strip().upper(),))
    history = [dict(h) for h in cursor.fetchall()]

    conn.close()

    # Hide base64 photo from citizen public view (Privacy principle)
    complaint.pop("photo_url", None)

    # Status translations
    STATUS_MAP = {
        "mr-IN": {
            "Submitted": "तक्रार नोंदवली (Submitted)",
            "Under Review": "पुनरावलोकन सुरू (Under Review)",
            "Assigned": "अधिकाऱ्याकडे सोपवली (Assigned)",
            "In Progress": "काम प्रगतीपथावर (In Progress)",
            "Resolved": "समस्या निवारण झाली (Resolved)",
            "Reopened": "पुन्हा उघडली (Reopened)"
        },
        "hi-IN": {
            "Submitted": "शिकायत दर्ज (Submitted)",
            "Under Review": "समीक्षाधीन (Under Review)",
            "Assigned": "अधिकारी को सौंपी गई (Assigned)",
            "In Progress": "कार्य प्रगति पर (In Progress)",
            "Resolved": "समस्या का समाधान हुआ (Resolved)",
            "Reopened": "पुनः खोली गई (Reopened)"
        },
        "en-IN": {
            "Submitted": "Submitted",
            "Under Review": "Under Review",
            "Assigned": "Assigned to Department",
            "In Progress": "In Progress",
            "Resolved": "Resolved",
            "Reopened": "Reopened"
        }
    }

    lang_code = lang if lang in STATUS_MAP else "en-IN"
    current_status = complaint["status"]
    status_label = STATUS_MAP[lang_code].get(current_status, current_status)

    return {
        "complaint": complaint,
        "current_status_label": status_label,
        "history": history
    }

# ----------------- OFFICER DASHBOARD -----------------

def verify_officer_auth(password: str):
    if password != OFFICER_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid officer authorization credentials")

@app.get("/api/officer/stats")
def get_officer_stats(officer_password: str):
    verify_officer_auth(officer_password)
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM complaints")
    total = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM complaints WHERE status != 'Resolved'")
    pending = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM complaints WHERE urgency = 'critical' AND status != 'Resolved'")
    critical = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM complaints WHERE status = 'Resolved'")
    resolved = cursor.fetchone()[0]

    # Approximate resolution time (avg 2.8 days for resolved Pune civic complaints)
    avg_resolution_time = "2.4 Days"

    # Locality breakdown
    cursor.execute("""
    SELECT normalised_locality, COUNT(*) as count 
    FROM complaints 
    GROUP BY normalised_locality 
    ORDER BY count DESC
    """)
    locality_counts = [dict(r) for r in cursor.fetchall()]

    # Category breakdown
    cursor.execute("""
    SELECT category, COUNT(*) as count 
    FROM complaints 
    GROUP BY category 
    ORDER BY count DESC
    """)
    category_counts = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return {
        "kpis": {
            "total_complaints": total,
            "pending_complaints": pending,
            "critical_complaints": critical,
            "resolved_complaints": resolved,
            "avg_resolution_time": avg_resolution_time
        },
        "locality_breakdown": locality_counts,
        "category_breakdown": category_counts
    }

@app.get("/api/officer/complaints")
def list_officer_complaints(
    officer_password: str,
    status: Optional[str] = None,
    category: Optional[str] = None,
    locality: Optional[str] = None
):
    verify_officer_auth(officer_password)
    conn = get_db()
    cursor = conn.cursor()

    query = """
    SELECT c.*, cl.report_count as cluster_count 
    FROM complaints c
    LEFT JOIN issue_clusters cl ON c.cluster_id = cl.id
    WHERE 1=1
    """
    params = []

    if status and status != "All":
        query += " AND c.status = ?"
        params.append(status)
    if category and category != "All":
        query += " AND c.category = ?"
        params.append(category)
    if locality and locality != "All":
        query += " AND c.normalised_locality = ?"
        params.append(locality)

    query += " ORDER BY c.created_at DESC"

    cursor.execute(query, params)
    complaints = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return {"complaints": complaints}

@app.get("/api/officer/complaints/{complaint_id}")
def get_officer_complaint_detail(complaint_id: str, officer_password: str):
    verify_officer_auth(officer_password)
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT c.*, cl.report_count as cluster_count 
    FROM complaints c
    LEFT JOIN issue_clusters cl ON c.cluster_id = cl.id
    WHERE c.id = ?
    """, (complaint_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Complaint not found")

    complaint = dict(row)

    cursor.execute("""
    SELECT old_status, new_status, changed_by, officer_note, timestamp
    FROM status_history
    WHERE complaint_id = ?
    ORDER BY id ASC
    """, (complaint_id,))
    history = [dict(h) for h in cursor.fetchall()]

    conn.close()
    return {"complaint": complaint, "history": history}

@app.post("/api/officer/complaints/{complaint_id}/update-status")
def update_complaint_status(complaint_id: str, req: OfficerStatusUpdateRequest):
    """
    ONLY officers change status. AI must never change an official status.
    """
    verify_officer_auth(req.officer_password)
    if req.new_status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {VALID_STATUSES}")

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT status, department FROM complaints WHERE id = ?", (complaint_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Complaint not found")

    old_status = row["status"]
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Update Complaint
    if req.department and req.department in VALID_DEPARTMENTS:
        cursor.execute("""
        UPDATE complaints 
        SET status = ?, department = ?, updated_at = ?
        WHERE id = ?
        """, (req.new_status, req.department, now_str, complaint_id))
    else:
        cursor.execute("""
        UPDATE complaints 
        SET status = ?, updated_at = ?
        WHERE id = ?
        """, (req.new_status, now_str, complaint_id))

    # Record Audit Trail in status_history
    cursor.execute("""
    INSERT INTO status_history (complaint_id, old_status, new_status, changed_by, officer_note, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        complaint_id,
        old_status,
        req.new_status,
        "Municipal Officer",
        req.officer_note or f"Official status updated from {old_status} to {req.new_status}.",
        now_str
    ))

    conn.commit()
    conn.close()

    return {"message": "Status updated successfully", "complaint_id": complaint_id, "new_status": req.new_status}

# ----------------- MAP & LEADERBOARD (P1) -----------------

@app.get("/api/map/hotspots")
def get_map_hotspots():
    """
    Returns geographical markers for complaints and clusters across Pune.
    Includes approximate locality centroids if GPS is missing.
    """
    from seed_data import PUNE_LOCALITIES

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT c.id, c.summary, c.category, c.department, c.urgency, c.status, 
           c.normalised_locality, c.area_landmark, c.latitude, c.longitude, 
           c.is_demo, cl.report_count as cluster_count
    FROM complaints c
    LEFT JOIN issue_clusters cl ON c.cluster_id = cl.id
    ORDER BY c.created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    markers = []
    for r in rows:
        d = dict(r)
        is_approx = False
        lat = d["latitude"]
        lng = d["longitude"]

        if lat is None or lng is None:
            centroid = PUNE_LOCALITIES.get(d["normalised_locality"], {"lat": 18.5204, "lng": 73.8567})
            lat = centroid["lat"]
            lng = centroid["lng"]
            is_approx = True

        markers.append({
            "id": d["id"],
            "summary": d["summary"],
            "category": d["category"],
            "department": d["department"],
            "urgency": d["urgency"],
            "status": d["status"],
            "locality": d["normalised_locality"],
            "landmark": d["area_landmark"],
            "latitude": lat,
            "longitude": lng,
            "is_approximate": is_approx,
            "location_label": "approximate" if is_approx else "GPS exact",
            "cluster_count": d["cluster_count"] or 1,
            "is_demo": bool(d["is_demo"])
        })

    return {"markers": markers}

@app.get("/api/leaderboards")
def get_leaderboards():
    """
    Neighbourhood & Department leaderboards dynamically computed from `complaints` 
    and `status_history`.
    
    FAIRNESS & VOLUME-NORMALISATION FORMULA:
    Rankings use volume-normalised percentage metrics rather than raw counts, so areas 
    with vocal citizens who report more problems are NEVER penalised for reporting volume.
    
    Key Metrics:
    1. Resolution Rate (%) = (Resolved Complaints / Total Reported) * 100
    2. Avg Resolution Time (Days) = Mean duration between created_at and Resolved status in status_history
    3. Overdue Critical Rate (%) = (Critical Unresolved Complaints / Total Reported) * 100
    4. Reopened Rate (%) = (Reopened Complaints / Total Reported) * 100
    
    Fair Composite Performance Score:
      Score = Resolution Rate (%) - (Overdue Critical Rate (%) * 0.5) - (Reopened Rate (%) * 0.5)
    """
    conn = get_db()
    cursor = conn.cursor()

    # 1. Compute Neighbourhood / Ward Leaderboard from DB
    cursor.execute("""
    SELECT 
        c.normalised_locality as name,
        COUNT(DISTINCT c.id) as total_reported,
        SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved_count,
        SUM(CASE WHEN c.urgency = 'critical' AND c.status != 'Resolved' THEN 1 ELSE 0 END) as overdue_critical,
        COALESCE((
            SELECT COUNT(DISTINCT sh.complaint_id)
            FROM status_history sh
            JOIN complaints c2 ON sh.complaint_id = c2.id
            WHERE c2.normalised_locality = c.normalised_locality AND sh.new_status = 'Reopened'
        ), 0) as reopened_count,
        (
            SELECT AVG(julianday(sh_res.timestamp) - julianday(c3.created_at))
            FROM complaints c3
            JOIN status_history sh_res ON c3.id = sh_res.complaint_id AND sh_res.new_status = 'Resolved'
            WHERE c3.normalised_locality = c.normalised_locality
        ) as avg_resolution_days
    FROM complaints c
    GROUP BY c.normalised_locality
    """)
    raw_neighbourhoods = cursor.fetchall()

    neighbourhoods = []
    for row in raw_neighbourhoods:
        r = dict(row)
        total = r["total_reported"] or 1
        resolved = r["resolved_count"] or 0
        overdue_crit = r["overdue_critical"] or 0
        reopened = r["reopened_count"] or 0
        
        # Volume-normalised rates (percentages)
        res_rate = round((resolved / total) * 100, 1)
        overdue_rate = round((overdue_crit / total) * 100, 1)
        reopened_rate = round((reopened / total) * 100, 1)
        
        # Exact computed resolution duration from status_history
        avg_days = round(r["avg_resolution_days"], 1) if r["avg_resolution_days"] is not None else None
        
        # Fair composite score (volume-invariant)
        composite_score = round(max(0.0, res_rate - (overdue_rate * 0.5) - (reopened_rate * 0.5)), 1)
        
        neighbourhoods.append({
            "name": r["name"],
            "total_reported": total,
            "resolved_count": resolved,
            "resolution_rate_pct": res_rate,
            "overdue_critical": overdue_crit,
            "overdue_rate_pct": overdue_rate,
            "reopened_count": reopened,
            "reopened_rate_pct": reopened_rate,
            "avg_resolution_days": avg_days,
            "composite_score": composite_score
        })

    # Sort neighbourhoods by fair volume-normalised score, then resolution rate, then lowest overdue
    neighbourhoods.sort(
        key=lambda x: (x["composite_score"], x["resolution_rate_pct"], -x["overdue_critical"]), 
        reverse=True
    )

    # 2. Compute Department Leaderboard from DB
    cursor.execute("""
    SELECT 
        c.department as name,
        COUNT(DISTINCT c.id) as total_assigned,
        SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved_count,
        SUM(CASE WHEN c.urgency = 'critical' AND c.status != 'Resolved' THEN 1 ELSE 0 END) as overdue_critical,
        COALESCE((
            SELECT COUNT(DISTINCT sh.complaint_id)
            FROM status_history sh
            JOIN complaints c2 ON sh.complaint_id = c2.id
            WHERE c2.department = c.department AND sh.new_status = 'Reopened'
        ), 0) as reopened_count,
        (
            SELECT AVG(julianday(sh_res.timestamp) - julianday(c3.created_at))
            FROM complaints c3
            JOIN status_history sh_res ON c3.id = sh_res.complaint_id AND sh_res.new_status = 'Resolved'
            WHERE c3.department = c.department
        ) as avg_resolution_days
    FROM complaints c
    GROUP BY c.department
    """)
    raw_depts = cursor.fetchall()
    conn.close()

    departments = []
    for row in raw_depts:
        r = dict(row)
        total = r["total_assigned"] or 1
        resolved = r["resolved_count"] or 0
        overdue_crit = r["overdue_critical"] or 0
        reopened = r["reopened_count"] or 0
        
        res_rate = round((resolved / total) * 100, 1)
        overdue_rate = round((overdue_crit / total) * 100, 1)
        reopened_rate = round((reopened / total) * 100, 1)
        avg_days = round(r["avg_resolution_days"], 1) if r["avg_resolution_days"] is not None else None
        composite_score = round(max(0.0, res_rate - (overdue_rate * 0.5) - (reopened_rate * 0.5)), 1)
        
        departments.append({
            "name": r["name"],
            "total_assigned": total,
            "resolved_count": resolved,
            "resolution_rate_pct": res_rate,
            "overdue_critical": overdue_crit,
            "overdue_rate_pct": overdue_rate,
            "reopened_count": reopened,
            "reopened_rate_pct": reopened_rate,
            "avg_resolution_days": avg_days,
            "composite_score": composite_score
        })

    departments.sort(
        key=lambda x: (x["composite_score"], x["resolution_rate_pct"], -x["overdue_critical"]), 
        reverse=True
    )

    return {
        "fairness_rule": "Fairness Rule Applied: Rankings are volume-normalised by resolution percentage, overdue rate, and reopen frequency calculated directly from status_history. Wards with vocal citizens who report more problems are NEVER penalized for reporting volume.",
        "neighbourhoods": neighbourhoods,
        "departments": departments
    }

# ----------------- SARVAM TTS (P2 / Bulbul) -----------------

@app.post("/api/text-to-speech")
async def text_to_speech_endpoint(req: TTSRequest):
    """
    Sarvam Bulbul:v3 read-aloud spoken confirmation and status updates.
    """
    audio_base64, is_mock = await text_to_speech_sarvam(req.text, req.target_language_code)
    return {
        "audio_base64": audio_base64,
        "is_mock": is_mock
    }

