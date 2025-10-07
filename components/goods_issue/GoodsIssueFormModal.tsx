
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { GoodsIssue, Partner, Warehouse, ModelGoods, GoodsIssueLine, OnhandByLocation, Location, TrackingType } from '../../types';
import { FormField } from '../ui/FormField';
import { Icon } from '../Icons';
import { Table, Column } from '../ui/Table';
import { StatusBadge } from '../ui/StatusBadge';
import { AddCodeModal } from './AddCodeModal';
import { ViewCodeModal } from './ViewCodeModal';
import { ConfirmationModal } from '../ui/ConfirmationModal';

type ModalMode = 'create' | 'edit' | 'view';

interface GoodsIssueFormModalProps {
  isOpen: boolean;
  mode: ModalMode;
  onClose: () => void;
  onSave: (issue: any, lines: any, status: any) => void;
  issue: GoodsIssue | null;
  partners: Partner[];
  warehouses: Warehouse[];
  modelGoods: ModelGoods[];
  locations: Location[];
  onhand: OnhandByLocation[];
  onhandLotsByLocation: Record<string, any[]>;
  onhandSerialsByLocation: Record<string, string[]>;
}

const getInitialState = (): Omit<GoodsIssue, 'id' | 'gi_no' | 'created_at' | 'updated_at' | 'created_by' | 'handler' | 'lines' | 'history'> => ({
    issue_type: 'Sales Order',
    issue_mode: 'Summary',
    status: 'Draft',
    ref_no: '',
    partner_code: '',
    source_wh_code: '',
    dest_wh_code: '',
    expected_date: '',
    note: '',
});

const calculateQtyFromDetails = (details: any[] | undefined, trackingType: TrackingType): number => {
    if (!details) return 0;
    switch (trackingType) {
        case 'Serial':
            return details.length;
        case 'Lot':
        case 'None':
            return details.reduce((sum, item) => sum + (item.qty || 0), 0);
        default:
            return 0;
    }
};

