



import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Branch, Organization } from '../types';
import { Icon } from '../components/Icons';
import { Table, Column } from '../components/ui/Table';
import { BranchFormModal } from '../components/branch/BranchFormModal';
import { Toast } from '../components/ui/Toast';
import { FilterDrawer } from '../components/ui/FilterDrawer';
import { useDebounce } from '../hooks/useDebounce';

type ModalMode = 'create' | 'edit' | 'view';

const BranchPage: React.FC = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [modalState, setModalState] = useState<{ isOpen: boolean; mode: ModalMode; branch: Branch | null }>({
        isOpen: false,
        mode: 'create',
        branch: null,
    });
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<Record<string, string[]>>({});

    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const orgMap = useMemo(() => new Map(organizations.map(org => [org.org_code, org.org_name])), [organizations]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [branchesRes, orgsRes] = await Promise.all([
                fetch('./data/branches.json'),
                fetch('./data/organizations.json'),
            ]);
            if (!branchesRes.ok || !orgsRes.ok) {
                throw new Error('Failed to fetch data');
            }
            const branchesData: Branch[] = await branchesRes.json();
            const orgsData: Organization[] = await orgsRes.json();
            
            setBranches(branchesData);
            setOrganizations(orgsData);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, []);

     useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    // This effect updates branch org_name when the orgMap is ready
    useEffect(() => {
        if(organizations.length > 0) {
             setBranches(prev => prev.map(b => ({ ...b, org_name: orgMap.get(b.org_code) })));
        }
    }, [organizations, orgMap]);

    const handleCreate = () => {
        setModalState({ isOpen: true, mode: 'create', branch: null });
    };
    
    const handleView = (branch: Branch) => {
        setModalState({ isOpen: true, mode: 'view', branch });
    };

    const switchToEditMode = () => {
        setModalState(prev => ({ ...prev, mode: 'edit' }));
    };
    
    const handleSave = (branchToSave: Omit<Branch, 'id' | 'updated_at'>): Branch => {
        let savedBranch: Branch;
        if (modalState.mode === 'edit' && modalState.branch) {
            savedBranch = { ...modalState.branch, ...branchToSave, updated_at: new Date().toISOString() };
            setBranches(prev => prev.map(b => b.id === savedBranch.id ? savedBranch : b));
            setToastInfo({ message: 'Branch updated successfully', type: 'success' });
        } else {
            const newBranchCode = branchToSave.branch_code.toUpperCase();
            savedBranch = { 
                ...branchToSave, 
                id: newBranchCode,
                branch_code: newBranchCode,
                updated_at: new Date().toISOString(),
            };
            setBranches(prev => [savedBranch, ...prev]);
            setToastInfo({ message: 'Branch created successfully', type: 'success' });
        }
        return savedBranch;
    };
    
    const handleSaveAndContinue = (branchToSave: Omit<Branch, 'id' | 'updated_at'>) => {
        const savedBranch = handleSave(branchToSave);
        setModalState(prev => ({ ...prev, mode: 'edit', branch: savedBranch }));
    };

    const handleSaveAndClose = (branchToSave: Omit<Branch, 'id' | 'updated_at'>) => {
        handleSave(branchToSave);
        setModalState({ isOpen: false, mode: 'create', branch: null });
    };

    const filteredBranches = useMemo(() => {
        return branches
            .map(b => ({ ...b, org_name: orgMap.get(b.org_code) || b.org_code }))
            .filter(branch => {
                const search = debouncedSearchTerm.toLowerCase();
                return branch.branch_code.toLowerCase().includes(search) ||
                       branch.branch_name.toLowerCase().includes(search) ||
                       (branch.org_name && branch.org_name.toLowerCase().includes(search)) ||
                       (branch.email && branch.email.toLowerCase().includes(search)) ||
                       (branch.phone && branch.phone.includes(search));
            })
            .filter(branch => {
                return Object.entries(filters).every(([key, values]) => {
                    // FIX: Add a type guard to ensure `values` is an array before accessing its properties, resolving a potential type inference issue.
                    if (!Array.isArray(values) || values.length === 0) return true;
                    if (key === 'org_code') {
                         return values.includes(branch.org_code);
                    }
                    return values.includes(branch[key as keyof Branch] as string);
                });
            });
    }, [branches, debouncedSearchTerm, filters, orgMap]);

    const columns: Column<Branch>[] = useMemo(() => [
        { key: 'branch_code', header: 'Branch Code' },
        { key: 'branch_name', header: 'Branch Name' },
        { key: 'org_code', header: 'Organization', render: (branch) => orgMap.get(branch.org_code) || branch.org_code },
        { key: 'phone', header: 'Phone' },
        { key: 'email', header: 'Email' },
        { key: 'status', header: 'Status', render: (branch) => (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                branch.status === 'Active' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`
            }>
                {branch.status}
            </span>
        )},
        { key: 'updated_at', header: 'Updated At', render: (branch) => new Date(branch.updated_at).toLocaleDateString() },
        { key: 'actions', header: '', render: (branch) => (
            <div className="flex justify-end items-center gap-2">
                <button onClick={() => handleView(branch)} className="p-1 text-gray-500 hover:text-brand-primary dark:hover:text-blue-400">
                    <Icon name="Edit" className="w-4 h-4" />
                </button>
            </div>
        )}
    ], [orgMap]);

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
                             placeholder="Search by code/name/org..." 
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
                <Table<Branch>
                    columns={columns}
                    data={filteredBranches}
                    onRowDoubleClick={handleView}
                />
            )}
            
            {filteredBranches.length === 0 && !isLoading && (
                <div className="text-center py-16">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">No Branches Found</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Click 'Create' to add the first branch.</p>
                </div>
            )}

            {modalState.isOpen && (
                <BranchFormModal
                    isOpen={modalState.isOpen}
                    mode={modalState.mode}
                    onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                    onSaveAndContinue={handleSaveAndContinue}
                    onSaveAndClose={handleSaveAndClose}
                    onSwitchToEdit={switchToEditMode}
                    branch={modalState.branch}
                    existingBranches={branches}
                    organizations={organizations}
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
                    { key: 'org_code', label: 'Organization', options: organizations.map(o => o.org_code), optionLabels: orgMap },
                    { key: 'status', label: 'Status', options: ["Active","Inactive"]}
                ]}
            />
        </div>
    );
};

export default BranchPage;