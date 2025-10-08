import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { GoodsIssue, Partner, Warehouse, GoodsIssueLine, StatusHistoryEvent, ModelGoods, OnhandByLocation, GoodsIssueSerialDetail, GoodsIssueLotDetail, GoodsIssueNoneDetail } from '../../types';
import { FormField } from '../ui/FormField';
import { StatusBadge } from '../ui/StatusBadge';
import { Icon } from '../Icons';
import { Table, Column } from '../ui/Table';
import { AddCodeModal } from './AddCodeModal';
import { ViewCodeModal } from './ViewCodeModal';
import { ConfirmationModal } from '../ui/ConfirmationModal';

type ModalMode = 'create' | 'edit' | 'view';

interface GoodsIssueFormModalProps {
  isOpen: boolean;
  mode: ModalMode;
  onClose: () => void;
  onSave: (
      issue: Omit<GoodsIssue, 'id' | 'gi_no' | 'created_at' | 'updated_at' | 'created_by' | 'handler' | 'lines' | 'history'>,
      lines: GoodsIssueLine[],
      targetStatus: 'Draft' | 'New'
    ) => void;
  onSwitchToEdit: () => void;
  onApprove: (giNo: string) => void;
  onCancel: (giNo: string) => void;
  issue: GoodsIssue | null;
  partners: Partner[];
  warehouses: Warehouse[];
  modelGoods: ModelGoods[];
  onhand: OnhandByLocation[];
  onhandLots: Record<string, any[]>;
  onhandSerials: Record<string, any[]>;
}

const getInitialState = (): Omit<GoodsIssue, 'id' | 'gi_no' | 'created_at' | 'updated_at' | 'created_by' | 'handler' | 'lines' | 'history'> => ({
    issue_type: 'Sales Order',
    issue_mode: 'Summary',
    status: 'Draft',
    ref_no: '',
    partner_code: '',
    dest_wh_code: '',
    source_wh_code: '',
    expected_date: '',
    note: '',
});

const StatusHistorySidebar: React.FC<{ history: StatusHistoryEvent[] }> = ({ history }) => (
    <div className="w-full lg:w-1/3 lg:pl-6 lg:border-l lg:border-gray-200 dark:lg:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Icon name="History" className="w-5 h-5" />
            Status History
        </h3>
        <ol className="relative border-l border-gray-200 dark:border-gray-700">
            {history.slice().reverse().map(event => (
                 <li key={event.id} className="mb-6 ml-6">
                    <span className="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -left-3 ring-8 ring-white dark:ring-gray-900 dark:bg-blue-900">
                        <Icon name="CheckCircle" className="w-3 h-3 text-blue-800 dark:text-blue-300"/>
                    </span>
                    <h4 className="flex items-center mb-1 text-base font-semibold text-gray-900 dark:text-white">
                        {event.status}
                    </h4>
                    <time className="block mb-2 text-xs font-normal leading-none text-gray-400 dark:text-gray-500">
                        on {new Date(event.timestamp).toLocaleString()} by {event.user}
                    </time>
                    {event.note && <p className="text-sm font-normal text-gray-500 dark:text-gray-400">{event.note}</p>}
                </li>
            ))}
        </ol>
    </div>
);

