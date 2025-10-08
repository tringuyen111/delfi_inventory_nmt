
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Organization } from '../types';
import { Icon } from '../components/Icons';
import { Table, Column } from '../components/ui/Table';
import { OrganizationFormModal } from '../components/organization/OrganizationFormModal';
import { Toast } from '../components/ui/Toast';
import { FilterDrawer } from '../components/ui/FilterDrawer';
import { useDebounce } from '../hooks/useDebounce';
import { useLanguage } from '../hooks/useLanguage';

type ModalMode = 'create' | 'edit' | 'view';

const OrganizationPage: React.FC = () => {
    const { t } = useLanguage();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [modalState, setModalState] = useState<{ isOpen: boolean; mode: ModalMode; org: Organization | null }>({
        isOpen: false,
        mode: 'create',
        org: null,
    });
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<Record<string, string[]>>({});

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const fetchOrgs = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('./data/organizations.json');
            if (!response.ok) {
                throw new Error('Failed to fetch Organizations');
            }
            const data: Organization[] = await response.json();
            setOrganizations(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrgs();
    }, [fetchOrgs]);

    const handleCreate = () => {
        setModalState({ isOpen: true, mode: 'create', org: null });
    };
    
    const handleView = (org: Organization) => {
        setModalState({ isOpen: true, mode: 'view', org });
    };

    const switchToEditMode = () => {
        setModalState(prev => ({ ...prev, mode: 'edit' }));
    };
    
    const handleSave = (orgToSave: Omit<Organization, 'id' | 'org_code' | 'updated_at' | 'has_active_docs'>): Organization => {
        let savedOrg: Organization;
        if (modalState.mode === 'edit' && modalState.org) {
            savedOrg = { ...modalState.org, ...orgToSave, updated_at: new Date().toISOString() };
            setOrganizations(prev => prev.map(o => o.id === savedOrg.id ? savedOrg : o));
            setToastInfo({ message: t('pages.organization.toast.updated'), type: 'success' });
        } else { // create mode
            const now = new Date();
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const seq = (organizations.length + 1).toString().padStart(4, '0');
            const newOrgCode = `ORG-${year}${month}-${seq}`;
            
            savedOrg = { 
                ...orgToSave, 
                id: newOrgCode, 
                org_code: newOrgCode, 
                updated_at: now.toISOString(),
                has_active_docs: false
            };
            setOrganizations(prev => [savedOrg, ...prev]);
            setToastInfo({ message: t('pages.organization.toast.created'), type: 'success' });
        }
        return savedOrg;
    };
    
    const handleSaveAndContinue = (orgToSave: Omit<Organization, 'id' | 'org_code' | 'updated_at' | 'has_active_docs'>) => {
        const savedOrg = handleSave(orgToSave);
        setModalState(prev => ({ ...prev, mode: 'edit', org: savedOrg }));
    };

    const handleSaveAndClose = (orgToSave: Omit<Organization, 'id' | 'org_code' | 'updated_at' | 'has_active_docs'>) => {
        handleSave(orgToSave);
        setModalState({ isOpen: false, mode: 'create', org: null });
    };

    const filteredOrgs = useMemo(() => {
        return organizations
            .filter(org => {
                const search = debouncedSearchTerm.toLowerCase();
                return org.org_code.toLowerCase().includes(search) ||
                       org.org_name.toLowerCase().includes(search) ||
                       (org.email && org.email.toLowerCase().includes(search)) ||
                       (org.phone && org.phone.toLowerCase().includes(search));
            })
            .filter(org => {
                return Object.entries(filters).every(([key, values]) => {
                    if (!Array.isArray(values) || values.length === 0) return true;
                    return values.includes(org[key as keyof Organization] as string);
                });
            });
    }, [organizations, debouncedSearchTerm, filters]);

    const columns: Column<Organization>[] = useMemo(() => [
        { key: 'org_code', header: t('pages.organization.table.code') },
        { key: 'org_name', header: t('pages.organization.table.name') },
        { key: 'phone', header: t('pages.organization.table.phone') },
        { key: 'email', header: t('pages.organization.table.email') },
        { key: 'status', header: t('common.status'), render: (org) => (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                org.status === 'Active' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`
            }>
                {t(`common.${org.status.toLowerCase()}`)}
            </span>
        )},
        { key: 'updated_at', header: t('common.updatedAt'), render: (org) => new Date(org.updated_at).toLocaleDateString() },
        { key: 'actions', header: '', render: (org) => (
            <div className="flex justify-end items-center gap-2">
                <button onClick={() => handleView(org)} className="p-1 text-gray-500 hover:text-brand-primary dark:hover:text-blue-400">
                    <Icon name="Edit" className="w-4 h-4" />
                </button>
            </div>
        )}
    ], [t]);

    return (
        <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
            <header className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                        <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-blue-700">
                            <Icon name="Plus" className="w-4 h-4"/> {t('common.create')}
                        </button>
                    </div>
                    <div className="flex gap-2 items-center">
                        <div className="relative">
                           <Icon name="Search" className="w-4 h-4 absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"/>
                           <input 
                             type="text" 
                             placeholder={t('pages.organization.searchPlaceholder')}
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             className="w-64 pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none"
                           />
                        </div>
                        <button onClick={() => setIsFilterOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
                            <Icon name="Filter" className="w-4 h-4"/> {t('common.filter')}
                        </button>
                         <button onClick={fetchOrgs} className="p-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
                           <Icon name="RefreshCw" className="w-4 h-4"/>
                        </button>
                    </div>
                </div>
            </header>

            {isLoading ? (
                <div className="p-8 text-center">{t('common.loading')}</div>
            ) : error ? (
                <div className="p-8 text-center text-red-500">{t('common.error')}: {error}</div>
            ) : (
                <Table<Organization>
                    columns={columns}
                    data={filteredOrgs}
                    onRowDoubleClick={handleView}
                />
            )}
            
            {filteredOrgs.length === 0 && !isLoading && (
                <div className="text-center py-16">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">{t('pages.organization.empty.title')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('pages.organization.empty.message')}</p>
                </div>
            )}

            {modalState.isOpen && (
                <OrganizationFormModal
                    isOpen={modalState.isOpen}
                    mode={modalState.mode}
                    onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                    onSaveAndContinue={handleSaveAndContinue}
                    onSaveAndClose={handleSaveAndClose}
                    onSwitchToEdit={switchToEditMode}
                    organization={modalState.org}
                    existingOrganizations={organizations}
                />
            )}
            {toastInfo && (
                <Toast
                    message={toastInfo.message}
                    type={toastInfo.type}
                    onClose={() => setToastInfo(null)}
                />
            )}
            <FilterDrawer
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                filters={filters}
                onApplyFilters={setFilters}
                onClearFilters={() => setFilters({})}
                filterOptions={[
                    { key: 'status', label: t('common.status'), options: ["Active","Inactive"]}
                ]}
            />
        </div>
    );
};

export default OrganizationPage;
