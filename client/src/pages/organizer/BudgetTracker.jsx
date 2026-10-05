import React, { useState, useEffect } from 'react';
import {
  IndianRupee,
  Plus,
  TrendingDown,
  TrendingUp,
  PieChart,
  Trash2,
  Lock,
  Key,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Send,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../components/Toast';

export default function BudgetTracker() {
  const { token, user } = useAuth();
  const socket = useSocket();
  const { showToast } = useToast();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [totals, setTotals] = useState({ totalPlanned: 0, totalActual: 0, variance: 0 });
  const [budgetDetails, setBudgetDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submittingBudget, setSubmittingBudget] = useState(false);

  // Secure Code state per event
  const [unlockedCodes, setUnlockedCodes] = useState({});
  const [inputCode, setInputCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeError, setCodeError] = useState('');

  // New Expense Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Catering');
  const [plannedAmount, setPlannedAmount] = useState('');
  const [actualAmount, setActualAmount] = useState('');
  const [notes, setNotes] = useState('');
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

  // Real-time synchronization for Budget Approval decisions from Admin
  useEffect(() => {
    if (!socket || !selectedEventId) return;

    const handleBudgetStatus = (payload) => {
      if (payload.eventId === selectedEventId) {
        fetchExpenses();
        if (payload.budgetStatus === 'APPROVED') {
          showToast(`Great news! Budget approved by Admin for ₹${Number(payload.budgetApprovedAmount || 0).toLocaleString('en-IN')}`, 'success');
        } else if (payload.budgetStatus === 'REVISION_REQUESTED') {
          showToast('Admin requested revisions on your event budget.', 'warning');
        } else if (payload.budgetStatus === 'REJECTED') {
          showToast('Admin rejected the event budget proposal.', 'error');
        }
      }
    };

    socket.on('budget:status_updated', handleBudgetStatus);
    socket.on(`event:${selectedEventId}:budget_updated`, handleBudgetStatus);

    return () => {
      socket.off('budget:status_updated', handleBudgetStatus);
      socket.off(`event:${selectedEventId}:budget_updated`, handleBudgetStatus);
    };
  }, [socket, selectedEventId]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const isUnlocked = user?.role === 'ADMIN' || Boolean(unlockedCodes[selectedEventId]);

  const fetchExpenses = async () => {
    if (!selectedEventId) return;
    if (!isUnlocked) {
      setExpenses([]);
      setTotals({ totalPlanned: 0, totalActual: 0, variance: 0 });
      setBudgetDetails(null);
      return;
    }
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (unlockedCodes[selectedEventId]) {
        headers['x-event-access-code'] = unlockedCodes[selectedEventId];
      }

      const res = await fetch(`/api/expenses/event/${selectedEventId}`, {
        headers,
      });
      const data = await res.json();
      if (res.status === 403 || data.locked) {
        setUnlockedCodes((prev) => {
          const next = { ...prev };
          delete next[selectedEventId];
          return next;
        });
        setExpenses([]);
        setBudgetDetails(null);
        return;
      }
      setExpenses(data.expenses || []);
      setTotals(data.totals || { totalPlanned: 0, totalActual: 0, variance: 0 });
      if (data.event) {
        setBudgetDetails(data.event);
      }
    } catch (err) {
      showToast('Failed to load expenses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBudget = async () => {
    if (!selectedEventId) return;
    setSubmittingBudget(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };
      if (unlockedCodes[selectedEventId]) {
        headers['x-event-access-code'] = unlockedCodes[selectedEventId];
      }

      const res = await fetch(`/api/expenses/event/${selectedEventId}/submit-budget`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          accessCode: unlockedCodes[selectedEventId],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed');

      showToast('Budget successfully submitted for Admin approval!', 'success');
      fetchExpenses();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingBudget(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [selectedEventId, unlockedCodes]);

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
      showToast('Event access code verified! Budget unlocked.', 'success');
    } catch (err) {
      setCodeError(err.message || 'Invalid event access code');
      showToast(err.message || 'Verification failed', 'error');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };
      if (unlockedCodes[selectedEventId]) {
        headers['x-event-access-code'] = unlockedCodes[selectedEventId];
      }

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          eventId: selectedEventId,
          title,
          category,
          plannedAmount: parseFloat(plannedAmount),
          actualAmount: parseFloat(actualAmount || 0),
          notes,
          accessCode: unlockedCodes[selectedEventId],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Add expense failed');

      showToast('Expense logged successfully in ₹!', 'success');
      setIsModalOpen(false);
      setTitle('');
      setPlannedAmount('');
      setActualAmount('');
      setNotes('');
      fetchExpenses();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast('Expense removed', 'success');
      fetchExpenses();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <span>Budget & Expense Tracker</span>
            <IndianRupee className="w-6 h-6 text-emerald-500" />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Compare planned vs actual spending per event in Indian Rupees (₹), manage invoices, and calculate financial variance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:outline-none"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>

          {isUnlocked && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center space-x-1 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Log Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* Access Code Protection Lock Screen */}
      {!isUnlocked ? (
        <div className="glass-panel rounded-3xl p-10 max-w-lg mx-auto text-center border border-slate-200/80 dark:border-slate-800 shadow-xl my-8">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 ring-8 ring-amber-500/5">
            <Lock className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
            Event Budget Protected
          </h3>
          <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
            This event budget requires the secure event access code to view and manage financial spending in Indian Rupees (₹).
          </p>

          <form onSubmit={handleVerifyCode} className="mt-6 space-y-4">
            <div className="relative">
              <Key className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="Enter SEC-XXXXXX..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <Key className="w-4 h-4" />
              <span>{verifyingCode ? 'Verifying Code...' : 'Unlock Event Budget'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400">
            Secure code was generated upon event creation. Check with the event coordinator or Admin.
          </div>
        </div>
      ) : (
        <>
          {/* Budget Approval Status Banner */}
          {budgetDetails?.budgetStatus === 'APPROVED' ? (
            <div className="bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/40 rounded-3xl p-6 relative overflow-hidden shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        OFFICIAL SANCTION: APPROVED
                      </span>
                      {budgetDetails.budgetReviewedAt && (
                        <span className="text-[11px] text-slate-400">
                          Sanctioned on {new Date(budgetDetails.budgetReviewedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1 flex items-center space-x-2">
                      <span>Event Budget Approved by Admin</span>
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      The administration has sanctioned a budget of{' '}
                      <strong className="text-emerald-600 dark:text-emerald-400 font-black">
                        ₹{Number(budgetDetails.budgetApprovedAmount || totals.totalPlanned).toLocaleString('en-IN')}
                      </strong>{' '}
                      for this event. You are authorized to disburse funds within this sanctioned limit.
                    </p>
                    {budgetDetails.budgetAdminComment && (
                      <div className="mt-3 p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-900/50 text-xs text-slate-700 dark:text-slate-200 flex items-start space-x-2">
                        <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-emerald-700 dark:text-emerald-300">Admin Remarks: </span>
                          <span>{budgetDetails.budgetAdminComment}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end justify-center shrink-0 bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl border border-emerald-300 dark:border-emerald-800 shadow-sm self-start md:self-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Sanctioned Amount
                  </span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    ₹{Number(budgetDetails.budgetApprovedAmount || totals.totalPlanned).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    Actual spend: ₹{Number(totals.totalActual).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          ) : budgetDetails?.budgetStatus === 'PENDING_APPROVAL' ? (
            <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/40 rounded-3xl p-6 relative overflow-hidden shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30 animate-pulse">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        UNDER ADMIN REVIEW
                      </span>
                      {budgetDetails.budgetSubmittedAt && (
                        <span className="text-[11px] text-slate-400">
                          Submitted on {new Date(budgetDetails.budgetSubmittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                      Budget Submitted — Awaiting Admin Approval
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      Your planned budget of{' '}
                      <strong className="text-amber-600 dark:text-amber-400 font-black">
                        ₹{Number(budgetDetails.budgetTotalPlanned || totals.totalPlanned).toLocaleString('en-IN')}
                      </strong>{' '}
                      has been sent to Admin and is currently in review. You will receive an immediate notification once approved.
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center self-start md:self-center">
                  <div className="px-5 py-3 rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center space-x-2">
                    <Clock className="w-4 h-4 animate-spin text-amber-600" />
                    <span>Review in Progress</span>
                  </div>
                </div>
              </div>
            </div>
          ) : budgetDetails?.budgetStatus === 'REVISION_REQUESTED' ? (
            <div className="bg-gradient-to-r from-orange-500/15 via-orange-500/5 to-transparent border border-orange-500/40 rounded-3xl p-6 relative overflow-hidden shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/30">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
                      REVISION REQUESTED
                    </span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                      Admin Requested Changes to Budget
                    </h3>
                    {budgetDetails.budgetAdminComment && (
                      <div className="mt-2 p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-orange-200 dark:border-orange-900/50 text-xs text-slate-700 dark:text-slate-200">
                        <span className="font-bold text-orange-700 dark:text-orange-300">Admin Remarks: </span>
                        <span>{budgetDetails.budgetAdminComment}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleSubmitBudget}
                  disabled={submittingBudget}
                  className="px-5 py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs shadow-lg shadow-orange-600/25 flex items-center space-x-2 shrink-0 self-start md:self-center transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{submittingBudget ? 'Submitting...' : 'Re-submit Budget for Approval'}</span>
                </button>
              </div>
            </div>
          ) : budgetDetails?.budgetStatus === 'REJECTED' ? (
            <div className="bg-gradient-to-r from-rose-500/15 via-rose-500/5 to-transparent border border-rose-500/40 rounded-3xl p-6 relative overflow-hidden shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/30">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                      BUDGET REJECTED
                    </span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                      Budget Proposal Declined
                    </h3>
                    {budgetDetails.budgetAdminComment && (
                      <div className="mt-2 p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-rose-200 dark:border-rose-900/50 text-xs text-slate-700 dark:text-slate-200">
                        <span className="font-bold text-rose-700 dark:text-rose-300">Reason: </span>
                        <span>{budgetDetails.budgetAdminComment}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleSubmitBudget}
                  disabled={submittingBudget}
                  className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-lg shadow-rose-600/25 flex items-center space-x-2 shrink-0 self-start md:self-center transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{submittingBudget ? 'Submitting...' : 'Re-submit Updated Budget'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-500/20 rounded-3xl p-6 relative overflow-hidden shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/30">
                    <IndianRupee className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                      BUDGET DRAFT
                    </span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                      Ready for Admin Review & Approval?
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      Log your planned expenses below and submit the event budget (₹{Number(totals.totalPlanned).toLocaleString('en-IN')}) for official administrative review and sanction.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleSubmitBudget}
                  disabled={submittingBudget || totals.totalPlanned === 0}
                  className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-600/25 flex items-center space-x-2 shrink-0 self-start md:self-center transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{submittingBudget ? 'Submitting...' : `Submit Budget to Admin (₹${Number(totals.totalPlanned).toLocaleString('en-IN')})`}</span>
                </button>
              </div>
            </div>
          )}

          {/* Financial Summary Cards in INR (₹) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {budgetDetails?.budgetStatus === 'APPROVED' ? 'Sanctioned Budget (₹)' : 'Total Planned Budget (₹)'}
              </span>
              <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">
                ₹{Number(
                  budgetDetails?.budgetStatus === 'APPROVED' && budgetDetails.budgetApprovedAmount !== null && budgetDetails.budgetApprovedAmount !== undefined
                    ? budgetDetails.budgetApprovedAmount
                    : totals.totalPlanned || 0
                ).toLocaleString('en-IN')}
              </h2>
              {budgetDetails?.budgetStatus === 'APPROVED' && (
                <p className="text-[11px] text-slate-400 mt-1">
                  Requested: ₹{Number(totals.totalPlanned || 0).toLocaleString('en-IN')}
                </p>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Actual Spend (₹)
              </span>
              <h2 className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-2">
                ₹{Number(totals.totalActual || 0).toLocaleString('en-IN')}
              </h2>
              <p className="text-[11px] text-slate-400 mt-1">
                From {expenses.length} logged expense items
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {budgetDetails?.budgetStatus === 'APPROVED' ? 'Remaining Balance (₹)' : 'Variance (₹ Under/Over)'}
              </span>
              {(() => {
                const limit =
                  budgetDetails?.budgetStatus === 'APPROVED' && budgetDetails.budgetApprovedAmount !== null && budgetDetails.budgetApprovedAmount !== undefined
                    ? budgetDetails.budgetApprovedAmount
                    : totals.totalPlanned;
                const balance = limit - totals.totalActual;
                return (
                  <>
                    <h2
                      className={`text-3xl font-black mt-2 ${
                        balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      ₹{Number(balance || 0).toLocaleString('en-IN')}
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {balance >= 0 ? 'Within budget limit' : 'Budget overrun warning!'}
                    </p>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Expenses Table */}
          {loading ? (
            <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ) : expenses.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center text-slate-400">
              <IndianRupee className="w-10 h-10 mx-auto mb-2 opacity-60" />
              <p className="text-sm font-bold">No expenses logged for this event</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Expense Title</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Planned (₹)</th>
                      <th className="px-6 py-4">Actual (₹)</th>
                      <th className="px-6 py-4">Variance (₹)</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {expenses.map((ex) => {
                      const diff = ex.plannedAmount - ex.actualAmount;
                      return (
                        <tr key={ex.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                            {ex.title}
                            {ex.notes && <span className="block text-[11px] font-normal text-slate-400">{ex.notes}</span>}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {ex.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                            ₹{Number(ex.plannedAmount).toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4 font-bold text-blue-600">
                            ₹{Number(ex.actualAmount).toLocaleString('en-IN')}
                          </td>
                          <td className={`px-6 py-4 font-extrabold ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ₹{Number(diff).toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDeleteExpense(ex.id)}
                              className="p-1 rounded text-rose-500 hover:bg-rose-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* New Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100 mb-4">
              Log Event Expense
            </h3>
            <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Expense Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Catering & Snack Boxes"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                >
                  <option value="Catering">Catering</option>
                  <option value="Equipment">Equipment & Audio</option>
                  <option value="Prizes">Prizes & Trophies</option>
                  <option value="Marketing">Marketing & Ads</option>
                  <option value="Logistics">Logistics</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Planned Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={plannedAmount}
                    onChange={(e) => setPlannedAmount(e.target.value)}
                    placeholder="25000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Actual Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={actualAmount}
                    onChange={(e) => setActualAmount(e.target.value)}
                    placeholder="22500"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Receipt # / Vendor details"
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
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
