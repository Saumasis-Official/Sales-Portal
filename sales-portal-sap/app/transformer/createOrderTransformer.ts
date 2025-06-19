'use strict';
import { UtilService } from '../service/UtilService';

let CreateOrderTransformer = {
  transform: (order, liquidation, self_lifting) => {
    return CreateOrderTransformer._transform(order, liquidation, self_lifting);
  },
 
  _transform: async (order, liquidation, self_lifting) => {
    if (!order) { return {}; }
    

    const obj: any = {
        "UniqueID": order.unique_id ? order.unique_id.toString() : "",
        "DocType": (order.doc_type ? order.doc_type.toString() : (liquidation ? "ZLIQ" : "ZOR")),
        "SalesOrg": order.sales_org ? order.sales_org.toString() : "1010",
        "DistChannel": order.distribution_channel ? order.distribution_channel.toString() : (self_lifting ? "40" : "10"),
        "Division": order.division ? order.division.toString() : "10",
        "SoldTo": order.soldto ? order.soldto.toString() : "",
        "ShipTo": order.shipto ? order.shipto.toString() : "",
        "PoNumber": order.po_number ? order.po_number.toString() : "",
        "PoDate": order.po_date ? order.po_date.toString() : "",
        "ReqDate": order.req_date ? order.req_date.toString() : "",
        "PayTerms": order.pay_terms ? order.pay_terms.toString() : "",
        "NAVITEM": CreateOrderTransformer._transformItems(order.items, self_lifting),
        "NAVRESULT": [],
        "Unloading": order.unloading ? order.unloading.toString() : "",
        "PDP": order.pdp ? order.pdp : "",
      };

    let po_type:string|null = null;
    let app_level_settings:any = null;
    
    if(order?.po_number.startsWith('RO')){
      po_type = 'RO';
    }else if(order?.po_number.startsWith('BO')){
      po_type = 'BO';
    }
    else if(order?.po_number.startsWith('CCO') ){
        const response = await UtilService.getAppLevelConfigurations();
        app_level_settings  = response?.rows;

        if (app_level_settings && app_level_settings?.length > 0) {
          const appconfig = app_level_settings.find(config => config.key === 'CCO_PO_VALIDITY');
          if (appconfig) {
              let ccoValidityDate = appconfig?.value;
              if (ccoValidityDate === '') {
                  obj['PoValidity'] = '';
              } else {
                  ccoValidityDate = parseInt(ccoValidityDate, 10);
                  if (isNaN(ccoValidityDate)) {
                      ccoValidityDate = 0;
                  }
                  const purchaseDate = order?.po_date;
                  const [dayStr, monthStr, yearStr] = purchaseDate.split('.');
                  const day = Number(dayStr);
                  const month = Number(monthStr);
                  const year = Number(yearStr);

                  const purchaseDateObj = new Date(year, month - 1, day);
                  purchaseDateObj.setDate(purchaseDateObj.getDate() + ccoValidityDate);

                  const formattedDay = String(purchaseDateObj.getDate()).padStart(2, '0');
                  const formattedMonth = String(purchaseDateObj.getMonth() + 1).padStart(2, '0');
                  const formattedYear = purchaseDateObj.getFullYear();
                  const poValidity = `${formattedDay}.${formattedMonth}.${formattedYear}`;

                  obj['PoValidity'] = poValidity;
              }
          }
        }
    }

    if(po_type){
      obj["PoType"] = po_type;
    }
    return obj;
  },
  _transformItems: (items, self_lifting) => {
    if (Array.isArray(items)) {
      let output = [];
      items.map((item) => {
        output.push(CreateOrderTransformer._transformItemData(item, self_lifting));
      });
      return output;
    }
    else {
      return CreateOrderTransformer._transformItemData(items, self_lifting);
    }
  },
  _transformItemData: (item, self_lifting) => {
    if (!item) { return {}; }
    const obj: any = {};
    if('ReqDeliveryDate' in item){
      obj["ReqDeliveryDate"] = item.ReqDeliveryDate;
    }
    return Object.assign({}, {
      "ItemNumber": item.item_number ? item.item_number.toString() : '',
      "SystemSKUCode": item.material_code ? item.material_code.toString() : '',
      "TargetQty": item.required_qty ? item.required_qty.toString() : '',
      "SalesUnit": item.sales_unit ? item.sales_unit.toString() : '',
      "Sales_Org": item.sales_org ? item.sales_org.toString() : "1010",
      "Distr_Chan": item.distribution_channel ? item.distribution_channel.toString() : (self_lifting ? "40" : "10"),
      "Division": item.division ? item.division.toString() : "10",
    }, obj);
  },
}

export default CreateOrderTransformer;

