import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, MapPin, Users, Award, AlertTriangle, CheckCircle2, Clock, X, PlusCircle, Sparkles, Wand2, Key, Copy, Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../components/Toast';

const CURATED_POSTERS = [
  { label: 'AI & Hackathon', url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&auto=format&fit=crop&q=80', category: 'Hackathon' },
  { label: 'Coding Workshop', url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1200&auto=format&fit=crop&q=80', category: 'Workshop' },
  { label: 'Robotics & Hardware', url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&auto=format&fit=crop&q=80', category: 'Workshop' },
  { label: 'Cultural & Arts Fest', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&auto=format&fit=crop&q=80', category: 'Cultural' },
  { label: 'Photography & Film', url: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200&auto=format&fit=crop&q=80', category: 'Cultural' },
  { label: 'Esports & Gaming', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80', category: 'Sports' },
  { label: 'Keynote & AI Summit', url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&auto=format&fit=crop&q=80', category: 'Seminar' },
  { label: 'Green Tech Innovation', url: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=1200&auto=format&fit=crop&q=80', category: 'Seminar' },
];

export default function EventsManager() {
  const { token, user } = useAuth();
  const socket = useSocket();
  const { showToast } = useToast();
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [createdEventCodeModal, setCreatedEventCodeModal] = useState({ open: false, title: '', code: '' });

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Hackathon',
    description: '',
    bannerUrl: '',
    startDate: '',
    endDate: '',
    venueId: '',
    capacity: 100,
    rules: '',
    status: 'APPROVED',
    pointsValue: 20,
    customFields: [],
  });

  const [conflictWarning, setConflictWarning] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchEventsAndVenues = async () => {
    setLoading(true);
    try {
      const [resE, resV] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/venues'),
      ]);
      const dataE = await resE.json();
      const dataV = await resV.json();
      setEvents(dataE);
      setVenues(dataV);
      if (dataV.length > 0 && !formData.venueId) {
        setFormData((prev) => ({ ...prev, venueId: dataV[0].id }));
      }
    } catch (err) {
      showToast('Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventsAndVenues();
  }, []);

  // Real-time synchronization for events
  useEffect(() => {
    if (!socket) return;

    const handleSocketUpdate = () => {
      fetchEventsAndVenues();
    };

    socket.on('event:created', handleSocketUpdate);
    socket.on('event:updated', handleSocketUpdate);
    socket.on('event:deleted', handleSocketUpdate);
    socket.on('events:changed', handleSocketUpdate);

    return () => {
      socket.off('event:created', handleSocketUpdate);
      socket.off('event:updated', handleSocketUpdate);
      socket.off('event:deleted', handleSocketUpdate);
      socket.off('events:changed', handleSocketUpdate);
    };
  }, [socket]);

  const handleOpenModal = (event = null) => {
    setConflictWarning(null);
    if (event) {
      setEditingEvent(event);
      let parsedFields = [];
      try {
        parsedFields = typeof event.customFields === 'string' ? JSON.parse(event.customFields) : event.customFields || [];
      } catch {
        parsedFields = [];
      }
      setFormData({
        title: event.title,
        category: event.category,
        description: event.description,
        bannerUrl: event.bannerUrl || '',
        startDate: new Date(event.startDate).toISOString().slice(0, 16),
        endDate: new Date(event.endDate).toISOString().slice(0, 16),
        venueId: event.venueId,
        capacity: event.capacity,
        rules: event.rules || '',
        status: event.status,
        pointsValue: event.pointsValue || 20,
        customFields: parsedFields,
      });
    } else {
      setEditingEvent(null);
      const now = new Date();
      const nextHour = new Date(now.getTime() + 3600 * 1000);
      const endHour = new Date(now.getTime() + 4 * 3600 * 1000);
      setFormData({
        title: '',
        category: 'Hackathon',
        description: '',
        bannerUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800',
        startDate: nextHour.toISOString().slice(0, 16),
        endDate: endHour.toISOString().slice(0, 16),
        venueId: venues[0]?.id || '',
        capacity: 100,
        rules: '',
        status: 'APPROVED',
        pointsValue: 20,
        customFields: [
          { label: 'T-Shirt Size', type: 'select', options: ['S', 'M', 'L', 'XL'], required: true },
        ],
      });
    }
    setIsModalOpen(true);
  };

  // Conflict Checker
  const checkConflicts = async () => {
    if (!formData.venueId || !formData.startDate || !formData.endDate) return;
    try {
      const res = await fetch('/api/events/check-conflict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          venueId: formData.venueId,
          startDate: formData.startDate,
          endDate: formData.endDate,
          excludeEventId: editingEvent?.id,
        }),
      });
      const data = await res.json();
      if (data.hasConflict) {
        setConflictWarning(data.conflicts);
      } else {
        setConflictWarning(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isModalOpen) checkConflicts();
  }, [isModalOpen, formData.venueId, formData.startDate, formData.endDate]);

  const handleAIGenerateDetails = async () => {
    if (!formData.title.trim()) {
      showToast('Please enter an event title first!', 'error');
      return;
    }
    setAiGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-event-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          category: formData.category,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'AI generation failed');
      setFormData((prev) => ({
        ...prev,
        description: data.description || prev.description,
        rules: data.rules || prev.rules,
        pointsValue: data.pointsValue || prev.pointsValue,
      }));
      showToast('✨ Gemini AI drafted description, rules & points!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingEvent ? `/api/events/${editingEvent.id}` : '/api/events';
      const method = editingEvent ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Operation failed');

      showToast(editingEvent ? 'Event updated successfully!' : 'Event created successfully!', 'success');
      setIsModalOpen(false);
      if (!editingEvent && data.accessCode) {
        setCreatedEventCodeModal({ open: true, title: data.title, code: data.accessCode });
      }
      fetchEventsAndVenues();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (user?.role !== 'ADMIN') {
      showToast('Admin authorization required to delete an event.', 'error');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this event? This action is permanent.')) return;
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Delete failed');
      }
      showToast('Event deleted successfully by Admin', 'success');
      fetchEventsAndVenues();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Status transition helper
  const handleStatusChange = async (eventId, newStatus) => {
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Status update failed');
      showToast(`Event status updated to ${newStatus}`, 'success');
      fetchEventsAndVenues();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const addCustomField = () => {
    setFormData({
      ...formData,
      customFields: [...formData.customFields, { label: '', type: 'text', required: false }],
    });
  };

  const removeCustomField = (index) => {
    setFormData({
      ...formData,
      customFields: formData.customFields.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
            Events Manager & Workflow
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create events, customize registration forms, enforce room conflict checks, and transition event status.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 flex items-center space-x-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Event</span>
        </button>
      </div>

      {/* Events Table / Cards */}
      {loading ? (
        <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Event Details</th>
                  <th className="px-6 py-4">Venue</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Status Workflow</th>
                  <th className="px-6 py-4">Capacity</th>
                  {user?.role === 'ADMIN' ? (
                    <th className="px-6 py-4 text-right">Admin Actions</th>
                  ) : (
                    <th className="px-6 py-4 text-right">Event Secure Code</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={evt.bannerUrl || 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800'}
                          alt={evt.title}
                          className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-200"
                        />
                        <div>
                          <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                            {evt.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">
                              {evt.category}
                            </span>
                            {evt.budgetStatus === 'APPROVED' && (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Budget Approved: ₹{Number(evt.budgetApprovedAmount || evt.budgetTotalPlanned || 0).toLocaleString('en-IN')}</span>
                              </span>
                            )}
                            {evt.budgetStatus === 'PENDING_APPROVAL' && (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Budget Pending Review</span>
                              </span>
                            )}
                            {evt.budgetStatus === 'REVISION_REQUESTED' && (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
                                <span>Budget Revision Requested</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                      <div className="font-bold">{evt.venue?.name}</div>
                      <div className="text-[11px] text-slate-400">{evt.venue?.building}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      <div>{new Date(evt.startDate).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(evt.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user?.role === 'ADMIN' ? (
                        <select
                          value={evt.status}
                          onChange={(e) => handleStatusChange(evt.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold border focus:outline-none cursor-pointer ${
                            evt.status === 'LIVE'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : evt.status === 'APPROVED'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : evt.status === 'COMPLETED'
                              ? 'bg-slate-100 text-slate-700 border-slate-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          <option value="DRAFT">Draft</option>
                          <option value="PENDING">Pending</option>
                          <option value="APPROVED">Approved</option>
                          <option value="LIVE">Live</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-extrabold uppercase tracking-wider ${
                            evt.status === 'LIVE'
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : evt.status === 'APPROVED'
                              ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                              : evt.status === 'COMPLETED'
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                              : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          }`}
                          title="Status changes are managed exclusively by Administrators"
                        >
                          {evt.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-bold">
                      {evt._count?.registrations || 0} / {evt.capacity}
                    </td>
                    {user?.role === 'ADMIN' ? (
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenModal(evt)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600"
                          title="Edit Event"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(evt.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-600"
                          title="Delete Event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    ) : (
                      <td className="px-6 py-4 text-right">
                        {evt.organizerId === user?.id && evt.accessCode ? (
                          <div className="inline-flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1.5 rounded-xl shadow-xs">
                            <Key className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="font-mono text-xs font-black tracking-wider text-emerald-700 dark:text-emerald-300">
                              {evt.accessCode}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(evt.accessCode);
                                showToast('Secure code copied to clipboard!', 'success');
                              }}
                              className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200 transition-colors"
                              title="Copy Secure Code"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400 inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                            <Lock className="w-3 h-3 text-slate-400" />
                            <span>Protected</span>
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conflict Warning Banner */}
            {conflictWarning && (
              <div className="mt-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-start space-x-3 text-rose-800 dark:text-rose-200">
                <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                <div className="text-xs">
                  <h5 className="font-extrabold">Room Double-Booking Conflict Detected!</h5>
                  <p className="mt-0.5">The selected room is already booked by:</p>
                  <ul className="list-disc pl-4 mt-1 font-semibold">
                    {conflictWarning.map((c, i) => (
                      <li key={i}>{c.title} ({c.venue})</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. HackVerse 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      const matched = CURATED_POSTERS.find((p) => p.category === newCat);
                      setFormData({
                        ...formData,
                        category: newCat,
                        bannerUrl: matched ? matched.url : formData.bannerUrl,
                      });
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none font-bold"
                  >
                    <option value="Hackathon">Hackathon</option>
                    <option value="Cultural">Cultural</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Sports">Sports</option>
                    <option value="Seminar">Seminar</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Venue (Room Conflict Protection)
                  </label>
                  <select
                    value={formData.venueId}
                    onChange={(e) => setFormData({ ...formData, venueId: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none font-bold"
                  >
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.building} - Cap: {v.capacity})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Event Cover Page Poster Section */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block font-extrabold uppercase text-slate-700 dark:text-slate-300">
                    Event Cover Page Poster *
                  </label>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold uppercase">
                    Cover Banner Visual
                  </span>
                </div>

                {/* Cover Preview */}
                <div className="relative h-36 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
                  <img
                    src={formData.bannerUrl || 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&auto=format&fit=crop&q=80'}
                    alt="Event Cover"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-3">
                    <span className="text-white font-extrabold text-sm truncate">
                      {formData.title || 'Event Cover Page Preview'}
                    </span>
                  </div>
                </div>

                {/* Curated Poster Presets */}
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                    Click to Choose Preset Cover Poster:
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {CURATED_POSTERS.map((poster, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData({ ...formData, bannerUrl: poster.url })}
                        className={`group relative h-14 rounded-lg overflow-hidden border-2 transition-all ${
                          formData.bannerUrl === poster.url
                            ? 'border-blue-600 ring-2 ring-blue-500/30'
                            : 'border-transparent opacity-75 hover:opacity-100'
                        }`}
                        title={poster.label}
                      >
                        <img src={poster.url} alt={poster.label} className="w-full h-full object-cover" />
                        <span className="absolute inset-x-0 bottom-0 text-[8px] font-bold text-white bg-slate-950/80 px-1 truncate text-center block">
                          {poster.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Or Paste Custom Poster Image URL:
                  </label>
                  <input
                    type="url"
                    value={formData.bannerUrl}
                    onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Capacity
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Participation Points
                  </label>
                  <input
                    type="number"
                    value={formData.pointsValue}
                    onChange={(e) => setFormData({ ...formData, pointsValue: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-400">
                    Description
                  </label>
                  <button
                    type="button"
                    onClick={handleAIGenerateDetails}
                    disabled={aiGenerating}
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-[10px] flex items-center space-x-1 shadow-sm transition-all disabled:opacity-50"
                  >
                    <Sparkles className={`w-3 h-3 text-amber-300 ${aiGenerating ? 'animate-spin' : ''}`} />
                    <span>{aiGenerating ? 'Generating with Gemini...' : '✨ AI Auto-Draft Details'}</span>
                  </button>
                </div>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter event overview or click AI Auto-Draft..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Participation Rules & Guidelines
                </label>
                <textarea
                  rows="2"
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  placeholder="e.g. 1. Valid College ID required. 2. Teams of 2-4 members."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none"
                />
              </div>

              {/* Dynamic Custom Registration Fields Builder */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-200">
                    Custom Registration Fields
                  </h4>
                  <button
                    type="button"
                    onClick={addCustomField}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[11px] flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Field</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.customFields.map((field, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Field Label (e.g. GitHub URL)"
                        value={field.label}
                        onChange={(e) => {
                          const updated = [...formData.customFields];
                          updated[i].label = e.target.value;
                          setFormData({ ...formData, customFields: updated });
                        }}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      />
                      <select
                        value={field.type}
                        onChange={(e) => {
                          const updated = [...formData.customFields];
                          updated[i].type = e.target.value;
                          setFormData({ ...formData, customFields: updated });
                        }}
                        className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                      >
                        <option value="text">Text</option>
                        <option value="select">Select Options</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => removeCustomField(i)}
                        className="p-1 rounded text-rose-500 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || Boolean(conflictWarning)}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/25 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingEvent ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Secure Access Code Modal on Event Creation */}
      {createdEventCodeModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 ring-8 ring-emerald-500/5">
              <Key className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
              Event Created Successfully!
            </h3>
            <p className="text-xs text-slate-500 mt-2">
              A private, secure access code has been created for <strong className="text-slate-700 dark:text-slate-300">{createdEventCodeModal.title}</strong>.
            </p>
            <div className="my-5 p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-dashed border-emerald-500/40 flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 text-left">
                  Event Secure Access Code
                </span>
                <span className="font-mono text-xl font-black tracking-widest text-emerald-800 dark:text-emerald-200">
                  {createdEventCodeModal.code}
                </span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdEventCodeModal.code);
                  showToast('Secure code copied to clipboard!', 'success');
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>
            </div>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 text-left mb-5">
              🔒 <strong>Security Notice:</strong> Keep this code safe. Organizers must enter this code to unlock attendee registrations and operate the live QR check-in scanner for this event.
            </p>
            <button
              onClick={() => setCreatedEventCodeModal({ open: false, title: '', code: '' })}
              className="w-full py-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-md hover:opacity-90 transition-all"
            >
              I have noted this code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

