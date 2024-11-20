'use client';

import { useState, useEffect } from 'react';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const profileResponse = await fetch('/api/auth/profile');
      const profileData = await profileResponse.json();
      
      if (!profileData?.profileId) {
        console.error('No profile ID found');
        return;
      }

      const notificationsResponse = await fetch(`/api/notification?profile_id=${profileData.profileId}`);
      const data = await notificationsResponse.json();
      
      console.log('Fetched notifications:', data);

      if (Array.isArray(data)) {
        setNotifications(data);
        const unreadNotifications = data.filter((n: any) => !n.is_read);
        setUnreadCount(unreadNotifications.length);
        console.log('Unread count:', unreadNotifications.length);
      } else {
        console.error('Notifications data is not an array:', data);
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notification?id=${notificationId}`, {
        method: 'PATCH',
      });
      
      if (response.ok) {
        console.log('Notification marked as read:', notificationId);
        await fetchNotifications();
      } else {
        console.error('Failed to mark notification as read');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <div className="position-relative">
      <button 
        className="btn btn-link text-dark p-2"
        onClick={() => {
          setIsOpen(!isOpen);
          console.log('Notifications panel toggled:', !isOpen);
        }}
      >
        <i className="bi bi-bell fs-5"></i>
        {unreadCount > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="position-absolute end-0 mt-2 bg-white rounded-3 shadow-lg" style={{ width: '320px', zIndex: 1000 }}>
          <div className="p-3">
            <h6 className="mb-3">Notifications ({notifications.length})</h6>
            {notifications.length === 0 ? (
              <p className="text-muted mb-0">No notifications</p>
            ) : (
              <div className="d-flex flex-column gap-2">
                {notifications.map((notification: any) => (
                  <div 
                    key={notification.id_notification}
                    className={`p-2 rounded cursor-pointer ${notification.is_read ? 'bg-light' : 'bg-light-info'}`}
                    onClick={() => markAsRead(notification.id_notification)}
                    style={{ cursor: 'pointer' }}
                  >
                    <p className="mb-1 small">{notification.message}</p>
                    <small className="text-muted">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;