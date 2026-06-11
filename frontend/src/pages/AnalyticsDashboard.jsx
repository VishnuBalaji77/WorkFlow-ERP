import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Clock, ShieldAlert, FolderKanban, HardDrive, Building2, TrendingUp, Users } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'sonner';

const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    users: [],
    attendance: [],
    projects: [],
    tasks: [],
    documents: [],
    audits: [],
  });

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [userRes, attRes, projRes, taskRes, docRes, auditRes] = await Promise.all([
        api.get('/users').catch(() => ({ data: [] })),
        api.get('/attendance').catch(() => ({ data: [] })),
        api.get('/projects').catch(() => ({ data: [] })),
        api.get('/tasks').catch(() => ({ data: [] })),
        api.get('/documents').catch(() => ({ data: [] })),
        api.get('/forms/assignments').catch(() => ({ data: [] })),
      ]);

      setData({
        users: userRes.data || [],
        attendance: attRes.data || [],
        projects: projRes.data || [],
        tasks: taskRes.data || [],
        documents: docRes.data || [],
        audits: auditRes.data || [],
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to compile analytics datasets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-gray-400">Loading enterprise analytics dashboard...</div>
    );
  }

  // --- COMPUTE STATISTICS ---
  // 1. Employee stats
  const totalEmployees = data.users.length;
  const deptCount = {};
  data.users.forEach(u => {
    const d = u.department || 'Administration';
    deptCount[d] = (deptCount[d] || 0) + 1;
  });

  // 2. Attendance stats
  const presentToday = data.attendance.filter(r => r.date === new Date().toISOString().split('T')[0]).length;
  const attendanceRate = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;

  // 3. Projects & Tasks
  const activeProjects = data.projects.filter(p => p.status === 'active').length;
  const taskStatus = { todo: 0, in_progress: 0, done: 0 };
  data.tasks.forEach(t => {
    if (taskStatus[t.status] !== undefined) taskStatus[t.status]++;
  });
  const completedTasksRate = data.tasks.length > 0 ? Math.round((taskStatus.done / data.tasks.length) * 100) : 0;

  // 4. Audits severity
  const severityCount = { critical: 0, high: 0, medium: 0, low: 0 };
  data.audits.forEach(a => {
    if (a.severity && severityCount[a.severity] !== undefined) {
      severityCount[a.severity]++;
    }
  });
  const totalFindings = Object.values(severityCount).reduce((a, b) => a + b, 0);

  // 5. Repository sizes
  const totalRepoSize = data.documents.reduce((acc, d) => acc + (d.size || 0), 0);
  const repoCategory = {};
  data.documents.forEach(d => {
    repoCategory[d.category] = (repoCategory[d.category] || 0) + (d.size || 0);
  });

  const formatSize = (bytes) => {
    if (!bytes) return '0 KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  // --- RENDER DYNAMIC SVG CHARTS ---
  // A. Department Breakdown Bar Chart (SVG)
  const deptLabels = Object.keys(deptCount);
  const deptValues = Object.values(deptCount);
  const maxDeptVal = Math.max(...deptValues, 1);
  const barChartHeight = 160;

  // B. Audit Findings Ring (SVG Circle)
  const totalAuditsReviewed = data.audits.filter(a => a.approval_status).length;
  const approvedAudits = data.audits.filter(a => a.approval_status === 'approved').length;
  const auditSuccessRate = totalAuditsReviewed > 0 ? Math.round((approvedAudits / totalAuditsReviewed) * 100) : 100;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (auditSuccessRate / 100) * circumference;

  return (
    <div className="space-y-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div>
        <h2 className="text-2xl font-semibold text-[#111111]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Enterprise Analytics</h2>
        <p className="text-sm text-gray-500 mt-0.5">Real-time performance metrics, compliance tracking, and resource audits</p>
      </div>

      {/* Top Cards grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Attendance Rate', value: `${attendanceRate}%`, change: `${presentToday} present today`, icon: Clock, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Task Completion', value: `${completedTasksRate}%`, change: `${taskStatus.done} completed tasks`, icon: FolderKanban, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Audit Findings', value: totalFindings, change: `${severityCount.critical} critical severity`, icon: ShieldAlert, color: 'text-red-650', bg: 'bg-red-50' },
          { label: 'Repository size', value: formatSize(totalRepoSize), change: `${data.documents.length} files saved`, icon: HardDrive, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-[#E5E7EB] rounded-sm p-5 flex items-start space-x-4">
            <div className={`w-10 h-10 ${c.bg} rounded-sm flex items-center justify-center flex-shrink-0`}>
              <c.icon className={c.color} size={20} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#111111]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{c.value}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{c.label}</p>
              <p className="text-[10px] text-gray-400 mt-1.5" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{c.change}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Compliance performance ring chart */}
        <div className="bg-white border border-[#E5E7EB] rounded-sm p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#111111] mb-1" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Compliance Quality Index</h3>
            <p className="text-xs text-gray-400">Ratio of passed audits over reviewed records</p>
          </div>

          <div className="relative flex justify-center items-center py-6">
            <svg className="w-32 h-32 transform -rotate-90">
              {/* Background ring */}
              <circle cx="64" cy="64" r={radius} stroke="#E5E7EB" strokeWidth="10" fill="transparent" />
              {/* Foreground progress */}
              <circle cx="64" cy="64" r={radius} stroke="#0020F5" strokeWidth="10" fill="transparent"
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-700" />
            </svg>
            <div className="absolute text-center">
              <span className="text-2xl font-bold text-[#111111]">{auditSuccessRate}%</span>
              <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Score</p>
            </div>
          </div>

          <div className="border-t pt-4 space-y-2 text-xs text-gray-650">
            <div className="flex justify-between">
              <span>Audits Approved</span>
              <span className="font-semibold text-green-700">{approvedAudits}</span>
            </div>
            <div className="flex justify-between">
              <span>Audits Rejected (Requires CAPA)</span>
              <span className="font-semibold text-red-650">{totalAuditsReviewed - approvedAudits}</span>
            </div>
          </div>
        </div>

        {/* Department staffing bar chart */}
        <div className="bg-white border border-[#E5E7EB] rounded-sm p-6 flex flex-col justify-between lg:col-span-2">
          <div>
            <h3 className="text-sm font-semibold text-[#111111] mb-1" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Department Distribution</h3>
            <p className="text-xs text-gray-400">Total staff roster divided by primary functions</p>
          </div>

          {/* Bar Chart Container */}
          <div className="py-6 flex items-end justify-around space-x-2" style={{ height: `${barChartHeight}px` }}>
            {deptLabels.length === 0 ? (
              <p className="text-xs text-gray-400 self-center">No employee records registered</p>
            ) : (
              deptLabels.map((dept, i) => {
                const count = deptCount[dept];
                const pct = (count / maxDeptVal) * 100;
                return (
                  <div key={dept} className="flex flex-col items-center flex-1 group">
                    <span className="text-[10px] font-bold text-gray-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                      {count}
                    </span>
                    <div className="w-full max-w-[28px] bg-blue-50 border border-blue-100 group-hover:bg-[#0020F5] transition-all rounded-t-sm" style={{ height: `${(pct / 100) * 90}px`, minHeight: '6px' }} />
                    <span className="text-[10px] text-gray-450 mt-2 truncate w-full text-center font-medium capitalize select-none" title={dept}>
                      {dept.substring(0, 6)}..
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t pt-4 flex items-center justify-between text-xs">
            <span className="text-gray-500 flex items-center"><Building2 size={13} className="mr-1" /> Total Departments</span>
            <span className="font-semibold text-[#111111]">{deptLabels.length} departments</span>
          </div>
        </div>
      </div>

      {/* Sub-detailed table breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Finding Severity Breakdown */}
        <div className="bg-white border border-[#E5E7EB] rounded-sm p-6">
          <h3 className="text-sm font-semibold text-[#111111] mb-4" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Audit Findings Severity</h3>
          <div className="space-y-3">
            {[
              { label: 'Critical', count: severityCount.critical, color: 'bg-red-500' },
              { label: 'High', count: severityCount.high, color: 'bg-orange-500' },
              { label: 'Medium', count: severityCount.medium, color: 'bg-yellow-500' },
              { label: 'Low', count: severityCount.low, color: 'bg-blue-500' },
            ].map(item => {
              const maxVal = Math.max(totalFindings, 1);
              const percent = Math.round((item.count / maxVal) * 100);
              return (
                <div key={item.label} className="space-y-1 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span className="text-gray-700">{item.label}</span>
                    <span className="text-gray-500">{item.count} items ({percent}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Repository categories breakdown */}
        <div className="bg-white border border-[#E5E7EB] rounded-sm p-6">
          <h3 className="text-sm font-semibold text-[#111111] mb-4" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Repository Category Usage</h3>
          <div className="space-y-3">
            {Object.keys(repoCategory).length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No documents uploaded</p>
            ) : (
              Object.keys(repoCategory).map(cat => {
                const maxVal = Math.max(totalRepoSize, 1);
                const percent = Math.round((repoCategory[cat] / maxVal) * 100);
                return (
                  <div key={cat} className="space-y-1 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span className="text-gray-700">{cat}</span>
                      <span className="text-gray-500">{formatSize(repoCategory[cat])} ({percent}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
