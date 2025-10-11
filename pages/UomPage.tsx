import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Uom } from '../types';
import { Icon } from '../components/Icons';
import { Table, Column } from '../components/ui/Table';
import { UomFormModal } from '../components/uom/UomFormModal';
import { Toast } from '../components/ui/Toast';
import { useDebounce } from '../hooks/useDebounce';
import { useLanguage } from '../hooks/useLanguage';
import { Pagination } from '../components/ui/Pagination';
import { Dropdown } from '../components/ui/Dropdown';
import { ColumnVisibilityDropdown } from '../components/ui/ColumnVisibilityDropdown';

type ModalMode = 'create' | 'edit' | 'view';
const ITEMS_PER_PAGE = 8;
const COLUMN_VISIBILITY_KEY = 'uom_column_visibility';

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
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
      measurement_type: 'all',
      uom_type: 'all',
      status: 'all',
    });
    const [currentPage, setCurrentPage] = useState(1);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const fetchUoms = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('./data/uoms.json');
            if (!response.ok) {
                throw new Error('Failed to fetch Units of Measure');
            }
            const data: Uom[] = await response.json();
            data.sort((a, b) => a.uom_code.localeCompare(b.uom_code));
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

    const allColumns: Column<Uom>[] = useMemo(() => [
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
        const mandatoryColumns = allColumns.filter(c => c.key === 'uom_code' || c.key === 'actions').map(c => c.key as string);
        setVisibleColumnKeys(new Set(mandatoryColumns));
    };

    const columns = useMemo(() => allColumns.filter(col => visibleColumnKeys.has(col.key as string)), [allColumns, visibleColumnKeys]);


    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1); // Reset to first page on filter change
    };

    const handleCreate = () => {
        setModalState({ isOpen: true, mode: 'create', uom: null });
    };
    
    const handleView = (uom: Uom) => {
        setModalState({ isOpen: true, mode: 'view', uom });
    };

    const switchToEditMode = () => {
        setModalState(prev => ({ ...prev, mode: 'edit' }));
    };

    const handleSave = async (uomToSave: Partial<Uom>): Promise<Uom | null> => {
        // This is a mock save function as we are not using a real backend.
        // It will only update the state in the browser.
        const isCreating = !uomToSave.id;

        try {
            const savedUom: Uom = {
                uom_code: '', uom_name: '', measurement_type: 'Piece', uom_type: 'Base', status: 'Active', is_used_in_model_goods: false,
                ...uomToSave,
                id: isCreating ? `uom-${Date.now()}` : uomToSave.id!,
                updated_at: new Date().toISOString(),
            } as Uom;

            if (isCreating) {
                setUoms(prev => [savedUom, ...prev].sort((a, b) => a.uom_code.localeCompare(b.uom_code)));
                setToastInfo({ message: t('pages.uom.toast.created'), type: 'success' });
            } else {
                setUoms(prev => prev.map(u => (u.id === savedUom.id ? savedUom : u)));
                setToastInfo({ message: t('pages.uom.toast.updated'), type: 'success' });
            }
            return savedUom;
        } catch (e) {
            const error = e instanceof Error ? e.message : 'An unknown error occurred';
            setToastInfo({ message: `Error: ${error}`, type: 'error' });
            return null;
        }
    };

    const handleSaveAndContinue = async (uomToSave: Partial<Uom>) => {
        const savedUom = await handleSave(uomToSave);
        if (savedUom) {
            setModalState(prev => ({ ...prev, mode: 'edit', uom: savedUom }));
        }
    };
    
    const handleSaveAndClose = async (uomToSave: Partial<Uom>) => {
        const savedUom = await handleSave(uomToSave);
        if (savedUom) {
            setModalState({ isOpen: false, mode: 'create', uom: null });
        }
    };
    
    const filteredUoms = useMemo(() => {
        return uoms
            .filter(uom => {
                const search = debouncedSearchTerm.toLowerCase();
                return uom.uom_code.toLowerCase().includes(search) ||
                       uom.uom_name.toLowerCase().includes(search);
            })
            .filter(uom => {
                if (filters.measurement_type !== 'all' && uom.measurement_type !== filters.measurement_type) return false;
                if (filters.uom_type !== 'all' && uom.uom_type !== filters.uom_type) return false;
                if (filters.status !== 'all' && uom.status !== filters.status) return false;
                return true;
            });
    }, [uoms, debouncedSearchTerm, filters]);

    const paginatedUoms = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filteredUoms.slice(start, end);
    }, [filteredUoms, currentPage]);

    const totalPages = useMemo(() => {
        return Math.ceil(filteredUoms.length / ITEMS_PER_PAGE);
    }, [filteredUoms]);


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
                             placeholder={t('pages.uom.searchPlaceholder')}
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none"
                           />
                        </div>
                         <select name="measurement_type" value={filters.measurement_type} onChange={handleFilterChange} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none">
                            <option value="all">All Measurement Types</option>
                            {["Piece","Weight","Volume","Length","Area","Time"].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <select name="uom_type" value={filters.uom_type} onChange={handleFilterChange} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none">
                            <option value="all">All UoM Types</option>
                            {["Base","Alt"].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none">
                            <option value="all">All Statuses</option>
                            {["Active","Inactive"].map(o => <option key={o} value={o}>{o}</option>)}
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
                    <Table<Uom>
                        columns={columns}
                        data={paginatedUoms}
                        onRowDoubleClick={handleView}
                    />
                )}
                
                {paginatedUoms.length === 0 && !isLoading && (
                    <div className="text-center py-16">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">{t('pages.uom.empty.title')}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('pages.uom.empty.message')}</p>
                    </div>
                )}
                 
                 {totalPages > 1 && (
                    <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </footer>
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
            </div>
        </div>
    );
};

export default UomPage;