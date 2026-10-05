import React, { useState, useEffect } from 'react';
import { Trophy, Award, Medal, Building2, User, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../components/Toast';

export default function Leaderboard() {
  const { token } = useAuth();
  const socket = useSocket();
  const { showToast } = useToast();
  const [studentRankings, setStudentRankings] = useState([]);
  const [deptRankings, setDeptRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('STUDENT'); // STUDENT | DEPARTMENT

  const fetchLeaderboard = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await fetch('/api/users/leaderboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStudentRankings(data.studentRankings || []);
      setDeptRankings(data.departmentRankings || []);
    } catch (err) {
      if (!isBackground) showToast('Failed to load leaderboard', 'error');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handlePointsUpdate = () => {
      fetchLeaderboard(true);
    };

    socket.on('points:awarded', handlePointsUpdate);
    socket.on('registration:checkin', handlePointsUpdate);

    return () => {
      socket.off('points:awarded', handlePointsUpdate);
      socket.off('registration:checkin', handlePointsUpdate);
    };
  }, [socket]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <span>Campus Leaderboard</span>
            <Trophy className="w-6 h-6 text-amber-500" />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Top students and departments ranked by event participation points.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl self-start">
          <button
            onClick={() => setActiveTab('STUDENT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'STUDENT'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Student Leaderboard
          </button>
          <button
            onClick={() => setActiveTab('DEPARTMENT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'DEPARTMENT'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Department Standings
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      ) : activeTab === 'STUDENT' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {studentRankings.map((item) => {
              const isTop3 = item.rank <= 3;
              return (
                <div
                  key={item.rank}
                  className={`p-4 sm:px-6 flex items-center justify-between transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                    item.rank === 1 ? 'bg-amber-500/5 dark:bg-amber-500/10' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    {/* Rank Medal */}
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center font-extrabold text-sm ${
                        item.rank === 1
                          ? 'bg-amber-400 text-slate-900 shadow-md shadow-amber-400/30'
                          : item.rank === 2
                          ? 'bg-slate-300 text-slate-800 shadow-md'
                          : item.rank === 3
                          ? 'bg-amber-700 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : item.rank}
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-sm ring-2 ring-indigo-500/20">
                      {item.user?.name?.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'ST'}
                    </div>

                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                        {item.user?.name || 'Student'}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {item.user?.department} • {item.user?.studentId}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                      {item.totalPoints} pts
                    </span>
                    <span className="block text-[10px] font-medium text-slate-400">
                      {item.eventsAttended} events attended
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Department Standings */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {deptRankings.map((dept) => (
            <div
              key={dept.department}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center font-black">
                    #{dept.rank}
                  </div>
                  <span className="text-xs font-bold text-slate-400">
                    {dept.eventsAttended} total attendances
                  </span>
                </div>

                <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">
                  {dept.department}
                </h3>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Total Points</span>
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {dept.totalPoints}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
