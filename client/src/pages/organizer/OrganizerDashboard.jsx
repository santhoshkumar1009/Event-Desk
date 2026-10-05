import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, ScanLine, Clock, Megaphone, PlusCircle, ArrowUpRight, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../components/Toast';

export default function OrganizerDashboard() {
  const { token, user } = useAuth();
  const socket = useSocket();
  const { showToast } = useToast();
  const [stats, setStats] = useState({
    totalEvents: 0,
    liveEvents: 0,
    totalRegistrations: 0,
    totalCheckedIn: 0,
  });
  const [recentEvents, setRecentEvents] = useState([]);
  const [liveActivities, setLiveActivities] = useState([]);

  const fetchDashboardData = async () => {
    try {
      const [resEvents, resStats] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/events/dashboard-stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const events = await resEvents.json();
      setRecentEvents(events.slice(0, 5));

      if (resStats.ok) {
        const statsData = await resStats.json();
        setStats({
          totalEvents: statsData.totalEvents || events.length,
          liveEvents: statsData.liveEvents || events.filter((e) => e.status === 'LIVE').length,
          totalRegistrations: statsData.totalRegistrations || 0,
          totalCheckedIn: statsData.totalCheckedIn || 0,
        });
      } else {
        const live = events.filter((e) => e.status === 'LIVE').length;
        const totalRegs = events.reduce((acc, e) => acc + (e._count?.registrations || 0), 0);
        setStats({
          totalEvents: events.length,
          liveEvents: live,
          totalRegistrations: totalRegs,
          totalCheckedIn: 0,
        });
      }
    } catch (err) {
      console.error('Error fetching organizer dashboard data:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    if (socket) {
      const handleDataChange = (data) => {
        fetchDashboardData();
        if (data && data.title) {
          showToast(`⚡ Live Update: "${data.title}"`, 'info');
        }
      };

      socket.on('event:created', handleDataChange);
      socket.on('event:updated', handleDataChange);
      socket.on('event:deleted', handleDataChange);
      socket.on('events:changed', handleDataChange);
      socket.on('registration:created', handleDataChange);
      socket.on('registration:checkin', handleDataChange);
      socket.on('stats:updated', handleDataChange);

      socket.on('announcement:created', (anc) => {
        setLiveActivities((prev) => [
          { type: 'announcement', text: `Announcement posted: "${anc.title}"`, time: new Date() },
          ...prev.slice(0, 4),
        ]);
      });
    }

    return () => {
      if (socket) {
        socket.off('event:created');
        socket.off('event:updated');
        socket.off('event:deleted');
        socket.off('events:changed');
        socket.off('registration:created');
        socket.off('registration:checkin');
        socket.off('stats:updated');
        socket.off('announcement:created');
      }
    };
  }, [socket]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel rounded-3xl p-6 md:p-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Event Management Hub
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Manage your campus events, monitor real-time check-ins, detect room double-bookings, and track budgets.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/organizer/events"
            className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 flex items-center space-x-2 transition-all shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Event</span>
          </Link>

          <Link
            to="/organizer/scanner"
            className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center space-x-2 transition-all shrink-0 animate-pulse-subtle"
          >
            <ScanLine className="w-4 h-4" />
            <span>Open Live QR Scanner</span>
          </Link>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Events
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900 dark:text-slate-100">
              {stats.totalEvents}
            </span>
            <span className="text-xs font-bold text-emerald-500 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +12%
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Live Events Now
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {stats.liveEvents}
            </span>
            <span className="text-xs font-bold text-amber-500 animate-ping">● Active</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Registrations
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900 dark:text-slate-100">
              {stats.totalRegistrations}
            </span>
            <span className="text-xs font-bold text-slate-400">
              Across {stats.totalEvents} campus events
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Attendance Check-ins
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <ScanLine className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.totalCheckedIn}
            </span>
            <span className="text-xs font-bold text-emerald-500">Live Scanned</span>
          </div>
        </div>
      </div>

      {/* Recent Events & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events Table Overview */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
              Recent Campus Events
            </h3>
            <Link
              to="/organizer/events"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentEvents.map((evt) => (
              <div key={evt.id} className="py-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      evt.status === 'LIVE'
                        ? 'bg-emerald-500 animate-ping'
                        : evt.status === 'APPROVED'
                        ? 'bg-blue-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  <div className="truncate">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {evt.title}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {evt.venue?.name} • {new Date(evt.startDate).toLocaleDateString()}
                      {evt.budgetStatus === 'APPROVED' && (
                        <span className="ml-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                          • Budget Approved (₹{Number(evt.budgetApprovedAmount || evt.budgetTotalPlanned || 0).toLocaleString('en-IN')})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0 ml-4">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    {evt._count?.registrations || 0} / {evt.capacity}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                      evt.status === 'LIVE'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    }`}
                  >
                    {evt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Shortcuts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 mb-4">
              Quick Shortcuts
            </h3>
            <div className="space-y-2">
              <Link
                to="/organizer/schedule"
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>Conflict Detection Engine</span>
                </div>
                <ArrowUpRight className="w-4 h-4 opacity-50" />
              </Link>

              <Link
                to="/organizer/announcements"
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Megaphone className="w-4 h-4 text-amber-500" />
                  <span>Send Urgent Announcement</span>
                </div>
                <ArrowUpRight className="w-4 h-4 opacity-50" />
              </Link>

              <Link
                to="/organizer/tasks"
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                  <span>Kanban Event Board</span>
                </div>
                <ArrowUpRight className="w-4 h-4 opacity-50" />
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              WebSocket Server Connected
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
