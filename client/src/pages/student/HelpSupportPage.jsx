import React, { useState, useEffect } from 'react';
import { LifeBuoy, HelpCircle, Phone, Mail, ChevronDown, ChevronUp, MessageSquare, Send, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

export default function HelpSupportPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();

  const [faqs, setFaqs] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [myTickets, setMyTickets] = useState([]);
  const [expandedFaq, setExpandedFaq] = useState(null);

  // New Ticket Form State
  const [category, setCategory] = useState('Registration');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/support/faqs')
      .then((res) => res.json())
      .then((data) => setFaqs(Array.isArray(data) ? data : []))
      .catch(console.error);

    fetch('/api/support/contacts')
      .then((res) => res.json())
      .then((data) => setContacts(Array.isArray(data) ? data : []))
      .catch(console.error);

    if (token) {
      fetch('/api/support/tickets/my', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setMyTickets(Array.isArray(data) ? data : []))
        .catch(console.error);
    }
  }, [token]);

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      showToast('Please provide subject and message', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ category, subject: subject.trim(), message: message.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ticket creation failed');

      showToast('Query submitted! Campus support will respond shortly.', 'success');
      setSubject('');
      setMessage('');
      setMyTickets([data, ...myTickets]);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <span>Student Help & Support Hub</span>
          <LifeBuoy className="w-6 h-6 text-blue-500" />
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Frequently asked questions, emergency campus hotlines, and instant query resolution desk.
        </p>
      </div>

      {/* Campus Emergency & Support Contacts */}
      <div>
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center space-x-2">
          <Phone className="w-4 h-4 text-blue-500" />
          <span>Campus Coordinators & Helplines</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {contacts.map((c, i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                  {c.role}
                </span>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 mt-1">
                  {c.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">{c.office} • {c.hours}</p>

                <div className="mt-4 space-y-2 text-xs">
                  <a
                    href={`tel:${c.phone.replace(/[^0-9+]/g, '')}`}
                    className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 font-bold hover:text-blue-600"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{c.phone}</span>
                  </a>
                  <a
                    href={`mailto:${c.email}`}
                    className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 hover:text-blue-600"
                  >
                    <Mail className="w-3.5 h-3.5 text-blue-500" />
                    <span className="truncate">{c.email}</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: FAQs + Submit Ticket */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* FAQs Accordion */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mb-4 flex items-center space-x-2">
            <HelpCircle className="w-5 h-5 text-indigo-500" />
            <span>Frequently Asked Questions</span>
          </h2>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isExpanded = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200/60 dark:border-slate-800 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <div className="flex items-center space-x-2 pr-4">
                      <span className="text-[10px] font-black uppercase text-blue-500">[{faq.category}]</span>
                      <span>{faq.question}</span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 shrink-0 text-slate-400" /> : <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Query Ticket Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mb-1 flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              <span>Raise Support Query</span>
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Have an issue with registration, QR tickets, or points? Send a message to the coordinator.
            </p>

            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Issue Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                >
                  <option value="Registration">Registration & Waitlist</option>
                  <option value="QR Pass">QR Ticket / Pass Scan Issue</option>
                  <option value="Points">Activity Points Not Credited</option>
                  <option value="Technical">Technical Bug or Error</option>
                  <option value="General">General Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Activity points not credited after QR check-in"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Message Details *</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue with relevant event name, student ID, etc..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Submitting Query...' : 'Submit Support Query'}</span>
              </button>
            </form>
          </div>

          {/* Active Tickets List */}
          {myTickets.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Your Recent Queries</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {myTickets.map((t) => (
                  <div key={t.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{t.subject}</span>
                      <span className="text-[10px] text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
