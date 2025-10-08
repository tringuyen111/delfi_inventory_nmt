import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { GoodsType } from '../../types';
import { FormField } from '../ui/FormField';

type ModalMode = 'create' | 'edit' | 'view';

interface GoodsTypeFormModalProps {
  isOpen: boolean;
  mode: ModalMode;
  onClose: () => void;
  onSaveAndContinue: (goodsType: Omit<GoodsType, 'id' | 'updated_at' | 'usage_count'>) => void;
  onSaveAndClose: (goodsType: Omit<GoodsType, 'id' | 'updated_at' | 'usage_count'>) => void;
  onSwitchToEdit: () => void;
  goodsType: GoodsType | null;
  existingGoodsTypes: GoodsType[];
}

const INITIAL_STATE: Omit<GoodsType, 'id' | 'updated_at' | 'usage_count'> = {
    goods_type_code: '',
    goods_type_name: '',
    description: '',
    status: 'Active',
};

export const GoodsTypeFormModal: React.FC<GoodsTypeFormModalProps> = ({ 
    isOpen, mode, onClose, onSaveAndContinue, onSaveAndClose, onSwitchToEdit, goodsType, existingGoodsTypes 
}) => {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (goodsType) {
      setFormData({
        goods_type_code: goodsType.goods_type_code,
        goods_type_name: goodsType.goods_type_name,
        description: goodsType.description || '',
        status: goodsType.status,
      });
    } else {
      setFormData(INITIAL_STATE);
    }
    setErrors({});
  }, [goodsType, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    // Code validation
    if (!formData.goods_type_code.trim()) newErrors.goods_type_code = "Goods Type Code is required.";
    if (formData.goods_type_code.length > 15) newErrors.goods_type_code = "Goods Type Code cannot exceed 15 characters.";
    let isDuplicateCode = existingGoodsTypes.some(
        (gt) => gt.goods_type_code.toLowerCase() === formData.goods_type_code.toLowerCase() && gt.id !== goodsType?.id
    );
    if (isDuplicateCode) newErrors.goods_type_code = "Goods Type Code already exists.";

    // Name validation
    if (!formData.goods_type_name.trim()) newErrors.goods_type_name = "Goods Type Name is required.";
    if (formData.goods_type_name.length > 180) newErrors.goods_type_name = "Goods Type Name cannot exceed 180 characters.";
    let isDuplicateName = existingGoodsTypes.some(
        (gt) => gt.goods_type_name.toLowerCase() === formData.goods_type_name.toLowerCase() && gt.id !== goodsType?.id
    );
    if (isDuplicateName) newErrors.goods_type_name = "Goods Type Name already exists.";
    
    // Inactivation Guard
    if (goodsType && goodsType.status === 'Active' && formData.status === 'Inactive' && goodsType.usage_count > 0) {
        const errorMsg = "Cannot deactivate this Goods Type as it is in use by a Model Goods or Location.";
        newErrors.status = errorMsg;
        alert(errorMsg);
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = (andClose: boolean) => {
    if (!validate()) return;
    
    const finalData = {
        ...formData,
        goods_type_code: formData.goods_type_code.toUpperCase().trim(),
        goods_type_name: formData.goods_type_name.trim(),
    };
    
    if (andClose) {
        onSaveAndClose(finalData);
    } else {
        onSaveAndContinue(finalData);
    }
  };

  const isViewMode = mode === 'view';
  const isCreateMode = mode === 'create';

  const title = isCreateMode ? 'Create New Goods Type' :
                isViewMode ? `View Goods Type: ${goodsType?.goods_type_code}` :
                `Edit Goods Type: ${goodsType?.goods_type_code}`;

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
        <FormField label="Goods Type Code" error={errors.goods_type_code} required>
            <input type="text" name="goods_type_code" value={formData.goods_type_code} onChange={handleChange} className="w-full" maxLength={15} disabled={!isCreateMode} />
        </FormField>
         <FormField label="Goods Type Name" error={errors.goods_type_name} required>
            <input type="text" name="goods_type_name" value={formData.goods_type_name} onChange={handleChange} className="w-full" maxLength={180} disabled={isViewMode} />
        </FormField>
        
        <div className="md:col-span-2">
            <FormField label="Description" error={errors.description}>
                <textarea name="description" value={formData.description} onChange={handleChange} className="w-full" rows={3} maxLength={500} disabled={isViewMode}></textarea>
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