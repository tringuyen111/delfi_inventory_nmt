import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { GoodsReceiptLine, GoodsReceiptSerialDetail, GoodsReceiptLotDetail } from '../../types';
import { Icon } from '../Icons';

interface LineDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  line: GoodsReceiptLine | null;
}

const SerialList: React.FC<{ details: GoodsReceiptSerialDetail[] }> = ({ details }) => (
    <div className="max-h-96 overflow-y-auto border dark:border-gray-600 rounded-lg">
        <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                <tr>
                    <th className="px-4 py-2 w-16">STT</th>
                    <th className="px-4 py-2">Serial Number</th>
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

const LotList: React.FC<{ details: GoodsReceiptLotDetail[] }> = ({ details }) => (
     <div className="max-h-96 overflow-y-auto border dark:border-gray-600 rounded-lg">
        <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                <tr>
                    <th className="px-4 py-2 w-16">STT</th>
                    <th className="px-4 py-2">Lot Code</th>
                    <th className="px-4 py-2 text-right">Số lượng thực nhận</th>
                    <th className="px-4 py-2">Ngày hết hạn</th>
                </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-600">
            {details.map((detail, index) => (
                <tr key={index}>
                    <td className="px-4 py-2 text-center">{index + 1}</td>
                    <td className="px-4 py-2 font-mono">{detail.lot_code}</td>
                    <td className="px-4 py-2 font-mono text-right">{detail.qty}</td>
                    <td className="px-4 py-2">{detail.expiry_date ? new Date(detail.expiry_date).toLocaleDateString() : '—'}</td>
                </tr>
            ))}
            </tbody>
        </table>
    </div>
);

export const LineDetailModal: React.FC<LineDetailModalProps> = ({ isOpen, onClose, line }) => {
  const [details, setDetails] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && line && line.tracking_type !== 'None') {
      const fetchDetails = async () => {
        setIsLoading(true);
        try {
          const resource = line.tracking_type === 'Serial' ? 'serial' : 'lot';
          const res = await fetch(`./data/goods_receipt_${resource}_details.json`);
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Received Details for: ${line.model_code}`}
      size="lg"
      footer={<button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Close</button>}
    >
      <div className="space-y-4">
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{line.model_name}</p>
            <p className="text-sm">
                Qty Planned: <span className="font-semibold">{line.qty_planned}</span> | 
                Qty Received: <span className="font-semibold">{line.qty_received}</span>
            </p>
        </div>
        {isLoading
            ? <p>Loading details...</p>
            : details.length > 0
                ? (
                    line.tracking_type === 'Serial' 
                        ? <SerialList details={details as GoodsReceiptSerialDetail[]} />
                        : <LotList details={details as GoodsReceiptLotDetail[]} />
                )
                : <p className="text-sm text-gray-500">No details were recorded for this line.</p>
        }
      </div>
    </Modal>
  );
};