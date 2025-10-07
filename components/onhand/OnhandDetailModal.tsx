import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { OnhandByLocation, OnhandSerialDetail, OnhandLotDetail, OnhandHistoryDetail } from '../../types';
import { Table, Column, RowAction } from '../ui/Table';
import { Icon } from '../Icons';
import { TimelineSidePanel } from './TimelineSidePanel';
import { FilterDrawer } from '../ui/FilterDrawer';

interface OnhandDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: OnhandByLocation | null;
}

type ActiveTab = 'serial' | 'lot' | 'history';
type SidePanelState = {
    isOpen: boolean;
    type: 'serial' | 'lot' | null;
    id: string | null;
}

const DetailHeader: React.FC<{item: OnhandByLocation, onOpenHistory: () => void}> = ({ item, onOpenHistory }) => {
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Add toast feedback if available
    };

    return (
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 shadow-sm sticky top-0 z-20">
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-4">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{item.model_code}</h3>
                        <div className="flex gap-2">
                            {item.onhand_qty < 0 && <span className="px-2.5 py-1 text-xs font-bold text-red-100 bg-red-600 rounded-full">Negative</span>}
                            {item.low_stock_threshold != null && item.available_qty <= item.low_stock_threshold && <span className="px-2.5 py-1 text-xs font-bold text-yellow-800 bg-yellow-400 rounded-full">Low stock</span>}
                            {item.has_near_expiry && <span className="px-2.5 py-1 text-xs font-bold text-orange-800 bg-orange-400 rounded-full">Near expiry</span>}
                        </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 max-w-xl truncate">{item.model_name}</p>
                </div>
                <div className="flex items-center gap-2">
                     <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600" onClick={onOpenHistory}><Icon name="History" className="w-4 h-4"/> Open History</button>
                     <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600" onClick={() => copyToClipboard(item.model_code)}><Icon name="Copy" className="w-4 h-4"/> Copy Code</button>
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <Kpi label="ONHAND" value={item.onhand_qty.toLocaleString()} />
                <Kpi label="ALLOCATED" value={item.allocated_qty.toLocaleString()} />
                <Kpi label="AVAILABLE" value={item.available_qty.toLocaleString()} isBadge />
                <Kpi label="WAREHOUSE" value={item.wh_code} />
                <Kpi label="LOCATION" value={item.loc_code} />
                <Kpi label="TRACKING" value={<span className="font-semibold text-gray-800 dark:text-gray-100">{item.tracking_type}</span>} />
                <Kpi label="LAST MOVEMENT" value={new Date(item.last_movement_at).toLocaleString()} />
            </div>
        </div>
    )
}

const Kpi: React.FC<{label: string, value: string | React.ReactNode, isBadge?: boolean}> = ({ label, value, isBadge }) => (
    <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
        {isBadge ? <span className="text-lg font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-brand-primary rounded">{value}</span> : <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{value}</p>}
    </div>
);


