import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { GoodsReceipt, Partner, Warehouse, GoodsReceiptLine, StatusHistoryEvent, ModelGoods } from '../../types';
import { FormField } from '../ui/FormField';
import { StatusBadge } from '../ui/StatusBadge';
import { Icon } from '../Icons';
import { Table, Column } from '../ui/Table';
import { LineDetailModal } from './LineDetailModal';

type ModalMode = 'create' | 'edit' | 'view';

interface GoodsReceiptFormModalProps {
  isOpen: boolean;
  mode: ModalMode;
  onClose: () => void;
  onSave: (
      receipt: Omit<GoodsReceipt, 'id' | 'gr_no' | 'created_at' | 'updated_at' | 'created_by' | 'handler' | 'lines' | 'history'>,
      lines: GoodsReceiptLine[],
      targetStatus: 'Draft' | 'New'
    ) => void;
  onSwitchToEdit: () => void;
  onApprove: (grNo: string) => void;
  onReject: (grNo: string) => void;
  onCancel: (grNo: string) => void;
  receipt: GoodsReceipt | null;
  partners: Partner[];
  warehouses: Warehouse[];
  modelGoods: ModelGoods[];
}

const getInitialState = (): Omit<GoodsReceipt, 'id' | 'gr_no' | 'created_at' | 'updated_at' | 'created_by' | 'handler' | 'lines' | 'history'> => ({
    receipt_type: 'PO',
    status: 'Draft',
    ref_no: '',
    partner_code: '',
    source_wh_code: '',
    dest_wh_code: '',
    doc_date: '',
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
                    <span className="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -left-3 ring-4 ring-white dark:ring-gray-800 dark:bg-blue-900">
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


export const GoodsReceiptFormModal: React.FC<GoodsReceiptFormModalProps> = ({
    isOpen, mode, onClose, onSave, onSwitchToEdit, onApprove, onReject, onCancel, receipt, partners, warehouses, modelGoods
}) => {
  const [formData, setFormData] = useState(getInitialState());
  const [localLines, setLocalLines] = useState<GoodsReceiptLine[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lineDetail, setLineDetail] = useState<GoodsReceiptLine | null>(null);

  const isViewMode = mode === 'view';
  const isCreateMode = mode === 'create';
  const isEditable = mode === 'create' || (mode === 'edit' && receipt?.status === 'Draft');

  const canAddLines = useMemo(() => {
    if (!formData.dest_wh_code) return false;
    switch (formData.receipt_type) {
        case 'PO':
        case 'Return':
            return !!formData.partner_code;
        case 'Transfer':
            return !!formData.source_wh_code;
        case 'Other':
            return true;
        default:
            return false;
    }
  }, [formData.receipt_type, formData.dest_wh_code, formData.partner_code, formData.source_wh_code]);

  useEffect(() => {
    if (receipt) {
      setFormData({
        receipt_type: receipt.receipt_type,
        status: receipt.status,
        ref_no: receipt.ref_no || '',
        partner_code: receipt.partner_code || '',
        source_wh_code: receipt.source_wh_code || '',
        dest_wh_code: receipt.dest_wh_code,
        doc_date: receipt.doc_date ? new Date(receipt.doc_date).toISOString().split('T')[0] : '',
        note: receipt.note || '',
      });
      setLocalLines(receipt.lines || []);
    } else {
      setFormData(getInitialState());
      setLocalLines([]);
    }
    setErrors({});
  }, [receipt, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    if (name === 'receipt_type') {
        newFormData.partner_code = '';
        newFormData.source_wh_code = '';
    }
    setFormData(newFormData);
  };

  const handleAddLine = () => {
      const newLine: GoodsReceiptLine = {
          id: `new-${Date.now()}`,
          gr_id: receipt?.gr_no || 'NEW',
          model_code: '',
          model_name: 'Select an item...',
          uom: '',
          tracking_type: 'None',
          qty_planned: 1,
      };
      setLocalLines([...localLines, newLine]);
  };

  const handleLineChange = (index: number, field: keyof GoodsReceiptLine, value: any) => {
    const updatedLines = [...localLines];
    const line = updatedLines[index];
    (line[field] as any) = value;

    if (field === 'model_code' && value) {
        const selectedModel = modelGoods.find(m => m.model_code === value);
        if (selectedModel) {
            line.model_name = selectedModel.model_name;
            line.uom = selectedModel.base_uom;
            line.tracking_type = selectedModel.tracking_type;
        }
    }
    setLocalLines(updatedLines);
  };
  
  const handleRemoveLine = (index: number) => {
      setLocalLines(localLines.filter((_, i) => i !== index));
  };


  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.receipt_type) newErrors.receipt_type = "Loại nhập là bắt buộc.";
    if (!formData.dest_wh_code) newErrors.dest_wh_code = "Kho nhận là bắt buộc.";
    
    if (formData.receipt_type === 'PO' || formData.receipt_type === 'Return') {
        if (!formData.partner_code) newErrors.partner_code = "Đối tác là bắt buộc.";
    }
    if (formData.receipt_type === 'Transfer') {
        if (!formData.source_wh_code) newErrors.source_wh_code = "Kho nguồn là bắt buộc.";
        if (formData.source_wh_code === formData.dest_wh_code) {
             newErrors.source_wh_code = "Kho nguồn và kho nhận không được trùng nhau.";
        }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (targetStatus: 'Draft' | 'New') => {
    if (!validate()) return;
    onSave(formData, localLines, targetStatus);
  };

  const title = isCreateMode ? 'Create New Goods Receipt' : `GR: ${receipt?.gr_no}`;

  const activePartners = partners.filter(p => p.status === 'Active');
  const activeWarehouses = warehouses.filter(w => w.status === 'Active');

  const lineColumns = useMemo((): Column<GoodsReceiptLine>[] => {
    let baseCols: Column<GoodsReceiptLine>[];
    if (isEditable) {
        baseCols = [
            { key: 'model_code', header: 'Model Asset', render: (line, index) => (
                <select value={line.model_code} onChange={(e) => handleLineChange(index!, 'model_code', e.target.value)} className="w-full p-1 border rounded bg-white dark:bg-gray-700">
                    <option value="">Select Item</option>
                    {modelGoods.map(m => <option key={m.id} value={m.model_code}>{m.model_code} - {m.model_name}</option>)}
                </select>
            )},
            { key: 'model_name', header: 'Model Asset Name', render: (line) => <span className="text-gray-500">{line.model_name}</span> },
            { key: 'tracking_type', header: 'Tracking Type', render: (line) => <span className="text-gray-500">{line.tracking_type}</span> },
            { key: 'uom', header: 'Unit', render: (line) => <span className="text-gray-500">{line.uom}</span> },
            { key: 'qty_planned', header: 'Qty Planned', align: 'right', render: (line, index) => (
                <input type="number" value={line.qty_planned} onChange={e => handleLineChange(index!, 'qty_planned', parseInt(e.target.value) || 0)} className="w-24 p-1 text-right border rounded bg-white dark:bg-gray-700" />
            )},
        ];
    } else {
         baseCols = [
            { key: 'model_code', header: 'Item Code' },
            { key: 'model_name', header: 'Description' },
            { key: 'tracking_type', header: 'Tracking Type' },
            { key: 'uom', header: 'UoM' },
            { key: 'qty_planned', header: 'Qty Planned', align: 'right' },
        ];
    }
    
    if (receipt && ['Submitted', 'Completed', 'Rejected', 'Cancelled'].includes(receipt.status)) {
        baseCols.push(
            { key: 'qty_received', header: 'Qty Received', align: 'right', render: l => l.qty_received ?? '—' },
            { key: 'diff_qty', header: 'Diff', align: 'right', render: l => (l.diff_qty !== 0 ? <span className={l.diff_qty! > 0 ? 'text-green-500' : 'text-red-500'}>{l.diff_qty}</span> : '0') }
        );
    }

    if (!isCreateMode) {
        baseCols.push({ key: 'actions', header: 'Details', align: 'center', render: (line) => (
            <button
                onClick={() => setLineDetail(line)}
                disabled={line.tracking_type === 'None' || !line.qty_received}
                className="text-brand-primary hover:underline disabled:text-gray-400 disabled:no-underline text-xs"
            >
                View Details
            </button>
        )})
    }

    if (isEditable) {
        baseCols.push({ key: 'actions', header: 'Action', align: 'right', render: (line, index) => (
            <button onClick={() => handleRemoveLine(index!)} className="p-1 text-gray-500 hover:text-brand-danger">
                <Icon name="Trash2" className="w-4 h-4" />
            </button>
        )})
    }

    return baseCols;
  }, [receipt, isEditable, localLines, modelGoods]);


  const renderFooter = () => {
    const status = receipt?.status;

    if (isEditable) {
        return <>
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
            <button onClick={() => handleSubmit('Draft')} className="px-4 py-2 text-sm font-medium rounded-md bg-gray-600 text-white hover:bg-gray-700">Save as Draft</button>
            <button onClick={() => handleSubmit('New')} className="px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-blue-700">Send to Staff</button>
        </>;
    }
    
    switch(status) {
        case 'New':
            return <>
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Close</button>
                <button onClick={() => receipt && onCancel(receipt.gr_no)} className="px-4 py-2 text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900">Cancel Doc</button>
            </>;
        case 'Submitted':
             return <>
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Close</button>
                <button onClick={() => receipt && onReject(receipt.gr_no)} className="px-4 py-2 text-sm font-medium rounded-md bg-brand-danger text-white hover:bg-red-700">Reject</button>
                <button onClick={() => receipt && onApprove(receipt.gr_no)} className="px-4 py-2 text-sm font-medium rounded-md bg-brand-success text-white hover:bg-green-700">Approve</button>
            </>;
        default:
            return <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Close</button>
    }
  }

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="fullscreen" footer={renderFooter()}>
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* Main Content */}
            <div className="flex-grow lg:w-2/3">
                <div className="space-y-4">
                    {receipt && (
                         <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div><span className="font-medium text-gray-500 dark:text-gray-400">Status: </span><StatusBadge status={receipt.status} /></div>
                            <div><span className="text-gray-500 dark:text-gray-400">Created by: </span><span className="font-semibold">{receipt.created_by}</span></div>
                            <div><span className="text-gray-500 dark:text-gray-400">Created at: </span><span className="font-semibold">{new Date(receipt.created_at).toLocaleDateString()}</span></div>
                            <div><span className="text-gray-500 dark:text-gray-400">Handler: </span><span className="font-semibold">{receipt.handler || '—'}</span></div>
                         </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <FormField label="Receipt Type" error={errors.receipt_type} required>
                            <select name="receipt_type" value={formData.receipt_type} onChange={handleChange} className="w-full" disabled={!isEditable}>
                                <option value="PO">PO</option>
                                <option value="Return">Return</option>
                                <option value="Transfer">Transfer</option>
                                <option value="Other">Other</option>
                            </select>
                        </FormField>
                        <FormField label="Reference No" error={errors.ref_no}>
                            <input type="text" name="ref_no" value={formData.ref_no} onChange={handleChange} className="w-full" disabled={!isEditable} />
                        </FormField>

                        {(formData.receipt_type === 'PO' || formData.receipt_type === 'Return') && (
                            <FormField label="Partner" error={errors.partner_code} required>
                                <select name="partner_code" value={formData.partner_code} onChange={handleChange} className="w-full" disabled={!isEditable}>
                                    <option value="">-- Select Partner --</option>
                                    {activePartners.map(p => <option key={p.id} value={p.partner_code}>{p.partner_name}</option>)}
                                </select>
                            </FormField>
                        )}

                         {formData.receipt_type === 'Transfer' && (
                            <FormField label="Source Warehouse" error={errors.source_wh_code} required>
                                <select name="source_wh_code" value={formData.source_wh_code} onChange={handleChange} className="w-full" disabled={!isEditable}>
                                    <option value="">-- Select Source Warehouse --</option>
                                    {activeWarehouses.map(w => <option key={w.id} value={w.wh_code}>{w.wh_name}</option>)}
                                </select>
                            </FormField>
                        )}
                        
                        <FormField label="Destination Warehouse" error={errors.dest_wh_code} required>
                            <select name="dest_wh_code" value={formData.dest_wh_code} onChange={handleChange} className="w-full" disabled={!isEditable}>
                                <option value="">-- Select Destination Warehouse --</option>
                                {activeWarehouses.map(w => <option key={w.id} value={w.wh_code}>{w.wh_name}</option>)}
                            </select>
                        </FormField>

                        <FormField label="Expected date" error={errors.doc_date}>
                            <input type="date" name="doc_date" value={formData.doc_date} onChange={handleChange} className="w-full" disabled={!isEditable} />
                        </FormField>

                        <div className="md:col-span-2">
                            <FormField label="Note" error={errors.note}>
                                <textarea name="note" value={formData.note} onChange={handleChange} className="w-full" rows={2} disabled={!isEditable}></textarea>
                            </FormField>
                        </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Receipt Plan</h3>
                            {isEditable && (
                                <button 
                                  onClick={handleAddLine} 
                                  className="flex items-center gap-2 px-3 py-1 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                  disabled={!canAddLines}
                                  title={!canAddLines ? "Please fill all required header fields first (e.g., Destination Warehouse, Partner/Source)." : "Add a new line item"}
                                >
                                    <Icon name="Plus" className="w-4 h-4"/> Add Line
                                </button>
                            )}
                        </div>
                         {localLines.length > 0 ? (
                            <Table<GoodsReceiptLine> columns={lineColumns} data={localLines} />
                         ) : (
                             <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <p className="text-gray-500 dark:text-gray-400">No line items added yet.</p>
                            </div>
                         )}
                    </div>
                </div>
            </div>

            {/* Side Panel */}
            {!isCreateMode && receipt?.history && <StatusHistorySidebar history={receipt.history} />}
        </div>
    </Modal>
    {lineDetail && (
        <LineDetailModal 
            isOpen={!!lineDetail}
            onClose={() => setLineDetail(null)}
            line={lineDetail}
        />
    )}
    </>
  );
};