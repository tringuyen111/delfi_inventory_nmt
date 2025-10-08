import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GoodsReceipt, Partner, Warehouse, GoodsReceiptLine, StatusHistoryEvent, ModelGoods } from '../types';
import { Icon } from '../components/Icons';
import { Table, Column } from '../components/ui/Table';
import { GoodsReceiptFormModal } from '../components/goods_receipt/GoodsReceiptFormModal';
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
const COLUMN_VISIBILITY_KEY = 'goods_receipt_column_visibility';

interface GoodsReceiptPageProps {
  docToOpen?: string | null;
  onDeepLinkHandled?: () => void;
}

const GoodsReceiptPage: React.FC<GoodsReceiptPageProps> = ({ docToOpen, onDeepLinkHandled }) => {
    const { t } = useLanguage();
    const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
    const [lines, setLines] = useState<Record<string, GoodsReceiptLine[]>>({});
    const [history, setHistory] = useState<Record<string, StatusHistoryEvent[]>>({});
    const [partners, setPartners] = useState<Partner[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [modelGoods, setModelGoods] = useState<ModelGoods[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [modalState, setModalState] = useState<{ isOpen: boolean; mode: ModalMode; receipt: GoodsReceipt | null }>({
        isOpen: false,
        mode: 'create',
        receipt: null,
    });
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ status: 'all', receipt_type: 'all', dest_wh_code: 'all' });
    const [currentPage, setCurrentPage] = useState(1);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const partnerMap = useMemo(() => new Map(partners.map(p => [p.partner_code, p.partner_name])), [partners]);
    const warehouseMap = useMemo(() => new Map(warehouses.map(w => [w.wh_code, w.wh_name])), [warehouses]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [receiptsRes, partnersRes, warehousesRes, linesRes, historyRes, modelsRes] = await Promise.all([
                fetch('./data/goods_receipts.json'),
                fetch('./data/partners.json'),
                fetch('./data/warehouses.json'),
                fetch('./data/goods_receipt_lines.json'),
                fetch('./data/goods_receipt_history.json'),
                fetch('./data/model_goods.json'),
            ]);
            if (!receiptsRes.ok || !partnersRes.ok || !warehousesRes.ok || !linesRes.ok || !historyRes.ok || !modelsRes.ok) {
                throw new Error('Failed to fetch required data');
            }
            const receiptsData: GoodsReceipt[] = await receiptsRes.json();
            const partnersData: Partner[] = await partnersRes.json();
            const warehousesData: Warehouse[] = await warehousesRes.json();
            const linesData = await linesRes.json();
            const historyData = await historyRes.json();
            const modelsData: ModelGoods[] = await modelsRes.json();

            setReceipts(receiptsData);
            setPartners(partnersData);
            setWarehouses(warehousesData);
            setLines(linesData);
            setHistory(historyData);
            setModelGoods(modelsData);

        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleView = useCallback((receipt: GoodsReceipt) => {
        const fullReceipt = {
            ...receipt,
            lines: lines[receipt.gr_no] || [],
            history: history[receipt.gr_no] || [],
        };
        setModalState({ isOpen: true, mode: 'view', receipt: fullReceipt });
    }, [lines, history]);

    useEffect(() => {
        if (docToOpen && !isLoading && receipts.length > 0) {
            const receiptToView = receipts.find(r => r.gr_no === docToOpen);
            if (receiptToView) {
                handleView(receiptToView);
            }
            onDeepLinkHandled?.();
        }
    }, [docToOpen, isLoading, receipts, onDeepLinkHandled, handleView]);

     const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const handleCreate = () => {
        setModalState({ isOpen: true, mode: 'create', receipt: null });
    };

    const switchToEditMode = () => {
        if (modalState.receipt && ['Draft'].includes(modalState.receipt.status)) {
            setModalState(prev => ({ ...prev, mode: 'edit' }));
        } else {
            setToastInfo({ message: t('pages.goodsReceipt.toast.cantEdit'), type: 'error' });
        }
    };
    
    // --- State Transition Handlers ---
    const updateReceiptState = (grNo: string, updates: Partial<GoodsReceipt>, historyNote: string) => {
        let updatedReceipt: GoodsReceipt | undefined;
        const newReceipts = receipts.map(r => {
            if (r.gr_no === grNo) {
                updatedReceipt = { ...r, ...updates, updated_at: new Date().toISOString() };
                return updatedReceipt;
            }
            return r;
        });

        if (updatedReceipt) {
            const newHistoryEvent: StatusHistoryEvent = {
                id: `hist-${Date.now()}`,
                doc_id: grNo,
                status: updatedReceipt.status,
                user: CURRENT_USER,
                timestamp: updatedReceipt.updated_at,
                note: historyNote
            };
            const currentHistory = history[grNo] || [];
            if (!currentHistory.some(h => h.status === newHistoryEvent.status && h.user === newHistoryEvent.user)) {
                 const updatedHistory = { ...history, [grNo]: [...currentHistory, newHistoryEvent] };
                 setHistory(updatedHistory);
            }
        }
        
        setReceipts(newReceipts);
        return updatedReceipt;
    };

    const handleSave = (
        receiptData: Omit<GoodsReceipt, 'id' | 'gr_no' | 'created_at' | 'updated_at' | 'created_by' | 'handler' | 'lines' | 'history'>,
        linesData: GoodsReceiptLine[],
        targetStatus: 'Draft' | 'New'
    ) => {
        let savedReceipt: GoodsReceipt;
        const now = new Date().toISOString();
        
        const isEditing = modalState.mode === 'edit' && modalState.receipt;

        if (isEditing) {
            savedReceipt = { ...modalState.receipt!, ...receiptData, status: targetStatus, updated_at: now, lines: linesData };
            setReceipts(prev => prev.map(r => r.id === savedReceipt.id ? savedReceipt : r));
        } else {
             const year = new Date().getFullYear();
             const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
             const seq = (receipts.length + 1).toString().padStart(3, '0');
             const newGrNo = `GR-${year}${month}-${seq}`;

            savedReceipt = {
                ...receiptData,
                id: newGrNo,
                gr_no: newGrNo,
                status: targetStatus,
                created_at: now,
                updated_at: now,
                created_by: CURRENT_USER,
                lines: linesData,
                history: []
            };
            setReceipts(prev => [savedReceipt, ...prev]);
        }
        
        const historyNote = isEditing 
            ? `Document updated and set to ${targetStatus}.`
            : `Document created with status ${targetStatus}.`;

        updateReceiptState(savedReceipt.gr_no, { status: savedReceipt.status }, historyNote);
        setLines(prev => ({...prev, [savedReceipt.gr_no]: linesData}));

        const toastKey = targetStatus === 'Draft' ? 'pages.goodsReceipt.toast.savedDraft' : 'pages.goodsReceipt.toast.savedNew';
        setToastInfo({ message: t(toastKey), type: 'success' });
        setModalState({isOpen: false, mode: 'create', receipt: null});
    };

    const handleApprove = (grNo: string) => {
        updateReceiptState(grNo, { status: 'Completed' }, 'Document approved. Inventory updated.');
        setToastInfo({ message: t('pages.goodsReceipt.toast.approved', { grNo }), type: 'success'});
        setModalState({ isOpen: false, mode: 'view', receipt: null });
    };

    const handleReject = (grNo: string) => {
        const reason = prompt(t('pages.goodsReceipt.modal.rejectReasonPrompt'));
        if (reason) {
            updateReceiptState(grNo, { status: 'Rejected' }, `Rejected: ${reason}`);
            setToastInfo({ message: t('pages.goodsReceipt.toast.rejected', { grNo }), type: 'success'});
            setModalState({ isOpen: false, mode: 'view', receipt: null });
        }
    };
    
    const handleCancel = (grNo: string) => {
        if (window.confirm(t('pages.goodsReceipt.modal.cancelConfirm'))) {
            updateReceiptState(grNo, { status: 'Cancelled' }, 'Document cancelled by manager.');
            setToastInfo({ message: t('pages.goodsReceipt.toast.cancelled', { grNo }), type: 'success'});
            setModalState({ isOpen: false, mode: 'view', receipt: null });
        }
    };

    const filteredReceipts = useMemo(() => {
        return receipts
            .filter(r => {
                const search = debouncedSearchTerm.toLowerCase();
                return r.gr_no.toLowerCase().includes(search) ||
                       (r.ref_no && r.ref_no.toLowerCase().includes(search)) ||
                       (r.partner_code && (partnerMap.get(r.partner_code) || '').toLowerCase().includes(search));
            })
            .filter(r => {
                if (filters.status !== 'all' && r.status !== filters.status) return false;
                if (filters.receipt_type !== 'all' && r.receipt_type !== filters.receipt_type) return false;
                if (filters.dest_wh_code !== 'all' && r.dest_wh_code !== filters.dest_wh_code) return false;
                return true;
            });
    }, [receipts, debouncedSearchTerm, filters, partnerMap]);

    const paginatedReceipts = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filteredReceipts.slice(start, end);
    }, [filteredReceipts, currentPage]);

    const totalPages = useMemo(() => {
        return Math.ceil(filteredReceipts.length / ITEMS_PER_PAGE);
    }, [filteredReceipts]);


    const allColumns: Column<GoodsReceipt>[] = useMemo(() => [
        { key: 'gr_no', header: t('pages.goodsReceipt.table.grNo') },
        { key: 'receipt_type', header: t('pages.goodsReceipt.table.receiptType') },
        { key: 'status', header: t('pages.goodsReceipt.table.status'), render: (r) => <StatusBadge status={r.status} /> },
        { 
            key: 'partner_code', 
            header: t('pages.goodsReceipt.table.partnerSource'), 
            render: (r) => r.receipt_type === 'Transfer' 
                ? `WH: ${warehouseMap.get(r.source_wh_code || '') || r.source_wh_code}`
                : partnerMap.get(r.partner_code || '') || r.partner_code || '—'
        },
        { key: 'dest_wh_code', header: t('pages.goodsReceipt.table.destWarehouse'), render: (r) => warehouseMap.get(r.dest_wh_code) || r.dest_wh_code },
        { key: 'doc_date', header: t('pages.goodsReceipt.table.docDate'), render: (r) => new Date(r.doc_date).toLocaleDateString() },
        { key: 'handler', header: t('pages.goodsReceipt.table.handler') },
        { key: 'updated_at', header: t('common.updatedAt'), render: (r) => new Date(r.updated_at).toLocaleString() },
    ], [t, partnerMap, warehouseMap]);

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
    const handleHideAll = () => setVisibleColumnKeys(new Set(['gr_no'])); // Keep at least one column

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
                             placeholder={t('pages.goodsReceipt.searchPlaceholder')}
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none"
                           />
                        </div>
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3">
                            <option value="all">All Statuses</option>
                             {['Draft', 'New', 'Receiving', 'Submitted', 'Completed', 'Rejected', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select name="receipt_type" value={filters.receipt_type} onChange={handleFilterChange} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3">
                            <option value="all">All Receipt Types</option>
                            {['PO', 'Return', 'Transfer', 'Other'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select name="dest_wh_code" value={filters.dest_wh_code} onChange={handleFilterChange} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3">
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

            {isLoading ? (
                <div className="p-8 text-center">{t('common.loading')}</div>
            ) : error ? (
                <div className="p-8 text-center text-red-500">{t('common.error')}: {error}</div>
            ) : (
                <Table<GoodsReceipt>
                    columns={columns}
                    data={paginatedReceipts}
                    onRowDoubleClick={handleView}
                />
            )}
            
            {paginatedReceipts.length === 0 && !isLoading && (
                <div className="text-center py-16">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">{t('pages.goodsReceipt.empty.title')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('pages.goodsReceipt.empty.message')}</p>
                </div>
            )}

            {totalPages > 1 && (
                <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </footer>
            )}

            {modalState.isOpen && (
                <GoodsReceiptFormModal
                    isOpen={modalState.isOpen}
                    mode={modalState.mode}
                    onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                    onSave={handleSave}
                    onSwitchToEdit={switchToEditMode}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onCancel={handleCancel}
                    receipt={modalState.receipt}
                    partners={partners}
                    warehouses={warehouses}
                    warehouseMap={warehouseMap}
                    modelGoods={modelGoods}
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

export default GoodsReceiptPage;