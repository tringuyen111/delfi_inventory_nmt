import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { OnhandByLocation, OnhandSerialDetail, OnhandLotDetail, OnhandHistoryDetail } from '../../types';
import { Table, Column, RowAction } from '../ui/Table';
import { Icon } from '../Icons';
import { TimelineSidePanel } from './TimelineSidePanel';
import { StatusBadge } from '../ui/StatusBadge';
import { useLanguage } from '../../hooks/useLanguage';

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
    const { t } = useLanguage();
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // In a real app, you might show a toast notification here.
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
                     <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600" onClick={onOpenHistory}><Icon name="History" className="w-4 h-4"/> {t('pages.onhand.detailModal.header.openHistory')}</button>
                     <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600" onClick={() => copyToClipboard(item.model_code)}><Icon name="Copy" className="w-4 h-4"/> {t('pages.onhand.detailModal.header.copyCode')}</button>
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('pages.onhand.detailModal.header.onhand')}</p>
                    <p className="text-lg font-bold">{item.onhand_qty.toLocaleString()}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('pages.onhand.detailModal.header.allocated')}</p>
                    <p className="text-lg font-bold">{item.allocated_qty.toLocaleString()}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('pages.onhand.detailModal.header.available')}</p>
                    <p className="text-lg font-bold">{item.available_qty.toLocaleString()}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('pages.onhand.detailModal.header.lastMovement')}</p>
                    <p className="text-sm font-semibold">{new Date(item.last_movement_at).toLocaleDateString()}</p>
                </div>
            </div>
        </div>
    );
};


