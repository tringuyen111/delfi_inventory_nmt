import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { OnhandByLocation, UserWarehouse, Warehouse, ModelGoods, GoodsType } from '../types';
import { Icon } from '../components/Icons';
import { Table, Column } from '../components/ui/Table';
import { useDebounce } from '../hooks/useDebounce';
import { OnhandDetailModal } from '../components/onhand/OnhandDetailModal';
import { FilterDrawer } from '../components/ui/FilterDrawer';

const OnhandPage: React.FC = () => {
    const [onhandData, setOnhandData] = useState<OnhandByLocation[]>([]);
    const [userWarehouses, setUserWarehouses] = useState<UserWarehouse[]>([]);
    const [allWarehouses, setAllWarehouses] = useState<Warehouse[]>([]);
    const [allModels, setAllModels] = useState<ModelGoods[]>([]);
    const [allGoodsTypes, setAllGoodsTypes] = useState<GoodsType[]>([]);

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<OnhandByLocation | null>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<Record<string, any>>({});
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [onhandRes, userWhRes, allWhRes, modelsRes, gtRes] = await Promise.all([
                fetch('./data/onhand_by_location.json'),
                fetch('./data/user_warehouses.json'),
                fetch('./data/warehouses.json'),
                fetch('./data/model_goods.json'),
                fetch('./data/goods_types.json')
            ]);
            if (!onhandRes.ok || !userWhRes.ok || !allWhRes.ok || !modelsRes.ok || !gtRes.ok) {
                throw new Error('Failed to fetch all required data for the Onhand page.');
            }
            const onhand: OnhandByLocation[] = await onhandRes.json();
            const userWhs: UserWarehouse[] = await userWhRes.json();
            const allWhs: Warehouse[] = await allWhRes.json();
            const models: ModelGoods[] = await modelsRes.json();
            const gts: GoodsType[] = await gtRes.json();
            
            setOnhandData(onhand);
            setUserWarehouses(userWhs);
            setAllWarehouses(allWhs);
            setAllModels(models);
            setAllGoodsTypes(gts);

            // Set initial filter to user's warehouses
            setFilters({ wh_code: userWhs.map(w => w.wh_code) });

        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredOnhand = useMemo(() => {
        return onhandData
            .filter(item => {
                const search = debouncedSearchTerm.toLowerCase();
                return item.model_code.toLowerCase().includes(search) ||
                       item.model_name.toLowerCase().includes(search);
            })
            .filter(item => {
                return Object.entries(filters).every(([key, value]) => {
                    // FIX: Add a type guard to ensure `value` is an array before accessing its properties, resolving a potential type inference issue.
                    if (value === undefined || (Array.isArray(value) && value.length === 0)) return true;
                    if (key === 'only_negative' && value) return item.onhand_qty < 0;
                    if (key === 'only_low_stock' && value) return item.low_stock_threshold != null && item.available_qty <= item.low_stock_threshold;
                    if (key === 'near_expiry_days' && value) return item.has_near_expiry;
                    if (key === 'loc_code' && value) return item.loc_code.toLowerCase().includes((value as string).toLowerCase());
                    if (Array.isArray(value)) {
                         return value.includes(item[key as keyof OnhandByLocation] as string);
                    }
                    return true;
                });
            })
            .sort((a, b) => {
                const whCompare = a.wh_code.localeCompare(b.wh_code);
                if (whCompare !== 0) return whCompare;
                const locCompare = a.loc_code.localeCompare(b.loc_code);
                if (locCompare !== 0) return locCompare;
                return a.model_code.localeCompare(b.model_code);
            });
    }, [onhandData, debouncedSearchTerm, filters]);

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


    const columns: Column<OnhandByLocation>[] = useMemo(() => [
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

    return (
        <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
            <header className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                     <h2 className="text-lg font-bold">Onhand</h2>
                    <div className="flex gap-2 items-center">
                        <div className="relative">
                           <Icon name="Search" className="w-4 h-4 absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"/>
                           <input 
                             type="text" 
                             placeholder="Search item code/name..." 
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             className="w-72 pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none"
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
                <Table<OnhandByLocation>
                    columns={columns}
                    data={filteredOnhand}
                    onRowClick={setSelectedItem}
                    footerData={pageTotals}
                />
            )}
            
            {filteredOnhand.length === 0 && !isLoading && !error && (
                <div className="text-center py-16">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">No Inventory Data</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Adjust filters or check warehouse access rights.</p>
                </div>
            )}
            
            <OnhandDetailModal
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                item={selectedItem}
            />

            <FilterDrawer
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                filters={filters}
                onApplyFilters={setFilters}
                onClearFilters={() => setFilters({ wh_code: userWarehouses.map(w => w.wh_code) })}
                filterOptions={[
                    { key: 'wh_code', label: 'Warehouse', options: allWarehouses.map(w => w.wh_code), optionLabels: new Map(allWarehouses.map(w => [w.wh_code, w.wh_name])) },
                    { key: 'loc_code', label: 'Location Code', type: 'text' },
                    { key: 'model_code', label: 'Model Goods', options: allModels.map(m => m.model_code), optionLabels: new Map(allModels.map(m => [m.model_code, m.model_name])) },
                    { key: 'goods_type_code', label: 'Goods Type', options: allGoodsTypes.map(gt => gt.goods_type_code), optionLabels: new Map(allGoodsTypes.map(gt => [gt.goods_type_code, gt.goods_type_name])) },
                    { key: 'tracking_type', label: 'Tracking', options: ['None', 'Serial', 'Lot'] },
                    { key: 'only_negative', label: 'Only Negative Stock', type: 'toggle' },
                    { key: 'only_low_stock', label: 'Only Low Stock', type: 'toggle' },
                    { key: 'near_expiry_days', label: 'Near Expiry (days)', type: 'number', default: 30 }
                ]}
            />
        </div>
    );
};

export default OnhandPage;