

import React, { useState } from 'react';
import { Icon } from './Icons';
// FIX: Update type import from `../types` which is now a valid module.
import type { Layout } from '../types';

interface LayoutMockupProps {
  layout: Layout;
}

export const LayoutMockup: React.FC<LayoutMockupProps> = ({ layout }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="mt-4 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50">
      <div className="w-full h-[450px] bg-white dark:bg-gray-800 rounded-md shadow-lg overflow-hidden flex flex-col relative border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <header className="h-12 bg-gray-100 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center justify-between px-4 text-xs">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <Icon name="Layers" className="w-5 h-5 text-brand-primary" />
            <span className="font-bold">{layout.header.left.replace('_', ' ')}</span>
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            {layout.header.center.replace('_', ' ')}: Home / Master Data / UoM
          </div>
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
            <Icon name="Bell" className="w-4 h-4" />
            <span className="font-semibold">EN</span>
            <Icon name="User" className="w-5 h-5" />
            <Icon name="Sun" className="w-4 h-4" />
          </div>
        </header>
        
        <div className="flex-grow flex overflow-hidden">
          {/* Sidebar */}
          <aside className={`bg-gray-100 dark:bg-gray-700/50 border-r border-gray-200 dark:border-gray-700 flex-shrink-0 flex flex-col justify-between transition-all duration-300 ${sidebarCollapsed ? 'w-12' : 'w-48'}`}>
            <div className="p-2 space-y-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`h-7 rounded-md flex items-center text-xs ${i === 2 ? 'bg-brand-primary/20 text-brand-primary' : 'bg-gray-200 dark:bg-gray-600'}`}>
                  {!sidebarCollapsed && <span className="pl-3">Menu Item {i + 1}</span>}
                </div>
              ))}
            </div>
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-2 m-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md">
              <Icon name="Menu" className="w-4 h-4 mx-auto"/>
            </button>
          </aside>
          
          {/* Main Content */}
          <main className="flex-grow p-4 bg-white dark:bg-gray-800">
            <div className="w-full h-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-md flex items-center justify-center">
              <p className="text-gray-400 dark:text-gray-500 text-sm">Main Content Area</p>
            </div>
          </main>
        </div>
        
        {/* Footer */}
        <footer className="h-8 bg-gray-100 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center justify-center px-4 text-xs text-gray-500 dark:text-gray-400">
          {layout.footer.content}
        </footer>
      </div>
    </div>
  );
};