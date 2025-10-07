import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GoodsIssue, Partner, Warehouse, ModelGoods, Location, OnhandByLocation } from '../types';
import { Icon } from '../components/Icons';
import { Table, Column } from '../components/ui/Table';
import { GoodsIssueFormModal } from '../components/goods_issue/GoodsIssueFormModal';
import { Toast } from '../components/ui/Toast';
import { FilterDrawer } from '../components/ui/FilterDrawer';
import { useDebounce } from '../hooks/useDebounce';
import { StatusBadge } from '../components/ui/StatusBadge';

type ModalMode = 'create' | 'edit' | 'view';

const GoodsIssuePage: React.FC = () => {
    const [issues, setIssues] = useState<GoodsIssue[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [modelGoods, setModelGoods] = useState<ModelGoods[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [onhand, setOnhand] = useState<OnhandByLocation[]>([]);
    const [onhandLots, setOnhandLots] = useState<Record<string, any[]>>({});
    const [onhandSerials, setOnhandSerials] = useState<Record<string, string[]>>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [modalState, setModalState] = useState<{ isOpen: boolean; mode: ModalMode; issue: GoodsIssue | null }>({
        isOpen: false,
        mode: 'create',
        issue: null,
    });
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<Record<string, string[]>>({});

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const partnerMap = useMemo(() => new Map(partners.map(p => [p.partner_code, p.partner_name])), [partners]);
    const warehouseMap = useMemo(() => new Map(warehouses.map(w => [w.wh_code, w.wh_name])), [warehouses]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [issuesRes, partnersRes, warehousesRes, modelsRes, locationsRes, onhandRes, onhandLotsRes, onhandSerialsRes] = await Promise.all([
                fetch('./data/goods_issues.json'),
                fetch('./data/partners.json'),
                fetch('./data/warehouses.json'),
                fetch('./data/model_goods.json'),
                fetch('./data/locations.json'),
                fetch('./data/onhand_by_location.json'),
                fetch('./data/onhand_lots_by_location.json'),
                fetch('./data/onhand_serials_by_location.json'),
            ]);
            if (!issuesRes.ok || !partnersRes.ok || !warehousesRes.ok || !modelsRes.ok || !locationsRes.ok || !onhandRes.ok || !onhandLotsRes.ok || !onhandSerialsRes.ok) {
                throw new Error('Failed to fetch required data');
            }
            const issuesResponse = await issuesRes.json();
            const issuesData: GoodsIssue[] = issuesResponse.records;
            const partnersData: Partner[] = await partnersRes.json();
            const warehousesData: Warehouse[] = await warehousesRes.json();
            const modelsData: ModelGoods[] = await modelsRes.json();
            const locationsData: Location[] = await locationsRes.json();
            const onhandData: OnhandByLocation[] = await onhandRes.json();
            const onhandLotsData = await onhandLotsRes.json();
            const onhandSerialsData = await onhandSerialsRes.json();
            
            setIssues(issuesData);
            setPartners(partnersData);
            setWarehouses(warehousesData);
            setModelGoods(modelsData);
            setLocations(locationsData);
            setOnhand(onhandData);
            setOnhandLots(onhandLotsData);
            setOnhandSerials(onhandSerialsData);

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
        setModalState({ isOpen: true, mode: 'create', issue: null });
    };
    
    const handleView = async (issue: GoodsIssue) => {
        const linesRes = await fetch('./data/goods_issue_lines.json');
        const historyRes = await fetch('./data/goods_issue_history.json');
        const linesData = await linesRes.json();
        const historyData = await historyRes.json();

        const fullIssue = {
            ...issue,
            lines: linesData[issue.gi_no] || [],
            history: historyData[issue.gi_no] || [],
        };
        setModalState({ isOpen: true, mode: 'view', issue: fullIssue });
    };

    // Placeholder for save/update logic
    const handleSave = () => {
        setToastInfo({ message: 'Save functionality is not implemented yet.', type: 'error' });
    };

    const filteredIssues = useMemo(() => {
        return issues
            .filter(r => {
                const search = debouncedSearchTerm.toLowerCase();
                return r.gi_no.toLowerCase().includes(search) ||
                       (r.ref_no && r.ref_no.toLowerCase().includes(search)) ||
                       (r.partner_code && partnerMap.get(r.partner_code)?.toLowerCase().includes(search));
            })
            .filter(r => {
                return Object.entries(filters).every(([key, values]) => {
                    if (!Array.isArray(values) || values.length === 0) return true;
                    return values.includes(r[key as keyof GoodsIssue] as string);
                });
            });
    }, [issues, debouncedSearchTerm, filters, partnerMap]);

    const columns: Column<GoodsIssue>[] = useMemo(() => [
        { key: 'gi_no', header: 'GI No' },
        { key: 'issue_type', header: 'Issue Type' },
        { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        { 
            key: 'partner_code', 
            header: 'Partner / Dest.', 
            render: (r) => r.issue_type === 'Transfer' 
                ? `WH: ${warehouseMap.get(r.dest_wh_code || '') || r.dest_wh_code}`
                : partnerMap.get(r.partner_code || '') || r.partner_code || '—'
        },
        { key: 'source_wh_code', header: 'Source Warehouse', render: (r) => warehouseMap.get(r.source_wh_code) || r.source_wh_code },
        { key: 'expected_date', header: 'Expected Date', render: (r) => r.expected_date ? new Date(r.expected_date).toLocaleDateString() : '—' },
        { key: 'handler', header: 'Handler' },
        { key: 'updated_at', header: 'Updated At', render: (r) => new Date(r.updated_at).toLocaleString() },
    ], [partnerMap, warehouseMap]);

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
                             placeholder="Search GI No, Ref No, Partner..." 
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
                <Table<GoodsIssue>
                    columns={columns}
                    data={filteredIssues}
                    onRowDoubleClick={handleView}
                />
            )}
            
            {filteredIssues.length === 0 && !isLoading && (
                <div className="text-center py-16">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">No Goods Issues Found</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Click 'Create' to start a new goods issue.</p>
                </div>
            )}

            {modalState.isOpen && (
                <GoodsIssueFormModal
                    isOpen={modalState.isOpen}
                    mode={modalState.mode}
                    onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                    issue={modalState.issue}
                    partners={partners}
                    warehouses={warehouses}
                    modelGoods={modelGoods}
                    locations={locations}
                    onhand={onhand}
                    onhandLotsByLocation={onhandLots}
                    onhandSerialsByLocation={onhandSerials}
                    onSave={handleSave}
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
                    { key: 'status', label: 'Status', options: ['Draft', 'New', 'Picking', 'AdjustmentRequested', 'Submitted', 'Completed', 'Cancelled']},
                    { key: 'issue_type', label: 'Issue Type', options: ['Sales Order', 'Transfer', 'Adjustment', 'Other']},
                    { key: 'source_wh_code', label: 'Source Warehouse', options: warehouses.map(w => w.wh_code), optionLabels: warehouseMap }
                ]}
            />
        </div>
    );
};

export default GoodsIssuePage;