import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Scale, CheckCircle2, AlertTriangle, Building2, MapPin } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { API_BASE_URL } from './config';

interface LeaderboardProps {
  onBack: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ onBack }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'neighbourhoods' | 'departments'>('neighbourhoods');

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/leaderboards`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF9F5] pb-12">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </button>
            <h1 className="text-lg font-black text-stone-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Civic Performance Leaderboard
            </h1>
          </div>

          <div className="flex bg-stone-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('neighbourhoods')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'neighbourhoods' ? 'bg-white text-emerald-900 shadow-xs' : 'text-stone-600'
              }`}
            >
              Wards
            </button>
            <button
              onClick={() => setActiveTab('departments')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'departments' ? 'bg-white text-emerald-900 shadow-xs' : 'text-stone-600'
              }`}
            >
              Departments
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-6 space-y-6">
        {/* Fairness Rule Card */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-emerald-950">
          <Scale className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-sm block mb-0.5">Democracy & Fairness Rule</span>
            {data?.fairness_rule || "Rankings are strictly normalised by resolution rate. Localities with active, vocal citizens who report more problems are NEVER penalized for volume."}
          </div>
        </div>

        {/* Recharts Performance Visualizer */}
        {data && (
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
            <h3 className="text-base font-bold text-stone-900 mb-4">
              {activeTab === 'neighbourhoods' ? 'Ward Resolution Rates (%)' : 'Department Resolution Rates (%)'}
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activeTab === 'neighbourhoods' ? data.neighbourhoods : data.departments}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
                  <YAxis unit="%" />
                  <Tooltip />
                  <Bar dataKey="resolution_rate_pct" name="Resolution Rate (%)" fill="#059669" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab Content: Neighbourhoods */}
        {activeTab === 'neighbourhoods' && data && (
          <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Rank & Ward</th>
                  <th className="py-3 px-4">Total Reports</th>
                  <th className="py-3 px-4">Resolved</th>
                  <th className="py-3 px-4">Resolution Rate</th>
                  <th className="py-3 px-4">Avg Resolution Time</th>
                  <th className="py-3 px-4">Overdue Critical</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {data.neighbourhoods.map((n: any, idx: number) => (
                  <tr key={n.name} className="hover:bg-stone-50/70">
                    <td className="py-3.5 px-4 font-bold text-stone-900 flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                        idx === 0 ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-600'
                      }`}>
                        {idx + 1}
                      </span>
                      {n.name}
                    </td>
                    <td className="py-3.5 px-4 text-stone-600">{n.total_reported} reports</td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-700">{n.resolved_count} fixed</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-stone-900">{n.resolution_rate_pct}%</span>
                        <div className="w-20 bg-stone-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${n.resolution_rate_pct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-stone-700">
                      {n.avg_resolution_days !== null && n.avg_resolution_days !== undefined
                        ? `${n.avg_resolution_days} days`
                        : 'In progress'}
                    </td>
                    <td className="py-3.5 px-4">
                      {n.overdue_critical > 0 ? (
                        <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                          {n.overdue_critical} critical ({n.overdue_rate_pct}%)
                        </span>
                      ) : (
                        <span className="text-xs text-stone-600">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab Content: Departments */}
        {activeTab === 'departments' && data && (
          <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Total Assigned</th>
                  <th className="py-3 px-4">Resolved</th>
                  <th className="py-3 px-4">Resolution Rate</th>
                  <th className="py-3 px-4">Critical Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {data.departments.map((d: any) => (
                  <tr key={d.name} className="hover:bg-stone-50/70">
                    <td className="py-3.5 px-4 font-bold text-stone-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      {d.name}
                    </td>
                    <td className="py-3.5 px-4 text-stone-600">{d.total_assigned} cases</td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-700">{d.resolved_count} fixed</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-stone-900">{d.resolution_rate_pct}%</span>
                        <div className="w-20 bg-stone-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${d.resolution_rate_pct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {d.overdue_critical > 0 ? (
                        <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                          {d.overdue_critical} critical
                        </span>
                      ) : (
                        <span className="text-xs text-stone-600">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

