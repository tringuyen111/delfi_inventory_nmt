import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GoodsIssue, Partner, Warehouse, GoodsIssueLine, StatusHistoryEvent, ModelGoods, OnhandByLocation } from '../types';
import { Icon } from '../components/Icons';
import { Table, Column } from '../components/ui/Table';
import { GoodsIssueFormModal } from '../components/goods_issue/GoodsIssueFormModal';
import { Toast } from '../components/ui/Toast';
import { FilterDrawer } from '../components/ui/FilterDrawer';
import { useDebounce } from '../hooks/useDebounce';
import { StatusBadge } from '../components/ui/StatusBadge';

type ModalMode = 'create' | 'edit' | 'view';
const CURRENT_USER = "Alex Nguyen"; // Mock current user for actions

const GoodsIssuePage: React.FC = () => {
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
            setToastInfo({ message: "This document cannot be edited in its current state.", type: 'error' });
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
        issueData: Omit<GoodsIssue, 'id' | 'gi_no' | 'created_at' | 'updated_at' | 'created_by' | 'handler' | 'lines' | 'history'>,
        linesData: GoodsIssueLine[],
        targetStatus: 'Draft' | 'New'
    ) => {
        let savedIssue: GoodsIssue;
        const now = new Date().toISOString();
        
        const isEditing = modalState.mode === 'edit' && modalState.issue;

        if (isEditing) {
            savedIssue = { ...modalState.issue!, ...issueData, status: targetStatus, updated_at: now, lines: linesData, history: modalState.issue!.history };
            setIssues(prev => prev.map(r => r.id === savedIssue.id ? savedIssue : r));
        } else {
             const year = new Date().getFullYear();
             const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
             const seq = (issues.length + 1).toString().padStart(3, '0');
             const newGiNo = `GI-${year}${month}-${seq}`;

            savedIssue = {
                ...issueData,
                id: newGiNo,
                gi_no: newGiNo,
                status: targetStatus,
                created_at: now,
                updated_at: now,
                created_by: CURRENT_USER,
                lines: linesData,
                history: []
            };
            setIssues(prev => [savedIssue, ...prev]);
        }
        
        const historyNote = isEditing 
            ? `Document updated and set to ${targetStatus}.`
            : `Document created with status ${targetStatus}.`;

        updateIssueState(savedIssue.gi_no, { status: savedIssue.status }, historyNote);
        setLines(prev => ({...prev, [savedIssue.gi_no]: linesData}));

        setToastInfo({ message: `Goods Issue saved as ${targetStatus}`, type: 'success' });
        setModalState({isOpen: false, mode: 'create', issue: null});
    };

    const handleApprove = (giNo: string) => {
        updateIssueState(giNo, { status: 'Completed' }, 'Document approved. Inventory updated.');
        setToastInfo({ message: `GI ${giNo} has been Completed.`, type: 'success'});
        setModalState({ isOpen: false, mode: 'view', issue: null });
    };
    
    const handleCancel = (giNo: string) => {
        if (window.confirm("Are you sure you want to cancel this document? This action cannot be undone.")) {
            updateIssueState(giNo, { status: 'Cancelled' }, 'Document cancelled by manager.');
            setToastInfo({ message: `GI ${giNo} has been Cancelled.`, type: 'success'});
            setModalState({ isOpen: false, mode: 'view', issue: null });
        }
    };

    const filteredIssues = useMemo(() => {
        return issues
            .filter(r => {
                const search = debouncedSearchTerm.toLowerCase();
                return r.gi_no.toLowerCase().includes(search) ||
                       (r.ref_no && r.ref_no.toLowerCase().includes(search)) ||
                       (r.partner_code && (partnerMap.get(r.partner_code) || '').toLowerCase().includes(search));
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
                    onSave={handleSave}
                    onSwitchToEdit={switchToEditMode}
                    onApprove={handleApprove}
                    onCancel={handleCancel}
                    issue={modalState.issue}
                    partners={partners}
                    warehouses={warehouses}
                    modelGoods={modelGoods}
                    onhand={onhand}
                    onhandLots={onhandLots}
                    onhandSerials={onhandSerials}
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
                    { key: 'issue_type', label: 'Issue Type', options: ['Sales Order', 'Transfer', 'Return to Supplier', 'Manual']},
                    { key: 'source_wh_code', label: 'Source Warehouse', options: warehouses.map(w => w.wh_code), optionLabels: warehouseMap }
                ]}
            />
        </div>
    );
};

export default GoodsIssuePage;