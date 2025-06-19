import React, { useEffect, useState, useRef } from 'react';
import { connect } from 'react-redux';
import jwt from 'jsonwebtoken';
import { notification, Select } from 'antd';
import Auth from '../../../util/middleware/auth';
import * as Action from '../action';
import * as ErrorAction from '../actions/errorAction';
import * as DashboardAction from '../actions/dashboardAction';
import * as AuthAction from '../../auth/action';
import * as AdminAction from '../../admin/actions/adminAction';
import Util from '../../../util/helper/index';
import ValidateOrderTransomer from '../../../transformer/validateOrder';
import CreateOrderTransomer from '../../../transformer/createOrder';
import "antd/dist/antd.css";
import MaterialTable from '../CreateOrder/CreateOrderMaterialTable';
import '../CreateOrder/CreateOrder.css';
import { errorReportFormat } from '../../../config/error';
import UniversalSearchToggle from '../../../components/UniversalSearchToggle';
import useWindowDimensions from '../../../hooks/useWindowDimensions';
import config from '../../../config';
import { PARTNER_MISMATCH_CATEGORY } from '../../../config/constant';
import moment from 'moment';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Switch } from 'antd';
import * as Actions from '../../admin/actions/adminAction';
import { authenticatedUsersOnly } from '../../../util/middleware';
const appConfig = config.app_level_configuration;

const { Option } = Select;

