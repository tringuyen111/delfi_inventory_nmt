// FIX: This file was malformed. Re-creating with all necessary type definitions from across the application.
import type { IconName } from './components/Icons';

// Generic status
export type Status = 'Active' | 'Inactive';

// From App.tsx
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

export interface Guidelines {
  system: string;
  context: {
    layout: Layout;
  };
  design_rules: {
    brand_colors: Record<string, string>;
    forms: {
      layout: string;
      label_position: string;
      actions_position: string;
      actions: string[];
    };
    list_view: {
      search: { position: string };
      filter: { type: string };
      column_visibility: { storage: string };
      navigation: { double_click_action: string };
    };
    notifications: Notifications;
  };
}

export interface Layout {
  header: {
    left: string;
    center: string;
    right: string[];
  };
  sidebar: {
    collapsible: boolean;
    default_state: string;
  };
  footer: {
    content: string;
  };
}

export interface Notifications {
    success_toast: { style: string; };
    error_modal: { style: string; };
    confirmation_modal: { style: string; };
    inline_validation: { color: string; };
}

export interface MenuItemType {
  id?: string;
  label: string;
  type: 'item' | 'group' | 'separator';
  icon?: IconName;
  path?: string;
  children?: MenuItemType[];
}

export interface PendingAction {
  type: 'Goods Receipt' | 'Goods Issue';
  doc_no: string;
  status: string;
  created_at: string;
  created_by: string;
  page_id: 'goods_receipt' | 'goods_issue';
  page_label: 'Goods Receipt' | 'Goods Issue';
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


// Master Data
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
    branch_name?: string;
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
    wh_name?: string;
    allowed_goods_types?: string[];
    blocked_goods_types?: string[];
    status: Status;
    updated_at: string;
    onhand_qty: number;
}

export type TrackingType = 'None' | 'Serial' | 'Lot';
export interface ModelGoods {
    id: string;
    model_code: string;
    model_name: string;
    goods_type_code: string;
    base_uom: string;
    tracking_type: TrackingType;
    description?: string;
    status: Status;
    updated_at: string;
    total_onhand_qty: number;
}

// Onhand & History
export interface UserWarehouse {
    user_id: string;
    wh_code: string;
    is_default: boolean;
}

export interface OnhandByLocation {
    id: string;
    wh_code: string;
    loc_code: string;
    model_code: string;
    model_name: string;
    goods_type_code: string;
    tracking_type: TrackingType;
    base_uom: string;
    onhand_qty: number;
    allocated_qty: number;
    available_qty: number;
    last_movement_at: string;
    low_stock_threshold: number | null;
    has_near_expiry: boolean;
}

export interface OnhandSerialDetail {
    id: string;
    serial_no: string;
    status: 'Available' | 'Reserved';
    reserved_doc_no?: string;
    reserved_partner?: string;
    received_date: string;
    last_movement_at: string;
    age_days: number;
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

export interface StatusHistoryEvent {
    id: string;
    doc_id: string;
    status: string;
    user: string;
    timestamp: string;
    note?: string;
}

// Goods Receipt
export interface GoodsReceipt {
    id: string;
    gr_no: string;
    receipt_type: 'PO' | 'Return' | 'Transfer' | 'Other';
    status: 'Draft' | 'New' | 'Receiving' | 'Submitted' | 'Completed' | 'Rejected' | 'Cancelled';
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
    lines?: GoodsReceiptLine[];
    history?: StatusHistoryEvent[];
}
export interface GoodsReceiptLine {
    id: string;
    gr_id: string;
    model_code: string;
    model_name: string;
    uom: string;
    tracking_type: TrackingType;
    qty_planned: number;
    qty_received?: number;
    diff_qty?: number;
}
export interface GoodsReceiptSerialDetail {
    serial_no: string;
}
export interface GoodsReceiptLotDetail {
    lot_code: string;
    qty: number;
    expiry_date?: string;
}

// Goods Issue
export interface GoodsIssueSerialDetail {
    serial_no: string;
}
export interface GoodsIssueLotDetail {
    lot_code: string;
    qty: number;
}
export interface GoodsIssueNoneDetail {
    qty: number;
}

export interface GoodsIssue {
    id: string;
    gi_no: string;
    issue_type: 'Sales Order' | 'Transfer' | 'Adjustment' | 'Other';
    issue_mode: 'Summary' | 'Detail';
    status: 'Draft' | 'New' | 'Picking' | 'AdjustmentRequested' | 'Submitted' | 'Completed' | 'Cancelled';
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
}
export interface GoodsIssueLine {
    id: string;
    gi_id: string;
    model_code: string;
    model_name: string;
    uom: string;
    tracking_type: TrackingType;
    qty_planned: number;
    qty_picked?: number;
    location_code: string;
    onhand: number;
    details?: (GoodsIssueSerialDetail | GoodsIssueLotDetail | GoodsIssueNoneDetail)[];
}