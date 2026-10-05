import React, { useState, useEffect, useRef } from 'react';
import {
  ScanLine,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  QrCode,
  Search,
  Award,
  Lock,
  Key,
  ArrowRight,
  ShieldAlert,
  Download,
  Camera,
  CameraOff,
  SwitchCamera,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../components/Toast';

export default function QRScannerPage() {
  const { token, user } = useAuth();
  const socket = useSocket();
  const { showToast } = useToast();

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [currentEvent, setCurrentEvent] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Secure Code state per event
  const [unlockedCodes, setUnlockedCodes] = useState({});
  const [inputCode, setInputCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeError, setCodeError] = useState('');

  // Live Stats (loaded from database)
  const [stats, setStats] = useState({
    checkedInCount: 0,
    confirmedCount: 0,
    capacity: 0,
  });

  // Camera QR Scanner State
  const html5QrCodeRef = useRef(null);
  const isScanningRef = useRef(false);
  const lastScannedCodeRef = useRef('');
  const scanCooloffTimerRef = useRef(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'manual'

  // Manual Scan input
  const [ticketInput, setTicketInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastScannedResult, setLastScannedResult] = useState(null);

  const fetchEventsList = () => {
    fetch('/api/events')
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        setEvents(data);
        if (!selectedEventId && data.length > 0) {
          const liveOrActive = data.find((e) => e.status === 'LIVE') || data[0];
          setSelectedEventId(liveOrActive.id);
          fetchEventStats(liveOrActive.id);
        }
      })
      .catch((err) => console.error(err));
  };

  const fetchEventStats = async (eventId) => {
    if (!eventId) return;
    try {
      const res = await fetch(`/api/events/${eventId}`);
      const data = await res.json();
      setCurrentEvent(data);
      setStats({
        checkedInCount: data.stats?.checkedInCount || 0,
        confirmedCount: data.stats?.confirmedCount || 0,
        capacity: data.capacity || 100,
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEventsList();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('events:changed', fetchEventsList);
    return () => {
      socket.off('events:changed', fetchEventsList);
    };
  }, [socket]);

  useEffect(() => {
    if (selectedEventId) fetchEventStats(selectedEventId);
  }, [selectedEventId]);

  // WebSocket Live Updates listener
  useEffect(() => {
    if (!socket || !selectedEventId) return;

    socket.emit('join_event', selectedEventId);

    const handleCheckInUpdate = (data) => {
      setStats({
        checkedInCount: data.checkedInCount,
        confirmedCount: data.confirmedCount,
        capacity: data.capacity,
      });
      if (data.lastScannedUser) {
        showToast(`⚡ Live Check-in: ${data.lastScannedUser.name}!`, 'success');
      }
    };

    socket.on(`event:${selectedEventId}:checkin`, handleCheckInUpdate);

    return () => {
      socket.off(`event:${selectedEventId}:checkin`, handleCheckInUpdate);
    };
  }, [socket, selectedEventId]);

  // Clean up camera on unmount or tab switch
  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

  // When selected event changes, stop camera to avoid cross-event scans
  useEffect(() => {
    if (isCameraActive) {
      stopCameraScanner();
    }
  }, [selectedEventId]);

  const isUnlocked = user?.role === 'ADMIN' || Boolean(unlockedCodes[selectedEventId]);

  // Pleasant Web Audio Chime
  const playCheckInSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } catch (e) {
      // AudioContext not allowed or disabled
    }
  };

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
      if (!res.ok || !data.valid) {
        throw new Error(data.message || 'Invalid Event Secure Code');
      }
      showToast(`Scanner unlocked! Access granted.`, 'success');
      setUnlockedCodes((prev) => ({ ...prev, [selectedEventId]: inputCode.trim().toUpperCase() }));
      setInputCode('');
    } catch (err) {
      setCodeError(err.message);
      showToast(err.message, 'error');
    } finally {
      setVerifyingCode(false);
    }
  };

  // Perform backend check-in
  const executeCheckIn = async (codeToVerify) => {
    const trimmedCode = codeToVerify.trim();
    if (!trimmedCode) return;

    setScanning(true);
    setLastScannedResult(null);

    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };
      if (unlockedCodes[selectedEventId]) {
        headers['x-event-access-code'] = unlockedCodes[selectedEventId];
      }

      const res = await fetch('/api/registrations/check-in', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          qrTicketCode: trimmedCode,
          eventId: selectedEventId,
          accessCode: unlockedCodes[selectedEventId],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.locked) {
          setUnlockedCodes((prev) => {
            const next = { ...prev };
            delete next[selectedEventId];
            return next;
          });
        }
        setLastScannedResult({ success: false, message: data.message });
        showToast(data.message, 'error');
      } else {
        playCheckInSound();
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

        setLastScannedResult({
          success: true,
          message: data.message,
          user: data.registration?.user,
          timestamp: new Date().toLocaleTimeString(),
        });
        showToast(data.message, 'success');
        setTicketInput('');
        fetchEventStats(selectedEventId);
      }
    } catch (err) {
      showToast('Scan verification failed', 'error');
    } finally {
      setScanning(false);
    }
  };

  // Parse raw QR code string (handles plain text, URLs, JSON ticket objects)
  const extractTicketCode = (raw) => {
    if (!raw) return '';
    const clean = raw.trim();
    if (clean.startsWith('{') && clean.endsWith('}')) {
      try {
        const obj = JSON.parse(clean);
        return obj.qrTicketCode || obj.ticketCode || obj.code || clean;
      } catch (e) {
        return clean;
      }
    }
    // If URL with ticket query param
    if (clean.includes('ticket=')) {
      try {
        const url = new URL(clean);
        return url.searchParams.get('ticket') || clean;
      } catch (e) {
        return clean;
      }
    }
    return clean;
  };

  // Camera Scanner: Start Camera
  const startCameraScanner = async () => {
    setCameraError('');
    setCameraStarting(true);

    try {
      // Query cameras
      let cameras = [];
      try {
        cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          setAvailableCameras(cameras);
          if (!selectedCameraId) {
            // Prefer back/environment camera if available
            const backCam = cameras.find(
              (c) =>
                c.label.toLowerCase().includes('back') ||
                c.label.toLowerCase().includes('rear') ||
                c.label.toLowerCase().includes('environment')
            );
            setSelectedCameraId(backCam ? backCam.id : cameras[0].id);
          }
        }
      } catch (err) {
        console.warn('Could not enumerate cameras beforehand:', err);
      }

      // Initialize scanner instance on viewport element
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-camera-viewport');
      }

      const cameraConfig = selectedCameraId
        ? selectedCameraId
        : { facingMode: 'environment' };

      await html5QrCodeRef.current.start(
        cameraConfig,
        {
          fps: 12,
          qrbox: (viewWidth, viewHeight) => {
            const min = Math.min(viewWidth, viewHeight);
            const edge = Math.floor(min * 0.72);
            return { width: edge, height: edge };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          const parsedCode = extractTicketCode(decodedText);
          // Prevent multiple trigger on same scan within 3 seconds
          if (isScanningRef.current || parsedCode === lastScannedCodeRef.current) {
            return;
          }
          isScanningRef.current = true;
          lastScannedCodeRef.current = parsedCode;

          executeCheckIn(parsedCode);

          if (scanCooloffTimerRef.current) clearTimeout(scanCooloffTimerRef.current);
          scanCooloffTimerRef.current = setTimeout(() => {
            isScanningRef.current = false;
            lastScannedCodeRef.current = '';
          }, 3000);
        },
        () => {
          // Frame without QR - ignore
        }
      );

      setIsCameraActive(true);
      showToast('Camera active! Point at attendee QR pass.', 'info');
    } catch (err) {
      console.error('Failed to start camera:', err);
      let errMsg = 'Failed to access camera. Please allow camera permissions.';
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
        errMsg = 'Camera permission was denied. Please allow camera access in browser settings.';
      } else if (err.name === 'NotFoundError' || err.message?.includes('No camera')) {
        errMsg = 'No video camera device detected on this system.';
      }
      setCameraError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setCameraStarting(false);
    }
  };

  // Camera Scanner: Stop Camera
  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch (err) {
        console.warn('Error stopping camera scanner:', err);
      }
    }
    setIsCameraActive(false);
    isScanningRef.current = false;
    lastScannedCodeRef.current = '';
  };

  // Camera Switch
  const handleSwitchCamera = async (newCameraId) => {
    setSelectedCameraId(newCameraId);
    if (isCameraActive) {
      await stopCameraScanner();
      setTimeout(() => {
        startCameraScanner();
      }, 300);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!ticketInput.trim() || scanning) return;
    executeCheckIn(ticketInput.trim());
  };

  const handleExportAttendanceCSV = async () => {
    if (!selectedEventId) return;
    setExporting(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (unlockedCodes[selectedEventId]) {
        headers['x-event-access-code'] = unlockedCodes[selectedEventId];
      }

      const res = await fetch(`/api/registrations/event/${selectedEventId}`, { headers });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        throw new Error(data.message || 'Failed to fetch attendance list');
      }

      if (data.length === 0) {
        showToast('No attendees registered for this event yet.', 'info');
        return;
      }

      const headersRow = [
        'Ticket Code',
        'Student Name',
        'Email',
        'Student ID',
        'Department',
        'Registration Status',
        'Checked In',
        'Check-In Timestamp',
        'Points Awarded',
      ];
      const rows = data.map((reg) => [
        `"${reg.qrTicketCode || ''}"`,
        `"${(reg.user?.name || '').replace(/"/g, '""')}"`,
        `"${reg.user?.email || ''}"`,
        `"${reg.user?.studentId || ''}"`,
        `"${(reg.user?.department || '').replace(/"/g, '""')}"`,
        `"${reg.status}"`,
        reg.checkedIn ? 'Yes' : 'No',
        reg.checkedInAt ? `"${new Date(reg.checkedInAt).toLocaleString()}"` : 'N/A',
        reg.event?.pointsValue || 10,
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headersRow.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      const eventName = currentEvent?.title || 'Event';
      link.setAttribute(
        'download',
        `Attendance_${eventName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date()
          .toISOString()
          .slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`Exported ${data.length} attendee attendance records to CSV!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  const percentage = Math.min(
    100,
    Math.round((stats.checkedInCount / (stats.confirmedCount || 1)) * 100)
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <span>Live Camera QR Scanner</span>
            <ScanLine className="w-6 h-6 text-emerald-500 animate-pulse" />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Scan attendee ticket passes in real-time with device camera or handheld barcode scanner.
          </p>
        </div>

        {/* Actions & Event Selector */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="w-full sm:w-64">
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:outline-none"
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.status})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportAttendanceCSV}
            disabled={exporting || (user?.role !== 'ADMIN' && !unlockedCodes[selectedEventId])}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-md flex items-center justify-center space-x-1.5 shrink-0 transition-all disabled:opacity-50"
            title="Download full attendee list and check-in attendance as CSV"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>{exporting ? 'Exporting...' : 'Export Attendance (CSV)'}</span>
          </button>
        </div>
      </div>

      {/* Hero Live Counter Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Real-Time Gate Attendance Counter</span>
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mt-2">
              <span className="text-emerald-400">{stats.checkedInCount}</span>
              <span className="text-slate-400 font-normal"> of </span>
              <span>{stats.confirmedCount}</span>
              <span className="text-sm sm:text-base text-slate-400 font-normal"> checked in</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Event Capacity: {stats.capacity} • {percentage}% Total Attendance Rate
            </p>
          </div>

          {/* Animated Gauge Progress Circle */}
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-8 border-slate-800 border-t-emerald-400 flex flex-col items-center justify-center shrink-0">
            <span className="text-2xl font-black text-emerald-400">{percentage}%</span>
            <span className="text-[10px] uppercase font-bold text-slate-400">Checked In</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 w-full h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {!isUnlocked ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-12 text-center max-w-xl mx-auto shadow-sm">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 ring-8 ring-amber-500/5">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            Live Ticket Scanner Locked
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Live attendee check-in for{' '}
            <strong className="text-slate-700 dark:text-slate-200">
              {currentEvent?.title || 'Selected Event'}
            </strong>{' '}
            is protected. Please enter this event's unique Secure Access Code to activate check-in
            scanning.
          </p>

          <form onSubmit={handleVerifyCode} className="mt-6 space-y-4">
            <div className="relative max-w-sm mx-auto">
              <Key className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
              <input
                type="text"
                value={inputCode}
                onChange={(e) => {
                  setInputCode(e.target.value.toUpperCase());
                  setCodeError('');
                }}
                placeholder="Enter Code (e.g. SEC-123456)"
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-center tracking-widest text-base font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase"
              />
            </div>

            {codeError && (
              <p className="text-xs font-bold text-rose-500 flex items-center justify-center space-x-1">
                <ShieldAlert className="w-4 h-4" />
                <span>{codeError}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={!inputCode.trim() || verifyingCode}
              className="w-full max-w-sm mx-auto py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <span>{verifyingCode ? 'Verifying Code...' : 'Unlock Live Scanner'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Live Camera Scanner / Manual Input */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div>
              {/* Header with Mode Switching Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                      Live QR Scanner
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Automatic camera detection & check-in
                    </p>
                  </div>
                </div>

                {/* Mode Selector & Audio Toggle */}
                <div className="flex items-center space-x-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`p-2 rounded-xl border text-xs font-bold transition-colors ${
                      soundEnabled
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        : 'bg-rose-50 text-rose-500 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900'
                    }`}
                    title={soundEnabled ? 'Mute Check-In Chime' : 'Unmute Check-In Chime'}
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>

                  <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setActiveTab('camera')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeTab === 'camera'
                          ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Camera
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('manual');
                        if (isCameraActive) stopCameraScanner();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeTab === 'manual'
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Manual / USB
                    </button>
                  </div>
                </div>
              </div>

              {/* Camera Tab View */}
              {activeTab === 'camera' && (
                <div className="mt-4 space-y-4">
                  {/* Camera Controls Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {availableCameras.length > 1 && (
                      <div className="flex items-center space-x-2">
                        <SwitchCamera className="w-4 h-4 text-slate-400" />
                        <select
                          value={selectedCameraId}
                          onChange={(e) => handleSwitchCamera(e.target.value)}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold max-w-[200px] truncate"
                        >
                          {availableCameras.map((cam, idx) => (
                            <option key={cam.id} value={cam.id}>
                              {cam.label || `Camera ${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {!isCameraActive ? (
                      <button
                        onClick={startCameraScanner}
                        disabled={cameraStarting}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all"
                      >
                        <Camera className="w-4 h-4" />
                        <span>{cameraStarting ? 'Accessing Camera...' : 'Start Camera Scanner'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={stopCameraScanner}
                        className="w-full sm:w-auto px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-500/25 flex items-center justify-center space-x-2 transition-all"
                      >
                        <CameraOff className="w-4 h-4" />
                        <span>Stop Camera</span>
                      </button>
                    )}
                  </div>

                  {/* Camera Viewport Container */}
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 min-h-[280px] sm:min-h-[320px] flex items-center justify-center shadow-inner">
                    <div id="qr-camera-viewport" className="w-full h-full overflow-hidden" />

                    {!isCameraActive && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-950/90 z-10">
                        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3">
                          <Camera className="w-8 h-8 text-slate-500" />
                        </div>
                        <h4 className="font-bold text-slate-200 text-sm">Camera Offline</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs">
                          Click "Start Camera Scanner" to enable video scanner for live gate check-in.
                        </p>
                        <button
                          onClick={startCameraScanner}
                          disabled={cameraStarting}
                          className="mt-4 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md flex items-center space-x-1.5 transition-all"
                        >
                          <Zap className="w-4 h-4" />
                          <span>Turn On Camera</span>
                        </button>
                      </div>
                    )}

                    {isCameraActive && (
                      <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full bg-emerald-500/90 text-white text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5 backdrop-blur-sm shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        <span>Live Camera Scanning</span>
                      </div>
                    )}
                  </div>

                  {cameraError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span>{cameraError}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Manual / USB Scanner Tab */}
              {activeTab === 'manual' && (
                <div className="mt-4 space-y-4">
                  <p className="text-xs text-slate-500">
                    Type or paste attendee ticket code, or use an external USB barcode gun.
                  </p>

                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div className="relative">
                      <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={ticketInput}
                        onChange={(e) => setTicketInput(e.target.value)}
                        placeholder="Paste or scan EF-XXXX-XXXX-XXXX..."
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!ticketInput.trim() || scanning}
                      className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                    >
                      {scanning ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Verifying Ticket Code...</span>
                        </>
                      ) : (
                        <>
                          <ScanLine className="w-4 h-4" />
                          <span>Verify Ticket & Check-In</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Automatic attendance sync</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                WebSocket Connected
              </span>
            </div>
          </div>

          {/* Right Column: Scan Verification Result Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 mb-4 flex items-center space-x-2">
                <span>Latest Scan Verification Result</span>
                {lastScannedResult?.success && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                )}
              </h3>

              {!lastScannedResult ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center mb-3">
                    <ScanLine className="w-8 h-8 opacity-60 text-slate-500" />
                  </div>
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                    Ready to Scan
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Hold attendee's mobile ticket pass in front of camera or enter code manually.
                  </p>
                </div>
              ) : lastScannedResult.success ? (
                <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-transparent dark:from-emerald-950/70 dark:via-slate-900 dark:to-slate-900 border border-emerald-300 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-100 space-y-4 shadow-sm animate-in fade-in">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-600/30">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-200/70 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full">
                        CHECK-IN SUCCESSFUL
                      </span>
                      <h4 className="font-extrabold text-xl leading-tight text-slate-900 dark:text-white mt-0.5">
                        {lastScannedResult.message}
                      </h4>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Gate Verified at {lastScannedResult.timestamp}
                      </span>
                    </div>
                  </div>

                  {lastScannedResult.user && (
                    <div className="pt-4 border-t border-emerald-200/80 dark:border-emerald-800/60 flex items-center space-x-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-base flex items-center justify-center shrink-0 shadow-md ring-4 ring-emerald-500/20">
                        {lastScannedResult.user.name
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('')
                          .substring(0, 2)
                          .toUpperCase() || 'U'}
                      </div>
                      <div className="overflow-hidden">
                        <h5 className="font-black text-base text-slate-900 dark:text-white truncate">
                          {lastScannedResult.user.name}
                        </h5>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                          {lastScannedResult.user.department || 'Student'} • ID:{' '}
                          <span className="font-mono font-bold">
                            {lastScannedResult.user.studentId || 'N/A'}
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {lastScannedResult.user.email}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-bold">
                    <span className="flex items-center space-x-1">
                      <Award className="w-4 h-4 text-emerald-600" />
                      <span>Reward Points Awarded!</span>
                    </span>
                    <span>Status: CONFIRMED</span>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-900/80 text-rose-900 dark:text-rose-100 flex items-start space-x-3.5 animate-in fade-in">
                  <AlertCircle className="w-9 h-9 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-lg text-rose-800 dark:text-rose-200">
                      Check-In Denied
                    </h4>
                    <p className="text-sm font-semibold mt-1">{lastScannedResult.message}</p>
                    <p className="text-xs opacity-75 mt-1">
                      Ticket may already be checked in, cancelled, or registered for another event.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Tips */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
              💡 Tip: In low-light environments, increase the student device brightness for optimal QR
              camera reading.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
