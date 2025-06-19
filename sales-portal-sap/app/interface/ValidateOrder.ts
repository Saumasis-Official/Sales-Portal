import { OrderTypes } from "../../enum/OrderTypes";
import { ValidateOrderResponse } from "./ValidateOrderResponse";
export interface ValidateOrderInterface {
    order_type: OrderTypes;
    validatePayload(order_data:any): {status: boolean, message: string};
    validate(order_data: any,distributor_id:string, user: any): Promise<ValidateOrderResponse>;
    saveOrder(order_data: any, sap_payload: any, sap_response: any,  distributor_id: string, user: any): Promise<{status: boolean, message: string, data: any}>;
}