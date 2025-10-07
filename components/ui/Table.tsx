import React from 'react';
import { Icon, IconName } from '../Icons';

export interface RowAction<T> {
  key: string;
  icon: IconName;
  tooltip: string;
  action: (item: T) => void;
}

export interface Column<T> {
  key: keyof T | 'actions' | 'item';
  header: string;
  width?: number;
  // FIX: Update the `render` function signature to accept an optional `index` argument. This allows child components to use the row index for actions like editing or deleting specific items, resolving TypeScript errors.
  render?: (item: T, index?: number) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  freeze?: 'left';
}

interface TableProps<T extends { id: string | number }> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  onRowDoubleClick?: (item: T) => void;
  footerData?: Record<string, string | number>;
  rowActions?: RowAction<T>[];
}

export const Table = <T extends { id: string | number }>({
  columns,
  data,
  onRowClick,
  onRowDoubleClick,
  footerData,
  rowActions,
}: TableProps<T>) => {
  const hasRowActions = rowActions && rowActions.length > 0;
  // FIX: Explicitly type `allColumns` as `Column<T>[]`. This ensures that all elements,
  // including the dynamically added action column, are treated as the same type,
  // resolving the error where the optional `freeze` property was not found.
  const allColumns: Column<T>[] = hasRowActions ? [...columns, { key: 'actions', header: '', width: (rowActions.length * 40) }] : columns;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            {allColumns.map((col, index) => (
              <th
                key={String(col.key)}
                scope="col"
                className={`px-6 py-3 whitespace-nowrap ${col.freeze === 'left' ? 'sticky left-0 bg-gray-50 dark:bg-gray-700 z-10' : ''}`}
                style={{ width: col.width ? `${col.width}px` : 'auto' }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, itemIndex) => (
            <tr
              key={item.id}
              className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              onClick={() => onRowClick?.(item)}
              onDoubleClick={() => onRowDoubleClick?.(item)}
            >
              {columns.map((col, index) => (
                <td
                  key={`${item.id}-${String(col.key)}`}
                  className={`px-6 py-4 align-top text-${col.align || 'left'} ${col.freeze === 'left' ? 'sticky left-0 bg-white dark:bg-gray-800 z-10' : ''}`}
                >
                  {/* FIX: Pass the `itemIndex` to the `render` function to align with the updated type definition. This enables components using the table to access the row index for operations like editing or deleting. */}
                  {col.render ? col.render(item, itemIndex) : (item[col.key as keyof T] as React.ReactNode) || '—'}
                </td>
              ))}
              {hasRowActions && (
                <td className="px-6 py-4 align-top text-right">
                    <div className="flex items-center justify-end gap-2">
                        {rowActions.map(action => (
                            <button key={action.key} onClick={(e) => { e.stopPropagation(); action.action(item); }} title={action.tooltip} className="p-1.5 text-gray-500 hover:text-brand-primary dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                                <Icon name={action.icon} className="w-4 h-4" />
                            </button>
                        ))}
                    </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        {footerData && (
          <tfoot className="font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700">
            <tr>
              {columns.map(col => (
                <td key={`footer-${String(col.key)}`} className={`px-6 py-3 text-sm text-${col.align || 'left'}`}>
                  {footerData[String(col.key)] ?? ''}
                </td>
              ))}
               {hasRowActions && <td></td>}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};
