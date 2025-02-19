import React, { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { Button } from "./button";
import { supabase } from '@/lib/supabase';
import { Bell, Check, DollarSign, Receipt, Wallet, UserPlus } from 'lucide-react';
import { Badge } from './badge';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  description: string;
  type: 'sale' | 'expense' | 'deposit' | 'approval';
  is_read: boolean;
  created_at: string;
  metadata: any;
}

interface NotificationsDialogProps {
  userId: string;
}

const NotificationsDialog: React.FC<NotificationsDialogProps> = ({ userId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    
    try {
      const { data: notificationsData, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!notificationsData) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const processedNotifications: Notification[] = notificationsData.map(notification => ({
        id: String(notification.id),
        title: String(notification.title),
        description: String(notification.description),
        type: notification.type as 'sale' | 'expense' | 'deposit' | 'approval',
        is_read: Boolean(notification.is_read),
        created_at: String(notification.created_at),
        metadata: notification.metadata,
      }));

      setNotifications(processedNotifications);
      setUnreadCount(processedNotifications.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [userId]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, is_read: true }
          : notification
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) throw error;
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );

      // Notify parent component
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Initial fetch when dialog opens
      fetchNotifications();

      // Set up auto-refresh interval (every 30 seconds)
      const refreshInterval = setInterval(fetchNotifications, 30000);

      // Subscribe to real-time changes
      const channel = supabase
        .channel('notifications-dialog')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'notifications' },
          () => fetchNotifications()
        )
        .subscribe();

      // Cleanup function
      return () => {
        clearInterval(refreshInterval);
        channel.unsubscribe();
      };
    }
  }, [isOpen, fetchNotifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <DollarSign className="h-4 w-4" />;
      case 'expense':
        return <Receipt className="h-4 w-4" />;
      case 'deposit':
        return <Wallet className="h-4 w-4" />;
      case 'approval':
        return <UserPlus className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="relative"
          disabled={!userId}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 rounded-full"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Notifications</DialogTitle>
            {notifications.some(n => !n.is_read) && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={markAllAsRead}
              >
                Mark all as read
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No notifications
            </p>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  notification.is_read ? 'bg-background' : 'bg-muted'
                }`}
              >
                <div className={`p-2 rounded-full ${
                  notification.is_read ? 'bg-muted' : 'bg-primary/10'
                }`}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium truncate">
                      {notification.title}
                    </p>
                    {!notification.is_read && (
                      <Badge 
                        variant="secondary"
                        className="shrink-0"
                      >
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {notification.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDate(notification.created_at)}
                  </p>
                </div>
                {!notification.is_read && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => markAsRead(notification.id)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationsDialog; 