export const GoodsIssueFormModal: React.FC<GoodsIssueFormModalProps> = ({
    isOpen, mode, onClose, issue, partners, warehouses, modelGoods, locations, onhand, onhandLotsByLocation, onhandSerialsByLocation, onSave
}) => {
  const [formData, setFormData] = useState(getInitialState());
  const [localLines, setLocalLines] = useState<GoodsIssueLine[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [viewCodeLine, setViewCodeLine] = useState<GoodsIssueLine | null>(null);
  const [addCodeState, setAddCodeState] = useState<{ isOpen: boolean, lineIndex: number | null }>({ isOpen: false, lineIndex: null });
  const [confirmation, setConfirmation] = useState<{ isOpen: boolean; onConfirm: () => void; message: string; } | null>(null);
  
  const isEditable = mode === 'create' || (mode === 'edit' && issue?.status === 'Draft');

  const onhandByLocationForSelectedWH = useMemo(() => {
    if (!formData.source_wh_code) return [];
    return onhand.filter(o => o.wh_code === formData.source_wh_code);
  }, [onhand, formData.source_wh_code]);

  useEffect(() => {
    if (issue) {
      setFormData({
        issue_type: issue.issue_type,
        issue_mode: issue.issue_mode,
        status: issue.status,
        ref_no: issue.ref_no || '',
        partner_code: issue.partner_code || '',
        source_wh_code: issue.source_wh_code,
        dest_wh_code: issue.dest_wh_code || '',
        expected_date: issue.expected_date ? new Date(issue.expected_date).toISOString().split('T')[0] : '',
        note: issue.note || '',
      });
      setLocalLines(issue.lines || []);
    } else {
      setFormData(getInitialState());
      setLocalLines([]);
    }
    setErrors({});
  }, [issue, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    if (name === 'issue_type') {
        newFormData.partner_code = '';
        newFormData.dest_wh_code = '';
    }
    if (name === 'source_wh_code') {
        setLocalLines([]); // Clear lines when source warehouse changes
    }
    setFormData(newFormData);
  };
  
  const handleIssueModeChange = (newMode: 'Summary' | 'Detail') => {
    if (formData.issue_mode === newMode) return;

    const switchMode = () => {
        setFormData(prev => ({ ...prev, issue_mode: newMode }));
        setLocalLines([]); // Clear lines on mode change
        setConfirmation(null);
    };

    if (localLines.length > 0) {
        setConfirmation({
            isOpen: true,
            onConfirm: switchMode,
            message: "Changing the issue mode will clear all line items. Are you sure you want to continue?",
        });
    } else {
        switchMode();
    }
  };

  const handleAddLine = () => {
      const newLine: GoodsIssueLine = {
          id: `new-${Date.now()}`,
          gi_id: issue?.gi_no || 'NEW',
          model_code: '',
          model_name: 'Select an item...',
          uom: '',
          tracking_type: 'None',
          qty_planned: 1,
          location_code: '',
          onhand: 0,
      };
      setLocalLines([...localLines, newLine]);
  };
  
  const handleLineChange = (index: number, field: keyof GoodsIssueLine, value: any) => {
    const updatedLines = [...localLines];
    const line = { ...updatedLines[index], [field]: value };

    const resetDependentFields = (l: GoodsIssueLine) => {
      l.location_code = '';
      l.onhand = 0;
      l.qty_planned = 1;
      l.details = [];
    };

    if (field === 'model_code' && value) {
        const selectedModel = modelGoods.find(m => m.model_code === value);
        if (selectedModel) {
            line.model_name = selectedModel.model_name;
            line.uom = selectedModel.base_uom;
            line.tracking_type = selectedModel.tracking_type;
            resetDependentFields(line);
        }
    }
    
    if (field === 'location_code' && value) {
        const onhandItem = onhandByLocationForSelectedWH.find(o => o.model_code === line.model_code && o.loc_code === value);
        line.onhand = onhandItem?.available_qty || 0;
    }

    updatedLines[index] = line;
    setLocalLines(updatedLines);
  };
  
  const handleRemoveLine = (index: number) => {
      setLocalLines(localLines.filter((_, i) => i !== index));
  };

  const handleOpenAddCode = (lineIndex: number) => {
    setAddCodeState({ isOpen: true, lineIndex });
  };
  
  const handleSaveCodes = (details: any[]) => {
      if (addCodeState.lineIndex === null) return;
      const updatedLines = [...localLines];
      const line = updatedLines[addCodeState.lineIndex];
      line.details = details;
      line.qty_planned = calculateQtyFromDetails(details, line.tracking_type);
      setLocalLines(updatedLines);
      setAddCodeState({ isOpen: false, lineIndex: null });
  };
  
  const handleSubmit = (status: 'Draft' | 'New') => {
      // Validation logic here
      onSave(formData, localLines, status);
  }

  const title = mode === 'create' ? 'Create Goods Issue' : `View Goods Issue: ${issue?.gi_no}`;
  const activePartners = partners.filter(p => p.status === 'Active');
  const activeWarehouses = warehouses.filter(w => w.status === 'Active');
  
  const locationsForWarehouse = useMemo(() => 
    locations.filter(l => l.wh_code === formData.source_wh_code && l.status === 'Active'), 
    [locations, formData.source_wh_code]
  );
  
  const modelGoodsWithOnhand = useMemo(() => {
      const modelsInWh = new Set(onhandByLocationForSelectedWH.map(o => o.model_code));
      return modelGoods.filter(m => m.status === 'Active' && modelsInWh.has(m.model_code));
  }, [modelGoods, onhandByLocationForSelectedWH]);

  const lineColumns: Column<GoodsIssueLine>[] = useMemo(() => {
    const columns: Column<GoodsIssueLine>[] = [
      { key: 'model_code', header: 'MODEL GOODS', render: (line, index) => isEditable ? (
          <select value={line.model_code} onChange={(e) => handleLineChange(index!, 'model_code', e.target.value)} className="w-full p-1 border rounded bg-white dark:bg-gray-700">
              <option value="">Select Item</option>
              {modelGoodsWithOnhand.map(m => <option key={m.id} value={m.model_code}>{m.model_name}</option>)}
          </select>
      ) : line.model_name },
      { key: 'tracking_type', header: 'TRACKING', render: (line) => <StatusBadge status={line.tracking_type} /> },
      { key: 'location_code', header: 'LOCATION', render: (line, index) => {
          const onhandForModel = onhandByLocationForSelectedWH.filter(o => o.model_code === line.model_code);
          return isEditable ? (
              <select value={line.location_code} onChange={(e) => handleLineChange(index!, 'location_code', e.target.value)} className="w-full p-1 border rounded bg-white dark:bg-gray-700" disabled={!line.model_code}>
                  <option value="">Select Location</option>
                  {onhandForModel.map(o => <option key={o.loc_code} value={o.loc_code}>{o.loc_code} (Avail: {o.available_qty})</option>)}
              </select>
          ) : line.location_code;
      }},
      { key: 'qty_planned', header: 'QTY PLANNED', align: 'right', render: (line, index) => {
          if (formData.issue_mode === 'Detail') {
              return (
                  <div className="flex items-center justify-end gap-2">
                      <span className="font-semibold">{line.qty_planned || 0}</span>
                      {isEditable && (
                          <button 
                            onClick={() => handleOpenAddCode(index!)}
                            disabled={!line.location_code}
                            className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400"
                          >
                            {line.tracking_type === 'None' ? 'Set Qty' : 'Add/Edit Codes'}
                          </button>
                      )}
                  </div>
              );
          }
          return isEditable ? (
              <input type="number" value={line.qty_planned} onChange={e => {
                  const val = parseInt(e.target.value) || 0;
                  if (val <= line.onhand) {
                     handleLineChange(index!, 'qty_planned', val)
                  }
              }} className="w-24 p-1 text-right border rounded bg-white dark:bg-gray-700" max={line.onhand} />
          ) : line.qty_planned;
      }},
      { key: 'actions', header: 'ACTION', align: 'center', render: (line, index) => isEditable ? (
          <button onClick={() => handleRemoveLine(index!)} className="p-1 text-gray-500 hover:text-brand-danger"><Icon name="Trash2" className="w-4 h-4" /></button>
      ) : (
          <button onClick={() => setViewCodeLine(line)} disabled={line.tracking_type === 'None' && !line.qty_picked} className="text-sm text-brand-primary hover:underline disabled:text-gray-400">View Code</button>
      )},
    ];
    return columns.filter(Boolean) as Column<GoodsIssueLine>[];
  }, [formData.issue_mode, isEditable, localLines, modelGoodsWithOnhand, onhandByLocationForSelectedWH]);


  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={title} size="fullscreen" footer={
          isEditable ? <>
              <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-600">Cancel</button>
              <button onClick={() => handleSubmit('Draft')} className="px-4 py-2 rounded-md bg-gray-600 text-white">Lưu</button>
              <button onClick={() => handleSubmit('New')} className="px-4 py-2 rounded-md bg-brand-primary text-white">Tạo</button>
          </> : <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-600">Close</button>
      }>
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField label="Issue Type" required><select name="issue_type" value={formData.issue_type} onChange={handleChange} className="w-full" disabled={!isEditable}>{['Sales Order', 'Transfer', 'Return to Supplier', 'Manual'].map(t=><option key={t} value={t}>{t}</option>)}</select></FormField>
                <FormField label="Source Warehouse" required><select name="source_wh_code" value={formData.source_wh_code} onChange={handleChange} className="w-full" disabled={!isEditable}><option value="">Select...</option>{activeWarehouses.map(w=><option key={w.id} value={w.wh_code}>{w.wh_name}</option>)}</select></FormField>
                <FormField label="Reference No"><input type="text" name="ref_no" value={formData.ref_no} onChange={handleChange} className="w-full" disabled={!isEditable} /></FormField>
                <FormField label="Expected date"><input type="date" name="expected_date" value={formData.expected_date || ''} onChange={handleChange} className="w-full" disabled={!isEditable} /></FormField>
                
                {formData.issue_type === 'Transfer' && <FormField label="Destination Warehouse" required><select name="dest_wh_code" value={formData.dest_wh_code} onChange={handleChange} className="w-full" disabled={!isEditable}><option value="">Select...</option>{activeWarehouses.filter(w=>w.wh_code !== formData.source_wh_code).map(w=><option key={w.id} value={w.wh_code}>{w.wh_name}</option>)}</select></FormField>}
                {(formData.issue_type === 'Sales Order' || formData.issue_type === 'Return to Supplier') && <FormField label="Partner" required><select name="partner_code" value={formData.partner_code} onChange={handleChange} className="w-full" disabled={!isEditable}><option value="">Select...</option>{activePartners.map(p=><option key={p.id} value={p.partner_code}>{p.partner_name}</option>)}</select></FormField>}

                <div className="md:col-span-4"><FormField label="Note"><textarea name="note" value={formData.note} onChange={handleChange} className="w-full" rows={2} disabled={!isEditable}></textarea></FormField></div>
            </div>
            
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-4">
                       <h3 className="text-lg font-semibold">Issue Plan</h3>
                       {isEditable && (
                           <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md p-0.5">
                               <button onClick={() => handleIssueModeChange('Summary')} className={`px-3 py-1 text-sm rounded ${formData.issue_mode === 'Summary' ? 'bg-brand-primary text-white' : 'text-gray-600 dark:text-gray-300'}`}>Summary</button>
                               <button onClick={() => handleIssueModeChange('Detail')} className={`px-3 py-1 text-sm rounded ${formData.issue_mode === 'Detail' ? 'bg-brand-primary text-white' : 'text-gray-600 dark:text-gray-300'}`}>Detail</button>
                           </div>
                       )}
                    </div>
                    {isEditable && <button onClick={handleAddLine} disabled={!formData.source_wh_code} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-blue-700 disabled:bg-gray-400"><Icon name="Plus" className="w-4 h-4"/> Add Line</button>}
                </div>
                <Table<GoodsIssueLine> columns={lineColumns} data={localLines} />
            </div>
        </div>
      </Modal>

      {addCodeState.isOpen && addCodeState.lineIndex !== null && (
        <AddCodeModal 
            isOpen={addCodeState.isOpen}
            onClose={() => setAddCodeState({ isOpen: false, lineIndex: null })}
            onSave={handleSaveCodes}
            line={localLines[addCodeState.lineIndex]}
            onhandLots={onhandLotsByLocation}
            onhandSerials={onhandSerialsByLocation}
        />
      )}

       {viewCodeLine && (
        <ViewCodeModal 
            isOpen={!!viewCodeLine}
            onClose={() => setViewCodeLine(null)}
            line={viewCodeLine}
        />
      )}
      
      {confirmation && (
        <ConfirmationModal
            isOpen={confirmation.isOpen}
            onClose={() => setConfirmation(null)}
            onConfirm={confirmation.onConfirm}
            title="Confirm Mode Change"
            message={confirmation.message}
        />
      )}
    </>
  );
};
