import { CreateOrderSAPItems } from '../interface/createOrderSAPItems';
import { CreateOrderSAPPayload } from '../interface/createOrderSAPPayload';

export class CreateOrderTransformer2 {
    static transform(data: any): CreateOrderSAPPayload {
        const shipTo = data['partnerset'].find((partner: any) => partner['PARTN_ROLE'] === 'WE')?.PARTN_NUMB || '';
        const soldTo = data['partnerset'].find((partner: any) => partner['PARTN_ROLE'] === 'AG')?.PARTN_NUMB || '';
        const unloading = data['partnerset'].find((partner: any) => partner['PARTN_ROLE'] === 'Y1')?.PARTN_NUMB || shipTo;
        if (!shipTo || !soldTo || !unloading) {
            throw new Error('Missing required partners in order_data -> partnerset');
        }

        if (
            !data['DOC_TYPE'] ||
            !data['SALES_ORG'] ||
            !data['DISTR_CHAN'] ||
            !data['DIVISION'] ||
            !data['PURCH_NO'] ||
            !data['PURCH_DATE'] ||
            !data['REQ_DATE_H'] ||
            !data['Itemset']
        ) {
            throw new Error('Missing required fields in order_data');
        }
        const transformedData: CreateOrderSAPPayload = {
            UniqueID: '',
            DocType: data['DOC_TYPE'],
            SalesOrg: data['SALES_ORG'],
            DistChannel: data['DISTR_CHAN'],
            Division: data['DIVISION'],
            SoldTo: soldTo,
            ShipTo: shipTo,
            Unloading: unloading,
            PDP: data?.PDP || '',
            PoNumber: data['PURCH_NO'],
            PoDate: data['PURCH_DATE'],
            ReqDate: data['REQ_DATE_H'],
            PayTerms: '',
            NAVITEM: this.transformItems(data?.Itemset || []),
            NAVRESULT: [],
        };
        return transformedData;
    }

    static transformItems(items: any[]): CreateOrderSAPItems[] {
        if (!items.length) {
            throw new Error('order_data -> Itemset is empty');
        }
        return items.filter(item => +(item['TARGET_QTY']) > 0).map(item => {
            if(!item['ITM_NUMBER'] || !item['MATERIAL'] || !item['TARGET_QTY'] ||  !item['SALES_ORG'] || !item['DISTR_CHAN'] || !item['DIVISION']) {
                throw new Error('Missing required fields in order_data -> Itemset for some items');
            }
            return {
                ItemNumber: item['ITM_NUMBER'],
                SystemSKUCode: item['MATERIAL'],
                TargetQty: item['TARGET_QTY'],
                SalesUnit: item?.SALES_UNIT || "",
                Sales_Org: item['SALES_ORG'],
                Distr_Chan: item['DISTR_CHAN'],
                Division: item['DIVISION'],
            };
        });
    }
}
