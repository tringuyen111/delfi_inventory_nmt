import React, { useRef, useEffect } from 'react';
import { Icon } from '../Icons';

declare const flatpickr: any;

interface DateRangePickerProps {
  value: [Date | null, Date | null];
  onChange: (dates: [Date | null, Date | null]) => void;
  disabled?: boolean;
}

const formatDate = (date: Date | null): string => {
  if (!date) return '';
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};


export const DateRangePicker: React.FC<DateRangePickerProps> = ({ value, onChange, disabled }) => {
  // A ref for a hidden input that flatpickr will attach to.
  // This avoids conflicts with React's DOM management.
  const flatpickrInputRef = useRef<HTMLInputElement>(null);
  const flatpickrInstance = useRef<any>(null);

  // Initialize flatpickr on mount
  useEffect(() => {
    if (flatpickrInputRef.current && typeof flatpickr !== 'undefined') {
      flatpickrInstance.current = flatpickr(flatpickrInputRef.current, {
        mode: "range",
        dateFormat: "Y-m-d", // Internal format, doesn't affect display
        defaultDate: value,
        onClose: (selectedDates: Date[]) => {
          if (selectedDates.length === 2) {
            onChange([selectedDates[0], selectedDates[1]]);
          } else if (selectedDates.length === 0) {
             onChange([null, null]);
          }
        }
      });
    }

    // Cleanup on unmount
    return () => {
      flatpickrInstance.current?.destroy();
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // Sync value prop changes to the flatpickr instance
  useEffect(() => {
      if (flatpickrInstance.current) {
          flatpickrInstance.current.setDate(value, false);
      }
  }, [value]);

  const openCalendar = () => {
      if (!disabled) {
          flatpickrInstance.current?.open();
      }
  };

  const [from, to] = value;

  return (
    // This container is fully managed by React. Flatpickr does not touch it.
    <div className="relative flex items-center border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 focus-within:ring-2 focus-within:ring-brand-primary/50 focus-within:border-brand-primary">
      {/* The hidden input for flatpickr */}
      <input ref={flatpickrInputRef} type="hidden" />
      
      {/* The visible, React-managed inputs */}
      <input 
        className="flex-1 w-full bg-transparent p-2 text-sm outline-none placeholder-gray-400 cursor-pointer" 
        placeholder="From" 
        value={formatDate(from)} 
        readOnly 
        disabled={disabled}
        onClick={openCalendar}
      />
      <span className="text-gray-400 mx-1">-</span>
      <input 
        className="flex-1 w-full bg-transparent p-2 text-sm outline-none placeholder-gray-400 cursor-pointer" 
        placeholder="To" 
        value={formatDate(to)} 
        readOnly 
        disabled={disabled}
        onClick={openCalendar}
      />
      
      {/* The button to toggle the calendar */}
      <button type="button" className="p-2 text-gray-500 dark:text-gray-400" aria-label="Toggle calendar" onClick={openCalendar}>
        <Icon name="Calendar" className="w-5 h-5" />
      </button>
    </div>
  );
};
