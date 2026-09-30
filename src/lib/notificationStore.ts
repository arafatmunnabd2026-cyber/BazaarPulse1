/**
 * BazaarPulse Notification Store & 12-Hour Auto-Cleanup Engine
 */

export interface OrderNotification {
  id: string;
  orderId?: string;
  userId?: string;
  type: 'order_success' | 'status_update' | 'order_cancel' | 'system';
  title: string;
  message: string;
  status?: string;
  timestamp: number;
  read: boolean;
}

const STORAGE_KEY = 'bazaarpulse_notifications';
export const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

export const getStatusDetails = (status: string) => {
  const s = (status || '').toLowerCase().trim();
  switch (s) {
    case 'pending':
      return { label: 'অপেক্ষমাণ (Pending)', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: '⏳' };
    case 'processing':
    case 'confirmed':
      return { label: 'প্রক্রিয়াধীন (Processing)', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '⚙️' };
    case 'shipped':
    case 'in_transit':
    case 'on_the_way':
      return { label: 'ডেলিভারির পথে (Shipped)', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: '🚚' };
    case 'delivered':
      return { label: 'ডেলিভারি সম্পন্ন (Delivered)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: '✅' };
    case 'cancelled':
    case 'canceled':
      return { label: 'বাতিল করা হয়েছে (Cancelled)', color: 'bg-rose-100 text-rose-800 border-rose-200', icon: '❌' };
    default:
      return { label: status, color: 'bg-slate-100 text-slate-800 border-slate-200', icon: '📦' };
  }
};

/**
 * Filter out notifications older than 12 hours
 */
export const pruneExpiredNotifications = (list: OrderNotification[]): OrderNotification[] => {
  if (!Array.isArray(list)) return [];
  const now = Date.now();
  return list.filter(item => {
    if (!item.timestamp) return false;
    return (now - item.timestamp) < TWELVE_HOURS_MS;
  });
};

/**
 * Get all active notifications (within last 12 hours)
 */
export const getStoredNotifications = (userId?: string): OrderNotification[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    // Auto-prune items older than 12 hours
    const active = pruneExpiredNotifications(parsed);
    if (active.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
    }

    if (userId) {
      return active.filter(n => !n.userId || n.userId === userId || n.userId === 'all');
    }
    return active;
  } catch (e) {
    console.error('Error loading notifications:', e);
    return [];
  }
};

/**
 * Save notifications list after pruning
 */
export const saveNotifications = (notifications: OrderNotification[]): void => {
  try {
    const valid = pruneExpiredNotifications(notifications);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    window.dispatchEvent(new CustomEvent('bazaarpulse-notifications-updated', { detail: valid }));
  } catch (e) {
    console.error('Error saving notifications:', e);
  }
};

/**
 * Add an Order Placed Success Notification
 */
export const addOrderSuccessNotification = (order: any, userId?: string): OrderNotification => {
  const current = getStoredNotifications();
  const orderId = order?.id || order?.orderId || 'ORD-' + Date.now();
  const total = order?.totalAmount || order?.total || 0;
  
  const newNotif: OrderNotification = {
    id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    orderId: String(orderId),
    userId: userId || order?.userId || (order?.customer && order.customer.id) || undefined,
    type: 'order_success',
    title: '🎉 আপনার অর্ডারটি সফলভাবে সম্পন্ন হয়েছে!',
    message: `অর্ডার নম্বর #${orderId} সফলভাবে গ্রহণ করা হয়েছে। মোট প্রদেয় মূল্য ৳${total}। দ্রুত আপনার ঠিকানায় পাঠানো হবে।`,
    status: 'pending',
    timestamp: Date.now(),
    read: false
  };

  const updated = [newNotif, ...current];
  saveNotifications(updated);
  return newNotif;
};

/**
 * Add an Order Status Update Notification (triggered by Admin)
 */
export const addOrderStatusNotification = (orderId: string, newStatus: string, userId?: string): OrderNotification => {
  const current = getStoredNotifications();
  const statusInfo = getStatusDetails(newStatus);
  
  const newNotif: OrderNotification = {
    id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    orderId: String(orderId),
    userId: userId || undefined,
    type: 'status_update',
    title: `📦 অর্ডার স্ট্যাটাস আপডেট: #${orderId}`,
    message: `আপনার অর্ডার #${orderId} এর বর্তমান অবস্থা পরিবর্তন হয়ে "${statusInfo.label}" হয়েছে।`,
    status: newStatus,
    timestamp: Date.now(),
    read: false
  };

  // Avoid duplicate identical notifications within 1 minute
  const isDuplicate = current.some(n => 
    n.orderId === orderId && 
    n.status === newStatus && 
    (Date.now() - n.timestamp) < 60000
  );

  if (!isDuplicate) {
    const updated = [newNotif, ...current];
    saveNotifications(updated);
  }
  return newNotif;
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = (userId?: string): OrderNotification[] => {
  const current = getStoredNotifications();
  const updated = current.map(n => {
    if (!userId || !n.userId || n.userId === userId || n.userId === 'all') {
      return { ...n, read: true };
    }
    return n;
  });
  saveNotifications(updated);
  return updated;
};

/**
 * Mark a single notification as read
 */
export const markNotificationAsRead = (notifId: string): OrderNotification[] => {
  const current = getStoredNotifications();
  const updated = current.map(n => n.id === notifId ? { ...n, read: true } : n);
  saveNotifications(updated);
  return updated;
};

/**
 * Delete a specific notification
 */
export const deleteNotification = (notifId: string): OrderNotification[] => {
  const current = getStoredNotifications();
  const updated = current.filter(n => n.id !== notifId);
  saveNotifications(updated);
  return updated;
};

/**
 * Clear all notifications
 */
export const clearAllNotifications = (): void => {
  saveNotifications([]);
};

/**
 * Format relative time in Bengali
 */
export const formatRelativeTimeBengali = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'এইমাত্র';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} মিনিট আগে`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ঘণ্টা আগে`;
  return `${Math.floor(hours / 24)} দিন আগে`;
};
