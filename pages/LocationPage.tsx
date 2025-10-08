import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Location, Warehouse, GoodsType } from '../types';
import { Icon } from '../components/Icons';
import { Table, Column } from '../components/ui/Table';
import { LocationFormModal } from '../components/location/LocationFormModal';
import { Toast } from '../components/ui/Toast';
import { FilterDrawer } from '../components/ui/FilterDrawer';
import { useDebounce } from '../hooks/useDebounce';

type ModalMode = 'create' | 'edit' | 'view';

const LocationPage: React.FC = () => {
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
    const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<Record<string, string[]>>({});

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
                return Object.entries(filters).every(([key, values]) => {
                    // FIX: Add a type guard to ensure `values` is an array before accessing its properties, resolving a potential type inference issue.
                    if (!Array.isArray(values) || values.length === 0) return true;
                    return values.includes(loc[key as keyof Location] as string);
                });
            });
    }, [locations, debouncedSearchTerm, filters, whMap]);

    const renderGoodsTypeChips = (codes: string[] = []) => (
        <div className="flex flex-wrap gap-1 max-w-xs">
            {codes.length > 0 ? codes.map(code => (
                <span key={code} className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200" title={gtMap.get(code)}>
                    {code}
                </span>
            )) : '—'}
        </div>
    );

    const columns: Column<Location>[] = useMemo(() => [
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
                             placeholder="Search by code/name/warehouse..." 
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
                <Table<Location>
                    columns={columns}
                    data={filteredLocations}
                    onRowDoubleClick={handleView}
                />
            )}
            
            {filteredLocations.length === 0 && !isLoading && (
                <div className="text-center py-16">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">No Locations Found</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Click 'Create' to add the first location.</p>
                </div>
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
            <FilterDrawer
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                filters={filters}
                onApplyFilters={setFilters}
                onClearFilters={() => setFilters({})}
                filterOptions={[
                    { key: 'wh_code', label: 'Warehouse', options: warehouses.map(w => w.wh_code), optionLabels: whMap },
                    { key: 'status', label: 'Status', options: ["Active","Inactive"]}
                ]}
            />
        </div>
    );
};

export default LocationPage;