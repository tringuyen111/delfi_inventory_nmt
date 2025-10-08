import React, { ReactNode } from 'react';
import { Icon, IconName } from './Icons';

interface SectionCardProps {
  title: ReactNode;
  icon: IconName;
  children: ReactNode;
  actions?: ReactNode;
}

export const SectionCard: React.FC<SectionCardProps> = ({ title, icon, children, actions }) => {
  return (
    <section className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
      <header className="flex items-center justify-between gap-4 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <Icon name={icon} className="w-5 h-5 text-brand-primary" />
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">{title}</h2>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <div className="p-6">
        {children}
      </div>
    </section>
  );
};
