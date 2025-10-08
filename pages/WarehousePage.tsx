import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Warehouse, Branch } from '../types';
import { Icon } from '../components/Icons';
import { Table, Column } from '../components/ui/Table';
import { WarehouseFormModal } from '../components/warehouse/WarehouseFormModal';
import { Toast } from '../components/ui/Toast';
import { useDebounce } from '../hooks/useDebounce';
import { Pagination } from '../components/ui/Pagination';
import { useLanguage } from '../hooks/useLanguage';
import { Dropdown } from '../components/ui/Dropdown';
import { ColumnVisibilityDropdown } from '../components/ui/ColumnVisibilityDropdown';

type ModalMode = 'create' | 'edit' | 'view';
const ITEMS_PER_PAGE = 8;
const COLUMN_VISIBILITY_KEY = 'warehouse_column_visibility';

const WarehousePage: React.FC = () => {
    const { t } = useLanguage();
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [modalState, setModalState] = useState<{ isOpen: boolean; mode: ModalMode; warehouse: Warehouse | null }>({
        isOpen: false,
        mode: 'create',
        warehouse: null,
    });
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ branch_code: 'all', warehouse_type: 'all', status: 'all' });
    const [currentPage, setCurrentPage] = useState(1);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const branchMap = useMemo(() => new Map(branches.map(b => [b.branch_code, b.branch_name])), [branches]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [warehousesRes, branchesRes] = await Promise.all([
                fetch('./data/warehouses.json'),
                fetch('./data/branches.json'),
            ]);
            if (!warehousesRes.ok || !branchesRes.ok) {
                throw new Error('Failed to fetch data');
            }
            const warehousesData: Warehouse[] = await warehousesRes.json();
            const branchesData: Branch[] = await branchesRes.json();
            
            setWarehouses(warehousesData);
            setBranches(branchesData);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const allColumns: Column<Warehouse>[] = useMemo(() => [
        { key: 'wh_code', header: 'Warehouse Code' },
        { key: 'wh_name', header: 'Warehouse Name' },
        { key: 'branch_code', header: 'Branch', render: (wh) => branchMap.get(wh.branch_code) || wh.branch_code },
        { key: 'warehouse_type', header: 'Warehouse Type' },
        { key: 'capacity', header: 'Capacity' },
        { key: 'status', header: 'Status', render: (wh) => (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                wh.status === 'Active' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`
            }>
                {t(`common.${wh.status.toLowerCase()}`)}
            </span>
        )},
        { key: 'updated_at', header: 'Updated At', render: (wh) => new Date(wh.updated_at).toLocaleDateString() },
        { key: 'actions', header: '', render: (wh) => (
            <div className="flex justify-end items-center gap-2">
                <button onClick={() => handleView(wh)} className="p-1 text-gray-500 hover:text-brand-primary dark:hover:text-blue-400">
                    <Icon name="Edit" className="w-4 h-4" />
                </button>
            </div>
        )}
    ], [t, branchMap]);

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
        const mandatoryColumns = allColumns.filter(c => c.key === 'wh_code' || c.key === 'actions').map(c => c.key as string);
        setVisibleColumnKeys(new Set(mandatoryColumns));
    };
    
    const columns = useMemo(() => allColumns.filter(col => visibleColumnKeys.has(col.key as string)), [allColumns, visibleColumnKeys]);


    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const handleCreate = () => {
        setModalState({ isOpen: true, mode: 'create', warehouse: null });
    };
    
    const handleView = (warehouse: Warehouse) => {
        setModalState({ isOpen: true, mode: 'view', warehouse });
    };

    const switchToEditMode = () => {
        setModalState(prev => ({ ...prev, mode: 'edit' }));
    };
    
    const handleSave = (whToSave: Omit<Warehouse, 'id' | 'updated_at'>): Warehouse => {
        let savedWarehouse: Warehouse;
        if (modalState.mode === 'edit' && modalState.warehouse) {
            savedWarehouse = { ...modalState.warehouse, ...whToSave, updated_at: new Date().toISOString() };
            setWarehouses(prev => prev.map(w => w.id === savedWarehouse.id ? savedWarehouse : w));
            setToastInfo({ message: 'Warehouse updated successfully', type: 'success' });
        } else {
            const newWhCode = whToSave.wh_code.toUpperCase();
            savedWarehouse = { 
                ...whToSave, 
                id: newWhCode,
                wh_code: newWhCode,
                updated_at: new Date().toISOString(),
            };
            setWarehouses(prev => [savedWarehouse, ...prev]);
            setToastInfo({ message: 'Warehouse created successfully', type: 'success' });
        }
        return savedWarehouse;
    };
    
    const handleSaveAndContinue = (whToSave: Omit<Warehouse, 'id' | 'updated_at'>) => {
        const savedWarehouse = handleSave(whToSave);
        setModalState(prev => ({ ...prev, mode: 'edit', warehouse: savedWarehouse }));
    };

    const handleSaveAndClose = (whToSave: Omit<Warehouse, 'id' | 'updated_at'>) => {
        handleSave(whToSave);
        setModalState({ isOpen: false, mode: 'create', warehouse: null });
    };

    const filteredWarehouses = useMemo(() => {
        return warehouses
            .map(w => ({ ...w, branch_name: branchMap.get(w.branch_code) || w.branch_code }))
            .filter(warehouse => {
                const search = debouncedSearchTerm.toLowerCase();
                return warehouse.wh_code.toLowerCase().includes(search) ||
                       warehouse.wh_name.toLowerCase().includes(search) ||
                       (warehouse.branch_name && warehouse.branch_name.toLowerCase().includes(search));
            })
            .filter(warehouse => {
                if (filters.branch_code !== 'all' && warehouse.branch_code !== filters.branch_code) return false;
                if (filters.warehouse_type !== 'all' && warehouse.warehouse_type !== filters.warehouse_type) return false;
                if (filters.status !== 'all' && warehouse.status !== filters.status) return false;
                return true;
            });
    }, [warehouses, debouncedSearchTerm, filters, branchMap]);
    
    const paginatedWarehouses = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filteredWarehouses.slice(start, end);
    }, [filteredWarehouses, currentPage]);

    const totalPages = useMemo(() => Math.ceil(filteredWarehouses.length / ITEMS_PER_PAGE), [filteredWarehouses]);

    return (
        <div className="space-y-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('menu.masterData')} / <span className="font-semibold text-gray-800 dark:text-gray-200">{t('menu.warehouse')}</span>
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
                             placeholder="Search by code/name/branch..." 
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none"
                           />
                        </div>
                        <select name="branch_code" value={filters.branch_code} onChange={handleFilterChange} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none">
                            <option value="all">All Branches</option>
                            {branches.map(b => <option key={b.id} value={b.branch_code}>{b.branch_name}</option>)}
                        </select>
                        <select name="warehouse_type" value={filters.warehouse_type} onChange={handleFilterChange} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none">
                            <option value="all">All Types</option>
                            {["Central", "Sub", "Virtual"].map(o => <option key={o} value={o}>{o}</option>)}
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
                    <div className="p-8 text-center">Loading data...</div>
                ) : error ? (
                    <div className="p-8 text-center text-red-500">Error: {error}</div>
                ) : (
                    <Table<Warehouse>
                        columns={columns}
                        data={paginatedWarehouses}
                        onRowDoubleClick={handleView}
                    />
                )}
                
                {paginatedWarehouses.length === 0 && !isLoading && (
                    <div className="text-center py-16">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">No Warehouses Found</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Click 'Create' to add the first warehouse.</p>
                    </div>
                )}
                
                {totalPages > 1 && (
                     <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </footer>
                )}

                {modalState.isOpen && (
                    <WarehouseFormModal
                        isOpen={modalState.isOpen}
                        mode={modalState.mode}
                        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                        onSaveAndContinue={handleSaveAndContinue}
                        onSaveAndClose={handleSaveAndClose}
                        onSwitchToEdit={switchToEditMode}
                        warehouse={modalState.warehouse}
                        existingWarehouses={warehouses}
                        branches={branches}
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

export default WarehousePage;