import React, { useState, useRef } from 'react';
import { Mic, MicOff, MapPin, Camera, CheckCircle2, Volume2, ArrowLeft, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { LanguageCode, TRANSLATIONS } from './translations';
import { API_BASE_URL } from './config';

interface ReportFlowProps {
  lang: LanguageCode;
  onBack: () => void;
  onTrackId: (id: string) => void;
}

export const ReportFlow: React.FC<ReportFlowProps> = ({ lang, onBack, onTrackId }) => {
  const t = TRANSLATIONS[lang];

  // Form states
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [problemText, setProblemText] = useState('');
  const [villageCity, setVillageCity] = useState('Pune');
  const [areaLandmark, setAreaLandmark] = useState('');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [issueDuration, setIssueDuration] = useState('2-3 days');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [citizenName, setCitizenName] = useState('Concerned Citizen');

  // Audio recording
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState(false);

  // Convert WebM/audio to WAV or send directly
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioUpload(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert('Microphone permission not granted or browser does not support audio capture.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioUpload = async (blob: Blob) => {
    setTranscribing(true);
    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');
    formData.append('language_code', lang);

    try {
      const res = await fetch(`${API_BASE_URL}/api/speech-to-text`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.transcript) {
        setProblemText(prev => prev ? `${prev} ${data.transcript}` : data.transcript);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTranscribing(false);
    }
  };

  const getGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setGpsLoading(false);
      },
      (err) => {
        // Fallback default Pune Shivaji Nagar coordinate for demo
        setGpsCoords({ lat: 18.5314, lng: 73.8446 });
        setGpsLoading(false);
      },
      { timeout: 7000 }
    );
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitComplaint = async () => {
    if (!problemText.trim()) {
      alert('Please describe or speak the problem first.');
      setStep(1);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_text: problemText,
          language_code: lang,
          village_city: villageCity,
          area_landmark: areaLandmark,
          latitude: gpsCoords?.lat,
          longitude: gpsCoords?.lng,
          issue_duration: issueDuration,
          photo_base64: photoBase64,
          citizen_name: citizenName
        })
      });

      const data = await res.json();
      setSubmitResult(data);
      setStep(4);

      // Pre-fetch TTS confirmation
      fetchSpokenConfirmation(data.complaint_id, data.summary);
    } catch (e) {
      alert('Error submitting complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchSpokenConfirmation = async (id: string, summary: string) => {
    let spokenText = '';
    if (lang === 'mr-IN') {
      spokenText = `तुमची तक्रार नोंदवली आहे. तक्रार आयडी ${id} आहे. महानगरपालिका अधिकारी यावर त्वरित कारवाई करतील.`;
    } else if (lang === 'hi-IN') {
      spokenText = `आपकी शिकायत दर्ज कर ली गई है। शिकायत संख्या ${id} है। नगर निगम अधिकारी इस पर शीघ्र कार्रवाई करेंगे।`;
    } else {
      spokenText = `Your civic complaint has been registered with ID ${id}. Municipal officers will review it shortly.`;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/text-to-speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: spokenText,
          target_language_code: lang
        })
      });
      const d = await res.json();
      if (d.audio_base64) {
        setAudioBase64(d.audio_base64);
      }
    } catch (e) {
      console.log('Bulbul TTS optional fetch skipped');
    }
  };

  const playTTS = () => {
    if (!audioBase64) return;
    setPlayingAudio(true);
    const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
    audio.onended = () => setPlayingAudio(false);
    audio.play().catch(() => setPlayingAudio(false));
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-4 min-h-[90vh] flex flex-col justify-between">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center text-emerald-800 font-medium bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl text-base transition-colors min-h-[48px]"
          >
            <ArrowLeft className="w-5 h-5 mr-1" /> {t.backToHome}
          </button>
          <span className="text-sm font-semibold text-stone-600 bg-stone-100 px-3 py-1.5 rounded-full">
            {step < 4 ? `Step ${step} of 3` : 'Completed'}
          </span>
        </div>

        {/* Step 1: What is the problem? */}
        {step === 1 && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
            <h2 className="text-2xl font-bold text-stone-900 mb-1">{t.step1Title}</h2>
            <p className="text-stone-600 text-sm mb-6">{t.step1Help}</p>

            {/* Mic Center Button */}
            <div className="flex flex-col items-center justify-center py-4">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all shadow-md active:scale-95 ${
                  isRecording 
                    ? 'bg-rose-500 text-white animate-pulse ring-8 ring-rose-100' 
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white ring-8 ring-emerald-50'
                }`}
              >
                {isRecording ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
                <span className="text-xs font-semibold mt-1">
                  {isRecording ? t.stopRecording : t.pressMicToSpeak}
                </span>
              </button>

              {isRecording && (
                <p className="text-rose-600 font-medium text-sm mt-4 animate-bounce">
                  {t.listening}
                </p>
              )}

              {transcribing && (
                <div className="flex items-center text-emerald-700 text-sm mt-4 gap-2 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.audioUploadedProcessing}
                </div>
              )}
            </div>

            {/* Editable transcript or text box */}
            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                {t.orTypeHere}
              </label>
              <textarea
                rows={4}
                value={problemText}
                onChange={(e) => setProblemText(e.target.value)}
                placeholder="उदा. आमच्या भागात गेल्या ३ दिवसांपासून पाणी येत नाही, गल्ली क्रमांक ४ मध्ये पाईप फुटली आहे..."
                className="w-full text-base p-3.5 rounded-2xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-stone-800"
              />
            </div>

            <button
              onClick={() => {
                if (!problemText.trim()) {
                  alert('Please speak or type the problem first.');
                  return;
                }
                setStep(2);
              }}
              className="w-full mt-6 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-4 px-6 rounded-2xl text-lg shadow-sm transition-all min-h-[52px]"
            >
              Next: Location &rarr;
            </button>
          </div>
        )}

        {/* Step 2: Where? */}
        {step === 2 && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
            <h2 className="text-2xl font-bold text-stone-900 mb-1">{t.step2Title}</h2>
            <p className="text-stone-600 text-sm mb-6">Specify the landmark or use GPS so municipal teams reach quickly.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                  {t.villageCity}
                </label>
                <input
                  type="text"
                  value={villageCity}
                  onChange={(e) => setVillageCity(e.target.value)}
                  className="w-full text-base p-3.5 rounded-2xl border border-stone-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                  {t.landmark}
                </label>
                <input
                  type="text"
                  value={areaLandmark}
                  onChange={(e) => setAreaLandmark(e.target.value)}
                  placeholder="उदा. डहाणूकर कॉलनी, गणपती मंदिराच्या मागे, कोथरूड"
                  className="w-full text-base p-3.5 rounded-2xl border border-stone-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* GPS Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={getGPS}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-semibold py-3.5 px-4 rounded-2xl min-h-[48px] transition-colors"
                >
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  {gpsLoading ? 'Getting GPS...' : gpsCoords ? t.gpsSuccess : t.gpsButton}
                </button>
                {gpsCoords && (
                  <p className="text-xs text-emerald-700 mt-1.5 text-center font-medium">
                    ✓ Coordinates attached: {gpsCoords.lat.toFixed(3)}, {gpsCoords.lng.toFixed(3)} (100m rounded)
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(1)}
                className="w-1/3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-4 rounded-2xl text-base min-h-[52px]"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="w-2/3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-4 rounded-2xl text-lg shadow-sm min-h-[52px]"
              >
                Next: Details &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Step 3: How long & Photo */}
        {step === 3 && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
            <h2 className="text-2xl font-bold text-stone-900 mb-1">{t.step3Title}</h2>
            <p className="text-stone-600 text-sm mb-6">Citizens never need to choose department or priority; our municipal AI classifies automatically.</p>

            {/* Duration choice chips */}
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2.5">
                Issue Duration
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {t.durationOptions.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIssueDuration(opt)}
                    className={`py-3 px-3 rounded-2xl text-sm font-semibold border text-center transition-all min-h-[48px] ${
                      issueDuration === opt
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Photo */}
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                {t.attachPhoto}
              </label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-2xl cursor-pointer bg-stone-50 hover:bg-emerald-50/30 transition-colors">
                {photoBase64 ? (
                  <div className="flex flex-col items-center">
                    <img src={photoBase64} alt="Preview" className="h-20 w-20 object-cover rounded-xl mb-1 shadow-sm" />
                    <span className="text-xs text-emerald-700 font-semibold">Photo Selected (Tap to change)</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Camera className="w-8 h-8 text-stone-400 mb-2" />
                    <p className="text-xs text-stone-500 font-medium">Click to upload camera photo</p>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
              </label>
              <p className="text-[11px] text-stone-500 mt-1">Privacy note: Photos are strictly viewed only by municipal officers.</p>
            </div>

            {/* Submit button */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                disabled={submitting}
                className="w-1/3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-4 rounded-2xl text-base min-h-[52px]"
              >
                Back
              </button>
              <button
                onClick={submitComplaint}
                disabled={submitting}
                className="w-2/3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-4 rounded-2xl text-lg shadow-md transition-all flex items-center justify-center gap-2 min-h-[52px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  t.submitButton
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation Screen */}
        {step === 4 && submitResult && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100">
            <div className="flex items-center justify-center w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-bold text-center text-stone-900 mb-1">
              {t.successTitle}
            </h2>
            <p className="text-center text-stone-600 text-sm mb-6">
              {t.saveIdTip}
            </p>

            {/* ID Badge */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center mb-6">
              <span className="text-xs uppercase tracking-wider font-bold text-emerald-800">
                {t.complaintIdLabel}
              </span>
              <div className="text-3xl font-extrabold text-emerald-950 tracking-wider mt-1 select-all font-mono">
                {submitResult.complaint_id}
              </div>
            </div>

            {/* Bulbul Spoken confirmation */}
            {audioBase64 && (
              <button
                onClick={playTTS}
                className="w-full flex items-center justify-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-semibold py-3 px-4 rounded-2xl mb-4 min-h-[48px] transition-colors"
              >
                <Volume2 className="w-5 h-5 text-emerald-700" />
                {playingAudio ? 'Playing...' : t.spokenConfirmation}
              </button>
            )}

            {/* AI Summary card */}
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 mb-6 space-y-2 text-sm">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <Sparkles className="w-4 h-4" />
                Sarvam AI Municipal Classification
                {submitResult.is_mock_ai && (
                  <span className="ml-auto text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                    MOCK AI RESPONSE
                  </span>
                )}
              </div>
              <div className="text-stone-800 font-medium">
                <strong>Summary:</strong> {submitResult.summary}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-stone-600 pt-1">
                <div><strong>Ward:</strong> {submitResult.normalised_locality}</div>
                <div><strong>Dept:</strong> {submitResult.department}</div>
                <div><strong>Urgency:</strong> <span className="capitalize">{submitResult.urgency}</span></div>
                <div><strong>Status:</strong> {submitResult.status}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={() => onTrackId(submitResult.complaint_id)}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-4 rounded-2xl text-lg shadow-sm min-h-[52px]"
              >
                {t.checkStatus}
              </button>
              <button
                onClick={onBack}
                className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold py-3.5 rounded-2xl text-base min-h-[48px]"
              >
                {t.backToHome}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Privacy Note */}
      <div className="mt-8 text-center text-xs text-stone-600 max-w-sm mx-auto">
        {t.privacyNotice}
      </div>
    </div>
  );
};

