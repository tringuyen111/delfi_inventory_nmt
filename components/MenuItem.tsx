

import React, { useState, useEffect } from 'react';
import { Icon } from './Icons';
// FIX: Update type import from `../types` which is now a valid module.
import type { MenuItemType } from '../types';

interface MenuItemProps {
  item: MenuItemType;
  onNavigate: (pageId: string, pageLabel: string) => void;
  activePageId: string;
  isCollapsed: boolean;
}

const isChildActive = (item: MenuItemType, activeId: string): boolean => {
    if (!item.children) return false;
    return item.children.some(child => child.id === activeId || isChildActive(child, activeId));
}

export const MenuItem: React.FC<MenuItemProps> = ({ item, onNavigate, activePageId, isCollapsed }) => {
  const isActive = item.id === activePageId;
  const isGroupActive = isChildActive(item, activePageId);

  const [isOpen, setIsOpen] = useState(isGroupActive);

  useEffect(() => {
    if(isGroupActive && !isOpen) {
        setIsOpen(true);
    }
  }, [isGroupActive, isOpen]);


  const hasChildren = item.children && item.children.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (item.id) {
        onNavigate(item.id, item.label);
    }
    if (hasChildren && !isCollapsed) {
      setIsOpen(!isOpen);
    }
  };

  if (item.type === 'separator') {
     return isCollapsed ? (
      <li className="py-2 px-2"><hr className="border-gray-200 dark:border-gray-600" /></li>
    ) : (
      <li className="px-3 pt-4 pb-2 text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">
        {item.label}
      </li>
    );
  }

  const baseClasses = "flex items-center w-full px-3 py-2.5 rounded-md text-sm font-medium transition-colors";
  const activeClasses = "bg-blue-100 dark:bg-blue-900/50 text-brand-primary dark:text-blue-300";
  const inactiveClasses = "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700";

  return (
    <li title={isCollapsed ? item.label : undefined}>
      <a
        href={item.path || '#'}
        onClick={handleClick}
        className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses} ${isCollapsed ? 'justify-center' : 'justify-between'}`}
      >
        <div className="flex items-center gap-3">
          {item.icon && <Icon name={item.icon} className="w-5 h-5 flex-shrink-0" />}
          {!isCollapsed && <span>{item.label}</span>}
        </div>
        {!isCollapsed && item.type === 'group' && hasChildren && (
          <Icon name="ChevronDown" className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </a>
      {!isCollapsed && hasChildren && isOpen && (
        <ul className="pl-6 mt-1 space-y-1 border-l border-gray-200 dark:border-gray-600 ml-5">
          {item.children?.map((child) => (
             <li key={child.id}>
                 <a 
                    href={child.path || '#'} 
                    onClick={(e) => {
                        e.preventDefault();
                        if (child.id) onNavigate(child.id, child.label);
                    }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${child.id === activePageId ? 'text-brand-primary dark:text-blue-400 font-semibold' : 'text-gray-500 dark:text-gray-400 hover:text-brand-primary dark:hover:text-blue-400'}`}>
                    <span className="text-gray-400 dark:text-gray-500">-</span>
                    <span>{child.label}</span>
                 </a>
             </li>
          ))}
        </ul>
      )}
    </li>
  );
};
