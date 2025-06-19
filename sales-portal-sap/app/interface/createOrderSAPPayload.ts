import { CreateOrderSAPItems } from "./createOrderSAPItems";

export interface CreateOrderSAPPayload {
    UniqueID: string,
    DocType: string,
    SalesOrg: string,
    DistChannel: string,
    Division: string,
    SoldTo: string,
    ShipTo: string,
    Unloading:string,
    PDP: string,
    PoNumber: string,
    PoDate: string,
    ReqDate: string,
    PayTerms: string,
    NAVITEM: CreateOrderSAPItems[],
    NAVRESULT: any[],
}