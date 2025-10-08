
import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { InventoryCount, Warehouse, Location, ModelGoods, OnhandByLocation, InventoryCountLine, StatusHistoryEvent } from '../../types';
import { FormField } from '../ui/FormField';
import { StatusBadge } from '../ui/StatusBadge';
import { Icon } from '../Icons';
import { Table, Column } from '../ui/Table';
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown';
import { ViewCountDetailModal } from './ViewCountDetailModal';
import { SystemDetailViewModal } from './SystemDetailViewModal';
import { SectionCard } from '../SectionCard';
import { useLanguage } from '../../hooks/useLanguage';
import { StatusHistorySidebar } from '../ui/StatusHistorySidebar';

type ModalMode = 'create' | 'edit' | 'view';

interface InventoryCountFormModalProps {
  isOpen: boolean;
  mode: ModalMode;
  onClose: () => void;
  onSave: (
      count: Omit<InventoryCount, 'id' | 'ic_no' | 'created_at' | 'updated_at' | 'created_by' | 'handler' | 'lines' | 'history'>,
      lines: InventoryCountLine[],
      targetStatus: 'Draft' | 'New'
    ) => void;
  count: InventoryCount | null;
  warehouses: Warehouse[];
  warehouseMap: Map<string, string>;
  locations: Location[];
  modelGoods: ModelGoods[];
  onhand: OnhandByLocation[];
  onhandLots: Record<string, any[]>;
  onhandSerials: Record<string, any[]>;
}

const getInitialState = (): Omit<InventoryCount, 'id' | 'ic_no' | 'created_at' | 'updated_at' | 'created_by' | 'handler' | 'lines' | 'history'> & { selected_locations: string[], selected_models: string[] } => ({
    wh_code: '',
    status: 'Draft',
    count_type: 'Full',
    note: '',
    selected_locations: [],
    selected_models: [],
});

