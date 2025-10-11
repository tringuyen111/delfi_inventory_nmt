import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Organization } from '../types';
import { Icon } from '../components/Icons';
import { Table, Column } from '../components/ui/Table';
import { OrganizationFormModal } from '../components/organization/OrganizationFormModal';
import { Toast } from '../components/ui/Toast';
import { useDebounce } from '../hooks/useDebounce';
import { useLanguage } from '../hooks/useLanguage';
import { Pagination } from '../components/ui/Pagination';
import { Dropdown } from '../components/ui/Dropdown';
import { ColumnVisibilityDropdown } from '../components/ui/ColumnVisibilityDropdown';

type ModalMode = 'create' | 'edit' | 'view';
const ITEMS_PER_PAGE = 8;
const COLUMN_VISIBILITY_KEY = 'organization_column_visibility';

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
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ status: 'all' });
    const [currentPage, setCurrentPage] = useState(1);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const fetchOrgs = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('./data/organizations.json');
            if (!response.ok) {
                throw new Error('Failed to fetch Organizations');
            }
            const data: Organization[] = await response.json();
            data.sort((a,b) => a.org_name.localeCompare(b.org_name));
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

    const allColumns: Column<Organization>[] = useMemo(() => [
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

    const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<string>>(() => {
        const saved = localStorage.getItem(COLUMN_VISIBILITY_KEY);
        if (saved) {
            return new Set(JSON.parse(saved));
        }
        return new Set(allColumns.map(c => c.key as string));
    });

    useEffect(() => {
        localStorage.setItem(COLUMN_VISIBILITY_KEY, JSON.stringify(Array.from(visibleColumnKeys)));
    }, [visibleColumnKeys]);
    
    const handleColumnToggle = (key: string) => {
        setVisibleColumnKeys(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                if (newSet.size > 1) newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };
    
    const handleShowAll = () => setVisibleColumnKeys(new Set(allColumns.map(c => c.key as string)));
    const handleHideAll = () => {
        const mandatoryColumns = allColumns.filter(c => c.key === 'org_code' || c.key === 'actions').map(c => c.key as string);
        setVisibleColumnKeys(new Set(mandatoryColumns));
    };
    
    const columns = useMemo(() => allColumns.filter(col => visibleColumnKeys.has(col.key as string)), [allColumns, visibleColumnKeys]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const handleCreate = () => {
        setModalState({ isOpen: true, mode: 'create', org: null });
    };
    
    const handleView = (org: Organization) => {
        setModalState({ isOpen: true, mode: 'view', org });
    };

    const switchToEditMode = () => {
        setModalState(prev => ({ ...prev, mode: 'edit' }));
    };
    
    const handleSave = async (orgToSave: Partial<Organization>): Promise<Organization | null> => {
        const isCreating = !orgToSave.id;

        try {
            const savedOrg: Organization = {
                org_code: '', org_name: '', status: 'Active', has_active_docs: false,
                ...orgToSave,
                id: isCreating ? orgToSave.org_code! : orgToSave.id!,
                updated_at: new Date().toISOString(),
            } as Organization;
        
             if (isCreating) {
                setOrganizations(prev => [savedOrg, ...prev].sort((a,b) => a.org_name.localeCompare(b.org_name)));
                setToastInfo({ message: t('pages.organization.toast.created'), type: 'success' });
            } else {
                setOrganizations(prev => prev.map(o => (o.id === savedOrg.id ? savedOrg : o)));
                setToastInfo({ message: t('pages.organization.toast.updated'), type: 'success' });
            }
            return savedOrg;
        } catch (e) {
            const error = e instanceof Error ? e.message : 'An unknown error occurred';
            setToastInfo({ message: `Error: ${error}`, type: 'error' });
            return null;
        }
    };
    
    const handleSaveAndContinue = async (orgToSave: Partial<Organization>) => {
        const savedOrg = await handleSave(orgToSave);
        if (savedOrg) {
            setModalState(prev => ({ ...prev, mode: 'edit', org: savedOrg }));
        }
    };

    const handleSaveAndClose = async (orgToSave: Partial<Organization>) => {
        const savedOrg = await handleSave(orgToSave);
        if (savedOrg) {
            setModalState({ isOpen: false, mode: 'create', org: null });
        }
    };

    const filteredOrgs = useMemo(() => {
        return organizations
            .filter(org => {
                const search = debouncedSearchTerm.toLowerCase();
                return org.org_code.toLowerCase().includes(search) ||
                       org.org_name.toLowerCase().includes(search) ||
                       (org.email && org.email.toLowerCase().includes(search)) ||
                       (org.phone && org.phone.includes(debouncedSearchTerm));
            })
            .filter(org => {
                if (filters.status !== 'all' && org.status !== filters.status) return false;
                return true;
            });
    }, [organizations, debouncedSearchTerm, filters]);

    const paginatedOrgs = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filteredOrgs.slice(start, end);
    }, [filteredOrgs, currentPage]);

    const totalPages = useMemo(() => {
        return Math.ceil(filteredOrgs.length / ITEMS_PER_PAGE);
    }, [filteredOrgs]);

    return (
        <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
                <header className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <Icon name="Filter" className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            <h2 className="text-lg font-semibold">{t('common.filter')}</h2>
                        </div>
                        <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-blue-700">
                            <Icon name="Plus" className="w-4 h-4"/> {t('common.create')}
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-grow">
                           <Icon name="Search" className="w-4 h-4 absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"/>
                           <input 
                             type="text" 
                             placeholder={t('pages.organization.searchPlaceholder')}
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none"
                           />
                        </div>
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none">
                            <option value="all">All Statuses</option>
                            {["Active","Inactive"].map(o => <option key={o} value={o}>{t(`common.${o.toLowerCase()}`)}</option>)}
                        </select>
                        <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
                            <Icon name="Download" className="w-4 h-4"/> {t('common.exportExcel')}
                        </button>
                        <Dropdown 
                          trigger={
                            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
                                <Icon name="Columns" className="w-4 h-4"/> {t('common.columnVisibility')}
                            </button>
                          }
                        >
                            <ColumnVisibilityDropdown
                                allColumns={allColumns.filter(c => c.key !== 'actions')}
                                visibleColumnKeys={visibleColumnKeys}
                                onColumnToggle={handleColumnToggle}
                                onShowAll={handleShowAll}
                                onHideAll={handleHideAll}
                            />
                        </Dropdown>
                    </div>
                </header>

                {isLoading ? (
                    <div className="p-8 text-center">{t('common.loading')}</div>
                ) : error ? (
                    <div className="p-8 text-center text-red-500">{t('common.error')}: {error}</div>
                ) : (
                    <Table<Organization>
                        columns={columns}
                        data={paginatedOrgs}
                        onRowDoubleClick={handleView}
                    />
                )}
                
                {paginatedOrgs.length === 0 && !isLoading && (
                    <div className="text-center py-16">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">{t('pages.organization.empty.title')}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('pages.organization.empty.message')}</p>
                    </div>
                )}

                {totalPages > 1 && (
                    <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </footer>
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
            </div>
        </div>
    );
};

export default OrganizationPage;