import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserPlus, Mail, Lock, User, Briefcase } from 'lucide-react';

const ROLES = [
  { value: 'employee', label: 'Employee' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'hr', label: 'HR' },
  { value: 'auditor', label: 'Auditor' },
  { value: 'super_admin', label: 'Super Admin' },
];

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'employee',
    department: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await register(
      formData.email,
      formData.password,
      formData.name,
      formData.role,
      formData.department || null
    );
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#0020F5] flex-col justify-between p-12">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-white bg-opacity-20 rounded-sm flex items-center justify-center">
              <span className="text-white text-sm font-bold" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>W</span>
            </div>
            <span className="text-white text-lg font-semibold" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>WorkFlow ERP</span>
          </div>
        </div>
        <div>
          <h2 className="text-4xl font-semibold text-white leading-snug mb-4" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            Join Your<br />Enterprise<br />Workspace
          </h2>
          <p className="text-blue-200 text-base">
            Create your account and start managing your team effectively.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {['Attendance Tracking', 'Leave Management', 'Project Oversight', 'Audit Compliance'].map((f) => (
            <div key={f} className="bg-white bg-opacity-10 rounded-sm px-3 py-3">
              <p className="text-white text-xs font-medium">{f}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-8 bg-[#F7F7F8] overflow-y-auto">
        <div className="w-full max-w-sm">
          <div className="bg-white border border-[#E5E7EB] rounded-sm p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-[#111111] mb-1" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                Create Account
              </h2>
              <p className="text-sm text-gray-500">Join your enterprise workspace</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-sm">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} strokeWidth={1.5} />
                  <input name="name" type="text" value={formData.name} onChange={handleChange} required
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] focus:border-[#0020F5] outline-none"
                    placeholder="John Doe" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} strokeWidth={1.5} />
                  <input name="email" type="email" value={formData.email} onChange={handleChange} required
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] focus:border-[#0020F5] outline-none"
                    placeholder="you@company.com" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Role</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} strokeWidth={1.5} />
                  <select name="role" value={formData.role} onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] focus:border-[#0020F5] outline-none bg-white appearance-none">
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} strokeWidth={1.5} />
                  <input name="password" type="password" value={formData.password} onChange={handleChange} required
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] focus:border-[#0020F5] outline-none"
                    placeholder="Min. 6 characters" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} strokeWidth={1.5} />
                  <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] focus:border-[#0020F5] outline-none"
                    placeholder="••••••••" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-2.5 px-4 text-sm font-medium text-white bg-[#0020F5] hover:bg-[#0018C2] rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  <>
                    <UserPlus size={16} className="mr-2" strokeWidth={1.5} />
                    Create Account
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 text-center">
              <p className="text-sm text-gray-500">
                Already have an account?{' '}
                <Link to="/login" className="text-[#0020F5] hover:underline font-medium">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-gray-400">
            © 2026 WorkFlow ERP. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;