import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Warehouse, Branch } from '../types';
import { Icon } from '../components/Icons';
import { Table, Column } from '../components/ui/Table';
import { WarehouseFormModal } from '../components/warehouse/WarehouseFormModal';
import { Toast } from '../components/ui/Toast';
import { FilterDrawer } from '../components/ui/FilterDrawer';
import { useDebounce } from '../hooks/useDebounce';

type ModalMode = 'create' | 'edit' | 'view';

const WarehousePage: React.FC = () => {
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
    const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<Record<string, string[]>>({});

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
                return Object.entries(filters).every(([key, values]) => {
                    // FIX: Add a type guard to ensure `values` is an array before accessing its properties, resolving a potential type inference issue.
                    if (!Array.isArray(values) || values.length === 0) return true;
                    return values.includes(warehouse[key as keyof Warehouse] as string);
                });
            });
    }, [warehouses, debouncedSearchTerm, filters, branchMap]);

    const columns: Column<Warehouse>[] = useMemo(() => [
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
                {wh.status}
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
    ], [branchMap]);

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
                             placeholder="Search by code/name/branch..." 
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             className="w-64 pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none"
                           />
                        </div>
                        <button onClick={() => setIsFilterOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
                            <Icon name="Filter" className="w-4 h-4"/> Filter
                        </button>
                         <button onClick={fetchData} className="p-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
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
                <Table<Warehouse>
                    columns={columns}
                    data={filteredWarehouses}
                    onRowDoubleClick={handleView}
                />
            )}
            
            {filteredWarehouses.length === 0 && !isLoading && (
                <div className="text-center py-16">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">No Warehouses Found</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Click 'Create' to add the first warehouse.</p>
                </div>
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
            <FilterDrawer
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                filters={filters}
                onApplyFilters={setFilters}
                onClearFilters={() => setFilters({})}
                filterOptions={[
                    { key: 'branch_code', label: 'Branch', options: branches.map(b => b.branch_code), optionLabels: branchMap },
                    { key: 'warehouse_type', label: 'Warehouse Type', options: ["Central", "Sub", "Virtual"]},
                    { key: 'status', label: 'Status', options: ["Active","Inactive"]}
                ]}
            />
        </div>
    );
};

export default WarehousePage;