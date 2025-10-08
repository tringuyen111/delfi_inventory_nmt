import React from 'react';
import { Column } from './Table';
import { useLanguage } from '../../hooks/useLanguage';

interface ColumnVisibilityDropdownProps {
  allColumns: Column<any>[];
  visibleColumnKeys: Set<string>;
  onColumnToggle: (columnKey: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
}

export const ColumnVisibilityDropdown: React.FC<ColumnVisibilityDropdownProps> = ({
  allColumns,
  visibleColumnKeys,
  onColumnToggle,
  onShowAll,
  onHideAll,
}) => {
  const { t } = useLanguage();

  return (
    <div className="p-2 space-y-2 w-64">
      <div className="flex justify-between items-center px-2">
        <button onClick={onShowAll} className="text-xs font-medium text-brand-primary hover:underline">{t('common.showAll')}</button>
        <button onClick={onHideAll} className="text-xs font-medium text-brand-primary hover:underline">{t('common.hideAll')}</button>
      </div>
      <hr className="dark:border-gray-600"/>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {allColumns.map(column => (
          <label key={column.key as string} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={visibleColumnKeys.has(column.key as string)}
              onChange={() => onColumnToggle(column.key as string)}
              className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
            />
            <span>{column.header}</span>
          </label>
        ))}
      </div>
    </div>
  );
};
