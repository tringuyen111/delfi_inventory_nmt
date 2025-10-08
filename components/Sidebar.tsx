import React from 'react';
import { MenuItem } from './MenuItem';
import type { MenuItemType } from '../types';
import { Icon } from './Icons';

interface SidebarProps {
  activePageId: string;
  onNavigate: (pageId: string, pageLabel: string) => void;
  isCollapsed: boolean;
  menuData: MenuItemType[];
  isLoading: boolean;
  error: string | null;
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

export const Sidebar: React.FC<SidebarProps> = ({ activePageId, onNavigate, isCollapsed, menuData, isLoading, error }) => {

  return (
    <aside className={`fixed top-0 bottom-0 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-40 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="h-16 flex items-center justify-center border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
                 <Icon name="Layers" className="w-8 h-8 text-brand-primary" />
                 {!isCollapsed && <span className="font-bold text-lg">InventoryX</span>}
            </div>
        </div>
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
    </aside>
  );
};