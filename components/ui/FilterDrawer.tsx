

import React, { useState, useEffect } from 'react';
import { Icon } from '../Icons';
import { useLanguage } from '../../hooks/useLanguage';

// FIX: Update FilterOption to support different input types like text, number, and toggle.
interface FilterOption {
    key: string;
    label: string;
    options?: string[];
    optionLabels?: Map<string, string>;
    type?: 'checkbox' | 'text' | 'number' | 'toggle';
    default?: any;
}

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: Record<string, any>;
  onApplyFilters: (newFilters: Record<string, any>) => void;
  onClearFilters: () => void;
  filterOptions: FilterOption[];
}

export const FilterDrawer: React.FC<FilterDrawerProps> = ({ isOpen, onClose, filters, onApplyFilters, onClearFilters, filterOptions }) => {
  const { t } = useLanguage();
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, isOpen]);
  
  const handleCheckboxChange = (key: string, option: string) => {
    const currentValues = (localFilters[key] as string[]) || [];
    const newValues = currentValues.includes(option)
      ? currentValues.filter(v => v !== option)
      : [...currentValues, option];
    setLocalFilters({ ...localFilters, [key]: newValues });
  };
  
  const handleApply = () => {
      onApplyFilters(localFilters);
      onClose();
  };
  
  const handleClear = () => {
      onClearFilters();
      onClose();
  }

  const renderFilterInput = (filter: FilterOption) => {
    const filterType = filter.type || 'checkbox';
    
    switch (filterType) {
        case 'text':
            return (
                <input
                    type="text"
                    value={localFilters[filter.key] || ''}
                    onChange={(e) => setLocalFilters({ ...localFilters, [filter.key]: e.target.value })}
                    className="w-full text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary"
                />
            );
        case 'number':
             return (
                <input
                    type="number"
                    value={localFilters[filter.key] ?? filter.default ?? ''}
                    onChange={(e) => setLocalFilters({ ...localFilters, [filter.key]: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary"
                />
            );
        case 'toggle':
            return (
                <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Enable</span>
                    <input
                        type="checkbox"
                        checked={!!localFilters[filter.key]}
                        onChange={(e) => setLocalFilters({ ...localFilters, [filter.key]: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                    />
                </label>
            );
        case 'checkbox':
        default:
            return (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {(filter.options || []).map(option => (
                        <label key={option} className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={((localFilters[filter.key] as string[]) || []).includes(option)}
                                onChange={() => handleCheckboxChange(filter.key, option)}
                                className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                            />
                            <span>{filter.optionLabels?.get(option) || option}</span>
                        </label>
                    ))}
                </div>
            );
    }
};

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div 
        className={`fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">{t('common.filterDrawer.title')}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <Icon name="X" className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </header>

        <main className="p-4 space-y-6 overflow-y-auto" style={{ height: 'calc(100% - 128px)' }}>
            {filterOptions.map(filter => (
                <div key={filter.key}>
                    <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">{filter.label}</h3>
                    {renderFilterInput(filter)}
                </div>
            ))}
        </main>
        
        <footer className="absolute bottom-0 left-0 right-0 flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button onClick={handleClear} className="px-4 py-2 text-sm font-medium rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">
                {t('common.filterDrawer.clearAll')}
            </button>
            <button onClick={handleApply} className="px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-blue-700">
                {t('common.filterDrawer.apply')}
            </button>
        </footer>
      </div>
    </>
  );
};