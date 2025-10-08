import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { Icon, IconName } from '../Icons';

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
}

export const Dropdown: React.FC<DropdownProps> = ({ trigger, children }) => {
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

  const handleTriggerClick = () => {
    setIsOpen(prev => !prev);
  };
  
  // Allow children to close the dropdown after an action
  const childrenWithProps = React.Children.map(children, child => {
    // FIX: Pass the `close` prop to all valid custom component children.
    // The previous implementation only targeted `DropdownItem`, causing a type error
    // when `NotificationDropdown` was used, as it also requires the `close` prop.
    if (React.isValidElement(child) && typeof child.type !== 'string') {
       return React.cloneElement(child, { close: () => setIsOpen(false) } as any);
    }
    return child;
  });

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={handleTriggerClick} className="cursor-pointer">
        {trigger}
      </div>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-40 py-1">
          {childrenWithProps}
        </div>
      )}
    </div>
  );
};

interface DropdownItemProps {
  icon?: IconName;
  onClick: () => void;
  children: ReactNode;
  close?: () => void; // Injected by parent
}

export const DropdownItem: React.FC<DropdownItemProps> = ({ icon, onClick, children, close }) => {
  const handleClick = () => {
    onClick();
    close?.();
  };

  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        handleClick();
      }}
      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
    >
      {icon && <Icon name={icon} className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
      <span>{children}</span>
    </a>
  );
};