export const OnhandDetailModal: React.FC<OnhandDetailModalProps> = ({ isOpen, onClose, item }) => {
    if (!isOpen || !item) return null;

    const [activeTab, setActiveTab] = useState<ActiveTab>(item.tracking_type === 'Serial' ? 'serial' : item.tracking_type === 'Lot' ? 'lot' : 'history');
    const [sidePanel, setSidePanel] = useState<SidePanelState>({ isOpen: false, type: null, id: null });
    
    // Reset tab when item changes
    useEffect(() => {
        if (item) {
             setActiveTab(item.tracking_type === 'Serial' ? 'serial' : item.tracking_type === 'Lot' ? 'lot' : 'history');
        }
    }, [item]);

    const handleOpenSidePanel = (type: 'serial' | 'lot', id: string) => {
        setSidePanel({ isOpen: true, type, id });
    };

    const TabButton: React.FC<{tabId: ActiveTab, label: string}> = ({ tabId, label }) => (
        <button onClick={() => setActiveTab(tabId)} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === tabId ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-200'}`}>
            {label}
        </button>
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case 'serial': return <SerialsTab item={item} onOpenTimeline={handleOpenSidePanel} />;
            case 'lot': return <LotsTab item={item} onOpenTimeline={handleOpenSidePanel} />;
            case 'history': return <HistoryTab item={item} />;
            default: return null;
        }
    };
    
    const tabs = [];
    if (item.tracking_type === 'Serial') tabs.push({ id: 'serial', label: 'By Serial' });
    if (item.tracking_type === 'Lot') tabs.push({ id: 'lot', label: 'By Lot' });
    tabs.push({ id: 'history', label: 'History' });
    
    return (
    <>
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Inventory Details`}
            size="fullscreen"
        >
            <div className="flex flex-col h-full">
                <DetailHeader item={item} onOpenHistory={() => setActiveTab('history')} />

                <div className="border-b border-gray-200 dark:border-gray-700 mt-4">
                    <nav className="-mb-px flex space-x-6">
                        {tabs.map(tab => <TabButton key={tab.id} tabId={tab.id as ActiveTab} label={tab.label} />)}
                    </nav>
                </div>
                
                <div className="flex-grow pt-4 overflow-y-auto">
                    {renderTabContent()}
                </div>
            </div>
        </Modal>
        <TimelineSidePanel 
            isOpen={sidePanel.isOpen}
            onClose={() => setSidePanel({isOpen: false, type: null, id: null})}
            type={sidePanel.type}
            itemId={sidePanel.id}
        />
    </>
    );
};

// --- TABS ---

const SerialsTab: React.FC<{item: OnhandByLocation, onOpenTimeline: (type: 'serial', id: string) => void}> = ({ item, onOpenTimeline }) => {
    const [serials, setSerials] = useState<OnhandSerialDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        const fetchSerials = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch('./data/onhand_serials.json');
                if (!res.ok) throw new Error("Failed to load serial details.");
                const data: {[key: string]: OnhandSerialDetail[]} = await res.json();
                const itemKey = `${item.wh_code}-${item.loc_code}-${item.model_code}`;
                setSerials(data[itemKey] || []);
            } catch (e) {
                setError(e instanceof Error ? e.message : "An unknown error occurred.");
            } finally {
                setLoading(false);
            }
        };
        fetchSerials();
    }, [item]);

    const rowActions: RowAction<OnhandSerialDetail>[] = [
        { key: 'timeline', icon: 'History', tooltip: 'View Serial History', action: (s) => onOpenTimeline('serial', s.serial_no) },
        { key: 'copy', icon: 'Copy', tooltip: 'Copy Serial', action: (s) => navigator.clipboard.writeText(s.serial_no) },
        { key: 'print', icon: 'Printer', tooltip: 'Print Label', action: (s) => alert(`Printing label for ${s.serial_no}`) },
    ];

    const columns: Column<OnhandSerialDetail>[] = useMemo(() => [
        { key: 'serial_no', header: 'SERIAL NO', freeze: 'left' },
        { key: 'status', header: 'STATUS' },
        { key: 'reserved_doc_no', header: 'RESERVED DOC' },
        { key: 'reserved_partner', header: 'PARTNER' },
        { key: 'received_date', header: 'RECEIVED DATE', render: s => new Date(s.received_date).toLocaleDateString() },
        { key: 'last_movement_at', header: 'LAST MOVEMENT', render: s => new Date(s.last_movement_at).toLocaleString() },
        { key: 'age_days', header: 'AGE (DAYS)', align: 'right' },
    ], []);

    if (loading) return <div className="p-4 text-center">Loading serials...</div>;
    if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
    if (serials.length === 0) return <div className="p-4 text-center text-gray-500">No serial numbers found for this item at this location.</div>;

    return <Table<OnhandSerialDetail> columns={columns} data={serials} rowActions={rowActions} />;
};

const LotsTab: React.FC<{item: OnhandByLocation, onOpenTimeline: (type: 'lot', id: string) => void}> = ({ item, onOpenTimeline }) => {
    const [lots, setLots] = useState<OnhandLotDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLots = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch('./data/onhand_lots.json');
                if (!res.ok) throw new Error("Failed to load lot details.");
                const data: {[key: string]: OnhandLotDetail[]} = await res.json();
                const itemKey = `${item.wh_code}-${item.loc_code}-${item.model_code}`;
                setLots(data[itemKey] || []);
            } catch (e) {
                setError(e instanceof Error ? e.message : "An unknown error occurred.");
            } finally {
                setLoading(false);
            }
        };
        fetchLots();
    }, [item]);

    const rowActions: RowAction<OnhandLotDetail>[] = [
        { key: 'timeline', icon: 'History', tooltip: 'View Lot History', action: (l) => onOpenTimeline('lot', l.lot_code) },
        { key: 'copy', icon: 'Copy', tooltip: 'Copy Lot Code', action: (l) => navigator.clipboard.writeText(l.lot_code) },
    ];
    
    const columns: Column<OnhandLotDetail>[] = useMemo(() => [
        { key: 'lot_code', header: 'LOT CODE', freeze: 'left' },
        { key: 'onhand_qty', header: 'ONHAND', align: 'right' },
        { key: 'allocated_qty', header: 'ALLOCATED', align: 'right' },
        { key: 'available_qty', header: 'AVAILABLE', align: 'right' },
        { key: 'expiry_date', header: 'EXPIRY DATE', render: l => l.expiry_date ? new Date(l.expiry_date).toLocaleDateString() : '—' },
        { key: 'received_date', header: 'RECEIVED DATE', render: l => new Date(l.received_date).toLocaleDateString() },
        { key: 'age_days', header: 'AGE (DAYS)', align: 'right' },
        { key: 'supplier_lot', header: 'SUPPLIER LOT' },
    ], []);

    if (loading) return <div className="p-4 text-center">Loading lot details...</div>;
    if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
    if (lots.length === 0) return <div className="p-4 text-center text-gray-500">No lots found for this item at this location.</div>;

    return <Table<OnhandLotDetail> columns={columns} data={lots} rowActions={rowActions} />;
};

const HistoryTab: React.FC<{item: OnhandByLocation}> = ({ item }) => {
    const [history, setHistory] = useState<OnhandHistoryDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch('./data/onhand_history_detailed.json');
                if (!res.ok) throw new Error("Failed to load history details.");
                const data: {[key: string]: OnhandHistoryDetail[]} = await res.json();
                const itemKey = `${item.wh_code}-${item.loc_code}-${item.model_code}`;
                setHistory(data[itemKey] || []);
            } catch (e) {
                 setError(e instanceof Error ? e.message : "An unknown error occurred.");
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [item]);

    const columns: Column<OnhandHistoryDetail>[] = useMemo(() => [
        { key: 'txn_date', header: 'DATE/TIME', render: h => new Date(h.txn_date).toLocaleString() },
        { key: 'doc_type', header: 'DOC TYPE' },
        { key: 'doc_no', header: 'DOC NO' },
        { key: 'qty_change', header: 'QTY ±', align: 'right', render: h => <span className={h.qty_change > 0 ? 'text-green-600' : 'text-red-600'}>{h.qty_change > 0 ? `+${h.qty_change}`: h.qty_change}</span> },
        { key: 'actor', header: 'ACTOR' },
        { key: 'remark', header: 'REMARK' },
    ], []);

    if (loading) return <div className="p-4 text-center">Loading history...</div>;
    if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
    if (history.length === 0) return <div className="p-4 text-center text-gray-500">No transaction history found.</div>;

    return <Table<OnhandHistoryDetail> columns={columns} data={history} />;
};