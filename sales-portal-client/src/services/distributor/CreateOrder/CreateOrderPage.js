/**
 * RUSH ORDER ENABLE/DISABLE RULES:
 * Check for global and DB level switches
 * If global or DB level PDP flag is OFF, then disable rush order
 * If all divisions are in active PDP, then disable rush order
 * Rush order can be placed only for those items which are outside PDP window
 */
/**
 * EDGE CASE(1):[SOPE-2282] DB was able to place Regular order with all products even though ARS was enabled and suggestions were there.
 * RCA: User turned off internet and clicked on "New Purchase Order" button. So all the api got failed and the system took it as no ARS suggestion available, and auto-switching to Regular with all products.
 * User then is turning on the internet and placing the Regular order in its normal flow with all products.
 * Solution: We are trying to call ARS related api once again on change of warehouse details, if we see that the ARS related data/states are empty.
 */
import React, { useEffect, useState, useRef } from 'react';
import { connect } from 'react-redux';
import jwt from 'jsonwebtoken';
import { notification, Radio, Select, Tooltip, Modal, Spin } from 'antd';
import 'antd/dist/antd.css';
import Auth from '../../../util/middleware/auth';
import * as Action from '../action';
import * as Actions from '../../admin/actions/adminAction';
import * as DashboardAction from '../actions/dashboardAction';
import * as ErrorAction from '../actions/errorAction';
import * as AuthAction from '../../auth/action';
import * as AdminAction from '../../admin/actions/adminAction';
import Util from '../../../util/helper/index';
import ValidateOrderTransomer from '../../../transformer/validateOrder';
import CreateOrderTransomer from '../../../transformer/createOrder';
import MaterialTable from './CreateOrderMaterialTable';
import './CreateOrder.css';
import { errorReportFormat } from '../../../config/error';
import UniversalSearchToggle from '../../../components/UniversalSearchToggle';
import config from '../../../config';
import { PARTNER_MISMATCH_CATEGORY, PARTNER_MISMATCH_REMARK } from '../../../config/constant';
import useWindowDimensions from '../../../hooks/useWindowDimensions';
import moment from 'moment';
import { InfoCircleOutlined } from '@ant-design/icons';
import _ from 'lodash';
import ServerTimer from '../../../components/ServerTImer';
import AutoOrderMaterialTable from './AutoOrderMaterialTable';
import { authenticatedUsersOnly } from '../../../util/middleware';
import { CUSTOMER_GROUPS_FOR_ARS, RUPEE_SYMBOL, RUSH_ORDER_PDP_ERROR_MESSAGE } from '../../../constants/index';
import BulkOrderMaterialTable from './BulkOrderTable';
import { pages, features, hasFeaturePermission } from '../../../persona/distributorNav';
import ROReasonModal from '../../admin/RushOrder/ReasonModal';
import CustomErrorModal from '../../errorModal/CustomErrorModal';
import useNetworkStatus from '../../../hooks/useNetworkStatus';
import LocalAuth from '../../../util/middleware/auth';
const appConfig = config.app_level_configuration;

const { Option } = Select;

