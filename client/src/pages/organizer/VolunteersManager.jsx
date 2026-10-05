import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Calendar, Clock, Phone, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../components/Toast';

export default function VolunteersManager() {
  const { token } = useAuth();
  const socket = useSocket();
  const { showToast } = useToast();
  const [volunteers, setVolunteers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Assignment Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [role, setRole] = useState('Registration Desk');
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchVolunteersAndEvents = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [resV, resE] = await Promise.all([
        fetch('/api/volunteers', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/events'),
      ]);
      const dataV = await resV.json();
      const dataE = await resE.json();
      setVolunteers(dataV);
      setEvents(dataE);
      if (dataE.length > 0 && !selectedEventId) setSelectedEventId(dataE[0].id);
    } catch (err) {
      if (!isBackground) showToast('Failed to fetch volunteer roster', 'error');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchVolunteersAndEvents();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleEventsChanged = () => fetchVolunteersAndEvents(true);
    socket.on('events:changed', handleEventsChanged);
    return () => {
      socket.off('events:changed', handleEventsChanged);
    };
  }, [socket]);

  const handleOpenAssign = (volId) => {
    setSelectedVolunteerId(volId);
    const now = new Date();
    setShiftStart(now.toISOString().slice(0, 16));
    setShiftEnd(new Date(now.getTime() + 4 * 3600 * 1000).toISOString().slice(0, 16));
    setIsAssignModalOpen(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/volunteers/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          volunteerId: selectedVolunteerId,
          eventId: selectedEventId,
          role,
          shiftStart,
          shiftEnd,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Assignment failed');

      showToast('Volunteer assigned to shift!', 'success');
      setIsAssignModalOpen(false);
      fetchVolunteersAndEvents();
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
            <span>Volunteer & Shift Roster</span>
            <UserCheck className="w-6 h-6 text-emerald-500" />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Assign student volunteers to event shifts (Registration Desk, Stage Handling, Security) and track shift status.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {volunteers.map((vol) => (
            <div
              key={vol.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-sm ring-2 ring-emerald-500/20">
                    {vol.user?.name?.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'V'}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                      {vol.user?.name}
                    </h3>
                    <p className="text-xs text-slate-500">{vol.user?.department}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{vol.phone || 'No contact provided'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    <span className="font-bold text-slate-700 dark:text-slate-200">Skills:</span> {vol.skills}
                  </div>
                </div>

                {/* Assigned Shifts */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Assigned Shifts</span>
                  {vol.assignments?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic mt-1">No active shifts assigned</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {vol.assignments?.map((asg) => (
                        <div
                          key={asg.id}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">
                              {asg.role}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {asg.event?.title}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                            {asg.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleOpenAssign(vol.id)}
                className="mt-6 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center justify-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Assign to Event Shift</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Assignment Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100 mb-4">
              Assign Shift to Volunteer
            </h3>

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Select Event
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                >
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Shift Role
                </label>
                <input
                  type="text"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Stage & Audio Tech"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Shift Start
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={shiftStart}
                    onChange={(e) => setShiftStart(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Shift End
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={shiftEnd}
                    onChange={(e) => setShiftEnd(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
