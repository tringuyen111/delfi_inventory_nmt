import React, { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Icon } from '../Icons';

interface AvatarCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newAvatarUrl: string) => void;
}

const MOCK_AVATAR_URL = 'https://i.pravatar.cc/512?img=';

export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({ isOpen, onClose, onSave }) => {
  const [step, setStep] = useState<'choose' | 'crop'>('choose');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Only JPG/PNG images are supported.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB
      setError('File size cannot exceed 2MB.');
      return;
    }
    
    // Simulate reading the file
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setStep('crop');
    };
    reader.onerror = () => {
        setError('Could not load image. Please try again.');
    };
    reader.readAsDataURL(file);
  };
  
  const handleSave = () => {
    // In a real app, you would upload the cropped blob.
    // Here, we'll just generate a new mock URL.
    const randomId = Math.floor(Math.random() * 70) + 1;
    onSave(`${MOCK_AVATAR_URL}${randomId}`);
  };

  const handleReset = () => {
    setStep('choose');
    setImageSrc(null);
    setError(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
      handleReset();
      onClose();
  }

  const renderStepContent = () => {
    if (step === 'choose') {
      return (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <Icon name="Camera" className="w-16 h-16 text-gray-400 mb-4"/>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 font-medium rounded-md bg-brand-primary text-white hover:bg-blue-700"
          >
            Choose File
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".jpg,.jpeg,.png" className="hidden" />
          {error && <p className="text-sm text-brand-danger mt-4">{error}</p>}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Max size: 2MB</p>
        </div>
      );
    }

    if (step === 'crop' && imageSrc) {
      return (
        <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">Adjust your image. The final avatar will be circular.</p>
            <div className="w-64 h-64 bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
                <img src={imageSrc} alt="Preview" className="w-full h-full object-contain" />
                {/* Simulated circular crop overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-40" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0 50%, 50% 50%, 50% 0, 50% 50%, 50% 100%, 50% 50%, 100% 50%, 50% 50%, 0 50%)' }}></div>
                <div className="absolute inset-0 border-4 border-dashed border-white rounded-full"></div>
            </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Update Profile Picture"
      footer={
        <>
            <button onClick={handleClose} className="px-4 py-2 text-sm font-medium rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">
                Cancel
            </button>
            {step === 'crop' && (
                 <button onClick={handleReset} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">
                    Choose Another
                </button>
            )}
            <button onClick={handleSave} disabled={step !== 'crop'} className="px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                Save
            </button>
        </>
      }
    >
      {renderStepContent()}
    </Modal>
  );
};