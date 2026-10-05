import React, { useState, useEffect } from 'react';
import { Users, Search, Download, CheckCircle2, XCircle, Clock, Filter, Lock, Key, ShieldCheck, ArrowRight, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../components/Toast';

export default function RegistrationsManager() {
  const { token, user } = useAuth();
  const socket = useSocket();
  const { showToast } = useToast();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Secure Code state per event
  const [unlockedCodes, setUnlockedCodes] = useState({});
  const [inputCode, setInputCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeError, setCodeError] = useState('');

  const fetchEvents = () => {
    fetch('/api/events')
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        setEvents(data);
        if (data.length > 0 && !selectedEventId) setSelectedEventId(data[0].id);
      });
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('events:changed', fetchEvents);
    socket.on('registration:created', () => fetchRegistrations());
    return () => {
      socket.off('events:changed', fetchEvents);
      socket.off('registration:created');
    };
  }, [socket, selectedEventId]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const isUnlocked = user?.role === 'ADMIN' || Boolean(unlockedCodes[selectedEventId]);

  const fetchRegistrations = async () => {
    if (!selectedEventId) return;
    if (!isUnlocked) {
      setRegistrations([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const headers = { Authorization: `Bearer ${token}` };
      if (unlockedCodes[selectedEventId]) {
        headers['x-event-access-code'] = unlockedCodes[selectedEventId];
      }

      const res = await fetch(`/api/registrations/event/${selectedEventId}?${params.toString()}`, {
        headers,
      });
      const data = await res.json();
      if (res.status === 403 || data.locked) {
        setUnlockedCodes((prev) => {
          const next = { ...prev };
          delete next[selectedEventId];
          return next;
        });
        setRegistrations([]);
        showToast(data.message || 'Event access locked. Enter secure code.', 'error');
        return;
      }
      setRegistrations(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Failed to load registrations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [selectedEventId, search, statusFilter, unlockedCodes]);

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    setVerifyingCode(true);
    setCodeError('');
    try {
      const res = await fetch(`/api/events/${selectedEventId}/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: inputCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        throw new Error(data.message || 'Invalid Event Secure Code');
      }
      showToast(`Event unlocked! Access granted.`, 'success');
      setUnlockedCodes((prev) => ({ ...prev, [selectedEventId]: inputCode.trim().toUpperCase() }));
      setInputCode('');
    } catch (err) {
      setCodeError(err.message);
      showToast(err.message, 'error');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleUpdateStatus = async (regId, newStatus) => {
    try {
      const res = await fetch(`/api/registrations/${regId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Status update failed');
      showToast(`Registration marked as ${newStatus}`, 'success');
      fetchRegistrations();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const exportToCSV = () => {
    if (registrations.length === 0) return;
    const headers = ['Student Name', 'Email', 'Department', 'Student ID', 'Status', 'Checked In', 'Registered At', 'QR Ticket Code'];
    const rows = registrations.map((r) => [
      r.user?.name || '',
      r.user?.email || '',
      r.user?.department || '',
      r.user?.studentId || '',
      r.status,
      r.checkedIn ? 'YES' : 'NO',
      new Date(r.registeredAt).toLocaleString(),
      r.qrTicketCode,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Registrations_Export_${selectedEventId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported registrations to CSV!', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <span>Registrations Manager</span>
            <Users className="w-6 h-6 text-blue-500" />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Search, filter, approve/reject student registrations, and export CSV spreadsheets.
          </p>
        </div>

        <button
          onClick={exportToCSV}
          disabled={registrations.length === 0}
          className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center space-x-2 transition-all disabled:opacity-50 shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Event Selector & Filter Bar */}
      <div className="glass-panel rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full md:w-80">
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Select Event</label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:outline-none"
          >
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.title} ({evt.capacity} cap)
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student name, ID..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none"
          />
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-auto">
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Status Filter</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="WAITLIST">Waitlist</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Registrations List or Secure Code Lock Gate */}
      {!isUnlocked ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto shadow-sm">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 ring-8 ring-amber-500/5">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            Event Registrations Locked
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Attendee registration records for <strong className="text-slate-700 dark:text-slate-200">{selectedEvent?.title}</strong> are protected. Please enter this event's unique Secure Access Code to unlock the attendee roster.
          </p>

          <form onSubmit={handleVerifyCode} className="mt-6 space-y-4">
            <div className="relative max-w-sm mx-auto">
              <Key className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
              <input
                type="text"
                value={inputCode}
                onChange={(e) => {
                  setInputCode(e.target.value.toUpperCase());
                  setCodeError('');
                }}
                placeholder="Enter Code (e.g. SEC-123456)"
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-center tracking-widest text-base font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
              />
            </div>

            {codeError && (
              <p className="text-xs font-bold text-rose-500 flex items-center justify-center space-x-1">
                <ShieldAlert className="w-4 h-4" />
                <span>{codeError}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={!inputCode.trim() || verifyingCode}
              className="w-full max-w-sm mx-auto py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <span>{verifyingCode ? 'Verifying Code...' : 'Unlock Event Registrations'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : loading ? (
        <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      ) : registrations.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-bold">No registrations matching criteria</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Department & ID</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Checked In</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {registrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-sm ring-1 ring-emerald-500/20">
                          {reg.user?.name?.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                            {reg.user?.name}
                          </h4>
                          <div className="text-[11px] text-slate-400">{reg.user?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                      <div className="font-bold">{reg.user?.department}</div>
                      <div className="text-[11px] text-slate-400">{reg.user?.studentId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          reg.status === 'CONFIRMED'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : reg.status === 'WAITLIST'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {reg.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold">
                      {reg.checkedIn ? (
                        <span className="text-emerald-600 flex items-center space-x-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Yes</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {reg.status !== 'CONFIRMED' && (
                        <button
                          onClick={() => handleUpdateStatus(reg.id, 'CONFIRMED')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold text-[11px]"
                        >
                          Approve
                        </button>
                      )}
                      {reg.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleUpdateStatus(reg.id, 'CANCELLED')}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-[11px]"
                        >
                          Reject
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
