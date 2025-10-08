
import React, { useState, useCallback, Suspense } from 'react';
import { Sidebar } from './components/Sidebar';
import { Icon } from './components/Icons';
import { useTheme } from './hooks/useTheme';
import { Avatar } from './components/ui/Avatar';
import { Dropdown, DropdownItem } from './components/ui/Dropdown';
import { UserProfile } from './types';
import { useLanguage } from './hooks/useLanguage';

// Lazy load pages for better initial load performance
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const UomPage = React.lazy(() => import('./pages/UomPage'));
const OrganizationPage = React.lazy(() => import('./pages/OrganizationPage'));
const BranchPage = React.lazy(() => import('./pages/BranchPage'));
const WarehousePage = React.lazy(() => import('./pages/WarehousePage'));
const PartnerPage = React.lazy(() => import('./pages/PartnerPage'));
const GoodsTypePage = React.lazy(() => import('./pages/GoodsTypePage'));
const LocationPage = React.lazy(() => import('./pages/LocationPage'));
const ModelGoodsPage = React.lazy(() => import('./pages/ModelGoodsPage'));
const OnhandPage = React.lazy(() => import('./pages/OnhandPage'));
const GoodsReceiptPage = React.lazy(() => import('./pages/GoodsReceiptPage'));
const GoodsIssuePage = React.lazy(() => import('./pages/GoodsIssuePage'));
const GoodsTransferPage = React.lazy(() => import('./pages/GoodsTransferPage'));
const InventoryCountPage = React.lazy(() => import('./pages/InventoryCountPage'));
const GoodsReceiptUIPage = React.lazy(() => import('./pages/GoodsReceiptUIPage'));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));

// Mock user profile data
const mockUserProfile: UserProfile = {
  id: 'user-123',
  display_name: 'Alex Nguyen',
  email: 'alex.nguyen@example.com',
  role: 'Inventory Manager',
  avatar_url: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
  avatar_version: 1,
  phone: '0987654321',
  gender: 'Male',
  birth_year: 1990
};


function App() {
  const [activePageId, setActivePageId] = useState('dashboard');
  const [activePageLabelKey, setActivePageLabelKey] = useState('menu.dashboard');
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { language, switchLanguage, t } = useLanguage();
  const [userProfile, setUserProfile] = useState(mockUserProfile);

  const handleNavigate = useCallback((pageId: string, pageLabelKey: string) => {
    setActivePageId(pageId);
    setActivePageLabelKey(pageLabelKey);
  }, []);

  const renderPage = () => {
    switch (activePageId) {
      case 'dashboard': return <DashboardPage onNavigate={handleNavigate} />;
      case 'uom': return <UomPage />;
      case 'organization': return <OrganizationPage />;
      case 'branch': return <BranchPage />;
      case 'warehouse': return <WarehousePage />;
      case 'partner': return <PartnerPage />;
      case 'goods_type': return <GoodsTypePage />;
      case 'location': return <LocationPage />;
      case 'model_goods': return <ModelGoodsPage />;
      case 'onhand_inventory': return <OnhandPage />;
      case 'goods_receipt': return <GoodsReceiptPage />;
      case 'goods_issue': return <GoodsIssuePage />;
      case 'goods_transfer': return <GoodsTransferPage />;
      case 'inventory_count': return <InventoryCountPage />;
      case 'goods_receipt_ui': return <GoodsReceiptUIPage />;
      case 'reports': return <ReportsPage />;
      case 'profile': return <ProfilePage userProfile={userProfile} onUpdateProfile={setUserProfile} />;
      default: return <div className="p-6"><h2>{t('common.pageNotFound')}</h2><p>{t('common.pageNotFoundMessage', { page: activePageLabelKey })}</p></div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      <Sidebar 
        activePageId={activePageId}
        onNavigate={handleNavigate}
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <header className={`flex items-center justify-between h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 fixed top-0 right-0 left-0 z-30 transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
          <h1 className="text-xl font-semibold">{t(activePageLabelKey)}</h1>
          <div className="flex items-center gap-2">
            <button onClick={switchLanguage} className="p-2 w-10 h-10 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold text-sm">
              {language.toUpperCase()}
            </button>
            <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Icon name={theme === 'dark' ? 'Sun' : 'Moon'} className="w-5 h-5" />
            </button>
            <Dropdown trigger={<Avatar user={userProfile} />}>
                <DropdownItem icon="User" onClick={() => handleNavigate('profile', 'pages.profile.title')}>{t('header.myProfile')}</DropdownItem>
                <DropdownItem icon="LogOut" onClick={() => alert('Log out clicked')}>{t('header.logout')}</DropdownItem>
            </Dropdown>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto mt-16">
          <Suspense fallback={<div className="text-center p-10">{t('common.loadingPage')}</div>}>
            {renderPage()}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default App;