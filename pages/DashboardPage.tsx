import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Icon, IconName } from '../components/Icons';
import { SectionCard } from '../components/SectionCard';
import { useTheme } from '../hooks/useTheme';
import { ModelGoods, GoodsReceipt, GoodsIssue, OnhandByLocation, Warehouse, GoodsType, PendingAction } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';

// --- CHART.JS SETUP ---
// Access Chart.js from the global scope and register necessary components.
const Chart = (window as any).Chart;
if (Chart) {
    Chart.register(
        Chart.ArcElement, Chart.LineElement, Chart.BarElement, Chart.PointElement,
        Chart.BarController, Chart.LineController, Chart.DoughnutController,
        Chart.CategoryScale, Chart.LinearScale, Chart.Tooltip, Chart.Legend, Chart.Filler
    );
}

// --- TYPE DEFINITIONS ---
type ChartType = 'bar' | 'line' | 'doughnut';
type TimeFilter = 'week' | 'month' | 'year';

// --- WIDGET COMPONENTS ---

const KpiCard: React.FC<{ title: string; value: string | number; icon: IconName; }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 flex items-start justify-between shadow-sm">
        <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">{title}</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-1">{value.toLocaleString()}</p>
        </div>
        <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
            <Icon name={icon} className="w-6 h-6 text-brand-primary" />
        </div>
    </div>
);

