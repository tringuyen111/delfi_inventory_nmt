import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Location, Warehouse, GoodsType } from '../types';
import { Icon } from '../components/Icons';
import { Table, Column } from '../components/ui/Table';
import { LocationFormModal } from '../components/location/LocationFormModal';
import { Toast } from '../components/ui/Toast';
import { useDebounce } from '../hooks/useDebounce';
import { useLanguage } from '../hooks/useLanguage';
import { Pagination } from '../components/ui/Pagination';
import { Dropdown } from '../components/ui/Dropdown';
import { ColumnVisibilityDropdown } from '../components/ui/ColumnVisibilityDropdown';

type ModalMode = 'create' | 'edit' | 'view';
const ITEMS_PER_PAGE = 8;
const COLUMN_VISIBILITY_KEY = 'location_column_visibility';

const LocationPage: React.FC = () => {
    const { t } = useLanguage();
    const [locations, setLocations] = useState<Location[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [goodsTypes, setGoodsTypes] = useState<GoodsType[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [modalState, setModalState] = useState<{ isOpen: boolean; mode: ModalMode; location: Location | null }>({
        isOpen: false,
        mode: 'create',
        location: null,
    });
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ wh_code: 'all', status: 'all' });
    const [currentPage, setCurrentPage] = useState(1);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const whMap = useMemo(() => new Map(warehouses.map(w => [w.wh_code, w.wh_name])), [warehouses]);
    const gtMap = useMemo(() => new Map(goodsTypes.map(gt => [gt.goods_type_code, gt.goods_type_name])), [goodsTypes]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [locsRes, whRes, gtRes] = await Promise.all([
                fetch('./data/locations.json'),
                fetch('./data/warehouses.json'),
                fetch('./data/goods_types.json'),
            ]);
            if (!locsRes.ok || !whRes.ok || !gtRes.ok) {
                throw new Error('Failed to fetch data');
            }
            const locsData: Location[] = await locsRes.json();
            const whData: Warehouse[] = await whRes.json();
            const gtData: GoodsType[] = await gtRes.json();
            
            setLocations(locsData);
            setWarehouses(whData);
            setGoodsTypes(gtData);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const renderGoodsTypeChips = (codes: string[] = []) => (
        <div className="flex flex-wrap gap-1 max-w-xs">
            {codes.length > 0 ? codes.map(code => (
                <span key={code} className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200" title={gtMap.get(code)}>
                    {code}
                </span>
            )) : '—'}
        </div>
    );

    const allColumns: Column<Location>[] = useMemo(() => [
        { key: 'loc_code', header: 'Location Code' },
        { key: 'loc_name', header: 'Location Name' },
        { key: 'wh_code', header: 'Warehouse', render: (loc) => whMap.get(loc.wh_code) || loc.wh_code },
        { key: 'allowed_goods_types', header: 'Allowed GT', render: (loc) => renderGoodsTypeChips(loc.allowed_goods_types) },
        { key: 'blocked_goods_types', header: 'Blocked GT', render: (loc) => renderGoodsTypeChips(loc.blocked_goods_types) },
        { key: 'status', header: 'Status', render: (loc) => (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                loc.status === 'Active' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`
            }>
                {loc.status}
            </span>
        )},
        { key: 'updated_at', header: 'Updated At', render: (loc) => new Date(loc.updated_at).toLocaleDateString() },
        { key: 'actions', header: '', render: (loc) => (
            <div className="flex justify-end items-center gap-2">
                <button onClick={() => handleView(loc)} className="p-1 text-gray-500 hover:text-brand-primary dark:hover:text-blue-400">
                    <Icon name="Edit" className="w-4 h-4" />
                </button>
            </div>
        )}
    ], [whMap, gtMap]);

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
        const mandatoryColumns = allColumns.filter(c => c.key === 'loc_code' || c.key === 'actions').map(c => c.key as string);
        setVisibleColumnKeys(new Set(mandatoryColumns));
    };
    
    const columns = useMemo(() => allColumns.filter(col => visibleColumnKeys.has(col.key as string)), [allColumns, visibleColumnKeys]);

    
    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const handleCreate = () => {
        setModalState({ isOpen: true, mode: 'create', location: null });
    };
    
    const handleView = (location: Location) => {
        setModalState({ isOpen: true, mode: 'view', location });
    };

    const switchToEditMode = () => {
        setModalState(prev => ({ ...prev, mode: 'edit' }));
    };
    
    const handleSave = (locToSave: Omit<Location, 'id' | 'updated_at' | 'onhand_qty'>): Location => {
        let savedLocation: Location;
        if (modalState.mode === 'edit' && modalState.location) {
            savedLocation = { ...modalState.location, ...locToSave, updated_at: new Date().toISOString() };
            setLocations(prev => prev.map(l => l.id === savedLocation.id ? savedLocation : l));
            setToastInfo({ message: 'Location updated successfully', type: 'success' });
        } else {
            const newLocCode = locToSave.loc_code.toUpperCase();
            savedLocation = { 
                ...locToSave, 
                id: `${locToSave.wh_code}-${newLocCode}`,
                loc_code: newLocCode,
                updated_at: new Date().toISOString(),
                onhand_qty: 0,
            };
            setLocations(prev => [savedLocation, ...prev]);
            setToastInfo({ message: 'Location created successfully', type: 'success' });
        }
        return savedLocation;
    };
    
    const handleSaveAndContinue = (locToSave: Omit<Location, 'id' | 'updated_at' | 'onhand_qty'>) => {
        const savedLocation = handleSave(locToSave);
        setModalState(prev => ({ ...prev, mode: 'edit', location: savedLocation }));
    };

    const handleSaveAndClose = (locToSave: Omit<Location, 'id' | 'updated_at' | 'onhand_qty'>) => {
        handleSave(locToSave);
        setModalState({ isOpen: false, mode: 'create', location: null });
    };

    const filteredLocations = useMemo(() => {
        return locations
            .map(l => ({ ...l, wh_name: whMap.get(l.wh_code) || l.wh_code }))
            .filter(loc => {
                const search = debouncedSearchTerm.toLowerCase();
                return loc.loc_code.toLowerCase().includes(search) ||
                       loc.loc_name.toLowerCase().includes(search) ||
                       (loc.wh_name && loc.wh_name.toLowerCase().includes(search));
            })
            .filter(loc => {
                if (filters.wh_code !== 'all' && loc.wh_code !== filters.wh_code) return false;
                if (filters.status !== 'all' && loc.status !== filters.status) return false;
                return true;
            });
    }, [locations, debouncedSearchTerm, filters, whMap]);

    const paginatedLocations = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filteredLocations.slice(start, end);
    }, [filteredLocations, currentPage]);

    const totalPages = useMemo(() => {
        return Math.ceil(filteredLocations.length / ITEMS_PER_PAGE);
    }, [filteredLocations]);

    return (
        <div className="space-y-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('menu.masterData')} / <span className="font-semibold text-gray-800 dark:text-gray-200">{t('menu.location')}</span>
            </div>
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
                             placeholder="Search by code/name/warehouse..." 
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none"
                           />
                        </div>
                         <select name="wh_code" value={filters.wh_code} onChange={handleFilterChange} className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none">
                            <option value="all">All Warehouses</option>
                            {warehouses.map(o => <option key={o.id} value={o.wh_code}>{o.wh_name}</option>)}
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
                    <Table<Location>
                        columns={columns}
                        data={paginatedLocations}
                        onRowDoubleClick={handleView}
                    />
                )}
                
                {paginatedLocations.length === 0 && !isLoading && (
                    <div className="text-center py-16">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">No Locations Found</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Click 'Create' to add the first location.</p>
                    </div>
                )}
                
                {totalPages > 1 && (
                    <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </footer>
                )}

                {modalState.isOpen && (
                    <LocationFormModal
                        isOpen={modalState.isOpen}
                        mode={modalState.mode}
                        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                        onSaveAndContinue={handleSaveAndContinue}
                        onSaveAndClose={handleSaveAndClose}
                        onSwitchToEdit={switchToEditMode}
                        location={modalState.location}
                        existingLocations={locations}
                        warehouses={warehouses}
                        goodsTypes={goodsTypes}
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

export default LocationPage;