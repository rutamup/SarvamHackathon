"""Sarvam AI client wrapper with fallback, validation, and rate handling."""
import os
import json
import re
import httpx
from typing import Optional, Dict, Any, Tuple
from dotenv import load_dotenv
from models import AIAnalysisResult, VALID_CATEGORIES, VALID_DEPARTMENTS, VALID_URGENCIES

load_dotenv()

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "").strip()
SARVAM_BASE_URL = "https://api.sarvam.ai"

def has_active_api_key() -> bool:
    return bool(SARVAM_API_KEY and len(SARVAM_API_KEY) > 5)

def clean_think_blocks(text: str) -> str:
    """Strip <think>...</think> blocks emitted by reasoning models like Sarvam-105B."""
    cleaned = re.sub(r"<think>[\s\S]*?</think>", "", text, flags=re.DOTALL)
    return cleaned.strip()

def extract_json_object(text: str) -> Optional[Dict[str, Any]]:
    """Extract first JSON block from text, handling markdown fences or inline json."""
    cleaned = clean_think_blocks(text)
    # Check for markdown code fence
    match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", cleaned)
    if match:
        try:
            return json.loads(match.group(1))
        except Exception:
            pass
    # Check for standalone curly brackets
    match = re.search(r"(\{[\s\S]*\})", cleaned)
    if match:
        try:
            return json.loads(match.group(1))
        except Exception:
            pass
    return None

def mock_fallback_analysis(text: str, area_landmark: Optional[str] = None) -> AIAnalysisResult:
    """Reliable fallback if API key is missing or call fails."""
    lower = text.lower()
    
    # Locality heuristic from text or landmark
    locality = "Shivajinagar"
    for loc in ["Hadapsar", "Kothrud", "Hinjewadi", "Pimpri", "Katraj", "Baner", "Viman Nagar", "Wakad", "Aundh", "Swargate"]:
        if loc.lower() in lower or (area_landmark and loc.lower() in area_landmark.lower()):
            locality = loc
            break
            
    if any(k in lower for k in ["पाणी", "पानी", "water", "pipe", "pipeline", "leak", "tap"]):
        return AIAnalysisResult(
            summary=f"Water supply shortage or pipeline issue in {locality}",
            translated_text_en=f"Reporting severe water problem or pipeline leakage: '{text}'",
            category="Water Supply & Shortage",
            recommended_department="Water Supply Department",
            urgency="high",
            urgency_reason="Water is an essential utility affecting multiple households.",
            suggested_action="Dispatch local water tanker and send junior engineer to inspect pipeline valve.",
            normalised_locality=locality,
            issue_key="water_shortage"
        )
    elif any(k in lower for k in ["खड्डा", "खड्डे", "गड्ढा", "road", "pothole", "accident", "रस्ता", "सड़क"]):
        return AIAnalysisResult(
            summary=f"Severe road damage and potholes in {locality}",
            translated_text_en=f"Reporting damaged road surface and hazardous potholes: '{text}'",
            category="Roads & Potholes",
            recommended_department="Road & Maintenance Department",
            urgency="high",
            urgency_reason="Potholes pose imminent accident hazards for two-wheelers and pedestrians.",
            suggested_action="Deploy road patcher team with cold asphalt mix within 24 hours.",
            normalised_locality=locality,
            issue_key="pothole_road"
        )
    elif any(k in lower for k in ["कचरा", "कचराकुंडी", "garbage", "trash", "waste", "दुर्गंधी", "smell", "कूड़ा"]):
        return AIAnalysisResult(
            summary=f"Uncollected garbage dump creating foul smell in {locality}",
            translated_text_en=f"Reporting uncleaned municipal trash and hygiene hazard: '{text}'",
            category="Garbage & Solid Waste",
            recommended_department="Solid Waste Management",
            urgency="medium",
            urgency_reason="Accumulation of garbage creates disease breeding grounds.",
            suggested_action="Route municipal compactor truck to clear container bin and spray disinfectant.",
            normalised_locality=locality,
            issue_key="garbage_dump"
        )
    elif any(k in lower for k in ["गटार", "नाली", "drain", "drainage", "sewage", "overflow", "चोक"]):
        return AIAnalysisResult(
            summary=f"Drainage overflow and clogged sewage lines in {locality}",
            translated_text_en=f"Reporting blocked drainage and sewer overflow: '{text}'",
            category="Drainage & Sewage",
            recommended_department="Drainage & Sewage Board",
            urgency="high",
            urgency_reason="Sewage overflow creates public health risk and foul stagnant water.",
            suggested_action="Deploy suction jetting machine to clear pipeline blockage.",
            normalised_locality=locality,
            issue_key="drainage_overflow"
        )
    elif any(k in lower for k in ["लाईट", "लाइट", "बत्ती", "light", "pole", "wire", "विद्युत"]):
        return AIAnalysisResult(
            summary=f"Non-functional streetlights causing dark street in {locality}",
            translated_text_en=f"Reporting broken street lights and electrical failure: '{text}'",
            category="Streetlights & Electricity",
            recommended_department="Electrical Department",
            urgency="medium",
            urgency_reason="Dark streets compromise female and commuter safety at night.",
            suggested_action="Replace faulty LED fixtures and check feeder line.",
            normalised_locality=locality,
            issue_key="broken_streetlights"
        )
    else:
        return AIAnalysisResult(
            summary=f"Civic problem reported in {locality}",
            translated_text_en=f"Citizen reports: '{text}'",
            category="Unclassified",
            recommended_department="General Administration",
            urgency="medium",
            urgency_reason="Requires municipal inspection to classify properly.",
            suggested_action="Officer to review complaint description and route to ward officer.",
            normalised_locality=locality,
            issue_key="general_civic_issue"
        )

