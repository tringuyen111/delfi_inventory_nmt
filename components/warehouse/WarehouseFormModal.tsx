import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Warehouse, Branch } from '../../types';
import { FormField } from '../ui/FormField';

type ModalMode = 'create' | 'edit' | 'view';

interface WarehouseFormModalProps {
  isOpen: boolean;
  mode: ModalMode;
  onClose: () => void;
  onSaveAndContinue: (warehouse: Omit<Warehouse, 'id' | 'updated_at'>) => void;
  onSaveAndClose: (warehouse: Omit<Warehouse, 'id' | 'updated_at'>) => void;
  onSwitchToEdit: () => void;
  warehouse: Warehouse | null;
  existingWarehouses: Warehouse[];
  branches: Branch[];
}

const INITIAL_STATE: Omit<Warehouse, 'id' | 'updated_at'> = {
    wh_code: '',
    wh_name: '',
    branch_code: '',
    address: '',
    capacity: undefined,
    warehouse_type: undefined,
    status: 'Active',
};

export const WarehouseFormModal: React.FC<WarehouseFormModalProps> = ({ 
    isOpen, mode, onClose, onSaveAndContinue, onSaveAndClose, onSwitchToEdit, warehouse, existingWarehouses, branches 
}) => {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (warehouse) {
      setFormData({
        wh_code: warehouse.wh_code,
        wh_name: warehouse.wh_name,
        branch_code: warehouse.branch_code,
        address: warehouse.address || '',
        capacity: warehouse.capacity,
        warehouse_type: warehouse.warehouse_type,
        status: warehouse.status,
      });
    } else {
      setFormData(INITIAL_STATE);
    }
    setErrors({});
  }, [warehouse, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.wh_code.trim()) newErrors.wh_code = "Warehouse Code is required.";
    if (formData.wh_code.length > 15) newErrors.wh_code = "Warehouse Code cannot exceed 15 characters.";
    let isDuplicateCode = existingWarehouses.some(
        (w) => w.wh_code.toLowerCase() === formData.wh_code.toLowerCase() && w.id !== warehouse?.id
    );
    if (isDuplicateCode) newErrors.wh_code = "Warehouse Code already exists.";

    if (!formData.wh_name.trim()) newErrors.wh_name = "Warehouse Name is required.";
    if (formData.wh_name.length > 120) newErrors.wh_name = "Warehouse Name cannot exceed 120 characters.";
    let isDuplicateName = existingWarehouses.some(
        (w) => w.wh_name.toLowerCase() === formData.wh_name.toLowerCase() && w.id !== warehouse?.id
    );
    if (isDuplicateName) newErrors.wh_name = "Warehouse Name already exists.";

    if (!formData.branch_code) newErrors.branch_code = "Branch is required.";

    if (formData.capacity && formData.capacity < 0) {
        newErrors.capacity = "Capacity must be a number >= 0.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = (andClose: boolean) => {
    if (!validate()) return;
    
    if (warehouse && warehouse.status === 'Active' && formData.status === 'Inactive') {
        const confirmed = window.confirm("This action will deactivate the Warehouse and ALL its associated Locations. Are you sure you want to continue?");
        if (!confirmed) {
            return; 
        }
    }

    const finalData = {
        ...formData,
        wh_code: formData.wh_code.toUpperCase().trim(),
        wh_name: formData.wh_name.trim(),
        capacity: formData.capacity ? Number(formData.capacity) : undefined,
    };
    
    if (andClose) {
        onSaveAndClose(finalData);
    } else {
        onSaveAndContinue(finalData);
    }
  };

  const isViewMode = mode === 'view';
  const isCreateMode = mode === 'create';

  const title = isCreateMode ? 'Create New Warehouse' :
                isViewMode ? `View Warehouse: ${warehouse?.wh_code}` :
                `Edit Warehouse: ${warehouse?.wh_code}`;

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
        <FormField label="Warehouse Code" error={errors.wh_code} required>
            <input type="text" name="wh_code" value={formData.wh_code} onChange={handleChange} className="w-full" maxLength={15} disabled={!isCreateMode} />
        </FormField>
         <FormField label="Branch" error={errors.branch_code} required>
            <select name="branch_code" value={formData.branch_code} onChange={handleChange} className="w-full" disabled={!isCreateMode}>
                <option value="">-- Select Branch --</option>
                {branches.map(b => (
                    <option key={b.id} value={b.branch_code}>{b.branch_name}</option>
                ))}
            </select>
        </FormField>
        <div className="md:col-span-2">
            <FormField label="Warehouse Name" error={errors.wh_name} required>
                <input type="text" name="wh_name" value={formData.wh_name} onChange={handleChange} className="w-full" maxLength={120} disabled={isViewMode} />
            </FormField>
        </div>

        <FormField label="Capacity" error={errors.capacity}>
            <input type="number" name="capacity" value={formData.capacity || ''} onChange={handleChange} className="w-full" disabled={isViewMode} min="0" />
        </FormField>
        <FormField label="Warehouse Type" error={errors.warehouse_type}>
             <select name="warehouse_type" value={formData.warehouse_type || ''} onChange={handleChange} className="w-full" disabled={isViewMode}>
                <option value="">-- Select type --</option>
                <option value="Central">Central</option>
                <option value="Sub">Sub</option>
                <option value="Virtual">Virtual</option>
            </select>
        </FormField>
        
        <div className="md:col-span-2">
            <FormField label="Address" error={errors.address}>
                <textarea name="address" value={formData.address} onChange={handleChange} className="w-full" rows={3} maxLength={500} disabled={isViewMode}></textarea>
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