
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Warehouse, ExportHistoryItem } from '../types';
import { Icon } from '../components/Icons';
import { SectionCard } from '../components/SectionCard';
import { MultiSelectDropdown } from '../components/ui/MultiSelectDropdown';
import { StatusBadge } from '../components/ui/StatusBadge';
import { FormField } from '../components/ui/FormField';

declare const flatpickr: any;

const CURRENT_USER = "Alex Nguyen"; // Mock current user

const ReportsPage: React.FC = () => {
    // Form state
    const [reportType, setReportType] = useState('transaction_history');
    const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState('');

    // Data and UI state
    const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([]);
    const [allWarehouses, setAllWarehouses] = useState<Warehouse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const dateRangeRef = useRef<HTMLInputElement>(null);
    const flatpickrInstance = useRef<any>(null);

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

    // Initialize and manage flatpickr
    useEffect(() => {
        if (dateRangeRef.current && typeof flatpickr !== 'undefined') {
            flatpickrInstance.current = flatpickr(dateRangeRef.current, {
                mode: "range",
                dateFormat: "d/m/Y",
                onChange: (selectedDates: Date[]) => {
                    if (selectedDates.length === 2) {
                        const formatted = selectedDates.map(d => 
                            `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
                        ).join(' - ');
                        setDateRange(formatted);
                    }
                }
            });
        }
        return () => {
            flatpickrInstance.current?.destroy();
        };
    }, []);

    const handleExport = () => {
        const reportTypeLabelMap: { [key: string]: string } = {
            'detailed_inventory': 'Tồn kho Chi tiết',
            'transaction_history': 'Lịch sử Giao dịch',
            'inventory_discrepancy': 'Chênh lệch Kiểm kê',
        };
        const reportTypeLabel = reportTypeLabelMap[reportType] || 'Unknown Report';

        let params = `Warehouse(s): ${selectedWarehouses.length > 0 ? selectedWarehouses.join(', ') : 'All'}`;
        if (reportType !== 'detailed_inventory' && dateRange) {
            params += `; Date Range: ${dateRange}`;
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
    
    const warehouseOptions = useMemo(() => allWarehouses.map(w => w.wh_code), [allWarehouses]);
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
            return <a href="#" onClick={e => e.preventDefault()} className="font-medium text-brand-primary hover:underline flex items-center gap-1"><Icon name="Download" className="w-4 h-4" /> Tải về</a>;
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-end">
                    <FormField label="Loại báo cáo" required>
                        <select value={reportType} onChange={e => setReportType(e.target.value)} className="w-full">
                            <option value="transaction_history">Lịch sử Giao dịch</option>
                            <option value="inventory_discrepancy">Chênh lệch Kiểm kê</option>
                            <option value="detailed_inventory">Tồn kho Chi tiết</option>
                        </select>
                    </FormField>
                    
                    <div className="lg:col-span-2">
                        <FormField label="Kho">
                            <MultiSelectDropdown 
                                options={warehouseOptions}
                                selectedOptions={selectedWarehouses}
                                onChange={setSelectedWarehouses}
                                placeholder="All Warehouses"
                            />
                        </FormField>
                    </div>

                    <div style={{ visibility: showDateRange ? 'visible' : 'hidden' }}>
                        <FormField label="Khoảng thời gian">
                            <input ref={dateRangeRef} type="text" placeholder="Select date range..." className="w-full" readOnly />
                        </FormField>
                    </div>
                    
                    <div className="flex items-end">
                         <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-blue-700">
                            <Icon name="Download" className="w-4 h-4"/> Xuất Báo cáo
                        </button>
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="Lịch sử Xuất Báo cáo" icon="History">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-left text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-4 py-3">Loại báo cáo</th>
                                <th className="px-4 py-3">Ngày xuất</th>
                                <th className="px-4 py-3">Người xuất</th>
                                <th className="px-4 py-3">Tham số</th>
                                <th className="px-4 py-3">Trạng thái</th>
                                <th className="px-4 py-3">Hành động</th>
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
                                <tr><td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">Chưa có lịch sử xuất báo cáo.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </SectionCard>
        </div>
    );
};

export default ReportsPage;
