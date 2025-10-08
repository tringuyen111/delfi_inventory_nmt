import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { InventoryCount, Warehouse, Location, ModelGoods, OnhandByLocation, StatusHistoryEvent, InventoryCountLine } from '../types';
import { Icon } from '../components/Icons';
import { Table, Column } from '../components/ui/Table';
import { InventoryCountFormModal } from '../components/inventory_count/InventoryCountFormModal';
import { Toast } from '../components/ui/Toast';
import { FilterDrawer } from '../components/ui/FilterDrawer';
import { useDebounce } from '../hooks/useDebounce';
import { StatusBadge } from '../components/ui/StatusBadge';

type ModalMode = 'create' | 'edit' | 'view';
const CURRENT_USER = "Alex Nguyen";

const InventoryCountPage: React.FC = () => {
    const [counts, setCounts] = useState<InventoryCount[]>([]);
    const [lines, setLines] = useState<Record<string, InventoryCountLine[]>>({});
    const [history, setHistory] = useState<Record<string, StatusHistoryEvent[]>>({});
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [modelGoods, setModelGoods] = useState<ModelGoods[]>([]);
    const [onhand, setOnhand] = useState<OnhandByLocation[]>([]);
    const [onhandLots, setOnhandLots] = useState<Record<string, any[]>>({});
    const [onhandSerials, setOnhandSerials] = useState<Record<string, any[]>>({});
    
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [modalState, setModalState] = useState<{ isOpen: boolean; mode: ModalMode; count: InventoryCount | null }>({
        isOpen: false,
        mode: 'create',
        count: null,
    });
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<Record<string, string[]>>({});

    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const warehouseMap = useMemo(() => new Map(warehouses.map(w => [w.wh_code, w.wh_name])), [warehouses]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [countsRes, linesRes, historyRes, whRes, locRes, modelsRes, onhandRes, lotsRes, serialsRes] = await Promise.all([
                fetch('./data/inventory_counts.json'),
                fetch('./data/inventory_count_lines.json'),
                fetch('./data/inventory_count_history.json'),
                fetch('./data/warehouses.json'),
                fetch('./data/locations.json'),
                fetch('./data/model_goods.json'),
                fetch('./data/onhand_by_location.json'),
                fetch('./data/onhand_lots_by_location.json'),
                fetch('./data/onhand_serials_by_location.json'),
            ]);
            if (!countsRes.ok || !linesRes.ok || !historyRes.ok || !whRes.ok || !locRes.ok || !modelsRes.ok || !onhandRes.ok || !lotsRes.ok || !serialsRes.ok) {
                throw new Error('Failed to fetch required data for Inventory Count');
            }
            setCounts(await countsRes.json());
            setLines(await linesRes.json());
            setHistory(await historyRes.json());
            setWarehouses(await whRes.json());
            setLocations(await locRes.json());
            setModelGoods(await modelsRes.json());
            setOnhand(await onhandRes.json());
            setOnhandLots(await lotsRes.json());
            setOnhandSerials(await serialsRes.json());

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
        setModalState({ isOpen: true, mode: 'create', count: null });
    };
    
    const handleView = (count: InventoryCount) => {
        const fullCount = {
            ...count,
            lines: lines[count.ic_no] || [],
            history: history[count.ic_no] || [],
        };
        const newMode = count.status === 'Draft' ? 'edit' : 'view';
        setModalState({ isOpen: true, mode: newMode, count: fullCount });
    };

    const handleSave = (
        countData: Omit<InventoryCount, 'id' | 'ic_no' | 'created_at' | 'updated_at' | 'created_by' | 'handler' | 'lines' | 'history'>,
        linesData: InventoryCountLine[],
        targetStatus: 'Draft' | 'New'
    ) => {
        // Snapshot logic
        const linesWithSnapshot = linesData.map(line => {
            const onhandItem = onhand.find(o => o.model_code === line.model_code && o.loc_code === line.location_code && o.wh_code === countData.wh_code);
            return {
                ...line,
                system_qty: onhandItem ? onhandItem.onhand_qty : 0,
            };
        });

        let savedCount: InventoryCount;
        const now = new Date().toISOString();
        
        if (modalState.count && modalState.mode === 'edit') {
            savedCount = { ...modalState.count, ...countData, status: targetStatus, updated_at: now, lines: linesWithSnapshot };
            setCounts(prev => prev.map(c => c.id === savedCount.id ? savedCount : c));
        } else {
             const year = new Date().getFullYear();
             const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
             const seq = (counts.length + 1).toString().padStart(3, '0');
             const newIcNo = `IC-${year}${month}-${seq}`;
             savedCount = {
                ...countData,
                id: newIcNo,
                ic_no: newIcNo,
                status: targetStatus,
                created_at: now,
                updated_at: now,
                created_by: CURRENT_USER,
                lines: linesWithSnapshot,
                history: [{ id: `hist-${Date.now()}`, doc_id: newIcNo, status: targetStatus, user: CURRENT_USER, timestamp: now, note: "Document created."}]
            };
            setCounts(prev => [savedCount, ...prev]);
            setHistory(prev => ({...prev, [newIcNo]: savedCount.history}));
        }
        
        setLines(prev => ({...prev, [savedCount.ic_no]: linesWithSnapshot}));
        setToastInfo({ message: `Inventory Count saved as ${targetStatus}`, type: 'success' });
        setModalState({isOpen: false, mode: 'create', count: null});
    };

    const filteredCounts = useMemo(() => {
        return counts
            .filter(c => c.ic_no.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
            .filter(c => {
                return Object.entries(filters).every(([key, values]) => {
                    if (!Array.isArray(values) || values.length === 0) return true;
                    return values.includes(c[key as keyof InventoryCount] as string);
                });
            });
    }, [counts, debouncedSearchTerm, filters]);

    const columns: Column<InventoryCount>[] = useMemo(() => [
        { key: 'ic_no', header: 'Count No' },
        { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
        { key: 'wh_code', header: 'Warehouse', render: (c) => warehouseMap.get(c.wh_code) || c.wh_code },
        { key: 'created_by', header: 'Created By' },
        { key: 'created_at', header: 'Created At', render: (c) => new Date(c.created_at).toLocaleDateString() },
        { key: 'handler', header: 'Handler' },
        { key: 'updated_at', header: 'Updated At', render: (c) => new Date(c.updated_at).toLocaleString() },
    ], [warehouseMap]);

    return (
        <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
            <header className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                    <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-blue-700">
                        <Icon name="Plus" className="w-4 h-4"/> Create
                    </button>
                    <div className="flex gap-2 items-center">
                        <div className="relative">
                           <Icon name="Search" className="w-4 h-4 absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"/>
                           <input 
                             type="text" 
                             placeholder="Search Count No..." 
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             className="w-64 pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md"
                           />
                        </div>
                        <button onClick={() => setIsFilterOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md">
                            <Icon name="Filter" className="w-4 h-4"/> Filter
                        </button>
                         <button onClick={fetchData} className="p-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md">
                           <Icon name="RefreshCw" className="w-4 h-4"/>
                        </button>
                    </div>
                </div>
            </header>

            {isLoading && <div className="p-8 text-center">Loading data...</div>}
            {error && <div className="p-8 text-center text-red-500">Error: {error}</div>}
            {!isLoading && !error && (
                <Table<InventoryCount>
                    columns={columns}
                    data={filteredCounts}
                    onRowDoubleClick={handleView}
                />
            )}
            
            {filteredCounts.length === 0 && !isLoading && (
                <div className="text-center py-16">
                    <h3 className="text-lg font-medium">No Inventory Counts Found</h3>
                    <p className="text-sm text-gray-500 mt-1">Click 'Create' to start a new count.</p>
                </div>
            )}

            {modalState.isOpen && (
                <InventoryCountFormModal
                    isOpen={modalState.isOpen}
                    mode={modalState.mode}
                    onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                    onSave={handleSave}
                    count={modalState.count}
                    warehouses={warehouses}
                    locations={locations}
                    modelGoods={modelGoods}
                    onhand={onhand}
                    onhandLots={onhandLots}
                    onhandSerials={onhandSerials}
                />
            )}
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            <FilterDrawer
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                filters={filters}
                onApplyFilters={setFilters}
                onClearFilters={() => setFilters({})}
                filterOptions={[
                    { key: 'status', label: 'Status', options: ['Draft', 'New', 'Counting', 'Submitted', 'Completed', 'Cancelled']},
                    { key: 'wh_code', label: 'Warehouse', options: warehouses.map(w => w.wh_code), optionLabels: warehouseMap }
                ]}
            />
        </div>
    );
};

export default InventoryCountPage;
