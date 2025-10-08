import React, { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  children: ReactNode;
  error?: string;
  required?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({ label, children, error, required }) => {
  const baseInputClasses = 'bg-white dark:bg-gray-700 border rounded-md shadow-sm p-2 text-sm focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none transition-colors disabled:bg-gray-100 dark:disabled:bg-gray-700/50 disabled:cursor-not-allowed disabled:text-gray-500 dark:disabled:text-gray-400';
  const errorInputClasses = 'border-brand-danger ring-1 ring-brand-danger';
  const normalInputClasses = 'border-gray-300 dark:border-gray-600';

  const childWithClassName = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      // FIX: Cast `child.props` to a type that includes an optional `className` to resolve the TypeScript error where `className` was not found on a generic object.
      const className = `${(child.props as { className?: string }).className || ''} ${baseInputClasses} ${error ? errorInputClasses : normalInputClasses}`;
      return React.cloneElement(child as React.ReactElement<any>, { className });
    }
    return child;
  });

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {required && <span className="text-brand-danger ml-1">*</span>}
      </label>
      {childWithClassName}
      {error && <p className="text-xs mt-1.5 text-brand-danger">{error}</p>}
    </div>
  );
};