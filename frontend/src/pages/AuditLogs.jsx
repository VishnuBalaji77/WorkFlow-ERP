import React, { useState, useEffect } from 'react';
import { Shield, Search, Filter, Clock } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'sonner';

const severityConfig = {
  info: { cls: 'bg-blue-50 text-blue-700 border border-blue-200', dot: 'bg-blue-500' },
  warning: { cls: 'bg-yellow-50 text-yellow-700 border border-yellow-200', dot: 'bg-yellow-500' },
  error: { cls: 'bg-red-50 text-red-600 border border-red-200', dot: 'bg-red-500' },
};

const actionColors = {
  login: 'text-blue-600',
  logout: 'text-gray-650',
  register: 'text-cyan-600',
  create: 'text-green-600',
  update: 'text-indigo-600',
  delete: 'text-red-650',
  approve: 'text-green-700',
  reject: 'text-red-700',
  submit: 'text-purple-650',
  upload: 'text-amber-600',
};

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/audit-logs');
      setLogs(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load system audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter((log) => {
    const detailText = log.detail || log.details ? JSON.stringify(log.details) : '';
    const matchSearch =
      log.user_id?.toLowerCase().includes(search.toLowerCase()) ||
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
      detailText.toLowerCase().includes(search.toLowerCase());
    
    // Server logs don't all have severity, let's map action to default severity
    let logSeverity = 'info';
    if (['delete', 'reject'].includes(log.action?.toLowerCase())) logSeverity = 'warning';
    if (log.action?.toLowerCase().includes('error')) logSeverity = 'error';

    const matchSeverity = severityFilter === 'all' || logSeverity === severityFilter;
    return matchSearch && matchSeverity;
  });

  return (
    <div className="space-y-5" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div>
        <h2 className="text-2xl font-semibold text-[#111111]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Audit Logs</h2>
        <p className="text-sm text-gray-500 mt-0.5">System activity and security audit trail</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} strokeWidth={1.5} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search logs..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-sm text-sm bg-white focus:ring-1 focus:ring-[#0020F5] focus:border-[#0020F5] outline-none" />
        </div>
        <div className="flex space-x-2">
          {['all', 'info', 'warning', 'error'].map((s) => (
            <button key={s} onClick={() => setSeverityFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm capitalize transition-colors ${
                severityFilter === s ? 'bg-[#0020F5] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Logs */}
      <div className="bg-white border border-[#E5E7EB] rounded-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading audit trail...</div>
        ) : (
          <div className="divide-y divide-[#F3F4F6]">
            {filtered.map((log) => {
              // Map action to severity
              let severity = 'info';
              if (['delete', 'reject'].includes(log.action?.toLowerCase())) severity = 'warning';
              if (log.action?.toLowerCase().includes('error')) severity = 'error';
              const sc = severityConfig[severity];

              return (
                <div key={log.id} className="px-5 py-3.5 hover:bg-gray-50 flex items-start space-x-4">
                  <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${sc.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-0.5">
                      <span className={`text-xs font-bold uppercase ${actionColors[log.action?.toLowerCase()] || 'text-gray-600'}`} style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                        {log.action}
                      </span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs font-medium text-gray-700">Entity: {log.entity_type}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">User ID: {log.user_id}</span>
                      <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-sm font-medium ${sc.cls}`}>{severity}</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {log.details ? JSON.stringify(log.details) : `Performed action ${log.action} on ${log.entity_type} with ID ${log.entity_id}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                      <Clock size={11} className="mr-1" />
                      {new Date(log.timestamp).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-gray-400">No logs match your filter</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;