let ReOrder = props => {
    const browserHistory = props.history;
    const { width } = useWindowDimensions();
    let access_token = Auth.getAccessToken();
    let admin_access_token = Auth.getAdminAccessToken();
    if (props.location.pathname.split('/')[1] === 'distributor') {
        authenticatedUsersOnly(props.location.pathname, props.history);
      }
    let login_id = '';
    let role = Auth.getRole();
    const { getMaintenanceRequests } = props;
    useEffect(() => {
        getMaintenanceRequests();
    }, []);

    if (access_token || admin_access_token) {
        if (!role) {
            login_id = jwt.decode(access_token).login_id;
        } else {
            login_id = props.location.state && props.location.state.distributorId;
        }
    } else if (!role) {
        browserHistory.push('/');
    }

    const { createOrderData, warehouses, app_level_configuration, region_details, sso_user_details, getSSODetails } = props;
    const { pdp_day, reference_date } = region_details;

    const ssoRole = sso_user_details.data && sso_user_details.data.length && sso_user_details.data[0].roles;
    const isSupportRole = (ssoRole.includes('SUPPORT'));

    if (login_id && login_id !== "" && warehouses && Object.keys(warehouses).length === 0) {
        props.distributorUpdateCreateOrderFormField({ field: 'soldto', value: login_id });
    }

    useEffect(() => {
        if (login_id && login_id !== "" && warehouses && Object.keys(warehouses).length === 0) {
            props.getWarehouseDetails(login_id).then((data) => {
                if (data && data.success === false) {
                    errorHandler(data.error, data.message);
                }
            }).catch((err) => {
            });
        }
    }, [warehouses]);

    const mappedReOrderDetail = async () => {
        if (!materials.length) return;
        const previousOrderProductType = props.location.state.order_product_type;
        let mappedData = [];
        const reOrderData = props.location.state.data;
        mappedData = reOrderData.map((item, index) => {
            return materials.map(element => {
                if (item.MAT_ENTRD === element.code) {
                    const orderItem = {
                        materials: [element],
                        code: item.MAT_ENTRD,
                        quantity: '',
                        description: element.description,
                        sales_unit: element.sales_unit,
                        pak_type: element.pak_type,
                        buom: '',
                        tentative: '',
                        disabled: '',
                        selectedValue: item.MAT_ENTRD,
                        item_number: ((index + 1) * 10).toString().padStart(6, '0'),
                        error: '',
                        class: '',
                    };

                    if (region_details && region_details.area_code && region_details.channel_code && element.appl_area_channel && element.appl_area_channel.some(obj => (obj.area === region_details.area_code) && (obj.channel === region_details.channel_code))) {
                        orderItem['item_type'] = 'dist_specific';
                    } else {
                        orderItem['item_type'] = 'universal';
                    }
                    return orderItem;
                }
            }).filter(i => i);
        });
        return mappedData;
    };

    useEffect(async () => {
        const {is_nourishco} = region_details;
        const allMaterials = await Action.getMaterialsCodes(null, false, login_id,false,is_nourishco);
        if (allMaterials && allMaterials.status === 200) {
            const { data = [] } = allMaterials.data;
            setMaterials(data);
        }

        if (login_id && login_id !== "" && warehouses && Object.keys(warehouses).length === 0) {
            props.getWarehouseDetails(login_id).then((data) => {
                if (data && data.success === false) {
                    errorHandler(data.error, data.message);
                }
            }).catch((err) => {
            });
        }
        if (login_id && login_id !== '') {
            props.distributorUpdateCreateOrderFormField({ field: 'items', value: [] });
        }
    }, [login_id]);

    const validationFlag = createOrderData.get('submit');

    const [tableItems, setTableItems] = useState([]);
    const [totalAmount, setTotalAmount] = useState(0);
    const [shipPartnerData, setShipPartnerData] = useState({});
    const [unloadingPartnerData, setUnloadingPartnerData] = useState({});
    const [partnerMarket, setPartnerMarket] = useState('-');
    const [partnersList, setPartnersList] = useState([{ partner_role: "AG", partner_number: login_id }]);
    const orderItemList = createOrderData.get('items');
    const [toggleText, setToggleText] = useState(false); // orderProductType ? (orderProductType === 'UNIVERSAL') : true
    const [authorizeToggleBasedSearch, setAuthorizeToggleBasedSearch] = useState(false);
    const [orderList, setOrderList] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [defaultSearch, setDefaultSearch] = useState(null);
    const [allowedToOrder, setAllowedToOrder] = useState(false);
    const [pdpMessage, setPdpMessage] = useState('');
    const [authorizePdpRestriction, setAuthorizePdpRestriction] = useState(false);
    const [pdpWeeklyOrderWindow, setPdpWeeklyOrderWindow] = useState();
    const [pdpFortnightlyOrderWindow, setPdpFortnightlyOrderWindow] = useState();
    const [pdpOrderPlacementTime, setPdpOrderPlacementTime] = useState();
    const [pdpWeeklyOff, setPdpWeeklyOff] = useState();
    const [selectPlaceholder, setSelectPlaceholder] = useState();
    const [partnerMismatchErrorRecipients, setPartnerMismatchErrorRecipients] = useState(null);
    const [serviceLevelCategory, setServiceLevelCategory] = useState([]);
    const allowedToOrderRef = useRef();
    const authorizePdpRestrictionRef = useRef();
    const [isLiquidationOrder, setIsLiquidationOrder] = useState(false);

    /** Function to display the messages */
    let errorHandler = (message, description) => {
        setTimeout(() => {
            notification.error({
                message: message,
                description: description,
                duration: 8,
                className: 'notification-error error-scroll'
            });
        }, 50)
    };

    /**
     * Function is used to create the sales order
     * @param {*} event 
     */
    const handleSubmit = async (event) => {
        event.preventDefault();
        let orderData = CreateOrderTransomer.transform(orderItemList);
        props.distributorUpdateCreateOrderFormField({ field: 'order_payload', value: orderData });
        const salesOrderData = {
            sales_org: createOrderData.get('sales_org'),
            distribution_channel: createOrderData.get('distribution_channel'),
            division: createOrderData.get('division'),
            soldto: login_id,
            unloading: createOrderData.get('unloadingpoint') ? createOrderData.get('unloadingpoint') : "",
            shipto: createOrderData.get('shipto'),
            po_number: createOrderData.get('po_number'),
            po_date: createOrderData.get('po_date'),
            req_date: createOrderData.get('po_date'),
            pay_terms: "",
            items: orderData,
            navresult: createOrderData.get('navresult'),
            product_type: 'dist_specific',
            distributor: region_details
        }

        for (let item of orderList) {
            if (item.item_type === 'universal') {
                salesOrderData.product_type = 'universal';
                break;
            }
        }
        let response;
        try {
            if (!login_id) {
                errorHandler(
                    'Error Occurred!',
                    'Distributor ID is required to create the sales order.'
                );
                errorReportFormat.create_order.osbt_001.logObj = salesOrderData;
                props.logAppIssue(errorReportFormat.create_order.osbt_001);
            } else if (!createOrderData.get('partners') || createOrderData.get('partners').length === 0) {
                errorHandler(
                    'Error Occurred!',
                    'Please select the shipping & unloading points.'
                );
                errorReportFormat.create_order.osbt_002.logObj = salesOrderData;
                props.logAppIssue(errorReportFormat.create_order.osbt_002);
            } else if (!orderItemList || orderItemList.length === 0) {
                errorHandler(
                    'Error Occurred!',
                    'Please enter the required materials.'
                );
                errorReportFormat.create_order.osbt_003.logObj = salesOrderData;
                props.logAppIssue(errorReportFormat.create_order.osbt_003);
            } else {
                document.getElementById("sbtbtn").disabled = true;
                delete salesOrderData.distributor;
                response = await props.createDistributorSalesOrder(salesOrderData, props.location.state && props.location.state.distributorId);
                if (response.data.success === false) {
                    document.getElementById("vldbtn").disabled = false;
                    document.getElementById("sbtbtn").disabled = true;
                    errorHandler(
                        'Error Occurred!',
                        'There may be some error occurred while creating the sales order. Please try again.'
                    );
                    salesOrderData.distributor = region_details;
                    errorReportFormat.create_order.osbt_004.errorMessage = response.data.error;
                    const error_from_sap = response.data.data.d.NAVRESULT.results.length ? response.data.data.d.NAVRESULT.results : [];
                    errorReportFormat.create_order.osbt_004.logObj = { error_from_sap, sales_order_data: salesOrderData };
                    props.logAppIssue(errorReportFormat.create_order.osbt_004);
                } else {
                    //check if partner data sent to SAP and received from SAP is same
                    //if not, report an issue
                    //fetch partner mismatch error recipients from app level settings and service level category 
                    //call report issue api with this data
                    if ((salesOrderData.shipto !== response.data.data.d.NAVRESULT.results[0].Ship_to) ||
                        (salesOrderData.soldto !== response.data.data.d.NAVRESULT.results[0].Sold_to) ||
                        (salesOrderData.unloading !== response.data.data.d.NAVRESULT.results[0].Unloading)) {
                        if (salesOrderData.unloading) {
                            delete response.data.data.d.NAVRESULT.results[0].__metadata;
                            salesOrderData.distributor = region_details;
                            errorReportFormat.create_order.osbt_006.logObj = { data_from_sap: response.data.data.d.NAVRESULT.results[0], sales_order_data: salesOrderData };;
                            let filteredCategory = serviceLevelCategory.filter((cat) => { return cat.label === PARTNER_MISMATCH_CATEGORY });
                            let partnerMismatchErrorRecipientsCCArr = [];
                            if (region_details) {
                                partnerMismatchErrorRecipientsCCArr.push(region_details.email)
                                if (region_details.asm) {
                                    const asmEmailArr = region_details?.asm?.map( item => { return item.email ?? '' }) ?? [];
                                    partnerMismatchErrorRecipientsCCArr = partnerMismatchErrorRecipientsCCArr.concat(asmEmailArr);
                                }
                                if (region_details.tse) {
                                    const tseEmailArr = region_details?.tse?.map( item => { return item.email ?? '' }) ?? [];
                                    partnerMismatchErrorRecipientsCCArr = partnerMismatchErrorRecipientsCCArr.concat(tseEmailArr);
                                }
                            }

                            let reportErrorPayload = {};
                            reportErrorPayload = {
                                remarks: filteredCategory[0].description,
                                categoryId: filteredCategory[0].id,
                                recipients: partnerMismatchErrorRecipients,
                                ccRecipients: partnerMismatchErrorRecipientsCCArr.join(','),
                                tse: region_details.tse,
                                ...errorReportFormat.create_order.osbt_006
                            };
                            const reportPortalErrorResponse = await props.reportPortalError(reportErrorPayload);
                            if (reportPortalErrorResponse && reportPortalErrorResponse.data && reportPortalErrorResponse.data.success) {
                            } else {
                                notification.error({
                                    message: 'Error',
                                    description: 'Some error occurred while reporting portal issue.',
                                    duration: 5,
                                    className: 'notification-error',
                                });
                            }
                        }
                    }
                    props.distributorResetCreateOrderFormFields();
                    props.distributorUpdateCreateOrderFormField({ field: 'order_response', value: response.data.data.d });
                    props.distributorUpdateCreateOrderFormField({ field: 'so_number', value: response.data.data.d.NAVRESULT.results[0].SalesOrder });
                    const soValue = response.data.data.d.NAVRESULT.results[0].Net_value;
                    soValue && props.distributorUpdateCreateOrderFormField({ field: 'order_total_amount', value: soValue });

                    setTimeout(() => {
                        notification.success({
                            message: "Success",
                            description: "Order has been created successfully.",
                            duration: 1,
                            className: 'notification-green'
                        });
                    }, 50);
                    props.logAppIssue({});
                    if (role) {
                        browserHistory.push({
                            pathname: "/admin/create-order-success",
                            state: {
                                distributorId: login_id
                            }
                        });
                    } else {
                        browserHistory.push("/distributor/create-order-success");
                    }
                }
            }
        } catch (err) {
            document.getElementById("vldbtn").disabled = false;
            document.getElementById("sbtbtn").disabled = true;
            errorHandler(
                "Technical Error",
                "There may be some error occurred while creating the sales order. Please try again."
            );
            const error_from_api = response.data ? [] : response;
            errorReportFormat.create_order.osbt_005.logObj = { error_from_api, sales_order_data: salesOrderData };
            props.logAppIssue(errorReportFormat.create_order.osbt_005);
        }
    };


    /**
     * This function is used to validate the sales oreder items. 
     * @param {*} event 
     */
    const handleValidate = async (event) => {
        event.preventDefault();
        let orderData = ValidateOrderTransomer.transform(orderItemList);
        const salesOrderData = {
            sales_org: createOrderData.get('sales_org'),
            distribution_channel: createOrderData.get('distribution_channel'),
            division: createOrderData.get('division'),
            items: orderData,
            partners: createOrderData.get('partners'),
            distributor: region_details,
        };
        try {
            document.getElementById("vldbtn").disabled = true;
            if (!login_id) {
                errorHandler(
                    'Error Occurred!',
                    'Distributor id is required to validate the order details.'
                )
                document.getElementById("vldbtn").disabled = false;
                errorReportFormat.validate_order.oval_001.logObj = salesOrderData;
                props.logAppIssue(errorReportFormat.validate_order.oval_001);
            } else if (!createOrderData.get('partners') || createOrderData.get('partners').length === 0) {
                errorHandler(
                    'Error Occurred!',
                    'Please enter shipping & unloading point details.'
                )
                document.getElementById("vldbtn").disabled = false;
                errorReportFormat.validate_order.oval_002.logObj = salesOrderData;
                props.logAppIssue(errorReportFormat.validate_order.oval_002);
            } else if (Object.keys(shipPartnerData).length === 0 || shipPartnerData.partner_code === "") {
                errorHandler(
                    'Error Occurred!',
                    'Please select shipping address.'
                )
                document.getElementById("vldbtn").disabled = false;
                errorReportFormat.validate_order.oval_003.logObj = salesOrderData;
                props.logAppIssue(errorReportFormat.validate_order.oval_003);
            } else if ((Object.keys(unloadingPartnerData).length === 0 || unloadingPartnerData.partner_code === "") &&
                ((warehouses && warehouses.unloading_point && warehouses.unloading_point.length) > 1)) {
                //if there are more than 1 unloading point, user has to select one of them
                //changes as per mail dated 09-05-2022
                errorHandler(
                    'Error Occurred!',
                    'Please select unloading point.'
                )
                document.getElementById("vldbtn").disabled = false;
                errorReportFormat.validate_order.oval_003.logObj = salesOrderData;
                props.logAppIssue(errorReportFormat.validate_order.oval_003);
            } else if (!orderItemList || orderItemList.length === 0) {
                errorHandler(
                    'Error Occurred!',
                    'Please enter required materials details.'
                )
                document.getElementById("vldbtn").disabled = false;
                errorReportFormat.validate_order.oval_004.logObj = salesOrderData;
                props.logAppIssue(errorReportFormat.validate_order.oval_004);
            } else if (Util.checkItemList(orderItemList).itmFlag === false) {
                errorHandler(
                    'Error Occurred!',
                    Util.checkItemList(orderItemList).errormessage
                )
                document.getElementById("vldbtn").disabled = false;
                errorReportFormat.validate_order.oval_005.errorMessage = Util.checkItemList(orderItemList).errormessage;
                errorReportFormat.validate_order.oval_005.logObj = salesOrderData;
                props.logAppIssue(errorReportFormat.validate_order.oval_005);
            } else {
                salesOrderData['po_number'] = createOrderData.get('po_number');
                salesOrderData['po_date'] = createOrderData.get('po_date');
                salesOrderData['req_date'] = createOrderData.get('po_date');
                salesOrderData['navresult'] = createOrderData.get('navresult');
                delete salesOrderData.distributor;
                const response = await props.validateDistributorSalesOrder(salesOrderData, props.location.state && props.location.state.distributorId, isLiquidationOrder);
                if (response.data.success === false) {
                    document.getElementById("vldbtn").disabled = false;
                    if (document.getElementById("sbtbtn")) document.getElementById("sbtbtn").disabled = true;
                    errorHandler('Technical Error', response.data.error);
                    if (response.data.data && response.data.data != null) {
                        const { ReqDate, PoNumber, PoDate } = response.data.data.d.NAVRESULT.results[0];
                        props.distributorUpdateCreateOrderFormField({ field: 'po_number', value: PoNumber });
                        props.distributorUpdateCreateOrderFormField({ field: 'po_date', value: PoDate });
                        props.distributorUpdateCreateOrderFormField({ field: 'req_date', value: ReqDate });
                    }
                    salesOrderData.distributor = region_details;
                    errorReportFormat.validate_order.oval_007.errorMessage = response.data.error;
                    errorReportFormat.validate_order.oval_007.logObj = salesOrderData;
                    props.logAppIssue(errorReportFormat.validate_order.oval_007);
                } else {
                    const newArr = [];
                    let totalAmount = 0;
                    let errors = [];
                    const { NAVRESULT } = response.data.data.d;
                    const navresult = NAVRESULT.results;

                    let errorInValidatingOrder = false;
                    orderItemList.map((item) => {

                        // reset error & class for each item
                        item['error'] = "";
                        item['class'] = "";

                        let itemErrorFlag = false;
                        let res = Util.filterArrayOfObjects(navresult, "Item", item.item_number);
                        if (res.length) {
                            res.map((itm, idx) => {
                                if (itm.Item === item.item_number) {
                                    item['tentative'] = itm.Tentitive || "";
                                    item['buom'] = itm.Buom || "";
                                    item['Plant'] = itm.Plant || "";
                                    item['PDP_Day'] = itm.PDP_Day || "";
                                    item['Reference_date'] = itm.Reference_date || "";
                                }
                                if (itm.Message !== 'Order ready for creation') {
                                    itemErrorFlag = true;
                                    errorInValidatingOrder = true;
                                    item['error'] += `${idx > 0 ? ';  ' : ''}${itm.Message}`;
                                    item['class'] = "red-border";
                                } else {
                                    item['error'] = "";
                                    item['class'] = "";
                                }
                            })

                            if (region_details.enable_pdp == true && authorizePdpRestriction == true) {
                                if (itemErrorFlag) {
                                    if (item['error'].includes('Order Window not open for customer')) {
                                        let { orderStartDate, orderEndDate, orderStartTime, orderEndTime, errorMessage } = Util.checkPDPDay(res[0].PDP_Day, moment(res[0].Reference_date).format('DD-MM-YYYY hh:mm A'), pdpWeeklyOrderWindow, pdpFortnightlyOrderWindow, pdpOrderPlacementTime, pdpWeeklyOff);
                                        let error_message = `${errorMessage ? errorMessage + ' ' : ''} You can place order for this item between ${moment(orderStartDate).format('dddd, MMMM DD YYYY')} ${orderStartTime} to ${moment(orderEndDate).format('dddd, MMMM DD YYYY')} ${orderEndTime}.`
                                        if (orderStartDate && orderEndDate) {
                                            item['errorArr'].push(error_message);
                                            item['error'] += `${';'}${error_message}`;
                                            item['class'] = "red-border";
                                        }
                                    }

                                }
                            }

                            if (itemErrorFlag === true) {
                                errors.push({
                                    "item_number": item.item_number,
                                    "message": item['error']
                                })
                            }
                            newArr.push(item);
                        }
                        totalAmount = parseFloat(parseFloat(totalAmount) + parseFloat(item.tentative));
                        totalAmount = Number.isInteger(totalAmount) ? totalAmount : totalAmount.toFixed(2);
                        setTotalAmount(totalAmount);
                        props.distributorUpdateCreateOrderFormField({ field: 'order_total_amount', value: totalAmount });
                    })

                    if (errorInValidatingOrder === true) {
                        setTotalAmount(0);
                    }

                    props.distributorUpdateCreateOrderFormField({ field: 'items', value: newArr });
                    if (navresult.length > 0) {
                        props.distributorUpdateCreateOrderFormField({ field: 'po_number', value: navresult[0].PoNumber });
                        props.distributorUpdateCreateOrderFormField({ field: 'po_date', value: navresult[0].PoDate });
                        props.distributorUpdateCreateOrderFormField({ field: 'req_date', value: navresult[0].ReqDate });
                    }

                    if (errors.length === 0 && totalAmount) {
                        document.getElementById("vldbtn").disabled = true;
                        if (document.getElementById("sbtbtn") && ((authorizePdpRestriction && allowedToOrder) || !authorizePdpRestriction)) document.getElementById("sbtbtn").disabled = false;
                        setTimeout(() => {
                            notification.success({
                                message: "Success",
                                description: (authorizePdpRestriction && !allowedToOrder && pdpMessage) ? `Order is saved in cart as you are outside of PDP ordering window. ${pdpMessage}` : `Order is valid and ready for creation.`,
                                duration: 5,
                                className: 'notification-green'
                            });
                        }, 50);
                        props.logAppIssue({});
                    }
                    else if (!totalAmount) {
                        document.getElementById("vldbtn").disabled = false;
                        if (document.getElementById("sbtbtn")) document.getElementById("sbtbtn").disabled = true;
                        errorHandler(
                            'Error Occurred!',
                            'Unable to get tentative amount value'
                        );
                        salesOrderData.distributor = region_details;
                        errorReportFormat.validate_order.oval_010.logObj = { sales_order_data: salesOrderData, errors };
                        props.logAppIssue(errorReportFormat.validate_order.oval_010);
                    }
                    else {
                        document.getElementById("vldbtn").disabled = false;
                        if (document.getElementById("sbtbtn")) document.getElementById("sbtbtn").disabled = true;
                        errorHandler(
                            'Error Occurred!',
                            'There is error in order items'
                        );
                        salesOrderData.distributor = region_details;
                        errorReportFormat.validate_order.oval_008.logObj = { sales_order_data: salesOrderData, errors };
                        props.logAppIssue(errorReportFormat.validate_order.oval_008);
                    }
                }
            }
        } catch (err) {
            errorHandler("Error occurred", err);
            document.getElementById("vldbtn").disabled = false;
            if (document.getElementById("sbtbtn")) document.getElementById("sbtbtn").disabled = true;
            errorReportFormat.validate_order.oval_009.errorMessage = err;
            errorReportFormat.validate_order.oval_009.logObj = salesOrderData;
            props.logAppIssue(errorReportFormat.validate_order.oval_009);
        }

    }

    /** Function to add partners */
    let handleInputChange = (selectedOption, field) => {
        let list = [...partnersList];
        const { shipping_point, unloading_point } = warehouses;
        let selectedObj = {}

        if (field === 'shipto') {
            if (!shipping_point) return;
            shipping_point.forEach((item) => {
                if (item.partner_name === selectedOption) {
                    selectedObj = item;
                    const index = list.findIndex(a => a.partner_role === 'WE');
                    if (index > -1) list.splice(index, 1);
                    list.push({ partner_role: "WE", partner_number: item.partner_code });
                    setShipPartnerData(item)
                }
            });
            if (region_details.market) {
                setPartnerMarket(region_details.market);
            } else {
                const marketDataPromise = Action.getRegionDetails(login_id);
                marketDataPromise
                    .then(result => {
                        setPartnerMarket(result.data.data.market);
                    })
                    .catch((err) => { });
            }

        } else if (field === 'unloadingpoint') {
            if (!unloading_point) return;
            unloading_point.forEach((item) => {
                if (item.partner_name === selectedOption) {
                    selectedObj = item;
                    const index = list.findIndex(a => a.partner_role === 'Y1');
                    if (index > -1) list.splice(index, 1);
                    let flag = false;
                    list.map(element => {
                        if (element.partner_role === 'Y1') {
                            flag = true;
                            element.partner_number = item.partner_code;
                            element.partner_name = item.partner_name;
                        }
                    });
                    if (!flag) {
                        list.push({ partner_role: "Y1", partner_number: item.partner_code, partner_name: item.partner_name });
                    }
                    setUnloadingPartnerData(item)
                }
            });
        }

        setPartnersList(list);
        props.distributorUpdateCreateOrderFormField({ field: 'partners', value: list });
        props.distributorUpdateCreateOrderFormField({ field, value: selectedObj.partner_code });
        props.distributorUpdateCreateOrderFormField({ field: 'sales_org', value: selectedObj.sales_org });
        props.distributorUpdateCreateOrderFormField({ field: 'distribution_channel', value: selectedObj.dist_channel });
        props.distributorUpdateCreateOrderFormField({ field: 'division', value: selectedObj.division });
        document.getElementById("vldbtn").disabled = false;
        if (document.getElementById("sbtbtn")) document.getElementById("sbtbtn").disabled = true;
    }

    /** Function to open dialog box when no unloading point is selected */
    const handleConfirmationBox = () => {
        let modal = document.getElementById("myModal");
        modal.style.display = "block";
    }

    const handleShipToValue = () => {
        //if there is only 1 unloading point, it will be automatically selected even if user do not select it.
        //changes as per mail dated 09-05-2022
        if ((Object.keys(unloadingPartnerData).length === 0)) {
            if ((warehouses && warehouses.unloading_point && warehouses.unloading_point.length) > 0) {
                const partners = partnersList;
                const item = warehouses.unloading_point[0];
                let selectedObj = item;
                const index = partners.findIndex(a => a.partner_role === 'Y1');
                if (index > -1) partners.splice(index, 1);
                let flag = false;
                partners.map(element => {
                    if (element.partner_role === 'Y1') {
                        flag = true;
                        element.partner_number = item.partner_code;
                        element.partner_name = item.partner_name;
                    }
                    return element;
                });
                if (!flag) {
                    partners.push({ partner_role: "Y1", partner_number: item.partner_code, partner_name: item.partner_name });
                }
                setPartnersList(partners);
                setUnloadingPartnerData(item);
                props.distributorUpdateCreateOrderFormField({ field: 'partners', value: partners });
                props.distributorUpdateCreateOrderFormField({ field: 'unloadingpoint', value: item.partner_code });
                props.distributorUpdateCreateOrderFormField({ field: 'sales_org', value: selectedObj.sales_org });
                props.distributorUpdateCreateOrderFormField({ field: 'distribution_channel', value: selectedObj.dist_channel });
                props.distributorUpdateCreateOrderFormField({ field: 'division', value: selectedObj.division });
                document.getElementById("vldbtn").disabled = false;
                if (document.getElementById("sbtbtn")) document.getElementById("sbtbtn").disabled = true;
            }
        }
    }

    function onToggleChange() {
        setToggleText(!toggleText);
    }

    function onLiquidationToggleChange() {
        setIsLiquidationOrder(!isLiquidationOrder);
    }

    const handleDialogClose = () => {
        let modal = document.getElementById("myModal");
        modal.style.display = "none";
    };

    useEffect(() => {
        if (document.getElementById("sbtbtn")) document.getElementById("sbtbtn").disabled = !validationFlag;
        document.getElementById("vldbtn").disabled = validationFlag;

        return () => {
            if (authorizePdpRestrictionRef.current && !allowedToOrderRef.current) {
                props.distributorResetCreateOrderCompleteFormFields();
            } else {
                props.distributorResetCreateOrderFormFields();
            }
        };
    }, [])

    useEffect(() => {
        if (warehouses && warehouses.unloading_point && warehouses.unloading_point.length > 1) {
            setSelectPlaceholder("Select One");
        }
        else {
            setSelectPlaceholder("Select...");
        }
    }, [warehouses])

    useEffect(() => {
        if (app_level_configuration && app_level_configuration.length) {
            for (let config of app_level_configuration) {
                if (!config) continue;
                if (config.key === appConfig.search_switch.key && config.value === appConfig.search_switch.enable_value) {
                    setAuthorizeToggleBasedSearch(true);
                }
                if (config.key === appConfig.default_search.key) {
                    setToggleText(config.value === appConfig.default_search.universal_value);
                    setDefaultSearch(config.value);
                }
                if (config.key === appConfig.pdp_restriction.key) {
                    setAuthorizePdpRestriction(config.value === appConfig.pdp_restriction.enable_value);
                }
                if (config.key === appConfig.pdp_weekly_order_window.key) {
                    setPdpWeeklyOrderWindow(config.value);
                }
                if (config.key === appConfig.pdp_fortnightly_order_window.key) {
                    setPdpFortnightlyOrderWindow(config.value);
                }
                if (config.key === appConfig.pdp_order_placement_time.key) {
                    setPdpOrderPlacementTime(config.value);
                }
                if (config.key === appConfig.pdp_weekly_off.key) {
                    setPdpWeeklyOff(config.value);
                }
                if (config.key === appConfig.partner_mismatch_error_recipients.key) {
                    setPartnerMismatchErrorRecipients(config.value);
                }
            }
        } else {
            props.fetchAppLevelConfiguration();
        }
    }, [app_level_configuration]);

    useEffect(async () => {
        if (!region_details || !Object.keys(region_details).length) {
            props.getRegionDetails(login_id);
        } else if (materials.length) {
            mappedReOrderDetail()
                .then(res => {
                    res = res.flat()
                    setTableItems(res);
                    setOrderList(res);
                })
                .catch((err) => {
                });
        }
    }, [region_details, materials]);

    const onClickBackButton = () => {
        browserHistory.push({
            pathname: "/admin/distributor",
            state: {
                distributorId: props.location.state && props.location.state.distributorId
            }
        });
    };

    useEffect(() => {
        const { allowedToOrder, orderStartDate, orderEndDate, orderStartTime, orderEndTime, errorMessage } = Util.checkPDPDay(pdp_day, reference_date, pdpWeeklyOrderWindow, pdpFortnightlyOrderWindow, pdpOrderPlacementTime, pdpWeeklyOff);
        setAllowedToOrder(allowedToOrder);
        if (orderStartDate && orderEndDate) setPdpMessage(`${errorMessage ? errorMessage + ' ' : ''} You can place purchase orders between ${moment(orderStartDate).format('dddd, MMMM DD YYYY')} ${orderStartTime} to ${moment(orderEndDate).format('dddd, MMMM DD YYYY')} ${orderEndTime}.`);
    }, [pdp_day, pdpWeeklyOff]);

    useEffect(() => {
        allowedToOrderRef.current = allowedToOrder;
    }, [allowedToOrder]);

    useEffect(() => {
        authorizePdpRestrictionRef.current = authorizePdpRestriction;
    }, [authorizePdpRestriction]);

    useEffect(() => {
        if (serviceLevelCategory && serviceLevelCategory.length) {
        }
        else {
            let type = 'REPORT_ISSUE';
            props.fetchServiceLevelCategory(type).then((response) => {
                if (response && response.data && response.data.data) {
                    setServiceLevelCategory(response.data.data);
                }
            });
        }
    }, []);

    useEffect(() => {
        if (!sso_user_details || !Object.keys(sso_user_details).length) {
            const adminAccessDetails = Auth.getAdminAccessDetails();
            let sso_detail = {};
            if (adminAccessDetails && Object.keys(JSON.parse(adminAccessDetails)).length > 0) {
                sso_detail = JSON.parse(adminAccessDetails);
            }
            const emailId = sso_detail && sso_detail.username && sso_detail.username.replace(process.env.REACT_APP_COGNITO_IDP_NAME, '');
            emailId && getSSODetails(emailId, props.history);
        }
    }, [sso_user_details]);

    return (
        <>
            <div id="myModal" className="modal">
                <div className="modal-content">
                    <span className="close" onClick={handleDialogClose}>&times;</span>
                    <div className="confirmation-text">
                        Confirmation
                    </div>
                    <div className="confirmation-message-text">
                        {(warehouses && warehouses.unloading_point && warehouses.unloading_point.length) > 0 ?
                            (Object.keys(unloadingPartnerData).length === 0) ?
                                `Unloading point is not selected for the shipping point ${shipPartnerData.partner_name}(${shipPartnerData.partner_code}). It is set as ${warehouses.unloading_point[0].partner_name}(${warehouses.unloading_point[0].partner_code}).`
                                :
                                `Unloading point is selected as ${unloadingPartnerData.partner_name}(${unloadingPartnerData.partner_code}) for the shipping point ${shipPartnerData.partner_name}(${shipPartnerData.partner_code}).Do you want to Proceed ?`
                            :
                            `Unloading point is not available for the Shipping point ${shipPartnerData.partner_name}(${shipPartnerData.partner_code}). Default unloading point present in the records will be used.`
                        }
                    </div>
                    <div className="button-container">
                        <button
                            className="confirmation-button"
                            onClick={handleDialogClose}
                        >
                            Cancel
                        </button>
                        <button
                            className="confirmation-button proceed-btn"
                            onClick={e => {
                                handleShipToValue();
                                handleDialogClose();
                                handleValidate(e);
                            }}
                        >
                            Proceed
                        </button>
                    </div>
                </div>
            </div>

            <section className="main-content create-order-page">
                <div className="new-so-head d-align-center" style={{ marginBottom: '5px' }}>
                    <div className="new-so-col1">
                        <span style={{ marginRight: '4px' }} className="xs-ttl">New Purchase Order Request for</span>
                        {role &&
                            <b>{props.location.state && props.location.state.distributorName}
                                ({props.location.state && props.location.state.distributorId})</b>}</div>
                    {role &&
                        <div className="xs-bk">
                            <a onClick={onClickBackButton}>Back to Distributor Dashboard</a></div>}
                </div>


                <div className="sales-order-block">
                    <div className="new-so-head">
                        <div className="new-so-col-2">
                            <label htmlFor="">Order Type</label>
                            <div className="select-box">
                                {/* <Select defaultValue="Regular" placeholder="Select" onChange={selectedOption => {
                                    handleOrderTypeInputChange(selectedOption);
                                }}>
                                    <Option value="Regular">Regular</Option>
                                    {region_details?.liquidation && allowLiquidation && !isDraftOrder && !(authorizePdpRestriction && !allowedToOrder) && (
                                        <Option value="Liquidation">Liquidation</Option>)}
                                    {allowSelfLifting && isSelfLiftingOrderEnabledForDistributor && (
                                        <Option value="SelfLifting">Self Lifting & Direct Dispatch</Option>)}

                                </Select> */}
                            </div>
                        </div>
                        <div className="new-so-col-2">
                            <label htmlFor="">Ship To</label>
                            <div className="select-box">
                                <Select
                                    autoFocus={true}
                                    showSearch
                                    placeholder="Select..."
                                    dropdownClassName='shipto-select'
                                    aria-label="shipping point"
                                    optionFilterProp="children"
                                    filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
                                    onChange={selectedOption => {
                                        handleInputChange(selectedOption, "shipto");
                                    }}>
                                    {
                                        warehouses && warehouses.shipping_point && warehouses.shipping_point.length > 0 &&
                                        warehouses.shipping_point.map(item => {
                                            return (
                                                <Option value={item.partner_name} key={item.partner_code}>
                                                    {`${item.partner_name} (${item.partner_code})`}
                                                </Option>
                                            )
                                        })
                                    }
                                </Select>
                                <ul className="mb-0">
                                    <li>
                                        <span>Ship to customer code</span>
                                        <em>{(shipPartnerData && "partner_code" in shipPartnerData) ? shipPartnerData.partner_code : '-'}</em>
                                    </li>
                                    <li>
                                        <span>Market</span> <em>{partnerMarket}</em>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div className="new-so-col-2">
                            <label htmlFor="">Unloading Point</label>
                            <div className="select-box">
                                <Select
                                    placeholder={selectPlaceholder}
                                    showSearch
                                    value={Object.keys(unloadingPartnerData).length ? `${unloadingPartnerData.partner_name} (${unloadingPartnerData.partner_code})` : undefined}
                                    dropdownClassName='unloading-select'
                                    aria-label="Unloading point"
                                    optionFilterProp="children"
                                    filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
                                    onChange={selectedOption => {
                                        handleInputChange(selectedOption, "unloadingpoint");
                                    }}>
                                    {
                                        warehouses && warehouses.unloading_point && warehouses.unloading_point.length > 0 &&
                                        warehouses.unloading_point.map(item => {
                                            return (
                                                <Option value={item.partner_name} key={item.partner_code}>
                                                    {`${item.partner_name} (${item.partner_code})`}
                                                </Option>
                                            )
                                        })
                                    }
                                </Select>
                                <ul>
                                    <li>
                                        <span>Unloading Point code</span>
                                        <em>{(unloadingPartnerData && "partner_code" in unloadingPartnerData) ? unloadingPartnerData.partner_code : '-'}</em>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {authorizePdpRestriction && <div className="order-by-admin"><span><b>{pdpMessage ? <><InfoCircleOutlined /> <span><u>Note</u>: {pdpMessage}</span></> : ''}</b></span> </div>}
                <div className={width > 767 ? "sales-order-block new-sales-order-block" : "mobile-card-wrapper"}>

                    {authorizeToggleBasedSearch
                        // {(serverConfig.app_environment === 'dev')
                        ? <UniversalSearchToggle
                            toggleText={toggleText}
                            profile={region_details}
                            onChange={onToggleChange} />
                        : ''}

                    {/* <div className='purchase-order-toggle'>
                        <div><h3>Liquidation</h3></div>
                        <Switch aria-label="Toggle" disabled={authorizePdpRestriction && !allowedToOrder} onChange={onLiquidationToggleChange}/>
                    </div> */}

                    {
                        (tableItems.length) ?
                            <MaterialTable
                                isFromReorder={true}
                                tableItems={tableItems}
                                onOrderChange={setTotalAmount}
                                universalProductType={toggleText}
                                onListChange={(list) => {
                                    setOrderList(list);
                                }}
                                distributorId={login_id}
                            //isLiquidationOrder={isLiquidationOrder}
                            />
                            :
                            ''
                    }

                    <div className="new-order-footer">
                        {/* <div className="order-value-text">TOTAL QUANTITY IN TONNAGE</div>
                        <div className="order-value">
                            <span className="amount">-</span>
                        </div> */}
                        <div className="order-value-text">TENTATIVE ORDER VALUE (RS)</div>
                        <div className="order-value">
                            <span className="amount">{totalAmount > 0 ? totalAmount : '-'}</span>
                            <small>Please click validate to view order value</small>
                        </div>
                        <div className="order-btn-grp">
                            <button style={{ marginLeft: '0' }}
                                type="submit"
                                className="border-btn"
                                id="vldbtn"
                                onClick={e => {
                                    //if there is 0 or 1 unloading point, show confirmation modal.else validate order
                                    //changes as per mail dated 09-05-2022
                                    if (Object.keys(shipPartnerData).length > 0 &&
                                        (warehouses && warehouses.unloading_point && warehouses.unloading_point.length <= 1)) {
                                        handleConfirmationBox();
                                    } else {
                                        handleValidate(e);
                                    }
                                }}
                            >
                                Validate
                            </button>
                            {!isSupportRole && <button type="submit" className="default-btn" id="sbtbtn" onClick={handleSubmit}>Submit</button>}
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}

const mapStateToProps = (state, ownProps) => {
    return {
        createOrderData: state.distributor.get('create_order'),
        warehouses: state.distributor.get('warehouses'),
        region_details: state.dashboard.get('region_details'),
        app_level_configuration: state.auth.get('app_level_configuration'),
        sso_user_details: state.admin.get('sso_user_details'),
    }
}
const mapDispatchToProps = (dispatch, ownProps) => {
    return {
        getMaintenanceRequests: () =>
            dispatch(Actions.getMaintenanceRequests()),
        distributorUpdateCreateOrderFormField: data =>
            dispatch(Action.distributorUpdateCreateOrderFormField(data)),
        validateDistributorSalesOrder: (data, distributorId, liquidation) =>
            dispatch(Action.validateDistributorSalesOrder(data, distributorId, liquidation)),
        getWarehouseDetails: login_id =>
            dispatch(Action.getWarehouseDetails(login_id)),
        getMaterialsCodes: () =>
            dispatch(Action.getMaterialsCodes()),
        distributorValidateCreateOrderForm: status =>
            dispatch(Action.distributorValidateCreateOrderForm(status)),
        createDistributorSalesOrder: (data, distributorId) =>
            dispatch(Action.createDistributorSalesOrder(data, distributorId)),
        distributorResetCreateOrderFormFields: () =>
            dispatch(Action.distributorResetCreateOrderFormFields),
        logAppIssue: (data) => dispatch(ErrorAction.logAppIssue(data)),
        getRegionDetails: (login_id) => dispatch(DashboardAction.getRegionDetails(login_id)),
        fetchAppLevelConfiguration: () => dispatch(AuthAction.fetchAppLevelSettings()),
        fetchServiceLevelCategory: (type) => dispatch(Action.fetchServiceLevelCategory(type)),
        reportPortalError: (data) => dispatch(ErrorAction.reportPortalError(data)),
        getSSODetails: (emailId, history) => dispatch(AdminAction.getSSODetails(emailId, history)),
    }
}

const ConnectReOrder = connect(
    mapStateToProps,
    mapDispatchToProps
)(ReOrder)

export default ConnectReOrder;
