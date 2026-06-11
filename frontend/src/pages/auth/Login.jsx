import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
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
            Enterprise Resource<br />Planning & Audit<br />Management
          </h2>
          <p className="text-blue-200 text-base">
            Streamline your workforce, projects, and compliance in one unified platform.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {['500+ Teams', '99.9% Uptime', 'Role-Based Access'].map((label) => (
            <div key={label} className="bg-white bg-opacity-10 rounded-sm px-3 py-3">
              <p className="text-white text-xs font-medium">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-[#F7F7F8]">
        <div className="w-full max-w-sm">
          <div className="bg-white border border-[#E5E7EB] rounded-sm p-8">
            <div className="mb-7">
              <div className="w-10 h-10 bg-[#0020F5] rounded-sm mb-5 lg:hidden flex items-center justify-center">
                <span className="text-white text-sm font-bold">W</span>
              </div>
              <h2 className="text-2xl font-semibold text-[#111111] mb-1" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                Sign In
              </h2>
              <p className="text-sm text-gray-500">Access your enterprise workspace</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-sm">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} strokeWidth={1.5} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] focus:border-[#0020F5] outline-none bg-white"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} strokeWidth={1.5} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#0020F5] focus:border-[#0020F5] outline-none bg-white"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-2.5 px-4 text-sm font-medium text-white bg-[#0020F5] hover:bg-[#0018C2] rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <>
                    <LogIn size={16} className="mr-2" strokeWidth={1.5} />
                    Sign In
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 text-center">
              <p className="text-sm text-gray-500">
                No account?{' '}
                <Link to="/register" className="text-[#0020F5] hover:underline font-medium">
                  Create one
                </Link>
              </p>
            </div>
          </div>

          {/* Demo credentials hint */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-sm">
            <p className="text-xs text-blue-700 font-medium mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>DEMO CREDENTIALS</p>
            <p className="text-xs text-blue-600">admin@demo.com / admin123</p>
            <p className="text-xs text-blue-600">employee@demo.com / emp123</p>
          </div>

          <p className="mt-4 text-center text-xs text-gray-400">
            © 2026 WorkFlow ERP. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;