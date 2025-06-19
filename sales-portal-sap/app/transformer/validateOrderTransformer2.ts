import { OrderForValidation } from "../interface/orderForValidation";
import { ItemsForValidation } from "../interface/itemsForValidation";
import { PartnersForValidation } from "../interface/partnersForValidation";
import { sapPayloadPartners } from "../interface/sapPayloadPartners";
import { SapValidationPayloadItems } from "../interface/sapValidationPayloadItems";

export class ValidateOrderTransformer {
    static transform(order_data: OrderForValidation): any {
        if(!order_data){
            throw new Error("Invalid order data");
        }
        return {
            "DOC_TYPE": order_data.doc_type.toString(),
            "SALES_ORG": order_data.sales_org.toString(),
            "DISTR_CHAN": order_data.distribution_channel.toString(),
            "DIVISION": order_data.division.toString(),
            "REQ_DATE_H": order_data.req_date.toString(),
            "PURCH_NO": order_data.po_number.toString(),
            "PURCH_DATE": order_data.pur_date.toString(),
            "Itemset": ValidateOrderTransformer.transformItems(order_data.items),
            "partnerset": ValidateOrderTransformer.transformPartners(order_data.partners),
            "NAVRESULT": []
        }
    }
    static transformItems(items: ItemsForValidation[]): SapValidationPayloadItems[] {
        if(!items || !items.length){
            throw new Error("Invalid items data");
        }
        const transformedItems = items.map((item) => {
            return {
                "MATERIAL": item.material_code.toString(),
                "ITM_NUMBER": item.item_number.toString(),
                "TARGET_QTY": item.target_qty.toString(),
                "REQ_QTY": item.required_qty.toString(),
                "SALES_ORG": item.sales_org.toString(),
                "DISTR_CHAN": item.distribution_channel.toString(),
                "DIVISION": item.division.toString()
            }
        });
        return transformedItems;
    }
    static transformPartners(partners: PartnersForValidation[]): sapPayloadPartners[]{
        if(!partners){
            throw new Error("Invalid partners data");
        }
        const transformedPartners = partners.map((partner) => {
            return {
                "PARTN_ROLE": partner.partner_role.toString(),
                "PARTN_NUMB": partner.partner_number.toString()
            }
        });
        return transformedPartners;
    }
}