async def analyze_complaint_with_sarvam(text: str, area_landmark: Optional[str] = None) -> Tuple[AIAnalysisResult, bool]:
    """
    Sends the complaint text to Sarvam-105B chat completions.
    Returns (AIAnalysisResult, is_mock).
    Validates output and retries once on parse error.
    """
    if not has_active_api_key():
        return mock_fallback_analysis(text, area_landmark), True

    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json"
    }

    system_prompt = f"""You are the JanSuno Municipal Intelligence System for Pune Municipal Corporation (PMC).
Analyze the citizen's civic complaint submitted in Marathi, Hindi, or English.
Output ONLY a valid JSON object with NO preamble, NO explanations, and NO markdown code formatting outside the JSON.
The JSON must adhere to this exact schema:
{{
  "summary": "Crisp 1-sentence English summary of the problem",
  "translated_text_en": "Accurate English translation of citizen complaint",
  "category": "Must be one of: {json.dumps(VALID_CATEGORIES)}",
  "recommended_department": "Must be one of: {json.dumps(VALID_DEPARTMENTS)}",
  "urgency": "low or medium or high or critical",
  "urgency_reason": "One clear sentence why this urgency level was assigned",
  "suggested_action": "Actionable task for the field engineer/officer",
  "normalised_locality": "Standardised Pune ward/locality (e.g. Kothrud, Hadapsar, Hinjewadi, Katraj, Pimpri, Baner, Shivajinagar, Swargate, Viman Nagar, Aundh, Yerawada, Kondhwa, Camp, Karve Nagar, etc.)",
  "issue_key": "short snake_case key (e.g. water_pipeline_leak, pothole_road, garbage_dump, streetlight_broken, drainage_overflow)"
}}
If locality is not identifiable, default to 'Pune Central'.
If category is uncertain, choose 'Unclassified'.
"""

    user_prompt = f"Citizen Complaint Text: \"{text}\"\nAdditional landmark/locality mentioned by citizen: \"{area_landmark or 'Not provided'}\""

    payload = {
        "model": "sarvam-105b",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.1
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Try up to 2 times
        for attempt in range(2):
            try:
                resp = await client.post(f"{SARVAM_BASE_URL}/v1/chat/completions", headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    parsed = extract_json_object(content)
                    if parsed:
                        # Normalize category, department, urgency
                        if parsed.get("category") not in VALID_CATEGORIES:
                            parsed["category"] = "Unclassified"
                        if parsed.get("recommended_department") not in VALID_DEPARTMENTS:
                            parsed["recommended_department"] = "General Administration"
                        if parsed.get("urgency") not in VALID_URGENCIES:
                            parsed["urgency"] = "medium"
                        
                        return AIAnalysisResult(**parsed), False
            except Exception as e:
                pass
                
    # Fallback if both tries fail
    return mock_fallback_analysis(text, area_landmark), True

async def transcribe_audio_sarvam(file_bytes: bytes, filename: str, language_code: str = "mr-IN") -> Tuple[str, bool]:
    """
    Transcribes audio using Sarvam POST /speech-to-text
    Multipart form (file, model=saaras:v3, language_code, mode=transcribe)
    Returns (transcript_text, is_mock).
    """
    if not has_active_api_key():
        # Helpful mock response depending on language
        if "mr" in language_code:
            return "आमच्या गल्लीमध्ये गेल्या तीन दिवसांपासून पिण्याचे पाणी येत नाहीये, लहान मुलांचे खूप हाल होत आहेत.", True
        elif "hi" in language_code:
            return "हमारे इलाके में मुख्य सड़क पर बहुत बड़ा गड्ढा हो गया है जिससे कल रात दो बाइक सवार गिर गए।", True
        else:
            return "There is a massive garbage heap dumped near the community park that has not been cleared for a week.", True

    headers = {
        "api-subscription-key": SARVAM_API_KEY
    }

    files = {
        "file": (filename, file_bytes, "audio/wav")
    }
    data = {
        "model": "saaras:v3",
        "language_code": language_code,
        "mode": "transcribe"
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{SARVAM_BASE_URL}/speech-to-text", headers=headers, files=files, data=data)
            if resp.status_code == 200:
                res_data = resp.json()
                transcript = res_data.get("transcript", "")
                return transcript, False
    except Exception:
        pass

    # Fallback if call fails
    if "mr" in language_code:
        return "आमच्या भागात पाण्याचा मोठा तुटवडा आहे आणि पाईप फुटली आहे.", True
    elif "hi" in language_code:
        return "सड़क पर कचरे का ढेर लगा है और बदबू आ रही है।", True
    return "The streetlights have not been working for the past week, making it dangerous at night.", True

async def text_to_speech_sarvam(text: str, target_language_code: str = "mr-IN") -> Tuple[Optional[str], bool]:
    """
    POST /text-to-speech, model=bulbul:v3, speaker=shubh, target_language_code, max 2500 chars
    Returns (base64_audio, is_mock).
    """
    if not has_active_api_key():
        return None, True

    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json"
    }

    payload = {
        "inputs": [text[:2500]],
        "target_language_code": target_language_code,
        "speaker": "shubh",
        "model": "bulbul:v3"
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(f"{SARVAM_BASE_URL}/text-to-speech", headers=headers, json=payload)
            if resp.status_code == 200:
                res_json = resp.json()
                audios = res_json.get("audios", [])
                if audios:
                    return audios[0], False
    except Exception:
        pass
    return None, True

async def translate_text_sarvam(text: str, source_language_code: str, target_language_code: str) -> Tuple[str, bool]:
    """
    POST /translate using sarvam-translate:v1
    """
    if not has_active_api_key():
        return text, True

    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json"
    }

    payload = {
        "input": text,
        "source_language_code": source_language_code,
        "target_language_code": target_language_code,
        "model": "sarvam-translate:v1"
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(f"{SARVAM_BASE_URL}/translate", headers=headers, json=payload)
            if resp.status_code == 200:
                res = resp.json()
                translated = res.get("translated_text", text)
                return translated, False
    except Exception:
        pass
    return text, True

