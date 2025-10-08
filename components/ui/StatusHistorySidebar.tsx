
import React from 'react';
import { StatusHistoryEvent } from '../../types';
import { SectionCard } from '../SectionCard';
import { Icon } from '../Icons';
import { StatusBadge } from './StatusBadge';
import { useLanguage } from '../../hooks/useLanguage';

interface StatusHistorySidebarProps {
  history: StatusHistoryEvent[];
}

export const StatusHistorySidebar: React.FC<StatusHistorySidebarProps> = ({ history = [] }) => {
  const { t } = useLanguage();
  return (
    <SectionCard title={t('form.section.statusHistory')} icon="History">
      <div className="max-h-[60vh] overflow-y-auto pr-2 -mr-2">
        <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-2">
          {history.length > 0 ? history.slice().reverse().map(event => (
            <li key={event.id} className="mb-6 ml-6">
              <span className="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -left-3 ring-8 ring-white dark:ring-gray-800 dark:bg-blue-900">
                <Icon name="CheckCircle" className="w-3 h-3 text-blue-800 dark:text-blue-300" />
              </span>
              <div className="flex items-center mb-1">
                <StatusBadge status={event.status} />
              </div>
              <time className="block mb-2 text-xs font-normal leading-none text-gray-400 dark:text-gray-500">
                on {new Date(event.timestamp).toLocaleString()} by {event.user}
              </time>
              {event.note && <p className="text-sm font-normal text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md">{event.note}</p>}
            </li>
          )) : (
            <p className="text-sm text-gray-500">{t('pages.goodsReceipt.modal.noHistory')}</p>
          )}
        </ol>
      </div>
    </SectionCard>
  );
};