const ChartWrapper: React.FC<{ chartData: any; options: any; type: ChartType; title: string; timeFilter?: TimeFilter; setTimeFilter?: (filter: TimeFilter) => void; }> = ({ chartData, options, type, title, timeFilter, setTimeFilter }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<any>(null);

    useEffect(() => {
        if (!canvasRef.current || !Chart) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        chartRef.current = new Chart(ctx, {
            type: type,
            data: chartData,
            options: options,
        });

        return () => {
            chartRef.current?.destroy();
        };
    }, []);

    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.data = chartData;
            chartRef.current.options = options;
            chartRef.current.update();
        }
    }, [chartData, options]);

    return (
        <SectionCard title={title} icon="BarChart">
            {setTimeFilter && (
                <div className="flex justify-end mb-4">
                    <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-md p-0.5">
                        {(['week', 'month', 'year'] as TimeFilter[]).map(filter => (
                            <button key={filter} onClick={() => setTimeFilter(filter)} className={`px-3 py-1 text-xs font-medium rounded ${timeFilter === filter ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                                {filter.charAt(0).toUpperCase() + filter.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <div className="h-64">
                <canvas ref={canvasRef}></canvas>
            </div>
        </SectionCard>
    );
};

const TopModelsList: React.FC<{ data: ModelGoods[] }> = ({ data }) => (
    <SectionCard title="Top 5 Models by Quantity" icon="List">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.map(model => (
                <li key={model.id} className="py-3 flex justify-between items-center">
                    <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate w-48" title={model.model_name}>{model.model_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{model.model_code}</p>
                    </div>
                    <p className="text-sm font-semibold text-brand-primary">{model.total_onhand_qty.toLocaleString()}</p>
                </li>
            ))}
        </ul>
    </SectionCard>
);

const PendingActionsList: React.FC<{ data: PendingAction[]; onNavigate: (pageId: string, pageLabel: string) => void }> = ({ data, onNavigate }) => (
    <SectionCard title="Pending Actions List" icon="ClipboardList">
        <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                    <tr>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2">Document No.</th>
                        <th className="px-4 py-2">Status</th>
                        <th className="px-4 py-2">Created By</th>
                        <th className="px-4 py-2">Created At</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {data.length > 0 ? data.map(action => (
                        <tr key={action.doc_no} onClick={() => onNavigate(action.page_id, action.page_label)} className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                            <td className="px-4 py-2">{action.type}</td>
                            <td className="px-4 py-2 font-mono text-gray-800 dark:text-gray-200">{action.doc_no}</td>
                            <td className="px-4 py-2"><StatusBadge status={action.status} /></td>
                            <td className="px-4 py-2">{action.created_by}</td>
                            <td className="px-4 py-2 text-gray-500">{new Date(action.created_at).toLocaleDateString()}</td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={5} className="text-center py-8 text-gray-500">No pending actions.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </SectionCard>
);

// --- MAIN DASHBOARD PAGE ---
const DashboardPage: React.FC<{ onNavigate: (pageId: string, pageLabel: string) => void }> = ({ onNavigate }) => {
    const { theme } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Data states
    const [kpiData, setKpiData] = useState({ onhand: 0, pendingReceipts: 0, pendingIssues: 0 });
    const [inventoryByWhData, setInventoryByWhData] = useState<{ labels: string[], datasets: any[] }>({ labels: [], datasets: [] });
    const [inventoryByGtData, setInventoryByGtData] = useState<{ labels: string[], datasets: any[] }>({ labels: [], datasets: [] });
    const [topModels, setTopModels] = useState<ModelGoods[]>([]);
    const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
    
    // Transaction Chart state
    const [transactionTimeFilter, setTransactionTimeFilter] = useState<TimeFilter>('month');
    const [transactionData, setTransactionData] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // FIX: Correctly destructure the Promise.all results and rename `issues` to `giIssues` to match usage.
                const [models, receipts, giIssues, onhand, warehouses, goodsTypes] = await Promise.all([
                    fetch('./data/model_goods.json').then(res => res.json()),
                    fetch('./data/goods_receipts.json').then(res => res.json()),
                    fetch('./data/goods_issues.json').then(res => res.json()),
                    fetch('./data/onhand_by_location.json').then(res => res.json()),
                    fetch('./data/warehouses.json').then(res => res.json()),
                    fetch('./data/goods_types.json').then(res => res.json()),
                ]);

                // 1. KPIs
                const totalOnhand = models.reduce((sum: number, model: ModelGoods) => sum + model.total_onhand_qty, 0);
                const pendingReceipts = receipts.filter((r: GoodsReceipt) => ['Draft', 'Submitted'].includes(r.status)).length;
                const pendingIssues = giIssues.records.filter((i: GoodsIssue) => ['Draft', 'Submitted', 'AdjustmentRequested'].includes(i.status)).length;
                setKpiData({ onhand: totalOnhand, pendingReceipts, pendingIssues });

                // 2. Inventory by Warehouse (Bar)
                const whTotals = onhand.reduce((acc: Record<string, number>, item: OnhandByLocation) => {
                    acc[item.wh_code] = (acc[item.wh_code] || 0) + item.onhand_qty;
                    return acc;
                }, {});
                const whMap = new Map(warehouses.map((w: Warehouse) => [w.wh_code, w.wh_name]));
                setInventoryByWhData({
                    labels: Object.keys(whTotals).map(code => whMap.get(code) || code),
                    datasets: [{ label: 'Total Quantity', data: Object.values(whTotals), backgroundColor: '#1E88E5' }]
                });

                // 3. Inventory by Goods Type (Doughnut)
                const gtTotals = models.reduce((acc: Record<string, number>, item: ModelGoods) => {
                    acc[item.goods_type_code] = (acc[item.goods_type_code] || 0) + item.total_onhand_qty;
                    return acc;
                }, {});
                const gtMap = new Map(goodsTypes.map((gt: GoodsType) => [gt.goods_type_code, gt.goods_type_name]));
                 setInventoryByGtData({
                    labels: Object.keys(gtTotals).map(code => gtMap.get(code) || code),
                    datasets: [{ data: Object.values(gtTotals), backgroundColor: ['#1E88E5', '#43A047', '#FB8C00', '#E53935', '#8E24AA'] }]
                });

                // 4. Top 5 Models
                setTopModels([...models].sort((a, b) => b.total_onhand_qty - a.total_onhand_qty).slice(0, 5));

                // 5. Pending Actions
                const pendingGR: PendingAction[] = receipts.filter((r: GoodsReceipt) => ['Draft', 'Submitted'].includes(r.status)).map((r: GoodsReceipt) => ({ type: 'Goods Receipt', doc_no: r.gr_no, status: r.status, created_at: r.created_at, created_by: r.created_by, page_id: 'goods_receipt', page_label: 'Goods Receipt' }));
                const pendingGI: PendingAction[] = giIssues.records.filter((i: GoodsIssue) => ['Draft', 'Submitted', 'AdjustmentRequested'].includes(i.status)).map((i: GoodsIssue) => ({ type: 'Goods Issue', doc_no: i.gi_no, status: i.status, created_at: i.created_at, created_by: i.created_by, page_id: 'goods_issue', page_label: 'Goods Issue' }));
                setPendingActions([...pendingGR, ...pendingGI].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

                // 6. Transaction Data (Mock)
                const generateData = (count: number) => Array.from({ length: count }, () => Math.floor(Math.random() * 50));
                setTransactionData({
                    week: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], datasets: [{ label: 'Receipts', data: generateData(7) }, { label: 'Issues', data: generateData(7) }, { label: 'Transfers', data: generateData(7) }] },
                    month: { labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], datasets: [{ label: 'Receipts', data: generateData(4) }, { label: 'Issues', data: generateData(4) }, { label: 'Transfers', data: generateData(4) }] },
                    year: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], datasets: [{ label: 'Receipts', data: generateData(12) }, { label: 'Issues', data: generateData(12) }, { label: 'Transfers', data: generateData(12) }] }
                });

            } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to load dashboard data.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const chartBaseOptions = useMemo(() => {
        const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = theme === 'dark' ? '#cbd5e1' : '#64748b';
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: textColor } } },
            scales: { x: { grid: { color: gridColor }, ticks: { color: textColor } }, y: { grid: { color: gridColor }, ticks: { color: textColor } } }
        };
    }, [theme]);

    const lineChartData = useMemo(() => {
        if (!transactionData) return { labels: [], datasets: [] };
        const data = transactionData[transactionTimeFilter];
        const colors = { Receipts: '#1E88E5', Issues: '#E53935', Transfers: '#FB8C00' };
        return {
            labels: data.labels,
            datasets: data.datasets.map((ds: any) => ({
                ...ds,
                borderColor: colors[ds.label as keyof typeof colors],
                backgroundColor: `${colors[ds.label as keyof typeof colors]}33`,
                tension: 0.3,
                fill: true,
            }))
        };
    }, [transactionData, transactionTimeFilter]);


    if (isLoading) return <div>Loading Dashboard...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard title="Total Onhand Quantity" value={kpiData.onhand} icon="Warehouse" />
                <KpiCard title="Pending Receipts" value={kpiData.pendingReceipts} icon="Download" />
                <KpiCard title="Pending Issues" value={kpiData.pendingIssues} icon="ExternalLink" />
            </div>
            
            <div className="lg:col-span-2">
                <ChartWrapper type="line" chartData={lineChartData} options={chartBaseOptions} title="Transaction Volume" timeFilter={transactionTimeFilter} setTimeFilter={setTransactionTimeFilter} />
            </div>

            <div>
                <ChartWrapper type="doughnut" chartData={inventoryByGtData} options={{ ...chartBaseOptions, scales: {} }} title="Inventory by Goods Type" />
            </div>

            <div className="lg:col-span-2">
                <ChartWrapper type="bar" chartData={inventoryByWhData} options={{ ...chartBaseOptions, plugins: { legend: { display: false } } }} title="Inventory by Warehouse" />
            </div>
            
            <div>
                <TopModelsList data={topModels} />
            </div>

            <div className="lg:col-span-3">
                <PendingActionsList data={pendingActions} onNavigate={onNavigate} />
            </div>
        </div>
    );
};

export default DashboardPage;