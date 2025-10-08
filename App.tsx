import React, { useState, useCallback, Suspense, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Icon } from './components/Icons';
import { useTheme } from './hooks/useTheme';
import { Avatar } from './components/ui/Avatar';
import { Dropdown, DropdownItem } from './components/ui/Dropdown';
import { UserProfile, MenuItemType, Notification } from './types';
import { useLanguage } from './hooks/useLanguage';
import { NotificationDropdown } from './components/ui/NotificationDropdown';

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
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage'));

// Mock user profile data
const mockUserProfile: UserProfile = {
  id: 'user-123',
  display_name: 'Anna Adame',
  email: 'anna.adame@example.com',
  role: 'Founder',
  avatar_url: 'https://i.pravatar.cc/150?u=a042581f4e29026704e',
  avatar_version: 1,
  phone: '0987654321',
  gender: 'Female',
  birth_year: 1985
};

const findPath = (items: MenuItemType[], targetId: string, currentPath: string[] = []): string[] | null => {
  for (const item of items) {
    const newPath = [...currentPath, item.label];
    if (item.id === targetId) {
      return newPath;
    }
    if (item.children) {
      const foundPath = findPath(item.children, targetId, newPath);
      if (foundPath) {
        return foundPath;
      }
    }
  }
  return null;
};


