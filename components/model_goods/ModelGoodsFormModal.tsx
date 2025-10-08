import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { ModelGoods, GoodsType, Uom } from '../../types';
import { FormField } from '../ui/FormField';

type ModalMode = 'create' | 'edit' | 'view';

interface ModelGoodsFormModalProps {
  isOpen: boolean;
  mode: ModalMode;
  onClose: () => void;
  onSaveAndContinue: (model: Omit<ModelGoods, 'id' | 'model_code' | 'updated_at' | 'total_onhand_qty'>) => void;
  onSaveAndClose: (model: Omit<ModelGoods, 'id' | 'model_code' | 'updated_at' | 'total_onhand_qty'>) => void;
  onSwitchToEdit: () => void;
  modelGoods: ModelGoods | null;
  existingModelGoods: ModelGoods[];
  goodsTypes: GoodsType[];
  uoms: Uom[];
}

const INITIAL_STATE: Omit<ModelGoods, 'id' | 'model_code' | 'updated_at' | 'total_onhand_qty'> = {
    model_name: '',
    goods_type_code: '',
    base_uom: '',
    tracking_type: 'None',
    description: '',
    status: 'Active',
    low_stock_threshold: undefined,
};

export const ModelGoodsFormModal: React.FC<ModelGoodsFormModalProps> = ({ 
    isOpen, mode, onClose, onSaveAndContinue, onSaveAndClose, onSwitchToEdit, modelGoods, existingModelGoods, goodsTypes, uoms
}) => {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const activeGoodsTypeOptions = goodsTypes.filter(gt => gt.status === 'Active');
  const activeBaseUomOptions = uoms.filter(uom => uom.status === 'Active' && uom.uom_type === 'Base');

  useEffect(() => {
    if (modelGoods) {
      setFormData({
        model_name: modelGoods.model_name,
        goods_type_code: modelGoods.goods_type_code,
        base_uom: modelGoods.base_uom,
        tracking_type: modelGoods.tracking_type,
        description: modelGoods.description || '',
        status: modelGoods.status,
        low_stock_threshold: modelGoods.low_stock_threshold,
      });
    } else {
      setFormData(INITIAL_STATE);
    }
    setErrors({});
  }, [modelGoods, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.model_name.trim()) newErrors.model_name = "Model Name is required (<=200 chars).";
    if (formData.model_name.length > 200) newErrors.model_name = "Model Name is required (<=200 chars).";

    if (!formData.goods_type_code) newErrors.goods_type_code = "An active Goods Type must be selected.";
    if (!formData.base_uom) newErrors.base_uom = "An active Base UoM must be selected.";
    if (!formData.tracking_type) newErrors.tracking_type = "A valid Tracking Type must be selected.";
    
    if (formData.low_stock_threshold && Number(formData.low_stock_threshold) < 0) {
        newErrors.low_stock_threshold = "Low Stock Threshold must be a non-negative number.";
    }

    if (modelGoods && modelGoods.status === 'Active' && formData.status === 'Inactive') {
        if (modelGoods.total_onhand_qty > 0) {
            const msg = "Cannot deactivate this Model Goods as there is still on-hand stock.";
            newErrors.status = msg;
            alert(msg);
        } else {
            const confirmed = window.confirm("Deactivating this Model Goods will prevent new transactions. Continue?");
            if (!confirmed) {
                // This is a soft validation fail to prevent submission
                newErrors.status = "Inactivation not confirmed.";
            }
        }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = (andClose: boolean) => {
    if (!validate()) return;
    
    const finalData = {
        ...formData,
        model_name: formData.model_name.trim(),
        low_stock_threshold: formData.low_stock_threshold ? Number(formData.low_stock_threshold) : null,
    };
    
    if (andClose) {
        onSaveAndClose(finalData);
    } else {
        onSaveAndContinue(finalData);
    }
  };

  const isViewMode = mode === 'view';
  const isCreateMode = mode === 'create';
  const isLocked = !isCreateMode;

  const title = isCreateMode ? 'Create New Model Goods' :
                isViewMode ? `View Model Goods: ${modelGoods?.model_code}` :
                `Edit Model Goods: ${modelGoods?.model_code}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          {isViewMode ? (
            <>
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Close</button>
                <button onClick={onSwitchToEdit} className="px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-blue-700">Edit</button>
            </>
          ) : (
            <>
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                <button onClick={() => handleSubmit(false)} className="px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-blue-700">Save</button>
                <button onClick={() => handleSubmit(true)} className="px-4 py-2 text-sm font-medium rounded-md bg-gray-600 text-white hover:bg-gray-700">Save & Close</button>
            </>
          )}
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {!isCreateMode && (
             <div className="md:col-span-2">
                <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Model Code</p>
                <p className="text-sm text-gray-900 dark:text-gray-100 font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-md">{modelGoods?.model_code}</p>
             </div>
        )}
       
        <div className="md:col-span-2">
            <FormField label="Model Name" error={errors.model_name} required>
                <input type="text" name="model_name" value={formData.model_name} onChange={handleChange} className="w-full" maxLength={200} disabled={isViewMode} />
            </FormField>
        </div>

        <FormField label="Goods Type" error={errors.goods_type_code} required>
            <select name="goods_type_code" value={formData.goods_type_code} onChange={handleChange} className="w-full" disabled={isViewMode || isLocked}>
                <option value="">-- Select Goods Type --</option>
                {activeGoodsTypeOptions.map(gt => (
                    <option key={gt.id} value={gt.goods_type_code}>{gt.goods_type_name}</option>
                ))}
            </select>
        </FormField>
         <FormField label="Base UoM" error={errors.base_uom} required>
            <select name="base_uom" value={formData.base_uom} onChange={handleChange} className="w-full" disabled={isViewMode || isLocked}>
                <option value="">-- Select Base UoM --</option>
                {activeBaseUomOptions.map(uom => (
                    <option key={uom.id} value={uom.uom_code}>{uom.uom_name} ({uom.uom_code})</option>
                ))}
            </select>
        </FormField>
        
        <FormField label="Tracking Type" error={errors.tracking_type} required>
            <select name="tracking_type" value={formData.tracking_type} onChange={handleChange} className="w-full" disabled={isViewMode || isLocked}>
                <option value="None">None</option>
                <option value="Serial">Serial</option>
                <option value="Lot">Lot</option>
            </select>
        </FormField>

        <FormField label="Low Stock Threshold" error={errors.low_stock_threshold}>
            <input 
                type="number" 
                name="low_stock_threshold" 
                value={formData.low_stock_threshold || ''} 
                onChange={handleChange} 
                className="w-full"
                min="0"
                disabled={isViewMode}
            />
        </FormField>

        <div className="md:col-span-2">
            <FormField label="Description" error={errors.description}>
                <textarea name="description" value={formData.description} onChange={handleChange} className="w-full" rows={3} maxLength={1000} disabled={isViewMode}></textarea>
            </FormField>
        </div>
        
        <FormField label="Status" error={errors.status}>
            <select name="status" value={formData.status} onChange={handleChange} className="w-full" disabled={isViewMode}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
            </select>
        </FormField>
        

      </div>
    </Modal>
  );
};