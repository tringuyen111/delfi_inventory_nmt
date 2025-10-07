import React, { useState, useEffect } from 'react';
import { Icon } from '../Icons';
import { TimelineEvent } from '../../types';

interface TimelineSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'serial' | 'lot' | null;
  itemId: string | null;
}

export const TimelineSidePanel: React.FC<TimelineSidePanelProps> = ({ isOpen, onClose, type, itemId }) => {
    const [timelineData, setTimelineData] = useState<TimelineEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && type && itemId) {
            const fetchData = async () => {
                setIsLoading(true);
                try {
                    const res = await fetch(`./data/${type}_timeline.json`);
                    const data: {[key: string]: TimelineEvent[]} = await res.json();
                    setTimelineData(data[itemId] || []);
                } catch (error) {
                    console.error("Failed to fetch timeline", error);
                    setTimelineData([]);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchData();
        }
    }, [isOpen, type, itemId]);

    return (
        <>
        <div 
            className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        />
        <div 
            className={`fixed top-0 right-0 h-full w-full max-w-lg bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
            <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold truncate">Timeline: {itemId}</h2>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Icon name="X" className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
            </header>
            <main className="p-6 overflow-y-auto h-[calc(100%-65px)]">
                {isLoading ? (
                    <p>Loading timeline...</p>
                ) : timelineData.length > 0 ? (
                    <ol className="relative border-l border-gray-200 dark:border-gray-700">                  
                        {timelineData.map(event => (
                            <li key={event.id} className="mb-10 ml-6">            
                                <span className="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -left-3 ring-8 ring-white dark:ring-gray-900 dark:bg-blue-900">
                                    <Icon name="History" className="w-3 h-3 text-blue-800 dark:text-blue-300"/>
                                </span>
                                <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-700 dark:border-gray-600">
                                    <div className="items-center justify-between mb-3 sm:flex">
                                        <time className="mb-1 text-xs font-normal text-gray-400 sm:order-last sm:mb-0">{new Date(event.txn_date).toLocaleString()}</time>
                                        <div className="text-sm font-normal text-gray-500 lex dark:text-gray-300">{event.doc_type}: <span className="font-semibold text-gray-900 dark:text-white hover:underline">{event.doc_no}</span></div>
                                    </div>
                                    <div className="p-3 text-xs italic font-normal text-gray-500 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300">
                                        {event.note}
                                        <div className="text-sm not-italic mt-2 flex justify-between">
                                            <span>{event.actor} @ {event.wh_code}/{event.loc_code}</span>
                                            <span className={`font-bold ${event.qty_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                Qty: {event.qty_change > 0 ? `+${event.qty_change}` : event.qty_change}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ol>
                ) : (
                    <p>No timeline data available.</p>
                )}
            </main>
        </div>
        </>
    );
};
