import React, { useState, useEffect } from 'react';
import { Clock, Calendar, MapPin, Bell, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function EventReminderBanner() {
  const { token, user } = useAuth();
  const [upcomingEvent, setUpcomingEvent] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [reminderSet, setReminderSet] = useState(false);

  useEffect(() => {
    if (!token || user?.role !== 'STUDENT') return;

    fetch('/api/registrations/my-registrations', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) return;

        const now = new Date().getTime();
        // Filter confirmed registrations for upcoming events
        const upcoming = data
          .filter((reg) => reg.status === 'CONFIRMED' && new Date(reg.event?.startDate).getTime() > now)
          .sort((a, b) => new Date(a.event?.startDate) - new Date(b.event?.startDate));

        if (upcoming.length > 0) {
          setUpcomingEvent(upcoming[0].event);
        }
      })
      .catch((err) => console.error('Error fetching event reminders:', err));
  }, [token, user]);

  useEffect(() => {
    if (!upcomingEvent) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const eventTime = new Date(upcomingEvent.startDate).getTime();
      const diff = eventTime - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(timer);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [upcomingEvent]);

  if (!upcomingEvent) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-6 shadow-xl shadow-indigo-500/20 mb-8 border border-white/10">
      {/* Background Glow */}
      <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute left-1/3 -top-10 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-amber-300 text-xs font-black uppercase tracking-wider border border-white/10">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <Clock className="w-3.5 h-3.5" />
            <span>Event Reminder: Starting Soon</span>
          </div>

          <h3 className="text-xl md:text-2xl font-black tracking-tight text-white">
            {upcomingEvent.title}
          </h3>

          <div className="flex flex-wrap items-center gap-4 text-xs text-blue-100 font-medium">
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-4 h-4 text-blue-300" />
              <span>{new Date(upcomingEvent.startDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(upcomingEvent.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <MapPin className="w-4 h-4 text-emerald-300" />
              <span>{upcomingEvent.venue?.name || 'Main Campus Venue'}</span>
            </div>
          </div>
        </div>

        {/* Live Countdown Clock */}
        <div className="flex items-center space-x-2 sm:space-x-3 bg-black/20 backdrop-blur-md p-3 rounded-2xl border border-white/10 shrink-0">
          <div className="text-center px-2">
            <div className="text-xl sm:text-2xl font-black font-mono text-white">{String(timeLeft.days).padStart(2, '0')}</div>
            <div className="text-[9px] uppercase tracking-wider font-bold text-blue-200">Days</div>
          </div>
          <span className="text-xl font-bold text-blue-300">:</span>
          <div className="text-center px-2">
            <div className="text-xl sm:text-2xl font-black font-mono text-white">{String(timeLeft.hours).padStart(2, '0')}</div>
            <div className="text-[9px] uppercase tracking-wider font-bold text-blue-200">Hours</div>
          </div>
          <span className="text-xl font-bold text-blue-300">:</span>
          <div className="text-center px-2">
            <div className="text-xl sm:text-2xl font-black font-mono text-white">{String(timeLeft.minutes).padStart(2, '0')}</div>
            <div className="text-[9px] uppercase tracking-wider font-bold text-blue-200">Mins</div>
          </div>
          <span className="text-xl font-bold text-blue-300">:</span>
          <div className="text-center px-2">
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-300">{String(timeLeft.seconds).padStart(2, '0')}</div>
            <div className="text-[9px] uppercase tracking-wider font-bold text-blue-200">Secs</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => setReminderSet(!reminderSet)}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md ${
              reminderSet
                ? 'bg-emerald-500 text-white'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            }`}
          >
            {reminderSet ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Reminder Active</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 text-amber-300" />
                <span>Remind Me</span>
              </>
            )}
          </button>

          <Link
            to="/my-registrations"
            className="px-4 py-2.5 rounded-xl bg-white text-indigo-900 font-extrabold text-xs shadow-lg hover:bg-slate-100 flex items-center space-x-1.5 transition-all"
          >
            <span>View Ticket Pass</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
