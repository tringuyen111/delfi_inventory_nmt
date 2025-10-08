

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { GoodsTransfer, Warehouse, ModelGoods, OnhandByLocation, GoodsTransferLine, GoodsIssue, GoodsReceipt } from '../../types';
import { FormField } from '../ui/FormField';
import { StatusBadge } from '../ui/StatusBadge';
import { Icon } from '../Icons';
import { Table, Column } from '../ui/Table';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { useLanguage } from '../../hooks/useLanguage';
import { SectionCard } from '../SectionCard';

type ModalMode = 'create' | 'edit' | 'view';

interface GoodsTransferFormModalProps {
  isOpen: boolean;
  mode: ModalMode;
  onClose: () => void;
  onSave: (
      transfer: Omit<GoodsTransfer, 'id' | 'gt_no' | 'created_at' | 'updated_at' | 'created_by' | 'lines' | 'history'>,
      lines: GoodsTransferLine[],
      targetStatus: 'Draft' | 'Created'
    ) => void;
  onCancel: (gtNo: string) => void;
  transfer: GoodsTransfer | null;
  warehouses: Warehouse[];
  warehouseMap: Map<string, string>;
  modelGoods: ModelGoods[];
  onhand: OnhandByLocation[];
  issues: GoodsIssue[];
  receipts: GoodsReceipt[];
}

const getInitialState = (): Omit<GoodsTransfer, 'id' | 'gt_no' | 'created_at' | 'updated_at' | 'created_by' | 'lines' | 'history' | 'linked_gi_no' | 'linked_gr_no'> => ({
    gt_type: 'Internal Transfer',
    status: 'Draft',
    source_wh_code: '',
    dest_wh_code: '',
    expected_date: '',
    note: '',
});

