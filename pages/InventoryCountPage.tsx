import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { InventoryCount, Warehouse, Location, ModelGoods, OnhandByLocation, StatusHistoryEvent, InventoryCountLine } from '../types';
import { Icon } from '../components/Icons';
import { Table, Column } from '../components/ui/Table';
import { InventoryCountFormModal } from '../components/inventory_count/InventoryCountFormModal';
import { Toast } from '../components/ui/Toast';
import { useDebounce } from '../hooks/useDebounce';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useLanguage } from '../hooks/useLanguage';
import { Pagination } from '../components/ui/Pagination';
import { Dropdown } from '../components/ui/Dropdown';
import { ColumnVisibilityDropdown } from '../components/ui/ColumnVisibilityDropdown';

type ModalMode = 'create' | 'edit' | 'view';
const CURRENT_USER = "Alex Nguyen";
const ITEMS_PER_PAGE = 8;
const COLUMN_VISIBILITY_KEY = 'inventory_count_column_visibility';

const InventoryCountPage: React.FC = () => {
    const { t } = useLanguage();
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
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ status: 'all', wh_code: 'all' });
    const [currentPage, setCurrentPage] = useState(1);

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
    
     const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const filteredCounts = useMemo(() => {
        return counts
            .filter(c => c.ic_no.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
            .filter(c => {
                 if (filters.status !== 'all' && c.status !== filters.status) return false;
                 if (filters.wh_code !== 'all' && c.wh_code !== filters.wh_code) return false;
                 return true;
            });
    }, [counts, debouncedSearchTerm, filters]);

    const paginatedCounts = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filteredCounts.slice(start, end);
    }, [filteredCounts, currentPage]);

    const totalPages = useMemo(() => {
        return Math.ceil(filteredCounts.length / ITEMS_PER_PAGE);
    }, [filteredCounts]);

    const allColumns: Column<InventoryCount>[] = useMemo(() => [
        { key: 'ic_no', header: 'Count No' },
        { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
        { key: 'wh_code', header: 'Warehouse', render: (c) => warehouseMap.get(c.wh_code) || c.wh_code },
        { key: 'created_by', header: 'Created By' },
        { key: 'created_at', header: 'Created At', render: (c) => new Date(c.created_at).toLocaleDateString() },
        { key: 'handler', header: 'Handler' },
        { key: 'updated_at', header: 'Updated At', render: (c) => new Date(c.updated_at).toLocaleString() },
    ], [warehouseMap]);

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
    const handleHideAll = () => setVisibleColumnKeys(new Set(['ic_no']));
    const columns = useMemo(() => allColumns.filter(col => visibleColumnKeys.has(col.key as string)), [allColumns, visibleColumnKeys]);

    return (
        <div className="space-y-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('menu.warehouseOps')} / <span className="font-semibold text-gray-800 dark:text-gray-200">{t('menu.inventoryCount')}</span>
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
                             placeholder="Search Count No..." 
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md"
                           />
                        </div>
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3">
                            <option value="all">All Statuses</option>
                             {['Draft', 'New', 'Counting', 'Submitted', 'Completed', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select name="wh_code" value={filters.wh_code} onChange={handleFilterChange} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3">
                            <option value="all">All Warehouses</option>
                            {warehouses.map(w => <option key={w.id} value={w.wh_code}>{w.wh_name}</option>)}
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
                                allColumns={allColumns}
                                visibleColumnKeys={visibleColumnKeys}
                                onColumnToggle={handleColumnToggle}
                                onShowAll={handleShowAll}
                                onHideAll={handleHideAll}
                            />
                        </Dropdown>
                    </div>
                </header>

                {isLoading && <div className="p-8 text-center">{t('common.loading')}</div>}
                {error && <div className="p-8 text-center text-red-500">{t('common.error')}: {error}</div>}
                {!isLoading && !error && (
                    <Table<InventoryCount>
                        columns={columns}
                        data={paginatedCounts}
                        onRowDoubleClick={handleView}
                    />
                )}
                
                {paginatedCounts.length === 0 && !isLoading && (
                    <div className="text-center py-16">
                        <h3 className="text-lg font-medium">No Inventory Counts Found</h3>
                        <p className="text-sm text-gray-500 mt-1">Click 'Create' to start a new count.</p>
                    </div>
                )}
                
                 {totalPages > 1 && (
                    <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </footer>
                )}

                {modalState.isOpen && (
                    <InventoryCountFormModal
                        isOpen={modalState.isOpen}
                        mode={modalState.mode}
                        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                        onSave={handleSave}
                        count={modalState.count}
                        warehouses={warehouses}
                        warehouseMap={warehouseMap}
                        locations={locations}
                        modelGoods={modelGoods}
                        onhand={onhand}
                        onhandLots={onhandLots}
                        onhandSerials={onhandSerials}
                    />
                )}
                {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            </div>
        </div>
    );
};

export default InventoryCountPage;