import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Calendar,
  Compass,
  QrCode,
  Trophy,
  PlusCircle,
  Clock,
  Users,
  Megaphone,
  UserCheck,
  CheckSquare,
  DollarSign,
  ScanLine,
  BarChart3,
  Shield,
  Settings,
  LogOut,
  Sparkles,
  LayoutDashboard,
  UploadCloud,
  Package,
  Star,
  LifeBuoy,
  FileText,
  IndianRupee,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import EventDeskLogo from './EventDeskLogo';

export default function Sidebar({ isOpen, setIsOpen }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const role = user.role;

  const studentLinks = [
    { name: 'Discover Events', path: '/discover', icon: Compass },
    { name: 'My Tickets & Pass', path: '/my-registrations', icon: QrCode },
    { name: 'Team Formation', path: '/team-formation', icon: Users },
    { name: 'Project Submissions', path: '/submissions', icon: UploadCloud },
    { name: 'Lost Items Desk', path: '/lost-items', icon: Package },
    { name: 'Event Feedback', path: '/feedback', icon: Star },
    { name: 'Help & Support', path: '/support', icon: LifeBuoy },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
  ];

  const organizerLinks = [
    { name: 'Overview', path: '/organizer', icon: LayoutDashboard },
    { name: 'Events Manager', path: '/organizer/events', icon: Calendar },
    { name: 'Schedule & Conflicts', path: '/organizer/schedule', icon: Clock },
    { name: 'Registrations', path: '/organizer/registrations', icon: Users },
    { name: 'Live QR Scanner', path: '/organizer/scanner', icon: ScanLine, highlight: true },
    { name: 'Submissions Review', path: '/organizer/submissions', icon: FileText },
    { name: 'Lost Items Desk', path: '/organizer/lost-items', icon: Package },
    { name: 'Announcements', path: '/organizer/announcements', icon: Megaphone },
    { name: 'Volunteers', path: '/organizer/volunteers', icon: UserCheck },
    { name: 'Kanban Tasks', path: '/organizer/tasks', icon: CheckSquare },
    { name: 'Budget Tracker', path: '/organizer/budget', icon: IndianRupee },
  ];

  const adminLinks = [
    { name: 'Analytics & Insights', path: '/admin', icon: BarChart3 },
    { name: 'Budget Reviews', path: '/admin/budget-reviews', icon: IndianRupee },
    { name: 'User Management', path: '/admin/users', icon: Shield },
    { name: 'Venues & Settings', path: '/admin/settings', icon: Settings },
  ];

  const getLinks = () => {
    switch (role) {
      case 'ORGANIZER':
        return organizerLinks;
      case 'ADMIN':
        return [...adminLinks, ...organizerLinks.slice(1, 7)];
      default:
        return studentLinks;
    }
  };

  const navLinks = getLinks();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-200 dark:border-slate-800">
          <EventDeskLogo size="md" />
        </div>

        {/* User Info Badge */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-sm ring-2 ring-blue-500/20">
            {user.name?.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-semibold truncate text-slate-800 dark:text-slate-100">
              {user.name}
            </h4>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  role === 'ADMIN'
                    ? 'bg-rose-500'
                    : role === 'ORGANIZER'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
              />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 capitalize">
                {role.toLowerCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-3 pb-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Main Menu
          </div>

          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;

            return (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : link.highlight
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : ''}`} />
                <span>{link.name}</span>
                {link.highlight && (
                  <span className="ml-auto text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500 text-white animate-pulse">
                    Live
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Logout Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
