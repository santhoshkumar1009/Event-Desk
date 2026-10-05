import React, { useState, useEffect } from 'react';
import { Users, Search, UserPlus, CheckCircle2, Mail, Sparkles, Building, Filter, Edit3, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

export default function TeamFormation() {
  const { token, user } = useAuth();
  const { showToast } = useToast();

  const [teammates, setTeammates] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // Edit My Profile Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [skills, setSkills] = useState('');
  const [roleLooking, setRoleLooking] = useState('');
  const [bio, setBio] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const fetchTeammates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (departmentFilter !== 'ALL') params.append('department', departmentFilter);

      const [teamRes, profileRes] = await Promise.all([
        fetch(`/api/teams/available?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/teams/my-profile', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const teamData = await teamRes.json();
      const profileData = await profileRes.json();

      setTeammates(Array.isArray(teamData) ? teamData : []);
      setMyProfile(profileData);

      if (profileData) {
        setSkills(profileData.skills || '');
        setRoleLooking(profileData.roleLooking || '');
        setBio(profileData.bio || '');
        setLookingFor(profileData.lookingFor || '');
      }
    } catch (err) {
      showToast('Failed to load teammates', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeammates();
  }, [token, departmentFilter, search]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!skills.trim() || !roleLooking.trim()) {
      showToast('Please provide your skills and role', 'error');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch('/api/teams/my-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          skills: skills.trim(),
          roleLooking: roleLooking.trim(),
          bio: bio.trim(),
          lookingFor: lookingFor.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');

      showToast('Teammate profile updated successfully!', 'success');
      setMyProfile(data);
      setIsModalOpen(false);
      fetchTeammates();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      const res = await fetch('/api/teams/toggle-status', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Toggle failed');

      setMyProfile(data);
      showToast(`Status updated to: ${data.status === 'LOOKING' ? 'Looking for Team' : 'Teamed Up'}`, 'success');
      fetchTeammates();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <span>Team Formation Hub</span>
            <Users className="w-6 h-6 text-indigo-500" />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Find teammates for campus hackathons and projects, or list your profile so teams can scout you.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 flex items-center space-x-2 transition-all shrink-0"
        >
          <Edit3 className="w-4 h-4" />
          <span>{myProfile ? 'Edit My Profile' : 'List as Available Teammate'}</span>
        </button>
      </div>

      {/* My Teammate Card Banner */}
      {myProfile && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-slate-800/80 dark:to-slate-900/80 border border-indigo-200/60 dark:border-indigo-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-base flex items-center justify-center shadow-md shrink-0">
              {user?.name?.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'ME'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">{user?.name} (You)</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  myProfile.status === 'LOOKING'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                }`}>
                  {myProfile.status === 'LOOKING' ? '🟢 Looking for Team' : '⚪ Teamed Up'}
                </span>
              </div>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 font-bold mt-0.5">
                Role: {myProfile.roleLooking} • {user?.department}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {myProfile.skills.split(',').map((skill, idx) => (
                  <span key={idx} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                    {skill.trim()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleToggleStatus}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 ${
              myProfile.status === 'LOOKING'
                ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {myProfile.status === 'LOOKING' ? 'Mark as Teamed Up' : 'Set to Looking for Team'}
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="glass-panel rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by skill (e.g. React, Python, UI/UX)..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none"
          />
        </div>

        <div className="w-full md:w-auto flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full md:w-64 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            <option value="Computer Science & Engineering">Computer Science & Engineering</option>
            <option value="Electronics & Communication">Electronics & Communication</option>
            <option value="Mechanical Engineering">Mechanical Engineering</option>
          </select>
        </div>
      </div>

      {/* Available Teammates Grid */}
      {loading ? (
        <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      ) : teammates.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-60" />
          <h3 className="font-extrabold text-slate-700 dark:text-slate-300 text-base">No Teammates Found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your skill search keywords or department filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teammates.map((mate) => {
            const isMe = mate.userId === user?.id;
            return (
              <div
                key={mate.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-indigo-500/50 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                        {mate.user?.name?.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'ST'}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 dark:text-slate-100 text-sm">
                          {mate.user?.name} {isMe && '(You)'}
                        </h4>
                        <span className="text-[11px] font-bold text-slate-400 block">
                          {mate.user?.department}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Role Seeking */}
                  <div className="mt-4">
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Specializing In:</span>
                    <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {mate.roleLooking}
                    </p>
                  </div>

                  {/* Skills Pills */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {mate.skills.split(',').map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        {skill.trim()}
                      </span>
                    ))}
                  </div>

                  {mate.bio && (
                    <p className="text-xs text-slate-500 mt-3 line-clamp-2 italic">
                      "{mate.bio}"
                    </p>
                  )}

                  {mate.lookingFor && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-400">
                      <strong>Looking for:</strong> {mate.lookingFor}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <a
                    href={`mailto:${mate.user?.email}?subject=Interested in Teaming Up for EventFlow Hackathon`}
                    className="w-full py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex items-center justify-center space-x-2 transition-all shadow-sm"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Connect & Invite</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Profile Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">
                {myProfile ? 'Update Teammate Profile' : 'List as Available Teammate'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Your Primary Role *</label>
                <input
                  type="text"
                  required
                  value={roleLooking}
                  onChange={(e) => setRoleLooking(e.target.value)}
                  placeholder="e.g. Full Stack Developer, AI Specialist, UI Designer"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Skills (comma-separated) *</label>
                <input
                  type="text"
                  required
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. React, Node.js, Python, Tailwind, Figma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Bio / Past Experience</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. 3rd year CSE student, built 3 fullstack web apps, won 2025 college hackathon"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">What kind of team are you looking for?</label>
                <input
                  type="text"
                  value={lookingFor}
                  onChange={(e) => setLookingFor(e.target.value)}
                  placeholder="e.g. Looking for a backend dev & UI designer for AI Hackathon"
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
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
