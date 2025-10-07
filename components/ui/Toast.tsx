
import React, { useState, useEffect } from 'react';
import { Icon } from '../Icons';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Wait for fade out transition
    }, 3000);

    return () => clearTimeout(timer);
  }, [message, onClose]);

  const bgColor = type === 'success' ? 'bg-brand-success' : 'bg-brand-danger';
  const iconName = type === 'success' ? 'CheckCircle' : 'XCircle';

  return (
    <div
      className={`fixed bottom-8 right-8 flex items-center gap-3 text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 ${bgColor} ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
      role="alert"
    >
      <Icon name={iconName} className="w-5 h-5" />
      <span>{message}</span>
    </div>
  );
};
