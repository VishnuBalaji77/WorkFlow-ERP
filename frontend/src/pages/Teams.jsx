import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UsersRound, Plus, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import api, { formatApiError } from '../utils/api';
import { toast } from 'sonner';

const Teams = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // New Team Form
  const [formData, setFormData] = useState({ name: '', department: '', lead_id: '', members: [] });

  const loadData = async () => {
    try {
      setLoading(true);
      const teamRes = await api.get('/teams');
      setTeams(teamRes.data);

      const empRes = await api.get('/users');
      setEmployees(empRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load teams database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const canCreate = ['super_admin', 'hr', 'project_manager'].includes(user?.role);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        department: formData.department,
        members: [...formData.members, formData.lead_id], // ensure lead is part of the members
      };
      await api.post('/teams', payload);
      toast.success('Team created successfully');
      setShowModal(false);
      setFormData({ name: '', department: '', lead_id: '', members: [] });
      loadData();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const handleMemberToggle = (empId) => {
    const current = [...formData.members];
    if (current.includes(empId)) {
      setFormData({ ...formData, members: current.filter(id => id !== empId) });
    } else {
      setFormData({ ...formData, members: [...current, empId] });
    }
  };

  const getEmployeeName = (id) => employees.find(e => e.id === id || e.email === id)?.name || 'Employee';

  return (
    <div className="space-y-5" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#111111]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Teams</h2>
          <p className="text-sm text-gray-500 mt-0.5">{teams.length} teams across departments</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowModal(true)} className="bg-[#0020F5] hover:bg-[#0018C2] text-white rounded-sm">
            <Plus size={16} className="mr-2" strokeWidth={1.5} /> New Team
          </Button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading department structures...</div>
      ) : teams.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400 bg-white border border-[#E5E7EB] rounded-sm">No teams defined yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((team) => (
            <div key={team.id} className="bg-white border border-[#E5E7EB] rounded-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#0020F5] bg-opacity-10 rounded-sm flex items-center justify-center">
                    <UsersRound size={18} className="text-[#0020F5]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#111111]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{team.name}</h3>
                    <p className="text-xs text-gray-500">{team.department}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Lead Officer</span>
                  <span className="font-semibold text-[#111111]">{getEmployeeName(team.lead_id)}</span>
                </div>
              </div>

              <div className="border-t border-[#F3F4F6] pt-3">
                <p className="text-xs text-gray-550 mb-2">Members ({team.members?.length || 0})</p>
                <div className="flex flex-wrap gap-1.5">
                  {team.members?.map((m) => {
                    const isLead = m === team.lead_id;
                    return (
                      <span key={m} className={`flex items-center px-2 py-0.5 rounded-sm text-xs ${
                        isLead ? 'bg-blue-50 text-blue-700 font-semibold' : 'bg-gray-100 text-gray-650'
                      }`}>
                        <User size={11} className="mr-1" /> {getEmployeeName(m)} {isLead && '(Lead)'}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-sm border border-[#E5E7EB] w-full max-w-md p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#111111] mb-5" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>New Team</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Team Name</label>
                <input type="text" placeholder="e.g. Frontend Team" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Department</label>
                <input type="text" placeholder="Engineering" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Team Lead</label>
                <select value={formData.lead_id} onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })} required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] bg-white outline-none">
                  <option value="">-- Select Team Lead --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              {/* Members Checklist */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Select Members</label>
                <div className="border border-gray-300 rounded-sm p-3 max-h-32 overflow-y-auto space-y-2 text-sm bg-white">
                  {employees.map(emp => (
                    <label key={emp.id} className="flex items-center space-x-2.5 cursor-pointer">
                      <input type="checkbox" checked={formData.members.includes(emp.id)} onChange={() => handleMemberToggle(emp.id)}
                        className="text-[#0020F5] focus:ring-[#0020F5]" />
                      <span>{emp.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-2 border-t">
                <Button type="submit" className="flex-1 bg-[#0020F5] hover:bg-[#0018C2] text-white rounded-sm">Create Team</Button>
                <Button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-sm">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teams;