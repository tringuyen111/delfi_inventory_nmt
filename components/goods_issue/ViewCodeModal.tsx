import React from 'react';
import { Modal } from '../ui/Modal';
import { GoodsIssueLine, GoodsIssueLotDetail, GoodsIssueSerialDetail } from '../../types';

interface ViewCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  line: GoodsIssueLine | null;
}

export const ViewCodeModal: React.FC<ViewCodeModalProps> = ({ isOpen, onClose, line }) => {
  if (!line) return null;

  const isSerial = line.tracking_type === 'Serial';
  const isLot = line.tracking_type === 'Lot';
  const isNone = line.tracking_type === 'None';
  
  // For 'None' tracking, create a synthetic detail object from the line itself to fit the table structure.
  const details = isNone 
    ? [{ qty_picked: line.qty_picked, onhand: line.onhand, location_code: line.location_code }]
    : line.details || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Picked Details for: ${line.model_code}`}
      size="lg"
      footer={<button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Close</button>}
    >
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
            <tr>
              <th className="px-4 py-2 w-16">STT</th>
              {isSerial && <th className="px-4 py-2 text-left">Serial Number</th>}
              {isLot && <th className="px-4 py-2 text-left">Lot Code</th>}
              {(isLot || isNone) && <th className="px-4 py-2 text-right">Onhand at Location</th>}
              {(isLot || isNone) && <th className="px-4 py-2 text-right">Số lượng thực xuất</th>}
              <th className="px-4 py-2 text-left">Location</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-600">
            {details.map((detail, index) => (
              <tr key={index}>
                <td className="px-4 py-2 text-center">{index + 1}</td>
                {isSerial && (
                  <td className="px-4 py-2 font-mono">{(detail as GoodsIssueSerialDetail).serial_no}</td>
                )}
                {isLot && (
                  <>
                    <td className="px-4 py-2 font-mono">{(detail as GoodsIssueLotDetail).lot_code}</td>
                    <td className="px-4 py-2 font-mono text-right">{line.onhand.toLocaleString()}</td>
                    <td className="px-4 py-2 font-mono text-right">{(detail as GoodsIssueLotDetail).qty}</td>
                  </>
                )}
                {isNone && (
                  <>
                    <td className="px-4 py-2 font-mono text-right">{(detail as any).onhand.toLocaleString()}</td>
                    <td className="px-4 py-2 font-mono text-right">{(detail as any).qty_picked}</td>
                  </>
                )}
                <td className="px-4 py-2 font-mono">{line.location_code}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
};