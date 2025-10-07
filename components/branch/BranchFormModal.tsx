
import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Branch, Organization } from '../../types';
import { FormField } from '../ui/FormField';

type ModalMode = 'create' | 'edit' | 'view';

interface BranchFormModalProps {
  isOpen: boolean;
  mode: ModalMode;
  onClose: () => void;
  onSaveAndContinue: (branch: Omit<Branch, 'id' | 'updated_at'>) => void;
  onSaveAndClose: (branch: Omit<Branch, 'id' | 'updated_at'>) => void;
  onSwitchToEdit: () => void;
  branch: Branch | null;
  existingBranches: Branch[];
  organizations: Organization[];
}

const INITIAL_STATE: Omit<Branch, 'id' | 'updated_at'> = {
    branch_code: '',
    branch_name: '',
    org_code: '',
    address: '',
    phone: '',
    email: '',
    status: 'Active',
};

export const BranchFormModal: React.FC<BranchFormModalProps> = ({ 
    isOpen, mode, onClose, onSaveAndContinue, onSaveAndClose, onSwitchToEdit, branch, existingBranches, organizations 
}) => {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (branch) {
      setFormData({
        branch_code: branch.branch_code,
        branch_name: branch.branch_name,
        org_code: branch.org_code,
        address: branch.address || '',
        phone: branch.phone || '',
        email: branch.email || '',
        status: branch.status,
      });
    } else {
      setFormData(INITIAL_STATE);
    }
    setErrors({});
  }, [branch, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.branch_code.trim()) newErrors.branch_code = "Mã Chi nhánh là bắt buộc.";
    if (formData.branch_code.length > 15) newErrors.branch_code = "Mã Chi nhánh không được quá 15 ký tự.";
    let isDuplicateCode = existingBranches.some(
        (b) => b.branch_code.toLowerCase() === formData.branch_code.toLowerCase() && b.id !== branch?.id
    );
    if (isDuplicateCode) newErrors.branch_code = "Mã Chi nhánh đã tồn tại.";

    if (!formData.branch_name.trim()) newErrors.branch_name = "Tên Chi nhánh là bắt buộc.";
    if (formData.branch_name.length > 120) newErrors.branch_name = "Tên Chi nhánh không được quá 120 ký tự.";
    let isDuplicateName = existingBranches.some(
        (b) => b.branch_name.toLowerCase() === formData.branch_name.toLowerCase() && b.id !== branch?.id
    );
    if (isDuplicateName) newErrors.branch_name = "Tên Chi nhánh đã tồn tại.";

    if (!formData.org_code) newErrors.org_code = "Phải chọn Tổ chức.";

    if (formData.phone && !/^[0-9()+\-\s]{6,20}$/.test(formData.phone)) {
        newErrors.phone = "Số điện thoại không hợp lệ.";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^s@]+$/.test(formData.email)) {
        newErrors.email = "Email không hợp lệ.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = (andClose: boolean) => {
    if (!validate()) return;
    
    // Inactivation confirmation
    if (branch && branch.status === 'Active' && formData.status === 'Inactive') {
        const confirmed = window.confirm("Hành động này sẽ vô hiệu hóa Chi nhánh và TẤT CẢ các Kho trực thuộc. Bạn có chắc chắn muốn tiếp tục?");
        if (!confirmed) {
            return; // Abort save
        }
    }

    const finalData = {
        ...formData,
        branch_code: formData.branch_code.toUpperCase().trim(),
        branch_name: formData.branch_name.trim(),
    };
    
    if (andClose) {
        onSaveAndClose(finalData);
    } else {
        onSaveAndContinue(finalData);
    }
  };

  const isViewMode = mode === 'view';
  const isCreateMode = mode === 'create';

  const title = isCreateMode ? 'Create New Branch' :
                isViewMode ? `View Branch: ${branch?.branch_code}` :
                `Edit Branch: ${branch?.branch_code}`;

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
        <FormField label="Mã Chi nhánh" error={errors.branch_code} required>
            <input type="text" name="branch_code" value={formData.branch_code} onChange={handleChange} className="w-full" maxLength={15} disabled={!isCreateMode} />
        </FormField>
         <FormField label="Tổ chức" error={errors.org_code} required>
            <select name="org_code" value={formData.org_code} onChange={handleChange} className="w-full" disabled={!isCreateMode}>
                <option value="">-- Chọn Tổ chức --</option>
                {organizations.map(org => (
                    <option key={org.id} value={org.org_code}>{org.org_name}</option>
                ))}
            </select>
        </FormField>
        <div className="md:col-span-2">
            <FormField label="Tên Chi nhánh" error={errors.branch_name} required>
                <input type="text" name="branch_name" value={formData.branch_name} onChange={handleChange} className="w-full" maxLength={120} disabled={isViewMode} />
            </FormField>
        </div>

        <FormField label="Số điện thoại" error={errors.phone}>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full" disabled={isViewMode} />
        </FormField>
        <FormField label="Email" error={errors.email}>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full" disabled={isViewMode} />
        </FormField>
        
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
