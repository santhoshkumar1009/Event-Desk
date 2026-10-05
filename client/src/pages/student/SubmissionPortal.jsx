import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle2, FileText, Github, Globe, Plus, Award, AlertCircle, Clock, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

export default function SubmissionPortal() {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [reportUrl, setReportUrl] = useState('');
  const [teamMembers, setTeamMembers] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [regRes, subRes] = await Promise.all([
        fetch('/api/registrations/my-registrations', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/submissions/my', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const regData = await regRes.json();
      const subData = await subRes.json();

      const eventsList = (Array.isArray(regData) ? regData : [])
        .filter((r) => r.status === 'CONFIRMED')
        .map((r) => r.event);

      setRegisteredEvents(eventsList);
      if (eventsList.length > 0 && !selectedEventId) {
        setSelectedEventId(eventsList[0].id);
      }
      setSubmissions(Array.isArray(subData) ? subData : []);
    } catch (err) {
      showToast('Failed to load submissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleOpenModal = (eventToSubmitFor = null) => {
    if (eventToSubmitFor) {
      setSelectedEventId(eventToSubmitFor.id);
      const existing = submissions.find((s) => s.eventId === eventToSubmitFor.id);
      if (existing) {
        setTitle(existing.title);
        setDescription(existing.description);
        setRepoUrl(existing.repoUrl || '');
        setDemoUrl(existing.demoUrl || '');
        setReportUrl(existing.reportUrl || '');
        setTeamMembers(existing.teamMembers || '');
      } else {
        setTitle('');
        setDescription('');
        setRepoUrl('');
        setDemoUrl('');
        setReportUrl('');
        setTeamMembers('');
      }
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEventId || !title.trim() || !description.trim()) {
      showToast('Please fill in required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId: selectedEventId,
          title: title.trim(),
          description: description.trim(),
          repoUrl: repoUrl.trim() || null,
          demoUrl: demoUrl.trim() || null,
          reportUrl: reportUrl.trim() || null,
          teamMembers: teamMembers.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed');

      showToast('Project report submitted successfully!', 'success');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <span>Project Submission Portal</span>
            <UploadCloud className="w-6 h-6 text-indigo-500" />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Submit your hackathon reports, GitHub repositories, live demo links, and presentation documentation.
          </p>
        </div>

        {registeredEvents.length > 0 && (
          <button
            onClick={() => handleOpenModal(registeredEvents[0])}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 flex items-center space-x-2 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Project Report</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      ) : registeredEvents.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-60" />
          <h3 className="font-extrabold text-slate-700 dark:text-slate-300 text-base">No Confirmed Registrations Found</h3>
          <p className="text-xs text-slate-500 mt-1">Register for an event first to access its project submission portal.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {registeredEvents.map((evt) => {
            const submission = submissions.find((s) => s.eventId === evt.id);
            return (
              <div
                key={evt.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                      {evt.category}
                    </span>
                    {submission ? (
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                        submission.status === 'WINNER'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : submission.status === 'REVIEWED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                      }`}>
                        {submission.status}
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                        Pending Submission
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 mt-3 line-clamp-1">
                    {evt.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(evt.startDate).toLocaleDateString()}</span>
                  </p>

                  {/* Submission Details */}
                  {submission ? (
                    <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                      <h4 className="font-black text-sm text-slate-800 dark:text-slate-200">
                        {submission.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {submission.description}
                      </p>

                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        {submission.repoUrl && (
                          <a
                            href={submission.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600"
                          >
                            <Github className="w-3.5 h-3.5" />
                            <span>Repo</span>
                          </a>
                        )}
                        {submission.demoUrl && (
                          <a
                            href={submission.demoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            <span>Live Demo</span>
                          </a>
                        )}
                        {submission.reportUrl && (
                          <a
                            href={submission.reportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Report Doc</span>
                          </a>
                        )}
                      </div>

                      {submission.score !== null && submission.score !== undefined && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-500">Evaluation Score:</span>
                          <span className="font-black text-indigo-600 dark:text-indigo-400">{submission.score} / 100</span>
                        </div>
                      )}

                      {submission.feedback && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg">
                          <strong>Judge Feedback:</strong> {submission.feedback}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                      No report submitted yet. Click below to submit.
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handleOpenModal(evt)}
                    className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center space-x-2"
                  >
                    <UploadCloud className="w-4 h-4 text-indigo-500" />
                    <span>{submission ? 'Edit Submission' : 'Submit Project Report'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submission Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100 mb-4 flex items-center space-x-2">
              <UploadCloud className="w-5 h-5 text-indigo-500" />
              <span>Project Report Submission</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Target Event</label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                >
                  {registeredEvents.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Project Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. AI-Powered Healthcare Diagnostics"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Project Description & Summary *</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly explain the problem solved, tech stack used, and results..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">GitHub / Code Repository URL</label>
                <input
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/your-username/project-repo"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Live Demo / Video Pitch URL</label>
                <input
                  type="url"
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  placeholder="https://youtu.be/... or https://project-demo.vercel.app"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Report Document URL / Google Drive</label>
                <input
                  type="url"
                  value={reportUrl}
                  onChange={(e) => setReportUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/... or PDF link"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Team Members (Optional)</label>
                <input
                  type="text"
                  value={teamMembers}
                  onChange={(e) => setTeamMembers(e.target.value)}
                  placeholder="e.g. Alex Johnson (Lead), Sarah Chen, David Rao"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Save & Submit Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
