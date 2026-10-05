import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, CheckCircle2, Clock, MapPin, Phone, AlertCircle, X, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../components/Toast';

export default function LostFoundPage() {
  const { token, user } = useAuth();
  const socket = useSocket();
  const { showToast } = useToast();

  const [items, setItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'MY'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventId, setEventId] = useState('');
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchItemsAndEvents = async () => {
    setLoading(true);
    try {
      const [itemsRes, eventsRes] = await Promise.all([
        fetch('/api/lost-items', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/events'),
      ]);
      const itemsData = await itemsRes.json();
      const eventsData = await eventsRes.json();

      setItems(Array.isArray(itemsData) ? itemsData : []);
      if (Array.isArray(eventsData) && eventsData.length > 0) {
        setEvents(eventsData);
        if (!eventId) setEventId(eventsData[0].id);
      }
    } catch (err) {
      showToast('Failed to load lost items', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemsAndEvents();
  }, [token]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchItemsAndEvents();
    socket.on('lost_item:new', handleUpdate);
    socket.on('lost_item:updated', handleUpdate);
    return () => {
      socket.off('lost_item:new', handleUpdate);
      socket.off('lost_item:updated', handleUpdate);
    };
  }, [socket]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!eventId || !itemName.trim() || !description.trim()) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/lost-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId,
          itemName: itemName.trim(),
          category,
          description: description.trim(),
          location: location.trim() || null,
          contactPhone: contactPhone.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Report failed');

      showToast('Lost item reported! Organizers have been alerted.', 'success');
      setIsModalOpen(false);
      setItemName('');
      setDescription('');
      setLocation('');
      setContactPhone('');
      fetchItemsAndEvents();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const displayedItems = activeTab === 'MY'
    ? items.filter((item) => item.userId === user?.id)
    : items;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <span>Lost & Found Items</span>
            <Package className="w-6 h-6 text-amber-500" />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Report items lost during events. Event coordinators and campus security monitor this desk to help return belongings.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-lg shadow-amber-500/25 flex items-center space-x-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Report Lost Item</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'ALL'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          All Reported Items ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('MY')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'MY'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          My Reports ({items.filter((i) => i.userId === user?.id).length})
        </button>
      </div>

      {/* Items List Grid */}
      {loading ? (
        <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      ) : displayedItems.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center text-slate-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-60" />
          <h3 className="font-extrabold text-slate-700 dark:text-slate-300 text-base">No Lost Items Reported</h3>
          <p className="text-xs text-slate-500 mt-1">
            {activeTab === 'MY' ? "You haven't reported any lost items." : "No lost belongings currently reported for campus events."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedItems.map((item) => {
            const isFound = item.status === 'FOUND';
            const isResolved = item.status === 'RESOLVED' || item.status === 'CLAIMED';
            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {item.category}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                        isResolved
                          ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          : isFound
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 animate-pulse'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {isResolved ? 'Resolved / Claimed' : isFound ? '🎉 FOUND BY ORGANIZER' : 'Searching / Reported'}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 mt-3">
                    {item.itemName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {item.description}
                  </p>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Event:</span>
                      <span className="truncate">{item.event?.title}</span>
                    </div>
                    {item.location && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>Lost at: {item.location}</span>
                      </div>
                    )}
                    {item.contactPhone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Contact: {item.contactPhone}</span>
                      </div>
                    )}
                  </div>

                  {/* Organizer Found Note Banner */}
                  {item.foundNotes && (
                    <div className="mt-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300">
                      <strong>Organizer Note:</strong> {item.foundNotes}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Reported by {item.user?.name}</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Report Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <Package className="w-5 h-5 text-amber-500" />
                <span>Report a Lost Item</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Event Where Lost *</label>
                <select
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                >
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Blue Boat Earphones, Black HP Laptop Bag"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="ID/Cards">ID & Cards</option>
                    <option value="Bags">Bags & Backpacks</option>
                    <option value="Accessories">Accessories & Keys</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Location Where Lost (Approximate)</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Tech Block A - Auditorium Row 4, or Food Court"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Description & Identifying Marks *</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Include color, brand, stickers, keychains or any unique details..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-xs text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Submitting Report...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
