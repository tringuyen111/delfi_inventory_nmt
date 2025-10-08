import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { OnhandByLocation, UserWarehouse, Warehouse, ModelGoods, GoodsType } from '../types';
import { Icon } from '../components/Icons';
import { Table, Column } from '../components/ui/Table';
import { useDebounce } from '../hooks/useDebounce';
import { OnhandDetailModal } from '../components/onhand/OnhandDetailModal';
import { useLanguage } from '../hooks/useLanguage';
import { Pagination } from '../components/ui/Pagination';
import { Dropdown } from '../components/ui/Dropdown';
import { ColumnVisibilityDropdown } from '../components/ui/ColumnVisibilityDropdown';

const ITEMS_PER_PAGE = 10;
const COLUMN_VISIBILITY_KEY = 'onhand_column_visibility';


const OnhandPage: React.FC = () => {
    const { t } = useLanguage();
    const [onhandData, setOnhandData] = useState<OnhandByLocation[]>([]);
    const [userWarehouses, setUserWarehouses] = useState<UserWarehouse[]>([]);
    const [allWarehouses, setAllWarehouses] = useState<Warehouse[]>([]);
    const [allGoodsTypes, setAllGoodsTypes] = useState<GoodsType[]>([]);

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<OnhandByLocation | null>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ wh_code: 'all', goods_type_code: 'all', tracking_type: 'all' });
    const [currentPage, setCurrentPage] = useState(1);
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [onhandRes, userWhRes, allWhRes, gtRes] = await Promise.all([
                fetch('./data/onhand_by_location.json'),
                fetch('./data/user_warehouses.json'),
                fetch('./data/warehouses.json'),
                fetch('./data/goods_types.json')
            ]);
            if (!onhandRes.ok || !userWhRes.ok || !allWhRes.ok || !gtRes.ok) {
                throw new Error('Failed to fetch all required data for the Onhand page.');
            }
            const onhand: OnhandByLocation[] = await onhandRes.json();
            const userWhs: UserWarehouse[] = await userWhRes.json();
            const allWhs: Warehouse[] = await allWhRes.json();
            const gts: GoodsType[] = await gtRes.json();
            
            setOnhandData(onhand);
            setUserWarehouses(userWhs);
            setAllWarehouses(allWhs);
            setAllGoodsTypes(gts);

        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const allColumns: Column<OnhandByLocation>[] = useMemo(() => [
        { key: 'wh_code', header: 'Warehouse' },
        { key: 'loc_code', header: 'Location' },
        { 
            key: 'item', 
            header: 'Item Code',
            render: (item) => (
                <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{item.model_code}</p>
                    <p className="text-gray-600 dark:text-gray-400 truncate max-w-xs">{item.model_name}</p>
                    <div className="flex gap-2 mt-1">
                        {item.onhand_qty < 0 && <span className="px-2 py-0.5 text-xs font-bold text-red-100 bg-red-600 rounded-full">Negative</span>}
                        {item.low_stock_threshold != null && item.available_qty <= item.low_stock_threshold && <span className="px-2 py-0.5 text-xs font-bold text-yellow-800 bg-yellow-300 rounded-full">Low stock</span>}
                        {item.has_near_expiry && <span className="px-2 py-0.5 text-xs font-bold text-orange-800 bg-orange-300 rounded-full">Near expiry</span>}
                    </div>
                </div>
            )
        },
        { key: 'goods_type_code', header: 'Goods Type' },
        { key: 'tracking_type', header: 'Tracking', render: (item) => {
            const styles = { None: 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200', Serial: 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300', Lot: 'bg-indigo-200 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' };
            return <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[item.tracking_type]}`}>{item.tracking_type}</span>;
        }},
        { key: 'base_uom', header: 'UOM' },
        { key: 'onhand_qty', header: 'Onhand', align: 'right', render: item => item.onhand_qty.toLocaleString() },
        { key: 'allocated_qty', header: 'Allocated', align: 'right', render: item => item.allocated_qty.toLocaleString() },
        { key: 'available_qty', header: 'Available', align: 'right', render: item => item.available_qty.toLocaleString() },
        { key: 'last_movement_at', header: 'Last Movement', render: item => new Date(item.last_movement_at).toLocaleString() },
        { key: 'actions', header: '', width: 56, render: () => (
            <div className="flex justify-center">
                <Icon name="ChevronRight" className="w-5 h-5 text-gray-400" />
            </div>
        )},
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
        const mandatoryColumns = allColumns.filter(c => c.key === 'item' || c.key === 'actions').map(c => c.key as string);
        setVisibleColumnKeys(new Set(mandatoryColumns));
    };
    
    const columns = useMemo(() => allColumns.filter(col => visibleColumnKeys.has(col.key as string)), [allColumns, visibleColumnKeys]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const filteredOnhand = useMemo(() => {
        return onhandData
            .filter(item => {
                const search = debouncedSearchTerm.toLowerCase();
                return item.model_code.toLowerCase().includes(search) ||
                       item.model_name.toLowerCase().includes(search);
            })
            .filter(item => {
                if (filters.wh_code !== 'all' && item.wh_code !== filters.wh_code) return false;
                if (filters.goods_type_code !== 'all' && item.goods_type_code !== filters.goods_type_code) return false;
                if (filters.tracking_type !== 'all' && item.tracking_type !== filters.tracking_type) return false;
                return true;
            })
            .sort((a, b) => {
                const whCompare = a.wh_code.localeCompare(b.wh_code);
                if (whCompare !== 0) return whCompare;
                const locCompare = a.loc_code.localeCompare(b.loc_code);
                if (locCompare !== 0) return locCompare;
                return a.model_code.localeCompare(b.model_code);
            });
    }, [onhandData, debouncedSearchTerm, filters]);
    
    const paginatedOnhand = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filteredOnhand.slice(start, end);
    }, [filteredOnhand, currentPage]);

    const totalPages = useMemo(() => {
        return Math.ceil(filteredOnhand.length / ITEMS_PER_PAGE);
    }, [filteredOnhand]);


    const pageTotals = useMemo(() => {
        const totals = filteredOnhand.reduce((acc, item) => {
            acc.onhand_qty += item.onhand_qty;
            acc.allocated_qty += item.allocated_qty;
            acc.available_qty += item.available_qty;
            return acc;
        }, { onhand_qty: 0, allocated_qty: 0, available_qty: 0 });
        
        return {
            onhand_qty: totals.onhand_qty.toLocaleString(),
            allocated_qty: totals.allocated_qty.toLocaleString(),
            available_qty: totals.available_qty.toLocaleString(),
        };
    }, [filteredOnhand]);

    return (
        <div className="space-y-4">
             <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('menu.warehouseOps')} / <span className="font-semibold text-gray-800 dark:text-gray-200">{t('menu.onhandInventory')}</span>
            </div>
            <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
                <header className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                         <div className="flex items-center gap-2">
                            <Icon name="Filter" className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            <h2 className="text-lg font-semibold">{t('common.filter')}</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-grow">
                           <Icon name="Search" className="w-4 h-4 absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"/>
                           <input 
                             type="text" 
                             placeholder="Search item code/name..." 
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none"
                           />
                        </div>
                        <select name="wh_code" value={filters.wh_code} onChange={handleFilterChange} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none">
                            <option value="all">All Warehouses</option>
                            {allWarehouses.map(w => <option key={w.wh_code} value={w.wh_code}>{w.wh_name}</option>)}
                        </select>
                        <select name="goods_type_code" value={filters.goods_type_code} onChange={handleFilterChange} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none">
                            <option value="all">All Goods Types</option>
                            {allGoodsTypes.map(gt => <option key={gt.goods_type_code} value={gt.goods_type_code}>{gt.goods_type_name}</option>)}
                        </select>
                        <select name="tracking_type" value={filters.tracking_type} onChange={handleFilterChange} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none">
                            <option value="all">All Tracking</option>
                            {['None', 'Serial', 'Lot'].map(t => <option key={t} value={t}>{t}</option>)}
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
                    <Table<OnhandByLocation>
                        columns={columns}
                        data={paginatedOnhand}
                        onRowClick={setSelectedItem}
                    />
                )}
                
                {filteredOnhand.length === 0 && !isLoading && !error && (
                    <div className="text-center py-16">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">No Inventory Data</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Adjust filters or check warehouse access rights.</p>
                    </div>
                )}
                
                {(filteredOnhand.length > 0 || totalPages > 1) && (
                    <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <div className="flex gap-4 text-sm">
                            <span className="font-semibold">Totals:</span>
                            <span>Onhand: <span className="font-bold">{pageTotals.onhand_qty}</span></span>
                            <span>Allocated: <span className="font-bold">{pageTotals.allocated_qty}</span></span>
                            <span>Available: <span className="font-bold">{pageTotals.available_qty}</span></span>
                        </div>
                       {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
                    </footer>
                )}

                <OnhandDetailModal
                    isOpen={!!selectedItem}
                    onClose={() => setSelectedItem(null)}
                    item={selectedItem}
                />
            </div>
        </div>
    );
};

export default OnhandPage;