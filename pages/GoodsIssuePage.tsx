import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GoodsIssue, Partner, Warehouse, GoodsIssueLine, StatusHistoryEvent, ModelGoods, OnhandByLocation } from '../types';
import { Icon } from '../components/Icons';
import { Table, Column } from '../components/ui/Table';
import { GoodsIssueFormModal } from '../components/goods_issue/GoodsIssueFormModal';
import { Toast } from '../components/ui/Toast';
import { useDebounce } from '../hooks/useDebounce';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useLanguage } from '../hooks/useLanguage';
import { Pagination } from '../components/ui/Pagination';
import { Dropdown } from '../components/ui/Dropdown';
import { ColumnVisibilityDropdown } from '../components/ui/ColumnVisibilityDropdown';

type ModalMode = 'create' | 'edit' | 'view';
const CURRENT_USER = "Alex Nguyen"; // Mock current user for actions
const ITEMS_PER_PAGE = 8;
const COLUMN_VISIBILITY_KEY = 'goods_issue_column_visibility';

const GoodsIssuePage: React.FC = () => {
    const { t } = useLanguage();
    const [issues, setIssues] = useState<GoodsIssue[]>([]);
    const [lines, setLines] = useState<Record<string, GoodsIssueLine[]>>({});
    const [history, setHistory] = useState<Record<string, StatusHistoryEvent[]>>({});
    const [partners, setPartners] = useState<Partner[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [modelGoods, setModelGoods] = useState<ModelGoods[]>([]);
    const [onhand, setOnhand] = useState<OnhandByLocation[]>([]);
    const [onhandLots, setOnhandLots] = useState<Record<string, any[]>>({});
    const [onhandSerials, setOnhandSerials] = useState<Record<string, any[]>>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [modalState, setModalState] = useState<{ isOpen: boolean; mode: ModalMode; issue: GoodsIssue | null }>({
        isOpen: false,
        mode: 'create',
        issue: null,
    });
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ status: 'all', issue_type: 'all', source_wh_code: 'all' });
    const [currentPage, setCurrentPage] = useState(1);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const partnerMap = useMemo(() => new Map(partners.map(p => [p.partner_code, p.partner_name])), [partners]);
    const warehouseMap = useMemo(() => new Map(warehouses.map(w => [w.wh_code, w.wh_name])), [warehouses]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [issuesRes, partnersRes, warehousesRes, linesRes, historyRes, modelsRes, onhandRes, lotRes, serialRes] = await Promise.all([
                fetch('./data/goods_issues.json'),
                fetch('./data/partners.json'),
                fetch('./data/warehouses.json'),
                fetch('./data/goods_issue_lines.json'),
                fetch('./data/goods_issue_history.json'),
                fetch('./data/model_goods.json'),
                fetch('./data/onhand_by_location.json'),
                fetch('./data/onhand_lots_by_location.json'),
                fetch('./data/onhand_serials_by_location.json'),
            ]);
            if (!issuesRes.ok || !partnersRes.ok || !warehousesRes.ok || !linesRes.ok || !historyRes.ok || !modelsRes.ok || !onhandRes.ok || !lotRes.ok || !serialRes.ok) {
                throw new Error('Failed to fetch required data for Goods Issue');
            }
            const issuesData: GoodsIssue[] = await issuesRes.json();
            const partnersData: Partner[] = await partnersRes.json();
            const warehousesData: Warehouse[] = await warehousesRes.json();
            const linesData = await linesRes.json();
            const historyData = await historyRes.json();
            const modelsData: ModelGoods[] = await modelsRes.json();
            
            setIssues(issuesData);
            setPartners(partnersData);
            setWarehouses(warehousesData);
            setLines(linesData);
            setHistory(historyData);
            setModelGoods(modelsData);
            setOnhand(await onhandRes.json());
            setOnhandLots(await lotRes.json());
            setOnhandSerials(await serialRes.json());

        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const handleCreate = () => {
        setModalState({ isOpen: true, mode: 'create', issue: null });
    };
    
    const handleView = (issue: GoodsIssue) => {
        const fullIssue = {
            ...issue,
            lines: lines[issue.gi_no] || [],
            history: history[issue.gi_no] || [],
        };
        setModalState({ isOpen: true, mode: 'view', issue: fullIssue });
    };

    const switchToEditMode = () => {
        if (modalState.issue && ['Draft'].includes(modalState.issue.status)) {
            setModalState(prev => ({ ...prev, mode: 'edit' }));
        } else {
            setToastInfo({ message: t('pages.goodsIssue.toast.cantEdit'), type: 'error' });
        }
    };
    
    const updateIssueState = (giNo: string, updates: Partial<GoodsIssue>, historyNote: string) => {
        let updatedIssue: GoodsIssue | undefined;
        const newIssues = issues.map(r => {
            if (r.gi_no === giNo) {
                updatedIssue = { ...r, ...updates, updated_at: new Date().toISOString() };
                return updatedIssue;
            }
            return r;
        });

        if (updatedIssue) {
            const newHistoryEvent: StatusHistoryEvent = {
                id: `hist-${Date.now()}`,
                doc_id: giNo,
                status: updatedIssue.status,
                user: CURRENT_USER,
                timestamp: updatedIssue.updated_at,
                note: historyNote
            };
            const currentHistory = history[giNo] || [];
            if (!currentHistory.some(h => h.status === newHistoryEvent.status && h.user === newHistoryEvent.user)) {
                 const updatedHistory = { ...history, [giNo]: [...currentHistory, newHistoryEvent] };
                 setHistory(updatedHistory);
            }
        }
        
        setIssues(newIssues);
        return updatedIssue;
    };

    const handleSave = (
        savedIssue: GoodsIssue,
        targetStatus: 'Draft' | 'New'
    ) => {
        const isEditing = modalState.mode === 'edit' && modalState.issue;

        if (isEditing) {
            setIssues(prev => prev.map(r => r.id === savedIssue.id ? savedIssue : r));
        } else {
            setIssues(prev => [savedIssue, ...prev]);
        }
        
        const historyNote = isEditing 
            ? `Document updated and set to ${targetStatus}.`
            : `Document created with status ${targetStatus}.`;

        updateIssueState(savedIssue.gi_no, { status: savedIssue.status }, historyNote);
        setLines(prev => ({...prev, [savedIssue.gi_no]: savedIssue.lines}));

        setToastInfo({ message: t('pages.goodsIssue.toast.saved', {status: targetStatus}), type: 'success' });
        setModalState({isOpen: false, mode: 'create', issue: null});
    };

    const handleApprove = (giNo: string) => {
        updateIssueState(giNo, { status: 'Completed' }, 'Document approved. Inventory updated.');
        setToastInfo({ message: t('pages.goodsIssue.toast.approved', {giNo}), type: 'success'});
        setModalState({ isOpen: false, mode: 'view', issue: null });
    };
    
    const handleCancel = (giNo: string) => {
        updateIssueState(giNo, { status: 'Cancelled' }, 'Document cancelled by manager.');
        setToastInfo({ message: t('pages.goodsIssue.toast.cancelled', {giNo}), type: 'success'});
        setModalState({ isOpen: false, mode: 'view', issue: null });
    };

    const filteredIssues = useMemo(() => {
        return issues
            .filter(r => {
                const search = debouncedSearchTerm.toLowerCase();
                const partnerName = (r.partner_code && partnerMap.get(r.partner_code)) || '';
                return r.gi_no.toLowerCase().includes(search) ||
                       (r.ref_no && r.ref_no.toLowerCase().includes(search)) ||
                       partnerName.toLowerCase().includes(search);
            })
            .filter(r => {
                if (filters.status !== 'all' && r.status !== filters.status) return false;
                if (filters.issue_type !== 'all' && r.issue_type !== filters.issue_type) return false;
                if (filters.source_wh_code !== 'all' && r.source_wh_code !== filters.source_wh_code) return false;
                return true;
            });
    }, [issues, debouncedSearchTerm, filters, partnerMap]);

    const paginatedIssues = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filteredIssues.slice(start, end);
    }, [filteredIssues, currentPage]);

    const totalPages = useMemo(() => {
        return Math.ceil(filteredIssues.length / ITEMS_PER_PAGE);
    }, [filteredIssues]);

    const allColumns: Column<GoodsIssue>[] = useMemo(() => [
        { key: 'gi_no', header: 'GI No' },
        { key: 'issue_type', header: 'Issue Type' },
        { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        { 
            key: 'partner_code', 
            header: 'Partner / Destination', 
            render: (r) => r.issue_type === 'Transfer' 
                ? `WH: ${warehouseMap.get(r.dest_wh_code || '') || r.dest_wh_code}`
                : partnerMap.get(r.partner_code || '') || r.partner_code || '—'
        },
        { key: 'source_wh_code', header: 'Source Warehouse', render: (r) => warehouseMap.get(r.source_wh_code) || r.source_wh_code },
        { key: 'expected_date', header: 'Expected Date', render: (r) => r.expected_date ? new Date(r.expected_date).toLocaleDateString() : '—' },
        { key: 'handler', header: 'Handler' },
        { key: 'updated_at', header: 'Updated At', render: (r) => new Date(r.updated_at).toLocaleString() },
    ], [partnerMap, warehouseMap]);

    const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<string>>(() => {
        const saved = localStorage.getItem(COLUMN_VISIBILITY_KEY);
        if (saved) {
            return new Set(JSON.parse(saved));
        }
        // Add 'actions' column by default if it exists, even if it's not in the main list
        const defaultCols = new Set(allColumns.map(c => c.key as string));
        return defaultCols;
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
    const handleHideAll = () => setVisibleColumnKeys(new Set(['gi_no'])); // Keep at least one column visible
    const columns = useMemo(() => allColumns.filter(col => visibleColumnKeys.has(col.key as string)), [allColumns, visibleColumnKeys]);

    return (
        <div className="space-y-4">
             <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('menu.warehouseOps')} / <span className="font-semibold text-gray-800 dark:text-gray-200">{t('menu.goodsIssue')}</span>
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
                             placeholder="Search GI No, Ref No, Partner..." 
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none"
                           />
                        </div>
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3">
                            <option value="all">All Statuses</option>
                            {['Draft', 'New', 'Picking', 'AdjustmentRequested', 'Submitted', 'Completed', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select name="issue_type" value={filters.issue_type} onChange={handleFilterChange} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3">
                            <option value="all">All Issue Types</option>
                            {['Sales Order', 'Transfer', 'Return to Supplier', 'Manual'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                         <select name="source_wh_code" value={filters.source_wh_code} onChange={handleFilterChange} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3">
                            <option value="all">All Source Warehouses</option>
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

            {isLoading ? (
                <div className="p-8 text-center">{t('common.loading')}</div>
            ) : error ? (
                <div className="p-8 text-center text-red-500">{t('common.error')}: {error}</div>
            ) : (
                <Table<GoodsIssue>
                    columns={columns}
                    data={paginatedIssues}
                    onRowDoubleClick={handleView}
                />
            )}
            
            {paginatedIssues.length === 0 && !isLoading && (
                <div className="text-center py-16">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">No Goods Issues Found</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Click 'Create' to start a new goods issue.</p>
                </div>
            )}
            
            {totalPages > 1 && (
                <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </footer>
            )}


            {modalState.isOpen && (
                <GoodsIssueFormModal
                    isOpen={modalState.isOpen}
                    mode={modalState.mode}
                    onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                    onSave={handleSave}
                    onSwitchToEdit={switchToEditMode}
                    onApprove={handleApprove}
                    onCancel={handleCancel}
                    issue={modalState.issue}
                    partners={partners}
                    warehouses={warehouses}
                    warehouseMap={warehouseMap}
                    modelGoods={modelGoods}
                    onhand={onhand}
                    onhandLots={onhandLots}
                    onhandSerials={onhandSerials}
                    onShowToast={setToastInfo}
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

export default GoodsIssuePage;