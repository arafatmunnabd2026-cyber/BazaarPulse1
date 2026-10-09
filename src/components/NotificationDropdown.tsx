import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Package, 
  Clock, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Sparkles,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  OrderNotification, 
  getStoredNotifications, 
  saveNotifications,
  markAllNotificationsAsRead, 
  markNotificationAsRead, 
  deleteNotification, 
  clearAllNotifications, 
  formatRelativeTimeBengali,
  getStatusDetails
} from '../lib/notificationStore';

interface NotificationDropdownProps {
  userId?: string;
  userEmail?: string;
  authToken?: string;
  onOpenOrders?: (orderId?: string) => void;
  notify?: (msg: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  userId,
  userEmail,
  authToken,
  onOpenOrders,
  notify
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<OrderNotification[]>(() => getStoredNotifications(userId));
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync isolated user notifications directly with backend database & Supabase
  const syncWithBackend = async () => {
    if (!userId && !userEmail) return;
    try {
      const activeToken = authToken || localStorage.getItem('bazaarpulse_token') || '';
      if (!activeToken) return;

      const res = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${activeToken}`
        }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.notifications)) {
          const localList = getStoredNotifications(userId);
          const notifMap = new Map<string, OrderNotification>();
          
          localList.forEach(n => notifMap.set(n.id, n));
          
          json.notifications.forEach((n: any) => {
            notifMap.set(n.id, {
              id: n.id,
              orderId: n.orderId || n.order_id,
              userId: n.userId || n.user_id,
              type: n.type || 'status_update',
              title: n.title,
              message: n.message,
              status: n.status,
              timestamp: typeof n.timestamp === 'number' ? n.timestamp : new Date(n.created_at || Date.now()).getTime(),
              read: Boolean(n.read || n.is_read)
            });
          });

          const merged = Array.from(notifMap.values()).sort((a, b) => b.timestamp - a.timestamp);
          saveNotifications(merged);
          setNotifications(merged.filter(n => !userId || n.userId === userId || n.userId === 'all'));
        }
      }
    } catch (e) {
      // silent network fallback
    }
  };

  // Sync notifications on mount, when custom event fires, or on periodic 8s real-time timer
  useEffect(() => {
    const handleUpdate = () => {
      setNotifications(getStoredNotifications(userId));
    };

    const handleOrderStatusEvent = () => {
      syncWithBackend();
      handleUpdate();
    };

    window.addEventListener('bazaarpulse-notifications-updated', handleUpdate);
    window.addEventListener('bazaarpulse-order-status-updated', handleOrderStatusEvent);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('focus', syncWithBackend);

    // Initial fetch from backend database
    syncWithBackend();

    // 8-second real-time sync timer so the counter and list update without page refresh
    const pollInterval = setInterval(() => {
      syncWithBackend();
    }, 8000);

    // Supabase Realtime Channel Subscription for User-Isolated Live Notifications
    if (supabase && (userId || userEmail)) {
      const channelId = `user-notifications-${userId || userEmail}`;
      const channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications'
          },
          (payload: any) => {
            const newNotif = payload.new as any;
            if (!newNotif) return;
            const targetUserId = String(newNotif.user_id || newNotif.userId || '');
            const targetEmail = String(newNotif.user_email || newNotif.userEmail || '').toLowerCase();
            const myEmail = (userEmail || '').toLowerCase();

            // Strict User Isolation Check
            const isMatch = 
              (userId && targetUserId === String(userId)) ||
              (myEmail && targetEmail && targetEmail === myEmail) ||
              targetUserId === 'all';

            if (isMatch) {
              const incoming: OrderNotification = {
                id: newNotif.id,
                orderId: newNotif.order_id || newNotif.orderId,
                userId: targetUserId,
                type: newNotif.type || 'status_update',
                title: newNotif.title,
                message: newNotif.message,
                status: newNotif.status,
                timestamp: new Date(newNotif.created_at || newNotif.timestamp || Date.now()).getTime(),
                read: Boolean(newNotif.is_read || newNotif.read)
              };

              setNotifications(prev => {
                if (prev.some(n => n.id === newNotif.id)) return prev;
                return [incoming, ...prev];
              });

              // Also persist in local storage
              const currentLocal = getStoredNotifications(userId);
              if (!currentLocal.some(n => n.id === newNotif.id)) {
                saveNotifications([incoming, ...currentLocal]);
              }
            }
          }
        )
        .subscribe();

      return () => {
        window.removeEventListener('bazaarpulse-notifications-updated', handleUpdate);
        window.removeEventListener('bazaarpulse-order-status-updated', handleOrderStatusEvent);
        window.removeEventListener('storage', handleUpdate);
        window.removeEventListener('focus', syncWithBackend);
        clearInterval(pollInterval);
        if (supabase) {
          supabase.removeChannel(channel);
        }
      };
    }

    return () => {
      window.removeEventListener('bazaarpulse-notifications-updated', handleUpdate);
      window.removeEventListener('bazaarpulse-order-status-updated', handleOrderStatusEvent);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('focus', syncWithBackend);
      clearInterval(pollInterval);
    };
  }, [userId, userEmail, authToken]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleToggle = () => {
    setIsOpen(prev => {
      const nextState = !prev;
      if (nextState) {
        syncWithBackend();
      }
      return nextState;
    });
  };

  const handleMarkAllRead = () => {
    const updated = markAllNotificationsAsRead(userId);
    setNotifications(updated);
    if (notify) notify('✅ সব নোটিফিকেশন পঠিত হিসেবে চিহ্নিত করা হয়েছে');

    try {
      const activeToken = authToken || localStorage.getItem('bazaarpulse_token') || '';
      if (activeToken) {
        fetch('/api/notifications/read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeToken}`
          },
          body: JSON.stringify({})
        }).catch(() => {});
      }
    } catch (e) {}
  };

  const handleClearAll = () => {
    clearAllNotifications();
    setNotifications([]);
    if (notify) notify('🧹 নোটিফিকেশন বক্স সম্পূর্ণ খালি করা হয়েছে');
  };

  const handleNotificationClick = (notif: OrderNotification) => {
    if (!notif.read) {
      const updated = markNotificationAsRead(notif.id);
      setNotifications(updated);

      try {
        const activeToken = authToken || localStorage.getItem('bazaarpulse_token') || '';
        if (activeToken) {
          fetch('/api/notifications/read', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${activeToken}`
            },
            body: JSON.stringify({ notificationId: notif.id })
          }).catch(() => {});
        }
      } catch (e) {}
    }
    if (notif.orderId && onOpenOrders) {
      setIsOpen(false);
      onOpenOrders(notif.orderId);
    }
  };

  const handleDeleteItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = deleteNotification(id);
    setNotifications(updated);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="relative p-1.5 sm:p-2 text-gray-700 hover:text-[#f85606] transition-all duration-300 ease-out flex items-center justify-center rounded-full hover:bg-orange-50 hover:scale-110 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 cursor-pointer shrink-0"
        aria-label="Notifications"
        title="নোটিফিকেশন (Notifications)"
      >
        <Bell className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform ${isOpen ? 'scale-110 text-[#f85606]' : ''}`} />
        
        {/* Unread Counter Badge - Exactly like reference image */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#e61838] text-white text-[10px] sm:text-[11px] min-w-[18px] sm:min-w-[20px] h-[18px] sm:h-[20px] px-1 rounded-full flex items-center justify-center font-black shadow-[0_2px_5px_rgba(230,24,56,0.45)] border-[1.5px] border-white leading-none select-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-14 sm:top-full mt-1 sm:mt-2 w-auto sm:w-[380px] max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-left flex flex-col max-h-[80vh] sm:max-h-[85vh]"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-orange-50/70 via-white to-amber-50/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#f85606]/10 text-[#f85606] flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    <span>নোটিফিকেশন</span>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                        {unreadCount} নতুন
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">অর্ডার এবং স্ট্যাটাস আপডেট</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    title="সব পঠিত করুন"
                    className="p-1.5 text-xs text-slate-500 hover:text-[#f85606] hover:bg-orange-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-[11px]">পঠিত</span>
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    title="সব মুছুন"
                    className="p-1.5 text-xs text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1">
              {notifications.length === 0 ? (
                <div className="py-10 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2.5">
                    <Bell className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-700">কোনো নোটিফিকেশন নেই</h4>
                </div>
              ) : (
                notifications.map((notif) => {
                  const statusInfo = notif.status ? getStatusDetails(notif.status) : null;
                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3 sm:p-3.5 rounded-xl transition-all cursor-pointer group relative flex gap-3 ${
                        !notif.read ? 'bg-orange-50/40 hover:bg-orange-50/70 border border-orange-100/80 my-1' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                        notif.type === 'system' || notif.message.includes('স্বাগতম')
                          ? 'bg-orange-100 text-[#f85606]'
                          : notif.type === 'order_success' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : notif.status === 'delivered'
                          ? 'bg-emerald-100 text-emerald-700' 
                          : notif.status === 'cancelled'
                          ? 'bg-rose-100 text-rose-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {notif.type === 'system' || notif.message.includes('স্বাগতম') ? (
                          <Sparkles className="w-4 h-4" />
                        ) : notif.type === 'order_success' ? (
                          <Package className="w-4 h-4" />
                        ) : notif.status === 'delivered' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : notif.status === 'cancelled' ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          <Truck className="w-4 h-4" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1.5 mb-1">
                          <h4 className={`text-sm leading-snug line-clamp-2 ${notif.title === 'Welcome' || notif.type === 'system' ? 'font-black tracking-tight text-slate-950' : 'font-bold text-black'}`}>
                            {notif.title}
                          </h4>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteItem(e, notif.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 p-0.5 rounded transition-opacity cursor-pointer shrink-0"
                            title="মুছুন"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <p className="text-sm font-medium text-black leading-relaxed line-clamp-3">
                          {notif.message}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 text-xs">
                          <div className="flex items-center gap-1.5">
                            {statusInfo && (
                              <span className={`px-1.5 py-0.5 rounded-md font-medium text-black border ${statusInfo.color}`}>
                                {statusInfo.icon} {statusInfo.label}
                              </span>
                            )}
                            <span className="text-black font-medium">
                              {formatRelativeTimeBengali(notif.timestamp)}
                            </span>
                          </div>

                          {notif.orderId && (
                            <span className="text-black font-medium flex items-center gap-0.5 group-hover:underline">
                              অর্ডার ট্র্যাক করুন <ExternalLink className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Unread Indicator Dot */}
                      {!notif.read && (
                        <div className="absolute top-3 right-2.5 w-2 h-2 rounded-full bg-[#f85606] shadow-xs ring-2 ring-white" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    if (onOpenOrders) onOpenOrders();
                  }}
                  className="text-xs font-bold text-[#f85606] hover:text-[#e04d05] transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5" />
                  আমার সকল অর্ডার ও ট্র্যাকিং দেখুন →
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
