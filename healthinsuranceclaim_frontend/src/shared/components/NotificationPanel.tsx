import { useState, useEffect } from 'react';
import { Box, Typography, List, ListItem, ListItemText, IconButton, Chip, Alert, Badge } from '@mui/material';
import { MarkEmailRead, Notifications } from '@mui/icons-material';
import { notificationApi, type Notification } from '../services/notificationApi';

export const NotificationPanel = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await notificationApi.getNotifications();
      console.log('Notification data:', data);
      setNotifications(data);
    } catch (error) {
      setError('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(notifications.map(notif => 
        notif.id === id ? { ...notif, isRead: true } : notif
      ));
    } catch (error) {
      setError('Failed to mark notification as read');
    }
  };

  const getNotificationTypeLabel = (type: number | string) => {
    const typeNum = typeof type === 'string' ? parseInt(type) : type;
    switch (typeNum) {
      case 1: return 'Policy Purchase';
      case 2: return 'Claim Submitted';
      case 3: return 'Claim Status Update';
      case 4: return 'Payment Received';
      default: return 'Notification';
    }
  };

  const getNotificationTypeColor = (type: number | string) => {
    const typeNum = typeof type === 'string' ? parseInt(type) : type;
    switch (typeNum) {
      case 1: return 'success'; 
      case 2: return 'info';   
      case 3: return 'primary'; 
      case 4: return 'success'; 
      default: return 'default';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Badge badgeContent={unreadCount} color="error">
          <Notifications sx={{ mr: 1 }} />
        </Badge>
        <Typography variant="h6">Notifications</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {notifications.length === 0 && !loading ? (
        <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            No notifications
          </Typography>
        </Box>
      ) : (
        <List sx={{ maxHeight: 400, overflow: 'auto' }}>
          {notifications.slice(0, 5).map((notification) => (
            <ListItem
              key={notification.id}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                mb: 1,
                bgcolor: notification.isRead ? 'transparent' : 'action.hover'
              }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle2">
                      {notification.title}
                    </Typography>
                    <Chip
                      label={getNotificationTypeLabel(notification.type)}
                      size="small"
                      color={getNotificationTypeColor(notification.type) as any}
                    />
                    {!notification.isRead && (
                      <Chip label="New" size="small" color="secondary" />
                    )}
                  </Box>
                }
                secondary={
                  <Box component="div">
                    <Box component="span" sx={{ display: 'block', mb: 0.5, fontSize: '0.875rem' }}>
                      {notification.message}
                    </Box>
                    <Box component="span" sx={{ display: 'block', fontSize: '0.75rem', color: 'text.secondary' }}>
                      {new Date(notification.createdAt).toLocaleString()}
                    </Box>
                  </Box>
                }
              />
              {!notification.isRead && (
                <IconButton
                  size="small"
                  onClick={() => handleMarkAsRead(notification.id)}
                  color="primary"
                >
                  <MarkEmailRead />
                </IconButton>
              )}
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};