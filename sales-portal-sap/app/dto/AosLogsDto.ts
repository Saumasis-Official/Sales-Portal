class AosLogsDto{
    distributor_code: string;
    sap_validation_payload_1: {} | null;
    sap_validation_payload_2: {} | null;
    sap_submit_payload: {} | null;
    sap_submit_response: {} | null;
    errors: string | null;

    constructor(distributor_code: string) {
        this.distributor_code = distributor_code;
        this.sap_validation_payload_1 = null;
        this.sap_validation_payload_2 = null;
        this.sap_submit_payload = null;
        this.sap_submit_response = null;
        this.errors = null;
    }
}

export default AosLogsDto;