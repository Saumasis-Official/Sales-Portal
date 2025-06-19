export interface OrderSummary {
    distributor_code: string;
    distributor_name: string;
    order_date: string;
    sold_to: string;
    sold_to_name: string;
    ship_to: string;
    ship_to_name: string;
    unloading_point: string | null;
    unloading_point_name: string | null;
    errors: string | null;
    po: string | null;
    so: string | null;
}

export interface OrderDetails {
    psku: string;
    psku_description: string;
    division: string;
    sn_cv: number | null;
    sih: number | null;
    sit: number | null;
    oo: number | null;
    soq: number | null;
    last_order_placed_qty: string | null;
    last_order_placed_po: string | null;
    pak_to_cs: number | null;
    base_to_case: number | null;
    soq_norms: number | null;
    sku_soq_norms: number | null;
    sap_validation_error_attempt_1: string | null;
    sap_validation_error_attempt_2: string | null;
    order_date: string | null;
}

export interface PDPDetails {
    division: string;
    pdp: string | null;
    order_window_start: string | null;
    order_window_end: string | null;
    status: string;
}