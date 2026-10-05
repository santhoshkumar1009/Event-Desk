import React, { useState, useEffect } from 'react';
import { Package, Search, CheckCircle2, Clock, MapPin, Phone, AlertCircle, Filter, Edit3, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../components/Toast';

export default function LostItemsManager() {
  const { token } = useAuth();
  const socket = useSocket();
  const { showToast } = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Update Status Modal
  const [selectedItem, setSelectedItem] = useState(null);
  const [newStatus, setNewStatus] = useState('FOUND');
  const [foundNotes, setFoundNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/lost-items', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Failed to load lost items', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [token]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchItems();
    socket.on('lost_item:new', handleUpdate);
    socket.on('lost_item:updated', handleUpdate);
    return () => {
      socket.off('lost_item:new', handleUpdate);
      socket.off('lost_item:updated', handleUpdate);
    };
  }, [socket]);

  const handleOpenUpdate = (item) => {
    setSelectedItem(item);
    setNewStatus(item.status === 'REPORTED' ? 'FOUND' : item.status);
    setFoundNotes(item.foundNotes || '');
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    setUpdating(true);
    try {
      const res = await fetch(`/api/lost-items/${selectedItem.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          foundNotes: foundNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Status update failed');

      showToast(`Item updated to ${newStatus}`, 'success');
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const matchesSearch = !search ||
      item.itemName?.toLowerCase().includes(search.toLowerCase()) ||
      item.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.event?.title?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <span>Organizer Lost & Found Desk</span>
          <Package className="w-6 h-6 text-amber-500" />
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review belongings reported missing by students during your events. Mark items as found or claimed.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search item, student name, event..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none"
          />
        </div>

        <div className="w-full md:w-auto flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-48 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="REPORTED">Reported / Missing</option>
            <option value="FOUND">Found by Organizer</option>
            <option value="RESOLVED">Claimed / Resolved</option>
          </select>
        </div>
      </div>

      {/* Items Table */}
      {loading ? (
        <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      ) : filteredItems.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center text-slate-400">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-bold">No lost item reports found matching criteria</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Item & Description</th>
                  <th className="px-6 py-4">Event & Location</th>
                  <th className="px-6 py-4">Student Contact</th>
                  <th className="px-6 py-4">Current Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {item.itemName}
                      </div>
                      <span className="text-[10px] uppercase font-bold text-amber-600 block">
                        Category: {item.category}
                      </span>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{item.description}</p>
                      {item.foundNotes && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                          Note: {item.foundNotes}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                      <div className="font-bold">{item.event?.title}</div>
                      <div className="text-[11px] text-slate-400">{item.location || 'Location not specified'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{item.user?.name}</div>
                      <div className="text-[11px] text-slate-400">{item.contactPhone || item.user?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          item.status === 'FOUND'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : item.status === 'RESOLVED' || item.status === 'CLAIMED'
                            ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenUpdate(item)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center space-x-1 ml-auto"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Update Status</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">
                Update Item: {selectedItem.itemName}
              </h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                >
                  <option value="REPORTED">REPORTED (Still Missing)</option>
                  <option value="FOUND">FOUND (Item Recovered / Kept at Desk)</option>
                  <option value="CLAIMED">CLAIMED (Returned to Student)</option>
                  <option value="RESOLVED">RESOLVED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Organizer Location Notes</label>
                <textarea
                  rows={3}
                  value={foundNotes}
                  onChange={(e) => setFoundNotes(e.target.value)}
                  placeholder="e.g. Item placed at Main Auditorium Registration Desk with Coordinator Sarah Connor"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 rounded-xl font-bold text-xs text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
