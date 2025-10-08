import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { GoodsIssueLine, GoodsIssueLotDetail, GoodsIssueSerialDetail, GoodsIssueNoneDetail, OnhandByLocation } from '../../types';
import { FormField } from '../ui/FormField';
import { useLanguage } from '../../hooks/useLanguage';

interface AddCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: (GoodsIssueSerialDetail | GoodsIssueLotDetail | GoodsIssueNoneDetail)[], location: string) => void;
  line: GoodsIssueLine | null;
  onhandForModelInWh: OnhandByLocation[];
  onhandLots: Record<string, any[]>;
  onhandSerials: Record<string, any[]>;
}

export const AddCodeModal: React.FC<AddCodeModalProps> = ({ isOpen, onClose, onSave, line, onhandForModelInWh, onhandLots, onhandSerials }) => {
  const { t } = useLanguage();
  if (!line) return null;

  const [localDetails, setLocalDetails] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [lotErrors, setLotErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
        setLocalDetails(line.details || []);
        setSelectedLocation(line.location_code || '');
        setLotErrors({});
    }
  }, [line, isOpen]);

  const handleSave = () => {
    if (!selectedLocation) {
        alert(t('pages.goodsIssue.modal.addCodeModal.selectLocation'));
        return;
    }
    onSave(localDetails, selectedLocation);
  };

  const handleLocationChange = (locationCode: string) => {
    if (locationCode !== selectedLocation) {
        setLocalDetails([]);
        setLotErrors({});
    }
    setSelectedLocation(locationCode);
  };

  const onhandForSelectedLocation = onhandForModelInWh.find(o => o.loc_code === selectedLocation);

  const renderContent = () => {
    if (!selectedLocation) {
        return <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t('pages.goodsIssue.modal.addCodeModal.selectLocationFirst')}</p>;
    }

    const editorProps = {
        line: { ...line, onhand: onhandForSelectedLocation?.available_qty || 0 },
        details: localDetails,
        setDetails: setLocalDetails,
    };

    switch(line.tracking_type) {
      case 'None':
        return <NoneEditor {...editorProps} t={t} />;
      case 'Lot':
        return <LotEditor 
                    {...editorProps} 
                    availableLots={onhandLots[`${line.model_code}-${selectedLocation}`] || []} 
                    lotErrors={lotErrors}
                    setLotErrors={setLotErrors}
                    t={t}
                />;
      case 'Serial': {
        const availableSerials = onhandSerials[`${line.model_code}-${selectedLocation}`] || [];
        return <SerialEditor {...editorProps} availableSerials={availableSerials} t={t} />;
      }
      default:
        return <p>Invalid tracking type.</p>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('pages.goodsIssue.modal.addCodeModal.title', {modelCode: line.model_code})}
      size="xl"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">{t('common.cancel')}</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-blue-700">{t('common.save')}</button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label={t('menu.location')}>
            <select value={selectedLocation} onChange={(e) => handleLocationChange(e.target.value)} className="w-full">
                <option value="">{t('common.selectPlaceholder')}</option>
                {onhandForModelInWh.filter(o => o.available_qty > 0).map(o => (
                    <option key={o.loc_code} value={o.loc_code}>
                        {o.loc_code} (Available: {o.available_qty})
                    </option>
                ))}
            </select>
        </FormField>

        <div className="pt-4 border-t dark:border-gray-600">
            {renderContent()}
        </div>
      </div>
    </Modal>
  );
};

// --- Editors for each tracking type ---

const NoneEditor: React.FC<{line: GoodsIssueLine; details: GoodsIssueNoneDetail[]; setDetails: (d: GoodsIssueNoneDetail[]) => void; t: Function}> = ({line, details, setDetails, t}) => {
    const qty = details[0]?.qty || 0;
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let newQty = parseInt(e.target.value) || 0;
        if (newQty > line.onhand) newQty = line.onhand;
        if (newQty < 0) newQty = 0;
        setDetails([{ qty: newQty }]);
    };
    
    return (
        <FormField label={t('pages.goodsIssue.modal.addCodeModal.noneEditor.label', {onhand: line.onhand.toLocaleString()})}>
            <input type="number" value={qty} onChange={handleChange} className="w-full" max={line.onhand} min={0} />
        </FormField>
    );
};

