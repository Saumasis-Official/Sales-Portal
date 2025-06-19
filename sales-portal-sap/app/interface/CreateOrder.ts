import { OrderTypes } from "../../enum/OrderTypes";
import { CreateOrderResponse } from "./CreateOrderResponse";
import { CreateOrderSAPPayload } from "./createOrderSAPPayload";
export interface CreateOrderInterface {
    order_type: OrderTypes;
    createPayload(order_data:any): CreateOrderSAPPayload;
    create(po_number: string, user: any): Promise<CreateOrderResponse>;
}