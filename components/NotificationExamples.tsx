

import React from 'react';
import { Icon } from './Icons';
// FIX: Update type import from `../types` which is now a valid module.
import type { Notifications } from '../types';

interface NotificationExamplesProps {
  notifications: Notifications;
}

export const NotificationExamples: React.FC<NotificationExamplesProps> = ({ notifications }) => {
  const { success_toast, error_modal, confirmation_modal, inline_validation } = notifications;

  return (
    <div className="space-y-8">
      {/* Success Toast */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Success Toast</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">A non-blocking message for successful actions. Fades out automatically.</p>
        <div className="relative w-80 h-16 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center overflow-hidden">
            <div className="absolute bottom-2 right-2 flex items-center gap-3 bg-brand-success text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg">
                <Icon name="CheckCircle" className="w-5 h-5"/>
                <span>Action completed successfully!</span>
            </div>
        </div>
         <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Style: {success_toast.style.replace(/_/g, ' ')}</p>
      </div>

      {/* Error Modal */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Error Modal</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">A blocking popup for critical errors that require user acknowledgement.</p>
         <div className="w-96 rounded-lg bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
                    <Icon name="AlertTriangle" className="w-6 h-6 text-brand-danger"/>
                </div>
                <div>
                    <h4 className="text-lg font-bold text-brand-danger">An Error Occurred</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Could not process your request due to a server error. Please try again later.</p>
                </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
                <button className="px-4 py-2 text-sm font-medium rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Close</button>
                <button className="px-4 py-2 text-sm font-medium rounded-md bg-brand-danger text-white hover:bg-red-700">OK</button>
            </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Confirmation Modal</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">A blocking popup to confirm a potentially destructive user action.</p>
         <div className="w-96 rounded-lg bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                    <Icon name="HelpCircle" className="w-6 h-6 text-brand-primary"/>
                </div>
                <div>
                    <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100">Confirm Action</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Are you sure you want to delete this item? This action cannot be undone.</p>
                </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
                <button className="px-4 py-2 text-sm font-medium rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                <button className="px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-blue-700">Confirm</button>
            </div>
        </div>
      </div>

      {/* Inline Validation */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Inline Validation</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Immediate feedback on a specific field, triggered on blur or submit.</p>
        <div className="w-80">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
            <input type="text" className="w-full mt-1 bg-white dark:bg-gray-700 border-brand-danger ring-1 ring-brand-danger rounded-md shadow-sm p-2" defaultValue="invalid-email"/>
            <p className={`text-xs mt-1.5 text-${inline_validation.color}`}>Please enter a valid email address.</p>
        </div>
      </div>

    </div>
  );
};