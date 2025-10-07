
import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
// FIX: Update type import from `../../types` which is now a valid module.
import { Uom } from '../../types';
import { FormField } from '../ui/FormField';

type ModalMode = 'create' | 'edit' | 'view';

interface UomFormModalProps {
  isOpen: boolean;
  mode: ModalMode;
  onClose: () => void;
  onSaveAndContinue: (uom: Uom) => void;
  onSaveAndClose: (uom: Uom) => void;
  onSwitchToEdit: () => void;
  uom: Uom | null;
  existingUoms: Uom[];
}

const INITIAL_UOM_STATE: Omit<Uom, 'id' | 'updated_at' | 'is_used_in_model_goods'> = {
    uom_code: '',
    uom_name: '',
    measurement_type: 'Piece',
    uom_type: 'Base',
    base_uom: undefined,
    conv_factor: undefined,
    description: '',
    status: 'Active',
};

export const UomFormModal: React.FC<UomFormModalProps> = ({ 
    isOpen, mode, onClose, onSaveAndContinue, onSaveAndClose, onSwitchToEdit, uom, existingUoms 
}) => {
  const [formData, setFormData] = useState<Omit<Uom, 'id' | 'updated_at' | 'is_used_in_model_goods'>>(INITIAL_UOM_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (uom) {
      setFormData(uom);
    } else {
      setFormData(INITIAL_UOM_STATE);
    }
    setErrors({});
  }, [uom, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };

    if (name === 'uom_type' && value === 'Base') {
        newFormData.base_uom = undefined;
        newFormData.conv_factor = undefined;
    }
    if (name === 'measurement_type' && formData.uom_type === 'Alt') {
        newFormData.base_uom = undefined;
    }

    setFormData(newFormData);
  };
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.uom_code.trim()) newErrors.uom_code = "Mã UoM là bắt buộc.";
    if (formData.uom_code.length > 10) newErrors.uom_code = "Mã UoM không được quá 10 ký tự.";

    const isDuplicate = existingUoms.some(
        (existing) => existing.uom_code.toLowerCase() === formData.uom_code.toLowerCase() && existing.id !== uom?.id
    );
    if (isDuplicate) newErrors.uom_code = "Mã UoM đã tồn tại (không phân biệt hoa/thường).";

    if (!formData.uom_name.trim()) newErrors.uom_name = "Tên UoM là bắt buộc.";
    
    if (formData.uom_type === 'Alt') {
        if (!formData.base_uom) newErrors.base_uom = "UoM gốc là bắt buộc.";
        if (!formData.conv_factor || formData.conv_factor <= 0) newErrors.conv_factor = "Hệ số quy đổi phải lớn hơn 0.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = (andClose: boolean) => {
    if (!validate()) return;
    
    const finalUom: Uom = {
        ...(uom || { id: '', is_used_in_model_goods: false }),
        ...formData,
        uom_code: formData.uom_code.toUpperCase().trim(),
        updated_at: new Date().toISOString(),
    };
    
    if (andClose) {
        onSaveAndClose(finalUom);
    } else {
        onSaveAndContinue(finalUom);
    }
  };

  const baseUomOptions = existingUoms.filter(u => u.uom_type === 'Base' && u.measurement_type === formData.measurement_type);

  const isViewMode = mode === 'view';
  const isCreateMode = mode === 'create';
  const isLocked = uom?.is_used_in_model_goods ?? false;

  const title = isCreateMode ? 'Create New UoM' :
                isViewMode ? `View UoM Details: ${uom?.uom_code}` :
                `Edit UoM: ${uom?.uom_code}`;

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
        <FormField label="Mã UoM" error={errors.uom_code} required>
            <input type="text" name="uom_code" value={formData.uom_code} onChange={handleChange} className="w-full" maxLength={10} disabled={!isCreateMode} />
        </FormField>
        <FormField label="Tên UoM" error={errors.uom_name} required>
            <input type="