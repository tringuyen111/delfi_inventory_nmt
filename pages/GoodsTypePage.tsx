import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GoodsType } from '../types';
import { Icon } from '../components/Icons';
import { Table, Column } from '../components/ui/Table';
import { GoodsTypeFormModal } from '../components/goods_type/GoodsTypeFormModal';
import { Toast } from '../components/ui/Toast';
import { useDebounce } from '../hooks/useDebounce';
import { useLanguage } from '../hooks/useLanguage';
import { Pagination } from '../components/ui/Pagination';
import { Dropdown } from '../components/ui/Dropdown';
import { ColumnVisibilityDropdown } from '../components/ui/ColumnVisibilityDropdown';

type ModalMode = 'create' | 'edit' | 'view';
const ITEMS_PER_PAGE = 8;
const COLUMN_VISIBILITY_KEY = 'goods_type_column_visibility';

const GoodsTypePage: React.FC = () => {
    const { t } = useLanguage();
    const [goodsTypes, setGoodsTypes] = useState<GoodsType[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [modalState, setModalState] = useState<{ isOpen: boolean; mode: ModalMode; goodsType: GoodsType | null }>({
        isOpen: false,
        mode: 'create',
        goodsType: null,
    });
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ status: 'all' });
    const [currentPage, setCurrentPage] = useState(1);

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

    const allColumns: Column<GoodsType>[] = useMemo(() => [
        { key: 'goods_type_code', header: 'Goods Type Code' },
        { key: 'goods_type_name', header: 'Goods Type Name' },
        { key: 'description', header: 'Description', render: (gt) => (
            <p title={gt.description} className="max-w-xs truncate">
                {gt.description || '—'}
            </p>
        )},
        { key: 'status', header: 'Status', render: (gt) => (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                gt.status === 'Active' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`
            }>
                {gt.status}
            </span>
        )},
        { key: 'updated_at', header: 'Updated At', render: (gt) => new Date(gt.updated_at).toLocaleDateString() },
        { key: 'actions', header: '', render: (gt) => (
            <div className="flex justify-end items-center gap-2">
                <button onClick={() => handleView(gt)} className="p-1 text-gray-500 hover:text-brand-primary dark:hover:text-blue-400">
                    <Icon name="Edit" className="w-4 h-4" />
                </button>
            </div>
        )}
    ], []);

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
        const mandatoryColumns = allColumns.filter(c => c.key === 'goods_type_code' || c.key === 'actions').map(c => c.key as string);
        setVisibleColumnKeys(new Set(mandatoryColumns));
    };

    const columns = useMemo(() => allColumns.filter(col => visibleColumnKeys.has(col.key as string)), [allColumns, visibleColumnKeys]);
    
    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilters({ status: e.target.value });
        setCurrentPage(1);
    };

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
            setToastInfo({ message: 'Goods Type updated successfully', type: 'success' });
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
            setToastInfo({ message: 'Goods Type created successfully', type: 'success' });
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
                if (filters.status !== 'all') {
                    return gt.status === filters.status;
                }
                return true;
            });
    }, [goodsTypes, debouncedSearchTerm, filters]);

    const paginatedGoodsTypes = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filteredGoodsTypes.slice(start, end);
    }, [filteredGoodsTypes, currentPage]);

    const totalPages = useMemo(() => {
        return Math.ceil(filteredGoodsTypes.length / ITEMS_PER_PAGE);
    }, [filteredGoodsTypes]);

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
                             placeholder="Search by code/name..." 
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none"
                           />
                        </div>
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
                    <Table<GoodsType>
                        columns={columns}
                        data={paginatedGoodsTypes}
                        onRowDoubleClick={handleView}
                    />
                )}
                
                {paginatedGoodsTypes.length === 0 && !isLoading && (
                    <div className="text-center py-16">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">No Goods Types Found</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Click 'Create' to add the first goods type.</p>
                    </div>
                )}
                
                {totalPages > 1 && (
                    <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </footer>
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
            </div>
        </div>
    );
};

export default GoodsTypePage;