function App() {
  const [activePageId, setActivePageId] = useState('dashboard');
  const [activePageLabelKey, setActivePageLabelKey] = useState('menu.dashboard');
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { language, switchLanguage, t } = useLanguage();
  const [userProfile, setUserProfile] = useState(mockUserProfile);
  const [menuData, setMenuData] = useState<MenuItemType[]>([]);
  const [isMenuLoading, setIsMenuLoading] = useState<boolean>(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [breadcrumbPath, setBreadcrumbPath] = useState<string[]>([]);
  const [deepLinkDoc, setDeepLinkDoc] = useState<{ pageId: string; docNo: string } | null>(null);
  
  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(() => {
      try {
        const stored = localStorage.getItem('read_notifications');
        return stored ? new Set(JSON.parse(stored)) : new Set();
      } catch {
        return new Set();
      }
  });

  useEffect(() => {
    localStorage.setItem('read_notifications', JSON.stringify(Array.from(readNotifIds)));
  }, [readNotifIds]);

  const unreadCount = notifications.length - readNotifIds.size;

  useEffect(() => {
    const fetchMenuAndNotifs = async () => {
      setIsMenuLoading(true);
      try {
        const [menuRes, notifRes] = await Promise.all([
          fetch('./menu.json'),
          fetch('./data/notifications.json')
        ]);
        if (!menuRes.ok) throw new Error('Failed to load menu');
        if (!notifRes.ok) throw new Error('Failed to load notifications');
        
        const menu: MenuItemType[] = await menuRes.json();
        const notifs: Notification[] = await notifRes.json();

        setMenuData(menu);
        setNotifications(notifs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

        // Set initial breadcrumb for dashboard
        const initialPath = findPath(menu, 'dashboard');
        if(initialPath) {
            setBreadcrumbPath(initialPath.map(key => t(key)));
        } else {
            setBreadcrumbPath([t('menu.dashboard')]);
        }
      } catch (e) {
        setMenuError(e instanceof Error ? e.message : 'An unknown error occurred');
      } finally {
        setIsMenuLoading(false);
      }
    };
    fetchMenuAndNotifs();
  }, []);
  
  // Re-translate breadcrumb when language changes
  useEffect(() => {
    if (menuData.length > 0) {
        const pathKeys = findPath(menuData, activePageId);
        if (pathKeys) {
            setBreadcrumbPath(pathKeys.map(key => t(key)));
        } else {
            setBreadcrumbPath([t(activePageLabelKey)]);
        }
    }
  }, [language, t, activePageId, menuData, activePageLabelKey]);


  const handleNavigate = useCallback((pageId: string, pageLabelKey: string) => {
    setActivePageId(pageId);
    setActivePageLabelKey(pageLabelKey);
    setDeepLinkDoc(null); // Clear deep link on normal navigation
    const pathKeys = findPath(menuData, pageId);
    if (pathKeys) {
        setBreadcrumbPath(pathKeys.map(key => t(key)));
    } else {
        setBreadcrumbPath([t(pageLabelKey)]); // Fallback for items not in menu
    }
  }, [menuData, t]);
  
  const handleNotificationClick = (notification: Notification) => {
    setReadNotifIds(prev => new Set(prev).add(notification.id));
    
    // Set the state that will be consumed by the target page
    setDeepLinkDoc({ pageId: notification.pageId, docNo: notification.docNo });

    // Manually perform navigation to keep the deep link state
    setActivePageId(notification.pageId);
    setActivePageLabelKey(notification.pageLabel);
    const pathKeys = findPath(menuData, notification.pageId);
    if (pathKeys) {
        setBreadcrumbPath(pathKeys.map(key => t(key)));
    } else {
        setBreadcrumbPath([t(notification.pageLabel)]);
    }
  };
  
  const handleMarkAllRead = () => {
    setReadNotifIds(new Set(notifications.map(n => n.id)));
  };

  const renderPage = () => {
    const docToOpen = deepLinkDoc && deepLinkDoc.pageId === activePageId ? deepLinkDoc.docNo : null;
    const onDeepLinkHandled = () => setDeepLinkDoc(null);

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
      case 'goods_receipt': return <GoodsReceiptPage docToOpen={docToOpen} onDeepLinkHandled={onDeepLinkHandled} />;
      case 'goods_issue': return <GoodsIssuePage docToOpen={docToOpen} onDeepLinkHandled={onDeepLinkHandled} />;
      case 'goods_transfer': return <GoodsTransferPage docToOpen={docToOpen} onDeepLinkHandled={onDeepLinkHandled} />;
      case 'inventory_count': return <InventoryCountPage docToOpen={docToOpen} onDeepLinkHandled={onDeepLinkHandled} />;
      case 'goods_receipt_ui': return <GoodsReceiptUIPage />;
      case 'reports': return <ReportsPage />;
      case 'profile': return <ProfilePage userProfile={userProfile} onUpdateProfile={setUserProfile} />;
      case 'notifications': return <NotificationsPage allNotifications={notifications} readIds={readNotifIds} onNotificationClick={handleNotificationClick} />;
      default: return <div className="p-6"><h2>{t('common.pageNotFound')}</h2><p>{t('common.pageNotFoundMessage', { page: activePageLabelKey })}</p></div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      <Sidebar 
        activePageId={activePageId}
        onNavigate={handleNavigate}
        isCollapsed={isSidebarCollapsed}
        menuData={menuData}
        isLoading={isMenuLoading}
        error={menuError}
      />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <header className={`flex items-center justify-between h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 fixed top-0 right-0 z-30 transition-all duration-300 ${isSidebarCollapsed ? 'left-20' : 'left-64'}`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarCollapsed(!isSidebarCollapsed)} className="p-1 text-gray-500 dark:text-gray-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
              <Icon name="Menu" className="w-6 h-6" />
            </button>
            <div className="relative hidden sm:block">
              <Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" placeholder="Search..." className="bg-gray-100 dark:bg-gray-700/50 rounded-lg pl-10 pr-4 py-2 text-sm w-64 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none" />
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
             {breadcrumbPath.map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <Icon name="ChevronRight" className="w-4 h-4" />}
                  <span className={index === breadcrumbPath.length - 1 ? 'font-semibold text-gray-800 dark:text-gray-200' : 'hidden md:inline'}>
                    {item}
                  </span>
                </React.Fragment>
              ))}
          </div>

          <div className="flex items-center gap-4">
             <Dropdown 
                trigger={
                    <button className="p-2 w-10 h-10 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <img src={language === 'en' ? 'https://flagcdn.com/us.svg' : 'https://flagcdn.com/vn.svg'} alt={language} className="w-6 rounded-sm"/>
                    </button>
                }
             >
                <DropdownItem onClick={() => switchLanguage()}>{language === 'en' ? 'Tiếng Việt' : 'English'}</DropdownItem>
             </Dropdown>

            <Dropdown trigger={
                <button className="relative p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Icon name="Bell" className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping"></span>
                            <span className="relative inline-flex items-center justify-center rounded-full h-3 w-3 bg-red-600 text-[10px] text-white">{unreadCount}</span>
                        </span>
                    )}
                </button>
            }>
                <NotificationDropdown
                    notifications={notifications}
                    readIds={readNotifIds}
                    onNotificationClick={handleNotificationClick}
                    onMarkAllRead={handleMarkAllRead}
                    onViewAll={() => handleNavigate('notifications', 'menu.notifications')}
                />
            </Dropdown>

            <Dropdown trigger={
                 <div className="flex items-center gap-2 cursor-pointer p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Avatar user={userProfile} size="md" />
                    <div className="hidden lg:block">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{userProfile.display_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{userProfile.role}</p>
                    </div>
                </div>
            }>
                <DropdownItem icon="User" onClick={() => handleNavigate('profile', 'pages.profile.title')}>{t('header.myProfile')}</DropdownItem>
                <DropdownItem icon="Sun" onClick={toggleTheme}>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</DropdownItem>
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