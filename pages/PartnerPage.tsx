import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Partner, PartnerType } from '../types';
import { Icon } from '../components/Icons';
import { Table, Column } from '../components/ui/Table';
import { PartnerFormModal } from '../components/partner/PartnerFormModal';
import { Toast } from '../components/ui/Toast';
import { useDebounce } from '../hooks/useDebounce';
import { useLanguage } from '../hooks/useLanguage';
import { Pagination } from '../components/ui/Pagination';
import { Dropdown } from '../components/ui/Dropdown';
import { ColumnVisibilityDropdown } from '../components/ui/ColumnVisibilityDropdown';

type ModalMode = 'create' | 'edit' | 'view';
const ITEMS_PER_PAGE = 8;
const COLUMN_VISIBILITY_KEY = 'partner_column_visibility';

const PartnerPage: React.FC = () => {
    const { t } = useLanguage();
    const [partners, setPartners] = useState<Partner[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [modalState, setModalState] = useState<{ isOpen: boolean; mode: ModalMode; partner: Partner | null }>({
        isOpen: false,
        mode: 'create',
        partner: null,
    });
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ partner_type: 'all', status: 'all' });
    const [currentPage, setCurrentPage] = useState(1);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const fetchPartners = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('./data/partners.json');
            if (!response.ok) {
                throw new Error('Failed to fetch Partners');
            }
            const data: Partner[] = await response.json();
            setPartners(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPartners();
    }, [fetchPartners]);
    
    const allColumns: Column<Partner>[] = useMemo(() => [
        { key: 'partner_code', header: 'Partner Code' },
        { key: 'partner_name', header: 'Partner Name' },
        { 
            key: 'partner_type', 
            header: 'Partner Type', 
            render: (p) => (
              <div className="flex flex-wrap gap-1">
                {p.partner_type.map(type => (
                  <span key={type} className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                    {type}
                  </span>
                ))}
              </div>
            )
        },
        { key: 'phone', header: 'Phone' },
        { key: 'email', header: 'Email' },
        { key: 'status', header: 'Status', render: (p) => (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                p.status === 'Active' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`
            }>
                {p.status}
            </span>
        )},
        { key: 'updated_at', header: 'Updated At', render: (p) => new Date(p.updated_at).toLocaleDateString() },
        { key: 'actions', header: '', render: (p) => (
            <div className="flex justify-end items-center gap-2">
                <button onClick={() => handleView(p)} className="p-1 text-gray-500 hover:text-brand-primary dark:hover:text-blue-400">
                    <Icon name="Edit" className="w-4 h-4" />
                </button>
            </div>
        )}
    ], []);

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
        const mandatoryColumns = allColumns.filter(c => c.key === 'partner_code' || c.key === 'actions').map(c => c.key as string);
        setVisibleColumnKeys(new Set(mandatoryColumns));
    };
    
    const columns = useMemo(() => allColumns.filter(col => visibleColumnKeys.has(col.key as string)), [allColumns, visibleColumnKeys]);


    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const handleCreate = () => {
        setModalState({ isOpen: true, mode: 'create', partner: null });
    };
    
    const handleView = (partner: Partner) => {
        setModalState({ isOpen: true, mode: 'view', partner });
    };

    const switchToEditMode = () => {
        setModalState(prev => ({ ...prev, mode: 'edit' }));
    };
    
    const handleSave = (partnerToSave: Omit<Partner, 'id' | 'updated_at' | 'has_active_docs'>): Partner => {
        let savedPartner: Partner;
        if (modalState.mode === 'edit' && modalState.partner) {
            savedPartner = { ...modalState.partner, ...partnerToSave, updated_at: new Date().toISOString() };
            setPartners(prev => prev.map(p => p.id === savedPartner.id ? savedPartner : p));
            setToastInfo({ message: 'Partner updated successfully', type: 'success' });
        } else {
            const newPartnerCode = partnerToSave.partner_code.toUpperCase();
            savedPartner = { 
                ...partnerToSave, 
                id: newPartnerCode,
                partner_code: newPartnerCode,
                updated_at: new Date().toISOString(),
                has_active_docs: false // New partners don't have active docs
            };
            setPartners(prev => [savedPartner, ...prev]);
            setToastInfo({ message: 'Partner created successfully', type: 'success' });
        }
        return savedPartner;
    };
    
    const handleSaveAndContinue = (partnerToSave: Omit<Partner, 'id' | 'updated_at' | 'has_active_docs'>) => {
        const savedPartner = handleSave(partnerToSave);
        setModalState(prev => ({ ...prev, mode: 'edit', partner: savedPartner }));
    };

    const handleSaveAndClose = (partnerToSave: Omit<Partner, 'id' | 'updated_at' | 'has_active_docs'>) => {
        handleSave(partnerToSave);
        setModalState({ isOpen: false, mode: 'create', partner: null });
    };

    const filteredPartners = useMemo(() => {
        return partners
            .filter(partner => {
                const search = debouncedSearchTerm.toLowerCase();
                return partner.partner_code.toLowerCase().includes(search) ||
                       partner.partner_name.toLowerCase().includes(search) ||
                       (partner.email && partner.email.toLowerCase().includes(search)) ||
                       (partner.phone && partner.phone.includes(search));
            })
            .filter(partner => {
                if (filters.partner_type !== 'all' && !partner.partner_type.includes(filters.partner_type as PartnerType)) return false;
                if (filters.status !== 'all' && partner.status !== filters.status) return false;
                return true;
            });
    }, [partners, debouncedSearchTerm, filters]);

    const paginatedPartners = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filteredPartners.slice(start, end);
    }, [filteredPartners, currentPage]);

    const totalPages = useMemo(() => {
        return Math.ceil(filteredPartners.length / ITEMS_PER_PAGE);
    }, [filteredPartners]);

    return (
        <div className="space-y-4">
             <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('menu.masterData')} / <span className="font-semibold text-gray-800 dark:text-gray-200">{t('menu.partner')}</span>
            </div>
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
                             placeholder="Search by code/name/type..." 
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none"
                           />
                        </div>
                         <select name="partner_type" value={filters.partner_type} onChange={handleFilterChange} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none">
                            <option value="all">All Partner Types</option>
                            {["Supplier", "Customer", "3PL", "Internal"].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
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
                    <Table<Partner>
                        columns={columns}
                        data={paginatedPartners}
                        onRowDoubleClick={handleView}
                    />
                )}
                
                {paginatedPartners.length === 0 && !isLoading && (
                    <div className="text-center py-16">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">No Partners Found</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Click 'Create' to add the first partner.</p>
                    </div>
                )}
                
                {totalPages > 1 && (
                    <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </footer>
                )}

                {modalState.isOpen && (
                    <PartnerFormModal
                        isOpen={modalState.isOpen}
                        mode={modalState.mode}
                        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                        onSaveAndContinue={handleSaveAndContinue}
                        onSaveAndClose={handleSaveAndClose}
                        onSwitchToEdit={switchToEditMode}
                        partner={modalState.partner}
                        existingPartners={partners}
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

export default PartnerPage;