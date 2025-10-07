import React, { useState } from 'react';
import { UserProfile } from '../types';
import { SectionCard } from '../components/SectionCard';
import { FormField } from '../components/ui/FormField';
import { Avatar } from '../components/ui/Avatar';
import { Toast } from '../components/ui/Toast';
import { AvatarCropModal } from '../components/profile/AvatarCropModal';

interface ProfilePageProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
}

type FormData = Omit<UserProfile, 'id' | 'avatar_url' | 'email' | 'role' | 'avatar_version'>;

const ProfilePage: React.FC<ProfilePageProps> = ({ userProfile, onUpdateProfile }) => {
  const [formData, setFormData] = useState<FormData>({
    display_name: userProfile.display_name,
    phone: userProfile.phone,
    gender: userProfile.gender,
    birth_year: userProfile.birth_year,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value === '' ? null : value }));
  };
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.display_name || !formData.display_name.trim()) {
      newErrors.display_name = "Tên hiển thị bắt buộc, ≤120 ký tự.";
    } else if (formData.display_name.length > 120) {
      newErrors.display_name = "Tên hiển thị bắt buộc, ≤120 ký tự.";
    }

    if (formData.phone && !/^[0-9()+\-\s]{6,20}$/.test(formData.phone)) {
        newErrors.phone = "Số điện thoại không hợp lệ.";
    }

    if (formData.birth_year) {
        const year = Number(formData.birth_year);
        const currentYear = new Date().getFullYear();
        if (isNaN(year) || year < 1900 || year > currentYear - 10) {
            newErrors.birth_year = `Năm sinh phải hợp lệ (≥1900 và ≤ ${currentYear - 10}).`;
        }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSave = () => {
    if (!validate()) return;
    const updatedProfile = { ...userProfile, ...formData };
    onUpdateProfile(updatedProfile);
    setToastInfo({ message: 'Cập nhật hồ sơ thành công', type: 'success' });
  };

  const handleCancel = () => {
    setFormData({
        display_name: userProfile.display_name,
        phone: userProfile.phone,
        gender: userProfile.gender,
        birth_year: userProfile.birth_year,
    });
    setErrors({});
  };

  const handleAvatarSave = (newAvatarUrl: string) => {
    const updatedProfile = { ...userProfile, avatar_url: newAvatarUrl, avatar_version: userProfile.avatar_version + 1 };
    onUpdateProfile(updatedProfile);
    setToastInfo({ message: 'Cập nhật ảnh đại diện thành công', type: 'success' });
    setIsAvatarModalOpen(false);
  };

  const handleRemoveAvatar = () => {
    if (window.confirm('Are you sure you want to remove your avatar?')) {
        const updatedProfile = { ...userProfile, avatar_url: null, avatar_version: userProfile.avatar_version + 1 };
        onUpdateProfile(updatedProfile);
        setToastInfo({ message: 'Đã gỡ ảnh đại diện', type: 'success' });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Panel: Avatar Management */}
      <div className="lg:col-span-1">
        <SectionCard title="Ảnh đại diện" icon="User">
          <div className="flex flex-col items-center gap-4">
            <Avatar user={userProfile} size="xl" />
            <button
              onClick={() => setIsAvatarModalOpen(true)}
              className="w-full px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-blue-700"
            >
              Thay đổi ảnh đại diện
            </button>
            {userProfile.avatar_url && (
              <button
                onClick={handleRemoveAvatar}
                className="w-full px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Gỡ ảnh
              </button>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
              Hỗ trợ JPG/PNG, dung lượng tối đa 2MB.
            </p>
          </div>
        </SectionCard>
      </div>

      {/* Right Panel: Profile Form */}
      <div className="lg:col-span-2">
        <SectionCard title="Thông tin cá nhân" icon="ClipboardList">
          <div className="space-y-4">
            <FormField label="Tên hiển thị" error={errors.display_name} required>
              <input type="text" name="display_name" value={formData.display_name || ''} onChange={handleChange} className="w-full" />
            </FormField>
            
            <FormField label="Email">
                <input type="email" name="email" value={userProfile.email} className="w-full" disabled />
            </FormField>

            <FormField label="Số điện thoại" error={errors.phone}>
              <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} className="w-full" />
            </FormField>

            <FormField label="Giới tính" error={errors.gender}>
              <select name="gender" value={formData.gender || ''} onChange={handleChange} className="w-full">
                <option value="">-- Not specified --</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </FormField>
            
            <FormField label="Năm sinh" error={errors.birth_year}>
              <input type="number" name="birth_year" value={formData.birth_year || ''} onChange={handleChange} className="w-full" />
            </FormField>
            
            <FormField label="Vai trò">
                <input type="text" name="role" value={userProfile.role} className="w-full" disabled />
            </FormField>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={handleCancel} className="px-4 py-2 text-sm font-medium rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">
              Cancel
            </button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-blue-700">
              Save
            </button>
          </div>
        </SectionCard>
      </div>
      
      {isAvatarModalOpen && (
        <AvatarCropModal
            isOpen={isAvatarModalOpen}
            onClose={() => setIsAvatarModalOpen(false)}
            onSave={handleAvatarSave}
        />
      )}

      {toastInfo && (
        <Toast
          message={toastInfo.message}
          type={toastInfo.type}
          onClose={() => setToastInfo(null)}
        />
      )}
    </div>
  );
};

export default ProfilePage;
