import React, { useState, useEffect } from 'react';
import { Megaphone, Pin, AlertCircle, Send, Trash2, Users, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../components/Toast';

export default function AnnouncementsManager() {
  const { token, user } = useAuth();
  const socket = useSocket();
  const { showToast } = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Announcement Form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [eventId, setEventId] = useState('');
  const [targetAudience, setTargetAudience] = useState('ALL');
  const [isPinned, setIsPinned] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [resA, resE] = await Promise.all([
        fetch('/api/announcements'),
        fetch('/api/events'),
      ]);
      const dataA = await resA.json();
      const dataE = await resE.json();
      setAnnouncements(dataA);
      setEvents(dataE);
    } catch (err) {
      if (!isBackground) showToast('Failed to fetch announcements', 'error');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleSync = () => fetchAnnouncements(true);
    socket.on('announcement:created', handleSync);
    socket.on('events:changed', handleSync);
    return () => {
      socket.off('announcement:created', handleSync);
      socket.off('events:changed', handleSync);
    };
  }, [socket]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          content,
          eventId: eventId || null,
          targetAudience,
          isPinned,
          isUrgent,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Creation failed');

      showToast('Announcement broadcasted successfully!', 'success');
      setTitle('');
      setContent('');
      setIsPinned(false);
      setIsUrgent(false);
      fetchAnnouncements();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Announcement deleted', 'success');
      fetchAnnouncements();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <span>Announcements & Broadcasts</span>
            <Megaphone className="w-6 h-6 text-amber-500" />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Publish pinned/urgent updates targeted to all students, specific event attendees, or waitlisted candidates.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Post Announcement Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 mb-4 flex items-center space-x-2">
            <Send className="w-4 h-4 text-blue-500" />
            <span>Post New Announcement</span>
          </h3>

          <form onSubmit={handleCreate} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Headline Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Venue Change for Hackathon"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Target Event (Optional)
              </label>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold focus:outline-none"
              >
                <option value="">All Events (Global Announcement)</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Target Audience
              </label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold focus:outline-none"
              >
                <option value="ALL">All Students</option>
                <option value="PARTICIPANTS">Confirmed Participants Only</option>
                <option value="WAITLISTED">Waitlisted Students Only</option>
                <option value="VOLUNTEERS">Assigned Volunteers Only</option>
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Message Content
              </label>
              <textarea
                rows="4"
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write the broadcast message here..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="font-bold text-slate-700 dark:text-slate-300">Pin to Top</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="rounded text-rose-600"
                />
                <span className="font-bold text-rose-600">Mark Urgent</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              {submitting ? 'Broadcasting...' : 'Broadcast Announcement'}
            </button>
          </form>
        </div>

        {/* Live Broadcast Feed */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
            Active Broadcasts & Pinned Posts
          </h3>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center text-slate-400">
              <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-60" />
              <p className="text-sm font-bold">No active announcements</p>
            </div>
          ) : (
            announcements.map((anc) => (
              <div
                key={anc.id}
                className={`p-5 rounded-3xl border transition-all ${
                  anc.isUrgent
                    ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                    : anc.isPinned
                    ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {anc.isPinned && (
                      <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-900 text-[10px] font-black uppercase flex items-center">
                        <Pin className="w-3 h-3 mr-1" /> Pinned
                      </span>
                    )}
                    {anc.isUrgent && (
                      <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black uppercase flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" /> Urgent
                      </span>
                    )}
                    <span className="text-xs font-bold text-slate-500">
                      Target: {anc.targetAudience}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDelete(anc.id)}
                    className="p-1 rounded text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h4 className="mt-2 font-extrabold text-base text-slate-900 dark:text-slate-100">
                  {anc.title}
                </h4>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {anc.content}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span>Posted by {anc.author?.name}</span>
                  <span>{new Date(anc.publishedAt).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
