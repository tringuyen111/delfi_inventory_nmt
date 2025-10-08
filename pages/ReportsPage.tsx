

import React, { useState, useEffect, useMemo } from 'react';
import { Warehouse, ExportHistoryItem } from '../types';
import { Icon } from '../components/Icons';
import { SectionCard } from '../components/SectionCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { FormField } from '../components/ui/FormField';
import { DateRangePicker } from '../components/ui/DateRangePicker';

const CURRENT_USER = "Alex Nguyen"; // Mock current user

const ReportsPage: React.FC = () => {
    // Form state
    const [reportType, setReportType] = useState('transaction_history');
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

    // Data and UI state
    const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([]);
    const [allWarehouses, setAllWarehouses] = useState<Warehouse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch warehouse data for selector
    useEffect(() => {
        const fetchWarehouses = async () => {
            try {
                const res = await fetch('./data/warehouses.json');
                if (!res.ok) throw new Error('Failed to fetch warehouses');
                const data: Warehouse[] = await res.json();
                setAllWarehouses(data.filter(w => w.status === 'Active'));
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Unknown error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchWarehouses();
    }, []);
    
    const handleReset = () => {
        setReportType('transaction_history');
        setSelectedWarehouse('');
        setDateRange([null, null]);
    };


    const handleExport = () => {
        const reportTypeLabelMap: { [key: string]: string } = {
            'detailed_inventory': 'Detailed Inventory',
            'transaction_history': 'Transaction History',
            'inventory_discrepancy': 'Inventory Discrepancy',
        };
        const reportTypeLabel = reportTypeLabelMap[reportType] || 'Unknown Report';

        let params = `Warehouse: ${selectedWarehouse || 'All'}`;
        const [from, to] = dateRange;
        if (showDateRange) {
             if (from && to) {
                const formatDate = (d: Date) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                params += `; Date Range: ${formatDate(from)} - ${formatDate(to)}`;
            } else {
                params += '; Date Range: All Time';
            }
        }
        
        const newExportItem: ExportHistoryItem = {
            id: `export-${Date.now()}`,
            reportType: reportTypeLabel,
            exportDate: new Date().toISOString(),
            exporter: CURRENT_USER,
            parameters: params,
            status: 'processing',
            progress: 0,
        };

        setExportHistory(prev => [newExportItem, ...prev]);

        // Simulate progress
        const interval = setInterval(() => {
            setExportHistory(currentHistory => {
                const itemIndex = currentHistory.findIndex(item => item.id === newExportItem.id);
                if (itemIndex === -1) {
                    clearInterval(interval);
                    return currentHistory;
                }
                
                const updatedItem = { ...currentHistory[itemIndex] };
                updatedItem.progress += Math.floor(Math.random() * 20) + 15;

                if (updatedItem.progress >= 100) {
                    updatedItem.progress = 100;
                    updatedItem.status = 'completed';
                    clearInterval(interval);
                }
                
                const newHistory = [...currentHistory];
                newHistory[itemIndex] = updatedItem;
                return newHistory;
            });
        }, 500);
    };
    
    const showDateRange = reportType === 'transaction_history' || reportType === 'inventory_discrepancy';

    const renderStatus = (item: ExportHistoryItem) => {
        if (item.status === 'processing') {
            return (
                <div className="flex items-center gap-2">
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                        <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${item.progress}%` }}></div>
                    </div>
                    <span className="text-xs font-medium text-gray-500 w-8 text-right">{item.progress}%</span>
                </div>
            );
        }
        return <StatusBadge status={item.status === 'completed' ? 'Completed' : 'Error'} />;
    };

    const renderAction = (item: ExportHistoryItem) => {
        if (item.status === 'completed') {
            return <a href="#" onClick={e => e.preventDefault()} className="font-medium text-brand-primary hover:underline flex items-center gap-1"><Icon name="Download" className="w-4 h-4" /> Download</a>;
        }
        return <span className="text-gray-400 dark:text-gray-500">N/A</span>;
    };

    if (isLoading) {
        return <SectionCard title="Reports" icon="Reports"><p>Loading configuration...</p></SectionCard>
    }
    if (error) {
         return <SectionCard title="Reports" icon="Reports"><p className="text-red-500">Error: {error}</p></SectionCard>
    }

    return (
        <div className="space-y-6">
            <SectionCard title="Export Report" icon="Download">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <FormField label="Report Type" required>
                            <select value={reportType} onChange={e => setReportType(e.target.value)} className="w-full">
                                <option value="transaction_history">Transaction History</option>
                                <option value="inventory_discrepancy">Inventory Discrepancy</option>
                                <option value="detailed_inventory">Detailed Inventory</option>
                            </select>
                        </FormField>
                    </div>
                    
                    <div className="flex-1 min-w-[200px]">
                        <FormField label="Warehouse">
                             <select value={selectedWarehouse} onChange={e => setSelectedWarehouse(e.target.value)} className="w-full">
                                <option value="">All Warehouses</option>
                                {allWarehouses.map(w => <option key={w.wh_code} value={w.wh_code}>{w.wh_name}</option>)}
                            </select>
                        </FormField>
                    </div>

                    <div className="flex-1 min-w-[300px]" style={{ visibility: showDateRange ? 'visible' : 'hidden' }}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Range</label>
                        <DateRangePicker 
                            value={dateRange}
                            onChange={setDateRange}
                        />
                    </div>
                    
                    <div className="flex items-end gap-2 ml-auto">
                         <button onClick={handleReset} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">
                            Reset
                        </button>
                         <button onClick={handleExport} className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-blue-700">
                            <Icon name="Download" className="w-4 h-4"/> Export
                        </button>
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="Export History" icon="History">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-left text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-4 py-3">Report Type</th>
                                <th className="px-4 py-3">Export Date</th>
                                <th className="px-4 py-3">Exporter</th>
                                <th className="px-4 py-3">Parameters</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {exportHistory.length > 0 ? exportHistory.map(item => (
                                <tr key={item.id}>
                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{item.reportType}</td>
                                    <td className="px-4 py-3">{new Date(item.exportDate).toLocaleString()}</td>
                                    <td className="px-4 py-3">{item.exporter}</td>
                                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={item.parameters}>{item.parameters}</td>
                                    <td className="px-4 py-3 w-52">{renderStatus(item)}</td>
                                    <td className="px-4 py-3">{renderAction(item)}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">No report export history found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </SectionCard>
        </div>
    );
};

export default ReportsPage;