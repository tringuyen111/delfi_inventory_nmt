import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Partner } from '../types';
import { Icon } from '../components/Icons';
import { Table, Column } from '../components/ui/Table';
import { PartnerFormModal } from '../components/partner/PartnerFormModal';
import { Toast } from '../components/ui/Toast';
import { FilterDrawer } from '../components/ui/FilterDrawer';
import { useDebounce } from '../hooks/useDebounce';

type ModalMode = 'create' | 'edit' | 'view';

const PartnerPage: React.FC = () => {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [modalState, setModalState] = useState<{ isOpen: boolean; mode: ModalMode; partner: Partner | null }>({
        isOpen: false,
        mode: 'create',
        partner: null,
    });
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<Record<string, string[]>>({});

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
                       partner.partner_type.join(' ').toLowerCase().includes(search) ||
                       (partner.email && partner.email.toLowerCase().includes(search)) ||
                       (partner.phone && partner.phone.includes(search));
            })
            .filter(partner => {
                return Object.entries(filters).every(([key, values]) => {
                    // FIX: Add a type guard to ensure `values` is an array before accessing its properties, resolving a potential type inference issue.
                    if (!Array.isArray(values) || values.length === 0) return true;
                     if (key === 'partner_type') {
                        return values.some(v => partner.partner_type.includes(v as any));
                    }
                    return values.includes(partner[key as keyof Partner] as string);
                });
            });
    }, [partners, debouncedSearchTerm, filters]);

    const columns: Column<Partner>[] = useMemo(() => [
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

    return (
        <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
            <header className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                        <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-blue-700">
                            <Icon name="Plus" className="w-4 h-4"/> Create
                        </button>
                    </div>
                    <div className="flex gap-2 items-center">
                        <div className="relative">
                           <Icon name="Search" className="w-4 h-4 absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"/>
                           <input 
                             type="text" 
                             placeholder="Search by code/name/type..." 
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             className="w-64 pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none"
                           />
                        </div>
                        <button onClick={() => setIsFilterOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
                            <Icon name="Filter" className="w-4 h-4"/> Filter
                        </button>
                         <button onClick={fetchPartners} className="p-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
                           <Icon name="RefreshCw" className="w-4 h-4"/>
                        </button>
                    </div>
                </div>
            </header>

            {isLoading ? (
                <div className="p-8 text-center">Loading data...</div>
            ) : error ? (
                <div className="p-8 text-center text-red-500">Error: {error}</div>
            ) : (
                <Table<Partner>
                    columns={columns}
                    data={filteredPartners}
                    onRowDoubleClick={handleView}
                />
            )}
            
            {filteredPartners.length === 0 && !isLoading && (
                <div className="text-center py-16">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">No Partners Found</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Click 'Create' to add the first partner.</p>
                </div>
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
            <FilterDrawer
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                filters={filters}
                onApplyFilters={setFilters}
                onClearFilters={() => setFilters({})}
                filterOptions={[
                    { key: 'partner_type', label: 'Partner Type', options: ["Supplier", "Customer", "3PL", "Internal"]},
                    { key: 'status', label: 'Status', options: ["Active","Inactive"]}
                ]}
            />
        </div>
    );
};

export default PartnerPage;