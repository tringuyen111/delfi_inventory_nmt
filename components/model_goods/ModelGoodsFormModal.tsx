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
    if (!formData.model_name.trim()) newErrors.model_name = "Tên model bắt buộc, ≤200 ký tự.";
    if (formData.model_name.length > 200) newErrors.model_name = "Tên model bắt buộc, ≤200 ký tự.";

    if (!formData.goods_type_code) newErrors.goods_type_code = "Phải chọn Loại Hàng Hóa (đang Active).";
    if (!formData.base_uom) newErrors.base_uom = "Phải chọn UoM gốc (UoM Type=Base & Active).";
    if (!formData.tracking_type) newErrors.tracking_type = "Phải chọn Tracking type hợp lệ.";
    
    if (modelGoods && modelGoods.status === 'Active' && formData.status === 'Inactive') {
        if (modelGoods.total_onhand_qty > 0) {
            const msg = "Không thể vô hiệu hóa Model Goods này vì vẫn còn tồn kho.";
            newErrors.status = msg;
            alert(msg);
        } else {
            const confirmed = window.confirm("Vô hiệu hóa Model Goods sẽ chặn phát sinh giao dịch mới. Tiếp tục?");
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
                <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mã model</p>
                <p className="text-sm text-gray-900 dark:text-gray-100 font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-md">{modelGoods?.model_code}</p>
             </div>
        )}
       
        <div className="md:col-span-2">
            <FormField label="Tên model" error={errors.model_name} required>
                <input type="text" name="model_name" value={formData.model_name} onChange={handleChange} className="w-full" maxLength={200} disabled={isViewMode} />
            </FormField>
        </div>

        <FormField label="Loại Hàng Hóa" error={errors.goods_type_code} required>
            <select name="goods_type_code" value={formData.goods_type_code} onChange={handleChange} className="w-full" disabled={isViewMode || isLocked}>
                <option value="">-- Chọn Loại Hàng Hóa --</option>
                {activeGoodsTypeOptions.map(gt => (
                    <option key={gt.id} value={gt.goods_type_code}>{gt.goods_type_name}</option>
                ))}
            </select>
        </FormField>
         <FormField label="Đơn vị gốc" error={errors.base_uom} required>
            <select name="base_uom" value={formData.base_uom} onChange={handleChange} className="w-full" disabled={isViewMode || isLocked}>
                <option value="">-- Chọn Đơn vị gốc --</option>
                {activeBaseUomOptions.map(uom => (
                    <option key={uom.id} value={uom.uom_code}>{uom.uom_name} ({uom.uom_code})</option>
                ))}
            </select>
        </FormField>
        
        <FormField label="Tracking type" error={errors.tracking_type} required>
            <select name="tracking_type" value={formData.tracking_type} onChange={handleChange} className="w-full" disabled={isViewMode || isLocked}>
                <option value="None">None</option>
                <option value="Serial">Serial</option>
                <option value="Lot">Lot</option>
            </select>
        </FormField>

        <FormField label="Trạng thái" error={errors.status}>
            <select name="status" value={formData.status} onChange={handleChange} className="w-full" disabled={isViewMode}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
            </select>
        </FormField>
        
        <div className="md:col-span-2">
            <FormField label="Mô tả" error={errors.description}>
                <textarea name="description" value={formData.description} onChange={handleChange} className="w-full" rows={3} maxLength={1000} disabled={isViewMode}></textarea>
            </FormField>
        </div>

      </div>
    </Modal>
  );
};