export const InventoryCountFormModal: React.FC<InventoryCountFormModalProps> = ({
  isOpen, mode, onClose, onSave, count, warehouses, warehouseMap, locations, modelGoods, onhand, onhandLots, onhandSerials
}) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState(getInitialState());
  const [localLines, setLocalLines] = useState<InventoryCountLine[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [viewLineDetail, setViewLineDetail] = useState<InventoryCountLine | null>(null);
  const [systemDetailLine, setSystemDetailLine] = useState<InventoryCountLine | null>(null);
  
  const isEditable = mode === 'create' || (mode === 'edit' && count?.status === 'Draft');
  const isViewMode = mode === 'view' || (mode === 'edit' && count?.status !== 'Draft');


  useEffect(() => {
    if (count) {
      setFormData({
        wh_code: count.wh_code,
        status: count.status,
        count_type: count.count_type,
        note: count.note || '',
        selected_locations: [], // This is transient, not stored
        selected_models: [], // This is transient
      });
      setLocalLines(count.lines || []);
    } else {
      setFormData(getInitialState());
      setLocalLines([]);
    }
    setErrors({});
  }, [count, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    if(name === 'wh_code' || name === 'count_type') {
        newFormData.selected_locations = [];
        newFormData.selected_models = [];
        setLocalLines([]); // Clear lines when scope changes
    }
    setFormData(newFormData);
  };

  const handleGeneratePlan = () => {
    if (!formData.wh_code) {
        alert("Please select a warehouse first.");
        return;
    }

    if (localLines.length > 0) {
        if (!window.confirm("This will overwrite the current count plan. Are you sure?")) {
            return;
        }
    }

    let itemsToSync: OnhandByLocation[] = [];

    switch (formData.count_type) {
        case 'By Location':
            if (formData.selected_locations.length === 0) {
                alert("Please select at least one location for 'By Location' count type.");
                return;
            }
            itemsToSync = onhand.filter(item => 
                item.wh_code === formData.wh_code &&
                formData.selected_locations.includes(item.loc_code)
            );
            break;
        case 'By Item':
             if (formData.selected_models.length === 0) {
                alert("Please select at least one item for 'By Item' count type.");
                return;
            }
             itemsToSync = onhand.filter(item => 
                item.wh_code === formData.wh_code &&
                formData.selected_models.includes(item.model_code)
            );
            break;
        case 'Full':
        default:
             itemsToSync = onhand.filter(item => item.wh_code === formData.wh_code);
            break;
    }
    
    const newLines: InventoryCountLine[] = itemsToSync.map(item => ({
        id: `synced-${item.id}`,
        ic_id: count?.ic_no || 'NEW',
        model_code: item.model_code,
        model_name: item.model_name,
        uom: item.base_uom,
        tracking_type: item.tracking_type,
        location_code: item.loc_code,
        system_qty: 0, // Snapshot on save
        counted_qty: null,
        variance: 0,
        is_recounted: false,
    }));
    setLocalLines(newLines);
  };

  const handleAddLine = () => {
    const newLine: InventoryCountLine = {
      id: `new-${Date.now()}`, ic_id: count?.ic_no || 'NEW', model_code: '', model_name: '', uom: '',
      tracking_type: 'None', location_code: '', system_qty: 0, counted_qty: null, variance: 0, is_recounted: false
    };
    setLocalLines([...localLines, newLine]);
  };

  const handleRemoveLine = (index: number) => {
    setLocalLines(localLines.filter((_, i) => i !== index));
  };

  const handleSubmit = (targetStatus: 'Draft' | 'New') => {
    if (!formData.wh_code) {
        setErrors({ wh_code: 'Warehouse is required.' });
        return;
    }
    if (localLines.length === 0) {
        alert("At least one line item is required for the count plan.");
        return;
    }
    const { selected_locations, selected_models, ...restOfFormData } = formData;
    onSave(restOfFormData, localLines, targetStatus);
  };
  
  const availableLocations = useMemo(() => 
      locations.filter(l => l.wh_code === formData.wh_code && l.status === 'Active').map(l => l.loc_code), 
  [locations, formData.wh_code]);

  const availableModels = useMemo(() => {
      const modelsInWh = new Set(onhand.filter(o => o.wh_code === formData.wh_code).map(o => o.model_code));
      return modelGoods.filter(m => modelsInWh.has(m.model_code)).map(m => m.model_code);
  }, [onhand, modelGoods, formData.wh_code]);
  
  const lineColumns: Column<InventoryCountLine>[] = useMemo(() => {
    const baseCols: Column<InventoryCountLine>[] = [
      { key: 'model_code', header: 'Model Goods' },
      { key: 'model_name', header: 'Model Name' },
      { key: 'tracking_type', header: 'Tracking', render: l => <StatusBadge status={l.tracking_type} /> },
      { key: 'uom', header: 'Unit' },
      { key: 'location_code', header: 'Location' },
      {
        key: 'system_qty',
        header: 'System Qty',
        align: 'right',
        render: (line) => isEditable ?
            <span className="text-gray-400 italic text-left block w-full">Snapshot on save</span> :
            line.system_qty.toLocaleString()
      },
    ];
    if (count && count.status !== 'Draft' && count.status !== 'New') {
        baseCols.push(
            { key: 'counted_qty', header: 'Counted Qty', align: 'right', render: l => l.counted_qty ?? '—' },
            { key: 'variance', header: 'Variance', align: 'right', render: l => <span className={l.variance > 0 ? 'text-green-600' : l.variance < 0 ? 'text-red-600' : ''}>{l.variance}</span> },
            { key: 'actions', header: '', render: l => <button onClick={() => setViewLineDetail(l)} className="text-sm text-brand-primary hover:underline">View Details</button> }
        );
    } else if (isEditable) {
         baseCols.push({ 
             key: 'actions', 
             header: 'Actions',
             align: 'center',
             render: (line, i) => (
                <div className="flex items-center justify-center gap-2">
                    <button 
                        title="View System Details"
                        onClick={() => setSystemDetailLine(line)}
                        disabled={line.tracking_type === 'None' || !line.model_code || !line.location_code}
                        className="p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Icon name="Eye" className="w-4 h-4 text-gray-500 hover:text-blue-500" />
                    </button>
                    <button 
                        title="Remove Line"
                        onClick={() => handleRemoveLine(i!)}
                        className="p-1"
                    >
                        <Icon name="Trash2" className="w-4 h-4 text-gray-500 hover:text-red-500" />
                    </button>
                </div>
            ) 
        });
    }
    return baseCols;
  }, [count, isEditable, localLines]);
  
  const title = mode === 'create' ? 'Create Inventory Count' : `Inventory Count: ${count?.ic_no}`;

  const detailsForModal = useMemo(() => {
    if (!systemDetailLine) return undefined;
    const key = `${systemDetailLine.model_code}-${systemDetailLine.location_code}`;
    return systemDetailLine.tracking_type === 'Serial' ? onhandSerials[key] : onhandLots[key];
  }, [systemDetailLine, onhandLots, onhandSerials]);
  
  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        size="fullscreen"
        footer={
          <>
            <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700">Cancel</button>
            {isEditable && <button onClick={() => handleSubmit('Draft')} className="px-4 py-2 rounded-md bg-gray-600 text-white">Save as Draft</button>}
            {isEditable && <button onClick={() => handleSubmit('New')} className="px-4 py-2 rounded-md bg-brand-primary text-white">Create</button>}
            {count?.status === 'Submitted' && <button className="px-4 py-2 rounded-md bg-green-600 text-white">Approve</button>}
          </>
        }
      >
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className="flex-grow lg:w-2/3 space-y-6">
                 <SectionCard title={t('form.section.information')} icon="ClipboardList">
                    {count && (
                        <div className="p-3 mb-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg grid grid-cols-4 gap-4 text-sm">
                           <div><span className="font-medium text-gray-500">Status: </span><StatusBadge status={count.status} /></div>
                           <div><span className="text-gray-500">Created by: </span><span className="font-semibold">{count.created_by}</span></div>
                           <div><span className="text-gray-500">Created at: </span><span className="font-semibold">{new Date(count.created_at).toLocaleDateString()}</span></div>
                           <div><span className="text-gray-500">Handler: </span><span className="font-semibold">{count.handler || '—'}</span></div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <FormField label="Warehouse" required error={errors.wh_code}><select name="wh_code" value={formData.wh_code} onChange={handleChange} className="w-full" disabled={!isEditable}><option value="">Select...</option>{warehouses.map(w => <option key={w.id} value={w.wh_code}>{w.wh_name}</option>)}</select></FormField>
                        <FormField label="Count Type" required><select name="count_type" value={formData.count_type} onChange={handleChange} className="w-full" disabled={!isEditable}><option value="Full">Full Warehouse</option><option value="By Location">By Location</option><option value="By Item">By Item</option></select></FormField>
                        
                        {formData.count_type === 'By Location' && <FormField label="Locations"><MultiSelectDropdown options={availableLocations} selectedOptions={formData.selected_locations} onChange={(s) => setFormData(p => ({...p, selected_locations: s}))} placeholder="Select locations..." disabled={!isEditable || !formData.wh_code} /></FormField>}
                        {formData.count_type === 'By Item' && <FormField label="Model Goods"><MultiSelectDropdown options={availableModels} selectedOptions={formData.selected_models} onChange={(s) => setFormData(p => ({...p, selected_models: s}))} placeholder="Select items..." disabled={!isEditable || !formData.wh_code} /></FormField>}

                        <div className="lg:col-span-3"><FormField label="Note"><textarea name="note" value={formData.note || ''} onChange={handleChange} className="w-full" rows={2} disabled={!isEditable}></textarea></FormField></div>
                    </div>
                </SectionCard>
                
                <SectionCard 
                    title={t('form.section.countPlan')}
                    icon="List"
                    actions={
                        <div className="flex gap-2">
                            {isEditable && <button onClick={handleGeneratePlan} disabled={!formData.wh_code} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50"><Icon name="RefreshCw" className="w-4 h-4"/> Generate Plan</button>}
                            {isEditable && <button onClick={handleAddLine} disabled={!formData.wh_code} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50"><Icon name="Plus" className="w-4 h-4"/> Add Manual Line</button>}
                        </div>
                    }
                >
                    <Table<InventoryCountLine> columns={lineColumns} data={localLines} />
                     {localLines.length === 0 && <p className="text-center text-gray-500 py-8">Generate a plan or add items manually to begin.</p>}
                </SectionCard>
            </div>

            {isViewMode && count && (
                <div className="w-full lg:w-1/3 flex-shrink-0 space-y-6">
                    <StatusHistorySidebar history={count.history} />
                    <SectionCard title={t('form.section.warehouseInfo')} icon="Warehouse">
                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="font-semibold text-gray-600 dark:text-gray-300">Warehouse</p>
                                <p>{warehouseMap.get(formData.wh_code) || formData.wh_code}</p>
                            </div>
                        </div>
                    </SectionCard>
                </div>
            )}
        </div>
      </Modal>

      <ViewCountDetailModal 
        isOpen={!!viewLineDetail}
        onClose={() => setViewLineDetail(null)}
        line={viewLineDetail}
        onhandLots={onhandLots}
      />
      <SystemDetailViewModal 
        isOpen={!!systemDetailLine}
        onClose={() => setSystemDetailLine(null)}
        line={systemDetailLine}
        details={detailsForModal}
      />
    </>
  );
};
