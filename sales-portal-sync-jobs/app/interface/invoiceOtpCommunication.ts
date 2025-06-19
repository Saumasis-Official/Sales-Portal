export interface DeliveryCodeCommunication {
    distributor_code: string;
    invoice_number: string;
    otp: string;
    // ship_to: string;
    // unloading_point: string;
}

export interface DeliveryCodeEmail {
    distributor_code: string;
    distributor_name: string;
    invoice_number: string;
    delivery_code: string;
    email: string;
    mobile: string;
}
