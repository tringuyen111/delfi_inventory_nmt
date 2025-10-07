import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { GoodsIssueLine, GoodsIssueLotDetail, GoodsIssueSerialDetail, GoodsIssueNoneDetail } from '../../types';
import { FormField } from '../ui/FormField';

interface AddCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: (GoodsIssueSerialDetail | GoodsIssueLotDetail | GoodsIssueNoneDetail)[]) => void;
  line: GoodsIssueLine | null;
  onhandLots: Record<string, {lot_code: string; onhand_qty: number; expiry_date?: string}[]>;
  onhandSerials: Record<string, string[]>;
}

export const AddCodeModal: React.FC<AddCodeModalProps> = ({ isOpen, onClose, onSave, line, onhandLots, onhandSerials }) => {
  if (!line) return null;

  const [localDetails, setLocalDetails] = useState<any[]>(line.details || []);

  const handleSave = () => {
    onSave(localDetails);
  };
  
  const renderContent = () => {
    switch(line.tracking_type) {
      case 'None':
        return <NoneEditor line={line} details={localDetails} setDetails={setLocalDetails} />;
      case 'Lot':
        return <LotEditor line={line} details={localDetails} setDetails={setLocalDetails} availableLots={onhandLots[`${line.model_code}-${line.location_code}`] || []} />;
      case 'Serial':
        return <SerialEditor line={line} details={localDetails} setDetails={setLocalDetails} availableSerials={onhandSerials[`${line.model_code}-${line.location_code}`] || []} />;
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
      {renderContent()}
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

const LotEditor: React.FC<{line: GoodsIssueLine; details: GoodsIssueLotDetail[]; setDetails: (d: GoodsIssueLotDetail[]) => void; availableLots: {lot_code: string; onhand_qty: number; expiry_date?: string}[]}> = ({line, details, setDetails, availableLots}) => {
    const handleQtyChange = (lot_code: string, newQty: number) => {
        const lotOnhand = availableLots.find(l => l.lot_code === lot_code)?.onhand_qty || 0;
        if (newQty > lotOnhand) newQty = lotOnhand;
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
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700"><tr><th className="p-2 text-left">Lot Code</th><th className="p-2 text-right">Onhand</th><th className="p-2 text-left">Expiry</th><th className="p-2 text-right">Qty to Pick</th></tr></thead>
          <tbody>
          {availableLots.map(lot => (
            <tr key={lot.lot_code} className="border-b dark:border-gray-600">
              <td className="p-2 font-mono">{lot.lot_code}</td>
              <td className="p-2 text-right">{lot.onhand_qty}</td>
              <td className="p-2">{lot.expiry_date ? new Date(lot.expiry_date).toLocaleDateString() : 'N/A'}</td>
              <td className="p-2 text-right"><input type="number" value={details.find(d => d.lot_code === lot.lot_code)?.qty || ''} onChange={e => handleQtyChange(lot.lot_code, parseInt(e.target.value) || 0)} className="w-24 p-1 text-right border rounded bg-white dark:bg-gray-700" max={lot.onhand_qty} min="0" /></td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    );
};

const SerialEditor: React.FC<{line: GoodsIssueLine; details: GoodsIssueSerialDetail[]; setDetails: (d: GoodsIssueSerialDetail[]) => void; availableSerials: string[]}> = ({line, details, setDetails, availableSerials}) => {
    const selectedSerials = new Set(details.map(d => d.serial_no));
    
    const handleToggle = (serial_no: string) => {
        if (selectedSerials.has(serial_no)) {
            setDetails(details.filter(d => d.serial_no !== serial_no));
        } else {
            setDetails([...details, { serial_no }]);
        }
    };
    
    return (
        <div className="max-h-96 overflow-y-auto space-y-2">
            {availableSerials.map(serial => (
                <label key={serial} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                    <input type="checkbox" checked={selectedSerials.has(serial)} onChange={() => handleToggle(serial)} className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary" />
                    <span className="font-mono">{serial}</span>
                </label>
            ))}
        </div>
    );
};