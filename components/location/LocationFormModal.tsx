import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Location, Warehouse, GoodsType } from '../../types';
import { FormField } from '../ui/FormField';
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown';

type ModalMode = 'create' | 'edit' | 'view';

interface LocationFormModalProps {
  isOpen: boolean;
  mode: ModalMode;
  onClose: () => void;
  onSaveAndContinue: (location: Omit<Location, 'id' | 'updated_at' | 'onhand_qty'>) => void;
  onSaveAndClose: (location: Omit<Location, 'id' | 'updated_at' | 'onhand_qty'>) => void;
  onSwitchToEdit: () => void;
  location: Location | null;
  existingLocations: Location[];
  warehouses: Warehouse[];
  goodsTypes: GoodsType[];
}

const INITIAL_STATE: Omit<Location, 'id' | 'updated_at' | 'onhand_qty'> = {
    loc_code: '',
    loc_name: '',
    wh_code: '',
    allowed_goods_types: [],
    blocked_goods_types: [],
    status: 'Active',
};

export const LocationFormModal: React.FC<LocationFormModalProps> = ({ 
    isOpen, mode, onClose, onSaveAndContinue, onSaveAndClose, onSwitchToEdit, location, existingLocations, warehouses, goodsTypes 
}) => {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const activeGoodsTypeOptions = goodsTypes
    .filter(gt => gt.status === 'Active')
    .map(gt => gt.goods_type_code);

  useEffect(() => {
    if (location) {
      setFormData({
        loc_code: location.loc_code,
        loc_name: location.loc_name,
        wh_code: location.wh_code,
        allowed_goods_types: location.allowed_goods_types || [],
        blocked_goods_types: location.blocked_goods_types || [],
        status: location.status,
      });
    } else {
      setFormData(INITIAL_STATE);
    }
    setErrors({});
  }, [location, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAllowedChange = (selected: string[]) => {
    setFormData(prev => ({...prev, allowed_goods_types: selected}));
  }

  const handleBlockedChange = (selected: string[]) => {
    setFormData(prev => ({...prev, blocked_goods_types: selected}));
  }
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.loc_code.trim()) newErrors.loc_code = "Location Code is required (<=10 chars).";
    if (formData.loc_code.length > 10) newErrors.loc_code = "Location Code is required (<=10 chars).";
    
    if (!formData.loc_name.trim()) newErrors.loc_name = "Location Name is required (<=120 chars).";
    if (formData.loc_name.length > 120) newErrors.loc_name = "Location Name is required (<=120 chars).";

    if (!formData.wh_code) newErrors.wh_code = "Warehouse must be selected.";

    const isDuplicateCode = existingLocations.some(
        l => l.wh_code === formData.wh_code && l.loc_code.toLowerCase() === formData.loc_code.trim().toLowerCase() && l.id !== location?.id
    );
    if (isDuplicateCode) newErrors.loc_code = "Location Code already exists in this warehouse.";

    const isDuplicateName = existingLocations.some(
        l => l.wh_code === formData.wh_code && l.loc_name.toLowerCase() === formData.loc_name.trim().toLowerCase() && l.id !== location?.id
    );
    if (isDuplicateName) newErrors.loc_name = "Location Name already exists in this warehouse.";

    if (location && location.status === 'Active' && formData.status === 'Inactive' && location.onhand_qty > 0) {
        const msg = "Cannot deactivate this location as it still contains on-hand stock.";
        newErrors.status = msg;
        alert(msg);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = (andClose: boolean) => {
    if (!validate()) return;
    
    const finalData = {
        ...formData,
        loc_code: formData.loc_code.toUpperCase().trim(),
        loc_name: formData.loc_name.trim(),
    };
    
    if (andClose) {
        onSaveAndClose(finalData);
    } else {
        onSaveAndContinue(finalData);
    }
  };

  const isViewMode = mode === 'view';
  const isCreateMode = mode === 'create';

  const title = isCreateMode ? 'Create New Location' :
                isViewMode ? `View Location: ${location?.loc_code}` :
                `Edit Location: ${location?.loc_code}`;

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
        <FormField label="Location Code" error={errors.loc_code} required>
            <input type="text" name="loc_code" value={formData.loc_code} onChange={handleChange} className="w-full" maxLength={10} disabled={!isCreateMode} />
        </FormField>
         <FormField label="Warehouse" error={errors.wh_code} required>
            <select name="wh_code" value={formData.wh_code} onChange={handleChange} className="w-full" disabled={!isCreateMode}>
                <option value="">-- Select Warehouse --</option>
                {warehouses.map(w => (
                    <option key={w.id} value={w.wh_code}>{w.wh_name}</option>
                ))}
            </select>
        </FormField>
        <div className="md:col-span-2">
            <FormField label="Location Name" error={errors.loc_name} required>
                <input type="text" name="loc_name" value={formData.loc_name} onChange={handleChange} className="w-full" maxLength={120} disabled={isViewMode} />
            </FormField>
        </div>
        
        <div className="md:col-span-2">
             <FormField label="Allowed Goods Types" error={errors.allowed_goods_types}>
                <MultiSelectDropdown
                    options={activeGoodsTypeOptions}
                    selectedOptions={formData.allowed_goods_types || []}
                    onChange={handleAllowedChange}
                    placeholder="No restrictions"
                    disabled={isViewMode}
                    disabledOptions={formData.blocked_goods_types}
                />
            </FormField>
        </div>
        <div className="md:col-span-2">
             <FormField label="Blocked Goods Types" error={errors.blocked_goods_types}>
                <MultiSelectDropdown
                    options={activeGoodsTypeOptions}
                    selectedOptions={formData.blocked_goods_types || []}
                    onChange={handleBlockedChange}
                    placeholder="No restrictions"
                    disabled={isViewMode}
                    disabledOptions={formData.allowed_goods_types}
                />
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