import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ModelGoods, GoodsType, Uom } from '../types';
import { Icon } from '../components/Icons';
import { Table, Column } from '../components/ui/Table';
import { ModelGoodsFormModal } from '../components/model_goods/ModelGoodsFormModal';
import { Toast } from '../components/ui/Toast';
import { FilterDrawer } from '../components/ui/FilterDrawer';
import { useDebounce } from '../hooks/useDebounce';

type ModalMode = 'create' | 'edit' | 'view';

const ModelGoodsPage: React.FC = () => {
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
    const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<Record<string, string[]>>({});

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
            setToastInfo({ message: 'Model Goods updated successfully', type: 'success' });
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
            setToastInfo({ message: 'Model Goods created successfully', type: 'success' });
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
                return Object.entries(filters).every(([key, values]) => {
                    // FIX: Add a type guard to ensure `values` is an array before accessing its properties, resolving a potential type inference issue.
                    if (!Array.isArray(values) || values.length === 0) return true;
                    return values.includes(model[key as keyof ModelGoods] as string);
                });
            });
    }, [modelGoods, debouncedSearchTerm, filters, gtMap, uomMap]);

    const trackingTypeBadge = (type: 'None' | 'Serial' | 'Lot') => {
        const styles = {
            None: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
            Serial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
            Lot: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        };
        return <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[type]}`}>{type}</span>
    }

    const columns: Column<ModelGoods>[] = useMemo(() => [
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
                             placeholder="Search by code/name/goods type..." 
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
                <Table<ModelGoods>
                    columns={columns}
                    data={filteredModelGoods}
                    onRowDoubleClick={handleView}
                />
            )}
            
            {filteredModelGoods.length === 0 && !isLoading && (
                <div className="text-center py-16">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">No Model Goods Found</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Click 'Create' to add the first model.</p>
                </div>
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
            <FilterDrawer
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                filters={filters}
                onApplyFilters={setFilters}
                onClearFilters={() => setFilters({})}
                filterOptions={[
                    { key: 'goods_type_code', label: 'Goods Type', options: goodsTypes.filter(gt => gt.status === 'Active').map(gt => gt.goods_type_code), optionLabels: gtMap },
                    { key: 'tracking_type', label: 'Tracking', options: ["None","Serial","Lot"] },
                    { key: 'status', label: 'Status', options: ["Active","Inactive"]}
                ]}
            />
        </div>
    );
};

export default ModelGoodsPage;