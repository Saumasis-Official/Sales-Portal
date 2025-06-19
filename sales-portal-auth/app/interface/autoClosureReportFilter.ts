export interface AutoClosureReportFilter {
    order_types?: string[] | null;
    sales_order_types?: string[] | null;
    so_numbers?: string[] | null;
    order_date_range?: string[] | null;
    search?: string | null;
    limit?: number | null;
    offset?: number | null;
    upload_so?: boolean | null;
    customer_groups?: string[] | null;
}
