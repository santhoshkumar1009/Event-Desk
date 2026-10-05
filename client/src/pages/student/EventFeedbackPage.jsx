import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Plus, CheckCircle2, Calendar, Award, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

export default function EventFeedbackPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();

  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [myFeedbacks, setMyFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchFeedbacksAndEvents = async () => {
    setLoading(true);
    try {
      const [regRes, feedRes] = await Promise.all([
        fetch('/api/registrations/my-registrations', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/feedback/my', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const regData = await regRes.json();
      const feedData = await feedRes.json();

      const eventsList = (Array.isArray(regData) ? regData : [])
        .filter((r) => r.status === 'CONFIRMED')
        .map((r) => r.event);

      setRegisteredEvents(eventsList);
      if (eventsList.length > 0 && !selectedEventId) {
        setSelectedEventId(eventsList[0].id);
      }
      setMyFeedbacks(Array.isArray(feedData) ? feedData : []);
    } catch (err) {
      showToast('Failed to load feedback', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacksAndEvents();
  }, [token]);

  const handleOpenReview = (evt) => {
    setSelectedEventId(evt.id);
    const existing = myFeedbacks.find((f) => f.eventId === evt.id);
    if (existing) {
      setRating(existing.rating);
      setComment(existing.comment || '');
    } else {
      setRating(5);
      setComment('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEventId || !rating) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId: selectedEventId,
          rating,
          comment: comment.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Feedback submission failed');

      showToast('Thank you for rating this event!', 'success');
      setIsModalOpen(false);
      fetchFeedbacksAndEvents();
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
            <span>Event Feedback & Ratings</span>
            <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Rate events you registered for and share your experience with coordinators.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      ) : registeredEvents.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center text-slate-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-60" />
          <h3 className="font-extrabold text-slate-700 dark:text-slate-300 text-base">No Event Registrations Found</h3>
          <p className="text-xs text-slate-500 mt-1">Register for an event first to submit reviews and feedback.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {registeredEvents.map((evt) => {
            const feedback = myFeedbacks.find((f) => f.eventId === evt.id);
            return (
              <div
                key={evt.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                      {evt.category}
                    </span>
                    {feedback ? (
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                        Reviewed
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                        Awaiting Rating
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

                  {feedback ? (
                    <div className="mt-4 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= feedback.rating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-300 dark:text-slate-700'
                            }`}
                          />
                        ))}
                        <span className="text-xs font-black text-amber-700 dark:text-amber-300 ml-1.5">
                          {feedback.rating} / 5 Stars
                        </span>
                      </div>
                      {feedback.comment && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 italic">
                          "{feedback.comment}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                      Share your experience to help coordinators improve future campus events.
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handleOpenReview(evt)}
                    className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>{feedback ? 'Update My Review' : 'Rate & Review Event'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                <span>Submit Event Rating</span>
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

              {/* Star Rating Picker */}
              <div className="text-center py-2">
                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Your Rating</label>
                <div className="flex items-center justify-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform hover:scale-125 focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= (hoverRating || rating)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-200 dark:text-slate-700'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 mt-1 block">
                  {rating === 5 ? '⭐⭐⭐⭐⭐ Exceptional!' : rating === 4 ? '⭐⭐⭐⭐ Very Good' : rating === 3 ? '⭐⭐⭐ Average' : rating === 2 ? '⭐⭐ Needs Improvement' : '⭐ Poor'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Your Review & Comments</label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell coordinators what went well or what could be improved..."
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
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
