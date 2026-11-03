import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, AlertCircle, Layers, Info } from 'lucide-react';
import { MapContainer, TileLayer, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { API_BASE_URL } from './config';

interface PuneMapProps {
  onBack: () => void;
  onSelectComplaint?: (id: string) => void;
}

export const PuneMap: React.FC<PuneMapProps> = ({ onBack, onSelectComplaint }) => {
  const [markers, setMarkers] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/map/hotspots`)
      .then(res => res.json())
      .then(data => {
        setMarkers(data.markers || []);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const filteredMarkers = markers.filter(m => {
    if (selectedCategory === 'All') return true;
    return m.category === selectedCategory;
  });

  const getMarkerColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return '#e11d48'; // Rose red
      case 'high': return '#ea580c'; // Orange
      case 'medium': return '#d97706'; // Amber
      default: return '#059669'; // Emerald
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </button>
          <div>
            <h1 className="text-base font-black text-stone-900 flex items-center gap-1.5">
              Pune Civic Complaint Hotspots Map
            </h1>
            <p className="text-xs text-stone-600">OpenStreetMap + Leaflet live visualizer</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs p-2 rounded-xl border border-stone-200 font-semibold bg-stone-50"
          >
            <option value="All">All Categories ({markers.length})</option>
            <option value="Water Supply & Shortage">Water Shortage</option>
            <option value="Roads & Potholes">Roads & Potholes</option>
            <option value="Garbage & Solid Waste">Garbage & Waste</option>
            <option value="Drainage & Sewage">Drainage & Sewage</option>
            <option value="Streetlights & Electricity">Streetlights</option>
          </select>
        </div>
      </header>

      {/* Map Container */}
      <div className="w-full h-[650px] relative">
        <MapContainer
          center={[18.5204, 73.8567]} // Pune center
          zoom={12}
          scrollWheelZoom={true}
          style={{ height: '650px', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {filteredMarkers.map((m) => (
            <CircleMarker
              key={m.id}
              center={[m.latitude, m.longitude]}
              radius={m.urgency === 'critical' ? 12 : m.urgency === 'high' ? 10 : 8}
              pathOptions={{
                fillColor: getMarkerColor(m.urgency),
                fillOpacity: 0.85,
                color: '#ffffff',
                weight: 2
              }}
            >
              <Popup>
                <div className="p-1 space-y-1.5 text-xs max-w-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-stone-900">{m.id}</span>
                    <span className="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: getMarkerColor(m.urgency) }}>
                      {m.urgency}
                    </span>
                  </div>
                  <p className="font-bold text-stone-800">{m.summary}</p>
                  <p className="text-stone-600">
                    <strong>Locality:</strong> {m.locality} {m.is_approximate ? '(approximate)' : '(GPS)'}
                  </p>
                  {m.landmark && (
                    <p className="text-stone-500 italic text-[11px]">"{m.landmark}"</p>
                  )}
                  <p className="text-stone-600"><strong>Cluster:</strong> {m.cluster_count} similar complaints</p>
                  <p className="text-stone-600"><strong>Status:</strong> {m.status}</p>
                  {m.is_approximate && (
                    <span className="inline-block bg-stone-100 text-stone-700 text-[10px] px-1.5 py-0.5 rounded font-semibold border border-stone-200">
                      Approximate Centroid
                    </span>
                  )}
                  {m.is_demo && (
                    <span className="inline-block bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.5 rounded font-bold ml-1">
                      DEMO DATA
                    </span>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-xs p-3.5 rounded-2xl border border-stone-200 shadow-md text-xs space-y-1.5 z-[1000]">
          <span className="font-bold text-stone-900 block mb-1">Urgency Levels</span>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-600" />
            <span className="text-stone-700">Critical Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-600" />
            <span className="text-stone-700">High Urgency</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-600" />
            <span className="text-stone-700">Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-600" />
            <span className="text-stone-700">Low / Resolved</span>
          </div>
          <p className="text-[10px] text-stone-600 pt-1 border-t border-stone-100">
            *Larger bubbles indicate issue clusters
          </p>
        </div>
      </div>
    </div>
  );
};

