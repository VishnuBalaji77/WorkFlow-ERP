import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckSquare, Plus, Circle, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import api, { formatApiError } from '../utils/api';
import { toast } from 'sonner';

const priorityConfig = {
  high: { cls: 'bg-red-50 text-red-600 border border-red-200', label: 'High' },
  medium: { cls: 'bg-yellow-50 text-yellow-700 border border-yellow-200', label: 'Medium' },
  low: { cls: 'bg-gray-100 text-gray-600 border border-gray-200', label: 'Low' },
};

const statusConfig = {
  todo: { icon: Circle, cls: 'text-gray-400', label: 'To Do' },
  in_progress: { icon: AlertCircle, cls: 'text-blue-500', label: 'In Progress' },
  done: { icon: CheckCircle2, cls: 'text-green-500', label: 'Done' },
};

const Tasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', project_id: '', assigned_to: '', due_date: '', priority: 'medium' });

  const loadData = async () => {
    try {
      setLoading(true);
      const taskRes = await api.get('/tasks');
      setTasks(taskRes.data);

      const projRes = await api.get('/projects');
      setProjects(projRes.data);

      const empRes = await api.get('/users');
      setEmployees(empRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load tasks database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);

  const handleStatusChange = async (id, currentStatus) => {
    try {
      const nextStatus = currentStatus === 'todo' ? 'in_progress' : currentStatus === 'in_progress' ? 'done' : 'todo';
      await api.put(`/tasks/${id}`, { status: nextStatus });
      toast.success('Task status updated');
      loadData();
    } catch (err) {
      toast.error('Failed to update task status');
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tasks', formData);
      toast.success('Task created successfully');
      setShowModal(false);
      setFormData({ title: '', description: '', project_id: '', assigned_to: '', due_date: '', priority: 'medium' });
      loadData();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const canCreate = ['super_admin', 'project_manager', 'team_lead'].includes(user?.role);

  const getProjectName = (id) => projects.find(p => p.id === id)?.name || 'General';
  const getEmployeeName = (id) => employees.find(e => e.id === id)?.name || 'Unassigned';

  return (
    <div className="space-y-5" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#111111]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Tasks</h2>
          <p className="text-sm text-gray-500 mt-0.5">{tasks.filter(t => t.status !== 'done').length} pending tasks</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowModal(true)} className="bg-[#0020F5] hover:bg-[#0018C2] text-white rounded-sm">
            <Plus size={16} className="mr-2" strokeWidth={1.5} /> New Task
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex space-x-2">
        {[{ id: 'all', label: 'All' }, { id: 'todo', label: 'To Do' }, { id: 'in_progress', label: 'In Progress' }, { id: 'done', label: 'Done' }].map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors ${
              filter === f.id ? 'bg-[#0020F5] text-white' : 'bg-white border border-gray-200 text-gray-650 hover:bg-gray-50'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Tasks list */}
      <div className="bg-white border border-[#E5E7EB] rounded-sm divide-y divide-[#F3F4F6]">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading tasks...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No tasks found</div>
        ) : (
          filtered.map((task) => {
            const sc = statusConfig[task.status] || statusConfig.todo;
            const pc = priorityConfig[task.priority] || priorityConfig.medium;
            return (
              <div key={task.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <button onClick={() => handleStatusChange(task.id, task.status)}
                    className={`mt-0.5 flex-shrink-0 ${sc.cls}`}>
                    <sc.icon size={18} strokeWidth={1.5} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${task.status === 'done' ? 'text-gray-400 line-through' : 'text-[#111111]'}`}>
                      {task.title}
                    </p>
                    {task.description && <p className="text-xs text-gray-450 mt-0.5 line-clamp-1">{task.description}</p>}
                    <div className="flex items-center space-x-3 mt-1.5 text-xs text-gray-400">
                      <span className="font-semibold text-[#0020F5]">{getProjectName(task.project_id)}</span>
                      <span>·</span>
                      <span>Assignee: {getEmployeeName(task.assigned_to)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${pc.cls}`}>{pc.label}</span>
                  <span className="text-xs text-gray-400" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{task.due_date || 'No Due Date'}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-sm border border-[#E5E7EB] w-full max-w-md p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#111111] mb-5" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>New Task</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Task Title</label>
                <input type="text" placeholder="What needs to be done?" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Description</label>
                <textarea rows={2} placeholder="Add detailed requirements..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Select Project</label>
                <select value={formData.project_id} onChange={(e) => setFormData({ ...formData, project_id: e.target.value })} required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] bg-white outline-none">
                  <option value="">-- Choose Project --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Assign To</label>
                <select value={formData.assigned_to} onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })} required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] bg-white outline-none">
                  <option value="">-- Choose Employee --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Due Date</label>
                  <input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Priority</label>
                  <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] bg-white outline-none">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="flex space-x-3 pt-2 border-t">
                <Button type="submit" className="flex-1 bg-[#0020F5] hover:bg-[#0018C2] text-white rounded-sm">Create Task</Button>
                <Button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-sm">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;