export const OnhandDetailModal: React.FC<OnhandDetailModalProps> = ({ isOpen, onClose, item }) => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<ActiveTab | null>(null);
    const [sidePanelState, setSidePanelState] = useState<SidePanelState>({ isOpen: false, type: null, id: null });
    const [details, setDetails] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [serialSearchTerm, setSerialSearchTerm] = useState('');

    useEffect(() => {
        if (item) {
            const initialTab = item.tracking_type === 'Serial' ? 'serial' : item.tracking_type === 'Lot' ? 'lot' : 'history';
            setActiveTab(initialTab);
        } else {
            setActiveTab(null);
            setSerialSearchTerm('');
        }
    }, [item]);

    useEffect(() => {
        if (item && activeTab) {
            const fetchData = async () => {
                setIsLoading(true);
                let url = '';
                let dataKey = '';
                const key = `${item.wh_code}-${item.loc_code}-${item.model_code}`;
                
                if (activeTab === 'serial') {
                    url = './data/onhand_serials.json';
                    dataKey = key;
                } else if (activeTab === 'lot') {
                    url = './data/onhand_lots.json';
                    dataKey = key;
                } else if (activeTab === 'history') {
                    url = './data/onhand_history_detailed.json';
                    dataKey = key;
                }

                if (url) {
                    try {
                        const res = await fetch(url);
                        const data = await res.json();
                        const fetchedDetails = data[dataKey] || [];

                        // Sorting logic for better data presentation
                        if (activeTab === 'serial') {
                            fetchedDetails.sort((a: OnhandSerialDetail, b: OnhandSerialDetail) => {
                                const dateCompare = new Date(a.received_date).getTime() - new Date(b.received_date).getTime();
                                if (dateCompare !== 0) return dateCompare;
                                return a.serial_no.localeCompare(b.serial_no);
                            });
                        } else if (activeTab === 'lot') {
                            fetchedDetails.sort((a: OnhandLotDetail, b: OnhandLotDetail) => {
                                const dateA = a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity;
                                const dateB = b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity;
                                if (dateA !== dateB) return dateA - dateB;
                                return new Date(a.received_date).getTime() - new Date(b.received_date).getTime();
                            });
                        } else if (activeTab === 'history') {
                             fetchedDetails.sort((a: OnhandHistoryDetail, b: OnhandHistoryDetail) => new Date(b.txn_date).getTime() - new Date(a.txn_date).getTime());
                        }

                        setDetails(fetchedDetails);
                    } catch (e) {
                        console.error(`Failed to fetch ${activeTab} details`, e);
                        setDetails([]);
                    }
                }
                setIsLoading(false);
            };
            fetchData();
        }
    }, [item, activeTab]);

    if (!isOpen || !item) return null;

    const openTimeline = (type: 'serial' | 'lot', id: string) => {
        setSidePanelState({ isOpen: true, type, id });
    };

    const serialColumns: Column<OnhandSerialDetail>[] = [
        { key: 'serial_no', header: t('pages.onhand.detailModal.serialsTable.serialNo') },
        { key: 'status', header: t('pages.onhand.detailModal.serialsTable.status'), render: s => <StatusBadge status={s.status} /> },
        { key: 'received_date', header: t('pages.onhand.detailModal.serialsTable.receivedDate'), render: s => new Date(s.received_date).toLocaleDateString() },
        { key: 'last_movement_at', header: t('pages.onhand.detailModal.serialsTable.lastMovement'), render: s => new Date(s.last_movement_at).toLocaleString() },
        { key: 'notes', header: t('pages.onhand.detailModal.serialsTable.notes'), render: s => s.notes || '—' },
    ];
    const lotColumns: Column<OnhandLotDetail>[] = [
        { key: 'lot_code', header: t('pages.onhand.detailModal.lotsTable.lotCode') },
        { key: 'onhand_qty', header: t('pages.onhand.detailModal.lotsTable.onhand'), align: 'right', render: l => l.onhand_qty.toLocaleString() },
        { key: 'allocated_qty', header: t('pages.onhand.detailModal.lotsTable.allocated'), align: 'right', render: l => l.allocated_qty > 0 ? l.allocated_qty.toLocaleString() : '—' },
        { key: 'expiry_date', header: t('pages.onhand.detailModal.lotsTable.expiry'), render: l => l.expiry_date ? new Date(l.expiry_date).toLocaleDateString() : 'N/A' },
        { key: 'received_date', header: t('pages.onhand.detailModal.lotsTable.receivedDate'), render: l => new Date(l.received_date).toLocaleDateString() },
    ];
    const historyColumns: Column<OnhandHistoryDetail>[] = [
        { key: 'txn_date', header: t('pages.onhand.detailModal.historyTable.date'), render: h => new Date(h.txn_date).toLocaleString() },
        { key: 'doc_type', header: t('pages.onhand.detailModal.historyTable.docType') },
        { key: 'doc_no', header: t('pages.onhand.detailModal.historyTable.docNo') },
        { key: 'qty_change', header: t('pages.onhand.detailModal.historyTable.qtyChange'), align: 'right', render: h => <span className={h.qty_change > 0 ? 'text-green-600' : 'text-red-600'}>{h.qty_change > 0 ? `+${h.qty_change}` : h.qty_change}</span> },
        { key: 'actor', header: t('pages.onhand.detailModal.historyTable.actor') },
    ];
    
    const rowActions: RowAction<any>[] = [
        { key: 'history', icon: 'History', tooltip: 'View Timeline', action: (row) => openTimeline(activeTab as 'serial' | 'lot', row.serial_no || row.lot_code) }
    ];

    const renderTabContent = () => {
        if (isLoading) return <p className="text-center py-8">{t('pages.onhand.detailModal.loading')}</p>;
        if (details.length === 0) return <p className="text-center py-8 text-gray-500">{t('pages.onhand.detailModal.noDetails', { tab: activeTab || '' })}</p>;
        
        switch (activeTab) {
            case 'serial': {
                const filteredSerials = (details as OnhandSerialDetail[]).filter(s => s.serial_no.toLowerCase().includes(serialSearchTerm.toLowerCase()));
                return (
                    <>
                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder={t('pages.onhand.detailModal.serialsTable.searchPlaceholder')}
                                value={serialSearchTerm}
                                onChange={e => setSerialSearchTerm(e.target.value)}
                                className="w-full max-w-sm p-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none"
                            />
                        </div>
                        <Table<OnhandSerialDetail> columns={serialColumns} data={filteredSerials} rowActions={rowActions} />
                    </>
                );
            }
            case 'lot': return <Table<OnhandLotDetail> columns={lotColumns} data={details} rowActions={rowActions} />;
            case 'history': return <Table<OnhandHistoryDetail> columns={historyColumns} data={details} />;
            default: return null;
        }
    };

    return (
        <>
        <Modal isOpen={isOpen} onClose={onClose} title={t('pages.onhand.detailModal.title')} size="fullscreen">
            <div className="flex flex-col h-full">
                <DetailHeader item={item} onOpenHistory={() => setActiveTab('history')} />
                <div className="mt-4 border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-6">
                        {item.tracking_type === 'Serial' && <button onClick={() => setActiveTab('serial')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'serial' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t('pages.onhand.detailModal.tabs.serials')}</button>}
                        {item.tracking_type === 'Lot' && <button onClick={() => setActiveTab('lot')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'lot' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t('pages.onhand.detailModal.tabs.lots')}</button>}
                        <button onClick={() => setActiveTab('history')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'history' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t('pages.onhand.detailModal.tabs.history')}</button>
                    </nav>
                </div>
                <div className="flex-grow overflow-y-auto mt-4">
                    {renderTabContent()}
                </div>
            </div>
        </Modal>
        <TimelineSidePanel 
            isOpen={sidePanelState.isOpen} 
            onClose={() => setSidePanelState({ isOpen: false, type: null, id: null })} 
            type={sidePanelState.type} 
            itemId={sidePanelState.id}
        />
        </>
    );
};