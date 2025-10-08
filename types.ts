import { IconName } from "./components/Icons";

// --- GENERAL ---
export type Status = 'Active' | 'Inactive';
export type DocStatus = 'Draft' | 'New' | 'Receiving' | 'Picking' | 'Submitted' | 'Counting' | 'Review' | 'Completed' | 'Rejected' | 'Cancelled' | 'AdjustmentRequested' | 'Created' | 'Exporting';

// --- USER & UI ---
export interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  avatar_version: number;
  phone: string | null;
  gender: 'Male' | 'Female' | 'Other' | null;
  birth_year: number | null;
}

export interface MenuItemType {
  id?: string;
  label: string;
  icon?: IconName;
  path?: string;
  type: 'link' | 'group' | 'separator';
  children?: MenuItemType[];
}

// --- MASTER DATA ---
export interface Uom {
  id: string;
  uom_code: string;
  uom_name: string;
  measurement_type: 'Piece' | 'Weight' | 'Volume' | 'Length' | 'Area' | 'Time';
  uom_type: 'Base' | 'Alt';
  base_uom?: string;
  conv_factor?: number;
  description?: string;
  status: Status;
  updated_at: string;
  is_used_in_model_goods: boolean;
}

export interface Organization {
  id: string;
  org_code: string;
  org_name: string;
  address?: string;
  phone?: string;
  email?: string;
  status: Status;
  updated_at: string;
  has_active_docs: boolean;
}

export interface Branch {
  id: string;
  branch_code: string;
  branch_name: string;
  org_code: string;
  org_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  status: Status;
  updated_at: string;
}

export interface Warehouse {
    id: string;
    wh_code: string;
    wh_name: string;
    branch_code: string;
    address?: string;
    capacity?: number;
    warehouse_type?: 'Central' | 'Sub' | 'Virtual';
    status: Status;
    updated_at: string;
}

export type PartnerType = 'Supplier' | 'Customer' | '3PL' | 'Internal';

export interface Partner {
    id: string;
    partner_code: string;
    partner_name: string;
    partner_type: PartnerType[];
    tax_code?: string;
    address?: string;
    phone?: string;
    email?: string;
    status: Status;
    updated_at: string;
    has_active_docs: boolean;
}

export interface GoodsType {
    id: string;
    goods_type_code: string;
    goods_type_name: string;
    description?: string;
    status: Status;
    updated_at: string;
    usage_count: number;
}

export interface Location {
    id: string;
    loc_code: string;
    loc_name: string;
    wh_code: string;
    allowed_goods_types?: string[];
    blocked_goods_types?: string[];
    status: Status;
    updated_at: string;
    onhand_qty: number;
}

export interface ModelGoods {
    id: string;
    model_code: string;
    model_name: string;
    goods_type_code: string;
    base_uom: string;
    tracking_type: 'None' | 'Serial' | 'Lot';
    description?: string;
    status: Status;
    updated_at: string;
    total_onhand_qty: number;
    low_stock_threshold?: number | null;
}

// --- ONHAND & INVENTORY ---
export interface OnhandByLocation {
    id: string;
    wh_code: string;
    loc_code: string;
    model_code: string;
    model_name: string;
    goods_type_code: string;
    tracking_type: 'None' | 'Serial' | 'Lot';
    base_uom: string;
    onhand_qty: number;
    allocated_qty: number;
    available_qty: number;
    last_movement_at: string;
    low_stock_threshold: number | null;
    has_near_expiry: boolean;
}

export interface UserWarehouse {
    user_id: string;
    wh_code: string;
}

export interface OnhandSerialDetail {
    id: string;
    serial_no: string;
    status: 'Available' | 'Reserved' | 'In QC' | 'Allocated';
    reserved_doc_no?: string;
    reserved_partner?: string;
    received_date: string;
    last_movement_at: string;
    age_days: number;
    notes?: string;
}

export interface OnhandLotDetail {
    id: string;
    lot_code: string;
    onhand_qty: number;
    allocated_qty: number;
    available_qty: number;
    expiry_date?: string;
    received_date: string;
    age_days: number;
    supplier_lot?: string;
}

export interface OnhandHistoryDetail {
    id: string;
    txn_date: string;
    doc_type: string;
    doc_no: string;
    qty_change: number;
    actor: string;
    remark?: string;
}

export interface TimelineEvent {
    id: string;
    txn_date: string;
    doc_type: string;
    doc_no: string;
    note: string;
    actor: string;
    wh_code: string;
    loc_code: string;
    qty_change: number;
}

