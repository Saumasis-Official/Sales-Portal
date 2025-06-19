'use strict';

let ValidateOrderTransformer = {
  transform: (order, liquidation, self_lifting) => {
    return ValidateOrderTransformer._transform(order, liquidation, self_lifting);
  },
  _transform: (order, liquidation, self_lifting) => {
    if (!order) { return {}; }
    return {
      "DOC_TYPE": (order.doc_type ? order.doc_type.toString() : (liquidation ? "ZLIQ" : "ZOR")),
      "SALES_ORG": order.sales_org ? order.sales_org.toString() : "1010",
      "DISTR_CHAN": order.distribution_channel ? order.distribution_channel.toString() : (self_lifting ? "40" : "10"),
      "DIVISION": order.division ? order.division.toString() : "10",
      "REQ_DATE_H": "",
      "PURCH_NO": "",
      "PURCH_DATE": "",
      "Itemset": ValidateOrderTransformer._transformItems(order.items, self_lifting),
      "partnerset": ValidateOrderTransformer._transformPartners(order.partners),
      "NAVRESULT": []
    };
  },
  _transformItems: (items, self_lifting) => {
    if (Array.isArray(items)) {
      let output = [];
      items.map((item) => {
        output.push(ValidateOrderTransformer._transformItemData(item, self_lifting));
      });
      return output;
    }
    else {
      return ValidateOrderTransformer._transformItemData(items, self_lifting);
    }
  },
  _transformItemData: (item, self_lifting) => {
    if (!item) { return {}; }
    const obj: any = {};
    return Object.assign({}, {
      "MATERIAL": item.material_code ? item.material_code.toString() : '',
      "ITM_NUMBER": item.item_number ? item.item_number.toString() : '',
      "TARGET_QTY": item.target_qty ? item.target_qty.toString() : '',
      "REQ_QTY": item.required_qty ? item.required_qty.toString() : '',
      "SALES_ORG": item.sales_org ? item.sales_org.toString() : "1010",
      "DISTR_CHAN": item.distribution_channel ? item.distribution_channel.toString() : (self_lifting ? "40" : "10"),
      "DIVISION": item.division ? item.division.toString() : "10",
    }, obj);
  },
  _transformPartners: (partners) => {
    if (Array.isArray(partners)) {
      let output = [];
      partners.map((partner) => {
        output.push(ValidateOrderTransformer._transformPartnerData(partner));
      });
      return output;
    }
    else {
      return ValidateOrderTransformer._transformPartnerData(partners);
    }
  },
  _transformPartnerData: (partner) => {
    if (!partner) { return {}; }
    const obj: any = {};

    return Object.assign({}, {
      "PARTN_ROLE": partner.partner_role ? partner.partner_role.toString() : '',
      "PARTN_NUMB": partner.partner_number ? partner.partner_number.toString() : ''
    }, obj);
  }
}

export default ValidateOrderTransformer;

