/**
 * SAMPLE REPORT ISSUE REQ BODY
 *  {
    remarks: "",
    categoryId: 0,
    ccRecipients: "",
    tse: {
        first_name: "",
        last_name: "",
        email: "",
        mobile_number: "",
        code: ""
    },
    errorCode: "",
    errorMessage: "",
    logObj: {
        sales_order_data: {
            sales_org: "",
            distribution_channel: 0,
            division: "",
            items: [
                {
                    material_code: "",
                    item_number: "",
                    required_qty: "",
                    target_qty: "",
                    pack_type: "",
                    sales_unit: "",
                    description: "",
                    sales_org: "",
                    distribution_channel: 0,
                    division: 0,
                    stock_in_hand: "",
                    stock_in_transit: "",
                    open_order: "",
                }
            ],
            partners: [
                {
                    partner_role: "",
                    partner_number: "",
                }
            ],
            po_number: "",
            po_date: "",
            req_date: "",
            navresult: [],
            distributor: {
                id: "",
                name: "",
                mobile: "",
                email: "",
                market: "",
                channel_code: "",
                area_code: "",
                city: "",
                postal_code: "",
                liquidation: false,
                enable_pdp: false,
                ao_enable: false,
                region: "",
                customer_group: "",
                customer_group_code: "",
                group5: "",
                group5_name: "",
                distributor_sales_details: [
                    {
                        distributor_id: "",
                        sales_org: 0,
                        distribution_channel: 0,
                        division: 0,
                        line_of_business: 0,
                        reference_date: "",
                        pdp_day: "",
                        plant_name: "",
                        plant_description: "",
                        division_description: "",
                    }
                ],
                tse: {
                    first_name: "",
                    last_name: "",
                    email: "",
                    mobile_number: "",
                    code: "",
                },
                asm: {
                    first_name: "",
                    last_name: "",
                    email: "",
                    mobile_number: "",
                    code: "",
                }
            },
            order_type: "",
        },
        errors: [
            {
                item_number: "",
                message: ""
            }
        ],
    }
};
 */
export class SalesOrderData {
    sales_org: string;
    distribution_channel: number;
    division: string;
    items: Array<any>;
    partners: any;
    po_number: string;
    po_date: string;
    req_date: string;
    navresult: any[];
    distributor: any;
    order_type: string;

    constructor(regionDetails, recommendation) {
        this.sales_org = '1010';
        this.distribution_channel = 10;
        this.distributor = regionDetails;
        this.division = '10';
        this.items = recommendation;
        this.order_type = 'AUTO_ORDER';
        this.navresult = [];
    }
};
export class ErrorLogDetails {
    sales_order_data: SalesOrderData;
    errors: Array<any>;
    constructor(salesOrderData, errors) {
        this.sales_order_data = salesOrderData;
        this.errors = errors;
    };

    setErrors(error) {
        this.errors.push(error);
    }
}
export class ErrorLog {
    remarks: string;
    categoryId: number;
    ccRecipients: string;
    tse: [];
    errorCode: string;
    errorMessage: string;
    logObj: ErrorLogDetails;
    allTentativeAmountsZero: boolean;
    itemNumbersReceivedFromSAPValidationResponseCount: number;
    itemsSentForValidationCount: number;
    missingItemsFromSAPValidation: Array<{ item_number: string, psku_code: string }>;
    dbSpecificErrorExist: boolean;
    constructor(tse, cc, errors) {
        this.categoryId = 7;
        this.remarks = 'Portal generated validation process encountered error';
        this.errorCode = "ERR-DBO-OVAL-009-TENT-AMOUNT";
        this.errorMessage = "Unable to get tentative amount value";
        this.ccRecipients = cc;
        this.tse = tse;
        this.logObj = errors;
        this.allTentativeAmountsZero = false;
        this.itemNumbersReceivedFromSAPValidationResponseCount = 0;
        this.itemsSentForValidationCount = 0;
        this.missingItemsFromSAPValidation = [];
        this.dbSpecificErrorExist = false;
    }
}