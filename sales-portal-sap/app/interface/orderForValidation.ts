import { ItemsForValidation } from "./itemsForValidation";
import { PartnersForValidation } from "./partnersForValidation";

interface OrderForValidation {
    po_number: string;
    doc_type: string;
    sales_org: string;
    distribution_channel: string;
    division: string;
    items: ItemsForValidation[];
    partners: PartnersForValidation[];
    req_date : string;
    pur_date : string;
}

const orderForValidationObj: OrderForValidation = {
    po_number: '',
    doc_type: '',
    sales_org: '',
    distribution_channel: '',
    division: '',
    items: [],
    partners: [],
    req_date: '',
    pur_date: ''
};

export { OrderForValidation, orderForValidationObj };