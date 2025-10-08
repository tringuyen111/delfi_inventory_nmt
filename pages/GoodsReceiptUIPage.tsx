import React, { useState, useEffect, ReactNode } from 'react';
import { SectionCard } from '../components/SectionCard';
import { Icon, IconName } from '../components/Icons';
import { GuidelineItem } from '../components/GuidelineItem';

// --- TYPE DEFINITIONS ---
interface Button { id: string; label: string; enabled: boolean; }
interface UIState {
  header_editable: boolean;
  lines_editable: boolean;
  readonly_fields: string[];
  show_sections: string[];
  hide_sections: string[];
  buttons: { primary: Button[]; secondary: Button[]; hidden: string[]; };
  notes: string[];
}
// FIX: Define a specific type for PDA screen data and make `visible_status` optional to match the data source.
interface PdaScreenData {
  visible_status?: string[];
  item_tap_behavior?: string;
  header_display?: string[];
}
interface MatrixData {
  module: string;
  scope: string[];
  status_lifecycle: string[];
  web: {
    header_sections: string[];
    line_grid_columns: (string | { name: string; visible_from_status: string[] })[];
    conditional_fields: any[];
    ui_states: Record<string, UIState>;
  };
  pda: { screens: Record<string, PdaScreenData>; };
  guards_and_disables: any[];
  acceptance_checklist: string[];
}
// --- HELPER COMPONENTS ---
const Tag: React.FC<{ children: ReactNode, color?: string }> = ({ children, color = 'gray' }) => (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full bg-${color}-100 text-${color}-800 dark:bg-${color}-900 dark:text-${color}-300`}>{children}</span>
);
const Code: React.FC<{ children: ReactNode }> = ({ children }) => (
    <code className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm text-brand-danger">{children}</code>
);
const BooleanIndicator: React.FC<{ value: boolean }> = ({ value }) => (
    value 
        ? <span className="flex items-center gap-2 text-green-600 dark:text-green-400"><Icon name="CheckCircle" className="w-5 h-5" /> Yes</span>
        : <span className="flex items-center gap-2 text-red-600 dark:text-red-400"><Icon name="XCircle" className="w-5 h-5" /> No</span>
);

// --- MAIN PAGE COMPONENT ---
const GoodsReceiptUIPage: React.FC = () => {
    const [matrix, setMatrix] = useState<MatrixData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('./data/goods_receipt_ui_state_matrix.json');
                if (!response.ok) throw new Error('Failed to fetch UI state matrix');
                const data: MatrixData = await response.json();
                setMatrix(data);
                if (data.status_lifecycle.length > 0) {
                    setActiveTab(data.status_lifecycle[0]);
                }
            } catch (e) {
                setError(e instanceof Error ? e.message : 'An unknown error occurred');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <Icon name="Layers" className="w-10 h-10 text-brand-primary animate-spin" />
                <p className="mt-4 text-lg font-medium">Loading UI State Matrix...</p>
            </div>
        );
    }
    if (error || !matrix) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-red-500">
                <Icon name="AlertTriangle" className="w-10 h-10" />
                <p className="mt-4 text-lg font-bold">Failed to Load Data</p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{error}</p>
            </div>
        );
    }

    const activeState = matrix.web.ui_states[activeTab];

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <SectionCard title={`UI State Matrix: ${matrix.module}`} icon="BookOpen">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <GuidelineItem label="Scope">
                        <div className="flex gap-2">{matrix.scope.map(s => <Tag key={s}>{s}</Tag>)}</div>
                    </GuidelineItem>
                    <GuidelineItem label="Status Lifecycle">
                        <div className="flex flex-wrap gap-2">{matrix.status_lifecycle.map(s => <Tag key={s} color="blue">{s}</Tag>)}</div>
                    </GuidelineItem>
                </div>
            </SectionCard>

            <SectionCard title="Web Platform Rules" icon="Monitor">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto">
                        {matrix.status_lifecycle.map(status => (
                            <button key={status} onClick={() => setActiveTab(status)} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === status ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-200'}`}>
                                {status}
                            </button>
                        ))}
                    </nav>
                </div>
                {activeState && (
                    <div className="pt-6 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-4">
                             <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Editable State</h3>
                             <GuidelineItem label="Header Editable"><BooleanIndicator value={activeState.header_editable} /></GuidelineItem>
                             <GuidelineItem label="Lines Editable"><BooleanIndicator value={activeState.lines_editable} /></GuidelineItem>
                             <GuidelineItem label="Read-Only Fields">
                                 <div className="flex flex-wrap gap-2">
                                     {activeState.readonly_fields.length > 0 ? activeState.readonly_fields.map(f => <Code key={f}>{f}</Code>) : 'None'}
                                 </div>
                             </GuidelineItem>
                        </div>
                         <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Section Visibility</h3>
                            <GuidelineItem label="Visible Sections">
                                <ul className="list-disc list-inside space-y-1">{activeState.show_sections.map(s => <li key={s}>{s}</li>)}</ul>
                            </GuidelineItem>
                            <GuidelineItem label="Hidden Sections">
                                {activeState.hide_sections.length > 0 ? <ul className="list-disc list-inside space-y-1">{activeState.hide_sections.map(s => <li key={s}>{s}</li>)}</ul> : 'None'}
                            </GuidelineItem>
                        </div>
                        <div className="lg:col-span-2 space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                             <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Available Actions</h3>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <h4 className="font-semibold mb-2">Primary</h4>
                                    <div className="flex flex-col items-start gap-2">
                                        {activeState.buttons.primary.length > 0 ? activeState.buttons.primary.map(b => <button key={b.id} disabled={!b.enabled} className="px-3 py-1.5 text-xs font-medium rounded-md bg-brand-primary text-white disabled:bg-blue-300 dark:disabled:bg-blue-800">{b.label}</button>) : <p className="text-sm text-gray-500">None</p>}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">Secondary</h4>
                                    <div className="flex flex-col items-start gap-2">
                                         {activeState.buttons.secondary.length > 0 ? activeState.buttons.secondary.map(b => <button key={b.id} disabled={!b.enabled} className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-100 disabled:opacity-50">{b.label}</button>) : <p className="text-sm text-gray-500">None</p>}
                                    </div>
                                </div>
                                 <div>
                                    <h4 className="font-semibold mb-2">Hidden</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {activeState.buttons.hidden.length > 0 ? activeState.buttons.hidden.map(b => <Code key={b}>{b}</Code>) : <p className="text-sm text-gray-500">None</p>}
                                    </div>
                                </div>
                             </div>
                        </div>
                         <div className="lg:col-span-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <h4 className="font-semibold mb-2 flex items-center gap-2"><Icon name="Info" className="w-4 h-4"/> Notes</h4>
                            <ul className="list-disc list-inside text-sm text-blue-800 dark:text-blue-200 space-y-1">
                                {activeState.notes.map((note, i) => <li key={i}>{note}</li>)}
                            </ul>
                        </div>
                    </div>
                )}
            </SectionCard>

            <SectionCard title="PDA Platform Rules" icon="Smartphone">
                 <div className="space-y-6">
                    {/* FIX: Use Object.keys() to iterate over PDA screens. This provides better type inference for screenData than Object.entries(), resolving errors where properties were accessed on an 'unknown' type. */}
                    {Object.keys(matrix.pda.screens).map((screenKey) => {
                        const screenData = matrix.pda.screens[screenKey];
                        return (
                            <div key={screenKey} className="p-4 border rounded-lg dark:border-gray-700">
                                 <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 capitalize mb-3">{screenKey.replace('_', ' ')}</h3>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {screenData.visible_status && (
                                        <GuidelineItem label="Visible Statuses">
                                            <div className="flex flex-wrap gap-2">
                                                {screenData.visible_status.map((s: string) => <Tag key={s}>{s}</Tag>)}
                                            </div>
                                        </GuidelineItem>
                                    )}
                                    {screenData.item_tap_behavior && <GuidelineItem label="Tap Behavior" value={screenData.item_tap_behavior}/>}
                                    {screenData.header_display && <GuidelineItem label="Header Display"><div className="flex flex-wrap gap-2">{screenData.header_display.map((s: string) => <Tag key={s} color="purple">{s}</Tag>)}</div></GuidelineItem>}
                                 </div>
                            </div>
                        );
                    })}
                </div>
            </SectionCard>

             <SectionCard title="Guards & Disables" icon="AlertTriangle">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="p-3 font-semibold">Target</th>
                                <th className="p-3 font-semibold">Condition</th>
                                <th className="p-3 font-semibold">Tooltip/Reason</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {matrix.guards_and_disables.map((guard, i) => (
                                <tr key={i}>
                                    <td className="p-3"><Code>{guard.button_id || guard.field}</Code></td>
                                    <td className="p-3"><Code>{guard.disable_when || guard.hide_when}</Code></td>
                                    <td className="p-3 text-gray-600 dark:text-gray-300">{guard.tooltip_vi || guard.why}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </SectionCard>

            <SectionCard title="Acceptance Checklist" icon="CheckCircle">
                <ul className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-200">
                    {matrix.acceptance_checklist.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
            </SectionCard>
        </div>
    );
};

export default GoodsReceiptUIPage;