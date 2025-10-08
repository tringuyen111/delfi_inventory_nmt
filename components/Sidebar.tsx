


import React, { useState, useEffect } from 'react';
import { MenuItem } from './MenuItem';
// FIX: Update type import from `../types` which is now a valid module.
import type { MenuItemType } from '../types';
import { Icon } from './Icons';

interface SidebarProps {
  activePageId: string;
  onNavigate: (pageId: string, pageLabel: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

const SidebarSkeleton: React.FC<{ isCollapsed: boolean }> = ({ isCollapsed }) => (
  <div className="space-y-2 animate-pulse">
    <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded mt-4 mb-2 ${isCollapsed ? 'w-full' : 'w-1/4'}`}></div>
    <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center">
        {!isCollapsed && <div className="h-4 w-3/4 bg-gray-300 dark:bg-gray-600 rounded"></div>}
    </div>
    <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center">
        {!isCollapsed && <div className="h-4 w-2/4 bg-gray-300 dark:bg-gray-600 rounded"></div>}
    </div>
    <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded mt-6 mb-2 ${isCollapsed ? 'w-full' : 'w-1/4'}`}></div>
    <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center">
        {!isCollapsed && <div className="h-4 w-3/4 bg-gray-300 dark:bg-gray-600 rounded"></div>}
    </div>
  </div>
);

export const Sidebar: React.FC<SidebarProps> = ({ activePageId, onNavigate, isCollapsed, onToggle }) => {
  const [menuData, setMenuData] = useState<MenuItemType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        const response = await fetch('./menu.json');
        if (!response.ok) {
          throw new Error('Failed to load menu');
        }
        const data: MenuItemType[] = await response.json();
        setMenuData(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMenuData();
  }, []);

  return (
    <aside className={`fixed top-16 bottom-0 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <nav className={`flex-grow overflow-y-auto ${isCollapsed ? 'p-2' : 'p-4'}`}>
        {isLoading ? (
          <SidebarSkeleton isCollapsed={isCollapsed} />
        ) : error ? (
          <div className="text-red-500 text-sm p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
            Error loading menu: {error}
          </div>
        ) : (
          <ul className="space-y-1">
            {menuData.map((item, index) => (
              <MenuItem
                key={item.id || index}
                item={item}
                onNavigate={onNavigate}
                activePageId={activePageId}
                isCollapsed={isCollapsed}
              />
            ))}
          </ul>
        )}
      </nav>
      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Icon name={isCollapsed ? 'ChevronRight' : 'ChevronLeft'} className="w-6 h-6" />
        </button>
      </div>
    </aside>
  );
};