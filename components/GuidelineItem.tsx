import React, { ReactNode } from 'react';

interface GuidelineItemProps {
  label: string;
  value?: string | ReactNode;
  children?: ReactNode;
}

export const GuidelineItem: React.FC<GuidelineItemProps> = ({ label, value, children }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start py-2">
      <dt className="w-full sm:w-1/3 font-semibold text-gray-700 dark:text-gray-200">{label}</dt>
      <dd className="w-full sm:w-2/3 text-gray-600 dark:text-gray-300 mt-1 sm:mt-0">
        {value && <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{value}</span>}
        {children}
      </dd>
    </div>
  );
};
