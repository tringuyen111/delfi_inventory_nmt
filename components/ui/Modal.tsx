import React, { ReactNode, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Icon } from '../Icons';

type ModalSize = 'md' | 'lg' | 'xl' | '2xl' | 'fullscreen';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
}

const sizeClasses: Record<ModalSize, string> = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    fullscreen: 'w-screen h-screen max-w-none max-h-none rounded-none'
};

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = '2xl' }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!isOpen) return null;

  const modalContainerClasses = size === 'fullscreen' 
    ? '' 
    : 'flex items-center justify-center';

  const modalDialogClasses = size === 'fullscreen'
    ? ''
    : 'max-h-[90vh] rounded-lg';


  return ReactDOM.createPortal(
    <div className={`fixed inset-0 z-50 bg-black bg-opacity-50 ${modalContainerClasses}`} aria-modal="true" role="dialog" onClick={onClose}>
      <div className={`bg-white dark:bg-gray-800 shadow-xl w-full flex flex-col ${modalDialogClasses} ${sizeClasses[size]}`} onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
            <Icon name="X" className="w-5 h-5" />
          </button>
        </header>
        <main className="p-6 overflow-y-auto flex-grow">
          {children}
        </main>
        {footer && (
          <footer className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
};
