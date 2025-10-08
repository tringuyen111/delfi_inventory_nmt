import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GoodsTransfer, GoodsIssue, GoodsReceipt, Warehouse, ModelGoods, OnhandByLocation, GoodsTransferLine, DocStatus } from '../types';
import { Icon } from '../components/Icons';
import { Table, Column } from '../components/ui/Table';
import { GoodsTransferFormModal } from '../components/goods_transfer/GoodsTransferFormModal';
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
const COLUMN_VISIBILITY_KEY = 'goods_transfer_column_visibility';

interface GoodsTransferPageProps {
  docToOpen?: string | null;
  onDeepLinkHandled?: () => void;
}

const GoodsTransferPage: React.FC<GoodsTransferPageProps> = ({ docToOpen, onDeepLinkHandled }) => {
    const { t } = useLanguage();
    const [transfers, setTransfers] = useState<GoodsTransfer[]>([]);
    const [transferLines, setTransferLines] = useState<Record<string, GoodsTransferLine[]>>({});
    const [issues, setIssues] = useState<GoodsIssue[]>([]);
    const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [modelGoods, setModelGoods] = useState<ModelGoods[]>([]);
    const [onhand, setOnhand] = useState<OnhandByLocation[]>([]);
    
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [modalState, setModalState] = useState<{ isOpen: boolean; mode: ModalMode; transfer: GoodsTransfer | null }>({
        isOpen: false,
        mode: 'create',
        transfer: null,
    });
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ status: 'all', source_wh_code: 'all', dest_wh_code: 'all' });
    const [currentPage, setCurrentPage] = useState(1);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const warehouseMap = useMemo(() => new Map(warehouses.map(w => [w.wh_code, w.wh_name])), [warehouses]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [transfersRes, linesRes, issuesRes, receiptsRes, whRes, modelsRes, onhandRes] = await Promise.all([
                fetch('./data/goods_transfers.json'),
                fetch('./data/goods_transfer_lines.json'),
                fetch('./data/goods_issues.json'),
                fetch('./data/goods_receipts.json'),
                fetch('./data/warehouses.json'),
                fetch('./data/model_goods.json'),
                fetch('./data/onhand_by_location.json'),
            ]);
            if (!transfersRes.ok || !linesRes.ok || !issuesRes.ok || !receiptsRes.ok || !whRes.ok || !modelsRes.ok || !onhandRes.ok) {
                throw new Error('Failed to fetch required data for Goods Transfer');
            }
            setTransfers(await transfersRes.json());
            setTransferLines(await linesRes.json());
            setIssues(await issuesRes.json());
            setReceipts(await receiptsRes.json());
            setWarehouses(await whRes.json());
            setModelGoods(await modelsRes.json());
            setOnhand(await onhandRes.json());
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getDerivedStatus = (transfer: GoodsTransfer): DocStatus => {
        if (transfer.status === 'Completed' || transfer.status === 'Cancelled' || transfer.status === 'Draft') {
            return transfer.status;
        }

        const linkedGI = issues.find(i => i.gi_no === transfer.linked_gi_no);
        const linkedGR = receipts.find(r => r.gr_no === transfer.linked_gr_no);

        if (linkedGR) {
            return linkedGR.status === 'Completed' ? 'Completed' : 'Receiving';
        }
        if (linkedGI) {
            if (linkedGI.status === 'Completed') return 'Receiving'; // As GR is auto-created
            if (['Picking', 'Submitted', 'AdjustmentRequested'].includes(linkedGI.status)) return 'Exporting';
        }
        return 'Created';
    };
    
    const handleSave = (transferData: Omit<GoodsTransfer, 'id' | 'gt_no' | 'created_at' | 'updated_at' | 'created_by' | 'lines' | 'history'>, linesData: GoodsTransferLine[], targetStatus: 'Draft' | 'Created') => {
        let savedTransfer: GoodsTransfer;
        const now = new Date().toISOString();
        const isEditing = modalState.mode === 'edit' && modalState.transfer;

        if (isEditing) {
            savedTransfer = { ...modalState.transfer!, ...transferData, status: targetStatus, updated_at: now, lines: linesData };
            setTransfers(prev => prev.map(t => t.id === savedTransfer.id ? savedTransfer : t));
        } else {
            const year = new Date().getFullYear();
            const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
            const seq = (transfers.length + 1).toString().padStart(3, '0');
            const newGtNo = `GT-${year}${month}-${seq}`;
            savedTransfer = { ...transferData, id: newGtNo, gt_no: newGtNo, status: targetStatus, created_at: now, updated_at: now, created_by: CURRENT_USER, lines: linesData, history: [] };
            setTransfers(prev => [savedTransfer, ...prev]);
        }
        
        setTransferLines(prev => ({ ...prev, [savedTransfer.gt_no]: linesData }));
        
        // --- AUTOMATION SIMULATION ---
        if (targetStatus === 'Created') {
            // Auto-create Goods Issue
            const newGiNo = `GI-${savedTransfer.gt_no.split('-')[1]}-${savedTransfer.gt_no.split('-')[2]}`;
            const newGI: GoodsIssue = {
                id: newGiNo, gi_no: newGiNo, issue_type: 'Transfer', issue_mode: 'Summary', status: 'New',
                ref_no: savedTransfer.gt_no, source_wh_code: savedTransfer.source_wh_code, dest_wh_code: savedTransfer.dest_wh_code,
                created_at: now, updated_at: now, created_by: 'System', lines: [], history: [], gt_no: savedTransfer.gt_no
            };
            setIssues(prev => [...prev, newGI]);
            setTransfers(prev => prev.map(t => t.id === savedTransfer.id ? { ...t, linked_gi_no: newGiNo } : t));
        }

        setToastInfo({ message: t('pages.goodsTransfer.toast.saved', { status: targetStatus }), type: 'success' });
        setModalState({ isOpen: false, mode: 'create', transfer: null });
    };
    
    const handleCancel = (gtNo: string) => {
        const transfer = transfers.find(t => t.gt_no === gtNo);
        if (!transfer) return;

        const linkedGI = issues.find(i => i.gi_no === transfer.linked_gi_no);
        if (linkedGI && linkedGI.status === 'Completed') {
            setToastInfo({ message: t('pages.goodsTransfer.toast.cantCancel'), type: 'error' });
            return;
        }

        // Cancel GT
        setTransfers(prev => prev.map(t => t.gt_no === gtNo ? { ...t, status: 'Cancelled' } : t));
        // Cancel linked GI (if exists)
        if (linkedGI) {
            setIssues(prev => prev.map(i => i.id === linkedGI.id ? { ...i, status: 'Cancelled' } : i));
        }
        // Cancel linked GR (if exists)
        const linkedGR = receipts.find(r => r.gr_no === transfer.linked_gr_no);
        if (linkedGR) {
            setReceipts(prev => prev.map(r => r.id === linkedGR.id ? { ...r, status: 'Cancelled' } : r));
        }

        setToastInfo({ message: t('pages.goodsTransfer.toast.cancelled', { gtNo }), type: 'success' });
        setModalState({isOpen: false, mode: 'view', transfer: null});
    };

    const handleView = useCallback((transfer: GoodsTransfer) => {
        const fullTransfer = { ...transfer, lines: transferLines[transfer.gt_no] || [] };
        const newMode = transfer.status === 'Draft' ? 'edit' : 'view';
        setModalState({ isOpen: true, mode: newMode, transfer: fullTransfer });
    }, [transferLines]);

    useEffect(() => {
        if (docToOpen && !isLoading && transfers.length > 0) {
            const transferToView = transfers.find(t => t.gt_no === docToOpen);
            if (transferToView) {
                handleView(transferToView);
            }
            onDeepLinkHandled?.();
        }
    }, [docToOpen, isLoading, transfers, onDeepLinkHandled, handleView]);

    const handleCreate = () => {
        setModalState({ isOpen: true, mode: 'create', transfer: null });
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const filteredTransfers = useMemo(() => {
        const derived = transfers.map(t => ({...t, derivedStatus: getDerivedStatus(t)}));
        return derived
            .filter(t => t.gt_no.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
            .filter(t => {
                if (filters.status !== 'all' && t.derivedStatus !== filters.status) return false;
                if (filters.source_wh_code !== 'all' && t.source_wh_code !== filters.source_wh_code) return false;
                if (filters.dest_wh_code !== 'all' && t.dest_wh_code !== filters.dest_wh_code) return false;
                return true;
            });
    }, [transfers, debouncedSearchTerm, filters, issues, receipts]);
    
    const paginatedTransfers = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filteredTransfers.slice(start, end);
    }, [filteredTransfers, currentPage]);

    const totalPages = useMemo(() => Math.ceil(filteredTransfers.length / ITEMS_PER_PAGE), [filteredTransfers]);


    const allColumns: Column<GoodsTransfer & { derivedStatus: DocStatus }>[] = useMemo(() => [
        { key: 'gt_no', header: t('pages.goodsTransfer.table.gtNo') },
        { key: 'gt_type', header: t('pages.goodsTransfer.table.type') },
        { key: 'status', header: t('pages.goodsTransfer.table.status'), render: (t) => <StatusBadge status={t.derivedStatus} /> },
        { key: 'source_wh_code', header: t('pages.goodsTransfer.table.source'), render: (t) => warehouseMap.get(t.source_wh_code) || t.source_wh_code },
        { key: 'dest_wh_code', header: t('pages.goodsTransfer.table.destination'), render: (t) => warehouseMap.get(t.dest_wh_code) || t.dest_wh_code },
        { key: 'expected_date', header: t('pages.goodsTransfer.table.expectedDate'), render: (t) => t.expected_date ? new Date(t.expected_date).toLocaleDateString() : '—' },
        { key: 'updated_at', header: t('common.updatedAt'), render: (t) => new Date(t.updated_at).toLocaleString() },
    ], [t, warehouseMap]);

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
    const handleHideAll = () => setVisibleColumnKeys(new Set(['gt_no']));
    const columns = useMemo(() => allColumns.filter(col => visibleColumnKeys.has(col.key as string)), [allColumns, visibleColumnKeys]);

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
                             placeholder={t('pages.goodsTransfer.searchPlaceholder')}
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none"
                           />
                        </div>
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none">
                            <option value="all">All Statuses</option>
                            {['Draft', 'Created', 'Exporting', 'Receiving', 'Completed', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select name="source_wh_code" value={filters.source_wh_code} onChange={handleFilterChange} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none">
                            <option value="all">All Source Warehouses</option>
                            {warehouses.map(w => <option key={w.id} value={w.wh_code}>{w.wh_name}</option>)}
                        </select>
                        <select name="dest_wh_code" value={filters.dest_wh_code} onChange={handleFilterChange} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none">
                            <option value="all">All Destination Warehouses</option>
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
                {!isLoading && !error && <Table columns={columns} data={paginatedTransfers} onRowDoubleClick={handleView} />}
                
                {paginatedTransfers.length === 0 && !isLoading && <div className="text-center py-16"><h3 className="text-lg font-medium">{t('pages.goodsTransfer.empty.title')}</h3><p className="text-sm text-gray-500 mt-1">{t('pages.goodsTransfer.empty.message')}</p></div>}
                
                {totalPages > 1 && (
                    <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </footer>
                )}

                {modalState.isOpen && <GoodsTransferFormModal isOpen={modalState.isOpen} mode={modalState.mode} onClose={() => setModalState({ ...modalState, isOpen: false })} onSave={handleSave} onCancel={handleCancel} transfer={modalState.transfer} warehouses={warehouses} warehouseMap={warehouseMap} modelGoods={modelGoods} onhand={onhand} issues={issues} receipts={receipts} />}
                {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            </div>
        </div>
    );
};

export default GoodsTransferPage;