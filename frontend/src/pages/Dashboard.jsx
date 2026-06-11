import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  Users, Calendar, Clock, FolderKanban,
  CheckSquare, UsersRound, TrendingUp, Activity,
  ArrowUpRight,
} from 'lucide-react';
import api from '../utils/api';
import { toast } from 'sonner';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total_users: 0,
    total_projects: 0,
    pending_leaves: 0,
    pending_wfh: 0,
    today_attendance: 0,
  });
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const hasStatsAccess = ['super_admin', 'hr', 'project_manager'].includes(user?.role);
        
        let statsData = {
          total_users: 0,
          total_projects: 0,
          pending_leaves: 0,
          pending_wfh: 0,
          today_attendance: 0,
        };

        if (hasStatsAccess) {
          try {
            const res = await api.get('/analytics/dashboard');
            statsData = res.data;
          } catch (err) {
            console.error('Stats fetch failed:', err);
          }
        }

        let leaves = [];
        let wfhs = [];
        try {
          const leaveRes = await api.get('/requests/leave');
          leaves = leaveRes.data.map(l => ({ ...l, reqType: 'Leave', displayType: `${l.type} Leave` }));
        } catch (err) {
          console.error('Leaves fetch failed:', err);
        }
        try {
          const wfhRes = await api.get('/requests/wfh');
          wfhs = wfhRes.data.map(w => ({ ...w, reqType: 'WFH', displayType: 'WFH' }));
        } catch (err) {
          console.error('WFH fetch failed:', err);
        }

        const combined = [...leaves, ...wfhs]
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
          .slice(0, 5);

        setStats(statsData);
        setRecentRequests(combined);
      } catch (error) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const hasStatsAccess = ['super_admin', 'hr', 'project_manager'].includes(user?.role);

  const STATS_CARDS = [
    { label: 'Total Employees', value: stats.total_users, change: 'Active staff', icon: Users, color: '#0020F5', bg: 'bg-blue-50' },
    { label: 'Pending Leaves', value: stats.pending_leaves, change: 'Requires review', icon: Calendar, color: '#FF2B18', bg: 'bg-red-50' },
    { label: 'Present Today', value: stats.today_attendance, change: 'Daily attendance', icon: Clock, color: '#00B84A', bg: 'bg-green-50' },
    { label: 'Active Projects', value: stats.total_projects, change: 'ERP projects', icon: FolderKanban, color: '#F59E0B', bg: 'bg-amber-50' },
  ];

  const QUICK_LINKS = [
    { label: 'Employees', href: '/employees', icon: Users, desc: 'Manage team members', roles: ['super_admin', 'hr', 'project_manager'] },
    { label: 'Projects', href: '/projects', icon: FolderKanban, desc: 'Track projects', roles: ['super_admin', 'project_manager', 'team_lead', 'employee'] },
    { label: 'Tasks', href: '/tasks', icon: CheckSquare, desc: 'Assign & monitor tasks', roles: ['super_admin', 'project_manager', 'team_lead', 'employee'] },
    { label: 'Teams', href: '/teams', icon: UsersRound, desc: 'Team structure', roles: ['super_admin', 'hr', 'project_manager'] },
  ].filter(link => link.roles.includes(user?.role));

  return (
    <div className="space-y-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Welcome banner */}
      <div className="bg-[#0020F5] rounded-sm p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-sm mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h2 className="text-2xl font-semibold" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              {greeting}, {user?.name?.split(' ')[0]} 👋
            </h2>
            <p className="text-blue-200 text-sm mt-1">
              Role: <span className="text-white font-medium uppercase" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{user?.role?.replace(/_/g, ' ')}</span>
            </p>
          </div>
          <Activity size={48} className="text-white opacity-20 hidden sm:block" />
        </div>
      </div>

      {/* Stats grid */}
      {hasStatsAccess && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS_CARDS.map((stat) => (
            <div key={stat.label} className="bg-white border border-[#E5E7EB] rounded-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 ${stat.bg} rounded-sm flex items-center justify-center`}>
                  <stat.icon size={18} style={{ color: stat.color }} strokeWidth={1.5} />
                </div>
                <TrendingUp size={14} className="text-gray-300" />
              </div>
              <p className="text-2xl font-semibold text-[#111111]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                {stat.value}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
              <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{stat.change}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Requests */}
        <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-sm">
          <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#111111]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              Recent Requests
            </h3>
            <Link to="/requests" className="text-xs text-[#0020F5] hover:underline flex items-center">
              View all <ArrowUpRight size={12} className="ml-1" />
            </Link>
          </div>
          <div className="divide-y divide-[#E5E7EB]">
            {loading ? (
              <div className="py-6 text-center text-sm text-gray-400">Loading requests...</div>
            ) : recentRequests.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400">No requests found</div>
            ) : (
              recentRequests.map((req, i) => (
                <div key={i} className="px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-gray-600">{(req.user_name || 'U').charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#111111]">{req.user_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">
                        {req.displayType} · <span style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{req.start_date}</span>
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-sm font-medium uppercase ${statusColors[req.status] || 'bg-gray-100'}`}>
                    {req.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white border border-[#E5E7EB] rounded-sm">
          <div className="px-6 py-4 border-b border-[#E5E7EB]">
            <h3 className="text-sm font-semibold text-[#111111]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              Quick Access
            </h3>
          </div>
          <div className="p-3 space-y-1">
            {QUICK_LINKS.length === 0 ? (
              <div className="p-3 text-center text-xs text-gray-400">No links available</div>
            ) : (
              QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="flex items-center space-x-3 px-3 py-3 rounded-sm hover:bg-gray-50 transition-colors group"
                >
                  <div className="w-8 h-8 bg-blue-50 rounded-sm flex items-center justify-center flex-shrink-0 group-hover:bg-[#0020F5] transition-colors">
                    <link.icon size={16} className="text-[#0020F5] group-hover:text-white transition-colors" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#111111]">{link.label}</p>
                    <p className="text-xs text-gray-400">{link.desc}</p>
                  </div>
                  <ArrowUpRight size={14} className="ml-auto text-gray-300 group-hover:text-[#0020F5]" />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;