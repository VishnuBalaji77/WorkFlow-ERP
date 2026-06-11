import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Bell, Check, Clock, MailOpen } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'sonner';

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
      toast.success('Notification marked as read');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => api.put(`/notifications/${n.id}/read`)));
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update notifications');
    }
  };

  return (
    <div className="space-y-5" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#111111]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Notifications</h2>
          <p className="text-sm text-gray-500 mt-0.5">Stay updated with activities and requests</p>
        </div>
        {notifications.some(n => !n.read) && (
          <button onClick={handleMarkAllRead} className="text-xs text-[#0020F5] hover:underline flex items-center font-medium">
            <MailOpen size={14} className="mr-1.5" /> Mark all as read
          </button>
        )}
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-400">
              <Bell size={20} strokeWidth={1.5} />
            </div>
            <p className="text-sm text-gray-400">All caught up! No notifications yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F3F4F6]">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-5 flex items-start space-x-4 transition-colors ${
                  notif.read ? 'bg-white' : 'bg-blue-50 bg-opacity-30'
                }`}
              >
                <div className={`w-9 h-9 rounded-sm flex items-center justify-center flex-shrink-0 ${
                  notif.read ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-[#0020F5]'
                }`}>
                  <Bell size={16} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <p className={`text-sm ${notif.read ? 'text-gray-600' : 'text-[#111111] font-medium'}`}>
                      {notif.message}
                    </p>
                    {!notif.read && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="p-1 text-gray-400 hover:text-[#0020F5] hover:bg-gray-50 rounded-sm transition-colors flex-shrink-0"
                        title="Mark as read"
                      >
                        <Check size={14} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs text-gray-400 mt-1.5" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                    <Clock size={11} />
                    <span>{new Date(notif.created_at || Date.now()).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;