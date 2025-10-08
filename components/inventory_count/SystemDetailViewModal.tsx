import React from 'react';
import { Modal } from '../ui/Modal';
import { InventoryCountLine } from '../../types';

interface SystemDetailViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  line: InventoryCountLine | null;
  details: any[] | undefined;
}

export const SystemDetailViewModal: React.FC<SystemDetailViewModalProps> = ({ isOpen, onClose, line, details }) => {
  if (!line) return null;

  const isSerial = line.tracking_type === 'Serial';
  const isLot = line.tracking_type === 'Lot';
  const systemQty = details?.reduce((sum, item) => sum + (item.onhand_qty || 1), 0) || 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`System Details for: ${line.model_code} at ${line.location_code}`}
      size="lg"
      footer={<button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Close</button>}
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{line.model_name}</p>
          <div className="mt-2 text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total System Qty at this location</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">{systemQty.toLocaleString()}</p>
          </div>
        </div>
        {(!details || details.length === 0) ? (
            <p className="text-center text-gray-500 py-8">No detailed on-hand records found for this item at this location.</p>
        ) : (
            <div className="max-h-96 overflow-y-auto border dark:border-gray-600 rounded-lg">
                <table className="w-full text-sm">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                        <tr>
                            <th className="px-4 py-2 w-16">#</th>
                            {isSerial && <th className="px-4 py-2 text-left">Serial Number</th>}
                            {isLot && <th className="px-4 py-2 text-left">Lot Code</th>}
                            {isLot && <th className="px-4 py-2 text-right">System Quantity</th>}
                            <th className="px-4 py-2 text-left">Receipt Date</th>
                            <th className="px-4 py-2 text-left">Expiry Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-600">
                        {details.map((detail, index) => (
                            <tr key={isSerial ? detail.serial_no : detail.lot_code}>
                                <td className="px-4 py-2 text-center">{index + 1}</td>
                                {isSerial && <td className="px-4 py-2 font-mono">{detail.serial_no}</td>}
                                {isLot && <td className="px-4 py-2 font-mono">{detail.lot_code}</td>}
                                {isLot && <td className="px-4 py-2 font-mono text-right">{(detail.onhand_qty || 0).toLocaleString()}</td>}
                                <td className="px-4 py-2">{detail.receipt_date ? new Date(detail.receipt_date).toLocaleDateString() : '—'}</td>
                                <td className="px-4 py-2">{detail.expiry_date ? new Date(detail.expiry_date).toLocaleDateString() : '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </Modal>
  );
};