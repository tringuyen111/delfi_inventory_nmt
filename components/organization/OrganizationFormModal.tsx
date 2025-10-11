import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Organization } from '../../types';
import { FormField } from '../ui/FormField';

type ModalMode = 'create' | 'edit' | 'view';

interface OrganizationFormModalProps {
  isOpen: boolean;
  mode: ModalMode;
  onClose: () => void;
  onSaveAndContinue: (org: Partial<Organization>) => Promise<void>;
  onSaveAndClose: (org: Partial<Organization>) => Promise<void>;
  onSwitchToEdit: () => void;
  organization: Organization | null;
  existingOrganizations: Organization[];
}

const INITIAL_STATE: Omit<Organization, 'id' | 'updated_at' | 'has_active_docs'> = {
    org_code: '',
    org_name: '',
    address: '',
    phone: '',
    email: '',
    status: 'Active',
};

export const OrganizationFormModal: React.FC<OrganizationFormModalProps> = ({ 
    isOpen, mode, onClose, onSaveAndContinue, onSaveAndClose, onSwitchToEdit, organization, existingOrganizations 
}) => {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (organization) {
      setFormData({
        org_code: organization.org_code,
        org_name: organization.org_name,
        address: organization.address || '',
        phone: organization.phone || '',
        email: organization.email || '',
        status: organization.status,
      });
    } else {
      setFormData(INITIAL_STATE);
    }
    setErrors({});
  }, [organization, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    // Name validation
    if (!formData.org_name.trim()) newErrors.org_name = "Organization Name is required.";
    if (formData.org_name.length > 120) newErrors.org_name = "Organization Name cannot exceed 120 characters.";
    const isDuplicate = existingOrganizations.some(
        (existing) => existing.org_name.toLowerCase() === formData.org_name.toLowerCase() && existing.id !== organization?.id
    );
    if (isDuplicate) newErrors.org_name = "Organization Name already exists (case-insensitive).";

    // Phone validation
    if (formData.phone && !/^[0-9()+\-\s]{6,20}$/.test(formData.phone)) {
        newErrors.phone = "Invalid phone number format.";
    }

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Invalid email format.";
    }

    // Inactivation Guard
    if (organization && organization.status === 'Active' && formData.status === 'Inactive' && organization.has_active_docs) {
        newErrors.status = "Cannot deactivate this Organization because it has active documents.";
        alert("Cannot deactivate this Organization because it has active documents. Please complete or cancel all transactions first.");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = async (andClose: boolean) => {
    if (!validate()) return;
    
    // Generate code on creation
    let codeToSave = organization?.org_code;
    if (!codeToSave) {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        // This is a simplification. A real app might call a DB function for a safe sequence.
        const seq = (existingOrganizations.length + 1).toString().padStart(4, '0');
        codeToSave = `ORG-${year}${month}-${seq}`;
    }

    const finalData = {
        ...(organization || {}),
        ...formData,
        org_code: codeToSave,
        org_name: formData.org_name.trim(),
        has_active_docs: organization?.has_active_docs || false,
    };
    
    if (andClose) {
        await onSaveAndClose(finalData);
    } else {
        await onSaveAndContinue(finalData);
    }
  };

  const isViewMode = mode === 'view';
  const isCreateMode = mode === 'create';

  const title = isCreateMode ? 'Create New Organization' :
                isViewMode ? `View Organization: ${organization?.org_code}` :
                `Edit Organization: ${organization?.org_code}`;

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
                <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Organization Code</p>
                <p className="text-sm text-gray-900 dark:text-gray-100 font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-md">{organization?.org_code}</p>
             </div>
        )}
       
        <div className={isCreateMode ? "md:col-span-2" : ""}>
            <FormField label="Organization Name" error={errors.org_name} required>
                <input type="text" name="org_name" value={formData.org_name} onChange={handleChange} className="w-full" maxLength={120} disabled={isViewMode} />
            </FormField>
        </div>

        <FormField label="Phone" error={errors.phone}>
            <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} className="w-full" disabled={isViewMode} />
        </FormField>
        <FormField label="Email" error={errors.email}>
            <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className="w-full" disabled={isViewMode} />
        </FormField>
        
        <div className="md:col-span-2">
            <FormField label="Address" error={errors.address}>
                <textarea name="address" value={formData.address || ''} onChange={handleChange} className="w-full" rows={3} maxLength={500} disabled={isViewMode}></textarea>
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