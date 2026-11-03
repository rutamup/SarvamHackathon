# JanSuno (जनसुनो) - Civic-Tech Voice-First Problem Reporting Platform

> Built for Pune Municipal Corporation (PMC). Report local civic issues by voice or text in under 60 seconds. Municipal officers manage, prioritize, and resolve complaints on an operations dashboard.

---

## 🏛️ Architecture & Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS, mobile-first design, high contrast, warm white `#FAF9F5` background, emerald green accents, minimum 48px touch targets.
- **Backend**: FastAPI + SQLite (`jansuno.db`).
- **AI Intelligence**: **Sarvam AI Only**
  - **Speech-to-Text**: `saaras:v3` via `POST /speech-to-text` (Marathi, Hindi, English).
  - **Complaint Classification & Translation**: `sarvam-105b` via `POST /v1/chat/completions` (strips `<think>` blocks, enforces schema validation with Pydantic, retries on error).
  - **Spoken Confirmations**: `bulbul:v3` via `POST /text-to-speech` (speaker: `shubh`).
  - **Fallback / Mock Mode**: Runs seamlessly with or without `SARVAM_API_KEY`. Missing or failed API calls produce clearly labelled `"MOCK AI RESPONSE"` outputs without silent fallback.
- **Maps**: Leaflet + OpenStreetMap with urgency-coded markers and hotspot clusters.
- **Charts**: Recharts performance visualization.

---

## ⚡ Quick Start (ONE COMMAND TO RUN EVERYTHING)

### 1. Configure Sarvam API Key
Create or edit `backend/.env`:
```env
SARVAM_API_KEY=your_sarvam_api_key_here
OFFICER_PASSWORD=pune_admin_2026
PORT=8000
```
*(If `SARVAM_API_KEY` is not provided, the platform automatically runs in deterministic mock mode with clear UI disclosures)*.

### 2. Run the Single Start Command
On Windows:
```bash
python run.py
# OR double click: run.bat
```
On Linux/macOS:
```bash
python3 run.py
# OR: ./run.sh
```

- **Citizen Web App**: [http://localhost:5173](http://localhost:5173)
- **Officer Dashboard**: [http://localhost:5173](http://localhost:5173) (Click "Officer Dashboard", Password: `pune_admin_2026`)
- **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🧪 Verified Core Flows (Definition of Done)

| # | Flow | Status | Verification Details |
|---|---|---|---|
| **1** | Speak / Submit Marathi complaint &rarr; transcript &rarr; Complaint ID shown | **PASSED** | End-to-end verified via test suite. Submissions generate IDs like `JS-PUNE-XXXXXX`. |
| **2** | Complaint appears on officer dashboard, translated, categorized, clustered | **PASSED** | Deterministic clustering groups complaints by `(normalised_locality, category)` into collective issues. |
| **3** | Officer changes status &rarr; citizen sees update in their language | **PASSED** | Officer updates to `In Progress` reflected immediately in citizen timeline as `काम प्रगतीपथावर (In Progress)` in Marathi. |
| **4** | App runs from fresh clone with only `SARVAM_API_KEY` added | **PASSED** | `run.py` starts both backend and frontend concurrently with auto-seeding. |

---

## 🔒 Reliability, Honesty & Privacy

1. **No External Providers**: Only Sarvam AI APIs are used. Zero OpenAI, Gemini, or Claude integrations.
2. **Citizen Privacy**:
   - Only first name or "Anonymous" is displayed.
   - GPS coordinates are rounded to ~100m for privacy protection.
   - Photos are strictly restricted to verified municipal officers.
3. **Official Integrity**: AI **never** changes official status. Only human officers can alter workflow states (`Submitted`, `Under Review`, `Assigned`, `In Progress`, `Resolved`, `Reopened`).
4. **Fairness Rule**: Neighbourhood rankings are normalised by resolution percentage and responsiveness; wards with vocal citizens who submit more complaints are **never** penalized for volume.
5. **Pre-Seeded Data**: Pre-seeded with 30 realistic Pune complaints across Kothrud, Hinjewadi, Hadapsar, Katraj, Pimpri, Shivajinagar, Baner, and Viman Nagar labeled `DEMO DATA`.

