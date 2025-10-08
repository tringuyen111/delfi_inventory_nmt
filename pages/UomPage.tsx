
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Uom } from '../types';
import { Icon } from '../components/Icons';
import { Table, Column } from '../components/ui/Table';
import { UomFormModal } from '../components/uom/UomFormModal';
import { Toast } from '../components/ui/Toast';
import { FilterDrawer } from '../components/ui/FilterDrawer';
import { useDebounce } from '../hooks/useDebounce';
import { useLanguage } from '../hooks/useLanguage';

type ModalMode = 'create' | 'edit' | 'view';

const UomPage: React.FC = () => {
    const { t } = useLanguage();
    const [uoms, setUoms] = useState<Uom[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [modalState, setModalState] = useState<{ isOpen: boolean; mode: ModalMode; uom: Uom | null }>({
        isOpen: false,
        mode: 'create',
        uom: null,
    });
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<Record<string, string[]>>({});

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const fetchUoms = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('./data/uoms.json');
            if (!response.ok) {
                throw new Error('Failed to fetch Units of Measure');
            }
            const data: Uom[] = await response.json();
            setUoms(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUoms();
    }, [fetchUoms]);

    const handleCreate = () => {
        setModalState({ isOpen: true, mode: 'create', uom: null });
    };
    
    const handleView = (uom: Uom) => {
        setModalState({ isOpen: true, mode: 'view', uom });
    };

    const switchToEditMode = () => {
        setModalState(prev => ({ ...prev, mode: 'edit' }));
    };

    const handleSave = (uomToSave: Uom): Uom => {
        let savedUom: Uom;
        if (modalState.mode === 'edit' && modalState.uom) {
            savedUom = { ...uomToSave, id: modalState.uom.id };
            setUoms(prev => prev.map(u => u.id === savedUom.id ? savedUom : u));
            setToastInfo({ message: t('pages.uom.toast.updated'), type: 'success' });
        } else { // create mode
            savedUom = { ...uomToSave, id: `uom-${Date.now()}` };
            setUoms(prev => [savedUom, ...prev]);
            setToastInfo({ message: t('pages.uom.toast.created'), type: 'success' });
        }
        return savedUom;
    };
    
    const handleSaveAndContinue = (uomToSave: Uom) => {
        const savedUom = handleSave(uomToSave);
        setModalState(prev => ({ ...prev, mode: 'edit', uom: savedUom }));
    };

    const handleSaveAndClose = (uomToSave: Uom) => {
        handleSave(uomToSave);
        setModalState({ isOpen: false, mode: 'create', uom: null });
    };

    const filteredUoms = useMemo(() => {
        return uoms
            .filter(uom => {
                const search = debouncedSearchTerm.toLowerCase();
                return uom.uom_code.toLowerCase().includes(search) ||
                       uom.uom_name.toLowerCase().includes(search) ||
                       uom.measurement_type.toLowerCase().includes(search);
            })
            .filter(uom => {
                return Object.entries(filters).every(([key, values]) => {
                    if (!Array.isArray(values) || values.length === 0) return true;
                    return values.includes(uom[key as keyof Uom] as string);
                });
            });
    }, [uoms, debouncedSearchTerm, filters]);

    const columns: Column<Uom>[] = useMemo(() => [
        { key: 'uom_code', header: t('pages.uom.table.code') },
        { key: 'uom_name', header: t('pages.uom.table.name') },
        { key: 'measurement_type', header: t('pages.uom.table.measurementType') },
        { key: 'uom_type', header: t('pages.uom.table.uomType') },
        { key: 'base_uom', header: t('pages.uom.table.baseUom') },
        { key: 'conv_factor', header: t('pages.uom.table.factor') },
        { key: 'status', header: t('common.status'), render: (uom) => (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                uom.status === 'Active' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`
            }>
                {t(`common.${uom.status.toLowerCase()}`)}
            </span>
        )},
        { key: 'updated_at', header: t('common.updatedAt'), render: (uom) => new Date(uom.updated_at).toLocaleDateString() },
        { key: 'actions', header: '', render: (uom) => (
            <div className="flex justify-end items-center gap-2">
                <button onClick={() => handleView(uom)} className="p-1 text-gray-500 hover:text-brand-primary dark:hover:text-blue-400">
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
                             placeholder={t('pages.uom.searchPlaceholder')}
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             className="w-64 pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none"
                           />
                        </div>
                        <button onClick={() => setIsFilterOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
                            <Icon name="Filter" className="w-4 h-4"/> {t('common.filter')}
                        </button>
                         <button onClick={fetchUoms} className="p-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
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
                <Table<Uom>
                    columns={columns}
                    data={filteredUoms}
                    onRowDoubleClick={handleView}
                />
            )}
            
            {filteredUoms.length === 0 && !isLoading && (
                <div className="text-center py-16">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">{t('pages.uom.empty.title')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('pages.uom.empty.message')}</p>
                </div>
            )}

            {modalState.isOpen && (
                <UomFormModal
                    isOpen={modalState.isOpen}
                    mode={modalState.mode}
                    onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                    onSaveAndContinue={handleSaveAndContinue}
                    onSaveAndClose={handleSaveAndClose}
                    onSwitchToEdit={switchToEditMode}
                    uom={modalState.uom}
                    existingUoms={uoms}
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
                    { key: 'measurement_type', label: t('pages.uom.table.measurementType'), options: ["Piece","Weight","Volume","Length","Area","Time"]},
                    { key: 'uom_type', label: t('pages.uom.table.uomType'), options: ["Base","Alt"]},
                    { key: 'status', label: t('common.status'), options: ["Active","Inactive"]}
                ]}
            />
        </div>
    );
};

export default UomPage;
