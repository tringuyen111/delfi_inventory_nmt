import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ModelGoods, GoodsType, Uom } from '../types';
import { Icon } from '../components/Icons';
import { Table, Column } from '../components/ui/Table';
import { ModelGoodsFormModal } from '../components/model_goods/ModelGoodsFormModal';
import { Toast } from '../components/ui/Toast';
import { useDebounce } from '../hooks/useDebounce';
import { useLanguage } from '../hooks/useLanguage';
import { Pagination } from '../components/ui/Pagination';
import { Dropdown } from '../components/ui/Dropdown';
import { ColumnVisibilityDropdown } from '../components/ui/ColumnVisibilityDropdown';

type ModalMode = 'create' | 'edit' | 'view';
const ITEMS_PER_PAGE = 8;
const COLUMN_VISIBILITY_KEY = 'model_goods_column_visibility';


const ModelGoodsPage: React.FC = () => {
    const { t } = useLanguage();
    const [modelGoods, setModelGoods] = useState<ModelGoods[]>([]);
    const [goodsTypes, setGoodsTypes] = useState<GoodsType[]>([]);
    const [uoms, setUoms] = useState<Uom[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [modalState, setModalState] = useState<{ isOpen: boolean; mode: ModalMode; model: ModelGoods | null }>({
        isOpen: false,
        mode: 'create',
        model: null,
    });
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ goods_type_code: 'all', tracking_type: 'all', status: 'all' });
    const [currentPage, setCurrentPage] = useState(1);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const gtMap = useMemo(() => new Map(goodsTypes.map(gt => [gt.goods_type_code, gt.goods_type_name])), [goodsTypes]);
    const uomMap = useMemo(() => new Map(uoms.map(u => [u.uom_code, u.uom_name])), [uoms]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [modelsRes, gtsRes, uomsRes] = await Promise.all([
                fetch('./data/model_goods.json'),
                fetch('./data/goods_types.json'),
                fetch('./data/uoms.json'),
            ]);
            if (!modelsRes.ok || !gtsRes.ok || !uomsRes.ok) {
                throw new Error('Failed to fetch data');
            }
            const modelsData: ModelGoods[] = await modelsRes.json();
            const gtsData: GoodsType[] = await gtsRes.json();
            const uomsData: Uom[] = await uomsRes.json();
            
            setModelGoods(modelsData);
            setGoodsTypes(gtsData);
            setUoms(uomsData);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const trackingTypeBadge = (type: 'None' | 'Serial' | 'Lot') => {
        const styles = {
            None: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
            Serial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
            Lot: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        };
        return <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[type]}`}>{type}</span>
    }

    const allColumns: Column<ModelGoods>[] = useMemo(() => [
        { key: 'model_code', header: 'Model Code' },
        { key: 'model_name', header: 'Model Name' },
        { key: 'goods_type_code', header: 'Goods Type', render: (m) => gtMap.get(m.goods_type_code) || m.goods_type_code },
        { key: 'base_uom', header: 'Base UoM', render: (m) => uomMap.get(m.base_uom) || m.base_uom },
        { key: 'tracking_type', header: 'Tracking Type', render: (m) => trackingTypeBadge(m.tracking_type) },
        { key: 'status', header: 'Status', render: (m) => (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                m.status === 'Active' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`
            }>
                {m.status}
            </span>
        )},
        { key: 'updated_at', header: 'Updated At', render: (m) => new Date(m.updated_at).toLocaleDateString() },
        { key: 'actions', header: '', render: (m) => (
            <div className="flex justify-end items-center gap-2">
                <button onClick={() => handleView(m)} className="p-1 text-gray-500 hover:text-brand-primary dark:hover:text-blue-400">
                    <Icon name="Edit" className="w-4 h-4" />
                </button>
            </div>
        )}
    ], [gtMap, uomMap]);

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
    const handleHideAll = () => {
        const mandatoryColumns = allColumns.filter(c => c.key === 'model_code' || c.key === 'actions').map(c => c.key as string);
        setVisibleColumnKeys(new Set(mandatoryColumns));
    };

    const columns = useMemo(() => allColumns.filter(col => visibleColumnKeys.has(col.key as string)), [allColumns, visibleColumnKeys]);
    
     const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const handleCreate = () => {
        setModalState({ isOpen: true, mode: 'create', model: null });
    };
    
    const handleView = (model: ModelGoods) => {
        setModalState({ isOpen: true, mode: 'view', model });
    };

    const switchToEditMode = () => {
        setModalState(prev => ({ ...prev, mode: 'edit' }));
    };
    
    const handleSave = (modelToSave: Omit<ModelGoods, 'id' | 'model_code' | 'updated_at' | 'total_onhand_qty'>): ModelGoods => {
        let savedModel: ModelGoods;
        if (modalState.mode === 'edit' && modalState.model) {
            savedModel = { ...modalState.model, ...modelToSave, updated_at: new Date().toISOString() };
            setModelGoods(prev => prev.map(m => m.id === savedModel.id ? savedModel : m));
            setToastInfo({ message: t('pages.modelGoods.toast.updated'), type: 'success' });
        } else {
            const now = new Date();
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const seq = (modelGoods.length + 1).toString().padStart(5, '0');
            const newModelCode = `MDL-${year}${month}-${seq}`;

            savedModel = { 
                ...modelToSave, 
                id: newModelCode,
                model_code: newModelCode,
                updated_at: now.toISOString(),
                total_onhand_qty: 0,
            };
            setModelGoods(prev => [savedModel, ...prev]);
            setToastInfo({ message: t('pages.modelGoods.toast.created'), type: 'success' });
        }
        return savedModel;
    };
    
    const handleSaveAndContinue = (modelToSave: Omit<ModelGoods, 'id' | 'model_code' | 'updated_at' | 'total_onhand_qty'>) => {
        const savedModel = handleSave(modelToSave);
        setModalState(prev => ({ ...prev, mode: 'edit', model: savedModel }));
    };

    const handleSaveAndClose = (modelToSave: Omit<ModelGoods, 'id' | 'model_code' | 'updated_at' | 'total_onhand_qty'>) => {
        handleSave(modelToSave);
        setModalState({ isOpen: false, mode: 'create', model: null });
    };

    const filteredModelGoods = useMemo(() => {
        return modelGoods
            .map(m => ({
                ...m, 
                goods_type_name: gtMap.get(m.goods_type_code) || m.goods_type_code,
                base_uom_name: uomMap.get(m.base_uom) || m.base_uom,
            }))
            .filter(model => {
                const search = debouncedSearchTerm.toLowerCase();
                return model.model_code.toLowerCase().includes(search) ||
                       model.model_name.toLowerCase().includes(search) ||
                       model.goods_type_name.toLowerCase().includes(search);
            })
            .filter(model => {
                if (filters.goods_type_code !== 'all' && model.goods_type_code !== filters.goods_type_code) return false;
                if (filters.tracking_type !== 'all' && model.tracking_type !== filters.tracking_type) return false;
                if (filters.status !== 'all' && model.status !== filters.status) return false;
                return true;
            });
    }, [modelGoods, debouncedSearchTerm, filters, gtMap, uomMap]);
    
    const paginatedModelGoods = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filteredModelGoods.slice(start, end);
    }, [filteredModelGoods, currentPage]);

    const totalPages = useMemo(() => Math.ceil(filteredModelGoods.length / ITEMS_PER_PAGE), [filteredModelGoods]);

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
                             placeholder={t('pages.modelGoods.searchPlaceholder')}
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none"
                           />
                        </div>
                        <select name="goods_type_code" value={filters.goods_type_code} onChange={handleFilterChange} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none">
                            <option value="all">All Goods Types</option>
                            {goodsTypes.map(o => <option key={o.id} value={o.goods_type_code}>{o.goods_type_name}</option>)}
                        </select>
                         <select name="tracking_type" value={filters.tracking_type} onChange={handleFilterChange} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none">
                            <option value="all">All Tracking Types</option>
                            {["None","Serial", "Lot"].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none">
                            <option value="all">All Statuses</option>
                            {["Active","Inactive"].map(o => <option key={o} value={o}>{t(`common.${o.toLowerCase()}`)}</option>)}
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
                                allColumns={allColumns.filter(c => c.key !== 'actions')}
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
                    <Table<ModelGoods>
                        columns={columns}
                        data={paginatedModelGoods}
                        onRowDoubleClick={handleView}
                    />
                )}
                
                {paginatedModelGoods.length === 0 && !isLoading && (
                    <div className="text-center py-16">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">{t('pages.modelGoods.empty.title')}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('pages.modelGoods.empty.message')}</p>
                    </div>
                )}
                
                {totalPages > 1 && (
                    <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </footer>
                )}

                {modalState.isOpen && (
                    <ModelGoodsFormModal
                        isOpen={modalState.isOpen}
                        mode={modalState.mode}
                        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                        onSaveAndContinue={handleSaveAndContinue}
                        onSaveAndClose={handleSaveAndClose}
                        onSwitchToEdit={switchToEditMode}
                        modelGoods={modalState.model}
                        existingModelGoods={modelGoods}
                        goodsTypes={goodsTypes}
                        uoms={uoms}
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

export default ModelGoodsPage;