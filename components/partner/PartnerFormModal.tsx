import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Partner, PartnerType } from '../../types';
import { FormField } from '../ui/FormField';
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown';

type ModalMode = 'create' | 'edit' | 'view';

interface PartnerFormModalProps {
  isOpen: boolean;
  mode: ModalMode;
  onClose: () => void;
  onSaveAndContinue: (partner: Omit<Partner, 'id' | 'updated_at' | 'has_active_docs'>) => void;
  onSaveAndClose: (partner: Omit<Partner, 'id' | 'updated_at' | 'has_active_docs'>) => void;
  onSwitchToEdit: () => void;
  partner: Partner | null;
  existingPartners: Partner[];
}

const partnerTypeOptions: PartnerType[] = ['Supplier', 'Customer', '3PL', 'Internal'];

const INITIAL_STATE: Omit<Partner, 'id' | 'updated_at' | 'has_active_docs'> = {
    partner_code: '',
    partner_name: '',
    partner_type: [],
    tax_code: '',
    address: '',
    phone: '',
    email: '',
    status: 'Active',
};

export const PartnerFormModal: React.FC<PartnerFormModalProps> = ({ 
    isOpen, mode, onClose, onSaveAndContinue, onSaveAndClose, onSwitchToEdit, partner, existingPartners 
}) => {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (partner) {
      setFormData({
        partner_code: partner.partner_code,
        partner_name: partner.partner_name,
        partner_type: partner.partner_type,
        tax_code: partner.tax_code || '',
        address: partner.address || '',
        phone: partner.phone || '',
        email: partner.email || '',
        status: partner.status,
      });
    } else {
      setFormData(INITIAL_STATE);
    }
    setErrors({});
  }, [partner, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (selectedTypes: PartnerType[]) => {
    setFormData(prev => ({ ...prev, partner_type: selectedTypes }));
    if(errors.partner_type) {
        setErrors(prev => {
            const newErrors = {...prev};
            delete newErrors.partner_type;
            return newErrors;
        });
    }
  };
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.partner_code.trim()) newErrors.partner_code = "Mã đối tác là bắt buộc.";
    if (formData.partner_code.length > 30) newErrors.partner_code = "Mã đối tác không được quá 30 ký tự.";
    let isDuplicateCode = existingPartners.some(
        (p) => p.partner_code.toLowerCase() === formData.partner_code.toLowerCase() && p.id !== partner?.id
    );
    if (isDuplicateCode) newErrors.partner_code = "Mã đối tác đã tồn tại.";

    if (!formData.partner_name.trim()) newErrors.partner_name = "Tên đối tác là bắt buộc.";
    if (formData.partner_name.length > 180) newErrors.partner_name = "Tên đối tác không được quá 180 ký tự.";

    if (formData.partner_type.length === 0) newErrors.partner_type = "Phải chọn ít nhất một Loại đối tác.";

    if (formData.phone && !/^[0-9()+\-\s]{6,20}$/.test(formData.phone)) {
        newErrors.phone = "Số điện thoại không hợp lệ.";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Email không hợp lệ.";
    }

    if (partner && partner.status === 'Active' && formData.status === 'Inactive' && partner.has_active_docs) {
        newErrors.status = "Không thể vô hiệu hóa đối tác này vì đang có các giao dịch chưa hoàn tất.";
        alert("Không thể vô hiệu hóa đối tác này vì đang có các giao dịch chưa hoàn tất. Vui lòng xử lý các giao dịch liên quan trước.");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = (andClose: boolean) => {
    if (!validate()) return;
    
    const finalData = {
        ...formData,
        partner_code: formData.partner_code.toUpperCase().trim(),
        partner_name: formData.partner_name.trim(),
    };
    
    if (andClose) {
        onSaveAndClose(finalData);
    } else {
        onSaveAndContinue(finalData);
    }
  };

  const isViewMode = mode === 'view';
  const isCreateMode = mode === 'create';

  const title = isCreateMode ? 'Create New Partner' :
                isViewMode ? `View Partner: ${partner?.partner_code}` :
                `Edit Partner: ${partner?.partner_code}`;

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
        <FormField label="Mã đối tác" error={errors.partner_code} required>
            <input type="text" name="partner_code" value={formData.partner_code} onChange={handleChange} className="w-full" maxLength={30} disabled={!isCreateMode} />
        </FormField>
         <div className="md:col-span-2">
            <FormField label="Tên đối tác" error={errors.partner_name} required>
                <input type="text" name="partner_name" value={formData.partner_name} onChange={handleChange} className="w-full" maxLength={180} disabled={isViewMode} />
            </FormField>
        </div>
        
        <div className="md:col-span-2">
             <FormField label="Loại đối tác" error={errors.partner_type} required>
                <MultiSelectDropdown
                    options={partnerTypeOptions}
                    selectedOptions={formData.partner_type}
                    onChange={handleTypeChange}
                    placeholder="Select types..."
                    disabled={isViewMode}
                />
            </FormField>
        </div>


        <FormField label="Mã số thuế" error={errors.tax_code}>
            <input type="text" name="tax_code" value={formData.tax_code} onChange={handleChange} className="w-full" maxLength={20} disabled={isViewMode} />
        </FormField>
        <FormField label="Số điện thoại" error={errors.phone}>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full" disabled={isViewMode} />
        </FormField>

        <div className="md:col-span-2">
            <FormField label="Email" error={errors.email}>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full" disabled={isViewMode} />
            </FormField>
        </div>
        
        <div className="md:col-span-2">
            <FormField label="Địa chỉ" error={errors.address}>
                <textarea name="address" value={formData.address} onChange={handleChange} className="w-full" rows={3} maxLength={500} disabled={isViewMode}></textarea>
            </FormField>
        </div>

        <FormField label="Trạng thái" error={errors.status}>
            <select name="status" value={formData.status} onChange={handleChange} className="w-full" disabled={isViewMode}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
            </select>
        </FormField>
      </div>
    </Modal>
  );
};