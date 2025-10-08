import React from 'react';
import { Notification } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { Icon } from '../Icons';

interface NotificationDropdownProps {
  notifications: Notification[];
  readIds: Set<string>;
  onNotificationClick: (notification: Notification) => void;
  onMarkAllRead: () => void;
  onViewAll: () => void;
  // FIX: Make the `close` prop optional. It is injected by the parent Dropdown component at runtime,
  // but TypeScript cannot infer this at compile time where the component is used in App.tsx, causing an error.
  close?: () => void; // Injected by Dropdown parent
}

const timeSince = (date: Date, t: Function) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
};

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  readIds,
  onNotificationClick,
  onMarkAllRead,
  onViewAll,
  close,
}) => {
  const { t } = useLanguage();
  const recentNotifications = notifications.slice(0, 4);

  const handleMarkAllReadClick = () => {
    onMarkAllRead();
  };

  const handleViewAllClick = () => {
    onViewAll();
    // FIX: Use optional chaining since the `close` prop is now optional.
    close?.();
  };
  
  const handleItemClick = (notification: Notification) => {
    onNotificationClick(notification);
    // FIX: Use optional chaining since the `close` prop is now optional.
    close?.();
  }

  return (
    <div className="w-80">
      <div className="flex justify-between items-center p-3 border-b dark:border-gray-600">
        <h3 className="font-semibold">{t('notifications.title')}</h3>
        <button onClick={handleMarkAllReadClick} className="text-xs text-brand-primary hover:underline">
          {t('notifications.markAllAsRead')}
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {recentNotifications.length > 0 ? (
          recentNotifications.map((notif) => {
            const isUnread = !readIds.has(notif.id);
            return (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={`p-3 border-b dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 ${isUnread ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
              >
                <p className="text-sm font-medium">{t(notif.titleKey)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {notif.docNo}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {timeSince(new Date(notif.timestamp), t)}
                </p>
              </div>
            );
          })
        ) : (
          <p className="p-4 text-center text-sm text-gray-500">{t('notifications.noNew')}</p>
        )}
      </div>
      <div className="p-2 text-center border-t dark:border-gray-600">
        <button onClick={handleViewAllClick} className="w-full text-sm font-medium text-brand-primary hover:underline">
          {t('notifications.viewAll')}
        </button>
      </div>
    </div>
  );
};