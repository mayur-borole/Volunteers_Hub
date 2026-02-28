import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { notificationService } from '@/services/notificationService';
import { eventService } from '@/services/eventService';
import { connectSocket } from '@/lib/socket';
import { toast } from 'react-toastify';
import {
  Bell,
  BellRing,
  Calendar,
  UserPlus,
  MessageCircle,
  AlertCircle,
  CheckCircle,
  Info,
  X,
  Trash2,
} from 'lucide-react';

interface Notification {
  _id: string;
  user: string;
  type: 'registration' | 'approval' | 'update' | 'cancellation' | 'reminder' | 'feedback' | 'system' | 'message';
  message: string;
  relatedEvent?: {
    _id: string;
    title: string;
  };
  relatedUser?: {
    _id: string;
    name?: string;
  };
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

const NotificationBell = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const socket = connectSocket();
      const handleNewNotification = (notification: Notification) => {
        setNotifications((prev) => {
          if (prev.some((item) => item._id === notification._id)) {
            return prev;
          }
          return [notification, ...prev];
        });
      };

      socket.on('newNotification', handleNewNotification);

      const interval = setInterval(fetchNotifications, 30000);

      return () => {
        clearInterval(interval);
        socket.off('newNotification', handleNewNotification);
      };
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification._id);

    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setIsOpen(false);
      return;
    }

    if (notification.relatedEvent) {
      navigate(`/events/${notification.relatedEvent._id}`);
      setIsOpen(false);
    }
  };

  const handleApproveFromNotification = async (notification: Notification) => {
    const eventId = notification.relatedEvent?._id;
    const volunteerId = notification.relatedUser?._id;
    if (!eventId || !volunteerId) return;

    try {
      await eventService.approveRegistration(eventId, volunteerId);
      await handleMarkAsRead(notification._id);
      toast.success('Volunteer approved successfully');
      fetchNotifications();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to approve volunteer');
    }
  };

  const handleRejectFromNotification = async (notification: Notification) => {
    const eventId = notification.relatedEvent?._id;
    const volunteerId = notification.relatedUser?._id;
    if (!eventId || !volunteerId) return;

    const reason = window.prompt('Optional rejection reason:', '') || '';

    try {
      await eventService.rejectRegistration(eventId, volunteerId, reason);
      await handleMarkAsRead(notification._id);
      toast.success('Volunteer request rejected');
      fetchNotifications();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to reject volunteer');
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const hasUnread = unreadCount > 0;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'registration':
        return <UserPlus className="h-5 w-5 text-green-500" />;
      case 'reminder':
        return <BellRing className="h-5 w-5 text-amber-500" />;
      case 'update':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'cancellation':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'approval':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'message':
        return <MessageCircle className="h-5 w-5 text-primary" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!user) return null;

  return (
    <div className="relative">
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <motion.div
          animate={hasUnread ? { rotate: [0, -15, 15, -15, 0] } : {}}
          transition={{ duration: 0.5, repeat: hasUnread ? Infinity : 0, repeatDelay: 5 }}
        >
          {hasUnread ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
        </motion.div>
        {hasUnread && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </Button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Notification Panel */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-96 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Notifications
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {hasUnread && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleMarkAllAsRead}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Mark all as read
                  </Button>
                )}
              </div>

              {/* Notification List */}
              <ScrollArea className="h-96">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin text-2xl mx-auto">⏳</div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Loading notifications...
                    </p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No notifications yet
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      We'll notify you about event updates and reminders
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {notifications.map((notification, index) => (
                      <motion.div
                        key={notification._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-4 hover:bg-accent/50 transition-colors cursor-pointer group ${
                          !notification.isRead ? 'bg-primary/5' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex gap-3">
                          {/* Icon */}
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="font-medium text-sm line-clamp-1">
                                {notification.type === 'registration'
                                  ? 'Volunteer Request'
                                  : notification.type === 'approval'
                                  ? 'Approval Update'
                                  : 'Notification'}
                              </p>
                              {!notification.isRead && (
                                <span className="flex-shrink-0 h-2 w-2 rounded-full bg-primary" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                              {notification.message}
                            </p>
                            {notification.relatedUser?.name && (
                              <p className="text-xs text-muted-foreground mb-2">
                                Volunteer: {notification.relatedUser.name}
                              </p>
                            )}
                            {notification.relatedEvent && (
                              <Badge variant="secondary" className="text-xs mb-2">
                                <Calendar className="h-3 w-3 mr-1" />
                                {notification.relatedEvent.title}
                              </Badge>
                            )}
                            {user?.role === 'organizer' &&
                              notification.type === 'registration' &&
                              notification.relatedEvent?._id &&
                              notification.relatedUser?._id && (
                                <div className="flex gap-2 mb-2">
                                  <Button
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleApproveFromNotification(notification);
                                    }}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleRejectFromNotification(notification);
                                    }}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {formatTime(notification.createdAt)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(notification._id);
                                }}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="p-3 border-t border-border bg-card/50 backdrop-blur-sm">
                  <Button
                    variant="ghost"
                    className="w-full text-sm"
                    onClick={() => {
                      navigate('/notifications');
                      setIsOpen(false);
                    }}
                  >
                    View All Notifications
                  </Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
