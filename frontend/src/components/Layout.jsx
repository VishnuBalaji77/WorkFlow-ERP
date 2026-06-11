import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Users, Calendar, Clock, FolderKanban,
  CheckSquare, UsersRound, Bell, FileText, Shield,
  LogOut, Menu, X, Folder, Search, TrendingUp,
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'hr', 'project_manager', 'team_lead', 'employee', 'auditor'] },
    { name: 'Employees', href: '/employees', icon: Users, roles: ['super_admin', 'hr', 'project_manager'] },
    { name: 'Requests', href: '/requests', icon: Calendar, roles: ['super_admin', 'hr', 'project_manager', 'team_lead', 'employee'] },
    { name: 'Attendance', href: '/attendance', icon: Clock, roles: ['super_admin', 'hr', 'project_manager', 'team_lead', 'employee'] },
    { name: 'Projects', href: '/projects', icon: FolderKanban, roles: ['super_admin', 'project_manager', 'team_lead', 'employee'] },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare, roles: ['super_admin', 'project_manager', 'team_lead', 'employee'] },
    { name: 'Teams', href: '/teams', icon: UsersRound, roles: ['super_admin', 'hr', 'project_manager'] },
    { name: 'Audit Forms', href: '/forms', icon: FileText, roles: ['super_admin', 'auditor', 'employee'] },
    { name: 'Audit Logs', href: '/audit-logs', icon: Shield, roles: ['super_admin', 'auditor'] },
    { name: 'Documents', href: '/documents', icon: Folder, roles: ['super_admin', 'hr', 'project_manager', 'team_lead', 'employee', 'auditor'] },
    { name: 'Search', href: '/search', icon: Search, roles: ['super_admin', 'hr', 'project_manager', 'team_lead', 'employee', 'auditor'] },
    { name: 'Analytics', href: '/analytics', icon: TrendingUp, roles: ['super_admin', 'hr', 'project_manager'] },
  ];

  const filteredNav = navigation.filter((item) => item.roles.includes(user?.role));

  const SidebarContent = () => (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center h-16 flex-shrink-0 px-6 border-b border-[#E5E7EB]">
        <div className="w-8 h-8 bg-[#0020F5] rounded-sm flex items-center justify-center">
          <span className="text-white text-xs font-bold" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>W</span>
        </div>
        <span className="ml-3 text-base font-semibold text-[#111111]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
          WorkFlow ERP
        </span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-sm transition-colors ${
                isActive
                  ? 'bg-[#0020F5] text-white'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-[#0020F5]'
              }`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <item.icon
                className={`mr-3 flex-shrink-0 h-[18px] w-[18px] ${
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-[#0020F5]'
                }`}
                strokeWidth={1.5}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
      {/* User info at bottom */}
      <div className="p-3 border-t border-[#E5E7EB]">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#0020F5] bg-opacity-10 flex items-center justify-center flex-shrink-0">
              <span className="text-[#0020F5] text-sm font-medium">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#111111] truncate" style={{ fontFamily: 'Inter, sans-serif' }}>
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 uppercase truncate" style={{ fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.05em' }}>
                {user?.role?.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-gray-400 hover:text-[#FF2B18] hover:bg-gray-50 rounded-sm flex-shrink-0"
            title="Logout"
          >
            <LogOut size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );

  const currentPage = navigation.find(
    (item) => location.pathname === item.href || location.pathname.startsWith(item.href + '/')
  );

  return (
    <div className="min-h-screen bg-[#F7F7F8]">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-[#E5E7EB] z-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 bg-[#0020F5] rounded-sm flex items-center justify-center">
            <span className="text-white text-xs font-bold">W</span>
          </div>
          <span className="font-semibold text-[#111111] text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>WorkFlow ERP</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-gray-600 hover:text-[#0020F5] p-1"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-60 bg-white border-r border-[#E5E7EB]">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-40"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="fixed inset-y-0 left-0 w-64 bg-white border-r border-[#E5E7EB] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-60 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex-shrink-0 h-16 bg-white border-b border-[#E5E7EB] mt-[52px] lg:mt-0">
          <div className="h-full px-6 flex items-center justify-between">
            <h1
              className="text-xl font-semibold text-[#111111]"
              style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
            >
              {currentPage?.name || 'WorkFlow ERP'}
            </h1>
            <div className="flex items-center space-x-3">
              <Link
                to="/notifications"
                className="relative p-2 text-gray-400 hover:text-[#0020F5] hover:bg-gray-50 rounded-sm transition-colors"
              >
                <Bell size={18} strokeWidth={1.5} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#FF2B18] rounded-full"></span>
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;