import React, { useState, useEffect } from 'react';
import { QrCode, Calendar, MapPin, Download, Award, CheckCircle2, Clock, FileText } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import EventReminderBanner from '../../components/EventReminderBanner';

export default function MyRegistrations() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQR, setSelectedQR] = useState(null);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/registrations/my-registrations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRegistrations(data);
    } catch (err) {
      showToast('Failed to load tickets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  // Generate PDF Certificate for Attended Event
  const downloadCertificate = (reg) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Background border & design
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(3);
    doc.rect(10, 10, 277, 190);

    doc.setDrawColor(219, 234, 254);
    doc.setLineWidth(1);
    doc.rect(14, 14, 269, 182);

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(30, 58, 138);
    doc.text('CERTIFICATE OF PARTICIPATION', 148, 45, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('SIMATS EVENTFLOW COORDINATION PLATFORM', 148, 55, { align: 'center' });

    // Recipient
    doc.setFontSize(14);
    doc.setTextColor(71, 85, 105);
    doc.text('This is proudly presented to', 148, 78, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(15, 23, 42);
    doc.text(user.name.toUpperCase(), 148, 92, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(`Department of ${user.department}`, 148, 100, { align: 'center' });

    // Event Details
    doc.setFontSize(14);
    doc.setTextColor(71, 85, 105);
    doc.text(`for successfully attending and completing`, 148, 118, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    doc.text(`"${reg.event.title}"`, 148, 128, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(`Held on ${new Date(reg.event.startDate).toLocaleDateString()} at ${reg.event.venue?.name}`, 148, 138, { align: 'center' });

    // Signature Block
    doc.line(40, 170, 100, 170);
    doc.setFontSize(10);
    doc.text('Event Organizer Signature', 70, 176, { align: 'center' });

    doc.line(197, 170, 257, 170);
    doc.text('SIMATS Academic Dean', 227, 176, { align: 'center' });

    doc.save(`Certificate_${reg.event.title.replace(/\s+/g, '_')}.pdf`);
    showToast('Certificate downloaded successfully!', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
            My Event Passes & Certificates
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Access your active QR passes, check-in history, and downloadable certificates.
          </p>
        </div>
      </div>

      <EventReminderBanner />

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : registrations.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center">
          <QrCode className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Registrations Found</h3>
          <p className="text-sm text-slate-500 mt-1">Browse events in the Discover tab to register!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {registrations.map((reg) => (
            <div
              key={reg.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                      reg.checkedIn
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : reg.status === 'CONFIRMED'
                        ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                        : reg.status === 'WAITLIST'
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {reg.checkedIn ? 'Checked-In (Attended)' : reg.status}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    Reg: {new Date(reg.registeredAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="mt-3 font-extrabold text-lg text-slate-900 dark:text-slate-100">
                  {reg.event.title}
                </h3>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>{new Date(reg.event.startDate).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>{reg.event.venue?.name}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => setSelectedQR(reg)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center space-x-1.5 transition-colors"
                >
                  <QrCode className="w-4 h-4 text-indigo-500" />
                  <span>View QR Ticket</span>
                </button>

                {reg.checkedIn && (
                  <button
                    onClick={() => downloadCertificate(reg)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-500/20 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Certificate</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Ticket Modal */}
      {selectedQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">
              {selectedQR.event.title}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Ticket Code: {selectedQR.qrTicketCode}</p>

            <div className="my-6 p-4 bg-white rounded-2xl inline-block shadow-inner border border-slate-200">
              <QRCodeSVG value={selectedQR.qrTicketCode} size={180} />
            </div>

            <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-6">
              Attendee: {user.name} ({user.studentId || user.email})
            </div>

            <button
              onClick={() => setSelectedQR(null)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
            >
              Close Ticket
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
