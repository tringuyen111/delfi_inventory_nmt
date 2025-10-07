import React, { ReactNode } from 'react';
// FIX: Import the newly exported IconName type for correct prop typing.
import { Icon, IconName } from './Icons';

interface SectionCardProps {
  title: string;
  // FIX: Use the explicit IconName type to resolve the type mismatch error.
  icon: IconName;
  children: ReactNode;
}

export const SectionCard: React.FC<SectionCardProps> = ({ title, icon, children }) => {
  return (
    <section className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden mb-8">
      <header className="flex items-center gap-4 p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <Icon name={icon} className="w-6 h-6 text-brand-primary" />
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h2>
      </header>
      <div className="p-6">
        {children}
      </div>
    </section>
  );
};
