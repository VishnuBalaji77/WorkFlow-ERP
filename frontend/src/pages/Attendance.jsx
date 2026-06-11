import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, LogOut as LogOutIcon, Clock, MapPin, Laptop } from 'lucide-react';
import { Button } from '../components/ui/button';
import api from '../utils/api';
import { toast } from 'sonner';

const today = new Date().toISOString().split('T')[0];

const Attendance = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationType, setLocationType] = useState('office'); // 'office' or 'wfh'
  const [coords, setCoords] = useState(null);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await api.get('/attendance');
      setRecords(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load attendance logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const todayRecord = records.find((r) => r.date === today && r.user_id === user?.id);

  const performCheckIn = async (payload) => {
    try {
      const res = await api.post('/attendance/check-in', payload);
      const isVerified = res.data?.verification?.verified;
      if (isVerified) {
        toast.success(`Checked in successfully (${payload.location})`);
      } else {
        toast.warning(`Checked in successfully (Permissive check-in, verification bypassed)`);
      }
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Check-in failed');
    }
  };

  const handleCheckIn = async () => {
    let locationStr = 'HQ Office (Mumbai)';
    let payload = { location: locationStr };

    if (locationType === 'wfh') {
      payload.location = 'Work From Home';
      await performCheckIn(payload);
    } else {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setCoords({ latitude, longitude });
            payload.latitude = latitude;
            payload.longitude = longitude;
            await performCheckIn(payload);
          },
          async (error) => {
            console.warn('Geolocation denied or unavailable', error);
            toast.warning('Check-in proceeding without GPS coordinates.');
            await performCheckIn(payload);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        toast.warning('Geolocation not supported by browser. Checking in without GPS.');
        await performCheckIn(payload);
      }
    }
  };

  const handleCheckOut = async () => {
    try {
      await api.post('/attendance/check-out');
      toast.success('Checked out successfully!');
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Check-out failed');
    }
  };

  const formatTime = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const calcHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '—';
    const diff = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60);
    return `${diff.toFixed(1)}h`;
  };

  const displayRecords = ['super_admin', 'hr'].includes(user?.role)
    ? records
    : records.filter((r) => r.user_id === user?.id);

  return (
    <div className="space-y-5" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div>
        <h2 className="text-2xl font-semibold text-[#111111]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Attendance</h2>
        <p className="text-sm text-gray-500 mt-0.5">Track attendance and work hours</p>
      </div>

      {/* Today's Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-sm p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Today — {today}</p>
            <h3 className="text-base font-semibold text-[#111111]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>My Attendance</h3>
            {todayRecord ? (
              <div className="flex items-center space-x-4 mt-2 flex-wrap">
                <span className="text-sm text-gray-600">
                  In: <span className="text-[#111111] font-medium" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{formatTime(todayRecord.check_in)}</span>
                </span>
                {todayRecord.check_out && (
                  <span className="text-sm text-gray-600">
                    Out: <span className="text-[#111111] font-medium" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{formatTime(todayRecord.check_out)}</span>
                  </span>
                )}
                {todayRecord.check_out && (
                  <span className="text-sm text-gray-600">
                    Duration: <span className="text-[#111111] font-medium" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{calcHours(todayRecord.check_in, todayRecord.check_out)}</span>
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-sm font-semibold ml-2">
                  {todayRecord.location || 'HQ Office (Mumbai)'}
                </span>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-gray-400">No record yet for today. Choose your check-in type:</p>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer text-sm font-medium text-gray-700">
                    <input type="radio" name="locationType" value="office" checked={locationType === 'office'} onChange={() => setLocationType('office')} className="text-[#0020F5] focus:ring-[#0020F5]" />
                    <span className="flex items-center"><MapPin size={14} className="mr-1 text-gray-500" /> HQ Office (Location Restrained)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer text-sm font-medium text-gray-700">
                    <input type="radio" name="locationType" value="wfh" checked={locationType === 'wfh'} onChange={() => setLocationType('wfh')} className="text-[#0020F5] focus:ring-[#0020F5]" />
                    <span className="flex items-center"><Laptop size={14} className="mr-1 text-gray-500" /> Work From Home</span>
                  </label>
                </div>
              </div>
            )}
          </div>
          <div className="flex space-x-3 items-center">
            {!todayRecord && (
              <Button onClick={handleCheckIn} className="bg-[#00B84A] hover:bg-[#009E3F] text-white rounded-sm">
                <LogIn size={16} className="mr-2" strokeWidth={1.5} /> Check In
              </Button>
            )}
            {todayRecord && !todayRecord.check_out && (
              <Button onClick={handleCheckOut} className="bg-[#FF2B18] hover:bg-[#E02510] text-white rounded-sm">
                <LogOutIcon size={16} className="mr-2" strokeWidth={1.5} /> Check Out
              </Button>
            )}
            {todayRecord?.check_out && (
              <span className="inline-flex items-center px-3 py-2 bg-green-50 text-green-700 text-sm rounded-sm border border-green-200">
                <Clock size={14} className="mr-1.5" /> Day complete
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E5E7EB]">
          <h3 className="text-sm font-semibold text-[#111111]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Attendance History</h3>
        </div>
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading history...</div>
        ) : (
          <table className="min-w-full divide-y divide-[#E5E7EB]">
            <thead className="bg-gray-50">
              <tr>
                {['Date', 'Employee', 'Check In', 'Check Out', 'Duration', 'Location', 'Status'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {displayRecords.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-gray-400">No records found</td></tr>
              ) : (
                displayRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3.5 text-sm text-gray-700" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{rec.date}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-800 font-medium whitespace-nowrap">{rec.user_name}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{formatTime(rec.check_in)}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{formatTime(rec.check_out)}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{calcHours(rec.check_in, rec.check_out)}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-600 font-medium whitespace-nowrap">
                      <div>{rec.location || 'HQ Office'}</div>
                      {rec.verification && rec.location !== 'Work From Home' && (
                        <div className="text-[10px] mt-0.5 flex items-center space-x-1 flex-wrap">
                          {rec.verification.verified ? (
                            <span className="text-[#00B84A] font-semibold">✓ Verified</span>
                          ) : (
                            <span className="text-amber-500 font-semibold">⚠ Bypassed</span>
                          )}
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-500">
                            {rec.verification.ip_verified ? 'Office Network' : (rec.verification.location_verified ? 'GPS Range' : 'No Match')}
                          </span>
                          {rec.verification.distance_meters !== null && rec.verification.distance_meters !== undefined && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-500">{Math.round(rec.verification.distance_meters)}m</span>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="text-xs px-2 py-0.5 rounded-sm font-medium bg-green-50 text-green-700 border border-green-200 uppercase">
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Attendance;