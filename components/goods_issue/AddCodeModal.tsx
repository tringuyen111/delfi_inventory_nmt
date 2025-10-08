
import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { GoodsIssueLine, GoodsIssueLotDetail, GoodsIssueSerialDetail, GoodsIssueNoneDetail, OnhandByLocation } from '../../types';
import { FormField } from '../ui/FormField';

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
  if (!line) return null;

  const [localDetails, setLocalDetails] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');

  useEffect(() => {
    setLocalDetails(line.details || []);
    setSelectedLocation(line.location_code || '');
  }, [line]);

  const handleSave = () => {
    if (!selectedLocation) {
        alert("Please select a location.");
        return;
    }
    onSave(localDetails, selectedLocation);
  };

  const handleLocationChange = (locationCode: string) => {
    if (locationCode !== selectedLocation) {
        setLocalDetails([]);
    }
    setSelectedLocation(locationCode);
  };

  const onhandForSelectedLocation = onhandForModelInWh.find(o => o.loc_code === selectedLocation);

  const renderContent = () => {
    if (!selectedLocation) {
        return <p className="text-gray-500 dark:text-gray-400 text-center py-4">Please select a location to continue.</p>;
    }

    const editorProps = {
        line: { ...line, onhand: onhandForSelectedLocation?.available_qty || 0 },
        details: localDetails,
        setDetails: setLocalDetails,
    };

    switch(line.tracking_type) {
      case 'None':
        return <NoneEditor {...editorProps} />;
      case 'Lot':
        return <LotEditor {...editorProps} availableLots={onhandLots[`${line.model_code}-${selectedLocation}`] || []} />;
      case 'Serial': {
        const availableSerials = onhandSerials[`${line.model_code}-${selectedLocation}`] || [];
        return <SerialEditor {...editorProps} availableSerials={availableSerials} />;
      }
      default:
        return <p>Invalid tracking type.</p>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Set Quantity for ${line.model_code}`}
      size="xl"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-blue-700">Save</button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Location">
            <select value={selectedLocation} onChange={(e) => handleLocationChange(e.target.value)} className="w-full">
                <option value="">-- Select Location --</option>
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

const NoneEditor: React.FC<{line: GoodsIssueLine; details: GoodsIssueNoneDetail[]; setDetails: (d: GoodsIssueNoneDetail[]) => void}> = ({line, details, setDetails}) => {
    const qty = details[0]?.qty || 0;
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let newQty = parseInt(e.target.value) || 0;
        if (newQty > line.onhand) newQty = line.onhand;
        if (newQty < 0) newQty = 0;
        setDetails([{ qty: newQty }]);
    };
    
    return (
        <FormField label={`Quantity to pick (Onhand: ${line.onhand.toLocaleString()})`}>
            <input type="number" value={qty} onChange={handleChange} className="w-full" max={line.onhand} min={0} />
        </FormField>
    );
};

const LotEditor: React.FC<{line: GoodsIssueLine; details: GoodsIssueLotDetail[]; setDetails: (d: GoodsIssueLotDetail[]) => void; availableLots: {lot_code: string; onhand_qty: number; expiry_date?: string, receipt_date?: string}[]}> = ({line, details, setDetails, availableLots}) => {
    const handleQtyChange = (lot_code: string, newQty: number) => {
        const lotOnhand = availableLots.find(l => l.lot_code === lot_code)?.onhand_qty || 0;
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
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700"><tr><th className="p-2 text-left">Lot Code</th><th className="p-2 text-right">Onhand</th><th className="p-2 text-left">Receipt Date</th><th className="p-2 text-left">Expiry Date</th><th className="p-2 text-right">Qty to Pick</th></tr></thead>
          <tbody>
          {availableLots.map(lot => (
            <tr key={lot.lot_code} className="border-b dark:border-gray-600">
              <td className="p-2 font-mono">{lot.lot_code}</td>
              <td className="p-2 text-right">{lot.onhand_qty}</td>
              <td className="p-2">{lot.receipt_date ? new Date(lot.receipt_date).toLocaleDateString() : 'N/A'}</td>
              <td className="p-2">{lot.expiry_date ? new Date(lot.expiry_date).toLocaleDateString() : 'N/A'}</td>
              <td className="p-2 text-right"><input type="number" value={details.find(d => d.lot_code === lot.lot_code)?.qty || ''} onChange={e => handleQtyChange(lot.lot_code, parseInt(e.target.value) || 0)} className="w-24 p-1 text-right border rounded bg-white dark:bg-gray-700" min="0" /></td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    );
};

const SerialEditor: React.FC<{line: GoodsIssueLine; details: GoodsIssueSerialDetail[]; setDetails: (d: GoodsIssueSerialDetail[]) => void; availableSerials: {serial_no: string, receipt_date?: string, expiry_date?: string}[]}> = ({line, details, setDetails, availableSerials}) => {
    const selectedSerials = new Set(details.map(d => d.serial_no));
    
    const handleToggle = (serial_no: string) => {
        if (selectedSerials.has(serial_no)) {
            setDetails(details.filter(d => d.serial_no !== serial_no));
        } else {
            setDetails([...details, { serial_no }]);
        }
    };
    
    return (
        <div className="max-h-96 overflow-y-auto">
             <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th className="p-2 w-10"></th>
                        <th className="p-2 text-left">Serial Number</th>
                        <th className="p-2 text-left">Receipt Date</th>
                        <th className="p-2 text-left">Expiry Date</th>
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
    );
};
