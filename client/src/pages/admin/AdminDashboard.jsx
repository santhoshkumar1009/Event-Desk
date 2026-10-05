import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, PieChart as PieIcon, FileText, Download, Users, Calendar, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../components/Toast';

export default function AdminDashboard() {
  const { token } = useAuth();
  const socket = useSocket();
  const { showToast } = useToast();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await fetch('/api/admin/analytics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      if (!isBackground) showToast('Failed to load analytics', 'error');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Listen to real-time events from Organizers & Students
  useEffect(() => {
    if (!socket) return;

    const handleDataChanged = () => {
      fetchAnalytics(true);
    };

    socket.on('event:created', handleDataChanged);
    socket.on('event:updated', handleDataChanged);
    socket.on('event:deleted', handleDataChanged);
    socket.on('events:changed', handleDataChanged);
    socket.on('registration:created', handleDataChanged);
    socket.on('registration:checkin', handleDataChanged);
    socket.on('stats:updated', handleDataChanged);

    return () => {
      socket.off('event:created', handleDataChanged);
      socket.off('event:updated', handleDataChanged);
      socket.off('event:deleted', handleDataChanged);
      socket.off('events:changed', handleDataChanged);
      socket.off('registration:created', handleDataChanged);
      socket.off('registration:checkin', handleDataChanged);
      socket.off('stats:updated', handleDataChanged);
    };
  }, [socket]);

  // One-Click Post-Event PDF Report Generator
  const generatePDFReport = () => {
    if (!analytics) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Header styling
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, 210, 35, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('SIMATS EVENTFLOW COMPREHENSIVE REPORT', 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleString()} | System Governance Log`, 14, 28);

    // Summary Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('1. Executive Analytics Summary', 14, 48);

    const summaryData = [
      ['Total Campus Events', analytics.summary?.totalEvents || 0],
      ['Live Events Active', analytics.summary?.liveEvents || 0],
      ['Total Student Registrations', analytics.summary?.totalRegistrations || 0],
      ['Total Scanned Attendance', analytics.summary?.totalCheckedIn || 0],
      ['Overall Capacity Fill Rate', `${analytics.summary?.overallFillRate || 0}%`],
      ['No-Show Rate', `${analytics.summary?.noShowRate || 0}%`],
    ];

    autoTable(doc, {
      startY: 52,
      head: [['Metric Description', 'Quantitative Value']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillStyle: 'F', fillColor: [37, 99, 235] },
    });

    // Department Distribution Table
    const lastY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Department-Wise Registration Distribution', 14, lastY);

    const deptRows = analytics.charts?.departmentSplit?.map((d) => [d.department, d.count]) || [];

    autoTable(doc, {
      startY: lastY + 4,
      head: [['Department Name', 'Confirmed Student Registrations']],
      body: deptRows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`EventFlow_PostEvent_Report_${Date.now()}.pdf`);
    showToast('Post-Event PDF Report Generated!', 'success');
  };

  const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <span>Admin Analytics & Governance</span>
            <BarChart3 className="w-6 h-6 text-purple-600" />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            System-wide capacity fill rates, no-show metrics, department distributions, and PDF reporting.
          </p>
        </div>

        <button
          onClick={generatePDFReport}
          disabled={!analytics}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 flex items-center space-x-2 transition-all disabled:opacity-50 shrink-0"
        >
          <FileText className="w-4 h-4" />
          <span>One-Click PDF Post-Event Report</span>
        </button>
      </div>

      {loading ? (
        <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      ) : (
        <>
          {/* Executive Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Events</span>
              <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">
                {analytics.summary?.totalEvents}
              </h2>
              <span className="text-[11px] text-emerald-500 font-bold">
                {analytics.summary?.liveEvents || 0} live now • {analytics.summary?.totalEvents || 0} total in DB
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Fill Rate</span>
              <h2 className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-2">
                {analytics.summary?.overallFillRate}%
              </h2>
              <span className="text-[11px] text-blue-500 font-bold">Capacity utilization</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Registrations</span>
              <h2 className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-2">
                {analytics.summary?.totalRegistrations}
              </h2>
              <span className="text-[11px] text-slate-400 font-medium">Students enrolled</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">No-Show Rate</span>
              <h2 className="text-3xl font-black text-amber-500 mt-2">
                {analytics.summary?.noShowRate}%
              </h2>
              <span className="text-[11px] text-slate-400 font-medium">Absence ratio</span>
            </div>
          </div>

          {/* Recharts Graphical Dashboards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Event Fill Rate Bar Chart */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 mb-4">
                Event Fill Rate vs Capacity
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.charts?.eventFillRate}>
                    <XAxis dataKey="title" stroke="#888888" fontSize={10} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff' }} />
                    <Bar dataKey="confirmed" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Confirmed" />
                    <Bar dataKey="capacity" fill="#e2e8f0" radius={[6, 6, 0, 0]} name="Capacity" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Department Split Pie Chart */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 mb-4">
                Department-wise Registration Split
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.charts?.departmentSplit}
                      dataKey="count"
                      nameKey="department"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label
                    >
                      {analytics.charts?.departmentSplit?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
