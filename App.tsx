
import React, { useState, useEffect } from 'react';
import { useTheme } from './hooks/useTheme';
import { Icon } from './components/Icons';
import { ColorPalette } from './components/ColorPalette';
import { LayoutMockup } from './components/LayoutMockup';
import { SectionCard } from './components/SectionCard';
import { GuidelineItem } from './components/GuidelineItem';
import { NotificationExamples } from './components/NotificationExamples';
import { Sidebar } from './components/Sidebar';
// FIX: Update import statement for types.
import { Guidelines, UserProfile } from './types';
import { Dropdown, DropdownItem } from './components/ui/Dropdown';
import { Avatar } from './components/ui/Avatar';

import UomPage from './pages/UomPage';
import OrganizationPage from './pages/OrganizationPage';
import BranchPage from './pages/BranchPage';
import WarehousePage from './pages/WarehousePage';
import PartnerPage from './pages/PartnerPage';
import GoodsTypePage from './pages/GoodsTypePage';
import LocationPage from './pages/LocationPage';
import ModelGoodsPage from './pages/ModelGoodsPage';
import ProfilePage from './pages/ProfilePage';
import OnhandPage from './pages/OnhandPage';
import GoodsReceiptUIPage from './pages/GoodsReceiptUIPage';
import GoodsReceiptPage from './pages/GoodsReceiptPage';
import GoodsIssuePage from './pages/GoodsIssuePage';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';

const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [guidelines, setGuidelines] = useState<Guidelines | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<{id: string, label: string}>({ id: 'dashboard', label: 'Dashboard' });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  
  const handleNavigate = (pageId: string, pageLabel: string) => {
    setActivePage({id: pageId, label: pageLabel});
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [guidelinesRes, profileRes] = await Promise.all([
          fetch('./guidelines.json'),
          fetch('./data/profile.json')
        ]);

        if (!guidelinesRes.ok || !profileRes.ok) {
          throw new Error(`HTTP error! Failed to fetch initial data.`);
        }
        
        const guidelinesData: Guidelines = await guidelinesRes.json();
        const profileData: UserProfile = await profileRes.json();
        
        setGuidelines(guidelinesData);
        setUserProfile(profileData);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred while fetching data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const renderContent = () => {
    switch (activePage.id) {
        case 'dashboard': return <DashboardPage onNavigate={handleNavigate} />;
        case 'uom_management': return <UomPage />;
        case 'organization_management': return <OrganizationPage />;
        case 'branch_management': return <BranchPage />;
        case 'warehouse_config': return <WarehousePage />;
        case 'partner_management': return <PartnerPage />;
        case 'goods_type_management': return <GoodsTypePage />;
        case 'location': return <LocationPage />;
        case 'goods_model': return <ModelGoodsPage />;
        case 'profile': return userProfile ? <ProfilePage userProfile={userProfile} onUpdateProfile={setUserProfile} /> : null;
        case 'onhand': return <OnhandPage />;
        case 'goods_receipt_ui_state': return <GoodsReceiptUIPage />;
        case 'goods_receipt': return <GoodsReceiptPage />;
        case 'goods_issue': return <GoodsIssuePage />;
        case 'reports': return <ReportsPage />;
        case 'ui_blueprint':
            if (!guidelines) return null;
            return (
                <div className="max-w-4xl mx-auto">
                    <SectionCard title="Brand Colors" icon="Palette">
                        <ColorPalette colors={guidelines.design_rules.brand_colors} />
                    </SectionCard>
                    <SectionCard title="Layout System" icon="LayoutTemplate">
                        <LayoutMockup layout={guidelines.context.layout} />
                    </SectionCard>
                    <SectionCard title="Form Guidelines" icon="ClipboardList">
                        <dl className="space-y-2 divide-y divide-gray-200 dark:divide-gray-700">
                            <GuidelineItem label="Layout" value={guidelines.design_rules.forms.layout} />
                            <GuidelineItem label="Label Position" value={guidelines.design_rules.forms.label_position} />
                            <GuidelineItem label="Actions Position" value={guidelines.design_rules.forms.actions_position} />
                            <GuidelineItem label="Default Actions" value={guidelines.design_rules.forms.actions.join(', ')} />
                        </dl>
                    </SectionCard>
                    <SectionCard title="List View Guidelines" icon="List">
                        <dl className="space-y-2 divide-y divide-gray-200 dark:divide-gray-700">
                            <GuidelineItem label="Search Position" value={guidelines.design_rules.list_view.search.position} />
                            <GuidelineItem label="Filter Type" value={guidelines.design_rules.list_view.filter.type} />
                            <GuidelineItem label="Column Visibility" value={guidelines.design_rules.list_view.column_visibility.storage} />
                            <GuidelineItem label="Row Navigation" value={guidelines.design_rules.list_view.navigation.double_click_action} />
                        </dl>
                    </SectionCard>
                    <SectionCard title="Notifications" icon="Bell">
                        <NotificationExamples notifications={guidelines.design_rules.notifications} />
                    </SectionCard>
                </div>
            );
        default:
            return (
                <div className="max-w-4xl mx-auto">
                    <SectionCard title={activePage.label} icon="Info">
                        <p>This is the content area for the <span className="font-bold">{activePage.label}</span> page. The content for this page has not been built yet.</p>
                    </SectionCard>
                </div>
            );
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
        <Icon name="Layers" className="w-10 h-10 text-brand-primary animate-spin" />
        <p className="mt-4 text-lg font-medium">Loading UI Blueprint...</p>
      </div>
    );
  }

  if (error || !guidelines || !userProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 text-red-500">
        <Icon name="AlertTriangle" className="w-10 h-10" />
        <p className="mt-4 text-lg font-bold">Failed to Load Application</p>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 z-30">
        <div className="flex items-center gap-3">
          <Icon name="Layers" className="w-7 h-7 text-brand-primary" />
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">
            <span className="font-light">{guidelines.system} /</span> {activePage.label}
          </h1>
        </div>
        <div className="flex items-center gap-4">
            <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            aria-label="Toggle theme"
            >
            <Icon name={theme === 'dark' ? 'Sun' : 'Moon'} className="w-6 h-6" />
            </button>
            <Dropdown
                trigger={
                    <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary">
                        <Avatar user={userProfile} size="md" />
                    </button>
                }
            >
                <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{userProfile.display_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{userProfile.role}</p>
                </div>
                <DropdownItem icon="User" onClick={() => handleNavigate('profile', 'Thông tin cá nhân')}>
                    Thông tin cá nhân
                </DropdownItem>
                <DropdownItem icon="Key" onClick={() => alert('Navigate to Change Password page')}>
                    Đổi mật khẩu
                </DropdownItem>
                <DropdownItem icon="LogOut" onClick={() => alert('User logged out')}>
                    Đăng xuất
                </DropdownItem>
            </Dropdown>
        </div>
      </header>
      <div className="flex pt-16">
        <Sidebar 
          activePageId={activePage.id} 
          onNavigate={handleNavigate}
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(prev => !prev)}
        />
        <main id="main-content" className={`${isSidebarCollapsed ? 'ml-20' : 'ml-64'} flex-1 p-8 overflow-y-auto transition-all duration-300`} style={{height: 'calc(100vh - 4rem)'}}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;