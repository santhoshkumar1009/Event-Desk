import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, MapPin, Users, Award, CheckCircle2, Clock, Ticket, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../components/Toast';
import EventReminderBanner from '../../components/EventReminderBanner';

export default function DiscoverEvents() {
  const { token, user } = useAuth();
  const socket = useSocket();
  const { showToast } = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [categories, setCategories] = useState(['ALL', 'Hackathon', 'Cultural', 'Workshop', 'Sports', 'Seminar']);
  const [departments, setDepartments] = useState(['ALL', 'Computer Science & Engineering', 'Electronics & Communication', 'Mechanical Engineering']);

  // Registration Modal State
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registrationType, setRegistrationType] = useState('INDIVIDUAL');
  const [teamName, setTeamName] = useState('');
  const [customResponses, setCustomResponses] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmedReg, setConfirmedReg] = useState(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (selectedDepartment !== 'ALL') params.append('department', selectedDepartment);

      const res = await fetch(`/api/events?${params.toString()}`);
      const data = await res.json();
      setEvents(data);

      // Dynamically extract all available categories & departments from live database
      if (!search && selectedCategory === 'ALL' && selectedDepartment === 'ALL' && Array.isArray(data)) {
        const dynamicCats = ['ALL', ...Array.from(new Set(data.map((e) => e.category).filter(Boolean)))];
        const dynamicDepts = ['ALL', ...Array.from(new Set(data.map((e) => e.organizer?.department).filter(Boolean)))];
        if (dynamicCats.length > 1) setCategories(dynamicCats);
        if (dynamicDepts.length > 1) setDepartments(dynamicDepts);
      }
    } catch (err) {
      showToast('Failed to load events', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [search, selectedCategory, selectedDepartment]);

  // Real-time synchronization when Organizers or Admins add, update, or remove events
  useEffect(() => {
    if (!socket) return;

    const handleEventLiveUpdate = (payload) => {
      fetchEvents();
      if (payload && payload.title) {
        showToast(`⚡ Live Update: "${payload.title}"`, 'info');
      }
    };

    socket.on('event:created', handleEventLiveUpdate);
    socket.on('event:updated', handleEventLiveUpdate);
    socket.on('event:deleted', handleEventLiveUpdate);
    socket.on('events:changed', handleEventLiveUpdate);
    socket.on('registration:created', () => fetchEvents());

    return () => {
      socket.off('event:created', handleEventLiveUpdate);
      socket.off('event:updated', handleEventLiveUpdate);
      socket.off('event:deleted', handleEventLiveUpdate);
      socket.off('events:changed', handleEventLiveUpdate);
      socket.off('registration:created');
    };
  }, [socket]);

  const handleOpenRegister = (event) => {
    setSelectedEvent(event);
    setRegistrationType('INDIVIDUAL');
    setTeamName('');
    setCustomResponses({});
    setConfirmedReg(null);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/registrations/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          registrationType,
          teamName: registrationType === 'TEAM' ? teamName : null,
          customResponses,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');

      showToast(data.message, data.isWaitlist ? 'info' : 'success');
      setConfirmedReg(data.registration);
      fetchEvents();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const parsedCustomFields = (event) => {
    if (!event.customFields) return [];
    try {
      return typeof event.customFields === 'string' ? JSON.parse(event.customFields) : event.customFields;
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Event Reminder Banner */}
      <EventReminderBanner />

      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white p-8 md:p-10 shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-3 backdrop-blur-md">
            Campus Life & Events
          </span>
          <h1 className="text-3xl md:text-4xl font-black leading-tight">
            Discover & Participate in College Events
          </h1>
          <p className="mt-2 text-blue-100 text-sm md:text-base leading-relaxed">
            Reserve your seats for hackathons, cultural fests, tech workshops, and sports tournaments. Earn campus points and instant QR passes.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-10 translate-y-10">
          <Calendar className="w-96 h-96" />
        </div>
      </div>

      {/* Filter Controls */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events, workshops..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto no-scrollbar py-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Department Filter */}
        <div className="w-full md:w-auto">
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full md:w-auto px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d === 'ALL' ? 'All Departments' : d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center">
          <Calendar className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Events Found</h3>
          <p className="text-sm text-slate-500 mt-1">Try adjusting your search criteria or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const confirmedCount = event._count?.registrations || 0;
            const isFull = confirmedCount >= event.capacity;
            const spotsLeft = Math.max(0, event.capacity - confirmedCount);

            return (
              <div
                key={event.id}
                className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                {/* Image Banner */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={event.bannerUrl || 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800'}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 flex items-center space-x-2">
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 shadow-sm backdrop-blur-md">
                      {event.category}
                    </span>
                    {isFull && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500 text-slate-900 shadow-sm">
                        Waitlist Only
                      </span>
                    )}
                  </div>
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white flex items-center space-x-1 shadow-md">
                    <Award className="w-3.5 h-3.5" />
                    <span>+{event.pointsValue} pts</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                      {event.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                      {event.description}
                    </p>

                    <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                        <span>{new Date(event.startDate).toLocaleDateString()} ({new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="truncate">{event.venue?.name} ({event.venue?.building})</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{confirmedCount} / {event.capacity} Filled ({spotsLeft} seats left)</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">
                      By {event.organizer?.name}
                    </span>
                    <button
                      onClick={() => handleOpenRegister(event)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md ${
                        isFull
                          ? 'bg-amber-500 hover:bg-amber-600 text-slate-900'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      <span>{isFull ? 'Join Waitlist' : 'Register Now'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Registration Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            {!confirmedReg ? (
              <>
                {/* Event Cover Page Poster */}
                <div className="relative h-44 -mx-6 -mt-6 mb-4 overflow-hidden rounded-t-3xl">
                  <img
                    src={selectedEvent.bannerUrl || 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200'}
                    alt={selectedEvent.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent flex items-end p-5">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-md">
                      {selectedEvent.category} • Official Event Poster
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white backdrop-blur-md transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Event Registration
                    </span>
                    <h3 className="font-extrabold text-xl text-slate-900 dark:text-slate-100">
                      {selectedEvent.title}
                    </h3>
                  </div>
                </div>

                <form onSubmit={handleRegisterSubmit} className="mt-4 space-y-4">
                  {/* Registration Type */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                      Participation Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRegistrationType('INDIVIDUAL')}
                        className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                          registrationType === 'INDIVIDUAL'
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Individual Entry
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegistrationType('TEAM')}
                        className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                          registrationType === 'TEAM'
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Team Registration
                      </button>
                    </div>
                  </div>

                  {registrationType === 'TEAM' && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                        Team Name
                      </label>
                      <input
                        type="text"
                        required
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="e.g. CyberKnights"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Custom Fields */}
                  {parsedCustomFields(selectedEvent).map((field, idx) => (
                    <div key={idx}>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                        {field.label} {field.required && <span className="text-rose-500">*</span>}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          required={field.required}
                          value={customResponses[field.label] || ''}
                          onChange={(e) =>
                            setCustomResponses({ ...customResponses, [field.label]: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none font-medium"
                        >
                          <option value="">Select option...</option>
                          {field.options?.map((opt, i) => (
                            <option key={i} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          required={field.required}
                          value={customResponses[field.label] || ''}
                          onChange={(e) =>
                            setCustomResponses({ ...customResponses, [field.label]: e.target.value })
                          }
                          placeholder={`Enter ${field.label}`}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none"
                        />
                      )}
                    </div>
                  ))}

                  <div className="pt-4 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setSelectedEvent(null)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 disabled:opacity-50"
                    >
                      {submitting ? 'Submitting...' : 'Confirm Registration'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* Success & QR Ticket View */
              <div className="text-center py-4 space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
                  {confirmedReg.status === 'WAITLIST' ? 'Waitlist Registration Confirmed' : 'Registration Successful!'}
                </h3>
                <p className="text-xs text-slate-500">
                  {confirmedReg.status === 'WAITLIST'
                    ? 'You are on the waitlist. We will notify you if a spot opens up.'
                    : 'Show this QR ticket at the venue registration desk for instant entry.'}
                </p>

                {/* QR Code */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl inline-block border border-slate-200 dark:border-slate-700">
                  <QRCodeSVG value={confirmedReg.qrTicketCode} size={160} />
                  <span className="block mt-2 text-[10px] font-mono font-bold text-slate-500">
                    {confirmedReg.qrTicketCode}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setSelectedEvent(null);
                    setConfirmedReg(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
