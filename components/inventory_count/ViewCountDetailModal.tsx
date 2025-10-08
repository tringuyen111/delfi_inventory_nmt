import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { InventoryCountLine } from '../../types';

interface CountedSerialDetail { serial_no: string; }
interface CountedLotDetail { lot_code: string; counted_qty: number; }
// FIX: Define a type for system lot data to resolve 'unknown' type errors.
interface SystemLot {
    lot_code: string;
    onhand_qty: number;
    receipt_date?: string;
    expiry_date?: string;
}

const SerialList: React.FC<{ details: CountedSerialDetail[] }> = ({ details }) => (
    <div className="max-h-80 overflow-y-auto border dark:border-gray-600 rounded-lg">
        <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                <tr>
                    <th className="px-4 py-2 w-16">#</th>
                    <th className="px-4 py-2">Serial Number Counted</th>
                </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-600">
                {details.map((detail, index) => (
                    <tr key={index}>
                        <td className="px-4 py-2 text-center">{index + 1}</td>
                        <td className="px-4 py-2 font-mono">{detail.serial_no}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const LotList: React.FC<{ details: CountedLotDetail[], systemLots: SystemLot[] }> = ({ details, systemLots }) => {
    const systemLotMap = new Map(systemLots.map(l => [l.lot_code, l]));

    return (
     <div className="max-h-80 overflow-y-auto border dark:border-gray-600 rounded-lg">
        <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                <tr>
                    <th className="px-4 py-2 w-16">#</th>
                    <th className="px-4 py-2">Lot Code</th>
                    <th className="px-4 py-2 text-right">System Quantity</th>
                    <th className="px-4 py-2 text-right">Counted Quantity</th>
                    <th className="px-4 py-2">Receipt Date</th>
                    <th className="px-4 py-2">Expiry Date</th>
                </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-600">
            {details.map((detail, index) => {
                // FIX: Explicitly cast the result of `systemLotMap.get()` to `SystemLot | undefined` to resolve incorrect type inference to `unknown`.
                const systemLot = systemLotMap.get(detail.lot_code) as SystemLot | undefined;
                const systemQty = systemLot?.onhand_qty || 0;
                const receiptDate = systemLot?.receipt_date ? new Date(systemLot.receipt_date).toLocaleDateString() : '—';
                const expiryDate = systemLot?.expiry_date ? new Date(systemLot.expiry_date).toLocaleDateString() : '—';
                return (
                    <tr key={index}>
                        <td className="px-4 py-2 text-center">{index + 1}</td>
                        <td className="px-4 py-2 font-mono">{detail.lot_code}</td>
                        <td className="px-4 py-2 font-mono text-right">{systemQty.toLocaleString()}</td>
                        <td className="px-4 py-2 font-mono text-right">{(detail.counted_qty || 0).toLocaleString()}</td>
                        <td className="px-4 py-2">{receiptDate}</td>
                        <td className="px-4 py-2">{expiryDate}</td>
                    </tr>
                );
            })}
            </tbody>
        </table>
    </div>
    );
};


interface ViewCountDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  line: InventoryCountLine | null;
  onhandLots: Record<string, any[]>;
}

export const ViewCountDetailModal: React.FC<ViewCountDetailModalProps> = ({ isOpen, onClose, line, onhandLots }) => {
  const [details, setDetails] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && line && line.tracking_type !== 'None') {
      const fetchDetails = async () => {
        setIsLoading(true);
        setDetails([]);
        try {
          const resource = line.tracking_type === 'Serial' ? 'serial' : 'lot';
          const res = await fetch(`./data/inventory_count_${resource}_details.json`);
          if (!res.ok) throw new Error(`Could not load ${resource} details.`);
          const data = await res.json();
          setDetails(data[line.id] || []);
        } catch (error) {
          console.error(`Failed to fetch ${line.tracking_type} details`, error);
          setDetails([]);
        } finally {
          setIsLoading(false);
        }
      };
      fetchDetails();
    }
  }, [isOpen, line]);

  if (!line) return null;

  const renderDetails = () => {
    if (line.tracking_type === 'None') {
        return <p className="text-sm text-center text-gray-500 py-8">This item is not tracked by lot or serial.</p>;
    }
    if (isLoading) {
        return <p className="text-sm text-center text-gray-500 py-8">Loading details...</p>;
    }
    if (details.length === 0) {
        return <p className="text-sm text-center text-gray-500 py-8">No counted serials/lots were recorded for this line.</p>;
    }

    if (line.tracking_type === 'Serial') {
        return <SerialList details={details as CountedSerialDetail[]} />;
    }
    if (line.tracking_type === 'Lot') {
        const systemLotsForLine = onhandLots[`${line.model_code}-${line.location_code}`] || [];
        // FIX: Assert the type of systemLotsForLine to match the expected prop type of LotList, resolving 'unknown' type errors.
        return <LotList details={details as CountedLotDetail[]} systemLots={systemLotsForLine as SystemLot[]} />;
    }
    return null;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Count Details for: ${line.model_code}`}
      size="2xl"
      footer={<button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Close</button>}
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{line.model_name}</p>
            <div className="mt-2 grid grid-cols-3 gap-4 text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Onhand Snapshot</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">{(line.system_qty || 0).toLocaleString()}</p>
              </div>
              <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Qty Counted</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">{(line.counted_qty ?? 0).toLocaleString()}</p>
              </div>
              <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Variance</p>
                  <p className={`text-2xl font-bold mt-1 ${line.variance > 0 ? 'text-green-600' : line.variance < 0 ? 'text-red-600' : 'text-gray-800 dark:text-gray-100'}`}>
                      {(line.variance || 0).toLocaleString()}
                  </p>
              </div>
          </div>
        </div>
        {renderDetails()}
      </div>
    </Modal>
  );
};