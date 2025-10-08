import React, { useState, useMemo } from 'react';
import { Notification } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { Pagination } from '../components/ui/Pagination';
import { Table, Column } from '../components/ui/Table';
import { DateRangePicker } from '../components/ui/DateRangePicker';
import { Icon } from '../components/Icons';

interface NotificationsPageProps {
  allNotifications: Notification[];
  readIds: Set<string>;
  onNotificationClick: (notification: Notification) => void;
}

const ITEMS_PER_PAGE = 10;

const NotificationsPage: React.FC<NotificationsPageProps> = ({ allNotifications, readIds, onNotificationClick }) => {
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

  const filteredNotifications = useMemo(() => {
    return allNotifications
      .filter(notif => {
        if (statusFilter === 'read') return readIds.has(notif.id);
        if (statusFilter === 'unread') return !readIds.has(notif.id);
        return true;
      })
      .filter(notif => {
        const [from, to] = dateRange;
        if (!from && !to) return true;
        const notifDate = new Date(notif.timestamp);

        if (from && notifDate < from) {
            return false;
        }

        if (to) {
            const toEndOfDay = new Date(to);
            toEndOfDay.setHours(23, 59, 59, 999);
            if (notifDate > toEndOfDay) {
                return false;
            }
        }
        return true;
      });
  }, [allNotifications, readIds, statusFilter, dateRange]);

  const paginatedNotifications = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredNotifications.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredNotifications, currentPage]);

  const totalPages = Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE);

  const columns: Column<Notification>[] = [
    {
      key: 'status',
      header: '',
      render: (notif) => (
        !readIds.has(notif.id) && <span className="block w-2.5 h-2.5 bg-brand-primary rounded-full" title="Unread"></span>
      )
    },
    { key: 'title', header: t('notifications.table.title'), render: (notif) => t(notif.titleKey) },
    { key: 'docNo', header: t('notifications.table.document'), render: (notif) => <span className="font-mono">{notif.docNo}</span> },
    { key: 'timestamp', header: t('notifications.table.date'), render: (notif) => new Date(notif.timestamp).toLocaleString() }
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        <header className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold">{t('notifications.allNotifications')}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium">{t('notifications.filterByStatus')}:</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | 'read' | 'unread')} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none">
                    <option value="all">{t('notifications.all')}</option>
                    <option value="unread">{t('notifications.unread')}</option>
                    <option value="read">{t('notifications.read')}</option>
                </select>
            </div>
             <div className="flex items-center gap-2 w-72">
                 <label className="text-sm font-medium">{t('common.filter')} by Date:</label>
                <DateRangePicker value={dateRange} onChange={setDateRange} />
             </div>
          </div>
        </header>
        
        {filteredNotifications.length > 0 ? (
          <Table<Notification>
            columns={columns}
            data={paginatedNotifications}
            onRowClick={onNotificationClick}
          />
        ) : (
          <div className="text-center py-16">
            <Icon name="Bell" className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mt-4">{t('notifications.noNotifications')}</h3>
          </div>
        )}

        {totalPages > 1 && (
          <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </footer>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;