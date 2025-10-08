import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { GoodsReceipt, Partner, Warehouse, GoodsReceiptLine, StatusHistoryEvent, ModelGoods } from '../../types';
import { FormField } from '../ui/FormField';
import { StatusBadge } from '../ui/StatusBadge';
import { Icon } from '../Icons';
import { Table, Column } from '../ui/Table';
import { LineDetailModal } from './LineDetailModal';
import { useLanguage } from '../../hooks/useLanguage';

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

const StatusHistorySidebar: React.FC<{ history: StatusHistoryEvent[] }> = ({ history = [] }) => {
    const { t } = useLanguage();
    return (
        <div className="w-full lg:w-1/3 lg:pl-6 lg:border-l lg:border-gray-200 dark:lg:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Icon name="History" className="w-5 h-5" />
                {t('pages.goodsReceipt.modal.statusHistory')}
            </h3>
            <ol className="relative border-l border-gray-200 dark:border-gray-700">
                {history.slice().reverse().map(event => (
                     <li key={event.id} className="mb-6 ml-6">
                        <span className="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -left-3 ring-8 ring-white dark:ring-gray-900 dark:bg-blue-900">
                            <Icon name="CheckCircle" className="w-3 h-3 text-blue-800 dark:text-blue-300"/>
                        </span>
                        <h4 className="flex items-center mb-1 text-base font-semibold text-gray-900 dark:text-white">
                           <StatusBadge status={event.status} />
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
};

export const GoodsReceiptFormModal: React.FC<GoodsReceiptFormModalProps> = ({
  isOpen, mode, onClose, onSave, onSwitchToEdit, onApprove, onReject, onCancel, receipt, partners, warehouses, modelGoods
}) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState(getInitialState());
  const [localLines, setLocalLines] = useState<GoodsReceiptLine[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [viewLineDetail, setViewLineDetail] = useState<GoodsReceiptLine | null>(null);

  const isEditable = mode === 'create' || (mode === 'edit' && receipt?.status === 'Draft');
  const isViewMode = mode === 'view';

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
      model_name: '',
      uom: '',
      tracking_type: 'None',
      qty_planned: 1,
      qty_received: 0
    };
    setLocalLines([...localLines, newLine]);
  };

  const handleLineChange = (index: number, field: keyof GoodsReceiptLine, value: any) => {
    const updatedLines = [...localLines];
    const line = { ...updatedLines[index], [field]: value };

    if (field === 'model_code' && value) {
      const selectedModel = modelGoods.find(m => m.model_code === value);
      if (selectedModel) {
        line.model_name = selectedModel.model_name;
        line.uom = selectedModel.base_uom;
        line.tracking_type = selectedModel.tracking_type;
      }
    }
    updatedLines[index] = line;
    setLocalLines(updatedLines);
  };

  const handleRemoveLine = (index: number) => {
    setLocalLines(localLines.filter((_, i) => i !== index));
  };
  
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.dest_wh_code) newErrors.dest_wh_code = "Destination Warehouse is required.";
    if (!formData.doc_date) newErrors.doc_date = "Document Date is required.";
    if (formData.receipt_type === 'PO' || formData.receipt_type === 'Return') {
      if (!formData.partner_code) newErrors.partner_code = "Partner is required for this receipt type.";
    }
    if (formData.receipt_type === 'Transfer') {
      if (!formData.source_wh_code) newErrors.source_wh_code = "Source Warehouse is required for transfers.";
    }
    if (localLines.length === 0) {
      alert(t('pages.goodsReceipt.modal.alerts.lineRequired'));
      return false;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (targetStatus: 'Draft' | 'New') => {
    if (!validate()) return;
    onSave(formData, localLines, targetStatus);
  };
  
  const lineColumns: Column<GoodsReceiptLine>[] = useMemo(() => [
    { key: 'model_code', header: t('pages.goodsReceipt.modal.lines.table.modelGoods'), render: (line, index) => isEditable ? (
        <select value={line.model_code} onChange={(e) => handleLineChange(index!, 'model_code', e.target.value)} className="w-full p-1 border rounded bg-white dark:bg-gray-700">
            <option value="">{t('common.selectPlaceholder')}</option>
            {modelGoods.map(m => <option key={m.id} value={m.model_code}>{m.model_name} ({m.model_code})</option>)}
        </select>
    ) : `${line.model_name} (${line.model_code})` },
    { key: 'uom', header: t('pages.goodsReceipt.modal.lines.table.uom') },
    { key: 'qty_planned', header: t('pages.goodsReceipt.modal.lines.table.qtyPlanned'), align: 'right', render: (line, index) => isEditable ? (
        <input type="number" value={line.qty_planned} onChange={(e) => handleLineChange(index!, 'qty_planned', parseInt(e.target.value))} className="w-24 p-1 text-right border rounded bg-white dark:bg-gray-700" min="1" />
    ) : line.qty_planned },
    { key: 'qty_received', header: t('pages.goodsReceipt.modal.lines.table.qtyReceived'), align: 'right', render: (line) => line.qty_received || 0 },
    { key: 'diff_qty', header: t('pages.goodsReceipt.modal.lines.table.diffQty'), align: 'right', render: (line) => (line.qty_received || 0) - line.qty_planned },
    { key: 'actions', header: t('pages.goodsReceipt.modal.lines.table.action'), align: 'center', render: (line, index) => isEditable ? (
        <button onClick={() => handleRemoveLine(index!)} className="p-1 text-gray-500 hover:text-brand-danger"><Icon name="Trash2" className="w-4 h-4" /></button>
    ) : (
        <button onClick={() => setViewLineDetail(line)} disabled={line.tracking_type === 'None'} className="text-sm text-brand-primary hover:underline disabled:text-gray-400">{t('pages.goodsReceipt.modal.lines.viewDetails')}</button>
    )}
  ], [isEditable, modelGoods, localLines, t]);

  const title = mode === 'create' ? t('pages.goodsReceipt.modal.createTitle') : t('pages.goodsReceipt.modal.viewTitle', { grNo: receipt?.gr_no });
  const activePartners = partners.filter(p => p.status === 'Active');
  const activeWarehouses = warehouses.filter(w => w.status === 'Active');

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        size="fullscreen"
        footer={
          <>
            {isViewMode && receipt && (
                <>
                    {['Draft'].includes(receipt.status) && <button onClick={onSwitchToEdit} className="px-4 py-2 rounded-md bg-yellow-500 text-white">{t('pages.goodsReceipt.modal.buttons.edit')}</button>}
                    {['Submitted'].includes(receipt.status) && <button onClick={() => onApprove(receipt.gr_no)} className="px-4 py-2 rounded-md bg-green-600 text-white">{t('pages.goodsReceipt.modal.buttons.approve')}</button>}
                    {['Submitted'].includes(receipt.status) && <button onClick={() => onReject(receipt.gr_no)} className="px-4 py-2 rounded-md bg-red-600 text-white">{t('pages.goodsReceipt.modal.buttons.reject')}</button>}
                    {['Draft', 'New', 'Receiving', 'Submitted'].includes(receipt.status) && <button onClick={() => onCancel(receipt.gr_no)} className="px-4 py-2 rounded-md bg-gray-600 text-white">{t('pages.goodsReceipt.modal.buttons.cancelDoc')}</button>}
                </>
            )}
            {isEditable && (
                <>
                    <button onClick={() => handleSubmit('Draft')} className="px-4 py-2 rounded-md bg-gray-600 text-white">{t('common.saveAsDraft')}</button>
                    <button onClick={() => handleSubmit('New')} className="px-4 py-2 rounded-md bg-brand-primary text-white">{t('common.create')}</button>
                </>
            )}
            <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-600">{t('common.close')}</button>
          </>
        }
      >
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* Main Content */}
            <div className="flex-grow lg:w-2/3">
                <div className="space-y-4">
                    {receipt && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                           <div><span className="font-medium text-gray-500 dark:text-gray-400">{t('pages.goodsReceipt.modal.statusLabels.status')}: </span><StatusBadge status={receipt.status} /></div>
                           <div><span className="text-gray-500 dark:text-gray-400">{t('pages.goodsReceipt.modal.statusLabels.createdBy')}: </span><span className="font-semibold">{receipt.created_by}</span></div>
                           <div><span className="text-gray-500 dark:text-gray-400">{t('pages.goodsReceipt.modal.statusLabels.createdAt')}: </span><span className="font-semibold">{new Date(receipt.created_at).toLocaleDateString()}</span></div>
                           <div><span className="text-gray-500 dark:text-gray-400">{t('pages.goodsReceipt.modal.statusLabels.handler')}: </span><span className="font-semibold">{receipt.handler || '—'}</span></div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormField label={t('pages.goodsReceipt.modal.formLabels.receiptType')} required><select name="receipt_type" value={formData.receipt_type} onChange={handleChange} className="w-full" disabled={!isEditable}>{['PO', 'Return', 'Transfer', 'Other'].map(t=><option key={t} value={t}>{t}</option>)}</select></FormField>
                        <FormField label={t('pages.goodsReceipt.modal.formLabels.destWarehouse')} required error={errors.dest_wh_code}><select name="dest_wh_code" value={formData.dest_wh_code} onChange={handleChange} className="w-full" disabled={!isEditable}><option value="">{t('common.selectPlaceholder')}</option>{activeWarehouses.map(w=><option key={w.id} value={w.wh_code}>{w.wh_name}</option>)}</select></FormField>
                        <FormField label={t('pages.goodsReceipt.modal.formLabels.refNo')}><input type="text" name="ref_no" value={formData.ref_no} onChange={handleChange} className="w-full" disabled={!isEditable} /></FormField>
                        <FormField label={t('pages.goodsReceipt.modal.formLabels.docDate')} required error={errors.doc_date}><input type="date" name="doc_date" value={formData.doc_date || ''} onChange={handleChange} className="w-full" disabled={!isEditable} /></FormField>
                        
                        {formData.receipt_type === 'Transfer' && <FormField label={t('pages.goodsReceipt.modal.formLabels.sourceWarehouse')} required error={errors.source_wh_code}><select name="source_wh_code" value={formData.source_wh_code} onChange={handleChange} className="w-full" disabled={!isEditable}><option value="">{t('common.selectPlaceholder')}</option>{activeWarehouses.filter(w=>w.wh_code !== formData.dest_wh_code).map(w=><option key={w.id} value={w.wh_code}>{w.wh_name}</option>)}</select></FormField>}
                        {(formData.receipt_type === 'PO' || formData.receipt_type === 'Return') && <FormField label={t('pages.goodsReceipt.modal.formLabels.partner')} required error={errors.partner_code}><select name="partner_code" value={formData.partner_code} onChange={handleChange} className="w-full" disabled={!isEditable}><option value="">{t('common.selectPlaceholder')}</option>{activePartners.map(p=><option key={p.id} value={p.partner_code}>{p.partner_name}</option>)}</select></FormField>}

                        <div className="md:col-span-4"><FormField label={t('pages.goodsReceipt.modal.formLabels.note')}><textarea name="note" value={formData.note} onChange={handleChange} className="w-full" rows={2} disabled={!isEditable}></textarea></FormField></div>
                    </div>
                    
                    <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold">{t('pages.goodsReceipt.modal.lines.title')}</h3>
                            {isEditable && <button onClick={handleAddLine} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-blue-700"><Icon name="Plus" className="w-4 h-4"/> {t('pages.goodsReceipt.modal.lines.addLine')}</button>}
                        </div>
                        <Table<GoodsReceiptLine> columns={lineColumns} data={localLines} />
                    </div>
                </div>
            </div>

            {/* Side Panel */}
            {!isEditable && receipt?.history && <StatusHistorySidebar history={receipt.history} />}
        </div>
      </Modal>

      <LineDetailModal 
        isOpen={!!viewLineDetail}
        onClose={() => setViewLineDetail(null)}
        line={viewLineDetail}
      />
    </>
  );
};