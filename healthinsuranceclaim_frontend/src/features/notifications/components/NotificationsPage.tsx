import { useState } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, IconButton, Chip, Alert } from '@mui/material';
import { MarkEmailRead, Notifications } from '@mui/icons-material';
import { notificationApi, type Notification } from '../../../shared/services/notificationApi';
import { useApiCache } from '../../../shared/hooks/useApiCache';

export const NotificationsPage = () => {
  const { data: notifications = [], loading } = useApiCache(
    'notifications',
    notificationApi.getNotifications
  );
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState('');

  // Use local state to track read status changes
  const displayNotifications = localNotifications.length > 0 ? localNotifications : (notifications || []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationApi.markAsRead(id);
      const updatedNotifications = displayNotifications.map(notif => 
        notif.id === id ? { ...notif, isRead: true } : notif
      );
      setLocalNotifications(updatedNotifications);
    } catch (error) {
      setError('Failed to mark notification as read');
    }
  };

  const getNotificationTypeName = (type: number) => {
    switch (type) {
      case 1: return 'PolicyPurchase';
      case 2: return 'ClaimSubmitted';
      case 3: return 'ClaimStatusUpdate';
      case 4: return 'PaymentReceived';
      default: return 'Unknown';
    }
  };

  const getNotificationTypeColor = (type: number) => {
    switch (type) {
      case 1: return 'success'; // PolicyPurchase
      case 2: return 'info';    // ClaimSubmitted
      case 3: return 'primary'; // ClaimStatusUpdate
      case 4: return 'success'; // PaymentReceived
      default: return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        <Notifications sx={{ mr: 1, verticalAlign: 'middle' }} />
        Notifications
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper>
        {(!displayNotifications || displayNotifications.length === 0) && !loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No notifications found
            </Typography>
          </Box>
        ) : (
          <List>
            {displayNotifications.map((notification, index) => (
              <ListItem
                key={notification.id}
                sx={{
                  borderBottom: index < displayNotifications.length - 1 ? 1 : 0,
                  borderColor: 'divider',
                  bgcolor: notification.isRead ? 'transparent' : 'action.hover'
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 500 }}>
                        {notification.title}
                      </span>
                      <Chip
                        label={getNotificationTypeName(notification.type)}
                        size="small"
                        color={getNotificationTypeColor(notification.type) as any}
                      />
                      {!notification.isRead && (
                        <Chip label="New" size="small" color="secondary" />
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      <span style={{ display: 'block', marginTop: '8px', fontSize: '0.875rem' }}>
                        {notification.message}
                      </span>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </>
                  }
                />
                {!notification.isRead && (
                  <IconButton
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
      </Paper>
    </Box>
  );
};