let CreateOrderPage = (props) => {
    const minimumOrderValueText = 'Note: Minimum Order Value should be more than Rs 20,000';
    const bulkOrderTentative = useRef({});

    const activePDP = props.location.state?.activedivStr?.split('/').sort((a, b) => a - b) || [];
    const upcomingPDP = props.location.state?.upcomingSalesDetails;
    const browserHistory = props.history;
    const { width } = useWindowDimensions();
    const isNourishCo = useRef(false);

    if (props.location.pathname.split('/')[1] === 'distributor') {
        authenticatedUsersOnly(props.location.pathname, props.history);
    }
    let access_token = Auth.getAccessToken();
    let admin_access_token = Auth.getAdminAccessToken();
    let login_id = ''; //contains the distributor code
    let role = Auth.getRole();
    const originalRecommendation = useRef([]);
    if (access_token || admin_access_token) {
        if (!role) {
            login_id = jwt.decode(access_token).login_id;
        } else {
            login_id = props.location.state && props.location.state.distributorId;
        }
    } else if (!role) {
        browserHistory.push('/');
    }
    const {
        createOrderData,
        warehouses,
        region_details,
        app_level_configuration,
        sso_user_details,
        getSSODetails,
        getLIQMaterials,
        liq_materials,
        getMaintenanceRequests,
        getWarehouseDetailsOnDistChannel,
        fetchForecastForDist,
        fetchDistributorMoq,
        getArsTolerance,
        getExcludedMaterials,
        rule_config_excluded_materials,
        sentOrderRequest,
        credit_details,
        getDistMoq,
        pdp_windows,
        getPDPWindows,
        pdpWindows,
        getRoReasons,
        fetchArsConfigurations,
        getRegionDetails,
        correlation_id,
        setCorrelationId,
        validateOrder,
        logAppIssue,
        distributorUpdateCreateOrderFormField,
        promiseCredit,
        createOrder,
        checkARSWindowForRushOrder,
    } = props;
    const { distributor_sales_details } = region_details;

    // const ssoRole = sso_user_details.data && sso_user_details.data.length && sso_user_details.data[0].roles;
    // const isSupportRole = ssoRole?.includes('SUPPORT');
    // const tabCount = useRef(0);
    // const isTabChecked = useRef(false);

    if (login_id && login_id !== '' && warehouses && Object.keys(warehouses).length === 0) {
        distributorUpdateCreateOrderFormField({
            field: 'soldto',
            value: login_id,
        });
    }
    useEffect(() => {
        getMaintenanceRequests();
        props.fetchAppLevelConfiguration();
        props.getCreditLimitDetails(login_id);
    }, []);

    const duplicateTabNotification = () => {
        let pagesOpened = JSON.parse(localStorage.getItem('db-order-pages-opened') || '{}');
        Modal.warning({
            title: 'Duplicate Tab Notification',
            content:
                'Order Creation Page is already opened in another tab. Continue from existing tab  OR close the existing tab / switch to different page in existing tab) and proceed.',
            onOk() {
                pagesOpened[login_id] = true;
                window.localStorage.setItem('db-order-pages-opened', JSON.stringify(pagesOpened));
            },
            onCancel() {
                pagesOpened[login_id] = true;
                window.localStorage.setItem('db-order-pages-opened', JSON.stringify(pagesOpened));
            },
        });
    };

    useEffect(() => {
        return; //Adding the return to diasble the duplicate tab notification
        /**
        if (!login_id) return;

        let pagesOpened = JSON.parse(localStorage.getItem('db-order-pages-opened') || '{}');

        const handleBeforeUnload = () => {
            pagesOpened[login_id] = false;
            window.localStorage.setItem('db-order-pages-opened', JSON.stringify(pagesOpened));
        };
        // Check if the user has the permission to open multiple tabs
        if (!hasFeaturePermission(pages.ORDER, features.DUPLICATE_TAB)) {
            let isOpen = pagesOpened[login_id] || false;
            // If the page is already opened in another tab, then restrict the user from opening the page in another tab
            if (isOpen) {
                duplicateTabNotification();
                window.history.back();
                return;
            } else {
                pagesOpened[login_id] = true;
            }
        } else {
            pagesOpened[login_id] = true;
        }
        // console.log('pagesOpened', pagesOpened);
        window.localStorage.setItem('db-order-pages-opened', JSON.stringify(pagesOpened));
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            // Cleanup when the component unmounts
            window.removeEventListener('beforeunload', handleBeforeUnload);
            pagesOpened[login_id] = false;
            window.localStorage.setItem('db-order-pages-opened', JSON.stringify(pagesOpened));
        };
        */
    }, []);

    function isSingleSession() {
        const current_correlation_id = window.localStorage.getItem('TCPL_correlation_id');
        const existing_correlation_id = correlation_id;

        if (!existing_correlation_id) {
            setCorrelationId(current_correlation_id);
        } else if (current_correlation_id && existing_correlation_id && current_correlation_id !== existing_correlation_id) {
            setCorrelationId(current_correlation_id);
            if (!hasFeaturePermission(pages.ORDER, features.DUPLICATE_TAB)) {
                duplicateTabNotification();
                window.history.back();
                return false;
            }
        }
        return true;
    }

    let activedivArr = [];
    let allDivArr = [];
    let distChannelArr = [];
    const newDivisionArr = () => {
        const activedivStr = props.location.state.activedivStr;
        if (!distChannelArr.length || !allDivArr.length) {
            const distChannelSet = new Set();
            const allDivSet = new Set();
            distributor_sales_details?.forEach((item) => {
                distChannelSet.add(item.distribution_channel);
                allDivSet.add(item.division);
            });
            distChannelArr = Array.from(distChannelSet);
            allDivArr = Array.from(allDivSet);
        }
        if (activedivStr == 'N/A' || activedivStr == '' || activedivStr == undefined) {
            distributor_sales_details?.forEach((item) => {
                if (activedivArr.indexOf(item.division) == -1) {
                    activedivArr.push(item.division);
                }
            });
        } else {
            const divisionArr = activedivStr.split('/');
            activedivArr = [...divisionArr];
        }
    };

    function fetchWarehouseDetails(order_type = 'regular') {
        if (login_id && distChannelArr?.length > 0 && allDivArr?.length > 0) {
            let distChannel;
            let divArr;
            if (distChannelArr?.findIndex((channel) => channel === 90) > -1) {
                distChannel = 90;
                divArr = allDivArr;
            } else if (order_type === 'SelfLifting') {
                distChannel = 40;
                divArr = allDivArr;
            } else {
                distChannel = 10;
                divArr = activedivArr;
            }
            setOrderPageLoadingMessage('Fetching Warehouse Details ...');
            setIsOrderPageLoading(true);
            getWarehouseDetailsOnDistChannel(login_id, distChannel, divArr)
                .then((data) => {
                    if (data?.success === false) {
                        notificationSender(data.error, data.message, false);
                    }
                })
                .catch(() => {
                    notificationSender('Error', 'Error in fetching warehouse details', false);
                })
                .finally(() => {
                    setIsOrderPageLoading(false);
                    setOrderPageLoadingMessage('Loading ...');
                });
        }
    }

    useEffect(() => {
        if (login_id && login_id !== '' && warehouses && Object.keys(warehouses).length === 0) {
            newDivisionArr();
            fetchWarehouseDetails();
        }
    }, [warehouses, login_id, distributor_sales_details]);

    useEffect(() => {
        if (login_id && login_id !== '' && warehouses && Object.keys(warehouses).length > 0 && orderTypeValue === 'AutoOrder') {
            const hasMatchingShipToSoldTo = warehouses?.shipping_point.find((item) => item.partner_code === login_id);
            if (hasMatchingShipToSoldTo) {
                handleInputChange(login_id, 'shipto');
            }
        }
    }, [warehouses]);

    const validationFlag = createOrderData.get('submit');
    const initialTableItems = [
        {
            materials: [],
            code: '',
            quantity: '',
            description: '',
            sales_unit: '',
            pak_code: '',
            pak_type: '',
            buom: '',
            tentative: '',
            disabled: '',
            selectedValue: '',
            item_number: '',
            error: '',
            class: '',
            StockQuantity: '',
            Plant: '',
            PDP_Day: '',
            Reference_date: '',
            ton: '',
        },
    ];

    const { isOnline } = useNetworkStatus();
    const [tableItems, setTableItems] = useState(initialTableItems);
    const [totalAmount, setTotalAmount] = useState(0);
    const [totalQuantityTonnage, setTotalQuantityTonnage] = useState(0);
    const [shipPartnerData, setShipPartnerData] = useState({});
    const [unloadingPartnerData, setUnloadingPartnerData] = useState({});
    const [partnerMarket, setPartnerMarket] = useState('-');
    const [partnersList, setPartnersList] = useState([{ partner_role: 'AG', partner_number: login_id }]);
    const orderItemList = createOrderData.get('items');
    const [toggleText, setToggleText] = useState(false);
    const [authorizeToggleBasedSearch, setAuthorizeToggleBasedSearch] = useState(false);
    const [orderList, setOrderList] = useState([]);
    // const [allowedToOrder, setAllowedToOrder] = useState(false);
    const [creditDifference, setCreditDifference] = useState(0);
    // const [pdpMessage, setPdpMessage] = useState('');
    const [authorizePdpRestriction, setAuthorizePdpRestriction] = useState(false);
    const [allowLiquidation, setAllowLiquidation] = useState(false);
    // const [pdpWeeklyOrderWindow, setPdpWeeklyOrderWindow] = useState();
    // const [pdpFortnightlyOrderWindow, setPdpFortnightlyOrderWindow] = useState();
    // const [pdpOrderPlacementTime, setPdpOrderPlacementTime] = useState();
    // const [pdpWeeklyOff, setPdpWeeklyOff] = useState();
    const [selectPlaceholder, setSelectPlaceholder] = useState();
    const [partnerMismatchErrorRecipients, setPartnerMismatchErrorRecipients] = useState(null);
    const [serviceLevelCategory, setServiceLevelCategory] = useState([]);
    const [isLiquidationOrder, setIsLiquidationOrder] = useState(false);
    const [liqMaterialsList, setLiqMaterialsList] = useState([]);
    const [liqCounter, setLiqCounter] = useState(0);
    const [isDraftOrder, setIsDraftOrder] = useState(false);
    const [allowSelfLifting, setAllowSelfLifting] = useState(false);
    const [isSelfLiftingOrder, setIsSelfLiftingOrder] = useState(false);
    const [isSelfLiftingOrderEnabledForDistributor, setIsSelfLiftingOrderEnabledForDistributor] = useState(false);
    const [isConfirmationBoxOpen, setIsConfirmationBoxOpen] = useState(false);
    const [orderTypeValue, setOrderTypeValue] = useState(() => {
        if (isNourishCo.current) return 'Regular';
        return 'AutoOrder';
    });
    const [allowAutoOrder, setAllowAutoOrder] = useState(true); //it checks if ARS flags are enabled. It is also set to false if ARS suggestion is not fetched.
    const [isAutoOrder, setIsAutoOrder] = useState(false);
    const [isRushOrder, setIsRushOrder] = useState(false);
    const [isApprovalRequired, setIsApprovalRequired] = useState(false); //to be used as generic state for all orders requiring order approval
    const [enableOrderApprovalRushOrder, setEnableOrderApprovalRushOrder] = useState(false); // to determine whether rush order needs approval for order submit
    const [tolerance, setTolerance] = useState();
    // const [activeDivArray, setActiveDivArray] = useState([]);
    const [recommendedMaterials, setRecommendedMaterials] = useState([]);
    // const [allDivArray, setAllDivArray] = useState([]);
    const [validateSuccessCounter, setValidateSuccessCounter] = useState(0);
    const [moqArr, setMoqArr] = useState([]);
    const [moqTolerance, setMoqTolerance] = useState(0);
    const [moqEnable, setMoqEnable] = useState(true);
    const isOrderReady = useRef(false);
    const [isSaltOnlyOrder, setIsSaltOnlyOrder] = useState(false);
    const [enablePromiseCredit, setEnablePromiseCredit] = useState(false);
    const [isBulkOrder, setIsBulkOrder] = useState(false);
    const [bulkMOQ, setBulkMOQ] = useState(0);
    const [validateBulk, setValidateBulk] = useState(false);
    const validateNavResults = useRef([]);
    const [creditData, setCreditData] = useState({
        po_number: '',
        input_type: 'First consent for promise credit',
        reference_date: '',
        // order_value: "",
        // credit_shortfall: "",
        promised_credit_date: '',
        promised_credit_time: '',
        promised_credit: '',
        promised_credit_type: '',
        open_order_value: '',
        type: '',
    });

    const [isRushOrderEnabled, setIsRushOrderEnabled] = useState(false);
    const [isBulkOrderEnabled, setIsBulkOrderEnabled] = useState(false);
    const [submitErrors, setSubmitErrors] = useState({});
    const [roReasons, setRoReasons] = useState([]);
    const [isRoReasonModalVisible, setIsRoReasonModalVisible] = useState(false);
    const [arsConfigurations, setArsConfigurations] = useState([]);
    const [isErrorConfirmationBoxOpen, setIsErrorConfirmationBoxOpen] = useState(false);
    const [errorModalContext, setErrorModalContext] = useState('');
    const [isDivision14, setIsDivision14] = useState(true);
    const [isOrderPageLoading, setIsOrderPageLoading] = useState(false);
    const [orderPageLoadingMessage, setOrderPageLoadingMessage] = useState('Loading ...');
    const [rushOrderARSWindowErrorMessage, setRushOrderARSWindowErrorMessage] = useState('');

    const roFirstApprover = useRef('');
    const poNum = useRef('');

    /** Function to send notifications */
    const notificationSender = (message, description, type = null) => {
        if (type === true) {
            notification.success({
                message: message,
                description: description,
                duration: 3,
                className: 'notification-green',
            });
        } else if (type === false) {
            notification.error({
                message: message,
                description: description,
                duration: 5,
                className: 'notification-error error-scroll',
            });
        } else {
            notification.warning({
                message: message,
                description: description,
                duration: 8,
                className: 'notification-orange',
            });
        }
    };

    /** Re-order start */
    const [materials, setMaterials] = useState([]);
    const isReorder = props.location.state.isReorder;

    // // Adding this condition for the case when user is coming from ARS and isReorder is True
    // useEffect(() => {
    //     if (isReorder) {
    //         setOrderTypeValue("Regular");
    //     }else {
    //         setOrderTypeValue("AutoOrder");
    //     }
    // });

    useEffect(() => {
        if (isOnline === false) {
            // This is applied to handle EDGE CASE(1). Refer the top of the file for more details.
            notificationSender('Error', 'Internet connection lost. You will be logged out.', false);
            LocalAuth.logout();
        }
    }, [isOnline]);

    let totalTonnage = 0;
    useEffect(() => {
        if (isBulkOrder) {
            totalTonnage = 0;
            let list = orderItemList.filter((item) => item.isSubItem);
            list?.forEach((element) => {
                let tonn = [];
                tonn = element.ton.split(' ');
                totalTonnage += Number(tonn[0]);
                setTotalQuantityTonnage(totalTonnage);
                if (!totalTonnage) setCreditDifference(0);
            });
        } else {
            totalTonnage = 0;
            let tonn = [];
            orderItemList?.forEach((element) => {
                tonn = element.ton.split(' ');
                totalTonnage += Number(tonn[0]);
            });
            setTotalQuantityTonnage(totalTonnage);
            if (!totalTonnage) setCreditDifference(0);
        }
        return () => {
            setTotalQuantityTonnage(0);
        };
    }, [orderItemList]);

    useEffect(() => {
        async function checkARSWindow(){
            try{
                const response = await checkARSWindowForRushOrder(login_id);
                
                if(!response?.success){
                    notificationSender('Error', response?.message || 'Error in checking ARS window for Rush Order', false);
                }
                if(response?.data && !response.data?.canPlace){
                    const error_message = `Last ARS Order Date: ${response.data?.lastARSDate || 'N/A'}. ${response.data?.message}`;
                    setRushOrderARSWindowErrorMessage(error_message);
                }
            }catch(err){
                notificationSender('Error', 'Error in checking ARS window for Rush Order', false);
            }
        }
        if(isRushOrder){
            checkARSWindow();
        }else{
            setRushOrderARSWindowErrorMessage('');
        }
    }, [isRushOrder]);

    useEffect(() => {
        async function fetchROReasons() {
            const response = await getRoReasons();
            if (response?.data) {
                const reasons = response.data.map((r) => r.label);
                setRoReasons([...reasons, 'Others']);
            }
        }
        if (isRushOrder && roReasons.length === 0) {
            fetchROReasons();
        }
    }, [isRushOrder, roReasons]);

    useEffect(() => {
        getMaterialsCodes();
        if (login_id && login_id !== '' && !isDraftOrder) {
            distributorUpdateCreateOrderFormField({
                field: 'items',
                value: [],
            });
        }
    }, [login_id]);

    async function getMaterialsCodes() {
        const { is_nourishco } = region_details;
        const allMaterials = await Action.getMaterialsCodes(null, false, login_id, false, is_nourishco);
        if (allMaterials && allMaterials.status === 200) {
            const { data = [] } = allMaterials.data;
            setMaterials(data);
        }
    }

    useEffect(() => {
        if (isReorder && !isAutoOrder) {
            if (!region_details || !Object.keys(region_details).length) {
                getRegionDetails(login_id);
            } else if (materials.length) {
                mappedReOrderDetail()
                    .then((res) => {
                        res = res.flat();
                        setTableItems(res);
                        setOrderList(res);
                    })
                    .catch(() => {});
            }
        }
    }, [region_details, materials]);

    useEffect(() => {
        if (region_details?.distributor_sales_details?.length > 0) {
            region_details.distributor_sales_details.forEach((salesData) => {
                if (salesData.distribution_channel === 40) {
                    setIsSelfLiftingOrderEnabledForDistributor(true);
                }
                if (salesData.distribution_channel === 90) {
                    isNourishCo.current = true;
                }
            });
        }
    }, [region_details]);

    useEffect(() => {
        newDivisionArr();
        // setActiveDivArray(props.location.state.activeDivArray);
        // setAllDivArray(props.location.state.allDivArray);
    }, []);

    const mappedReOrderDetail = async () => {
        if (!materials.length) return;
        // const previousOrderProductType = props.location.state.order_product_type;
        let mappedData = [];
        const reOrderData = props.location.state.data;
        mappedData = reOrderData.map((item, index) => {
            return materials
                .map((element) => {
                    if (item.MATERIAL === element.code) {
                        const orderItem = {
                            materials: [element],
                            code: item.MATERIAL,
                            quantity: '',
                            sales_org: item.SALES_ORG,
                            distribution_channel: item.DISTR_CHAN,
                            division: item.DIVISION,
                            description: element.description,
                            sales_unit: element.sales_unit,
                            pak_type: element.pak_type,
                            buom: '',
                            ton: '',
                            tentative: '',
                            disabled: '',
                            selectedValue: item.MATERIAL,
                            item_number: ((index + 1) * 10).toString().padStart(6, '0'),
                            error: '',
                            class: '',
                        };

                        if (
                            region_details &&
                            region_details.area_code &&
                            region_details.channel_code &&
                            element.appl_area_channel &&
                            element.appl_area_channel.some((obj) => obj.area === region_details.area_code && obj.channel === region_details.channel_code)
                        ) {
                            orderItem['item_type'] = 'dist_specific';
                        } else {
                            orderItem['item_type'] = 'universal';
                        }
                        return orderItem;
                    }
                })
                .filter((i) => i);
        });
        return mappedData;
    };
    /** Re-order End */
    useEffect(() => {
        if (distributor_sales_details?.length > 0) {
            const isDiv14 = distributor_sales_details?.find((item) => item.division == 14 && item.distribution_channel == 10);
            if (!isDiv14) setIsDivision14(false);
        }
    }, [distributor_sales_details]);

    /**Auto-Order Starts */

    useEffect(() => {
        //Refer EDGE CASE(1) at the top of the file
        if (!isNourishCo.current && !arsConfigurations?.length > 0) {
            getArsConfigurations();
        }
        if (!materials?.length > 0) {
            getMaterialsCodes();
        }
    }, [warehouses]);

    useEffect(() => {
        const switchConfig = arsConfigurations?.find((config) => +config.region_id === region_details?.group5_id && config.customer_group === region_details?.customer_group_code);

        if (props.region_details?.ao_enable && switchConfig?.auto_order && !isNourishCo?.current) {
            setOrderTypeValue('AutoOrder');
            setAllowAutoOrder(true);
        } else {
            setOrderTypeValue('Regular');
            setAllowAutoOrder(false);
        }
    }, [props.region_details, arsConfigurations]);

    useEffect(() => {
        if (region_details?.customer_group_code === '11' && login_id !== shipPartnerData.partner_code) {
            handleArsForSS();
        } else if (allowAutoOrder && !isReorder && orderTypeValue === 'Regular') {
            setIsSaltOnlyOrder(true);
        } else if (allowAutoOrder && isReorder) {
            setIsSaltOnlyOrder(true);
        } else {
            setIsSaltOnlyOrder(false);
        }
    }, [isReorder, allowAutoOrder, orderTypeValue]);

    useEffect(() => {
        if (
            !isNourishCo.current &&
            orderTypeValue === 'AutoOrder' &&
            !isReorder &&
            !hasFeaturePermission(pages.ORDER, features.CCO_SPECIAL_ORDER) &&
            shipPartnerData.partner_code &&
            (region_details.customer_group_code !== '11' || (region_details.customer_group_code === '11' && login_id === shipPartnerData.partner_code))
        ) {
            setIsAutoOrder(true);
            //if PDP lock is enabled then send the active divisions, else send all the divisions
            const data = {
                distributor_code: props.location.state.distributorId,
                divisions: props.location.state.activeDivArray,
            };
            //api call to fetch recommended materials
            if (data.divisions.length > 0) {
                fetchForecastForDist(data)
                    .then((res) => {
                        if (res?.length > 0) {
                            setRecommendedMaterials(res);
                        } else {
                            setIsAutoOrder(false);
                            setAllowAutoOrder(false);
                            setOrderTypeValue('Regular');
                            notificationSender('Error', res.message ?? 'No recommendations available for Auto-Order. Please place Regular-Order', false);
                        }
                    })
                    .catch(() => {
                        setIsAutoOrder(false);
                        setAllowAutoOrder(false);
                        setOrderTypeValue('Regular');
                        notificationSender('Technical Error', 'No recommendations available for Auto-Order. Please place Regular-Order', false);
                    });
            } else {
                setIsAutoOrder(false);
                setOrderTypeValue('Regular');
                setAllowAutoOrder(false);
            }
        } else {
            setIsAutoOrder(false);
            if (hasFeaturePermission(pages.ORDER, features.CCO_SPECIAL_ORDER)) setOrderTypeValue('Regular');
        }
    }, [orderTypeValue, region_details.customer_group_code, shipPartnerData.partner_code]);

    useEffect(() => {
        if (isAutoOrder) {
            if (!region_details || !Object.keys(region_details).length) {
                getRegionDetails(login_id);
            } else if (materials?.length) {
                mappedAutoOrderDetails()
                    .then((res) => {
                        res = res.flat();
                        originalRecommendation.current = _.cloneDeep(res);
                        const filteredList = res?.filter((item) => item.quantity > 0);
                        setTableItems(filteredList); //used to pass as prop to CreateOrderMaterialTable for display
                        setOrderList(res); //used only to determine if the order is universal or dist-specific
                    })
                    .catch(() => {});
            }
        }
    }, [region_details, materials, recommendedMaterials]);

    useEffect(() => {
        handleArsForSS();
    }, [shipPartnerData]);

    //  useEffect for bulk Order

    useEffect(() => {
        if (isBulkOrder) {
            const plantName = distributor_sales_details?.find((item) => item.division == 14 && item.distribution_channel == 10).plant_name;

            try {
                getDistMoq({ dbCode: login_id, plantCodes: plantName }).then((res) => {
                    let moq = res?.data[0]?.moq;
                    setBulkMOQ(+moq);
                });
            } catch (error) {
                setBulkMOQ(0);
                console.error(error);
            }
        }
    }, [isBulkOrder]);

    const getArsConfigurations = () => {
        fetchArsConfigurations(['SWITCH'])
            .then((res) => {
                if (res?.success) {
                    setArsConfigurations(res.data);
                }
            })
            .catch(() => {});
    };

    const mappedAutoOrderDetails = async () => {
        if (!materials.length) return;
        let mappedData = [];
        mappedData = recommendedMaterials.map((item, index) => {
            return materials
                .map((element) => {
                    if (item.productCode === element.code) {
                        const orderItem = {
                            materials: [element],
                            code: item.productCode,
                            quantity: item.qty,
                            original_quantity: item.qty,
                            description: element.description,
                            sales_unit: element.sales_unit,
                            pak_type: element.pak_type,
                            buom: '',
                            ton: '',
                            tentative: '',
                            disabled: '',
                            selectedValue: item.productCode,
                            item_number: ((index + 1) * 10).toString().padStart(6, '0'),
                            error: '',
                            class: '',
                            isAutoOrderRecommended: true,
                            sales_org: element.sales_org || 1010,
                            distribution_channel: element.distribution_channel || 10,
                            division: element.division,
                            pskuClass: item.pskuClass,
                            sn_days: item.sn_days,
                            soq_norm_qty: item.soq_norm_qty,
                        };
                        if (
                            region_details?.area_code &&
                            region_details?.channel_code &&
                            element.appl_area_channel &&
                            element.appl_area_channel.some((obj) => obj.area === region_details.area_code && obj.channel === region_details.channel_code)
                        ) {
                            orderItem['item_type'] = 'dist_specific';
                        } else {
                            orderItem['item_type'] = 'universal';
                        }
                        return orderItem;
                    }
                })
                .filter((i) => i);
        });
        return mappedData;
    };

    const handleArsForSS = () => {
        /**
         * [SOPE-2547]: Suggestion for ARS should only show for Super Stockiest(SS)(11) when Sold-to = Ship-to.
         * Otherwise it will be Regular order with all materials
         * By default choose the Auto-Order and ShipTo = SoldTo, if another ShipTo is selected, then switch to Regular
         * But when order type = "Regular", on selecting of ShipTo = SoldTo, it should not switch back to Auto-Order automatically
         */
        if (region_details.customer_group_code === '11' && shipPartnerData?.partner_code) {
            if (login_id !== shipPartnerData.partner_code && orderTypeValue === 'AutoOrder') {
                setOrderTypeValue('Regular');
                setTableItems(initialTableItems);
                distributorUpdateCreateOrderFormField({
                    field: 'items',
                    value: [],
                });
                setIsSaltOnlyOrder(false);
            } else if (login_id === shipPartnerData.partner_code && orderTypeValue === 'Regular' && allowAutoOrder && recommendedMaterials?.length > 0) {
                setIsSaltOnlyOrder(true);
            } else {
                setIsSaltOnlyOrder(false);
            }
        }
    };

    /**Auto-Order Ends */

    /** Rush-Order Starts */

    function getOrderType() {
        if (isAutoOrder) return 'Auto-Order';
        else if (isLiquidationOrder) return 'Liquidation';
        else if (isSelfLiftingOrder) return 'Self Lifting & Direct Dispatch';
        else if (isRushOrder) return 'Rush Order';
        else if (isBulkOrder) return 'Bulk Order';
        else return 'Regular';
    }

    function getOrderType2() {
        if (isAutoOrder) return 'ARS';
        else if (isLiquidationOrder) return 'LIQUIDATION';
        else if (isSelfLiftingOrder) return 'SELF_LIFTING';
        else if (isRushOrder) return 'RUSH';
        else if (isBulkOrder) return 'BULK';
        else return 'NORMAL';
    }

    function changeOrderFlags(selectedValue, filteredSalesDetails = null) {
        setIsLiquidationOrder(selectedValue === 'Liquidation');
        setIsSelfLiftingOrder(selectedValue === 'SelfLifting');
        setIsAutoOrder(selectedValue === 'AutoOrder');
        setIsRushOrder(selectedValue === 'RushOrder');
        setIsBulkOrder(selectedValue === 'BulkOrder');
        setIsApprovalRequired(selectedValue === 'RushOrder' && enableOrderApprovalRushOrder);

        let distribution_channel = isNourishCo.current ? '90' : '10';
        if (selectedValue === 'SelfLifting') distribution_channel = filteredSalesDetails ? filteredSalesDetails[0]?.distribution_channel : '40';

        distributorUpdateCreateOrderFormField({
            field: 'po_number',
            value: '',
        });
        distributorUpdateCreateOrderFormField({
            field: 'po_date',
            value: '',
        });
        distributorUpdateCreateOrderFormField({
            field: 'req_date',
            value: '',
        });
        distributorUpdateCreateOrderFormField({
            field: 'sales_org',
            value: '1010',
        });
        distributorUpdateCreateOrderFormField({
            field: 'distribution_channel',
            value: distribution_channel,
        });
        distributorUpdateCreateOrderFormField({
            field: 'division',
            value: isNourishCo.current ? '12' : '10',
        });
        distributorUpdateCreateOrderFormField({
            field: 'items',
            value: [],
        });
    }

    async function sendOrderRequest(poNumber, reasonData) {
        const orderTypesToSendRequest = ['Rush Order'];
        if (orderTypesToSendRequest.includes(getOrderType()) && hasFeaturePermission(pages.DASHBOARD, features.CREATE_ORDER, role)) {
            const payload = {
                po_number: poNumber,
                approver_email: roFirstApprover.current,
                location: `${region_details?.group5} - ${region_details?.area_code}`,
                rsm: region_details?.rsm?.map((o) => `${o?.first_name} ${o?.last_name}`).join(', ') || '-',
                ...reasonData,
            };
            const res = await sentOrderRequest(payload);
            if (res?.status === 200 && res?.data?.success) {
                const request_number = res?.data?.data;
                if (role) {
                    browserHistory.push({
                        pathname: '/admin/order-request-sent-success',
                        state: {
                            distributorId: login_id,
                            poNumber: poNumber,
                            requestNumber: request_number,
                        },
                    });
                } else {
                    browserHistory.push({
                        pathname: '/distributor/order-request-sent-success',
                        state: {
                            distributorId: login_id,
                            poNumber: poNumber,
                            requestNumber: request_number,
                        },
                    });
                }
            } else {
                Util.notificationSender('Error!', 'Error in sending order request', false);
            }
        }
    }

    /** Rush-Order Ends */

    /**
     * Function is used to create the sales order
     * @param {*} event
     */
    const handleSubmit = async (event) => {
        event.preventDefault();
        const isSingleSessionFlag = isSingleSession();
        if (!isSingleSessionFlag) return;

        setSubmitErrors({});
        let orderData;
        let hasPdpError = false;
        if (isAutoOrder) {
            const arsOrderList = orderItemList.filter((item) => item.quantity > 0);
            orderData = CreateOrderTransomer.transform(arsOrderList);
        } else {
            orderData = CreateOrderTransomer.transform(orderItemList);
        }
        let dist_channel = 10;
        if (isNourishCo.current) dist_channel = 90;
        else if (isSelfLiftingOrder) dist_channel = 40;

        const salesOrderData = {
            sales_org: createOrderData.get('sales_org'),
            distribution_channel: dist_channel,
            division: createOrderData.get('division'),
            soldto: login_id,
            unloading: createOrderData.get('unloadingpoint') ? createOrderData.get('unloadingpoint') : '',
            shipto: createOrderData.get('shipto'),
            po_number: createOrderData.get('po_number'),
            po_date: createOrderData.get('po_date'),
            req_date: createOrderData.get('po_date'),
            pay_terms: '',
            items: orderData,
            navresult: createOrderData.get('navresult'),
            product_type: 'dist_specific',
            order_type: getOrderType(),
            distributor: region_details,
            ton: totalQuantityTonnage,
            pdp: region_details.enable_pdp == true && authorizePdpRestriction == true ? 'ON' : 'OFF',
        };
        const newArr = [];
        if (
            region_details.enable_pdp == true &&
            authorizePdpRestriction == true &&
            isSelfLiftingOrder === false &&
            !isBulkOrder &&
            !hasFeaturePermission(pages.ORDER, features.CCO_SPECIAL_ORDER)
        ) {
            for (let item of orderItemList) {
                let res = Util.filterArrayOfObjects(validateNavResults.current, 'Item', item.item_number);
                // SOPE-5317: PDP check of CMIR items are skipped for RUSH orders as per requirements
                if (!(res[0].PDP_Day == '' || res[0].PDP_Day == null || res[0].PDP_Day == undefined || (res[0].CMIR_Flag == 'X' && isRushOrder))) {
                    const data = handlePdpValidate(res);
                    if (data.hasPDPError) {
                        hasPdpError = data.hasPDPError;
                    }
                    newArr.push({
                        ...item,
                        errorArr: data.item.errorArr,
                        class: data.item.class,
                        pdperror: data.item.pdperror,
                    });
                }
            }
        }
        for (let item of orderList) {
            if (item.item_type === 'universal') {
                salesOrderData.product_type = 'universal';
                break;
            }
        }
        if (isBulkOrder) {
            orderData = orderDataTransform('submit');
            salesOrderData.items = orderData;

            let itemList = [...orderItemList];
            itemList
                .filter((item) => item.isSubItem)
                .forEach((item, i) => {
                    let date = moment(item.ReqDeliveryDate).format('DD-MM-YYYY').replace(/-/g, '.');
                    orderData[i].ReqDeliveryDate = date;
                });
            orderData = orderData.filter((item) => item.ReqDeliveryDate != null);

            salesOrderData.items = orderData;
            salesOrderData['rdd_data'] = createOrderData.get('rdd_data');
        }

        let response;
        let is_loading = false;
        try {
            if (!login_id) {
                notificationSender('Error', 'Distributor ID is required to create the sales order.', false);
                errorReportFormat.create_order.osbt_001.logObj = salesOrderData;
                logAppIssue(errorReportFormat.create_order.osbt_001);
            } else if (!createOrderData.get('partners') || createOrderData.get('partners').length === 0) {
                notificationSender('Error', 'Please select the shipping & unloading points.', false);
                errorReportFormat.create_order.osbt_002.logObj = salesOrderData;
                logAppIssue(errorReportFormat.create_order.osbt_002);
            } else if (!orderItemList || orderItemList.length === 0) {
                notificationSender('Error', 'Please enter the required materials.', false);
                errorReportFormat.create_order.osbt_003.logObj = salesOrderData;
                logAppIssue(errorReportFormat.create_order.osbt_003);
            } else if (hasPdpError) {
                setValidateSuccessCounter((prev) => prev + 1);
                distributorUpdateCreateOrderFormField({
                    field: 'items',
                    value: newArr,
                });
                notificationSender('Error', 'PDP window has Expired.', false);
                document.getElementById('vldbtn').disabled = false;
                if (document.getElementById('sbtbtn')) document.getElementById('sbtbtn').disabled = true;
            } else {
                distributorUpdateCreateOrderFormField({
                    field: 'order_payload',
                    value: orderData,
                });
                document.getElementById('sbtbtn').disabled = true;
                delete salesOrderData.distributor;
                delete salesOrderData.order_type;
                // As per SOPE-5092 submit button is disabled and spinner message is added and after 2 seconsds message chage as per discuessed
                disableSubmitBtn(true);
                setOrderPageLoadingMessage('Creating your sales order ...');
                setIsOrderPageLoading(true);
                is_loading = true;
                setTimeout(() => {
                    if(is_loading){
                        setOrderPageLoadingMessage('**Your order is currently being processed**.The process is taking longer than usual, but we are working to complete it as quickly as possible.Kindly avoid starting another transaction during this time.Thank you for your patience and understanding!');
                    } 
                },2000);
                response = await props.createDistributorSalesOrder(
                    salesOrderData,
                    props.location.state && props.location.state.distributorId,
                    isLiquidationOrder,
                    isSelfLiftingOrder,
                    isAutoOrder,
                );
                if(is_loading){
                    is_loading = false;
                    setIsOrderPageLoading(false);
                    setOrderPageLoadingMessage('Loading ...');
                }
                disableSubmitBtn(false);
                
                if (response.data.success === false) {
                    const itemMap = new Map();
                    orderItemList.forEach((item) => {
                        itemMap.set(item.item_number, {
                            name: item.description,
                            code: item.code,
                        });
                    });
                    const errors = response.data?.data?.d?.NAVRESULT.results.map((item) => item.Message);
                    const errors_obj = { others: [] };
                    itemMap.forEach((value, key) => {
                        errors_obj[key] = [];
                    });

                    const grouped_errors = errors?.reduce((acc, item) => {
                        let item_number = null;
                        let message = null;
                        itemMap.forEach((value, key) => {
                            if (item.includes(key)) {
                                item_number = key;
                                message = item.replace(key, `${value.code} - ${value.name}`);
                            }
                        });
                        if (item_number) {
                            acc[item_number].push(message);
                        } else {
                            acc['others'].push(item);
                        }
                        return acc;
                    }, errors_obj);

                    if (errors?.length > 0) {
                        setSubmitErrors(grouped_errors);
                        document.getElementById('vldbtn').disabled = true;
                        document.getElementById('sbtbtn').disabled = true;
                        notificationSender('Submit Error', 'The sales order could not be created due to errors mentioned below.', false);
                        handleErrorModal('submit');
                    } else {
                        document.getElementById('vldbtn').disabled = false;
                        document.getElementById('sbtbtn').disabled = true;
                        notificationSender('Technical Error', 'There may be some error occurred while creating the sales order. Please try again.', false);
                    }

                    salesOrderData.distributor = region_details;
                    salesOrderData.order_type = getOrderType();
                    errorReportFormat.create_order.osbt_004.errorMessage = response.data.error;
                    const error_from_sap = response.data.data.d.NAVRESULT.results.length ? response.data.data.d.NAVRESULT.results : [];
                    delete error_from_sap[0].__metadata;
                    errorReportFormat.create_order.osbt_004.logObj = {
                        error_from_sap,
                        sales_order_data: salesOrderData,
                    };
                    logAppIssue(errorReportFormat.create_order.osbt_004);
                } else {
                    //check if partner data sent to SAP and received from SAP is same
                    //if not, report an issue
                    //fetch partner mismatch error recipients from app level settings and service level category
                    //call report issue api with this data
                    //salesOrderData.unloading = '12345'
                    if (
                        salesOrderData.shipto !== response.data.data.d.NAVRESULT.results[0].Ship_to ||
                        salesOrderData.soldto !== response.data.data.d.NAVRESULT.results[0].Sold_to ||
                        salesOrderData.unloading !== response.data.data.d.NAVRESULT.results[0].Unloading
                    ) {
                        if (salesOrderData.unloading) {
                            delete response.data.data.d.NAVRESULT.results[0].__metadata;
                            salesOrderData.distributor = region_details;
                            salesOrderData.order_type = getOrderType();
                            errorReportFormat.create_order.osbt_006.logObj = {
                                data_from_sap: response.data.data.d.NAVRESULT.results[0],
                                sales_order_data: salesOrderData,
                            };
                            let filteredCategory = serviceLevelCategory.filter((cat) => {
                                return cat.label === PARTNER_MISMATCH_CATEGORY;
                            });

                            let partnerMismatchErrorRecipientsCCArr = [];
                            if (region_details) {
                                partnerMismatchErrorRecipientsCCArr.push(region_details.email);
                                if (region_details.asm) {
                                    const asmEmailArr =
                                        region_details?.asm?.map((item) => {
                                            return item.email ?? '';
                                        }) ?? [];
                                    partnerMismatchErrorRecipientsCCArr = partnerMismatchErrorRecipientsCCArr.concat(asmEmailArr);
                                }
                                if (region_details.tse) {
                                    const tseEmailArr =
                                        region_details?.tse?.map((item) => {
                                            return item.email ?? '';
                                        }) ?? [];
                                    partnerMismatchErrorRecipientsCCArr = partnerMismatchErrorRecipientsCCArr.concat(tseEmailArr);
                                }
                            }
                            let reportErrorPayload = {};
                            reportErrorPayload = {
                                remarks: PARTNER_MISMATCH_REMARK,
                                categoryId: filteredCategory[0].id,
                                recipients: partnerMismatchErrorRecipients,
                                ccRecipients: partnerMismatchErrorRecipientsCCArr.join(','),
                                tse: region_details.tse,
                                ...errorReportFormat.create_order.osbt_006,
                            };
                            const reportPortalErrorResponse = await props.reportPortalError(reportErrorPayload, login_id);
                            if (reportPortalErrorResponse && reportPortalErrorResponse.data && reportPortalErrorResponse.data.success) {
                            } else {
                                notificationSender('Error', 'Some error occurred while reporting portal issue.', false);
                            }
                        }
                    }
                    props.distributorResetCreateOrderFormFields();
                    distributorUpdateCreateOrderFormField({
                        field: 'order_response',
                        value: response.data.data.d,
                    });

                    // earlier we suppose only one so and one net value in result array , but in bulk order type multiple so and net value can be there so we loop the result
                    // note results is always array of object

                    // distributorUpdateCreateOrderFormField({ field: 'so_number', value: response.data.data.d.NAVRESULT.results[0].SalesOrder });
                    // const soValue = response.data.data.d.NAVRESULT.results[0].Net_value;
                    // soValue && distributorUpdateCreateOrderFormField({ field: 'order_total_amount', value: soValue });

                    let totalNetValue = 0;
                    let soNumber = '';
                    response.data.data.d.NAVRESULT.results.forEach((item) => {
                        totalNetValue += parseFloat(item.Net_value);
                        soNumber += item.SalesOrder + ' ,';
                    });
                    soNumber = soNumber.slice(0, -1);
                    distributorUpdateCreateOrderFormField({
                        field: 'so_number',
                        value: soNumber,
                    });

                    if (totalNetValue)
                        distributorUpdateCreateOrderFormField({
                            field: 'order_total_amount',
                            value: totalNetValue,
                        });
                    setTimeout(() => {
                        notificationSender('Success', 'Order has been created successfully.', true);
                    }, 50);

                    // Set po number for Promised credit data
                    setCreditData((prevState) => ({
                        ...prevState,
                        po_number: salesOrderData.po_number,
                    }));

                    logAppIssue({});
                    window.localStorage.setItem('TCPL_Promised_credit_flag', true);
                    window.localStorage.setItem(
                        'TCPL_Success_Order_data',
                        JSON.stringify({
                            order_total_amount: totalNetValue,
                            po_number: salesOrderData.po_number,
                            so_number: soNumber,
                            po_date: salesOrderData.po_date,
                        }),
                    );
                    if (role) {
                        browserHistory.push({
                            pathname: '/admin/create-order-success',
                            state: {
                                distributorId: login_id,
                                creditData: creditData,
                                creditDifference: creditDifference,
                            },
                        });
                    } else {
                        browserHistory.push({
                            pathname: '/distributor/create-order-success',
                            state: {
                                distributorId: login_id,
                                creditData: creditData,
                                creditDifference: creditDifference,
                            },
                        });
                    }
                }
            }
        } catch (err) {
            console.error(err);
            document.getElementById('vldbtn').disabled = false;
            document.getElementById('sbtbtn').disabled = true;
            if(is_loading){
                is_loading = false;
                setIsOrderPageLoading(false);
                setOrderPageLoadingMessage('Loading ...');
            }
            notificationSender('Technical Error', 'There may be some error occurred while creating the sales order. Please try again later.', false);
            const error_from_api = response.data ? [] : response;
            errorReportFormat.create_order.osbt_005.logObj = {
                error_from_api,
                sales_order_data: salesOrderData,
            };
            logAppIssue(errorReportFormat.create_order.osbt_005);
        }
     };

    
    const reportPartnerMismatchError = async (payload,response) => {
        delete response.data.data.d.NAVRESULT.results[0].__metadata;
        errorReportFormat.create_order.osbt_006.logObj = {
            data_from_sap: response.data.data.d.NAVRESULT.results[0],
            payload_data: payload,
        };
        payload.distributor = region_details;
        let filteredCategory = serviceLevelCategory.filter((cat) => {
            return cat.label === PARTNER_MISMATCH_CATEGORY;
        });
        let partnerMismatchErrorRecipientsCCArr = [];
        if (region_details) {
            partnerMismatchErrorRecipientsCCArr.push(region_details.email);
            if (region_details.asm) {
                const asmEmailArr = region_details?.asm?.map((item) =>  item.email ?? '') ?? [];
                partnerMismatchErrorRecipientsCCArr = partnerMismatchErrorRecipientsCCArr.concat(asmEmailArr);
            }
            if (region_details.tse) {
                const tseEmailArr = region_details?.tse?.map((item) => item.email ?? '') ?? [];
                partnerMismatchErrorRecipientsCCArr = partnerMismatchErrorRecipientsCCArr.concat(tseEmailArr);
            }
        }
        let reportErrorPayload = {};
        reportErrorPayload = {
            remarks: PARTNER_MISMATCH_REMARK,
            categoryId: filteredCategory[0].id,
            recipients: partnerMismatchErrorRecipients,
            ccRecipients: partnerMismatchErrorRecipientsCCArr.join(','),
            tse: region_details.tse,
                ...errorReportFormat.create_order.osbt_006,
        };
        const reportPortalErrorResponse = await props.reportPortalError(reportErrorPayload, login_id);
        if (reportPortalErrorResponse && reportPortalErrorResponse.data && reportPortalErrorResponse.data.success) {
        } else {
            notificationSender('Error', 'Some error occurred while reporting portal issue.', false);
        }
    }

    const disableValidateBtn = (status) =>{
            document.getElementById('vldbtn').disabled = status;
    }

    const disableSubmitBtn = (status) =>{
        if (document.getElementById('sbtbtn')) document.getElementById('sbtbtn').disabled = status;
    }

    const handleSubmit2 = async (event) => {
      event.preventDefault();
      const isSingleSessionFlag = isSingleSession();
      if (!isSingleSessionFlag) return;

      setSubmitErrors({});

      const payload = {
        po_number: createOrderData.get('po_number'),
        order_type: getOrderType2()
       };

       //Check if ship to and unlaoding point is selected
      const {status} = checkShipToUnloading(payload);
      if(!status) return;
      
      let response;
      let is_loading = false;
      try {
        // As per SOPE-5092 submit button is disabled and spinner message is added and after 2 seconsds message chage as per discuessed
        disableSubmitBtn(true);
        setOrderPageLoadingMessage('Creating your sales order ...');
        setIsOrderPageLoading(true);
        is_loading = true;
        setTimeout(() => {
            if(is_loading){
                setOrderPageLoadingMessage('**Your order is currently being processed**.The process is taking longer than usual, but we are working to complete it as quickly as possible.Kindly avoid starting another transaction during this time.Thank you for your patience and understanding!');
            } 
        },2000);
        response = await createOrder(payload);
        if(is_loading){
            is_loading = false;
            setIsOrderPageLoading(false);
            setOrderPageLoadingMessage('Loading ...');
        }
        disableSubmitBtn(false);

        // Check if the response is valid and response data is present
        if(!response.data.data && !response.data?.error) {
            disableValidateBtn(true);
            disableSubmitBtn(false);
            const error_from_api = response.data || {};
            errorReportFormat.create_order.osbt_005.logObj = {
                error_from_api,
                payload_data: payload
            };
            logAppIssue(errorReportFormat.create_order.osbt_005);
            notificationSender('Submit Error', response.data.message, false);
            return;
        }

        if (response.data.success === false) {
            notificationSender('Submit Error', response.data.message, false);
            if(response.data.message.contains('Ship_to') || response.data.message.contains('Sold_to') || response.data.message.contains('Unloading')){
                reportPartnerMismatchError(payload,response);
            }else if(response.data.message.contains('PDP')){
                const newArr = [];
                const errArr = [];
                const items = response.data.error ||  [];
                let hasPdpError = false;
                for (let item of orderItemList) {
                    let res_item = Util.filterArrayOfObjects(items, 'MATERIAL', item.code);
                    
                    if (res_item.pdp_error) {
                        hasPdpError = true;
                        errArr.push(res_item.pdp_error);
                    }
                    newArr.push({
                        ...item,
                        errorArr: errArr,
                        class: 'red-border',
                        pdperror: res_item.pdp_error,
                    });
                }
                setValidateSuccessCounter((prev) => prev + 1);
                distributorUpdateCreateOrderFormField({
                    field: 'items',
                    value: newArr,
                });
                disableValidateBtn(false);
                disableSubmitBtn(true);
            }else if (response.data.message === 'Failed to create order in SAP'){ //Handling Submit Errors from SAP
                const itemMap = new Map();
                orderItemList.forEach((item) => {
                    itemMap.set(item.item_number, {
                        name: item.description,
                        code: item.code,
                    });
                });
                const errors = response.data?.data?.d?.NAVRESULT.results.map((item) => item.Message);
                const errors_obj = { others: [] };
                itemMap.forEach((value, key) => {
                    errors_obj[key] = [];
                });

                const grouped_errors = errors?.reduce((acc, item) => {
                    let item_number = null;
                    let message = null;
                    itemMap.forEach((value, key) => {
                        if (item.includes(key)) {
                            item_number = key;
                            message = item.replace(key, `${value.code} - ${value.name}`);
                        }
                    });
                    if (item_number)  acc[item_number].push(message);
                    else  acc['others'].push(item);
                    
                    return acc;
                }, errors_obj);

                if (errors?.length > 0) {
                    setSubmitErrors(grouped_errors);
                    disableValidateBtn(true);
                    disableSubmitBtn(true);
                    notificationSender('Submit Error', 'The sales order could not be created due to errors mentioned below.', false);
                    handleErrorModal('submit');
                } else {
                    disableValidateBtn(false);
                    disableSubmitBtn(true);
                    notificationSender('Technical Error', 'There may be some error occurred while creating the sales order. Please try again.', false);
                }
                errorReportFormat.create_order.osbt_004.errorMessage = response.data.message;
                const error_from_sap = response.data.data?.d?.NAVRESULT?.results || [];
                delete error_from_sap[0].__metadata;
                errorReportFormat.create_order.osbt_004.logObj = {
                    error_from_sap,
                    payload_data: payload,
                };
                logAppIssue(errorReportFormat.create_order.osbt_004);
            }else{
                disableValidateBtn(false);
                disableSubmitBtn(true);
                const error_from_api = response.data;
                errorReportFormat.create_order.osbt_005.logObj = {
                    error_from_api,
                    payload_data: payload
                };
                logAppIssue(errorReportFormat.create_order.osbt_005);
            }           
        }else {
            props.distributorResetCreateOrderFormFields();
            distributorUpdateCreateOrderFormField({
                field: 'order_response',
                value: response.data.data.d,
            });
            // earlier we suppose only one so and one net value in result array , but in bulk order type multiple so and net value can be there so we loop the result
            // note results is always array of object

            //Calculating and setting total net value and so number
            let totalNetValue = 0;
            let soNumber = '';
            response.data.data.d.NAVRESULT.results.forEach((item) => {
                totalNetValue += parseFloat(item.Net_value);
                soNumber += item.SalesOrder + ' ,';
            });
            soNumber = soNumber.slice(0, -1);

            distributorUpdateCreateOrderFormField({
                field: 'so_number',
                value: soNumber,
            });
            totalNetValue &&
                distributorUpdateCreateOrderFormField({
                    field: 'order_total_amount',
                    value: totalNetValue,
                });
            setTimeout(() => {
                notificationSender('Success', 'Order has been created successfully.', true);
            }, 50);

            // Set po number for Promised credit data
            setCreditData((prevState) => ({
                ...prevState,
                po_number: payload.po_number,
            }));

            logAppIssue({});
            window.localStorage.setItem('TCPL_Promised_credit_flag', true);
            window.localStorage.setItem(
                'TCPL_Success_Order_data',
                JSON.stringify({
                    order_total_amount: totalNetValue,
                    po_number: payload.po_number,
                    so_number: soNumber,
                    po_date: response.data.data.d.NAVRESULT.results[0]?.ReqDate || '',
                }),
            );

            //Redirecting to order creation success summary page
            if (role) {
                browserHistory.push({
                    pathname: '/admin/create-order-success',
                    state: {
                        distributorId: login_id,
                        creditData: creditData,
                        creditDifference: creditDifference,
                    },
                });
            } else {
                browserHistory.push({
                    pathname: '/distributor/create-order-success',
                    state: {
                        distributorId: login_id,
                        creditData: creditData,
                        creditDifference: creditDifference,
                    },
                });
            }
        }
        
      } catch (err) {
          disableValidateBtn(false);
          disableSubmitBtn(true);
          notificationSender('Technical Error', 'There may be some error occurred while creating the sales order. Please try again later.', false);
          const error_from_api = response?.data ? [] : response;
          errorReportFormat.create_order.osbt_005.logObj = {
              error_from_api,
              sales_order_data: payload
          };
          if(is_loading){
            is_loading = false;
            setIsOrderPageLoading(false);
            setOrderPageLoadingMessage('Loading ...');
          }
          logAppIssue(errorReportFormat.create_order.osbt_005);
      }
    };
    /**
     * This function is used to validate the sales oreder items.
     * @param {*} event
     */
    const handleValidate = async (event) => {
        bulkOrderTentative.current = {};
        event.preventDefault();
        setSubmitErrors({});
        validateNavResults.current = [];

        let dist_channel = 10;
        if (isNourishCo.current) dist_channel = 90;
        else if (isSelfLiftingOrder) dist_channel = 40;

        let salesOrderData = {
            sales_org: createOrderData.get('sales_org'),
            distribution_channel: dist_channel,
            division: createOrderData.get('division'),
            items: [],
            partners: createOrderData.get('partners'),
            distributor: region_details,
            order_type: getOrderType(),
            pdp: region_details?.enable_pdp == true && authorizePdpRestriction == true ? 'ON' : 'OFF',
        };
        const isUnloadPointEmpty =
            (Object.keys(unloadingPartnerData).length === 0 || unloadingPartnerData.partner_code === '') &&
            (warehouses && warehouses.unloading_point && warehouses.unloading_point.length) > 1;
        //SOPE-3689 : Shifted shipto-unloading point validation to the top for correct error popup order
        if (Object.keys(shipPartnerData).length <= 0 || isUnloadPointEmpty) {
            if (!createOrderData.get('partners') || createOrderData.get('partners').length === 0) {
                notificationSender('Error', 'Please select the shipping & unloading points.', false);
                document.getElementById('vldbtn').disabled = false;
                errorReportFormat.validate_order.oval_002.logObj = salesOrderData;
                logAppIssue(errorReportFormat.validate_order.oval_002);
            } else if (Object.keys(shipPartnerData).length === 0 || shipPartnerData.partner_code === '') {
                notificationSender('Error', 'Please select shipping address.', false);
                document.getElementById('vldbtn').disabled = false;
                errorReportFormat.validate_order.oval_003.logObj = salesOrderData;
                logAppIssue(errorReportFormat.validate_order.oval_003);
            } else if (
                (Object.keys(unloadingPartnerData).length === 0 || unloadingPartnerData.partner_code === '') &&
                (warehouses && warehouses.unloading_point && warehouses.unloading_point.length) > 1
            ) {
                //if there are more than 1 unloading point, user has to select one of them
                //changes as per mail dated 09-05-2022
                notificationSender('Error', 'Please select unloading point.', false);
                document.getElementById('vldbtn').disabled = false;
                errorReportFormat.validate_order.oval_003.logObj = salesOrderData;
                logAppIssue(errorReportFormat.validate_order.oval_003);
            }
            return;
        }

        if (!orderItemList.length) {
            notificationSender('Error', 'Please enter the required materials.', false);
            document.getElementById('vldbtn').disabled = true;
            errorReportFormat.validate_order.oval_004.logObj = salesOrderData;
            logAppIssue(errorReportFormat.validate_order.oval_004);
            return;
        }

        let orderData;
        let arsOrderList;
        let originalOrderData = [];
        let hasItemError = null;
        if (!isAutoOrder) hasItemError = Util.checkItemList(orderItemList, '', '', '', 'ADD_TABLE_ROW');
        if (isAutoOrder) {
            /**
             * first ensure original qty in originalRecommendation is not getting changed
             * orderItemList will have filtered list, using this, quantity in the originalRecommendation need to be updated with the quantity in orderItemList
             */
            isOrderReady.current = false;
            arsOrderList = orderItemList?.filter((o) => {
                const original = originalRecommendation.current?.findIndex((i) => i.code === o.code);
                if (original !== -1) originalRecommendation.current[original].quantity = o.quantity !== '' ? o.quantity : '0';
                if (o.code !== '' && o.quantity > 0) return o;
                return null;
            });
            orderData = ValidateOrderTransomer.transform(arsOrderList);
            originalOrderData = ValidateOrderTransomer.transform(originalRecommendation.current);
        } else {
            if (orderTypeValue === 'Regular' && !isSaltOnlyOrder) {
                isOrderReady.current = false;
            }
            orderData = ValidateOrderTransomer.transform(orderItemList);
        }

        salesOrderData['items'] = orderData;

        if (isBulkOrder) {
            let isBreak = false;
            bulkOrderTentative.current = {};

            let message = '';
            orderItemList.forEach((item, i) => {
                if (item.isSubItem) {
                    if (!item.bulk_quantity_check) {
                        message = `Quantity should be more than ${bulkMOQ} ton for ${item.description}.`;
                        isBreak = true;
                        // notificationSender('Error', `Quantity should be more than ${bulkMOQ} ton for ${item.description}.`, false);
                    } else if (item.isSubItem && !item.summation) {
                        message = `Quantity must  match for ${item.description}.`;
                        isBreak = true;
                    }
                }
                if (item.quantity_in_ton === '' || item.quantity_in_ton === 0) {
                    message = `Please enter the quantity on line ${i + 1}.`;
                    isBreak = true;
                }
            });

            if (message.length) {
                if (document.getElementById('sbtbtn') != null) document.getElementById('sbtbtn').disabled = true;
                if (document.getElementById('vldbtn') != null) document.getElementById('vldbtn').disabled = true;
                notificationSender('Error', message, false);
            }
            if (isBreak) return;

            orderData = orderDataTransform('validate');

            salesOrderData.items = orderData;
        }

        if (isAutoOrder) {
            salesOrderData['original_items'] = originalOrderData;
            salesOrderData['distributor_psku_tolerance'] = createOrderData.get('distributor_psku_tolerance');
        }
        try {
            if (Object.keys(shipPartnerData).length > 0 && !isUnloadPointEmpty && (!hasItemError || (hasItemError && hasItemError.itmFlag))) {
                handleConfirmationBox();
            }
            document.getElementById('vldbtn').disabled = true;

            if (isConfirmationBoxOpen || hasItemError) {
                if (!login_id) {
                    notificationSender('Error', 'Distributor ID is required to validate the sales order.', false);
                    document.getElementById('vldbtn').disabled = false;
                    errorReportFormat.validate_order.oval_001.logObj = salesOrderData;
                    logAppIssue(errorReportFormat.validate_order.oval_001);
                } else if ((!isAutoOrder && isConfirmationBoxOpen && Util.checkItemList(orderItemList).itmFlag === false) || (hasItemError && hasItemError.itmFlag === false)) {
                    const errorMessage = 'Quantity should not be blank or zero and no decimal allowed';
                    //for AutoOrder we are filtering out zero quantity materials, hence this check is not required
                    notificationSender('Error', errorMessage, false);
                    document.getElementById('vldbtn').disabled = false;
                    // errorReportFormat.validate_order.oval_005.errorMessage = Util.checkItemList(orderItemList).errormessage;
                    errorReportFormat.validate_order.oval_005.errorMessage = errorMessage;
                    errorReportFormat.validate_order.oval_005.logObj = salesOrderData;
                    logAppIssue(errorReportFormat.validate_order.oval_005);
                } else if (isAutoOrder && Util.checkItemList(arsOrderList, originalRecommendation.current, tolerance, isAutoOrder).itmFlag === false) {
                    const { errormessage } = Util.checkItemList(arsOrderList, originalRecommendation.current, tolerance, isAutoOrder);
                    notificationSender('Error', errormessage, false);
                    document.getElementById('vldbtn').disabled = false;
                    errorReportFormat.validate_order.oval_005.errorMessage = errormessage;
                    errorReportFormat.validate_order.oval_005.logObj = salesOrderData;
                    logAppIssue(errorReportFormat.validate_order.oval_005);
                } else {
                    salesOrderData['po_number'] = createOrderData.get('po_number');
                    salesOrderData['po_date'] = createOrderData.get('po_date');
                    salesOrderData['req_date'] = createOrderData.get('po_date');
                    salesOrderData['navresult'] = createOrderData.get('navresult');
                    delete salesOrderData.distributor;
                    delete salesOrderData.order_type;

                    const response = await props.validateDistributorSalesOrder(
                        salesOrderData,
                        props.location.state && props.location.state.distributorId,
                        isLiquidationOrder,
                        isSelfLiftingOrder,
                        isAutoOrder,
                        isRushOrder,
                        isBulkOrder,
                        isApprovalRequired,
                    );

                    if (!response || !response.data) {
                        salesOrderData.distributor = region_details;
                        salesOrderData.order_type = getOrderType();
                        errorReportFormat.validate_order.oval_006.logObj = salesOrderData;
                        logAppIssue(errorReportFormat.validate_order.oval_006);
                        notificationSender('Technical Error', 'Could not validate order', false);
                    }
                    if (response?.data?.success === false) {
                        document.getElementById('vldbtn').disabled = false;
                        if (document.getElementById('sbtbtn')) document.getElementById('sbtbtn').disabled = true;
                        notificationSender('Technical Error', response.data.error, false);
                        if (response.data.data && response.data.data != null) {
                            const { ReqDate, PoNumber, PoDate } = response.data.data.d.NAVRESULT.results[0];
                            distributorUpdateCreateOrderFormField({
                                field: 'po_number',
                                value: PoNumber,
                            });
                            distributorUpdateCreateOrderFormField({
                                field: 'po_date',
                                value: PoDate,
                            });
                            distributorUpdateCreateOrderFormField({
                                field: 'req_date',
                                value: ReqDate,
                            });
                        }
                        salesOrderData.distributor = region_details;
                        salesOrderData.order_type = getOrderType();
                        errorReportFormat.validate_order.oval_007.errorMessage = response.data.error;
                        errorReportFormat.validate_order.oval_007.logObj = salesOrderData;
                        logAppIssue(errorReportFormat.validate_order.oval_007);
                    } else {
                        const newArr = [];
                        let totalAmount = 0;
                        let errors = [];
                        const { NAVRESULT } = response.data.data.d;
                        const navresult = NAVRESULT.results;
                        validateNavResults.current = navresult;
                        let hasPDPError = false;
                        let hasToleranceError = false;

                        let errorInValidatingOrder = false;
                        let creditShortfall;
                        let pdpReferenceDate = {};
                        let totalRDDTentative;
                        // change the state for bulk order table to merge the similar dates
                        let confirmed_by = login_id; // Default value for confirmed_by using in promised credit

                        orderItemList
                            .filter((o) => o.code !== '')
                            .forEach((item) => {
                                // reset error & class for each item
                                item['errorArr'] = [];
                                item['error'] = '';
                                item['class'] = '';
                                item['pdperror'] = '';
                                item['toleranceError'] = '';
                                item['tentative'] = '';

                                let itemErrorFlag = false;
                                let res = Util.filterArrayOfObjects(navresult, 'Item', item.item_number);
                                if (res.length) {
                                    res.forEach((itm, idx) => {
                                        if (itm.Item === item.item_number) {
                                            item['tentative'] = itm.Tentitive || '';
                                            item['buom'] = itm.Buom || '';
                                            item['ton'] = itm.Quantity_Ton || '';
                                            item['Plant'] = itm.Plant || '';
                                            item['PDP_Day'] = itm.PDP_Day || '';
                                            item['Reference_date'] = itm.Reference_date || '';
                                        }
                                        if (itm.Message !== 'Order ready for creation') {
                                            itemErrorFlag = true;
                                            errorInValidatingOrder = true;
                                            item['errorArr'].push(itm.Message);
                                            item['error'] += `${idx > 0 ? ';  ' : ''}${itm.Message}`;
                                            item['class'] = 'red-border';
                                            if (item['errorArr'].length) handleErrorModal('validate');
                                        } else {
                                            item['error'] = '';
                                            item['class'] = '';
                                            item['pdperror'] = '';
                                            item['toleranceError'] = '';
                                        }
                                    });

                                    //PDP check to be skipped for Bulk order
                                    if (
                                        region_details.enable_pdp == true &&
                                        authorizePdpRestriction == true &&
                                        isSelfLiftingOrder === false &&
                                        !(res[0].CMIR_Flag == 'X') &&
                                        !isBulkOrder &&
                                        !hasFeaturePermission(pages.ORDER, features.CCO_SPECIAL_ORDER)
                                    ) {
                                        if (!(res[0].PDP_Day == '' || res[0].PDP_Day == null || res[0].PDP_Day == undefined)) {
                                            const data = handlePdpValidate(res);
                                            hasPDPError = data.hasPDPError;
                                            item['pdperror'] = data.item['pdperror'];
                                            item['class'] = data.item['class'];
                                            item['errorArr'].push(...data.item['errorArr']);
                                        } else if (isRushOrder) {
                                            //If above if condition is false then it means the items is not under PDP restriction. Such items cannot be placed under Rush Order
                                            item['pdperror'] = RUSH_ORDER_PDP_ERROR_MESSAGE;
                                            item['class'] = 'red-border';
                                            item['errorArr'].push(RUSH_ORDER_PDP_ERROR_MESSAGE);
                                            hasPDPError = true;
                                        }
                                    } else if (isRushOrder) {
                                        //If above if condition is false then it means the items is not under PDP restriction. Such items cannot be placed under Rush Order
                                        item['pdperror'] = RUSH_ORDER_PDP_ERROR_MESSAGE;
                                        item['class'] = 'red-border';
                                        item['errorArr'].push(RUSH_ORDER_PDP_ERROR_MESSAGE);
                                        hasPDPError = true;
                                    }
                                    if (itemErrorFlag === true) {
                                        errors.push({
                                            item_number: item.item_number,
                                            message: item['error'],
                                        });
                                    }
                                } else {
                                    return;
                                }
                                newArr.push(item);
                                //in case of Auto-Order there are tentative amounts which are NaN or undefined
                                if (!isNaN(parseFloat(item.tentative)) && !(parseFloat(item.tentative) == null)) {
                                    totalAmount = parseFloat(parseFloat(totalAmount) + parseFloat(item.tentative));
                                }
                                if (item.isSubItem) {
                                    if (item.ReqDeliveryDate && item.tentative) {
                                        const tentativePerRDD = bulkOrderTentative.current[item.ReqDeliveryDate] ?? null;
                                        if (tentativePerRDD) {
                                            bulkOrderTentative.current[item.ReqDeliveryDate] = tentativePerRDD + +item.tentative;
                                        } else {
                                            bulkOrderTentative.current[item.ReqDeliveryDate] = +item.tentative;
                                        }
                                    }
                                }
                                if (Object.keys(bulkOrderTentative.current).length > 0) {
                                    const earliestOrderDates =
                                        Object.keys(bulkOrderTentative.current)?.reduce((prev, curr) => (new Date(prev) < new Date(curr) ? prev : curr)) ?? '';
                                    const totalTentativeAmountNearestRDD = bulkOrderTentative.current[earliestOrderDates] ?? 0;
                                    totalAmount = totalTentativeAmountNearestRDD;
                                    totalRDDTentative = totalTentativeAmountNearestRDD;
                                }

                                totalAmount = Number.isInteger(totalAmount) ? totalAmount : totalAmount.toFixed(2);

                                /*
                            Promise credit login starts here
                            Available credit = Credit limit - consumed 
                            credit shortfall = Available credit - tentative Amt - Open order value
                            */
                                let consumed = credit_details?.AMOUNT?.split('-').length === 2 ? `-${credit_details?.AMOUNT.split('-').join('')}` : credit_details?.AMOUNT;

                                let credit = +credit_details?.CREDIT_LIMIT - +consumed;
                                credit = credit.toFixed(2);

                                creditShortfall = Number(credit) - Number(totalAmount) - Number(credit_details?.OPENNETVALUE);
                                //Required credit for Promise credit
                                setCreditDifference(creditShortfall.toFixed(2));

                                //Pdp refernce date for Promise credit
                                pdpReferenceDate = Util.checkPdpDay(res[0].PDP_Day, res[0].Reference_date);
                                if (Object.keys(sso_user_details).length) {
                                    confirmed_by = sso_user_details?.data[0].user_id ?? login_id;
                                }
                                setCreditData((prevState) => ({
                                    ...prevState,
                                    open_order_value: credit_details?.OPENNETVALUE,
                                    confirmed_by: confirmed_by,
                                    distributor_id: login_id,
                                    po_number: navresult[0]?.PoNumber,
                                    type: 'insert',
                                    plant: [...new Set(navresult.map((item) => item.Plant))].join(','),
                                    reference_date: pdpReferenceDate.pdpDate,
                                }));

                                /*Promise credit login ends here*/

                                // orderItemList.filter(item=>item.isSubItem).reduce((a, b) => ,0)

                                if (isBulkOrder && Object.keys(bulkOrderTentative.current).length > 0) {
                                    let boTentativeAmount = 0;
                                    for (let total in bulkOrderTentative.current) {
                                        boTentativeAmount = boTentativeAmount + bulkOrderTentative.current[total];
                                    }
                                    totalAmount = boTentativeAmount;
                                }

                                distributorUpdateCreateOrderFormField({
                                    field: 'order_total_amount',
                                    value: totalAmount,
                                });
                            });
                        setTotalAmount(totalAmount);
                        if (navresult && navresult.length > 0 && creditShortfall <= 0 && !isRushOrder && enablePromiseCredit) {
                            if (isBulkOrder && totalRDDTentative != null) {
                                totalAmount = totalRDDTentative;
                            }
                            promiseCredit({
                                plant: [...new Set(navresult.map((item) => item.Plant))].join(','),
                                confirmed_by: confirmed_by,
                                distributor_id: login_id,
                                po_number: navresult[0].PoNumber,
                                type: 'insert',
                                credit_shortfall: creditShortfall?.toFixed(2),
                                order_value: totalAmount,
                                reference_date: pdpReferenceDate.pdpDate,
                            });
                        }
                        if (errorInValidatingOrder === true) {
                            setTotalAmount(0);
                            setCreditDifference(0);
                        }
                        distributorUpdateCreateOrderFormField({
                            field: 'items',
                            value: newArr,
                        });
                        setValidateSuccessCounter((prev) => prev + 1);
                        if (errors.length === 0 && navresult.length > 0) {
                            distributorUpdateCreateOrderFormField({
                                field: 'po_number',
                                value: navresult[0].PoNumber,
                            });
                            distributorUpdateCreateOrderFormField({
                                field: 'po_date',
                                value: navresult[0].PoDate,
                            });
                            distributorUpdateCreateOrderFormField({
                                field: 'req_date',
                                value: navresult[0].ReqDate,
                            });
                            distributorUpdateCreateOrderFormField({
                                field: 'rdd_data',
                                value: response.data.data.d?.db_response?.data || [],
                            });
                        }

                        if (errors.length === 0 && totalAmount && !hasPDPError && !hasToleranceError) {
                            poNum.current = response.data.data.d.PURCH_NO;
                            let plantCodes = orderItemList.map((o) => o['Plant']).filter((v, i, a) => a.indexOf(v) === i);
                            // fetching moq data after auto order successfully validated
                            if (isAutoOrder || (orderTypeValue === 'Regular' && !isSaltOnlyOrder) || hasFeaturePermission(pages.ORDER, features.CCO_SPECIAL_ORDER)) {
                                const plant_codes = distributor_sales_details?.map((d) => d.plant_name);
                                // if (plantCodes.length === 1 && plantCodes[0] === '0000')
                                plantCodes = new Array(...new Set(plant_codes));
                                const dbMoq = await fetchDistributorMoq({
                                    dbCode: region_details?.id,
                                    plantCodes,
                                });
                                if (dbMoq?.success) {
                                    isOrderReady.current = true;
                                    let error_plants = [];
                                    let obj = newArr
                                        .map((o) => o['Plant'])
                                        .filter((v, i, a) => a.indexOf(v) === i)
                                        .reduce((a, v) => {
                                            return { ...a, [v]: [] };
                                        }, {});
                                    for (let key in obj) {
                                        obj[key] = newArr.filter((o) => o['Plant'] === key);
                                    }

                                    let moq_obj = {};
                                    let submit_success = true;
                                    for (let key in obj) {
                                        const temp = { qty: 0, moq: 0, success: false };
                                        let arr = obj[key]?.map((o) => o.ton);
                                        let moq = dbMoq.data.filter((o) => o.plant_code === key).map((o) => o.moq);
                                        temp.qty = arr.reduce((a, b) => a + +b.split(' ')[0], 0.0).toFixed(2);
                                        temp.moq = moq?.length ? (+moq[0]).toFixed(2) : 0.0;
                                        temp.success = !moqEnable || +temp.qty >= (+temp.moq * (1 - +moqTolerance / 100)).toFixed(2);
                                        if (!temp.success) error_plants.push(key);
                                        moq_obj[key] = { ...temp };
                                        submit_success = submit_success && temp.success;
                                    }

                                    setMoqArr({ ...moq_obj });
                                    if (submit_success) {
                                        document.getElementById('vldbtn').disabled = true;
                                        if (document.getElementById('sbtbtn')) {
                                            document.getElementById('sbtbtn').disabled = false;
                                        }
                                        notificationSender('Success', 'Order is valid and ready for creation.', true);
                                    } else {
                                        notificationSender('Error', `Total quantity of plant(s) - ${error_plants.toString()} is lower than MOQ.`);
                                    }
                                } else {
                                    document.getElementById('vldbtn').disabled = false;
                                    if (document.getElementById('sbtbtn')) {
                                        document.getElementById('sbtbtn').disabled = true;
                                    }
                                    notificationSender('Technical Error', 'Cannot fetch MOQ data. Try again after some time', false);
                                }
                            } else {
                                document.getElementById('vldbtn').disabled = true;
                                if (roFirstApprover.current.length > 8) {
                                    if (document.getElementById('sbtbtn')) {
                                        document.getElementById('sbtbtn').disabled = false;
                                    }
                                    notificationSender('Success', 'Order is valid and ready for creation.', true);
                                    setCreditData((prevState) => ({
                                        ...prevState,
                                        po_number: navresult[0].PoNumber,
                                    }));
                                    if (isApprovalRequired) {
                                        setIsRoReasonModalVisible(true);
                                    }
                                } else {
                                    notificationSender('Error', 'Rush Order Approvers not set. Please contact admin.', false);
                                }
                            }
                            logAppIssue({});
                        } else if (!totalAmount) {
                            document.getElementById('vldbtn').disabled = false;
                            if (document.getElementById('sbtbtn')) document.getElementById('sbtbtn').disabled = true;
                            notificationSender('Error', 'Unable to get tentative amount value', false);
                            salesOrderData.distributor = region_details;
                            salesOrderData.order_type = getOrderType();
                            errorReportFormat.validate_order.oval_010.logObj = {
                                sales_order_data: salesOrderData,
                                errors,
                            };
                            logAppIssue(errorReportFormat.validate_order.oval_010);
                        } else {
                            document.getElementById('vldbtn').disabled = false;
                            if (document.getElementById('sbtbtn')) document.getElementById('sbtbtn').disabled = true;
                            notificationSender('Error', 'There is error in order items', false);
                            salesOrderData.distributor = region_details;
                            salesOrderData.order_type = getOrderType();
                            errorReportFormat.validate_order.oval_008.logObj = {
                                sales_order_data: salesOrderData,
                                errors,
                            };
                            logAppIssue(errorReportFormat.validate_order.oval_008);
                        }
                    }
                }
            }
        } catch (err) {
            notificationSender('Technical Error', err, false);
            document.getElementById('vldbtn').disabled = false;
            if (document.getElementById('sbtbtn')) document.getElementById('sbtbtn').disabled = true;
            errorReportFormat.validate_order.oval_009.errorMessage = err.message || err;
            errorReportFormat.validate_order.oval_009.logObj = salesOrderData;
            logAppIssue(errorReportFormat.validate_order.oval_009);
        }
        isBulkOrder && setValidateBulk(true);
    };

    const checkShipToUnloading = (order_data) => {
        //Ship To and Unloading Checks
        let canProceed = true;
        let errorMessage = '';
        const unloading_points = warehouses?.unloading_point || [];

        const isUnloadPointEmpty = (Object.keys(unloadingPartnerData).length === 0 || unloadingPartnerData.partner_code === '') && unloading_points.length > 1;

        const isShippingPointEmpty = Object.keys(shipPartnerData).length === 0 || shipPartnerData.partner_code === '';

        if (isUnloadPointEmpty && isShippingPointEmpty && !createOrderData.get('partners')?.length) {
            errorMessage = 'Please select the shipping & unloading points.';
            canProceed = false;
            errorReportFormat.validate_order.oval_002.logObj = order_data;
            logAppIssue(errorReportFormat.validate_order.oval_002);
        } else if (isShippingPointEmpty) {
            errorMessage = 'Please select shipping address.';
            canProceed = false;
            errorReportFormat.validate_order.oval_003.logObj = order_data;
            logAppIssue(errorReportFormat.validate_order.oval_003);
        } else if (isUnloadPointEmpty) {
            errorMessage = 'Please select unloading point.';
            canProceed = false;
            errorReportFormat.validate_order.oval_003.logObj = order_data;
            logAppIssue(errorReportFormat.validate_order.oval_003);
        }

        if (!canProceed) {
            document.getElementById('vldbtn').disabled = true;
            notificationSender('Error', errorMessage, false);
        }

        return { status: canProceed, message: errorMessage };
    };

    const checkItemList = (order_data) => {
        let itemFlag = true;
        let errorMessage = [];
        orderItemList?.forEach((item, index) => {
            const { code, description = '', quantity = '' } = item;
            if (code === '') {
                itemFlag = false;
                errorMessage.push(`Item ${index + 1}: Item should not be blank`);
            } else if (!isAutoOrder && (quantity === '' || quantity <= 0)) {
                itemFlag = false;
                errorMessage.push(`${description}: Quantity should not be blank or zero`);
            } else if (quantity % 1 !== 0) {
                itemFlag = false;
                errorMessage.push(`${description}: No decimal allowed in item quantity`);
            }
        });

        const errorString = errorMessage.join(' | ');
        if (!itemFlag) {
            errorReportFormat.validate_order.oval_005.errorMessage = errorString;
            errorReportFormat.validate_order.oval_005.logObj = order_data;
            logAppIssue(errorReportFormat.validate_order.oval_005);
            document.getElementById('vldbtn').disabled = true;
            notificationSender('Error', errorString, false);
        }

        return { status: itemFlag, message: errorString };
    };

    const calculatePromiseCredit = (totalAmount, pdp_day, reference_date, navresult) => {
        /*
      Promise credit login starts here
      Available credit = Credit limit - consumed 
      credit shortfall = Available credit - tentative Amt - Open order value
      */
        let consumed = credit_details?.AMOUNT?.split('-').length === 2 ? `-${credit_details?.AMOUNT.split('-').join('')}` : credit_details?.AMOUNT;

        let credit = +credit_details?.CREDIT_LIMIT - +consumed;
        credit = credit.toFixed(2);

        let creditShortfall = Number(credit) - Number(totalAmount) - Number(credit_details?.OPENNETVALUE);
        //Required credit for Promise credit
        setCreditDifference(creditShortfall.toFixed(2));

        //Pdp refernce date for Promise credit
        let pdpReferenceDate = Util.checkPdpDay(pdp_day, reference_date);
        let confirmed_by = sso_user_details?.data?.length ? sso_user_details?.data[0]?.user_id : login_id;

        setCreditData((prevState) => ({
            ...prevState,
            open_order_value: credit_details?.OPENNETVALUE,
            confirmed_by: confirmed_by,
            distributor_id: login_id,
            po_number: navresult[0]?.PoNumber,
            type: 'insert',
            plant: [...new Set(navresult.map((item) => item.Plant))].join(','),
            reference_date: pdpReferenceDate.pdpDate,
        }));

        /*Promise credit login ends here*/

        if (navresult && navresult.length > 0 && creditShortfall <= 0 && !isRushOrder && enablePromiseCredit) {
            promiseCredit({
                plant: [...new Set(navresult.map((item) => item.Plant))].join(','),
                confirmed_by: confirmed_by,
                distributor_id: login_id,
                po_number: navresult[0].PoNumber,
                type: 'insert',
                credit_shortfall: creditShortfall?.toFixed(2),
                order_value: totalAmount,
                reference_date: pdpReferenceDate.pdpDate,
            });
        }
    };

    const disableSubmitButton = () => {
        document.getElementById('vldbtn').disabled = false;
        if (document.getElementById('sbtbtn')) {
            document.getElementById('sbtbtn').disabled = true;
        }
    };

    const processValidateOrderResultErrors = (results) => {
        let totalAmount = 0.0;
        const newArr = [];
        let errors = [];
        let hasPDPError = false;
        let bulkOrderObj = {};
        let totalRDDTentative = 0.0;

        orderItemList
            .filter((o) => o.code)
            .forEach((item) => {
                let res = results.filter((itm) => itm['Item'] === item.item_number);
                if (!res.length) return;

                // reset error & class for each item
                item['errorArr'] = [];
                item['error'] = '';
                item['class'] = '';
                item['pdperror'] = '';
                item['tentative'] = '';

                item['tentative'] = res[0].Tentitive || '';
                item['buom'] = res[0].Buom || '';
                item['ton'] = res[0].Quantity_Ton || '';
                item['Plant'] = res[0].Plant || '';
                item['PDP_Day'] = res[0].PDP_Day || '';
                item['Reference_date'] = res[0].Reference_date || '';

                let itemErrorFlag = false;
                res.forEach((itm, idx) => {
                    if (itm.Message !== 'Order ready for creation') {
                        itemErrorFlag = true;
                        item['errorArr'].push(itm.Message);
                        item['error'] += `${idx > 0 ? ';  ' : ''}${itm.Message}`;
                        item['class'] = 'red-border';
                    } else if (itm.pdp_error) {
                        item['pdperror'] = itm.pdp_error;
                        item['class'] = 'red-border';
                        item['errorArr'].push(itm.pdp_error);
                        hasPDPError = true;
                    } else {
                        item['error'] = '';
                        item['class'] = '';
                        item['pdperror'] = '';
                    }
                });

                //PDP check is done in backend
                if (itemErrorFlag || hasPDPError) {
                    errors.push({
                        item_number: item.item_number,
                        message: item['error'],
                    });
                }

                if (item.isSubItem && item.ReqDeliveryDate && item.tentative) {
                    bulkOrderObj[item.ReqDeliveryDate] = (bulkOrderObj[item.ReqDeliveryDate] ?? 0) + +item.tentative;
                }

                newArr.push(item);
                //in case of Auto-Order there are tentative amounts which are NaN or undefined
                if (item.tentative && !isNaN(parseFloat(item.tentative))) {
                    totalAmount = parseFloat(totalAmount) + parseFloat(item.tentative);
                }

                if (Object.keys(bulkOrderObj).length > 0) {
                    const earliestOrderDates = Object.keys(bulkOrderObj)?.reduce((prev, curr) => (new Date(prev) < new Date(curr) ? prev : curr)) ?? '';

                    totalRDDTentative = bulkOrderObj[earliestOrderDates] ?? 0;

                    let boTentativeAmount = 0;
                    for (let total in bulkOrderObj) {
                        boTentativeAmount += bulkOrderObj[total];
                    }
                    totalAmount = boTentativeAmount;
                }

                totalAmount = Number.isInteger(totalAmount) ? totalAmount : totalAmount.toFixed(2);

                distributorUpdateCreateOrderFormField({
                    field: 'order_total_amount',
                    value: totalAmount,
                });
            });

        if (errors.length) {
            handleErrorModal('validate');
            setTotalAmount(0);
            setCreditDifference(0);
        } else {
            setTotalAmount(totalAmount);
            distributorUpdateCreateOrderFormField({
                field: 'po_date',
                value: results[0].PoDate,
            });
            distributorUpdateCreateOrderFormField({
                field: 'req_date',
                value: results[0].ReqDate,
            });
        }

        return { errors, newArr, totalAmount, hasPDPError, totalRDDTentative };
    };

    const processMoqData = async (itemData) => {
        let plantCodes = orderItemList.map((o) => o['Plant']).filter((v, i, a) => a.indexOf(v) === i);
        // fetching moq data after auto order successfully validated
        if (isAutoOrder || (orderTypeValue === 'Regular' && !isSaltOnlyOrder) || hasFeaturePermission(pages.ORDER, features.CCO_SPECIAL_ORDER)) {
            const plant_codes = distributor_sales_details?.map((d) => d.plant_name);
            // if (plantCodes.length === 1 && plantCodes[0] === '0000')
            plantCodes = new Array(...new Set(plant_codes));
            const dbMoq = await fetchDistributorMoq({ dbCode: region_details?.id, plantCodes });
            if (dbMoq?.success) {
                isOrderReady.current = true;
                let error_plants = [];
                let obj = itemData
                    .map((o) => o['Plant'])
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .reduce((a, v) => {
                        return { ...a, [v]: [] };
                    }, {});
                for (let key in obj) {
                    obj[key] = itemData.filter((o) => o['Plant'] === key);
                }

                let moq_obj = {};
                let submit_success = true;
                // Calculting moq for each plant
                for (let key in obj) {
                    const temp = { qty: 0, moq: 0, success: false };
                    let arr = obj[key]?.map((o) => o.ton);
                    let moq = dbMoq.data.filter((o) => o.plant_code === key).map((o) => o.moq);
                    temp.qty = arr.reduce((a, b) => a + +b.split(' ')[0], 0.0).toFixed(2);
                    temp.moq = moq?.length ? (+moq[0]).toFixed(2) : 0.0;
                    temp.success = !moqEnable || +temp.qty >= (+temp.moq * (1 - +moqTolerance / 100)).toFixed(2);
                    if (!temp.success) error_plants.push(key);
                    moq_obj[key] = { ...temp };
                    submit_success = submit_success && temp.success;
                }

                setMoqArr({ ...moq_obj });
                if (submit_success) {
                    return true;
                } else {
                    notificationSender('Error', `Total quantity of plant(s) - ${error_plants.toString()} is lower than MOQ.`);
                    return false;
                }
            } else {
                disableSubmitButton();
                notificationSender('Technical Error', 'Cannot fetch MOQ data. Try again after some time', false);
                return false;
            }
        }
        return true;
    };

    const handleValidate2 = async (event) => {
        event.preventDefault();
        setSubmitErrors({});
        validateNavResults.current = [];

        let salesOrderData = {
            items: [],
            partners: createOrderData.get('partners'),
        };

        if (!login_id) {
            notificationSender('Error', 'Distributor ID is required to validate the sales order.', false);
            errorReportFormat.validate_order.oval_001.logObj = salesOrderData;
            logAppIssue(errorReportFormat.validate_order.oval_001);
            return;
        }

        const shipToUnloadingChecks = checkShipToUnloading(salesOrderData);
        if (!shipToUnloadingChecks.status) {
            return;
        }

        if (!orderItemList.length) {
            notificationSender('Error', 'Please enter the required materials.', false);
            document.getElementById('vldbtn').disabled = true;
            errorReportFormat.validate_order.oval_004.logObj = salesOrderData;
            logAppIssue(errorReportFormat.validate_order.oval_004);
            return;
        }

        let itemChecks = { status: true, message: '' };
        // if (!isAutoOrder){
        itemChecks = checkItemList(salesOrderData);
        if (!itemChecks.status) return;
        // }

        let orderData;
        if (orderTypeValue === 'Regular' && !isSaltOnlyOrder) {
            isOrderReady.current = false;
        }
        if (isBulkOrder) {
            let itemList = orderItemList.filter((item) => item.isSubItem);
            orderData = ValidateOrderTransomer.transform(itemList);
        } else {
            orderData = ValidateOrderTransomer.transform(orderItemList);
        }

        salesOrderData['items'] = orderData;
        if (isAutoOrder) {
            salesOrderData['original_items'] = ValidateOrderTransomer.transform(originalRecommendation.current);
            salesOrderData['distributor_psku_tolerance'] = createOrderData.get('distributor_psku_tolerance');
        }
        if (createOrderData.get('po_number')) salesOrderData['po_number'] = createOrderData.get('po_number');

        const validatePayload = {
            order_data: salesOrderData,
            distributor_id: login_id,
            order_type: getOrderType2(),
        };

        try {
            handleConfirmationBox();
            //As per SOPE-5092 validate button has been disabled during API call and Spinner is added 
            disableValidateBtn(true)
            setOrderPageLoadingMessage('Validating your sales order ...');
            setIsOrderPageLoading(true);
            const response = await validateOrder(validatePayload);
            setOrderPageLoadingMessage('Loading ...');
            setIsOrderPageLoading(false);
            disableValidateBtn(false);

            //Validation Fail condintions
            if (!response || !response.data) {
                errorReportFormat.validate_order.oval_006.logObj = validatePayload;
                logAppIssue(errorReportFormat.validate_order.oval_006);
                notificationSender('Technical Error', 'Could not validate order', false);
                return;
            }
            if (response.data.data) {
                const { PURCH_NO } = response.data.data.d;
                poNum.current = PURCH_NO;
                distributorUpdateCreateOrderFormField({
                    field: 'po_number',
                    value: PURCH_NO,
                });
            }

            if (response?.data?.success === false) {
                document.getElementById('vldbtn').disabled = false;
                if (document.getElementById('sbtbtn')) document.getElementById('sbtbtn').disabled = true;
                notificationSender(response.data.message || 'Technical Error', response?.data?.error, false);
                errorReportFormat.validate_order.oval_007.errorMessage = response.data.message;
                errorReportFormat.validate_order.oval_007.logObj = validatePayload;
                logAppIssue(errorReportFormat.validate_order.oval_007);
                return;
            }

            //When validation is successful
            const { NAVRESULT = { results: [] } } = response.data.data.d || {};
            const navresult = NAVRESULT.results;
            if (!navresult || !navresult.length) {
                notificationSender('Error', 'No SAP validation results found for the order validation', false);
                return;
            }

            const { newArr, totalAmount, errors, hasPDPError, totalRDDTentative } = processValidateOrderResultErrors(navresult);
            validateNavResults.current = navresult;
            const pdpSet = new Set();
            navresult.forEach((item) => {
                pdpSet.add(item.PDP_Day + ',' + item.Reference_date);
            });
            pdpSet.forEach((pdp) => {
                const [pdp_day, reference_date] = pdp.split(',');
                calculatePromiseCredit(totalRDDTentative > 0 ? totalRDDTentative : totalAmount, pdp_day, reference_date, navresult);
            });

            distributorUpdateCreateOrderFormField({
                field: 'rdd_data',
                value: response.data.data.d?.db_response || [],
            });
            distributorUpdateCreateOrderFormField({
                field: 'items',
                value: newArr,
            });
            setValidateSuccessCounter((prev) => prev + 1);

            if (errors.length === 0 && totalAmount && !hasPDPError) {
                const isMoqCheckSuccess = await processMoqData(newArr);
                if (!isMoqCheckSuccess) return;

                if (roFirstApprover.current.length <= 8) {
                    notificationSender('Error', 'Rush Order Approvers not set. Please contact admin.', false);
                }

                document.getElementById('vldbtn').disabled = true;
                if (document.getElementById('sbtbtn')) document.getElementById('sbtbtn').disabled = false;
                notificationSender('Success', 'Order is valid and ready for creation.', true);

                setCreditData((prevState) => ({
                    ...prevState,
                    po_number: poNum.current,
                }));
                if (isApprovalRequired) setIsRoReasonModalVisible(true);

                logAppIssue({});
            } else if (!totalAmount) {
                disableSubmitButton();
                notificationSender('Error', 'Unable to get tentative amount value', false);
                errorReportFormat.validate_order.oval_010.logObj = { sales_order_data: validatePayload, errors };
                logAppIssue(errorReportFormat.validate_order.oval_010);
            } else {
                disableSubmitButton();
                notificationSender('Error', 'There is error in order items', false);
                errorReportFormat.validate_order.oval_008.logObj = { sales_order_data: validatePayload, errors };
                logAppIssue(errorReportFormat.validate_order.oval_008);
            }
            isBulkOrder && setValidateBulk(true);
        } catch (err) {
            notificationSender('Error', 'Technical Error', false);
            disableSubmitButton();
            setIsOrderPageLoading(false);
            setOrderPageLoadingMessage('Loading ...');
            errorReportFormat.validate_order.oval_009.errorMessage = err.message || err;
            errorReportFormat.validate_order.oval_009.logObj = validatePayload;
            logAppIssue(errorReportFormat.validate_order.oval_009);
        }
    };

    const handlePdpValidate = function (res) {
        let item = {
            errorArr: [],
            class: '',
            pdperror: '',
        };
        let hasPDPError = false;

        if (res[0].PDP_Day.substring(0, 2) == 'WE') {
            //PDP logic changed SOPE-453, SOPE-458 and SOPE-1748
            // let { orderStartDate, orderEndDate, orderStartTime, orderEndTime, errorMessage } = Util.checkPDPDay(res[0].PDP_Day, moment(res[0].Reference_date).utc().format(), pdpWeeklyOrderWindow, pdpFortnightlyOrderWindow, pdpOrderPlacementTime, pdpWeeklyOff);
            let { orderStartDate, orderEndDate, orderStartTime, orderEndTime, errorMessage } = Util.checkPdpDay(res[0].PDP_Day, res[0].Reference_date);
            if (orderStartDate && orderEndDate) {
                if (isNaN(orderStartDate) === false) {
                    let startDateTime = new Date(moment(orderStartDate).format('L') + ' ' + orderStartTime);
                    let endDateTime = new Date(moment(orderEndDate).format('L') + ' ' + orderEndTime);
                    let today = new Date();

                    if (!moment(today).isBetween(startDateTime, endDateTime, undefined, '()') && !isRushOrder) {
                        let error_message = `${errorMessage ? `${errorMessage};` : ''} You can place order for this item between ${moment(orderStartDate).format('dddd, MMMM DD YYYY')} ${orderStartTime} to ${moment(orderEndDate).format('dddd, MMMM DD YYYY')} ${orderEndTime}.`;
                        item['pdperror'] = `${error_message}`;
                        item['class'] = 'red-border';
                        item['errorArr'].push(error_message);
                        hasPDPError = true;
                    } else if (isRushOrder && moment(today).isBetween(startDateTime, endDateTime, undefined, '()')) {
                        item['pdperror'] = RUSH_ORDER_PDP_ERROR_MESSAGE;
                        item['class'] = 'red-border';
                        item['errorArr'].push(RUSH_ORDER_PDP_ERROR_MESSAGE);
                        hasPDPError = true;
                    }
                }
            }
        } else if (res[0].PDP_Day.substring(0, 2) == 'FN' && !(res[0].Reference_date == '' || res[0].Reference_date == '00000000')) {
            //PDP logic changed SOPE-453 and SOPE-458
            // let { orderStartDate, orderEndDate, orderStartTime, orderEndTime, errorMessage } = Util.checkPDPDay(res[0].PDP_Day, moment(res[0].Reference_date).utc().format(), pdpWeeklyOrderWindow, pdpFortnightlyOrderWindow, pdpOrderPlacementTime, pdpWeeklyOff);
            let { orderStartDate, orderEndDate, orderStartTime, orderEndTime, errorMessage } = Util.checkPdpDay(res[0].PDP_Day, res[0].Reference_date);
            if (orderStartDate && orderEndDate) {
                if (isNaN(orderStartDate) === false) {
                    let startDateTime = new Date(moment(orderStartDate).format('L') + ' ' + orderStartTime);
                    let endDateTime = new Date(moment(orderEndDate).format('L') + ' ' + orderEndTime);
                    let today = new Date();

                    if (!moment(today).isBetween(startDateTime, endDateTime, undefined, '()') && !isRushOrder) {
                        let error_message = `${errorMessage ? errorMessage + '; ' : ''} You can place order for this item between ${moment(orderStartDate).format('dddd, MMMM DD YYYY')} ${orderStartTime} to ${moment(orderEndDate).format('dddd, MMMM DD YYYY')} ${orderEndTime}.`;
                        item['pdperror'] = `${error_message}`;
                        item['class'] = 'red-border';
                        item['errorArr'].push(error_message);
                        hasPDPError = true;
                    } else if (moment(today).isBetween(startDateTime, endDateTime, undefined, '()') && isRushOrder) {
                        item['pdperror'] = RUSH_ORDER_PDP_ERROR_MESSAGE;
                        item['class'] = 'red-border';
                        item['errorArr'].push(RUSH_ORDER_PDP_ERROR_MESSAGE);
                        hasPDPError = true;
                    }
                }
            }
        }
        return {
            hasPDPError: hasPDPError,
            item: item,
        };
    };

    const orderDataTransform = (type) => {
        let itemList = [...orderItemList];
        itemList = itemList.filter((item) => item.isSubItem);
        if (type === 'validate') return ValidateOrderTransomer.transform(itemList);
        else return CreateOrderTransomer.transform(itemList);
    };

    /** Function to add partners */

    let handleInputChange = (selectedOption, field) => {
        let list = [...partnersList];
        const { shipping_point, unloading_point } = warehouses;
        let selectedObj = {};

        if (field === 'shipto') {
            if (!shipping_point) return;
            shipping_point.forEach((item) => {
                if (item.partner_code === selectedOption) {
                    selectedObj = item;
                    const filteredList = list.filter((item) => item.partner_role !== 'WE');
                    filteredList.push({
                        partner_role: 'WE',
                        partner_number: item.partner_code,
                        partner_name: item.partner_name,
                    });
                    list = filteredList;
                    setShipPartnerData(item);
                }
            });

            if (props.region_details.market) {
                setPartnerMarket(props.region_details.market);
            } else {
                const marketDataPromise = Action.getRegionDetails(login_id);
                marketDataPromise
                    .then((result) => {
                        setPartnerMarket(result.data.data.market);
                    })
                    .catch((err) => {});
            }
        } else if (field === 'unloadingpoint') {
            if (!unloading_point) return;
            unloading_point.forEach((item) => {
                if (item.partner_code === selectedOption) {
                    selectedObj = item;
                    const index = list.findIndex((a) => a.partner_role === 'Y1');
                    if (index > -1) list.splice(index, 1);
                    let flag = false;
                    list.map((element) => {
                        if (element.partner_role === 'Y1') {
                            flag = true;
                            element.partner_number = item.partner_code;
                            element.partner_name = item.partner_name;
                        }
                        return element;
                    });
                    if (!flag) {
                        list.push({
                            partner_role: 'Y1',
                            partner_number: item.partner_code,
                            partner_name: item.partner_name,
                        });
                    }
                    setUnloadingPartnerData(item);
                }
            });
        }

        // Deduplicate the partners list
        const finalList = list.filter((item, index, self) => index === self.findIndex((t) => t.partner_role === item.partner_role));

        setPartnersList(() => {
            distributorUpdateCreateOrderFormField({
                field: 'partners',
                value: finalList,
            });
            return finalList;
        });

        distributorUpdateCreateOrderFormField({
            field,
            value: selectedObj.partner_code,
        });
        document.getElementById('vldbtn').disabled = false;
        if (document.getElementById('sbtbtn')) document.getElementById('sbtbtn').disabled = true;
    };

    /** Function to open dialog box when no unloading point is selected */
    const handleConfirmationBox = () => {
        // Get the modal
        setIsConfirmationBoxOpen(true);
        let modal = document.getElementById('myModal');
        modal.style.display = 'block';
    };

    const handleShipToValue = () => {
        //if there is only 1 unloading point, it will be automatically selected even if user do not select it.
        //changes as per mail dated 09-05-2022
        if (Object.keys(unloadingPartnerData).length < 0) {
            if ((warehouses && warehouses.unloading_point && warehouses.unloading_point.length) < 0) {
                const partners = partnersList;
                const item = warehouses.unloading_point[0];
                let selectedObj = item;
                const index = partners.findIndex((a) => a.partner_role === 'Y1');
                if (index > -1) partners.splice(index, 1);
                let flag = false;
                partners.map((element) => {
                    if (element.partner_role === 'Y1') {
                        flag = true;
                        element.partner_number = item.partner_code;
                        element.partner_name = item.partner_name;
                    }
                    return element;
                });
                if (!flag) {
                    partners.push({
                        partner_role: 'Y1',
                        partner_number: item.partner_code,
                        partner_name: item.partner_name,
                    });
                }
                setPartnersList(partners);
                setUnloadingPartnerData(item);
                distributorUpdateCreateOrderFormField({
                    field: 'partners',
                    value: partners,
                });
                distributorUpdateCreateOrderFormField({
                    field: 'unloadingpoint',
                    value: item.partner_code,
                });
                // distributorUpdateCreateOrderFormField({ field: 'sales_org', value: selectedObj.sales_org });
                // distributorUpdateCreateOrderFormField({ field: 'distribution_channel', value: selectedObj.dist_channel });
                // distributorUpdateCreateOrderFormField({ field: 'division', value: selectedObj.division });
                document.getElementById('vldbtn').disabled = false;
                if (document.getElementById('sbtbtn')) document.getElementById('sbtbtn').disabled = true;
            }
        }
    };

    const handleDialogClose = () => {
        let modal = document.getElementById('myModal');
        modal.style.display = 'none';
    };

    let handleOrderTypeInputChange = (e) => {
        setSubmitErrors({});
        isOrderReady.current = false;
        document.getElementById('vldbtn').disabled = false;
        if (document.getElementById('sbtbtn')) {
            document.getElementById('sbtbtn').disabled = true;
        }
        newDivisionArr();
        const selectedOption = e.target.value;
        let filteredSalesDetails = [];
        setOrderTypeValue(selectedOption);
        if (selectedOption === 'Liquidation') {
            fetchWarehouseDetails(selectedOption);

            let plantCode = '';
            let uniquePlantCodeArr = [];
            let ssoDetails;
            if (sso_user_details && sso_user_details.data) {
                ssoDetails = { ...sso_user_details.data[0] };
            }
            if (distributor_sales_details && distributor_sales_details.length > 0) {
                distributor_sales_details.forEach((plant) => {
                    // if (plantCode == "") plantCode = plantCode + plant.plant_name
                    // else plantCode = plantCode + "," + plant.plant_name
                    let isPresent = uniquePlantCodeArr.filter((item) => item == plant.plant_name);
                    if (isPresent.length == 0) {
                        uniquePlantCodeArr.push(plant.plant_name);
                    }
                });
                plantCode = uniquePlantCodeArr.join(',');
                if (!(liqCounter > 0)) {
                    getExcludedMaterials({ distributor_code: login_id }, ssoDetails ? ssoDetails : undefined);
                    getLIQMaterials(plantCode, region_details?.is_nourishco === true ? 90 : 10, ssoDetails ? ssoDetails : undefined);
                }
            }
            setLiqCounter(liqCounter + 1);
            // if ((warehouses && warehouses.unloading_point && warehouses.unloading_point.length) > 0) {
            //     const partners = partnersList;
            //     const item = warehouses.unloading_point[0];
            //     let selectedObj = item;
            //     const index = partners.findIndex(a => a.partner_role === 'Y1');
            //     if (index > -1) partners.splice(index, 1);
            //     let flag = false;
            //     partners.map(element => {
            //         if (element.partner_role === 'Y1') {
            //             flag = true;
            //             element.partner_number = item.partner_code;
            //             element.partner_name = item.partner_name;
            //         }
            //         return element;
            //     });
            //     if (!flag) {
            //         partners.push({ partner_role: "Y1", partner_number: item.partner_code, partner_name: item.partner_name });
            //     }
            // }
        } else if (selectedOption === 'SelfLifting') {
            fetchWarehouseDetails(selectedOption);

            distributor_sales_details.forEach((item) => {
                if (item.distribution_channel == 40) {
                    filteredSalesDetails.push(item);
                }
            });
        } else if (selectedOption === 'AutoOrder') {
            fetchWarehouseDetails(selectedOption);
        } else {
            if(!rushOrderARSWindowErrorMessage) fetchWarehouseDetails(selectedOption);
            // if ((warehouses && warehouses.unloading_point && warehouses.unloading_point.length) > 0) {
            //     const partners = partnersList;
            //     const item = warehouses.unloading_point[0];
            //     let selectedObj = item;
            //     const index = partners.findIndex(a => a.partner_role === 'Y1');
            //     if (index > -1) partners.splice(index, 1);
            //     let flag = false;
            //     partners.map(element => {
            //         if (element.partner_role === 'Y1') {
            //             flag = true;
            //             element.partner_number = item.partner_code;
            //             element.partner_name = item.partner_name;
            //         }
            //         return element;
            //     });
            //     if (!flag) {
            //         partners.push({ partner_role: "Y1", partner_number: item.partner_code, partner_name: item.partner_name });
            //     }
            // }
        }
        changeOrderFlags(selectedOption, filteredSalesDetails);
        setShipPartnerData({});
        setUnloadingPartnerData({});
        setTableItems(initialTableItems);
    };

    useEffect(() => {
        if (document.getElementById('sbtbtn')) document.getElementById('sbtbtn').disabled = !validationFlag;
        document.getElementById('vldbtn').disabled = validationFlag;
        props.distributorResetCreateOrderFormFields();
        props.distributorResetCreateOrderFormFieldsForLiqToggle();
        if (!isNourishCo.current && !arsConfigurations?.length) getArsConfigurations();
        return () => {
            // if (authorizePdpRestrictionRef.current && !allowedToOrderRef.current) {
            //     props.distributorResetCreateOrderCompleteFormFields();
            // } else {
            //     props.distributorResetCreateOrderFormFields();
            // }
            // props.distributorResetCreateOrderCompleteFormFields();
            props.distributorResetCreateOrderFormFields();
        };
    }, []);

    useEffect(() => {
        if (warehouses && warehouses.unloading_point && warehouses.unloading_point.length > 1) {
            setSelectPlaceholder('Select One');
        } else {
            setSelectPlaceholder('Default Unloading Point');
        }

        // if (warehouses && warehouses.unloading_point && warehouses.unloading_point.length > 0) {
        //     const partners = partnersList;
        //     const item = warehouses.unloading_point[0];
        //     let selectedObj = item;
        //     const index = partners.findIndex(a => a.partner_role === 'Y1');
        //     if (index > -1) partners.splice(index, 1);
        //     let flag = false;
        //     partners.map(element => {
        //         if (element.partner_role === 'Y1') {
        //             flag = true;
        //             element.partner_number = item.partner_code;
        //             element.partner_name = item.partner_name;
        //         }
        //         return element;
        //     });
        //     if (!flag) {
        //         partners.push({ partner_role: "Y1", partner_number: item.partner_code, partner_name: item.partner_name });
        //     }
        distributorUpdateCreateOrderFormField({
            field: 'sales_org',
            value: '1010',
        });
        distributorUpdateCreateOrderFormField({
            field: 'distribution_channel',
            value: isNourishCo.current ? '90' : '10',
        });
        distributorUpdateCreateOrderFormField({
            field: 'division',
            value: isNourishCo.current ? '12' : '10',
        });
        // }
    }, [warehouses]);

    function onToggleChange() {
        setToggleText(!toggleText);
    }

    useEffect(() => {
        if (app_level_configuration && app_level_configuration.length) {
            for (let config of app_level_configuration) {
                if (!config) continue;
                if (config.key === appConfig.search_switch.key && config.value === appConfig.search_switch.enable_value) {
                    setAuthorizeToggleBasedSearch(true);
                }
                if (config.key === appConfig.default_search.key) {
                    setToggleText(config.value === appConfig.default_search.universal_value);
                }
                if (config.key === appConfig.pdp_restriction.key) {
                    setAuthorizePdpRestriction(config.value === appConfig.pdp_restriction.enable_value);
                }
                // if (config.key === appConfig.pdp_weekly_order_window.key) {
                //     setPdpWeeklyOrderWindow(config.value);
                // }
                // if (config.key === appConfig.pdp_fortnightly_order_window.key) {
                //     setPdpFortnightlyOrderWindow(config.value);
                // }
                // if (config.key === appConfig.pdp_order_placement_time.key) {
                //     setPdpOrderPlacementTime(config.value);
                // }
                // if (config.key === appConfig.pdp_weekly_off.key) {
                //     setPdpWeeklyOff(config.value);
                // }
                if (config.key === appConfig.partner_mismatch_error_recipients.key) {
                    setPartnerMismatchErrorRecipients(config.value);
                }
                if (config.key === appConfig.liquidation.key) {
                    setAllowLiquidation(config.value == 'YES' ? true : false);
                }
                if (config.key === appConfig.self_lifting.key) {
                    setAllowSelfLifting(config.value == 'YES' ? true : false);
                }
                if (config.key === 'MOQ_TOLERANCE') {
                    setMoqTolerance(Math.abs(+config.value).toFixed(2));
                }
                if (config.key === 'MOQ_ENABLE') {
                    setMoqEnable(config.value.toLowerCase() === 'true');
                }
                if (config.key === appConfig.enable_order_approval_rush_order.key) {
                    setEnableOrderApprovalRushOrder(config.value === appConfig.enable_order_approval_rush_order.enable_value);
                }
                if (config.key === appConfig.enable_promise_credit.key) {
                    setEnablePromiseCredit(config.value === appConfig.enable_promise_credit.enable_value);
                }
                if (config.key === appConfig.enable_rush_order_requests.key) {
                    setIsRushOrderEnabled(config.value === appConfig.enable_rush_order_requests.enable_value);
                }
                if (config.key === appConfig.enable_bulk_order.key) {
                    setIsBulkOrderEnabled(config.value === appConfig.enable_bulk_order.enable_value);
                }
                if (config.key === appConfig.ro_approvers.key) {
                    roFirstApprover.current = config.value.split(',')[0];
                }
            }
        }
    }, [app_level_configuration]);

    useEffect(() => {
        pdp_windows?.forEach((window) => {
            const config = window.pdp_type === 'WE' ? appConfig.pdp_weekly : appConfig.pdp_fortnightly;
            if (+window.threshold_frequency === -1) {
                for (let day of Object.keys(config)) {
                    Object.assign(config[day], {
                        orderWindow: window[config[day].key1],
                        orderPlacementEndTime: window[config[day].key2],
                    });
                }
            } else {
                Object.assign(config, {
                    THRESHOLD_FREQUENCY: +window.threshold_frequency,
                });
                for (let day of Object.keys(config)) {
                    Object.assign(config[day], {
                        orderWindowException: window[config[day].key1],
                        orderPlacementEndTimeException: window[config[day].key2],
                    });
                }
            }
        });
    }, [pdp_windows]);

    useEffect(() => {
        // if (!props.region_details || !Object.keys(props.region_details).length) {
        if (role) {
            if (props.location.state) {
                getRegionDetails(props.location.state && props.location.state.distributorId);
            }
        } else getRegionDetails();
        // }
    }, [role, props.location.state]);

    useEffect(() => {
        let customerGroup = CUSTOMER_GROUPS_FOR_ARS;
        let cg = props?.region_details?.customer_group_code;
        if (isAutoOrder && customerGroup.includes(cg)) {
            getArsTolerance(props?.region_details?.customer_group_code, props?.region_details?.area_code)
                .then((response) => {
                    setTolerance(response?.data?.data);
                })
                .catch((error) => {
                    notificationSender('Technical Error', error, false);
                });
        }
    }, [props.region_details, isAutoOrder]);

    useEffect(() => {
        region_details.group5_id && getPDPWindows(region_details.group5_id);

        return () => {
            pdpWindows([]);
        };
    }, [props.region_details?.group5_id]);

    const onClickBackButton = () => {
        if (props.location.state.distributorId) {
            browserHistory.push({
                pathname: '/admin/distributor',
                state: {
                    distributorId: props.location.state && props.location.state.distributorId,
                },
            });
        } else {
            browserHistory.push('/distributor/dashboard');
        }
    };

    // const onLiquidationChange = (checked) => {
    //     let plantCode = "";
    //     let ssoDetails;
    //     if (sso_user_details && sso_user_details.data) {
    //         ssoDetails = { ...sso_user_details.data[0] };
    //     }
    //     setIsLiquidationOrder(checked);
    //     if (plants && plants.length > 0) {
    //         plants.forEach((plant) => {
    //             if (plantCode == "") plantCode = plantCode + plant.name
    //             else plantCode = plantCode + "," + plant.name
    //         })
    //         if (!(liqCounter > 0)) {
    //             getLIQMaterials(plantCode, ssoDetails ? ssoDetails : undefined);
    //         }
    //     }
    //     setLiqCounter(liqCounter + 1);
    // };

    useEffect(() => {
        if (liq_materials && liq_materials.data) {
            let liq_data = liq_materials.data
                .map((data) => {
                    let temp = {
                        BaseUom: data.BaseUom,
                        BatchNo: data.BatchNo,
                        code: data.MaterialCode,
                        description: data.MaterialDesc,
                        pak_type: data.PackType,
                        PlantCode: data.PlantCode,
                        sales_unit: data.SalesUom,
                        Sled: data.Sled,
                        StockQuantity: data.StockQuantity,
                        StorageLocation: data.StorageLocation,
                        UomQuantity: data.UomQuantity,
                        sales_org: parseInt(data.Sales_Org),
                        distribution_channel: parseInt(data.Distribution_Channel),
                        division: parseInt(data.Division),
                    };
                    return temp;
                })
                .filter((i) => !rule_config_excluded_materials?.data.includes(i.code));
            setLiqMaterialsList(liq_data);
        }
    }, [liq_materials]);

    // useEffect(() => {
    //     if (props?.location?.state?.data) {
    //         let draftItems = [];
    //         props?.location?.state?.data.map((item) => {
    //             draftItems.push({ materials: [], code: item.MATERIAL, quantity: "", description: item.DESCRIPTION, sales_unit: item.SALES_UNIT, pak_code: "", pak_type: item.PACK_TYPE, buom: "", tentative: "", disabled: "", selectedValue: item.DESCRIPTION, item_number: item.ITM_NUMBER, error: "", class: "", Plant: "", PDP_Day: "", Reference_date: "", ton: "" })
    //         })
    //         setTableItems(draftItems);
    //         setIsDraftOrder(true);
    //     }

    // }, [props.location.state])

    useEffect(() => {
        if (props?.location?.state?.data) {
            let draftItems = [];
            props?.location?.state?.data.map((item) => {
                let itemType = '';
                materials?.forEach((element) => {
                    if (
                        region_details &&
                        region_details.area_code &&
                        region_details.channel_code &&
                        element.appl_area_channel &&
                        element.appl_area_channel.some((obj) => obj.area === region_details.area_code && obj.channel === region_details.channel_code)
                    ) {
                        itemType = 'dist_specific';
                    } else {
                        itemType = 'universal';
                    }
                });
                draftItems.push({
                    materials: [],
                    code: item.MATERIAL,
                    quantity: item.REQ_QTY,
                    description: item.DESCRIPTION,
                    sales_unit: item.SALES_UNIT,
                    pak_code: '',
                    pak_type: item.PACK_TYPE,
                    buom: '',
                    tentative: '',
                    disabled: '',
                    selectedValue: item.DESCRIPTION,
                    item_number: item.ITM_NUMBER,
                    error: '',
                    class: '',
                    Plant: '',
                    PDP_Day: '',
                    Reference_date: '',
                    ton: '',
                    item_type: itemType,
                });
            });
            setTableItems(draftItems);
            setOrderList(draftItems);
            setIsDraftOrder(true);
        }
        if (props?.location?.state?.po_number) {
            distributorUpdateCreateOrderFormField({
                field: 'po_number',
                value: props?.location?.state?.po_number,
            });
            distributorUpdateCreateOrderFormField({
                field: 'po_date',
                value: '',
            });
            distributorUpdateCreateOrderFormField({
                field: 'req_date',
                value: '',
            });
        }
    }, [props.location.state]);

    useEffect(() => {
        if (props?.location?.state?.partners && Object.keys(warehouses).length > 0) {
            props?.location?.state?.partners.map((partner) => {
                if (partner.PARTN_ROLE === 'WE') {
                    handleInputChange(partner.PARTN_NUMB, 'shipto');
                } else if (partner.PARTN_ROLE === 'Y1') {
                    handleInputChange(partner.PARTN_NUMB, 'unloadingpoint');
                }
            });
        }
    }, [props.location.state, warehouses]);

    // useEffect(() => {
    //     const { allowedToOrder, orderStartDate, orderEndDate, orderStartTime, orderEndTime, errorMessage } = Util.checkPDPDay(pdp_day, reference_date, pdpWeeklyOrderWindow, pdpFortnightlyOrderWindow, pdpOrderPlacementTime, pdpWeeklyOff);
    //     setAllowedToOrder(allowedToOrder);
    //     if (orderStartDate && orderEndDate) setPdpMessage(`${errorMessage ? errorMessage + ' ' : ''} You can place purchase orders between ${moment(orderStartDate).format('dddd, MMMM DD YYYY')} ${orderStartTime} to ${moment(orderEndDate).format('dddd, MMMM DD YYYY')} ${orderEndTime}.`);
    // }, [pdp_day, pdpWeeklyOff]);

    // useEffect(() => {
    //     allowedToOrderRef.current = allowedToOrder;
    // }, [allowedToOrder]);

    // useEffect(() => {
    //     authorizePdpRestrictionRef.current = authorizePdpRestriction;
    // }, [authorizePdpRestriction]);

    useEffect(() => {
        if (serviceLevelCategory && serviceLevelCategory.length) {
        } else {
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

    const roReasonOnCancel = (e) => {
        setIsRoReasonModalVisible(false);
    };

    const roReasonOnSubmit = (data) => {
        setIsRoReasonModalVisible(false);
        sendOrderRequest(poNum.current, data);
    };
    let importantInfoContent =
        !isSelfLiftingOrder && !isBulkOrder
            ? `[*The Ship-to & unloading point displayed are basis active PDP/Divisions. 
    Currently Active Divisions are -${activePDP}]`
            : !isBulkOrder &&
              `[*The Ship-to & unloading point displayed are basis  active PDP/Divisions.
    All divisions are active]`;

    const renderMaterialTable = () => (
        <MaterialTable
            tableItems={tableItems}
            onOrderChange={setTotalAmount}
            universalProductType={toggleText}
            onListChange={(list) => setOrderList(list)}
            distributorId={login_id}
            isLiquidationOrder={isLiquidationOrder}
            liqMaterialsList={liqMaterialsList}
            liqCounter={liqCounter}
            isSelfLiftingOrder={isSelfLiftingOrder}
            isSaltOnlyOrder={isSaltOnlyOrder}
            onDifferenceChange={setCreditDifference}
            isRushOrder={isRushOrder}
            rushOrderErrorMessage={rushOrderARSWindowErrorMessage}
            submitErrors={submitErrors}
        />
    );

    const renderAutoOrderMaterialTable = (isRegular) => (
        <AutoOrderMaterialTable
            tableItems={tableItems}
            originalRecommendation={originalRecommendation.current}
            onOrderChange={setTotalAmount}
            onListChange={(list) => setOrderList(list)}
            distributorId={login_id}
            tolerance={tolerance}
            validateCounter={validateSuccessCounter}
            moqArr={moqArr}
            onDifferenceChange={setCreditDifference}
            isOrderReady={isOrderReady.current}
            isRegular={isRegular}
            submitErrors={submitErrors}
            orderType={orderTypeValue}
        />
    );

    const handleErrorModal = (context) => {
        setErrorModalContext(context);
        setIsErrorConfirmationBoxOpen(true);
    };

    const handleCloseErrorModal = () => {
        setIsErrorConfirmationBoxOpen(false);
    };

    const renderBulkOrderMaterialTable = () => (
        <BulkOrderMaterialTable
            tableItems={tableItems}
            onOrderChange={setTotalAmount}
            universalProductType={toggleText}
            onListChange={(list) => setOrderList(list)}
            distributorId={login_id}
            isLiquidationOrder={isLiquidationOrder}
            liqMaterialsList={liqMaterialsList}
            liqCounter={liqCounter}
            isSelfLiftingOrder={isSelfLiftingOrder}
            isSaltOnlyOrder={true}
            onDifferenceChange={setCreditDifference}
            isRushOrder={isRushOrder}
            isBulkOrder={isBulkOrder}
            distributor_sales_details={distributor_sales_details}
            notificationSender={notificationSender}
            totalQuantityTonnage={totalQuantityTonnage}
            bulkMOQ={bulkMOQ}
            validateBulk={validateBulk}
            setValidateBulk={setValidateBulk}
            submitErrors={submitErrors}
        />
    );

    return (
        <>
            {/* <Spin spinning={isOrderPageLoading} tip={orderPageLoadingMessage} size="large"> */}
                <CustomErrorModal isOpen={isErrorConfirmationBoxOpen} onClose={handleCloseErrorModal} context={errorModalContext} distributorId={login_id} />
                <div id="myModal" className="modal">
                    <div className="modal-content">
                        <span className="close" onClick={handleDialogClose}>
                            &times;
                        </span>
                        <div className="confirmation-text">Confirmation</div>
                        <div className="confirmation-message-text">
                            Order type - {getOrderType()}
                            <br></br>
                            {(warehouses && warehouses.unloading_point && warehouses.unloading_point.length) > 0
                                ? Object.keys(unloadingPartnerData).length === 0
                                    ? `Unloading point is not selected for the shipping point ${shipPartnerData.partner_name}(${shipPartnerData.partner_code}).`
                                    : `Unloading point is selected as ${unloadingPartnerData.partner_name}(${unloadingPartnerData.partner_code}) for the shipping point ${shipPartnerData.partner_name}(${shipPartnerData.partner_code}).Do you want to Proceed ?`
                                : `Unloading point is not available for the Shipping point ${shipPartnerData.partner_name}(${shipPartnerData.partner_code}). Default unloading point present in the records will be used.`}
                        </div>
                        <div className="button-container">
                            <button className="confirmation-button" onClick={handleDialogClose}>
                                Cancel
                            </button>
                            <button
                                className="confirmation-button proceed-btn"
                                onClick={(e) => {
                                    handleShipToValue();
                                    if (
                                        orderTypeValue === 'Regular' ||
                                        orderTypeValue === 'RushOrder' ||
                                        orderTypeValue === 'BulkOrder' ||
                                        orderTypeValue === 'SelfLifting' ||
                                        orderTypeValue === 'Liquidation' ||
                                        orderTypeValue === 'AutoOrder'
                                    )
                                        handleValidate2(e);
                                    else handleValidate(e);
                                    handleDialogClose();
                                }}>
                                Proceed
                            </button>
                        </div>
                    </div>
                </div>

                {isOrderPageLoading && (
                    <div
                        style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        zIndex: 9999, 
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        }}
                    >
                        <Spin
                        spinning={isOrderPageLoading}
                        tip={
                            <div
                            style={{
                                textAlign: 'center',
                                color: '#1268b3',
                                fontSize: '18px',
                                fontWeight: '600',
                            }}
                            >
                            <p>
                                {orderPageLoadingMessage.split('.').map((sentence, index) => (
                                <span key={index}>
                                    {sentence.trim()}
                                    {sentence.trim() && <br />}
                                </span>
                                ))}
                            </p>
                            </div>
                        }
                        size="large"
                        />
                    </div>
                )}
                <section className="main-content create-order-page">
                    <div className="new-so-head d-align-center" style={{ marginBottom: '2px' }}>
                        <div className="heading-so">
                            <span className="xs-ttl">
                                New Purchase Order Request
                                {role && (
                                    <span>
                                        {' '}
                                        for
                                        <b>
                                            {' '}
                                            {props.location.state && props.location.state.distributorName}({props.location.state && props.location.state.distributorId})
                                        </b>
                                    </span>
                                )}
                            </span>

                            <div className="xs-bk">
                                <ServerTimer />
                            </div>
                            {role && (
                                <div className="xs-bk">
                                    <a onClick={onClickBackButton}>Back to Distributor Dashboard</a>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="sales-order-block">
                        {/* {role && <div style={{ marginBottom: '6px' }}><span>Raising order for <b>{props.location.state && props.location.state.distributorName} ({props.location.state && props.location.state.distributorId})</b></span></div>} */}
                        <div className="new-so-head">
                            <div className="new-so-col-2" style={{ width: '40%' }}>
                                <div className="order-type-label" htmlFor="">
                                    Order Type
                                </div>
                                {isNourishCo.current ? (
                                    <Radio.Group value={orderTypeValue} style={{ width: '100%' }} onChange={(event) => handleOrderTypeInputChange(event)}>
                                        <div className="order-type-btn-parent">
                                            <div className="order-type-btn-col">
                                                {hasFeaturePermission(pages.ORDER, features.REGULAR_ORDER) && (
                                                    <Radio
                                                        style={{ fontSize: '12px' }}
                                                        value={'Regular'}
                                                        disabled={
                                                            !hasFeaturePermission(pages.ORDER, features.CCO_SPECIAL_ORDER) &&
                                                            !region_details?.reg_enable &&
                                                            allowAutoOrder &&
                                                            region_details?.ao_enable
                                                        }>
                                                        Regular
                                                    </Radio>
                                                )}
                                                {isReorder === false &&
                                                    region_details?.liquidation &&
                                                    allowLiquidation &&
                                                    !isDraftOrder &&
                                                    hasFeaturePermission(pages.ORDER, features.LIQUIDATION) && (
                                                        <Radio style={{ fontSize: '12px' }} value={'Liquidation'}>
                                                            Liquidation
                                                        </Radio>
                                                    )}
                                            </div>
                                            <div className="order-type-btn-col">
                                                {!isNourishCo.current && !isReorder && hasFeaturePermission(pages.ORDER, features.AUTO_ORDER) && (
                                                    <Radio style={{ fontSize: '12px' }} value={'AutoOrder'} disabled={!region_details?.ao_enable || !allowAutoOrder}>
                                                        Auto Order
                                                    </Radio>
                                                )}
                                                {!isNourishCo.current &&
                                                    isReorder === false &&
                                                    allowSelfLifting &&
                                                    isSelfLiftingOrderEnabledForDistributor &&
                                                    hasFeaturePermission(pages.ORDER, features.SELF_LIFTING) && (
                                                        <Radio
                                                            style={{
                                                                fontSize: '12px',
                                                                whiteSpace: 'normal',
                                                            }}
                                                            value={'SelfLifting'}>
                                                            Self Lifting & Direct Dispatch
                                                        </Radio>
                                                    )}
                                            </div>

                                            <div className="order-type-btn-col">
                                                {/* Rush order will be hidden when any of the flag is OFF. It will be disabled when all divisions are within PDP window */}
                                                {!isNourishCo.current &&
                                                    isRushOrderEnabled &&
                                                    region_details?.ro_enable &&
                                                    isReorder === false &&
                                                    hasFeaturePermission(pages.ORDER, features.RUSH_ORDER) && (
                                                        <Radio style={{ fontSize: '12px' }} value="RushOrder" disabled={!upcomingPDP?.length}>
                                                            Rush Order
                                                        </Radio>
                                                    )}
                                                {!isNourishCo.current &&
                                                    isBulkOrderEnabled &&
                                                    region_details?.bo_enable &&
                                                    hasFeaturePermission(pages.ORDER, features.BULK_ORDER) &&
                                                    isReorder === false && (
                                                        <Radio style={{ fontSize: '12px' }} value={'BulkOrder'} disabled={!isDivision14}>
                                                            Bulk Order
                                                        </Radio>
                                                    )}
                                            </div>
                                        </div>
                                    </Radio.Group>
                                ) : (
                                    <Radio.Group value={orderTypeValue} onChange={(event) => handleOrderTypeInputChange(event)}>
                                        <div className="order-type-btn-parent">
                                            <div className="order-type-btn-col">
                                                {!isNourishCo.current && !isReorder && hasFeaturePermission(pages.ORDER, features.AUTO_ORDER) && (
                                                    <Radio style={{ fontSize: '12px' }} value={'AutoOrder'} disabled={!region_details?.ao_enable || !allowAutoOrder}>
                                                        Auto Order
                                                    </Radio>
                                                )}
                                                {!isNourishCo.current &&
                                                    isBulkOrderEnabled &&
                                                    region_details?.bo_enable &&
                                                    hasFeaturePermission(pages.ORDER, features.BULK_ORDER) &&
                                                    isReorder === false && (
                                                        <Radio style={{ fontSize: '12px' }} value={'BulkOrder'} disabled={!isDivision14}>
                                                            Bulk Order
                                                        </Radio>
                                                    )}
                                            </div>
                                            <div className="order-type-btn-col">
                                                {hasFeaturePermission(pages.ORDER, features.REGULAR_ORDER) && (
                                                    <Radio
                                                        style={{ fontSize: '12px' }}
                                                        value={'Regular'}
                                                        disabled={
                                                            !hasFeaturePermission(pages.ORDER, features.CCO_SPECIAL_ORDER) &&
                                                            !region_details?.reg_enable &&
                                                            allowAutoOrder &&
                                                            region_details?.ao_enable
                                                        }>
                                                        Regular
                                                    </Radio>
                                                )}
                                                {isReorder === false &&
                                                    region_details?.liquidation &&
                                                    allowLiquidation &&
                                                    !isDraftOrder &&
                                                    hasFeaturePermission(pages.ORDER, features.LIQUIDATION) && (
                                                        <Radio style={{ fontSize: '12px' }} value={'Liquidation'}>
                                                            Liquidation
                                                        </Radio>
                                                    )}
                                            </div>
                                            <div className="order-type-btn-col">
                                                {/* Rush order will be hidden when any of the flag is OFF. It will be disabled when all divisions are within PDP window */}
                                                {!isNourishCo.current &&
                                                    isRushOrderEnabled &&
                                                    region_details?.ro_enable &&
                                                    isReorder === false &&
                                                    hasFeaturePermission(pages.ORDER, features.RUSH_ORDER) && (
                                                        <Radio style={{ fontSize: '12px' }} value="RushOrder" disabled={!upcomingPDP?.length}>
                                                            Rush Order
                                                        </Radio>
                                                    )}
                                                {!isNourishCo.current &&
                                                    isReorder === false &&
                                                    allowSelfLifting &&
                                                    isSelfLiftingOrderEnabledForDistributor &&
                                                    hasFeaturePermission(pages.ORDER, features.SELF_LIFTING) && (
                                                        <Radio
                                                            style={{
                                                                fontSize: '12px',
                                                                whiteSpace: 'normal',
                                                            }}
                                                            value={'SelfLifting'}>
                                                            Self Lifting & Direct Dispatch
                                                        </Radio>
                                                    )}
                                            </div>
                                        </div>
                                    </Radio.Group>
                                )}
                            </div>
                            <div className="new-so-col-2" style={{ width: '60%' }}>
                                <div className="shipto-unloading-points-parent">
                                    <div className="shipto-unloading-points-row">
                                        <label style={{ fontSize: '12px', marginRight: '3px' }} htmlFor="">
                                            Ship To
                                        </label>{' '}
                                        <Tooltip title={importantInfoContent} overlayClassName="important-notification2 ship-to-info-tooltip">
                                            <InfoCircleOutlined style={{ fontSize: '14px', color: '#1890ff' }} />
                                        </Tooltip>
                                        <div className="select-box">
                                            <Select
                                                autoFocus={true}
                                                showSearch
                                                placeholder="Select..."
                                                disabled = {rushOrderARSWindowErrorMessage !== ''}
                                                value={Object.keys(shipPartnerData).length ? `${shipPartnerData.partner_name} (${shipPartnerData.partner_code})` : null}
                                                dropdownClassName="shipto-select"
                                                aria-label="shipping point"
                                                optionFilterProp="children"
                                                filterOption={(input, option) => {
                                                    return option?.children.props.children?.toLowerCase().includes(input.toLowerCase());
                                                }}
                                                onChange={(selectedOption) => {
                                                    handleInputChange(selectedOption, 'shipto');
                                                }}>
                                                {warehouses &&
                                                    warehouses.shipping_point &&
                                                    warehouses.shipping_point.length > 0 &&
                                                    warehouses.shipping_point.map((item) => {
                                                        return (
                                                            <Option value={item.partner_code} key={item.partner_code}>
                                                                <p className="option-val option-ship-to-val">{`${item.partner_name} (${item.partner_code})`}</p>
                                                            </Option>
                                                        );
                                                    })}
                                            </Select>

                                            <ul className="mb-0">
                                                {/* <li>
                                                <span>Ship to customer code</span>
                                                <em>{(shipPartnerData && "partner_code" in shipPartnerData) ? shipPartnerData.partner_code : '-'}</em>
                                            </li> */}
                                                <li>
                                                    <span>Market</span> <em>{partnerMarket}</em>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div className="shipto-unloading-points-row">
                                        <label style={{ fontSize: '12px' }} htmlFor="">
                                            Unloading Point
                                        </label>
                                        <div className="select-box">
                                            <Select
                                                showSearch
                                                placeholder={selectPlaceholder}
                                                disabled = {rushOrderARSWindowErrorMessage !== ''}
                                                value={
                                                    Object.keys(unloadingPartnerData).length
                                                        ? `${unloadingPartnerData.partner_name} (${unloadingPartnerData.partner_code})`
                                                        : undefined
                                                }
                                                dropdownClassName="unloading-select"
                                                aria-label="Unloading point"
                                                optionFilterProp="children"
                                                filterOption={(input, option) => option?.children.props.children?.toLowerCase().includes(input.toLowerCase())}
                                                onChange={(selectedOption) => {
                                                    handleInputChange(selectedOption, 'unloadingpoint');
                                                }}>
                                                {warehouses &&
                                                    warehouses.unloading_point &&
                                                    warehouses.unloading_point.length > 0 &&
                                                    warehouses.unloading_point.map((item) => {
                                                        return (
                                                            <Option value={item.partner_code} key={item.partner_code}>
                                                                <p className="option-val option-unloading-val">{`${item.partner_name} (${item.partner_code})`}</p>
                                                            </Option>
                                                        );
                                                    })}
                                            </Select>

                                            {/* <ul className="mb-0">
                                            <li>
                                                <span>Unloading Point code</span>
                                                <em>{(unloadingPartnerData && "partner_code" in unloadingPartnerData) ? unloadingPartnerData.partner_code : '-'}</em>
                                            </li>
                                        </ul> */}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* <span  className='important-notification2'>{!isSelfLiftingOrder?`[*The Ship-to & unloading point displayed here are basis  active PDP/Divisions. Currently Active Divisions are -${activePDP}]`:`[The Ship-to & unloading point displayed here are basis  active PDP/Divisions. All divisions are active]`}</span> */}
                    </div>

                    {/* {authorizePdpRestriction && (
                        <div className="order-by-admin">
                            <span>
                                <b>
                                    {pdpMessage ? (
                                        <>
                                            <InfoCircleOutlined />{' '}
                                            <span>
                                                <u>Note</u>: {pdpMessage}
                                            </span>
                                        </>
                                    ) : (
                                        ''
                                    )}
                                </b>
                            </span>{' '}
                        </div>
                    )} */}
                    <div className={width > 767 ? 'sales-order-block new-sales-order-block' : 'mobile-card-wrapper'}>
                        <div id="toggle-switch" className="switch-container">
                            {authorizeToggleBasedSearch ? (
                                // {(serverConfig.app_environment === 'dev')
                                <UniversalSearchToggle toggleText={toggleText} profile={props.region_details} onChange={onToggleChange} />
                            ) : (
                                ''
                            )}
                            {/* <div className='purchase-order-toggle' hidden={!(region_details?.liquidation && allowLiquidation)} >
                        <div><h3>Liquidation</h3></div>
                        <Switch aria-label="Toggle" disabled={authorizePdpRestriction && !allowedToOrder} onChange={onLiquidationChange} />
                    </div> */}
                        </div>

                        {isReorder && renderMaterialTable()}
                        {!isReorder &&
                            tableItems &&
                            !isAutoOrder &&
                            !isBulkOrder &&
                            ((isSaltOnlyOrder || orderTypeValue !== 'Regular') && !hasFeaturePermission(pages.ORDER, features.CCO_SPECIAL_ORDER)
                                ? renderMaterialTable()
                                : renderAutoOrderMaterialTable(true))}
                        {isAutoOrder && renderAutoOrderMaterialTable(false)}
                        {isBulkOrder && renderBulkOrderMaterialTable()}

                        {isRushOrder && roReasons.length && (
                            <ROReasonModal visible={isRoReasonModalVisible} data={{ reasons: roReasons }} onCancel={roReasonOnCancel} onSubmit={roReasonOnSubmit} />
                        )}

                        <div className="new-order-footer">
                            <div className="footer-content-row">
                                <div className="order-value-text">
                                    TOTAL QUANTITY : <span className="amount">{totalQuantityTonnage > 0 ? totalQuantityTonnage.toFixed(2) + ' TONN' : '-'}</span>{' '}
                                </div>
                            </div>
                            <div className="footer-content-row">
                                <div className="order-value-text">
                                    TENTATIVE ORDER VALUE :{' '}
                                    {totalAmount > 0 ? (
                                        <span className="amount">
                                            <span>{RUPEE_SYMBOL}</span> {totalAmount}
                                        </span>
                                    ) : (
                                        <span className="amount">-</span>
                                    )}
                                </div>
                                <div className="minimum-order-value">{minimumOrderValueText}</div>
                            </div>

                            {enablePromiseCredit && !isRushOrder && (
                                <div className="footer-content-row">
                                    <div className="order-value-text">
                                        REQUIRED CREDIT :{' '}
                                        {creditDifference ? (
                                            <span className="amount">
                                                <span>{RUPEE_SYMBOL}</span> {creditDifference}
                                            </span>
                                        ) : (
                                            <span className="amount">-</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="order-btn-grp">
                                <button
                                style={{ marginLeft: '0' }}
                                type="submit"
                                className="border-btn"
                                id="vldbtn"
                                disabled= {rushOrderARSWindowErrorMessage !== ''}
                                onClick={(e) => {
                                    const isUnloadPointEmpty =
                                    (Object.keys(unloadingPartnerData).length === 0 ||
                                        unloadingPartnerData.partner_code === '') &&
                                    (warehouses &&
                                        warehouses.unloading_point &&
                                        warehouses.unloading_point.length) > 1;
                                    let hasItemError = null;
                                    if (!isAutoOrder)
                                    hasItemError = Util.checkItemList(
                                        orderItemList,
                                        '',
                                        '',
                                        '',
                                        'ADD_TABLE_ROW',
                                    );
                                    //if there is 0 or more unloading point, show confirmation modal.else validate order
                                    if (
                                    orderItemList?.length > 0 &&
                                    Object.keys(shipPartnerData).length > 0 &&
                                    !isUnloadPointEmpty &&
                                    warehouses &&
                                    warehouses.unloading_point &&
                                    warehouses.unloading_point.length >= 0 &&
                                    (!hasItemError ||
                                        (hasItemError && hasItemError.itmFlag))
                                    ) {
                                    handleConfirmationBox();
                                    } else {
                                    if(orderTypeValue === 'Regular' || orderTypeValue === 'RushOrder' || orderTypeValue === 'BulkOrder' || orderTypeValue === 'SelfLifting' || orderTypeValue === 'Liquidation' || orderTypeValue === 'AutoOrder') handleValidate2(e)
                                    else handleValidate(e);
                                    }
                                }}
                                >
                                Validate
                                </button>
                                <button
                                type="submit"
                                className="default-btn-submit"
                                id="sbtbtn"
                                hidden={
                                    isApprovalRequired ||
                                    !hasFeaturePermission( 
                                    pages.DASHBOARD,
                                    features.CREATE_ORDER,
                                    )
                                }
                                onClick={(e) => {
                                    if(orderTypeValue === 'Regular' || orderTypeValue === 'SelfLifting' || orderTypeValue === 'Liquidation') 
                                        handleSubmit2(e);
                                    else
                                        handleSubmit(e);
                                }}
                                    
                                >
                                Submit
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            {/* </Spin> */}
    </>
  );
};

const mapStateToProps = (state, ownProps) => {
    return {
        createOrderData: state.distributor.get('create_order'),
        warehouses: state.distributor.get('warehouses'),
        region_details: state.dashboard.get('region_details'),
        app_level_configuration: state.auth.get('app_level_configuration'),
        pdp_windows: state.auth.get('pdp_windows'),
        sso_user_details: state.admin.get('sso_user_details'),
        liq_materials: state.distributor.get('liq_materials'),
        forecast_materials: state.distributor.get('forecast_materials'),
        rule_config_excluded_materials: state.distributor.get('rule_config_excluded_materials'),
        credit_details: state.dashboard.get('credit_details'),
        correlation_id: state.admin.get('correlation_id'),
    };
};
const mapDispatchToProps = (dispatch, ownProps) => {
    return {
        getMaintenanceRequests: () => dispatch(Actions.getMaintenanceRequests()),
        distributorUpdateCreateOrderFormField: (data) => dispatch(Action.distributorUpdateCreateOrderFormField(data)),
        validateDistributorSalesOrder: (data, distributorId, liquidation, selflifting, autoOrder, rushOrder, isApprovalRequired) =>
            dispatch(Action.validateDistributorSalesOrder(data, distributorId, liquidation, selflifting, autoOrder, rushOrder, isApprovalRequired)),
        getWarehouseDetails: (login_id) => dispatch(Action.getWarehouseDetails(login_id)),
        getWarehouseDetailsOnDistChannel: (distributorId, distributionChannel, divisionArr) =>
            dispatch(Action.getWarehouseDetailsOnDistChannel(distributorId, distributionChannel, divisionArr)),
        getMaterialsCodes: () => dispatch(Action.getMaterialsCodes()),
        distributorValidateCreateOrderForm: (status) => dispatch(Action.distributorValidateCreateOrderForm(status)),
        createDistributorSalesOrder: (data, distributorId, liquidation, selflifting, autoOrder) =>
            dispatch(Action.createDistributorSalesOrder(data, distributorId, liquidation, selflifting, autoOrder)),
        distributorResetCreateOrderFormFields: () => dispatch(Action.distributorResetCreateOrderFormFields),
        logAppIssue: (data) => dispatch(ErrorAction.logAppIssue(data)),
        getRegionDetails: (id) => dispatch(DashboardAction.getRegionDetails(id)),
        fetchAppLevelConfiguration: () => dispatch(AuthAction.fetchAppLevelSettings()),
        distributorResetCreateOrderCompleteFormFields: () => dispatch(Action.distributorResetCreateOrderCompleteFormFields()),
        distributorResetCreateOrderFormFieldsForLiqToggle: () => dispatch(Action.distributorResetCreateOrderFormFieldsForLiqToggle()),
        fetchServiceLevelCategory: (type) => dispatch(Action.fetchServiceLevelCategory(type)),
        reportPortalError: (data, login_id) => dispatch(ErrorAction.reportPortalError(data, login_id)),
        getSSODetails: (emailId, history) => dispatch(AdminAction.getSSODetails(emailId, history)),
        getLIQMaterials: (plant, distChannel, ssoDetails) => dispatch(Action.getLIQMaterials(plant, distChannel, ssoDetails)),
        fetchForecastForDist: (params) => dispatch(Action.fetchForecastForDist(params)),
        fetchDistributorMoq: (data) => dispatch(Action.fetchDistributorMoq(data)),
        getArsTolerance: (customerGroup, areaCode) => dispatch(Actions.getArsTolerance(customerGroup, areaCode)),
        promiseCredit: (data) => dispatch(Actions.promiseCredit(data)),
        getExcludedMaterials: (data, ssoDetails) => dispatch(Action.getExcludedMaterials(data, ssoDetails)),
        getCreditLimitDetails: (login_id) => dispatch(DashboardAction.getCreditLimitDetails(login_id)),
        sentOrderRequest: (data) => dispatch(Action.sentOrderRequest(data)),
        getDistMoq: (data) => dispatch(AdminAction.getBODistMoq(data)),
        getPDPWindows: (regionId) => dispatch(AdminAction.getPDPWindow(regionId)),
        pdpWindows: (data) => dispatch(AdminAction.pdpWindows(data)),
        getRoReasons: () => dispatch(Action.getRoReasons()),
        fetchArsConfigurations: (type) => dispatch(Actions.fetchArsConfigurations(type)),
        setCorrelationId: (id) => dispatch(AdminAction.setCorrelationId(id)),
        validateOrder: (data) => dispatch(Action.validateOrder(data)),
        createOrder: (data) => dispatch(Action.createOrder(data)),
        checkARSWindowForRushOrder: (distributorId) => dispatch(Action.checkARSWindowForRushOrder(distributorId)),
    };
};

const ConnectCreateOrderPage = connect(mapStateToProps, mapDispatchToProps)(CreateOrderPage);

export default ConnectCreateOrderPage;
