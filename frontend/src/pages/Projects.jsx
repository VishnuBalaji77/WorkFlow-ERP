import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FolderKanban, Plus, Users, Calendar, UserPlus } from 'lucide-react';
import { Button } from '../components/ui/button';
import api, { formatApiError } from '../utils/api';
import { toast } from 'sonner';

const statusConfig = {
  active: { label: 'ACTIVE', cls: 'bg-green-50 text-green-700 border border-green-200' },
  completed: { label: 'DONE', cls: 'bg-gray-100 text-gray-600 border border-gray-200' },
  on_hold: { label: 'ON HOLD', cls: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
};

const Projects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // New Project Form
  const [formData, setFormData] = useState({ name: '', description: '', start_date: '', end_date: '', team_members: [] });

  const loadData = async () => {
    try {
      setLoading(true);
      const projRes = await api.get('/projects');
      setProjects(projRes.data);

      const empRes = await api.get('/users');
      setEmployees(empRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load projects database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const canCreate = ['super_admin', 'project_manager'].includes(user?.role);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        team_members: formData.team_members,
      };
      await api.post('/projects', payload);
      toast.success('Project created successfully');
      setShowModal(false);
      setFormData({ name: '', description: '', start_date: '', end_date: '', team_members: [] });
      loadData();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const handleMemberToggle = (empId) => {
    const current = [...formData.team_members];
    if (current.includes(empId)) {
      setFormData({ ...formData, team_members: current.filter(id => id !== empId) });
    } else {
      setFormData({ ...formData, team_members: [...current, empId] });
    }
  };

  return (
    <div className="space-y-5" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#111111]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Projects</h2>
          <p className="text-sm text-gray-500 mt-0.5">{projects.filter(p => p.status === 'active').length} active projects</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowModal(true)} className="bg-[#0020F5] hover:bg-[#0018C2] text-white rounded-sm">
            <Plus size={16} className="mr-2" strokeWidth={1.5} /> New Project
          </Button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading projects dashboard...</div>
      ) : projects.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400 bg-white border border-[#E5E7EB] rounded-sm">No projects currently tracked.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => {
            const sc = statusConfig[project.status] || statusConfig.active;
            return (
              <div key={project.id} className="bg-white border border-[#E5E7EB] rounded-sm p-5 hover:shadow-sm transition-shadow cursor-pointer group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-sm flex items-center justify-center group-hover:bg-[#0020F5] transition-colors">
                    <FolderKanban size={18} className="text-[#0020F5] group-hover:text-white transition-colors" strokeWidth={1.5} />
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${sc.cls}`}>{sc.label}</span>
                </div>
                <h3 className="text-base font-semibold text-[#111111] mb-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                  {project.name}
                </h3>
                <p className="text-sm text-gray-500 mb-4 line-clamp-2 leading-relaxed">{project.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="flex items-center">
                    <Users size={13} className="mr-1" strokeWidth={1.5} />
                    {project.team_members?.length || 0} members
                  </span>
                  <span className="flex items-center" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                    <Calendar size={13} className="mr-1" strokeWidth={1.5} />
                    {project.end_date || 'Ongoing'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-sm border border-[#E5E7EB] w-full max-w-md p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#111111] mb-5" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>New Project</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Project Name</label>
                <input type="text" placeholder="e.g. Mobile App v2" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] focus:border-[#0020F5] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] focus:border-[#0020F5] outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Start Date</label>
                  <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] focus:border-[#0020F5] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>End Date</label>
                  <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] focus:border-[#0020F5] outline-none" />
                </div>
              </div>

              {/* Team Members Multi-select */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Assign Team Members</label>
                <div className="border border-gray-300 rounded-sm p-3 max-h-32 overflow-y-auto space-y-2 text-sm bg-white">
                  {employees.map(emp => (
                    <label key={emp.id} className="flex items-center space-x-2.5 cursor-pointer">
                      <input type="checkbox" checked={formData.team_members.includes(emp.id)} onChange={() => handleMemberToggle(emp.id)}
                        className="text-[#0020F5] focus:ring-[#0020F5]" />
                      <span>{emp.name} ({emp.department || 'No Dept'})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-2 border-t">
                <Button type="submit" className="flex-1 bg-[#0020F5] hover:bg-[#0018C2] text-white rounded-sm">Create</Button>
                <Button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-sm">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;