export const GoodsTransferFormModal: React.FC<GoodsTransferFormModalProps> = ({
  isOpen, mode, onClose, onSave, onCancel, transfer, warehouses, warehouseMap, modelGoods, onhand, issues, receipts
}) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState(getInitialState());
    const [localLines, setLocalLines] = useState<GoodsTransferLine[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [lineErrors, setLineErrors] = useState<Record<string, string>>({});
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    const isEditable = mode === 'create' || (mode === 'edit' && transfer?.status === 'Draft');
    const isViewMode = mode === 'view' || (mode === 'edit' && transfer?.status !== 'Draft');

    useEffect(() => {
        if (transfer) {
            setFormData({
                gt_type: transfer.gt_type,
                status: transfer.status,
                source_wh_code: transfer.source_wh_code,
                dest_wh_code: transfer.dest_wh_code,
                expected_date: transfer.expected_date ? new Date(transfer.expected_date).toISOString().split('T')[0] : '',
                note: transfer.note || '',
            });
            setLocalLines(transfer.lines || []);
        } else {
            setFormData(getInitialState());
            setLocalLines([]);
        }
        setErrors({});
        setLineErrors({});
    }, [transfer, isOpen]);
    
    const onhandForSourceWarehouse = useMemo(() => onhand.filter(o => o.wh_code === formData.source_wh_code), [onhand, formData.source_wh_code]);
    const modelsInSourceWarehouse = useMemo(() => {
        const modelCodes = new Set(onhandForSourceWarehouse.map(o => o.model_code));
        return modelGoods.filter(m => modelCodes.has(m.model_code));
    }, [onhandForSourceWarehouse, modelGoods]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const newFormData = { ...formData, [name]: value };
        if (name === 'source_wh_code') {
            if (value === newFormData.dest_wh_code) newFormData.dest_wh_code = '';
            setLocalLines([]);
        }
        setFormData(newFormData);
    };

    const handleAddLine = () => setLocalLines([...localLines, { id: `new-${Date.now()}`, gt_id: transfer?.gt_no || 'NEW', model_code: '', model_name: '', uom: '', tracking_type: 'None', qty_transfer: 1 }]);
    const handleRemoveLine = (index: number) => setLocalLines(localLines.filter((_, i) => i !== index));

    const handleLineChange = (index: number, field: keyof GoodsTransferLine, value: any) => {
        const updatedLines = [...localLines];
        let line = { ...updatedLines[index], [field]: value };
        if (field === 'model_code') {
            const model = modelGoods.find(m => m.model_code === value);
            line = {...line, model_name: model?.model_name || '', uom: model?.base_uom || '', tracking_type: model?.tracking_type || 'None', qty_transfer: 1 };
        }
        if (field === 'qty_transfer') {
            const onhandQty = onhandForSourceWarehouse.find(o => o.model_code === line.model_code)?.available_qty || 0;
            if (Number(value) > onhandQty) {
                line.qty_transfer = onhandQty;
                setLineErrors(prev => ({...prev, [line.id]: t('pages.goodsTransfer.toast.lineQtyWarning', {maxQty: onhandQty})}));
            } else {
                setLineErrors(prev => { const newE = {...prev}; delete newE[line.id]; return newE; });
            }
        }
        updatedLines[index] = line;
        setLocalLines(updatedLines);
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.source_wh_code) newErrors.source_wh_code = "Source warehouse is required.";
        if (!formData.dest_wh_code) newErrors.dest_wh_code = "Destination warehouse is required.";
        if (formData.source_wh_code === formData.dest_wh_code) newErrors.dest_wh_code = "Destination cannot be the same as source.";
        if (localLines.some(l => !l.model_code || l.qty_transfer <= 0)) {
            alert("All lines must have a model and quantity greater than 0.");
            return false;
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleSubmit = (targetStatus: 'Draft' | 'Created') => {
        if (!validate()) return;
        onSave(formData, localLines, targetStatus);
    };

    const linkedGI = useMemo(() => issues.find(i => i.gi_no === transfer?.linked_gi_no), [issues, transfer]);
    const linkedGR = useMemo(() => receipts.find(r => r.gr_no === transfer?.linked_gr_no), [receipts, transfer]);

    const finalLines = useMemo(() => {
        if (isViewMode) {
            const giLines = linkedGI?.lines.reduce((acc, l) => ({...acc, [l.model_code]: l.qty_picked}), {} as Record<string, number>) || {};
            const grLines = linkedGR?.lines.reduce((acc, l) => ({...acc, [l.model_code]: l.qty_received}), {} as Record<string, number>) || {};
            return localLines.map(l => ({ ...l, qty_exported: giLines[l.model_code] || 0, qty_received: grLines[l.model_code] || 0 }));
        }
        return localLines;
    }, [localLines, linkedGI, linkedGR, isViewMode]);

    // FIX: Refactor the `lineColumns` definition to use an imperative approach with `push`. This resolves a TypeScript type inference issue where the `align` property was being incorrectly widened to `string` due to a conditional spread operator, causing a type mismatch with the `Column` interface.
    const lineColumns: Column<GoodsTransferLine>[] = useMemo(() => {
        const columns: Column<GoodsTransferLine>[] = [
            { key: 'model_code', header: t('pages.goodsTransfer.modal.lines.table.modelGoods'), render: (line, i) => isEditable ? (
                <select value={line.model_code} onChange={e => handleLineChange(i!, 'model_code', e.target.value)} className="w-full p-1" disabled={!formData.source_wh_code}>
                    <option value="">{t('common.selectPlaceholder')}</option>
                    {modelsInSourceWarehouse.map(m => <option key={m.id} value={m.model_code}>{`${m.model_name} (${m.model_code})`}</option>)}
                </select>
            ) : line.model_code },
            { key: 'model_name', header: t('pages.goodsTransfer.modal.lines.table.modelName'), render: l => l.model_name},
            { key: 'tracking_type', header: t('pages.goodsTransfer.modal.lines.table.tracking'), render: l => <StatusBadge status={l.tracking_type} /> },
            { key: 'uom', header: t('pages.goodsTransfer.modal.lines.table.unit') },
        ];
    
        if (isViewMode) {
            columns.push(
                { key: 'qty_transfer', header: t('pages.goodsTransfer.modal.lines.table.qty'), align: 'right', render: l => l.qty_transfer.toLocaleString() },
                { key: 'qty_exported', header: t('pages.goodsTransfer.modal.lines.table.qtyExported'), align: 'right', render: l => l.qty_exported?.toLocaleString() ?? '—' },
                { key: 'qty_received', header: t('pages.goodsTransfer.modal.lines.table.qtyReceived'), align: 'right', render: l => l.qty_received?.toLocaleString() ?? '—' },
            );
        } else {
            columns.push(
                { key: 'onhand', header: t('pages.goodsTransfer.modal.lines.table.onhand'), align: 'right', render: l => (onhandForSourceWarehouse.find(o => o.model_code === l.model_code)?.available_qty || 0).toLocaleString() },
                { key: 'qty_transfer', header: t('pages.goodsTransfer.modal.lines.table.qty'), align: 'right', render: (l, i) => isEditable ? <input type="number" value={l.qty_transfer} onChange={e => handleLineChange(i!, 'qty_transfer', parseInt(e.target.value))} className="w-24 p-1 text-right" /> : l.qty_transfer.toLocaleString() },
                { key: 'actions', header: '', align: 'center', render: (_, i) => isEditable ? <button onClick={() => handleRemoveLine(i!)}><Icon name="Trash2" className="w-4 h-4 text-red-500" /></button> : null }
            );
        }
        return columns;
    }, [isEditable, formData, localLines, modelsInSourceWarehouse, onhandForSourceWarehouse, t, isViewMode]);

    const title = mode === 'create' ? t('pages.goodsTransfer.modal.createTitle') : t('pages.goodsTransfer.modal.viewTitle', {gtNo: transfer?.gt_no});

    return <>
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="fullscreen" footer={
            <div className="flex justify-between w-full">
                <div>{isEditable && transfer && <button onClick={() => setShowCancelConfirm(true)} className="px-4 py-2 text-sm text-white bg-red-600 rounded-md">Cancel Document</button>}</div>
                <div className="flex gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 rounded-md">Close</button>
                    {isEditable && <button onClick={() => handleSubmit('Draft')} className="px-4 py-2 text-sm text-white bg-gray-600 rounded-md">Save as Draft</button>}
                    {isEditable && <button onClick={() => handleSubmit('Created')} className="px-4 py-2 text-sm text-white bg-brand-primary rounded-md">{mode === 'create' ? 'Create' : 'Save'}</button>}
                </div>
            </div>
        }>
            <div className="flex flex-col lg:flex-row gap-6 h-full">
                <div className="flex-grow lg:w-2/3 space-y-6">
                    <SectionCard title={t('form.section.information')} icon="ClipboardList">
                        {transfer && <div className="p-3 mb-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg grid grid-cols-4 gap-4 text-sm">
                           <div><span className="font-medium text-gray-500">Status: </span><StatusBadge status={transfer.status} /></div>
                           <div><span className="text-gray-500">Created by: </span><span className="font-semibold">{transfer.created_by}</span></div>
                           <div><span className="text-gray-500">Created at: </span><span className="font-semibold">{new Date(transfer.created_at).toLocaleDateString()}</span></div>
                        </div>}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField label={t('pages.goodsTransfer.modal.form.gtType')} required><select name="gt_type" value={formData.gt_type} onChange={handleChange} disabled={!isEditable}><option value="Internal Transfer">Internal Transfer</option><option value="Return">Return</option><option value="Other">Other</option></select></FormField>
                            <FormField label={t('pages.goodsTransfer.modal.form.source')} required error={errors.source_wh_code}><select name="source_wh_code" value={formData.source_wh_code} onChange={handleChange} disabled={!isEditable}><option value="">Select...</option>{warehouses.map(w => <option key={w.id} value={w.wh_code}>{w.wh_name}</option>)}</select></FormField>
                            <FormField label={t('pages.goodsTransfer.modal.form.destination')} required error={errors.dest_wh_code}><select name="dest_wh_code" value={formData.dest_wh_code} onChange={handleChange} disabled={!isEditable}><option value="">Select...</option>{warehouses.filter(w=>w.wh_code !== formData.source_wh_code).map(w => <option key={w.id} value={w.wh_code}>{w.wh_name}</option>)}</select></FormField>
                            <FormField label={t('pages.goodsTransfer.modal.form.expectedDate')}><input type="date" name="expected_date" value={formData.expected_date || ''} onChange={handleChange} disabled={!isEditable} /></FormField>
                            <div className="md:col-span-2"><FormField label="Note"><textarea name="note" value={formData.note || ''} onChange={handleChange} rows={1} disabled={!isEditable}></textarea></FormField></div>
                        </div>
                    </SectionCard>

                    <SectionCard
                        title={t('form.section.transferPlan')}
                        icon="List"
                        actions={isEditable && <button onClick={handleAddLine} disabled={!formData.source_wh_code} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-brand-primary rounded-md disabled:bg-gray-400"><Icon name="Plus" className="w-4 h-4"/> {t('pages.goodsTransfer.modal.lines.addLine')}</button>}
                    >
                        <Table columns={lineColumns} data={finalLines} />
                    </SectionCard>
                </div>
                {isViewMode && <div className="w-full lg:w-1/3 flex-shrink-0 space-y-6">
                    <SectionCard title={t('form.section.warehouseInfo')} icon="Warehouse">
                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="font-semibold text-gray-600 dark:text-gray-300">Source Warehouse</p>
                                <p>{warehouseMap.get(formData.source_wh_code) || formData.source_wh_code}</p>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-600 dark:text-gray-300">Destination Warehouse</p>
                                <p>{warehouseMap.get(formData.dest_wh_code) || formData.dest_wh_code}</p>
                            </div>
                        </div>
                    </SectionCard>
                    <SectionCard title={t('pages.goodsTransfer.modal.links.title')} icon="ExternalLink">
                        <div className="space-y-2 text-sm">
                            <p><strong>{t('pages.goodsTransfer.modal.links.gi')}:</strong> <span className="font-mono text-brand-primary">{linkedGI?.gi_no || t('pages.goodsTransfer.modal.links.notGenerated')}</span></p>
                            <p><strong>{t('pages.goodsTransfer.modal.links.gr')}:</strong> <span className="font-mono text-brand-primary">{linkedGR?.gr_no || t('pages.goodsTransfer.modal.links.notGenerated')}</span></p>
                        </div>
                    </SectionCard>
                </div>}
            </div>
        </Modal>
        {transfer && <ConfirmationModal isOpen={showCancelConfirm} onClose={() => setShowCancelConfirm(false)} onConfirm={() => onCancel(transfer.gt_no)} title={t('pages.goodsTransfer.modal.cancelConfirm.title')} message={t('pages.goodsTransfer.modal.cancelConfirm.message')} />}
    </>;
};
