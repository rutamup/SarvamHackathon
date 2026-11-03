import React, { useState } from 'react';
import { Mic, Search, Globe, ShieldCheck, Map, Trophy, ChevronRight } from 'lucide-react';
import { LanguageCode, TRANSLATIONS } from './translations';
import { ReportFlow } from './ReportFlow';
import { StatusTracking } from './StatusTracking';
import { OfficerDashboard } from './OfficerDashboard';
import { PuneMap } from './PuneMap';
import { Leaderboard } from './Leaderboard';

export function App() {
  const [lang, setLang] = useState<LanguageCode>('en-IN');
  const [view, setView] = useState<'home' | 'report' | 'status' | 'officer' | 'map' | 'leaderboard'>('home');
  const [selectedComplaintId, setSelectedComplaintId] = useState('');
  const [showLangMenu, setShowLangMenu] = useState(false);

  const t = TRANSLATIONS[lang];

  // Navigate to track ID directly
  const handleTrackId = (id: string) => {
    setSelectedComplaintId(id);
    setView('status');
  };

  if (view === 'report') {
    return <ReportFlow lang={lang} onBack={() => setView('home')} onTrackId={handleTrackId} />;
  }

  if (view === 'status') {
    return <StatusTracking lang={lang} initialId={selectedComplaintId} onBack={() => setView('home')} />;
  }

  if (view === 'officer') {
    return <OfficerDashboard onBack={() => setView('home')} />;
  }

  if (view === 'map') {
    return <PuneMap onBack={() => setView('home')} onSelectComplaint={handleTrackId} />;
  }

  if (view === 'leaderboard') {
    return <Leaderboard onBack={() => setView('home')} />;
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col justify-between p-4 max-w-lg mx-auto">
      {/* Top Bar */}
      <header className="flex items-center justify-between pt-2 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-700 flex items-center justify-center text-white shadow-sm font-black text-xl">
            ज
          </div>
          <div>
            <h1 className="text-xl font-black text-stone-900 tracking-tight leading-none">
              {t.appName}
            </h1>
            <p className="text-[11px] text-stone-600 font-semibold mt-0.5">
              पुणे महानगरपालिका (PMC)
            </p>
          </div>
        </div>

        {/* Change Language Pill */}
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-bold py-2 px-3 rounded-full shadow-2xs transition-colors min-h-[44px]"
          >
            <Globe className="w-4 h-4 text-emerald-700" />
            <span>{lang === 'mr-IN' ? 'मराठी' : lang === 'hi-IN' ? 'हिंदी' : 'English'}</span>
          </button>

          {showLangMenu && (
            <div className="absolute right-0 mt-2 w-36 bg-white rounded-2xl shadow-lg border border-stone-200 py-1.5 z-40">
              <button
                onClick={() => { setLang('mr-IN'); setShowLangMenu(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm font-semibold hover:bg-emerald-50 ${lang === 'mr-IN' ? 'text-emerald-800 font-bold bg-emerald-50/50' : 'text-stone-700'}`}
              >
                मराठी (Marathi)
              </button>
              <button
                onClick={() => { setLang('hi-IN'); setShowLangMenu(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm font-semibold hover:bg-emerald-50 ${lang === 'hi-IN' ? 'text-emerald-800 font-bold bg-emerald-50/50' : 'text-stone-700'}`}
              >
                हिंदी (Hindi)
              </button>
              <button
                onClick={() => { setLang('en-IN'); setShowLangMenu(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm font-semibold hover:bg-emerald-50 ${lang === 'en-IN' ? 'text-emerald-800 font-bold bg-emerald-50/50' : 'text-stone-700'}`}
              >
                English
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Hero & 3 Big Options */}
      <main className="my-auto py-4 space-y-4">
        {/* Banner */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-black text-stone-900 tracking-tight leading-snug">
            {t.tagline}
          </h2>
          <p className="text-stone-600 text-sm mt-1">
            {t.subtagline}
          </p>
        </div>

        {/* 1. Report a Problem (Big mic accent) */}
        <button
          onClick={() => setView('report')}
          className="w-full bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white p-5 rounded-3xl shadow-sm transition-all text-left flex items-center justify-between group min-h-[96px]"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Mic className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <span className="text-xl font-black block leading-tight">
                {t.reportProblem}
              </span>
              <span className="text-xs text-emerald-100 font-medium mt-1 block">
                {t.reportProblemSub}
              </span>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-emerald-200 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* 2. Check Complaint Status */}
        <button
          onClick={() => { setSelectedComplaintId(''); setView('status'); }}
          className="w-full bg-white hover:bg-stone-50 border border-stone-200 active:scale-[0.99] text-stone-900 p-5 rounded-3xl shadow-2xs transition-all text-left flex items-center justify-between group min-h-[88px]"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
              <Search className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <span className="text-lg font-bold block leading-tight text-stone-900">
                {t.checkStatus}
              </span>
              <span className="text-xs text-stone-500 font-medium mt-0.5 block">
                {t.checkStatusSub}
              </span>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-stone-400 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* 3. Change Language */}
        <button
          onClick={() => setShowLangMenu(true)}
          className="w-full bg-white hover:bg-stone-50 border border-stone-200 active:scale-[0.99] text-stone-900 p-4 rounded-3xl shadow-2xs transition-all text-left flex items-center justify-between group min-h-[72px]"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-stone-100 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-stone-700" />
            </div>
            <div>
              <span className="text-base font-bold block leading-tight text-stone-800">
                {t.changeLanguage}
              </span>
              <span className="text-xs text-stone-500 font-medium block">
                मराठी / हिंदी / English
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-400" />
        </button>

        {/* P1 Shortcuts: Map & Leaderboard */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => setView('map')}
            className="flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-800 p-3.5 rounded-2xl text-xs font-bold transition-colors min-h-[48px]"
          >
            <Map className="w-4 h-4 text-emerald-700" />
            {t.viewMap}
          </button>
          <button
            onClick={() => setView('leaderboard')}
            className="flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-800 p-3.5 rounded-2xl text-xs font-bold transition-colors min-h-[48px]"
          >
            <Trophy className="w-4 h-4 text-amber-600" />
            {t.viewLeaderboard}
          </button>
        </div>
      </main>

      {/* Footer / Officer Login Shortcut */}
      <footer className="pt-4 border-t border-stone-200/80 text-center space-y-3">
        <p className="text-[11px] text-stone-500 max-w-xs mx-auto">
          {t.privacyNotice}
        </p>
        <div>
          <button
            onClick={() => setView('officer')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-emerald-800 bg-stone-100 hover:bg-stone-200/80 px-3.5 py-2 rounded-xl transition-colors min-h-[44px]"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            {t.officerDashboard} (PMC Portal)
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;

