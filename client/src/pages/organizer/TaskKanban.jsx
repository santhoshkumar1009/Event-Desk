import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, Clock, User, Trash2, CheckCircle2, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../components/Toast';

export default function TaskKanban() {
  const { token } = useAuth();
  const socket = useSocket();
  const { showToast } = useToast();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // New Task modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [status, setStatus] = useState('TODO');
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    return () => {
      socket.off('events:changed', fetchEvents);
    };
  }, [socket]);

  const fetchTasks = async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/event/${selectedEventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      showToast('Failed to fetch tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedEventId]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId: selectedEventId,
          title,
          description,
          priority,
          status,
          deadline: deadline || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Task creation failed');

      showToast('Task added to Kanban board!', 'success');
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      fetchTasks();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveStatus = async (taskId, newStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update task');
      fetchTasks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast('Task removed', 'success');
      fetchTasks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleExportTasksCSV = () => {
    if (!tasks || tasks.length === 0) {
      showToast('No tasks to export for this event.', 'info');
      return;
    }

    const currentEvt = events.find((e) => e.id === selectedEventId);
    const headersRow = ['Task Title', 'Event', 'Status', 'Priority', 'Assigned To', 'Deadline', 'Description'];
    const rows = tasks.map((t) => [
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(currentEvt?.title || '').replace(/"/g, '""')}"`,
      `"${t.status}"`,
      `"${t.priority}"`,
      `"${(t.assignedTo?.name || t.assignedTo || 'Unassigned').replace(/"/g, '""')}"`,
      t.deadline ? `"${new Date(t.deadline).toLocaleDateString()}"` : 'None',
      `"${(t.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headersRow.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const eventName = currentEvt?.title || 'Event';
    link.setAttribute('download', `Kanban_Tasks_${eventName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${tasks.length} kanban tasks to CSV!`, 'success');
  };

  const columns = [
    { id: 'TODO', title: 'To Do', color: 'border-slate-300 bg-slate-100/50 dark:bg-slate-800/40' },
    { id: 'IN_PROGRESS', title: 'In Progress', color: 'border-blue-300 bg-blue-50/50 dark:bg-blue-950/20' },
    { id: 'DONE', title: 'Done', color: 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <span>Event Task Kanban Board</span>
            <CheckSquare className="w-6 h-6 text-indigo-500" />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Organize action items, assign tasks to crew members, set deadlines, and track completion progress.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:outline-none"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportTasksCSV}
            className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-md flex items-center space-x-1.5 shrink-0 transition-all"
            title="Download event tasks as CSV"
          >
            <Download className="w-4 h-4 text-indigo-500" />
            <span>Export Tasks (CSV)</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center space-x-1 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className={`p-4 rounded-3xl border ${col.color} flex flex-col h-[600px]`}>
              <div className="flex items-center justify-between mb-3 px-2">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  {col.title} ({colTasks.length})
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {colTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          t.priority === 'HIGH'
                            ? 'bg-rose-100 text-rose-700'
                            : t.priority === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {t.priority}
                      </span>
                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {t.title}
                    </h4>

                    {t.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {t.description}
                      </p>
                    )}

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      {t.deadline && (
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1 text-blue-500" />
                          {new Date(t.deadline).toLocaleDateString()}
                        </span>
                      )}

                      {/* Move Buttons */}
                      <div className="flex space-x-1">
                        {col.id !== 'TODO' && (
                          <button
                            onClick={() => handleMoveStatus(t.id, col.id === 'DONE' ? 'IN_PROGRESS' : 'TODO')}
                            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                          >
                            ←
                          </button>
                        )}
                        {col.id !== 'DONE' && (
                          <button
                            onClick={() => handleMoveStatus(t.id, col.id === 'TODO' ? 'IN_PROGRESS' : 'DONE')}
                            className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold"
                          >
                            →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100 mb-4">
              Add Event Task
            </h3>
            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Order trophies & banners"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Deadline
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
