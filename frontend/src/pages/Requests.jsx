import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Plus, Check, X, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import api, { formatApiError } from '../utils/api';
import { toast } from 'sonner';

const statusColors = {
  pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  approved: 'bg-green-50 text-green-700 border border-green-200',
  rejected: 'bg-red-50 text-red-600 border border-red-200',
};

const Requests = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('leave');
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [wfhRequests, setWfhRequests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ type: 'sick', start_date: '', end_date: '', reason: '' });
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      if (activeTab === 'leave') {
        const res = await api.get('/requests/leave');
        setLeaveRequests(res.data);
      } else {
        const res = await api.get('/requests/wfh');
        setWfhRequests(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error(`Failed to load ${activeTab === 'leave' ? 'leave' : 'WFH'} requests`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeTab]);

  const requests = activeTab === 'leave' ? leaveRequests : wfhRequests;
  const canApprove = ['super_admin', 'hr', 'project_manager', 'team_lead'].includes(user?.role);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (activeTab === 'leave') {
        const payload = {
          type: formData.type,
          start_date: formData.start_date,
          end_date: formData.end_date,
          reason: formData.reason,
        };
        await api.post('/requests/leave', payload);
      } else {
        const payload = {
          start_date: formData.start_date,
          end_date: formData.end_date,
          reason: formData.reason,
        };
        await api.post('/requests/wfh', payload);
      }
      toast.success(`${activeTab === 'leave' ? 'Leave' : 'WFH'} request submitted successfully`);
      setShowModal(false);
      setFormData({ type: 'sick', start_date: '', end_date: '', reason: '' });
      fetchRequests();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const handleStatus = async (id, status) => {
    try {
      const endpoint = `/requests/${activeTab}/${id}/${status === 'approved' ? 'approve' : 'reject'}`;
      await api.put(endpoint, { comments: 'Approved/Rejected from the dashboard.' });
      toast.success(`Request ${status}`);
      fetchRequests();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <div className="space-y-5" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#111111]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Requests</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage leave and work from home requests</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-[#0020F5] hover:bg-[#0018C2] text-white rounded-sm">
          <Plus size={16} className="mr-2" strokeWidth={1.5} /> New Request
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E5E7EB]">
        <div className="flex space-x-6">
          {[{ id: 'leave', label: 'Leave Requests' }, { id: 'wfh', label: 'WFH Requests' }].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-[#0020F5] text-[#0020F5]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading requests...</div>
        ) : (
          <table className="min-w-full divide-y divide-[#E5E7EB]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                {activeTab === 'leave' && <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>}
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                {canApprove && <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {requests.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-sm text-gray-400">No requests found</td></tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3.5 text-sm text-gray-800 font-medium whitespace-nowrap">{req.user_name || 'Unknown'}</td>
                    {activeTab === 'leave' && (
                      <td className="px-5 py-3.5 text-sm text-gray-600 capitalize whitespace-nowrap">{req.type}</td>
                    )}
                    <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{req.start_date}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{req.end_date}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 max-w-xs truncate">{req.reason}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium uppercase ${statusColors[req.status] || 'bg-gray-50 text-gray-500'}`}>
                        {req.status === 'pending' && <Clock size={11} className="mr-1" />}
                        {req.status}
                      </span>
                    </td>
                    {canApprove && (
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {req.status === 'pending' && (
                          <div className="flex space-x-1.5">
                            <button onClick={() => handleStatus(req.id, 'approved')}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-sm transition-colors" title="Approve">
                              <Check size={15} strokeWidth={2} />
                            </button>
                            <button onClick={() => handleStatus(req.id, 'rejected')}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-sm transition-colors" title="Reject">
                              <X size={15} strokeWidth={2} />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-sm border border-[#E5E7EB] w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#111111] mb-5" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              New {activeTab === 'leave' ? 'Leave' : 'WFH'} Request
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {activeTab === 'leave' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Leave Type</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] focus:border-[#0020F5] outline-none bg-white">
                    <option value="sick">Sick Leave</option>
                    <option value="casual">Casual Leave</option>
                    <option value="vacation">Vacation</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Start Date</label>
                <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] focus:border-[#0020F5] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>End Date</label>
                <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] focus:border-[#0020F5] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Reason</label>
                <textarea value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} required rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] focus:border-[#0020F5] outline-none resize-none" />
              </div>
              <div className="flex space-x-3 pt-1">
                <Button type="submit" className="flex-1 bg-[#0020F5] hover:bg-[#0018C2] text-white rounded-sm">Submit</Button>
                <Button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-sm">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requests;