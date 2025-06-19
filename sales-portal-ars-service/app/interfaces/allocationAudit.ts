interface AllocationAudit {
    area_code: string;
    psku: string;
    applicable_month: string;
    payload: {}[];
    error_log: string | null;
    query: string;
}

export default AllocationAudit;