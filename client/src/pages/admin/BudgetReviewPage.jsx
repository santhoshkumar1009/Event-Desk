import React, { useState, useEffect } from 'react';
import {
  IndianRupee,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Check,
  X,
  MessageSquare,
  Building,
  User,
  Calendar,
  Layers,
  Sparkles,
  FileCheck2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../components/Toast';

export default function BudgetReviewPage() {
  const { token } = useAuth();
  const socket = useSocket();
  const { showToast } = useToast();

  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDING_APPROVAL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEventIds, setExpandedEventIds] = useState(new Set());

  // Review Modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [reviewAction, setReviewAction] = useState('APPROVE'); // 'APPROVE' | 'REQUEST_REVISION' | 'REJECT'
  const [approvedAmount, setApprovedAmount] = useState('');
  const [adminComment, setAdminComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchBudgets = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await fetch('/api/admin/budgets', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setBudgets(data);
      }
    } catch (err) {
      if (!isBackground) showToast('Failed to load budget reviews', 'error');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;

    const handleBudgetUpdate = () => {
      fetchBudgets(true);
    };

    socket.on('budget:status_updated', handleBudgetUpdate);
    socket.on('admin:new_budget_submission', handleBudgetUpdate);
    socket.on('events:changed', handleBudgetUpdate);

    return () => {
      socket.off('budget:status_updated', handleBudgetUpdate);
      socket.off('admin:new_budget_submission', handleBudgetUpdate);
      socket.off('events:changed', handleBudgetUpdate);
    };
  }, [socket]);

  const toggleExpand = (id) => {
    setExpandedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openReviewModal = (event, defaultAction = 'APPROVE') => {
    setSelectedEvent(event);
    setReviewAction(defaultAction);
    const planned = event.budgetTotalPlanned || (event.expenses || []).reduce((s, e) => s + e.plannedAmount, 0);
    setApprovedAmount(event.budgetApprovedAmount !== null && event.budgetApprovedAmount !== undefined ? event.budgetApprovedAmount : planned);
    setAdminComment(event.budgetAdminComment || '');
    setReviewModalOpen(true);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEvent) return;

    if ((reviewAction === 'REJECT' || reviewAction === 'REQUEST_REVISION') && !adminComment.trim()) {
      showToast('Please provide a comment or explanation for the organizer.', 'error');
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/admin/budgets/${selectedEvent.id}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: reviewAction,
          approvedAmount: reviewAction === 'APPROVE' ? parseFloat(approvedAmount || 0) : undefined,
          comment: adminComment.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Review failed');

      showToast(
        reviewAction === 'APPROVE'
          ? `Budget of ₹${Number(approvedAmount).toLocaleString('en-IN')} approved for "${selectedEvent.title}"!`
          : `Budget review updated: ${reviewAction}`,
        'success'
      );
      setReviewModalOpen(false);
      fetchBudgets();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Aggregated Stats
  const pendingCount = budgets.filter((b) => b.budgetStatus === 'PENDING_APPROVAL').length;
  const approvedBudgets = budgets.filter((b) => b.budgetStatus === 'APPROVED');
  const totalApprovedAmount = approvedBudgets.reduce(
    (sum, b) => sum + (b.budgetApprovedAmount || b.budgetTotalPlanned || 0),
    0
  );
  const totalPlannedAcrossPending = budgets
    .filter((b) => b.budgetStatus === 'PENDING_APPROVAL')
    .reduce((sum, b) => sum + (b.budgetTotalPlanned || 0), 0);

  // Filtering
  const filteredBudgets = budgets.filter((event) => {
    // Tab filter
    if (activeTab === 'PENDING_APPROVAL' && event.budgetStatus !== 'PENDING_APPROVAL') return false;
    if (activeTab === 'APPROVED' && event.budgetStatus !== 'APPROVED') return false;
    if (activeTab === 'REVISIONS_REJECTED' && !['REVISION_REQUESTED', 'REJECTED'].includes(event.budgetStatus)) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = event.title?.toLowerCase().includes(q);
      const matchOrg = event.organizer?.name?.toLowerCase().includes(q);
      const matchDept = event.organizer?.department?.toLowerCase().includes(q);
      const matchVenue = event.venue?.name?.toLowerCase().includes(q);
      if (!matchTitle && !matchOrg && !matchDept && !matchVenue) return false;
    }

    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Approved</span>
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Pending Review</span>
          </span>
        );
      case 'REVISION_REQUESTED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
            <AlertCircle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
            <span>Revision Requested</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Rejected</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <span>Draft / Not Submitted</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <span>Budget Review & Approvals</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              ₹
            </div>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review, sanction, and approve event budgets in Indian Rupees (₹) submitted by campus organizers.
          </p>
        </div>

        <button
          onClick={() => fetchBudgets()}
          className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm flex items-center space-x-2 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Pending Requests</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {pendingCount}
          </h2>
          <p className="text-[11px] text-slate-400 mt-1">
            Total ₹{totalPlannedAcrossPending.toLocaleString('en-IN')} awaiting sanction
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Sanctioned Budgets</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            ₹{totalApprovedAmount.toLocaleString('en-IN')}
          </h2>
          <p className="text-[11px] text-slate-400 mt-1">
            Across {approvedBudgets.length} sanctioned campus events
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Total Tracked Events</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">
            {budgets.length}
          </h2>
          <p className="text-[11px] text-slate-400 mt-1">
            All active organizer events in system
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/60 dark:bg-slate-800/80 rounded-2xl w-full sm:w-fit">
          <button
            onClick={() => setActiveTab('PENDING_APPROVAL')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 ${
              activeTab === 'PENDING_APPROVAL'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>Pending Review</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-black">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('APPROVED')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'APPROVED'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>Approved ({approvedBudgets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('REVISIONS_REJECTED')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'REVISIONS_REJECTED'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>Needs Revision / Denied</span>
          </button>

          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>All ({budgets.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, organizer, venue..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Budget Review Cards */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredBudgets.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          <IndianRupee className="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-500" />
          <h3 className="font-extrabold text-base text-slate-700 dark:text-slate-300">
            No budgets match this filter
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {activeTab === 'PENDING_APPROVAL'
              ? 'Great job! All organizer budget submissions have been reviewed.'
              : 'Try selecting a different tab or searching for another keyword.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBudgets.map((event) => {
            const isExpanded = expandedEventIds.has(event.id);
            const plannedTotal =
              event.budgetTotalPlanned ||
              (event.expenses || []).reduce((sum, ex) => sum + ex.plannedAmount, 0);
            const actualTotal = (event.expenses || []).reduce(
              (sum, ex) => sum + ex.actualAmount,
              0
            );

            return (
              <div
                key={event.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                {/* Header row */}
                <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(event.budgetStatus)}
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                        {event.category || 'General'}
                      </span>
                      {event.accessCode && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {event.accessCode}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                      {event.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {event.organizer?.name || 'Organizer'}
                        </span>
                        {event.organizer?.department && (
                          <span className="text-slate-400">({event.organizer.department})</span>
                        )}
                      </span>

                      {event.venue && (
                        <span className="flex items-center space-x-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>{event.venue.name}</span>
                        </span>
                      )}

                      <span className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {new Date(event.startDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Financial numbers & Action */}
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center space-x-6 bg-slate-50 dark:bg-slate-800/50 px-5 py-3 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                      <div>
                        <span className="block text-[10px] font-bold uppercase text-slate-400">
                          Requested Budget
                        </span>
                        <span className="text-lg font-black text-slate-900 dark:text-slate-100">
                          ₹{Number(plannedTotal).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700" />

                      <div>
                        <span className="block text-[10px] font-bold uppercase text-slate-400">
                          Sanctioned (Approved)
                        </span>
                        <span
                          className={`text-lg font-black ${
                            event.budgetStatus === 'APPROVED'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {event.budgetApprovedAmount !== null && event.budgetApprovedAmount !== undefined
                            ? `₹${Number(event.budgetApprovedAmount).toLocaleString('en-IN')}`
                            : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openReviewModal(event, 'APPROVE')}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>{event.budgetStatus === 'APPROVED' ? 'Edit Sanction' : 'Approve Budget'}</span>
                      </button>

                      {event.budgetStatus !== 'APPROVED' && (
                        <button
                          onClick={() => openReviewModal(event, 'REQUEST_REVISION')}
                          className="px-3.5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-xs hover:bg-amber-100 transition-all"
                        >
                          Revision
                        </button>
                      )}

                      {event.budgetStatus !== 'REJECTED' && (
                        <button
                          onClick={() => openReviewModal(event, 'REJECT')}
                          className="p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-all"
                          title="Reject Budget"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Admin Comment Section if already reviewed */}
                {event.budgetAdminComment && (
                  <div className="px-6 py-3 bg-amber-50/60 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/40 flex items-start space-x-3 text-xs">
                    <MessageSquare className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-amber-900 dark:text-amber-300">
                        Admin Review Note:{' '}
                      </span>
                      <span className="text-amber-800 dark:text-amber-200">
                        {event.budgetAdminComment}
                      </span>
                      {event.budgetReviewedAt && (
                        <span className="ml-2 text-[10px] text-amber-600/80">
                          ({new Date(event.budgetReviewedAt).toLocaleString('en-IN')})
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Collapsible Line Items / Expenses Breakdown */}
                <div className="px-6 py-3 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-semibold">
                    {(event.expenses || []).length} itemized line item
                    {(event.expenses || []).length === 1 ? '' : 's'} submitted
                  </span>

                  <button
                    onClick={() => toggleExpand(event.id)}
                    className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 font-bold hover:underline"
                  >
                    <span>{isExpanded ? 'Hide Itemized Breakdown' : 'View Itemized Breakdown'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="p-6 bg-slate-50/30 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800">
                    {(event.expenses || []).length === 0 ? (
                      <div className="text-center py-4 text-slate-400 text-xs">
                        No individual line items logged yet for this event.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase font-extrabold border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="px-4 py-3">Expense Title / Item</th>
                              <th className="px-4 py-3">Category</th>
                              <th className="px-4 py-3 text-right">Planned (₹)</th>
                              <th className="px-4 py-3 text-right">Actual Spend (₹)</th>
                              <th className="px-4 py-3 text-right">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {event.expenses.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                                  {item.title}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {item.category}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right font-extrabold text-slate-700 dark:text-slate-300">
                                  ₹{Number(item.plannedAmount).toLocaleString('en-IN')}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-blue-600">
                                  ₹{Number(item.actualAmount).toLocaleString('en-IN')}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-400 text-[11px]">
                                  {item.notes || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review & Decision Modal */}
      {reviewModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                  ₹
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-slate-100">
                    Review Event Budget
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {selectedEvent.title}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setReviewModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="mt-5 space-y-4 text-xs">
              {/* Review Action Tabs */}
              <div>
                <label className="block font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">
                  Decision
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewAction('APPROVE')}
                    className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center space-x-1.5 border transition-all ${
                      reviewAction === 'APPROVE'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewAction('REQUEST_REVISION')}
                    className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center space-x-1.5 border transition-all ${
                      reviewAction === 'REQUEST_REVISION'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-500/20'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>Revision</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewAction('REJECT')}
                    className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center space-x-1.5 border transition-all ${
                      reviewAction === 'REJECT'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/20'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <X className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>

              {/* Approved Amount (for Approve action) */}
              {reviewAction === 'APPROVE' && (
                <div>
                  <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Sanctioned / Approved Budget (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 font-bold text-slate-400 text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      value={approvedAmount}
                      onChange={(e) => setApprovedAmount(e.target.value)}
                      placeholder="e.g. 50000"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <span className="block text-[11px] text-slate-400 mt-1">
                    Requested by organizer: ₹
                    {Number(
                      selectedEvent.budgetTotalPlanned ||
                        (selectedEvent.expenses || []).reduce((s, e) => s + e.plannedAmount, 0)
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {/* Comment / Remarks */}
              <div>
                <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Admin Remarks / Feedback {reviewAction !== 'APPROVE' && '*'}
                </label>
                <textarea
                  rows="3"
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  placeholder={
                    reviewAction === 'APPROVE'
                      ? 'e.g. Approved as per institution finance guidelines. Please retain original GST invoices.'
                      : 'e.g. Please reduce catering costs by ₹10,000 and re-submit for review.'
                  }
                  required={reviewAction !== 'APPROVE'}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className={`px-5 py-2.5 rounded-xl text-white font-extrabold text-xs shadow-md transition-all flex items-center space-x-1.5 ${
                    reviewAction === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                      : reviewAction === 'REQUEST_REVISION'
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {submittingReview
                      ? 'Saving Decision...'
                      : reviewAction === 'APPROVE'
                      ? 'Confirm & Sanction Budget'
                      : reviewAction === 'REQUEST_REVISION'
                      ? 'Send Revision Request'
                      : 'Reject Budget'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
