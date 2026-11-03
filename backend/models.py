"""Pydantic schemas and models for JanSuno."""
from pydantic import BaseModel, Field
from typing import Optional, List

# Allowed categories and departments
VALID_CATEGORIES = [
    "Water Supply & Shortage",
    "Roads & Potholes",
    "Garbage & Solid Waste",
    "Drainage & Sewage",
    "Streetlights & Electricity",
    "Health & Sanitation",
    "Public Transport & Traffic",
    "Unclassified"
]

VALID_DEPARTMENTS = [
    "Water Supply Department",
    "Road & Maintenance Department",
    "Solid Waste Management",
    "Drainage & Sewage Board",
    "Electrical Department",
    "Public Health Department",
    "Traffic & Transport Division",
    "General Administration"
]

VALID_URGENCIES = ["low", "medium", "high", "critical"]

VALID_STATUSES = [
    "Submitted",
    "Under Review",
    "Assigned",
    "In Progress",
    "Resolved",
    "Reopened"
]

class AIAnalysisResult(BaseModel):
    summary: str = Field(description="One sentence crisp English summary of the complaint")
    translated_text_en: str = Field(description="Accurate English translation of the user's issue")
    category: str = Field(description="Categorized civic issue", default="Unclassified")
    recommended_department: str = Field(description="Municipal department responsible", default="General Administration")
    urgency: str = Field(description="low/medium/high/critical", default="medium")
    urgency_reason: str = Field(description="One line justification for the urgency score")
    suggested_action: str = Field(description="Immediate actionable recommendation for field officers")
    normalised_locality: str = Field(description="Standardized name of the Pune neighbourhood / ward, e.g. Kothrud, Hadapsar, Hinjewadi, Katraj, Pimpri, Shivajinagar, Baner, Viman Nagar, etc.")
    issue_key: str = Field(description="Short 2-3 word canonical slug for clustering, e.g. water_pipeline_leak, pothole_road, garbage_dump")

class ComplaintCreateRequest(BaseModel):
    problem_text: str
    language_code: str = "mr-IN"
    village_city: Optional[str] = "Pune"
    area_landmark: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    issue_duration: Optional[str] = "A few days"
    photo_base64: Optional[str] = None
    citizen_name: Optional[str] = "Anonymous"

class OfficerStatusUpdateRequest(BaseModel):
    new_status: str
    officer_password: str
    officer_note: Optional[str] = None
    department: Optional[str] = None

class TTSRequest(BaseModel):
    text: str
    target_language_code: str = "mr-IN"

class TranslateRequest(BaseModel):
    text: str
    source_language_code: str
    target_language_code: str

