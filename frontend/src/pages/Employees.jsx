import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plus, Search, Mail, Phone, Building2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import api, { formatApiError } from '../utils/api';
import { toast } from 'sonner';

const roleColors = {
  super_admin: 'bg-purple-100 text-purple-700',
  hr: 'bg-blue-100 text-blue-700',
  project_manager: 'bg-indigo-100 text-indigo-700',
  team_lead: 'bg-cyan-100 text-cyan-700',
  employee: 'bg-gray-100 text-gray-600',
  auditor: 'bg-amber-100 text-amber-700',
};

const Employees = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'employee', department: '', phone: '' });
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filtered = employees.filter(
    (e) =>
      e.name?.toLowerCase().includes(search.toLowerCase()) ||
      e.email?.toLowerCase().includes(search.toLowerCase()) ||
      e.department?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        department: formData.department,
        password: 'Password@123', // Default password for new signups
      };
      const res = await api.post('/users', payload);
      
      // If phone number is specified, update it separately via PUT /users/{id}
      if (formData.phone && res.data.id) {
        try {
          await api.put(`/users/${res.data.id}`, { phone: formData.phone });
        } catch (phoneErr) {
          console.error('Failed to update phone number:', phoneErr);
        }
      }
      
      toast.success('Employee added successfully (Default password: Password@123)');
      setShowModal(false);
      setFormData({ name: '', email: '', role: 'employee', department: '', phone: '' });
      fetchEmployees();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const canManage = ['super_admin', 'hr'].includes(user?.role);

  return (
    <div className="space-y-5" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#111111]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Employees</h2>
          <p className="text-sm text-gray-500 mt-0.5">{employees.length} total members</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowModal(true)} className="bg-[#0020F5] hover:bg-[#0018C2] text-white rounded-sm">
            <Plus size={16} className="mr-2" strokeWidth={1.5} /> Add Employee
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} strokeWidth={1.5} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or department..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-sm text-sm bg-white focus:ring-1 focus:ring-[#0020F5] focus:border-[#0020F5] outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading employees...</div>
        ) : (
          <table className="min-w-full divide-y divide-[#E5E7EB]">
            <thead className="bg-gray-50">
              <tr>
                {['Employee', 'Department', 'Role', 'Contact', 'Joined', 'Status'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {filtered.map((emp) => (
                <tr key={emp.id || emp.email} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-[#0020F5] bg-opacity-10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#0020F5] text-xs font-semibold">{(emp.name || 'U').charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#111111]">{emp.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                    <span className="flex items-center">
                      <Building2 size={13} className="mr-1.5 text-gray-400" strokeWidth={1.5} />
                      {emp.department || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className={`text-xs px-2 py-0.5 rounded-sm font-medium uppercase ${roleColors[emp.role] || 'bg-gray-100 text-gray-600'}`}>
                      {(emp.role || 'employee').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                    {emp.phone || '—'}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                    {emp.created_at ? emp.created_at.split('T')[0] : '—'}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {emp.status || 'active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No employees found</div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-sm border border-[#E5E7EB] w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#111111] mb-5" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Add Employee</h3>
            <form onSubmit={handleAdd} className="space-y-3.5">
              {[
                { label: 'Full Name', name: 'name', type: 'text', placeholder: 'John Doe' },
                { label: 'Email', name: 'email', type: 'email', placeholder: 'john@company.com' },
                { label: 'Phone', name: 'phone', type: 'tel', placeholder: '+91 98765 43210' },
                { label: 'Department', name: 'department', type: 'text', placeholder: 'Engineering' },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{field.label}</label>
                  <input type={field.type} placeholder={field.placeholder} value={formData[field.name]} onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })} required={field.name !== 'phone'}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] focus:border-[#0020F5] outline-none" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Role</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] focus:border-[#0020F5] outline-none bg-white">
                  {['employee', 'team_lead', 'project_manager', 'hr', 'auditor', 'super_admin'].map((r) => (
                    <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-3 pt-2">
                <Button type="submit" className="flex-1 bg-[#0020F5] hover:bg-[#0018C2] text-white rounded-sm">Add Employee</Button>
                <Button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-sm">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;