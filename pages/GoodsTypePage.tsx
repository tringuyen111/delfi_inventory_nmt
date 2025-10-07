import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GoodsType } from '../types';
import { Icon } from '../components/Icons';
import { Table, Column } from '../components/ui/Table';
import { GoodsTypeFormModal } from '../components/goods_type/GoodsTypeFormModal';
import { Toast } from '../components/ui/Toast';
import { FilterDrawer } from '../components/ui/FilterDrawer';
import { useDebounce } from '../hooks/useDebounce';

type ModalMode = 'create' | 'edit' | 'view';

const GoodsTypePage: React.FC = () => {
    const [goodsTypes, setGoodsTypes] = useState<GoodsType[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [modalState, setModalState] = useState<{ isOpen: boolean; mode: ModalMode; goodsType: GoodsType | null }>({
        isOpen: false,
        mode: 'create',
        goodsType: null,
    });
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<Record<string, string[]>>({});

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('./data/goods_types.json');
            if (!response.ok) {
                throw new Error('Failed to fetch Goods Types');
            }
            const data: GoodsType[] = await response.json();
            setGoodsTypes(data);
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
        setModalState({ isOpen: true, mode: 'create', goodsType: null });
    };
    
    const handleView = (goodsType: GoodsType) => {
        setModalState({ isOpen: true, mode: 'view', goodsType });
    };

    const switchToEditMode = () => {
        setModalState(prev => ({ ...prev, mode: 'edit' }));
    };
    
    const handleSave = (gtToSave: Omit<GoodsType, 'id' | 'updated_at' | 'usage_count'>): GoodsType => {
        let savedGoodsType: GoodsType;
        if (modalState.mode === 'edit' && modalState.goodsType) {
            savedGoodsType = { ...modalState.goodsType, ...gtToSave, updated_at: new Date().toISOString() };
            setGoodsTypes(prev => prev.map(gt => gt.id === savedGoodsType.id ? savedGoodsType : gt));
            setToastInfo({ message: 'Cập nhật Goods Type thành công', type: 'success' });
        } else {
            const newCode = gtToSave.goods_type_code.toUpperCase();
            savedGoodsType = { 
                ...gtToSave, 
                id: newCode,
                goods_type_code: newCode,
                updated_at: new Date().toISOString(),
                usage_count: 0
            };
            setGoodsTypes(prev => [savedGoodsType, ...prev]);
            setToastInfo({ message: 'Tạo Goods Type thành công', type: 'success' });
        }
        return savedGoodsType;
    };
    
    const handleSaveAndContinue = (gtToSave: Omit<GoodsType, 'id' | 'updated_at' | 'usage_count'>) => {
        const savedGoodsType = handleSave(gtToSave);
        setModalState(prev => ({ ...prev, mode: 'edit', goodsType: savedGoodsType }));
    };

    const handleSaveAndClose = (gtToSave: Omit<GoodsType, 'id' | 'updated_at' | 'usage_count'>) => {
        handleSave(gtToSave);
        setModalState({ isOpen: false, mode: 'create', goodsType: null });
    };

    const filteredGoodsTypes = useMemo(() => {
        return goodsTypes
            .filter(gt => {
                const search = debouncedSearchTerm.toLowerCase();
                return gt.goods_type_code.toLowerCase().includes(search) ||
                       gt.goods_type_name.toLowerCase().includes(search);
            })
            .filter(gt => {
                return Object.entries(filters).every(([key, values]) => {
                    // FIX: Add a type guard to ensure `values` is an array before accessing its properties, resolving a potential type inference issue.
                    if (!Array.isArray(values) || values.length === 0) return true;
                    return values.includes(gt[key as keyof GoodsType] as string);
                });
            });
    }, [goodsTypes, debouncedSearchTerm, filters]);

    const columns: Column<GoodsType>[] = useMemo(() => [
        { key: 'goods_type_code', header: 'Mã loại Hàng Hóa' },
        { key: 'goods_type_name', header: 'Tên loại Hàng Hóa' },
        { key: 'description', header: 'Mô tả', render: (gt) => (
            <p title={gt.description} className="max-w-xs truncate">
                {gt.description || '—'}
            </p>
        )},
        { key: 'status', header: 'Trạng thái', render: (gt) => (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                gt.status === 'Active' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`
            }>
                {gt.status}
            </span>
        )},
        { key: 'updated_at', header: 'Cập nhật', render: (gt) => new Date(gt.updated_at).toLocaleDateString() },
        { key: 'actions', header: '', render: (gt) => (
            <div className="flex justify-end items-center gap-2">
                <button onClick={() => handleView(gt)} className="p-1 text-gray-500 hover:text-brand-primary dark:hover:text-blue-400">
                    <Icon name="Edit" className="w-4 h-4" />
                </button>
            </div>
        )}
    ], []);

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
                             placeholder="Tìm theo mã/tên..." 
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
                <Table<GoodsType>
                    columns={columns}
                    data={filteredGoodsTypes}
                    onRowDoubleClick={handleView}
                />
            )}
            
            {filteredGoodsTypes.length === 0 && !isLoading && (
                <div className="text-center py-16">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">Chưa có Goods Type</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Nhấn Create để thêm loại hàng hóa đầu tiên.</p>
                </div>
            )}

            {modalState.isOpen && (
                <GoodsTypeFormModal
                    isOpen={modalState.isOpen}
                    mode={modalState.mode}
                    onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                    onSaveAndContinue={handleSaveAndContinue}
                    onSaveAndClose={handleSaveAndClose}
                    onSwitchToEdit={switchToEditMode}
                    goodsType={modalState.goodsType}
                    existingGoodsTypes={goodsTypes}
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
                    { key: 'status', label: 'Trạng thái', options: ["Active","Inactive"]}
                ]}
            />
        </div>
    );
};

export default GoodsTypePage;
