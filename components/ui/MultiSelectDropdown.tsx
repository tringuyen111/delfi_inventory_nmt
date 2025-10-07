import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../Icons';

interface MultiSelectDropdownProps<T extends string> {
  options: T[];
  selectedOptions: T[];
  onChange: (selected: T[]) => void;
  placeholder?: string;
  disabled?: boolean;
  disabledOptions?: T[];
}

export function MultiSelectDropdown<T extends string>({
  options,
  selectedOptions,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  disabledOptions = []
}: MultiSelectDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: T) => {
    if (disabled || disabledOptions.includes(option)) return;
    const newSelected = selectedOptions.includes(option)
      ? selectedOptions.filter(item => item !== option)
      : [...selectedOptions, option];
    onChange(newSelected);
  };

  const removeOption = (option: T, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange(selectedOptions.filter(item => item !== option));
  };

  const availableOptions = options.filter(opt => !selectedOptions.includes(opt));

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center flex-wrap gap-2 text-left p-2 border rounded-md shadow-sm transition-colors ${
          disabled
            ? 'bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed'
            : 'bg-white dark:bg-gray-700'
        } border-gray-300 dark:border-gray-600`}
      >
        {selectedOptions.length === 0 && <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>}
        {selectedOptions.map(option => (
          <span key={option} className="flex items-center gap-1.5 bg-blue-500 text-white text-xs font-medium px-2 py-1 rounded-full">
            {option}
            {!disabled && (
              <button onClick={(e) => removeOption(option, e)} className="text-blue-200 hover:text-white">
                <Icon name="X" className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
        <Icon name="ChevronDown" className={`w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
          {availableOptions.length > 0 ? (
            availableOptions.map(option => {
              const isDisabled = disabledOptions.includes(option);
              return (
              <li
                key={option}
                onClick={() => toggleOption(option)}
                className={`px-4 py-2 text-sm  ${
                    isDisabled
                    ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
                    : 'text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-blue-500 hover:text-white'
                }`}
              >
                {option}
              </li>
              )
            })
          ) : (
             <li className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">No more options</li>
          )}
        </ul>
      )}
    </div>
  );
}