const LotEditor: React.FC<{
    line: GoodsIssueLine; 
    details: GoodsIssueLotDetail[]; 
    setDetails: (d: GoodsIssueLotDetail[]) => void; 
    availableLots: {lot_code: string; onhand_qty: number; expiry_date?: string, receipt_date?: string}[];
    lotErrors: Record<string, string>;
    setLotErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    t: Function;
}> = ({line, details, setDetails, availableLots, lotErrors, setLotErrors, t}) => {
    const totalPlanned = useMemo(() => details.reduce((sum, d) => sum + d.qty, 0), [details]);

    const handleQtyChange = (lot_code: string, value: string) => {
        let newQty = parseInt(value) || 0;
        const lotOnhand = availableLots.find(l => l.lot_code === lot_code)?.onhand_qty || 0;
        
        const newErrors = {...lotErrors};
        let capped = false;

        if (newQty > lotOnhand) {
            newQty = lotOnhand;
            newErrors[lot_code] = t('pages.goodsIssue.modal.addCodeModal.lotEditor.maxOnhand', {qty: lotOnhand});
            capped = true;
        }

        if (!capped) {
            delete newErrors[lot_code];
        }
        setLotErrors(newErrors);

        if (newQty < 0) newQty = 0;

        const existingDetail = details.find(d => d.lot_code === lot_code);
        if (existingDetail) {
            if (newQty > 0) {
                setDetails(details.map(d => d.lot_code === lot_code ? {...d, qty: newQty} : d));
            } else {
                setDetails(details.filter(d => d.lot_code !== lot_code));
            }
        } else if (newQty > 0) {
            setDetails([...details, { lot_code, qty: newQty }]);
        }
    };
    
    return (
      <div>
        <div className="text-right mb-2 text-sm font-semibold">
            {t('pages.goodsIssue.modal.addCodeModal.lotEditor.totalPlanned')}: <span>{totalPlanned.toLocaleString()}</span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700"><tr><th className="p-2 text-left">{t('pages.goodsIssue.modal.addCodeModal.lotEditor.lotCode')}</th><th className="p-2 text-right">{t('pages.goodsIssue.modal.addCodeModal.lotEditor.onhand')}</th><th className="p-2 text-left">{t('pages.goodsIssue.modal.addCodeModal.lotEditor.receiptDate')}</th><th className="p-2 text-left">{t('pages.goodsIssue.modal.addCodeModal.lotEditor.expiryDate')}</th><th className="p-2 text-right">{t('pages.goodsIssue.modal.addCodeModal.lotEditor.qtyPlanned')}</th></tr></thead>
            <tbody>
            {availableLots.map(lot => (
              <tr key={lot.lot_code} className="border-b dark:border-gray-600">
                <td className="p-2 font-mono">{lot.lot_code}</td>
                <td className="p-2 text-right">{lot.onhand_qty}</td>
                <td className="p-2">{lot.receipt_date ? new Date(lot.receipt_date).toLocaleDateString() : 'N/A'}</td>
                <td className="p-2">{lot.expiry_date ? new Date(lot.expiry_date).toLocaleDateString() : 'N/A'}</td>
                <td className="p-2 text-right">
                    <div className="inline-block">
                        <input 
                          type="number" 
                          value={details.find(d => d.lot_code === lot.lot_code)?.qty || ''} 
                          onChange={e => handleQtyChange(lot.lot_code, e.target.value)}
                          className={`w-24 p-1 text-right border rounded bg-white dark:bg-gray-700 ${lotErrors[lot.lot_code] ? 'border-red-500' : 'dark:border-gray-600'}`}
                          min="0"
                        />
                        {lotErrors[lot.lot_code] && <p className="text-xs text-red-500 mt-1">{lotErrors[lot.lot_code]}</p>}
                    </div>
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      </div>
    );
};

const SerialEditor: React.FC<{line: GoodsIssueLine; details: GoodsIssueSerialDetail[]; setDetails: (d: GoodsIssueSerialDetail[]) => void; availableSerials: {serial_no: string, receipt_date?: string, expiry_date?: string}[]; t: Function;}> = ({line, details, setDetails, availableSerials, t}) => {
    const selectedSerials = useMemo(() => new Set(details.map(d => d.serial_no)), [details]);
    const totalPlanned = selectedSerials.size;
    
    const handleToggle = (serial_no: string) => {
        const isSelected = selectedSerials.has(serial_no);
        if (isSelected) {
            setDetails(details.filter(d => d.serial_no !== serial_no));
        } else {
            setDetails([...details, { serial_no }]);
        }
    };
    
    return (
        <div>
            <div className="text-right mb-2 text-sm font-semibold">
                {t('pages.goodsIssue.modal.addCodeModal.lotEditor.totalPlanned')}: <span>{totalPlanned.toLocaleString()}</span>
            </div>
            <div className="max-h-96 overflow-y-auto">
                 <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="p-2 w-10"></th>
                            <th className="p-2 text-left">{t('pages.goodsIssue.modal.addCodeModal.serialEditor.serialNumber')}</th>
                            <th className="p-2 text-left">{t('pages.goodsIssue.modal.addCodeModal.lotEditor.receiptDate')}</th>
                            <th className="p-2 text-left">{t('pages.goodsIssue.modal.addCodeModal.lotEditor.expiryDate')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {availableSerials.map(serial => (
                            <tr key={serial.serial_no} className="border-b dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="p-2 text-center">
                                    <input type="checkbox" checked={selectedSerials.has(serial.serial_no)} onChange={() => handleToggle(serial.serial_no)} className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary" />
                                </td>
                                <td className="p-2 font-mono">{serial.serial_no}</td>
                                <td className="p-2">{serial.receipt_date ? new Date(serial.receipt_date).toLocaleDateString() : 'N/A'}</td>
                                <td className="p-2">{serial.expiry_date ? new Date(serial.expiry_date).toLocaleDateString() : 'N/A'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};