// --- TRANSACTIONS ---
export interface StatusHistoryEvent {
    id: string;
    doc_id: string;
    status: DocStatus;
    user: string;
    timestamp: string;
    note?: string;
}

export interface GoodsReceiptLine {
    id: string;
    gr_id: string;
    model_code: string;
    model_name: string;
    uom: string;
    tracking_type: 'None' | 'Serial' | 'Lot';
    qty_planned: number;
    qty_received: number;
}
export interface GoodsReceipt {
    id: string;
    gr_no: string;
    receipt_type: 'PO' | 'Return' | 'Transfer' | 'Other';
    status: DocStatus;
    ref_no?: string;
    partner_code?: string;
    source_wh_code?: string;
    dest_wh_code: string;
    doc_date: string;
    note?: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    handler?: string;
    lines: GoodsReceiptLine[];
    history: StatusHistoryEvent[];
    gt_no?: string; // Link to Goods Transfer
}

export interface GoodsReceiptSerialDetail {
    serial_no: string;
}

export interface GoodsReceiptLotDetail {
    lot_code: string;
    qty: number;
    expiry_date?: string;
}


export interface GoodsIssueLine {
    id: string;
    gi_id: string;
    model_code: string;
    model_name: string;
    uom: string;
    tracking_type: 'None' | 'Serial' | 'Lot';
    qty_planned: number;
    qty_picked: number;
    location_code: string;
    onhand: number;
    details: (GoodsIssueSerialDetail | GoodsIssueLotDetail | GoodsIssueNoneDetail)[];
}
export interface GoodsIssue {
    id: string;
    gi_no: string;
    issue_type: 'Sales Order' | 'Transfer' | 'Return to Supplier' | 'Manual' | 'Adjustment';
    issue_mode: 'Summary' | 'Detail';
    status: DocStatus;
    ref_no?: string;
    partner_code?: string;
    dest_wh_code?: string;
    source_wh_code: string;
    expected_date?: string;
    note?: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    handler?: string;
    lines: GoodsIssueLine[];
    history: StatusHistoryEvent[];
    gt_no?: string; // Link to Goods Transfer
}

export interface GoodsIssueSerialDetail { serial_no: string; }
export interface GoodsIssueLotDetail { lot_code: string; qty: number; }
export interface GoodsIssueNoneDetail { qty: number; }

export interface InventoryCountLine {
    id: string;
    ic_id: string;
    model_code: string;
    model_name: string;
    uom: string;
    tracking_type: 'None' | 'Serial' | 'Lot';
    location_code: string;
    system_qty: number;
    counted_qty: number | null;
    variance: number;
    is_recounted: boolean;
    note?: string;
}
export interface InventoryCount {
    id: string;
    ic_no: string;
    wh_code: string;
    status: DocStatus;
    count_type: 'Full' | 'By Location' | 'By Item';
    created_by: string;
    created_at: string;
    updated_at: string;
    handler?: string;
    note?: string;
    lines: InventoryCountLine[];
    history: StatusHistoryEvent[];
}

export interface GoodsTransferLine {
  id: string;
  gt_id: string;
  model_code: string;
  model_name: string;
  uom: string;
  tracking_type: 'None' | 'Serial' | 'Lot';
  qty_transfer: number;
  qty_exported?: number;
  qty_received?: number;
}
export interface GoodsTransfer {
    id: string;
    gt_no: string;
    gt_type: 'Internal Transfer' | 'Return' | 'Other';
    status: DocStatus;
    source_wh_code: string;
    dest_wh_code: string;
    expected_date?: string;
    note?: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    lines: GoodsTransferLine[];
    history: StatusHistoryEvent[];
    linked_gi_no?: string | null;
    linked_gr_no?: string | null;
}


// --- DASHBOARD & REPORTS ---
export interface PendingAction {
    type: string;
    doc_no: string;
    status: DocStatus;
    created_at: string;
    created_by: string;
    page_id: string;
    page_label: string;
}

export interface ExportHistoryItem {
    id: string;
    reportType: string;
    exportDate: string;
    exporter: string;
    parameters: string;
    status: 'processing' | 'completed' | 'error';
    progress: number;
}


// --- MISC / UI-SPECIFIC ---
export interface Layout {
  header: {
    left: string;
    center: string;
  };
  footer: {
    content: string;
  };
}

export interface Notifications {
    success_toast: { style: string };
    error_modal: any;
    confirmation_modal: any;
    inline_validation: { color: string };
}