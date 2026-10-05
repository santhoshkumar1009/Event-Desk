import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../components/Toast';

export default function ScheduleCalendar() {
  const { token } = useAuth();
  const socket = useSocket();
  const { showToast } = useToast();
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected date for day-wise timeline
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  const fetchSchedule = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [resE, resV] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/venues'),
      ]);
      const dataE = await resE.json();
      const dataV = await resV.json();
      setEvents(dataE);
      setVenues(dataV);

      // If current selected date has no events, set to nearest event date
      if (Array.isArray(dataE) && dataE.length > 0) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const hasToday = dataE.some((e) => new Date(e.startDate).toISOString().slice(0, 10) === todayStr);
        if (!hasToday && selectedDate === todayStr) {
          setSelectedDate(new Date(dataE[0].startDate).toISOString().slice(0, 10));
        }
      }
    } catch (err) {
      if (!isBackground) showToast('Failed to load schedule', 'error');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;

    const handleEventUpdate = () => {
      fetchSchedule(true);
    };

    socket.on('event:created', handleEventUpdate);
    socket.on('event:updated', handleEventUpdate);
    socket.on('event:deleted', handleEventUpdate);
    socket.on('events:changed', handleEventUpdate);

    return () => {
      socket.off('event:created', handleEventUpdate);
      socket.off('event:updated', handleEventUpdate);
      socket.off('event:deleted', handleEventUpdate);
      socket.off('events:changed', handleEventUpdate);
    };
  }, [socket]);

  // Compute Conflicts Matrix across all events
  const detectAllConflicts = () => {
    const conflicts = [];
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const e1 = events[i];
        const e2 = events[j];
        if (e1.venueId === e2.venueId && e1.status !== 'CANCELLED' && e2.status !== 'CANCELLED') {
          const start1 = new Date(e1.startDate).getTime();
          const end1 = new Date(e1.endDate).getTime();
          const start2 = new Date(e2.startDate).getTime();
          const end2 = new Date(e2.endDate).getTime();

          const overlap = Math.max(0, Math.min(end1, end2) - Math.max(start1, start2));
          if (overlap > 0) {
            conflicts.push({ e1, e2, room: e1.venue?.name });
          }
        }
      }
    }
    return conflicts;
  };

  const detectedConflicts = detectAllConflicts();

  // Filter events for selected day timeline
  const dayEvents = events.filter((e) => {
    const eDate = new Date(e.startDate).toISOString().slice(0, 10);
    return eDate === selectedDate;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <span>Schedule & Room Conflict Matrix</span>
            <Clock className="w-6 h-6 text-indigo-500" />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Day-wise timeline view with automated double-booking room protection.
          </p>
        </div>
      </div>

      {/* Conflict Status Alert Box */}
      <div
        className={`p-6 rounded-3xl border flex items-start space-x-4 shadow-sm ${
          detectedConflicts.length > 0
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
        }`}
      >
        {detectedConflicts.length > 0 ? (
          <AlertTriangle className="w-6 h-6 shrink-0 text-rose-600 mt-1" />
        ) : (
          <ShieldCheck className="w-6 h-6 shrink-0 text-emerald-600 mt-1" />
        )}
        <div>
          <h3 className="font-extrabold text-base">
            {detectedConflicts.length > 0
              ? `${detectedConflicts.length} Double-Booking Conflict(s) Detected!`
              : 'Room Schedule is Clear - Zero Double Bookings'}
          </h3>
          <p className="text-xs mt-1">
            {detectedConflicts.length > 0
              ? 'The conflict detection engine has flagged overlapping events scheduled in the same room.'
              : 'All venues are properly allocated without overlapping event schedules.'}
          </p>

          {detectedConflicts.map((c, i) => (
            <div key={i} className="mt-2 text-xs font-bold bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-xl border border-rose-200">
              ⚠️ Room: <span className="underline">{c.room}</span> → "{c.e1.title}" overlaps with "{c.e2.title}"
            </div>
          ))}
        </div>
      </div>

      {/* Day Selector & Timeline View */}
      <div className="glass-panel rounded-3xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">
            Day-wise Room Timeline
          </h3>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:outline-none"
          />
        </div>

        {dayEvents.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-semibold">No events scheduled for {selectedDate}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dayEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 font-extrabold text-xs flex flex-col items-center justify-center shrink-0">
                    <span>{new Date(evt.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-[10px] text-slate-400 font-normal">to</span>
                    <span>{new Date(evt.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                      {evt.title}
                    </h4>
                    <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                        {evt.venue?.name} ({evt.venue?.building})
                      </span>
                      <span>• Capacity: {evt.capacity}</span>
                    </div>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase self-start sm:self-auto ${
                    evt.status === 'LIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {evt.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
