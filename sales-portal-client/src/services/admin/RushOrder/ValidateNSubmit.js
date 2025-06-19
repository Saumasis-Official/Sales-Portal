import React, { useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import * as AdminAction from '../actions/adminAction';
import * as DBAction from '../../distributor/action';
import * as DashAction from '../../distributor/actions/dashboardAction';
import ErrorFormat from '../../../config/error';

const ValidateNSubmit = (props) => {
    const { po_data, distributor_data, liquidation, selflifting, autoOrder, raised_by, validate, submit, validateSubmit, afterSubmit, validateDistributorSalesOrder, createDistributorSalesOrder, submitResponse, getPODetails, po_number, distributor_id } = props;
    const distributorData = useRef(null);
    const poData = useRef(null);

    useEffect(() => {
        if(po_data){
            poData.current = po_data;
        }
        if(distributor_data){
            distributorData.current = distributor_data;
        }
    }, [po_data, distributor_data]);

    useEffect(() => {
        if(validateSubmit){
            validateAndSubmit();
        }
    },[validateSubmit]);


    const validateAndSubmit = async () => {
        await validateItems(poData.current, distributorData.current, liquidation, selflifting, autoOrder);
    };

    const validateItems = async (po, db, liq, self, auto) => {
        if(po && Object.keys(po).length){
            const partners = po.partnerset.map((partner) => {
                return {
                    partner_name: partner.PARTN_NAME,
                    partner_role: partner.PARTN_ROLE,
                    partner_number: partner.PARTN_NUMB,
                };
            });
            const items = po.Itemset.map((item) => {
                return {
                    description: item.DESCRIPTION,
                    distribution_channel: +(item.DISTR_CHAN),
                    division: +(item.DIVISION),
                    item_number: item.ITM_NUMBER,
                    material_code: item.MATERIAL,
                    open_order: item.open_order,
                    pack_type: item.PACK_TYPE,
                    required_qty: item.REQ_QTY,
                    sales_org: +(item.SALES_ORG),
                    sales_unit: item.SALES_UNIT,
                    stock_in_hand: item.stock_in_hand,
                    stock_in_transit: item.stock_in_transit,
                    target_qty: item.TARGET_QTY
                };
            });
            const validate_payload = {
                sales_org: (po.SALES_ORG),
                distribution_channel: +(po.DISTR_CHAN),
                division: (po.DIVISION),
                items: items,
                navresult: [],
                partners: partners,
                po_date: po.PURCH_DATE,
                po_number: po.PURCH_NO,
                req_date: po.REQ_DATE_H,
                pdp: 'OFF'
            };
            const validate_response = await validateDistributorSalesOrder(validate_payload, db.id);
            if(validate_response?.data?.success){
                
               createOrder(po, validate_response.data.data.d, db, liq, self, auto);
                // postValidate(true, validate_response?.data?.data);
            }else{
                postValidate(false, validate_response?.data?.data?.d);
            }
            // postSubmit();
        };
    };

    const postValidate = (status, data) => {
        if(status === false){
            submitResponse.current = {validateSuccess: false, createSuccess: false, validateData: data, createData: null};
            afterSubmit(false);
        }else{
            submitResponse.current = {validateSuccess: true, createSuccess: false, validateData: data, createData: null};
        }
    }

    const createOrder = async (po, vr, db, liq, self, auto) => {
        if(po && Object.keys(po).length && vr && Object.keys(vr).length){
            const { NAVRESULT } = vr;
            const navresult = NAVRESULT.results;

            const filteredNavMap = new Map();
            navresult.filter(item => item.Message === 'Order ready for creation').forEach(item => {
                filteredNavMap.set(item.Item, item);
            });

            let itemType = 'dist_specific';
            const tonn = po.Itemset.reduce((acc, item) => {
                const val = +(item.Quantity_Ton.split(' ')[0]);
                if(item.item_type === 'universal')
                    itemType = 'universal';
                return acc + val;
            },0);

            const filteredItems = po.Itemset
                                    .filter(item => filteredNavMap.has(item.ITM_NUMBER))
                                    .map(item => {
                                                return {
                                                    item_number: item.ITM_NUMBER,
                                                    distribution_channel: +(item.DISTR_CHAN),
                                                    division: +(item.DIVISION),
                                                    material_code: item.MATERIAL,
                                                    required_qty: item.REQ_QTY,
                                                    sales_org: +(item.SALES_ORG),
                                                    sales_unit: item.SALES_UNIT,
                                                };
                                            });
            
            const unloading = po.partnerset.find(partner => partner.PARTN_ROLE === 'Y1');
        
            const create_order_payload = {
                sales_org: (po.SALES_ORG),
                distribution_channel: +(po.DISTR_CHAN),
                division: (po.DIVISION),
                items: filteredItems,
                navresult: [],
                po_date: po.PURCH_DATE,
                po_number: po.PURCH_NO,
                req_date: po.REQ_DATE_H,
                pdp: 'OFF',
                soldto : db.id,
                shipto : po.partnerset.find(partner => partner.PARTN_ROLE === 'WE').PARTN_NUMB,
                unloading : unloading ? unloading.PARTN_NUMB : '',
                ton : tonn,
                product_type: itemType,
                pay_terms: ""
            };
            if(po.PURCH_NO?.startsWith('RO')){
                create_order_payload['raised_by'] = raised_by;
            }
            const create_response = await createDistributorSalesOrder(create_order_payload, db.id);
            if(create_response?.data?.success === true){
                postSubmit(true, create_response.data.data.d, vr);
            }else{
                postSubmit(false, create_response?.data?.data?.d, vr);
            }
        }
    };

    const postSubmit = (status,data,v_data=null) => {
        if(status === false){
            submitResponse.current = {validateSuccess: true, createSuccess: false, validateData: v_data, createData: data};
        }else{
            submitResponse.current = {validateSuccess: true, createSuccess: true, validateData: v_data, createData: data};
        }
        afterSubmit(false);
    };

    return null;
};


const mapStateToProps = (state) => {
    return {
      po_details: state.dashboard.get('po_details'),
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        getPODetails: (po_number,distributor_id) => dispatch(DashAction.getPODetails(po_number,distributor_id)),
        validateDistributorSalesOrder: (data, distributorId, liquidation, selflifting, autoOrder) =>
            dispatch(DBAction.validateDistributorSalesOrder(data, distributorId, liquidation, selflifting, autoOrder)),
        createDistributorSalesOrder: (data, distributorId, liquidation, selflifting, autoOrder) =>
            dispatch(DBAction.createDistributorSalesOrder(data, distributorId, liquidation, selflifting, autoOrder)),
    };
};

export default connect(
    mapStateToProps,
    mapDispatchToProps
  )(ValidateNSubmit);