export const GoodsIssueFormModal: React.FC<GoodsIssueFormModalProps> = ({
  isOpen, mode, onClose, onSave, onSwitchToEdit, onApprove, onCancel, issue, partners, warehouses, modelGoods, onhand, onhandLots, onhandSerials
}) => {
  const [formData, setFormData] = useState(getInitialState());
  const [localLines, setLocalLines] = useState<GoodsIssueLine[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [detailModalState, setDetailModalState] = useState<{ type: 'add' | 'view' | null, lineIndex: number | null }>({ type: null, lineIndex: null });
  const [showModeChangeConfirm, setShowModeChangeConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  const isEditable = mode === 'create' || (mode === 'edit' && issue?.status === 'Draft');
  const isViewMode = mode === 'view';

  const onhandForWarehouse = useMemo(() => {
    if (!formData.source_wh_code) return [];
    return onhand.filter(o => o.wh_code === formData.source_wh_code && o.available_qty > 0);
  }, [onhand, formData.source_wh_code]);


  useEffect(() => {
    if (isOpen) {
        if (issue) {
            const issueFormData = {
                issue_type: issue.issue_type,
                issue_mode: issue.issue_mode,
                status: issue.status,
                ref_no: issue.ref_no || '',
                partner_code: issue.partner_code || '',
                dest_wh_code: issue.dest_wh_code || '',
                source_wh_code: issue.source_wh_code,
                expected_date: issue.expected_date ? new Date(issue.expected_date).toISOString().split('T')[0] : '',
                note: issue.note || '',
            };
            setFormData(issueFormData);
            setLocalLines(issue.lines || []);
        } else {
            setFormData(getInitialState());
            setLocalLines([]);
        }
        setErrors({});
    }
  }, [issue, isOpen]);
  
  const handleSourceWarehouseChange = (wh_code: string) => {
      setFormData(prev => ({ ...prev, source_wh_code: wh_code }));
      setLocalLines([]); // Clear lines when warehouse changes
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    if (name === 'issue_type') {
      newFormData.partner_code = '';
      newFormData.dest_wh_code = '';
    }
    setFormData(newFormData);
  };

  const handleModeChange = (newMode: 'Summary' | 'Detail') => {
    if (localLines.length > 0) {
      setShowModeChangeConfirm(true);
    } else {
      setFormData(prev => ({ ...prev, issue_mode: newMode }));
    }
  };
  
  const confirmModeChange = () => {
    const newMode = formData.issue_mode === 'Summary' ? 'Detail' : 'Summary';
    setFormData(prev => ({ ...prev, issue_mode: newMode }));
    setLocalLines([]); // Clear lines on mode change
    setShowModeChangeConfirm(false);
  };

  const handleAddLine = () => {
    const newLine: GoodsIssueLine = {
      id: `new-${Date.now()}`, gi_id: issue?.gi_no || 'NEW', model_code: '', model_name: '',
      uom: '', tracking_type: 'None', qty_planned: 1, qty_picked: 0, location_code: '', onhand: 0, details: []
    };
    setLocalLines([...localLines, newLine]);
  };

  const handleLineChange = (index: number, field: keyof GoodsIssueLine, value: any) => {
    const updatedLines = [...localLines];
    const line = { ...updatedLines[index], [field]: value };

    if (field === 'model_code' && value) {
      const selectedModel = modelGoods.find(m => m.model_code === value);
      if (selectedModel) {
        line.model_name = selectedModel.model_name;
        line.uom = selectedModel.base_uom;
        line.tracking_type = selectedModel.tracking_type;
        line.onhand = onhandForWarehouse.filter(o => o.model_code === value).reduce((sum, o) => sum + o.available_qty, 0);
        line.location_code = ''; // Reset location
      }
    }
    updatedLines[index] = line;
    setLocalLines(updatedLines);
  };

  const handleRemoveLine = (index: number) => {
    setLocalLines(localLines.filter((_, i) => i !== index));
  };
  
  const handleSaveDetails = (details: (GoodsIssueSerialDetail | GoodsIssueLotDetail | GoodsIssueNoneDetail)[], location: string) => {
    if (detailModalState.lineIndex != null) {
      const index = detailModalState.lineIndex;
      const updatedLines = [...localLines];
      const qtyPicked = details.reduce((sum, d) => sum + ('qty' in d ? d.qty : 1), 0);
      updatedLines[index] = { ...updatedLines[index], details, location_code: location, qty_picked: qtyPicked };
      setLocalLines(updatedLines);
    }
    setDetailModalState({ type: null, lineIndex: null });
  };
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.source_wh_code) newErrors.source_wh_code = "Source Warehouse is required.";
    if (formData.issue_type === 'Transfer' && !formData.dest_wh_code) newErrors.dest_wh_code = "Destination Warehouse is required.";
    if ((formData.issue_type === 'Sales Order' || formData.issue_type === 'Return to Supplier') && !formData.partner_code) newErrors.partner_code = "Partner is required.";

    if (localLines.length === 0) {
      alert("At least one line item is required.");
      return false;
    }
    
    for (const line of localLines) {
        if (formData.issue_mode === 'Summary') {
            const onhandAtLocation = onhandForWarehouse.find(o => o.model_code === line.model_code && o.loc_code === line.location_code)?.available_qty || 0;
            if (line.qty_planned > onhandAtLocation) {
                 alert(`Qty Planned for ${line.model_code} at ${line.location_code} exceeds onhand quantity (${onhandAtLocation}).`);
                 return false;
            }
        } else {
             if (line.qty_planned > line.onhand) {
                alert(`Qty Planned for ${line.model_code} exceeds total onhand quantity (${line.onhand}).`);
                return false;
            }
        }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (targetStatus: 'Draft' | 'New') => {
    if (!validate()) return;
    onSave(formData, localLines, targetStatus);
  };
  
  const availableModelsForDropdown = useMemo(() => {
      const modelsWithStock = new Set(onhandForWarehouse.map(o => o.model_code));
      return modelGoods.filter(m => modelsWithStock.has(m.model_code));
  }, [onhandForWarehouse, modelGoods]);

  const lineColumns: Column<GoodsIssueLine>[] = useMemo(() => {
    const baseColumns: Column<GoodsIssueLine>[] = [
      { key: 'model_code', header: 'Model Goods', render: (line, index) => isEditable ? (
          <select value={line.model_code} onChange={(e) => handleLineChange(index!, 'model_code', e.target.value)} className="w-full p-1 border rounded bg-white dark:bg-gray-700 disabled:bg-gray-100 dark:disabled:bg-gray-800">
              <option value="">Select Item</option>
              {availableModelsForDropdown.map(m => <option key={m.id} value={m.model_code}>{`${m.model_name} (${m.model_code})`}</option>)}
          </select>
      ) : `${line.model_name} (${line.model_code})` },
      { key: 'tracking_type', header: 'Tracking', render: l => <StatusBadge status={l.tracking_type} /> },
      { key: 'onhand', header: 'Onhand', align: 'right', render: l => l.onhand.toLocaleString() },
    ];
    
    if (formData.issue_mode === 'Summary') {
        return [
            ...baseColumns,
            { key: 'location_code', header: 'Location', render: (line, index) => {
                const locationsForModel = onhandForWarehouse.filter(o => o.model_code === line.model_code);
                return isEditable ? (
                    <select value={line.location_code} onChange={e => handleLineChange(index!, 'location_code', e.target.value)} className="w-full p-1 border rounded bg-white dark:bg-gray-700" disabled={!line.model_code}>
                        <option value="">Select Location</option>
                        {locationsForModel.map(loc => <option key={loc.loc_code} value={loc.loc_code}>{loc.loc_code} (Avail: {loc.available_qty})</option>)}
                    </select>
                ) : line.location_code;
            }},
            { key: 'qty_planned', header: 'Qty Planned', align: 'right', render: (line, index) => {
                const onhandAtLocation = onhandForWarehouse.find(o => o.model_code === line.model_code && o.loc_code === line.location_code)?.available_qty || 0;
                return isEditable ? <input type="number" value={line.qty_planned} onChange={e => handleLineChange(index!, 'qty_planned', parseInt(e.target.value) || 0)} className="w-24 p-1 text-right border rounded bg-white dark:bg-gray-700" min="1" max={onhandAtLocation} /> : line.qty_planned;
            }},
            { key: 'actions', header: '', align: 'center', render: (_, index) => isEditable ? <button onClick={() => handleRemoveLine(index!)} className="p-1 text-gray-500 hover:text-brand-danger"><Icon name="Trash2" className="w-4 h-4" /></button> : null }
        ];
    }
    
    // Detail mode
    return [
        ...baseColumns,
        { key: 'qty_planned', header: 'Qty Planned', align: 'right', render: (line, index) => isEditable ? <input type="number" value={line.qty_planned} onChange={e => handleLineChange(index!, 'qty_planned', parseInt(e.target.value) || 0)} className="w-24 p-1 text-right border rounded bg-white dark:bg-gray-700" min="1" /> : line.qty_planned },
        { key: 'qty_picked', header: 'Qty Picked', align: 'right', render: l => l.qty_picked || 0 },
        { key: 'actions', header: 'Action', align: 'center', render: (line, index) => (
          <div className="flex items-center justify-center gap-2">
            {isEditable && <button onClick={() => handleRemoveLine(index!)} className="p-1 text-gray-500 hover:text-brand-danger"><Icon name="Trash2" className="w-4 h-4" /></button>}
            <button onClick={() => setDetailModalState({ type: isEditable ? 'add' : 'view', lineIndex: index! })} className="text-sm text-brand-primary hover:underline" disabled={!line.model_code && isEditable}>
              {isEditable ? 'Add/Edit Codes' : 'View Codes'}
            </button>
          </div>
        )}
    ];
  }, [isEditable, formData.issue_mode, modelGoods, localLines, onhandForWarehouse, availableModelsForDropdown]);

  const title = mode === 'create' ? 'Create Goods Issue' : `Goods Issue: ${issue?.gi_no}`;
  const activePartners = partners.filter(p => p.status === 'Active');
  const activeWarehouses = warehouses.filter(w => w.status === 'Active');
  const detailLine = detailModalState.lineIndex != null ? localLines[detailModalState.lineIndex] : null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        size="fullscreen"
        footer={
          <div className="flex justify-between w-full">
            <div>
              {isViewMode && issue && ['Draft', 'New', 'Picking', 'Submitted'].includes(issue.status) && (
                <button onClick={() => setShowCancelConfirm(true)} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700">Cancel Document</button>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">Cancel</button>
              {isViewMode && issue && ['Draft'].includes(issue.status) && <button onClick={onSwitchToEdit} className="px-4 py-2 rounded-md bg-yellow-500 text-white">Edit</button>}
              {isViewMode && issue && ['Submitted'].includes(issue.status) && <button onClick={() => onApprove(issue.gi_no)} className="px-4 py-2 rounded-md bg-green-600 text-white">Approve & Issue</button>}
              {isEditable && <button onClick={() => handleSubmit('Draft')} className="px-4 py-2 rounded-md bg-gray-600 text-white">Save as Draft</button>}
              {isEditable && <button onClick={() => handleSubmit('New')} className="px-4 py-2 rounded-md bg-brand-primary text-white">Create</button>}
            </div>
          </div>
        }
      >
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className="flex-grow lg:w-2/3">
                 {issue && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                           <div><span className="font-medium text-gray-500 dark:text-gray-400">Status: </span><StatusBadge status={issue.status} /></div>
                           <div><span className="text-gray-500 dark:text-gray-400">Created by: </span><span className="font-semibold">{issue.created_by}</span></div>
                           <div><span className="text-gray-500 dark:text-gray-400">Created at: </span><span className="font-semibold">{new Date(issue.created_at).toLocaleDateString()}</span></div>
                           <div><span className="text-gray-500 dark:text-gray-400">Handler: </span><span className="font-semibold">{issue.handler || '—'}</span></div>
                        </div>
                    )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField label="Issue Type" required><select name="issue_type" value={formData.issue_type} onChange={handleChange} className="w-full" disabled={!isEditable}>{['Sales Order', 'Transfer', 'Return to Supplier', 'Manual'].map(t => <option key={t} value={t}>{t}</option>)}</select></FormField>
                    <FormField label="Source Warehouse" required error={errors.source_wh_code}><select name="source_wh_code" value={formData.source_wh_code} onChange={e => handleSourceWarehouseChange(e.target.value)} className="w-full" disabled={!isEditable}><option value="">Select...</option>{activeWarehouses.map(w => <option key={w.id} value={w.wh_code}>{w.wh_name}</option>)}</select></FormField>
                    <FormField label="Ref No"><input type="text" name="ref_no" value={formData.ref_no || ''} onChange={handleChange} className="w-full" disabled={!isEditable} /></FormField>
                    
                    {formData.issue_type === 'Transfer' && <FormField label="Dest Warehouse" required error={errors.dest_wh_code}><select name="dest_wh_code" value={formData.dest_wh_code} onChange={handleChange} className="w-full" disabled={!isEditable}><option value="">Select...</option>{activeWarehouses.filter(w => w.wh_code !== formData.source_wh_code).map(w => <option key={w.id} value={w.wh_code}>{w.wh_name}</option>)}</select></FormField>}
                    {(formData.issue_type === 'Sales Order' || formData.issue_type === 'Return to Supplier') && <FormField label="Partner" required error={errors.partner_code}><select name="partner_code" value={formData.partner_code} onChange={handleChange} className="w-full" disabled={!isEditable}><option value="">Select...</option>{activePartners.map(p => <option key={p.id} value={p.partner_code}>{p.partner_name}</option>)}</select></FormField>}

                    <div className="md:col-span-3"><FormField label="Note"><textarea name="note" value={formData.note || ''} onChange={handleChange} className="w-full" rows={2} disabled={!isEditable}></textarea></FormField></div>
                </div>
                
                <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-4">
                            <h3 className="text-lg font-semibold">Issue Plan</h3>
                             {isEditable && (
                                <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md p-0.5">
                                    <button onClick={() => handleModeChange('Summary')} className={`px-3 py-1 text-xs font-medium rounded ${formData.issue_mode === 'Summary' ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>Summary</button>
                                    <button onClick={() => handleModeChange('Detail')} className={`px-3 py-1 text-xs font-medium rounded ${formData.issue_mode === 'Detail' ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>Detail</button>
                                </div>
                            )}
                        </div>
                        {isEditable && <button onClick={handleAddLine} disabled={!formData.source_wh_code} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-blue-700 disabled:bg-gray-400"><Icon name="Plus" className="w-4 h-4"/> Add Line</button>}
                    </div>
                    <Table<GoodsIssueLine> columns={lineColumns} data={localLines} />
                </div>
            </div>

            {!isEditable && issue?.history && <StatusHistorySidebar history={issue.history} />}
        </div>
      </Modal>
      
      {detailModalState.type === 'add' && detailLine && (
        <AddCodeModal
          isOpen={true}
          onClose={() => setDetailModalState({ type: null, lineIndex: null })}
          onSave={handleSaveDetails}
          line={detailLine}
          onhandForModelInWh={onhandForWarehouse.filter(o => o.model_code === detailLine?.model_code)}
          onhandLots={onhandLots}
          onhandSerials={onhandSerials}
        />
      )}
      
      {detailModalState.type === 'view' && (
        <ViewCodeModal
          isOpen={true}
          onClose={() => setDetailModalState({ type: null, lineIndex: null })}
          line={detailLine}
        />
      )}
      
      <ConfirmationModal
        isOpen={showModeChangeConfirm}
        onClose={() => setShowModeChangeConfirm(false)}
        onConfirm={confirmModeChange}
        title="Change Issue Mode?"
        message="Changing the issue mode will clear all current line items. Are you sure you want to continue?"
      />

       <ConfirmationModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={() => { if(issue) onCancel(issue.gi_no); setShowCancelConfirm(false); }}
        title="Confirm Cancellation"
        message="Are you sure you want to cancel this document? This action cannot be undone."
      />
    </>
  );
};