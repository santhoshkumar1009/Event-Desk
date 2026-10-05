import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle2, FileText, Github, Globe, Star, Search, Filter, Edit3, X, Award, Lock, Key, ArrowRight, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../components/Toast';

export default function SubmissionsReviewer() {
  const { token, user } = useAuth();
  const socket = useSocket();
  const { showToast } = useToast();

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Secure Code state per event
  const [unlockedCodes, setUnlockedCodes] = useState({});
  const [inputCode, setInputCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeError, setCodeError] = useState('');

  // Review Modal State
  const [selectedSub, setSelectedSub] = useState(null);
  const [score, setScore] = useState(85);
  const [status, setStatus] = useState('REVIEWED');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setEvents(data);
        if (!selectedEventId) setSelectedEventId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const isUnlocked = user?.role === 'ADMIN' || Boolean(unlockedCodes[selectedEventId]);

  const fetchSubmissions = async () => {
    if (!selectedEventId) return;
    if (!isUnlocked) {
      setSubmissions([]);
      return;
    }
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (unlockedCodes[selectedEventId]) {
        headers['x-event-access-code'] = unlockedCodes[selectedEventId];
      }

      const res = await fetch(`/api/submissions/event/${selectedEventId}`, {
        headers,
      });
      const data = await res.json();
      if (res.status === 403 || data.locked) {
        setUnlockedCodes((prev) => {
          const next = { ...prev };
          delete next[selectedEventId];
          return next;
        });
        setSubmissions([]);
        return;
      }
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Failed to load submissions', 'error');
    } finally {
      setLoading(false);
    }
  };

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
      if (!res.ok) {
        throw new Error(data.message || 'Invalid access code');
      }
      setUnlockedCodes((prev) => ({
        ...prev,
        [selectedEventId]: inputCode.trim(),
      }));
      setInputCode('');
      showToast('Access code verified! Submissions unlocked.', 'success');
    } catch (err) {
      setCodeError(err.message || 'Invalid event access code');
      showToast(err.message || 'Verification failed', 'error');
    } finally {
      setVerifyingCode(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) fetchSubmissions();
  }, [selectedEventId, unlockedCodes]);

  useEffect(() => {
    if (!socket || !selectedEventId) return;
    const handleSub = () => fetchSubmissions();
    socket.on(`event:${selectedEventId}:submission`, handleSub);
    return () => {
      socket.off(`event:${selectedEventId}:submission`, handleSub);
    };
  }, [socket, selectedEventId]);

  const handleOpenReview = (sub) => {
    setSelectedSub(sub);
    setScore(sub.score || 85);
    setStatus(sub.status || 'REVIEWED');
    setFeedback(sub.feedback || '');
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!selectedSub) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/submissions/${selectedSub.id}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          score: parseInt(score, 10),
          status,
          feedback: feedback.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Review failed');

      showToast('Project evaluation saved successfully!', 'success');
      setSelectedSub(null);
      fetchSubmissions();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <span>Project Submissions Review Desk</span>
            <Award className="w-6 h-6 text-indigo-500" />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Evaluate student hackathon reports, inspect GitHub repositories and demo links, and award final scores.
          </p>
        </div>

        <div className="w-full sm:w-80">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:outline-none"
          >
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Access Code Protection Lock Screen */}
      {!isUnlocked ? (
        <div className="glass-panel rounded-3xl p-10 max-w-lg mx-auto text-center border border-slate-200/80 dark:border-slate-800 shadow-xl my-8">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 ring-8 ring-amber-500/5">
            <Lock className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
            Event Submissions Protected
          </h3>
          <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
            This event requires the secure event access code to view and evaluate student project reports.
          </p>

          <form onSubmit={handleVerifyCode} className="mt-6 space-y-4">
            <div className="relative">
              <Key className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="Enter SEC-XXXXXX..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {codeError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{codeError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={verifyingCode || !inputCode.trim()}
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <Key className="w-4 h-4" />
              <span>{verifyingCode ? 'Verifying Code...' : 'Unlock Project Submissions'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400">
            Secure code was generated upon event creation. Check with the event coordinator or Admin.
          </div>
        </div>
      ) : loading ? (
        <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      ) : submissions.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-bold">No project submissions yet for this event</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Project & Student</th>
                  <th className="px-6 py-4">Artifact Links</th>
                  <th className="px-6 py-4">Team Members</th>
                  <th className="px-6 py-4">Evaluation Score</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {sub.title}
                      </div>
                      <span className="text-[11px] text-slate-400 block">
                        Submitted by: {sub.user?.name} ({sub.user?.department})
                      </span>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{sub.description}</p>
                      {sub.feedback && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg mt-1">
                          Judge note: {sub.feedback}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      {sub.repoUrl && (
                        <a
                          href={sub.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1.5 text-blue-600 hover:underline font-bold"
                        >
                          <Github className="w-3.5 h-3.5" />
                          <span>Code Repository</span>
                        </a>
                      )}
                      {sub.demoUrl && (
                        <a
                          href={sub.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1.5 text-indigo-600 hover:underline font-bold"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Live Demo</span>
                        </a>
                      )}
                      {sub.reportUrl && (
                        <a
                          href={sub.reportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1.5 text-emerald-600 hover:underline font-bold"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Report Doc</span>
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-bold">
                      {sub.teamMembers || 'Individual'}
                    </td>
                    <td className="px-6 py-4">
                      {sub.score !== null && sub.score !== undefined ? (
                        <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400">
                          {sub.score} / 100
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Unrated</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        sub.status === 'WINNER'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : sub.status === 'REVIEWED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenReview(sub)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center space-x-1 ml-auto"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Score & Review</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">
                Score Project: {selectedSub.title}
              </h3>
              <button
                onClick={() => setSelectedSub(null)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReview} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Score (0 - 100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Evaluation Outcome</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                >
                  <option value="REVIEWED">REVIEWED</option>
                  <option value="SHORTLISTED">SHORTLISTED (Finalist)</option>
                  <option value="WINNER">WINNER / TOP 3</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Judge Comments & Feedback</label>
                <textarea
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="e.g. Excellent UI design, novel application of RAG pipeline, clear documentation."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedSub(null)}
                  className="px-4 py-2 rounded-xl font-bold text-xs text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Evaluation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
