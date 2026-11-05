import React, { useState, useEffect } from 'react';
import { 
  Building2, AlertTriangle, CheckCircle2, Clock, 
  MapPin, RefreshCw, Filter, Search, Lock, 
  ShieldCheck, ArrowLeft, Eye, MessageSquare, ChevronDown
} from 'lucide-react';
import { API_BASE_URL } from './config';

interface OfficerDashboardProps {
  onBack: () => void;
}

const DEPARTMENTS = [
  "All",
  "Water Supply Department",
  "Road & Maintenance Department",
  "Solid Waste Management",
  "Drainage & Sewage Board",
  "Electrical Department",
  "Public Health Department",
  "Traffic & Transport Division",
  "General Administration"
];

const STATUSES = ["All", "Submitted", "Under Review", "Assigned", "In Progress", "Resolved", "Reopened"];

export const OfficerDashboard: React.FC<OfficerDashboardProps> = ({ onBack }) => {
  // Shared password authentication
  const [password, setPassword] = useState('pune_admin_2026');
  const [authenticated, setAuthenticated] = useState(true);
  const [authError, setAuthError] = useState('');

  // Data states
  const [stats, setStats] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocality, setSelectedLocality] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail / Action modal
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);
  const [actionStatus, setActionStatus] = useState('');
  const [actionDept, setActionDept] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Stats
      const statsRes = await fetch(`${API_BASE_URL}/api/officer/stats?officer_password=${encodeURIComponent(password)}`);
      if (statsRes.status === 401) {
        setAuthenticated(false);
        setAuthError('Invalid Officer Password');
        return;
      }
      const statsData = await statsRes.json();
      setStats(statsData);

      // Complaints list
      let url = `${API_BASE_URL}/api/officer/complaints?officer_password=${encodeURIComponent(password)}`;
      if (selectedStatus !== 'All') url += `&status=${encodeURIComponent(selectedStatus)}`;
      if (selectedCategory !== 'All') url += `&category=${encodeURIComponent(selectedCategory)}`;
      if (selectedLocality !== 'All') url += `&locality=${encodeURIComponent(selectedLocality)}`;

      const listRes = await fetch(url);
      const listData = await listRes.json();
      setComplaints(listData.complaints || []);
      setAuthenticated(true);
      setAuthError('');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchDashboardData();
    }
  }, [authenticated, selectedStatus, selectedCategory, selectedLocality]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDashboardData();
  };

  const openDetailModal = async (complaint: any) => {
    setSelectedComplaint(complaint);
    setActionStatus(complaint.status);
    setActionDept(complaint.department);
    setActionNote('');
  };

  const handleUpdateStatus = async () => {
    if (!selectedComplaint) return;
    setUpdating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/officer/complaints/${selectedComplaint.id}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_status: actionStatus,
          officer_password: password,
          department: actionDept,
          officer_note: actionNote || `Officer updated status to ${actionStatus}`
        })
      });

      if (res.ok) {
        await fetchDashboardData();
        setSelectedComplaint(null);
      } else {
        alert('Failed to update status');
      }
    } catch (err) {
      alert('Error updating status');
    } finally {
      setUpdating(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-stone-200 shadow-sm text-center">
          <img
            src="/logo.png"
            alt="JanSuno"
            className="h-20 w-auto mx-auto mb-3 object-contain"
          />
          <h2 className="text-2xl font-black text-stone-900">Municipal Officer Portal</h2>
          <p className="text-stone-600 text-sm mt-1 mb-6">Enter official password to access PMC operations console</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Officer Password"
              className="w-full text-base p-3.5 rounded-2xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            {authError && <p className="text-xs text-rose-600 font-semibold">{authError}</p>}
            <button
              type="submit"
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-4 rounded-2xl text-base min-h-[50px] shadow-sm"
            >
              Authenticate & Enter
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold py-3 rounded-2xl text-sm"
            >
              Back to Citizen Home
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filteredComplaints = complaints.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.id.toLowerCase().includes(q) ||
      c.summary.toLowerCase().includes(q) ||
      c.normalised_locality.toLowerCase().includes(q) ||
      (c.original_text && c.original_text.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-[#FAF9F5] pb-12">
      {/* Top Navbar */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center text-emerald-900 bg-stone-100 hover:bg-stone-200 px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Citizen View
            </button>
            <div className="flex items-center gap-2">
              <img
                src="/logo-emblem.png"
                alt="JanSuno"
                className="w-8 h-8 object-contain"
              />
              <h1 className="text-lg font-black text-stone-900 flex items-center gap-2">
                JanSuno Officer Dashboard
                <span className="text-xs bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                  PMC Pune
                </span>
              </h1>
            </div>
          </div>
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 px-3 py-2 rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-6 space-y-6">
        {/* KPI Tiles */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-600 uppercase">Total Reported</span>
              <p className="text-3xl font-black text-stone-900 mt-1">{stats.kpis.total_complaints}</p>
              <span className="text-[11px] text-stone-600">Across 10 Pune wards</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-amber-700 uppercase">Pending Action</span>
              <p className="text-3xl font-black text-amber-600 mt-1">{stats.kpis.pending_complaints}</p>
              <span className="text-[11px] text-stone-600">Needs resolution</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
              <span className="text-xs font-bold text-rose-700 uppercase">Critical Priority</span>
              <p className="text-3xl font-black text-rose-600 mt-1">{stats.kpis.critical_complaints}</p>
              <span className="text-[11px] text-rose-600 font-medium">Imminent safety hazards</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
              <span className="text-xs font-bold text-emerald-800 uppercase">Resolved Cases</span>
              <p className="text-3xl font-black text-emerald-700 mt-1">{stats.kpis.resolved_complaints}</p>
              <span className="text-[11px] text-emerald-700 font-medium">Verified by field crew</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs col-span-2 md:col-span-1">
              <span className="text-xs font-bold text-stone-600 uppercase">Avg Resolution</span>
              <p className="text-3xl font-black text-stone-900 mt-1">{stats.kpis.avg_resolution_time}</p>
              <span className="text-[11px] text-stone-600">Prompt turnaround</span>
            </div>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by ID, keyword, locality..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="p-2.5 rounded-xl border border-stone-200 font-medium bg-stone-50"
            >
              {STATUSES.map(s => <option key={s} value={s}>Status: {s}</option>)}
            </select>

            {/* Department Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="p-2.5 rounded-xl border border-stone-200 font-medium bg-stone-50"
            >
              <option value="All">All Categories</option>
              <option value="Water Supply & Shortage">Water Supply</option>
              <option value="Roads & Potholes">Roads & Potholes</option>
              <option value="Garbage & Solid Waste">Garbage & Waste</option>
              <option value="Drainage & Sewage">Drainage & Sewage</option>
              <option value="Streetlights & Electricity">Streetlights</option>
            </select>

            {/* Locality Filter */}
            <select
              value={selectedLocality}
              onChange={(e) => setSelectedLocality(e.target.value)}
              className="p-2.5 rounded-xl border border-stone-200 font-medium bg-stone-50"
            >
              <option value="All">All Localities</option>
              <option value="Kothrud">Kothrud</option>
              <option value="Hadapsar">Hadapsar</option>
              <option value="Hinjewadi">Hinjewadi</option>
              <option value="Katraj">Katraj</option>
              <option value="Pimpri">Pimpri</option>
              <option value="Shivajinagar">Shivajinagar</option>
              <option value="Baner">Baner</option>
              <option value="Viman Nagar">Viman Nagar</option>
            </select>
          </div>
        </div>

        {/* Complaints Table */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4">ID & Ward</th>
                  <th className="py-3.5 px-4">Problem Summary (AI Translated)</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Cluster Reports</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredComplaints.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-stone-600 font-medium">
                      No complaints match the filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredComplaints.map((c) => (
                    <tr key={c.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-stone-900 text-xs">{c.id}</div>
                        <div className="text-xs text-stone-600 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-emerald-600" />
                          {c.normalised_locality}
                        </div>
                        {c.is_demo === 1 && (
                          <span className="inline-block text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded mt-0.5">
                            DEMO DATA
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-stone-900 line-clamp-1">{c.summary}</div>
                        <div className="text-xs text-stone-600 line-clamp-1 italic mt-0.5">
                          Original ({c.language_code}): "{c.original_text}"
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-stone-700">
                        {c.category}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-800">
                          {c.cluster_count || 1} similar
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold uppercase ${
                          c.urgency === 'critical' ? 'bg-rose-100 text-rose-800' :
                          c.urgency === 'high' ? 'bg-amber-100 text-amber-800' :
                          'bg-stone-100 text-stone-700'
                        }`}>
                          {c.urgency}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs font-medium text-stone-700">
                        {c.department}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                          c.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                          c.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          c.status === 'Assigned' ? 'bg-purple-100 text-purple-800' :
                          c.status === 'Under Review' ? 'bg-amber-100 text-amber-800' :
                          c.status === 'Reopened' ? 'bg-rose-100 text-rose-800' :
                          'bg-stone-100 text-stone-800'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => openDetailModal(c)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                        >
                          Manage &rarr;
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Detail / Status Update Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 border border-stone-200 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <span className="text-xs font-bold text-stone-600 uppercase">Manage Civic Complaint</span>
                <h3 className="text-2xl font-black text-stone-900 font-mono">{selectedComplaint.id}</h3>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 text-sm font-bold"
              >
                &times;
              </button>
            </div>

            {/* AI Recommendation Box */}
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 text-sm space-y-2">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                AI Analysis & Suggested Action (Sarvam-105B)
              </div>
              <p className="text-stone-800 font-medium"><strong>Problem:</strong> {selectedComplaint.summary}</p>
              <p className="text-stone-700"><strong>Citizen Original ({selectedComplaint.language_code}):</strong> "{selectedComplaint.original_text}"</p>
              <p className="text-emerald-900 bg-white/70 p-2.5 rounded-xl border border-emerald-200">
                <strong>Suggested Action:</strong> {selectedComplaint.suggested_action}
              </p>
            </div>

            {/* Photo preview if attached */}
            {selectedComplaint.photo_url && (
              <div>
                <span className="text-xs font-bold text-stone-600 uppercase">Citizen Uploaded Photo</span>
                <img
                  src={selectedComplaint.photo_url}
                  alt="Complaint evidence"
                  className="mt-2 rounded-2xl max-h-56 object-cover border border-stone-200 shadow-xs"
                />
              </div>
            )}

            {/* Official Status Change Form */}
            <div className="space-y-4 bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                Officer Actions (Status cannot be changed by AI)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">Update Status</label>
                  <select
                    value={actionStatus}
                    onChange={(e) => setActionStatus(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-stone-300 font-semibold bg-white"
                  >
                    {STATUSES.filter(s => s !== 'All').map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">Reassign Department</label>
                  <select
                    value={actionDept}
                    onChange={(e) => setActionDept(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-stone-300 font-semibold bg-white"
                  >
                    {DEPARTMENTS.filter(d => d !== 'All').map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">Official Resolution / Internal Note</label>
                <textarea
                  rows={2}
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="e.g. Ward junior engineer visited site; tanker dispatched; asphalt patched."
                  className="w-full text-sm p-3 rounded-xl border border-stone-300 bg-white"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="px-5 py-3 rounded-xl text-stone-600 bg-stone-100 hover:bg-stone-200 font-bold text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={updating}
                className="px-6 py-3 rounded-xl text-white bg-emerald-700 hover:bg-emerald-800 font-bold text-sm shadow-sm"
              >
                {updating ? 'Saving Status...' : 'Apply Status Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

