import React, { useState, useEffect } from 'react';
import { Settings, MapPin, Plus, Edit2, Building, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

export default function SettingsPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Venue Form
  const [name, setName] = useState('');
  const [building, setBuilding] = useState('');
  const [capacity, setCapacity] = useState('');
  const [facilities, setFacilities] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchVenues = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/venues');
      const data = await res.json();
      setVenues(data);
    } catch (err) {
      showToast('Failed to fetch venues', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const handleAddVenue = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/venues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          building,
          capacity: parseInt(capacity, 10),
          facilities,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Add venue failed');

      showToast('New venue registered!', 'success');
      setName('');
      setBuilding('');
      setCapacity('');
      setFacilities('');
      fetchVenues();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <span>System Settings & Venues</span>
            <Settings className="w-6 h-6 text-slate-500" />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage campus venues, room capacities, facilities specifications, and departments.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Venue Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 mb-4 flex items-center space-x-2">
            <Plus className="w-4 h-4 text-blue-500" />
            <span>Register New Venue</span>
          </h3>

          <form onSubmit={handleAddVenue} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Venue Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Science Auditorium"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Building Block
              </label>
              <input
                type="text"
                required
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="e.g. Science Block C"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Seating Capacity
              </label>
              <input
                type="number"
                required
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="300"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Facilities & Specs
              </label>
              <input
                type="text"
                value={facilities}
                onChange={(e) => setFacilities(e.target.value)}
                placeholder="Projector, Surround Sound, AC"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Add Venue'}
            </button>
          </form>
        </div>

        {/* Venues Grid */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
            Registered Campus Venues ({venues.length})
          </h3>

          {loading ? (
            <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {venues.map((v) => (
                <div
                  key={v.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700">
                      Cap: {v.capacity} seats
                    </span>
                    <span className="text-xs font-bold text-slate-400">{v.building}</span>
                  </div>

                  <h4 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                    {v.name}
                  </h4>

                  <p className="text-xs text-slate-500">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Specs:</span> {v.facilities}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
