import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Clock, CheckCircle, AlertCircle, Building2, MapPin, Volume2, ShieldCheck } from 'lucide-react';
import { LanguageCode, TRANSLATIONS } from './translations';
import { API_BASE_URL } from './config';

interface StatusTrackingProps {
  lang: LanguageCode;
  initialId?: string;
  onBack: () => void;
}

export const StatusTracking: React.FC<StatusTrackingProps> = ({ lang, initialId = '', onBack }) => {
  const t = TRANSLATIONS[lang];
  const [complaintId, setComplaintId] = useState(initialId);
  const [loading, setLoading] = useState(false);
  const [complaintData, setComplaintData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Bulbul TTS for status
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [playingTTS, setPlayingTTS] = useState(false);

  useEffect(() => {
    if (initialId) {
      searchStatus(initialId);
    }
  }, [initialId]);

  const searchStatus = async (idToSearch?: string) => {
    const queryId = (idToSearch || complaintId).trim();
    if (!queryId) return;

    setLoading(true);
    setError(null);
    setComplaintData(null);
    setAudioBase64(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/complaints/${encodeURIComponent(queryId)}?lang=${lang}`);
      if (!res.ok) {
        throw new Error('Complaint ID not found. Please verify the code.');
      }
      const data = await res.json();
      setComplaintData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch complaint status.');
    } finally {
      setLoading(false);
    }
  };

  const playBulbulStatus = async () => {
    if (!complaintData) return;
    const c = complaintData.complaint;
    const label = complaintData.current_status_label;

    let text = `तक्रार ${c.id} ची सद्यस्थिती ${label} आहे. विभाग: ${c.department}.`;
    if (lang === 'hi-IN') {
      text = `शिकायत ${c.id} की वर्तमान स्थिति ${label} है। विभाग: ${c.department}।`;
    } else if (lang === 'en-IN') {
      text = `Complaint ${c.id} status is ${c.status}. Handled by ${c.department}.`;
    }

    try {
      setPlayingTTS(true);
      const res = await fetch(`${API_BASE_URL}/api/text-to-speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          target_language_code: lang
        })
      });
      const d = await res.json();
      if (d.audio_base64) {
        const audio = new Audio(`data:audio/wav;base64,${d.audio_base64}`);
        audio.onended = () => setPlayingTTS(false);
        audio.play().catch(() => setPlayingTTS(false));
      } else {
        setPlayingTTS(false);
      }
    } catch (e) {
      setPlayingTTS(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Resolved': return 'bg-emerald-600 text-white';
      case 'In Progress': return 'bg-blue-600 text-white';
      case 'Assigned': return 'bg-purple-600 text-white';
      case 'Under Review': return 'bg-amber-500 text-white';
      case 'Reopened': return 'bg-rose-600 text-white';
      default: return 'bg-stone-500 text-white';
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-4 min-h-[90vh] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center text-emerald-800 font-medium bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl text-base transition-colors min-h-[48px]"
          >
            <ArrowLeft className="w-5 h-5 mr-1" /> {t.backToHome}
          </button>
          <span className="text-sm font-semibold text-stone-600 bg-stone-100 px-3 py-1.5 rounded-full">
            Track Status
          </span>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-stone-200 mb-6">
          <h2 className="text-xl font-bold text-stone-900 mb-2">{t.checkStatus}</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={complaintId}
              onChange={(e) => setComplaintId(e.target.value)}
              placeholder={t.enterIdPlaceholder}
              className="flex-1 text-base uppercase font-mono p-3.5 rounded-2xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <button
              onClick={() => searchStatus()}
              disabled={loading}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 rounded-2xl min-h-[48px] flex items-center justify-center transition-colors"
            >
              {loading ? <Clock className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-rose-50 text-rose-700 text-sm rounded-xl border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Complaint Detail Card */}
        {complaintData && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 space-y-6">
            {/* Header / Current Status Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
              <div>
                <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                  Complaint ID
                </span>
                <h3 className="text-2xl font-black text-stone-900 font-mono">
                  {complaintData.complaint.id}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${getStatusColor(complaintData.complaint.status)}`}>
                  {complaintData.current_status_label}
                </span>
                {complaintData.complaint.is_demo === 1 && (
                  <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-1 rounded-full font-bold">
                    DEMO DATA
                  </span>
                )}
              </div>
            </div>

            {/* Read Aloud status with Sarvam Bulbul */}
            <button
              onClick={playBulbulStatus}
              disabled={playingTTS}
              className="w-full flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-semibold py-3 px-4 rounded-2xl text-sm border border-emerald-200 min-h-[48px] transition-colors"
            >
              <Volume2 className="w-5 h-5 text-emerald-700" />
              {playingTTS ? 'Speaking status...' : t.spokenConfirmation}
            </button>

            {/* Key Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-stone-50 p-4 rounded-2xl">
              <div>
                <p className="text-xs text-stone-600 font-bold uppercase">Summary</p>
                <p className="font-semibold text-stone-900 mt-0.5">{complaintData.complaint.summary}</p>
              </div>
              <div>
                <p className="text-xs text-stone-600 font-bold uppercase">Responsible Department</p>
                <p className="font-semibold text-stone-900 mt-0.5 flex items-center gap-1">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  {complaintData.complaint.department}
                </p>
              </div>
              <div>
                <p className="text-xs text-stone-600 font-bold uppercase">Locality & Landmark</p>
                <p className="font-semibold text-stone-900 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  {complaintData.complaint.normalised_locality} ({complaintData.complaint.area_landmark || 'General area'})
                </p>
              </div>
              <div>
                <p className="text-xs text-stone-600 font-bold uppercase">Urgency & Similar Reports</p>
                <p className="font-semibold text-stone-900 mt-0.5">
                  <span className="capitalize font-bold text-rose-700">{complaintData.complaint.urgency}</span> &bull; Clustered with {complaintData.complaint.cluster_count || 1} reports
                </p>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h4 className="text-base font-bold text-stone-900 mb-3">{t.timeline}</h4>
              <div className="relative pl-6 border-l-2 border-emerald-300 space-y-6">
                {complaintData.history.map((h: any, idx: number) => (
                  <div key={idx} className="relative group">
                    {/* Dot */}
                    <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900 text-sm">
                          {h.new_status}
                        </span>
                        <span className="text-xs text-stone-500 font-mono">
                          {h.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 mt-0.5 italic">
                        By: {h.changed_by}
                      </p>
                      {h.officer_note && (
                        <p className="text-xs text-stone-800 bg-stone-100 p-2 rounded-xl mt-1.5">
                          "{h.officer_note}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 text-center text-xs text-stone-600 max-w-sm mx-auto">
        {t.privacyNotice}
      </div>
    </div>
  );
};

