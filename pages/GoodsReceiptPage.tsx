import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GoodsReceipt, Partner, Warehouse, GoodsReceiptLine, StatusHistoryEvent, ModelGoods } from '../types';
import { Icon } from '../components/Icons';
import { Table, Column } from '../components/ui/Table';
import { GoodsReceiptFormModal } from '../components/goods_receipt/GoodsReceiptFormModal';
import { Toast } from '../components/ui/Toast';
import { FilterDrawer } from '../components/ui/FilterDrawer';
import { useDebounce } from '../hooks/useDebounce';
import { StatusBadge } from '../components/ui/StatusBadge';

type ModalMode = 'create' | 'edit' | 'view';
const CURRENT_USER = "Alex Nguyen"; // Mock current user for actions

const GoodsReceiptPage: React.FC = () => {
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
    const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<Record<string, string[]>>({});

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

    const handleCreate = () => {
        setModalState({ isOpen: true, mode: 'create', receipt: null });
    };
    
    const handleView = (receipt: GoodsReceipt) => {
        const fullReceipt = {
            ...receipt,
            lines: lines[receipt.gr_no] || [],
            history: history[receipt.gr_no] || [],
        };
        setModalState({ isOpen: true, mode: 'view', receipt: fullReceipt });
    };

    const switchToEditMode = () => {
        if (modalState.receipt && ['Draft'].includes(modalState.receipt.status)) {
            setModalState(prev => ({ ...prev, mode: 'edit' }));
        } else {
            setToastInfo({ message: "This document cannot be edited in its current state.", type: 'error' });
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
                // FIX: Object literal may only specify known properties, and 'gr_id' does not exist in type 'StatusHistoryEvent'. Changed to 'doc_id'.
                doc_id: grNo,
                status: updatedReceipt.status,
                user: CURRENT_USER,
                timestamp: updatedReceipt.updated_at,
                note: historyNote
            };
            const currentHistory = history[grNo] || [];
            // Avoid duplicate history entries on quick state changes
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

        setToastInfo({ message: `Goods Receipt saved as ${targetStatus}`, type: 'success' });
        setModalState({isOpen: false, mode: 'create', receipt: null});
    };

    const handleApprove = (grNo: string) => {
        updateReceiptState(grNo, { status: 'Completed' }, 'Document approved. Inventory updated.');
        setToastInfo({ message: `GR ${grNo} has been Completed.`, type: 'success'});
        setModalState({ isOpen: false, mode: 'view', receipt: null });
    };

    const handleReject = (grNo: string) => {
        const reason = prompt("Please provide a reason for rejection:");
        if (reason) {
            updateReceiptState(grNo, { status: 'Rejected' }, `Rejected: ${reason}`);
            setToastInfo({ message: `GR ${grNo} has been Rejected.`, type: 'success'});
            setModalState({ isOpen: false, mode: 'view', receipt: null });
        }
    };
    
    const handleCancel = (grNo: string) => {
        if (window.confirm("Are you sure you want to cancel this document? This action cannot be undone.")) {
            updateReceiptState(grNo, { status: 'Cancelled' }, 'Document cancelled by manager.');
            setToastInfo({ message: `GR ${grNo} has been Cancelled.`, type: 'success'});
            setModalState({ isOpen: false, mode: 'view', receipt: null });
        }
    };

    const filteredReceipts = useMemo(() => {
        return receipts
            .filter(r => {
                const search = debouncedSearchTerm.toLowerCase();
                return r.gr_no.toLowerCase().includes(search) ||
                       (r.ref_no && r.ref_no.toLowerCase().includes(search)) ||
                       (r.partner_code && partnerMap.get(r.partner_code)?.toLowerCase().includes(search));
            })
            .filter(r => {
                return Object.entries(filters).every(([key, values]) => {
                    if (!Array.isArray(values) || values.length === 0) return true;
                    return values.includes(r[key as keyof GoodsReceipt] as string);
                });
            });
    }, [receipts, debouncedSearchTerm, filters, partnerMap]);

    const columns: Column<GoodsReceipt>[] = useMemo(() => [
        { key: 'gr_no', header: 'GR No' },
        { key: 'receipt_type', header: 'Receipt Type' },
        { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        { 
            key: 'partner_code', 
            header: 'Partner / Source', 
            render: (r) => r.receipt_type === 'Transfer' 
                ? `WH: ${warehouseMap.get(r.source_wh_code || '') || r.source_wh_code}`
                : partnerMap.get(r.partner_code || '') || r.partner_code || '—'
        },
        { key: 'dest_wh_code', header: 'Dest. Warehouse', render: (r) => warehouseMap.get(r.dest_wh_code) || r.dest_wh_code },
        { key: 'doc_date', header: 'Doc Date', render: (r) => new Date(r.doc_date).toLocaleDateString() },
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
                             placeholder="Search GR No, Ref No, Partner..." 
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
                <Table<GoodsReceipt>
                    columns={columns}
                    data={filteredReceipts}
                    onRowDoubleClick={handleView}
                />
            )}
            
            {filteredReceipts.length === 0 && !isLoading && (
                <div className="text-center py-16">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">No Goods Receipts Found</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Click 'Create' to start a new goods receipt.</p>
                </div>
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
            <FilterDrawer
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                filters={filters}
                onApplyFilters={setFilters}
                onClearFilters={() => setFilters({})}
                filterOptions={[
                    { key: 'status', label: 'Status', options: ['Draft', 'New', 'Receiving', 'Submitted', 'Completed', 'Rejected', 'Cancelled']},
                    { key: 'receipt_type', label: 'Receipt Type', options: ['PO', 'Return', 'Transfer', 'Other']},
                    { key: 'dest_wh_code', label: 'Destination Warehouse', options: warehouses.map(w => w.wh_code), optionLabels: warehouseMap }
                ]}
            />
        </div>
    );
};

export default GoodsReceiptPage;