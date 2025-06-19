export default class CreteOrder {
    submit?: boolean;
    error?: boolean;
    doc_type?: string;
    sales_org: string;
    distribution_channel: string;
    division: string;
    soldto?: string;
    shipto: any;
    unloadingpoint?: string;
    so_number?: string;
    po_number: string;
    po_date: string;
    req_date: string;
    items: any[];
    partners: any[];
    navresult: any[];
    order_payload: any;
    order_response: any;
    order_total_amount?: string;
    distributor?: string;
    order_type?: string;
    original_items: any[];

    constructor() {
        this.submit= false;
        this.error= false;
        this.doc_type= '';
        this.sales_org= '';
        this.distribution_channel= '';
        this.division= '';
        this.soldto= '';
        this.shipto= {};
        this.unloadingpoint= '';
        this.so_number= '';
        this.po_number= '';
        this.po_date= '';
        this.req_date= '';
        this.items = [];
        this.partners = [];
        this.navresult = [];
        this.order_payload= {};
        this.order_response= {};
        this.order_total_amount= '';
        this.distributor = '';
        this.order_type = '';
        this.original_items = [];
    }

    setValue(prop: string, value: any){
        this[prop] = value;
    }
}