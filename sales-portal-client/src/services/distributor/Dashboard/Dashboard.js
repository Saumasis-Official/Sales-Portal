import React, { useEffect, useReducer, useState, useRef, useMemo } from 'react';
import { connect } from 'react-redux';
import Auth from '../../../util/middleware/auth';
import jwt from 'jsonwebtoken';
import debounce from 'lodash.debounce';
import ReactGA4 from 'react-ga4';
import './Dashboard.css';
// import Paginator from '../../../components/Paginator';
import Panigantion from '../../../components/Panigantion';
import * as Action from '../actions/dashboardAction';
import * as Actions from '../../admin/actions/adminAction';
import * as adminAction from '../../distributor/action.js'; //import * as Action from '../services/distributor/action';
import Util from '../../../util/helper/index';
import config from '../../../config/server';
import moment from 'moment';
import RefreshTimer from '../../../components/RefreshTimer';
import { Tooltip, notification, DatePicker, Popover, Collapse, Modal } from 'antd';
import { CloseCircleOutlined, DownloadOutlined, CloudSyncOutlined, ShoppingCartOutlined, DeleteOutlined, InfoCircleFilled, CaretRightOutlined } from '@ant-design/icons';
import ExportSoModal from './ExportSoModal';
import * as ErrorAction from '../actions/errorAction';
import * as AuthAction from '../../auth/action';
import * as OrderAction from '../action';
import { errorReportFormat } from '../../../config/error';
import useWindowDimensions from '../../../hooks/useWindowDimensions';
import appLevelConfiguration from '../../../config';
import Loader from '../../../components/Loader';
import ServerTimer from '../../../components/ServerTImer';
import { pages, hasViewPermission, features, hasFeaturePermission } from '../../../persona/distributorNav.js';
import { authenticatedUsersOnly } from '../../../util/middleware';
import CfaSurveyModal from './CfaSurveyModal';
import ReservedCredit from './ReservedCredit.js';
import PropTypes from 'prop-types';
import { RUPEE_SYMBOL } from '../../../constants/index.js';
import LocalAuth from '../../../util/middleware/auth.js';
import PromisedCreditModal from '../OrderDetail/PromisedCreditModal';
import DeclarationModal from './DeclarationModal.js';
import './DeclarationModal.css';
import ReportIssueModal from '../ReportIssueModal/ReportIssueModal.js';
import * as RequestPersona from '../../../persona/requests.js';
import CustomTour from '../../../util/helper/customTour.js';
import SurveyModal from './SurveyModal.js';

const appConfig = appLevelConfiguration.app_level_configuration;
let sortDirection = false;

const contents = (
    <div>
        <div>
            Please contact regional <br />
            CFA for any corrections
        </div>
    </div>
);

let Dashboard = (props) => {
    const browserHistory = props.history;
    const { RangePicker } = DatePicker;
    const { width } = useWindowDimensions();

    let access_token = Auth.getAccessToken();
    let admin_access_token = Auth.getAdminAccessToken();
    let login_id = '';
    let role = Auth.getRole();

    const distributor_code = useRef();
    const { fromDate, toDate } = Util.activeSessionToAndFromTimestamp();
    const {
        sso_user_details,
        getSSODetails,
        getMaintenanceRequests,
        insertReservedCredit,
        getPDPWindows,
        pdp_windows,
        pdpWindows,
        fetchArsConfigurations,
        report_issues,
        admin_switched_to_distributor,
        getSessionsLog,
        invalidateOtherSessions,
    } = props;
    const [activeSessions, setActiveSessions] = useState([]);
    async function getMaintenanceStatus() {
        const response = await getMaintenanceRequests(props.history);

        if (props.location.pathname.split('/')[1] === 'distributor') {
            authenticatedUsersOnly(props.location.pathname, props.history);
        }
        if (response?.data) {
            if (response.data.length > 0) {
                if (response.data[0].status == 'OPEN') {
                    localStorage.removeItem('token');
                }
            }
        }
    }

    useEffect(() => {
        getMaintenanceStatus();
        props.fetchAppLevelConfiguration();
        getArsConfigurations();
        props.distributorResetCreateOrderCompleteFormFields();
    }, []);

    let user_id = '';
    let getRole = sso_user_details.data && sso_user_details.data.length && sso_user_details.data[0].roles;

    if (access_token || admin_access_token) {
        if (!role) {
            login_id = jwt.decode(access_token).login_id;

            distributor_code.current = login_id;
            user_id = login_id;
            getRole = 'DISTRIBUTOR';
            LocalAuth.setDistributorRole('DISTRIBUTOR');
        } else if (props.location?.state?.distributorId) {
            distributor_code.current = props.location.state.distributorId;
            user_id = props.location.state.distributorId;
            props.adminSetSwitchToDistributor(props.location.state.distributorId);
        }
    } else {
        if (!role) {
            browserHistory.push('/auth/login');
        }
    }
    const [regionDetails, setRegionDetails] = useState(null);

    const { Panel } = Collapse;
    const [timerEnd, setTimerEnd] = useState(false);
    const [downloadReady, setDownloadReady] = useState(false);
    const [downloadData, setDownloadData] = useState([]);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [offset, setOffset] = useState(1);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [search, setSearch] = useState(null);
    const [pageNo, setPageNo] = useState(1);
    const [showSearch, setShowSearch] = useState('');
    const [exportedList, setExportedList] = useState([]);
    const [authorizeCreateOrderByAdmin, setAuthorizeCreateOrderByAdmin] = useState(false);
    const [showDraft, setshowDraft] = useState(false);
    const [cartExpiryWindow, setCartExpiryWindow] = useState();
    const [pdpWeeklyOrderWindow, setPdpWeeklyOrderWindow] = useState();
    const [pdpFortnightlyOrderWindow, setPdpFortnightlyOrderWindow] = useState();
    const [pdpOrderPlacementTime, setPdpOrderPlacementTime] = useState();
    const [pdpWeeklyOff, setPdpWeeklyOff] = useState();
    const [activepdpStr, setactivepdpStr] = useState('N/A');
    const [activeplantStr, setactiveplantStr] = useState('N/A');
    const [activedesStr, setsctivedesStr] = useState('N/A');
    const [activedivStr, setactivedivStr] = useState('N/A');
    const [activeDivArray, setActiveDivArray] = useState([]);
    const [isDivision, setIsDivision] = useState(false);
    const [isCentralARSEnabled, setIsCentralARSEnabled] = useState(false);
    const [upcomingSalesDetails, setUpcomingSalesDetails] = useState([]);
    const [authorizePdpRestriction, setAuthorizePdpRestriction] = useState(false);
    const [isCfaSurveyOpen, setIsCfaSurveyOpen] = useState(false);
    const [enableReservedCredit, setEnableReservedCredit] = useState(false);
    const [showReservedCreditModal, setShowReservedCreditModal] = useState(false);
    const [availableCredit, setAvailableCredit] = useState(0);
    const [isPromiseModalOpen, setIsPromiseModalOpen] = useState(false);
    const [creditDifference, setCreditDifference] = useState(0);
    const [enablePromiseCredit, setEnablePromiseCredit] = useState(false);
    const [secondPromiseStartTime, setSecondPromiseStartTime] = useState(0);
    const [secondPromiseEndTime, setSecondPromiseEndTime] = useState(0);
    const [isSurveyLinkOpen, setIsSurveyLinkOpen] = useState(false);
    const [surveyLink, setSurveyLink] = useState('');
    const [arsConfigurations, setArsConfigurations] = useState([]);
    const [isReportModalVisible, setIsReportModalVisible] = useState(false);
    const [serviceLevelCategory, setServiceLevelCategory] = useState([]);
    const [reportIssueFeatureFlag, setReportIssueFeatureFlag] = useState(true);
    const [isTourOpen, setIsTourOpen] = useState(false);

    const {
        credit_details = {},
        order_list,
        region_details,
        app_level_configuration,
        get_cfa_questions,
        saveNocResponse,
        fetchDistributorAgreements,
        submitSurvey,
        fetchSurveyResponse,
        getReOrderDetails,
    } = props;
    const totalCount = order_list.get('totalCount');
    let orderData = order_list.get('data');
    const orderDraftData = order_list.get('drafts');
    const rushOrderDraftData = order_list.get('rushDrafts');
    const syncing = order_list.get('sync');
    const lastSync = order_list.get('lastSync');
    const { asm, pdp_day, region, tse, market, name, id, plants, distributor_sales_details } = region_details;
    const [dateRange, setDateRange] = useState([]);
    const [linkSurveyData, setLinkSurveyData] = useState({});
    const [isDeclarationModalVisible, setIsDeclarationModalVisible] = useState(false);
    const [distributorId, setDistributorId] = useState(null);
    const [isSurveyModalVisible, setIsSurveyModalVisible] = useState(false);
    const [hasSurveyResponse, setHasSurveyResponse] = useState([]);
    const [applicableDistributors, setApplicableDistributors] = useState([]);
    const [surveyEndDate, setSurveyEndDate] = useState('');

    useEffect(() => {
        async function fetchSessionLog() {
            const sessionPayload = {
                from: fromDate,
                to: toDate,
                type: 'active',
                login_id: distributor_code.current,
            };
            const { data } = await getSessionsLog(sessionPayload);
            if (data?.success) {
                setActiveSessions(data?.data?.result || []);
            }
        }
        if (distributor_code.current) {
            fetchSessionLog();
        }
    }, [distributor_code.current]);

    const handleSessionLogout = () => {
        browserHistory.push('/logout');
    };

    const handleOtherSessionsLogout = async () => {
        const session_id = window.localStorage.getItem('TCPL_correlation_id');
        const invalidatPayload = { fromDate, toDate, sessionId: session_id, loginId: distributor_code.current };
        const invalidateSessionResponse = await invalidateOtherSessions(invalidatPayload);
        if (invalidateSessionResponse?.success) {
            Util.notificationSender('Success', 'Logged out of other sessions successfully.', true);
        } else {
            Util.notificationSender('Error', 'Failed to logout from other sessions. Hence logging out from this session.', false);
            browserHistory.push('/logout');
        }
    };

    const sessionConfirm = () => {
        Modal.confirm({
            title: 'Session Confirm',
            content: 'You have multiple active sessions. Either logout from other sessions or continue to logout from this session.',
            okText: 'Logout',
            cancelText: 'Close Other Sessions',
            onOk: handleSessionLogout,
            onCancel: handleOtherSessionsLogout,
            bodyStyle: { padding: '10px 10px', borderRadius: '5px' },
        });
    };

    useEffect(() => {
        const session_id = window.localStorage.getItem('TCPL_correlation_id');
        let hasPreviousActiveSessions = false;
        activeSessions.forEach((session) => {
            if (session.correlation_id !== session_id) {
                hasPreviousActiveSessions = true;
            }
        });
        if (hasPreviousActiveSessions) {
            // alert("You have multiple active sessions. Hence logging out.");
            // sessionConfirm();
            // handleOtherSessionsLogout(); // Commented this to disable the multiple session restriction feature
        }
    }, [activeSessions]);

    useEffect(() => {
        setIsDeclarationModalVisible(true);
        setIsSurveyModalVisible(true);
    }, []);

    const handleAgree = () => {
        notification.success({
            message: 'You have agreed to the terms and conditions',
            duration: 3,
            className: 'notification-green',
        });
        saveNocResponse({
            distributor_id: distributor_code.current,
            agreement_status: 'AGREED',
        });
        setIsDeclarationModalVisible(false);
    };

    const handleDisagree = () => {
        notification.success({
            message: 'You have disagreed to the terms and conditions',
            duration: 3,
            className: 'notification-green',
        });
        saveNocResponse({
            distributor_id: distributor_code.current,
            agreement_status: 'DISAGREED',
        });
        setIsDeclarationModalVisible(false);
    };

    const handleSurveySubmit = (surveyData) => {
        notification.success({
            message: 'Survey submitted successfully',
            duration: 3,
            className: 'notification-green',
        });

        submitSurvey({
            db_code: distributor_code.current,
            accountingSoftware: surveyData.accountingSoftware,
            otherSoftware: surveyData.otherSoftware,
            version: surveyData.version,
        });

        setIsSurveyModalVisible(false);
    };

    const { AMOUNT = '', CREDIT_LIMIT = '', RESERVED_CREDIT = '' } = credit_details;

    const [creditData, setCreditData] = useState({
        confirmed_by: '',
        distributor_id: '',
        open_order_value: '',
        credit_shortfall: '',
        input_type: '',
        promised_credit_date: '',
        promised_credit_time: '',
        promised_credit: '',
        promised_credit_type: '',
    });

    const allDivArray = useRef();
    let reqiredPromiseCredit = 0;

    useEffect(() => {
        /**
     * Scenario 1- 
        Credit limit 100
        Consumed 20
        Available credit 100-20=80
        reserve credit should be <= 80
        
        
      Scenario 2-
        Credit limit 100
        Consumed (-)20
        Available credit 100- (-)20=100+20=120
        reserve credit should be <=120
      * SAP response for negative consumed credit:- {"AMOUNT":"550166.71-"}
     */
        let consumed = AMOUNT.split('-').length === 2 ? `-${AMOUNT.split('-').join('')}` : AMOUNT;
        let credit = +CREDIT_LIMIT - +consumed;
        credit = credit.toFixed(2);
        setAvailableCredit(credit);

        if (user_id) {
            let consumed = AMOUNT.split('-').length === 2 ? `-${AMOUNT.split('-').join('')}` : AMOUNT;
            let credit = +CREDIT_LIMIT - +consumed;
            reqiredPromiseCredit = credit - credit_details.OPENNETVALUE;
            reqiredPromiseCredit = reqiredPromiseCredit ? reqiredPromiseCredit.toFixed(2) : '';
        }
        setCreditDifference(reqiredPromiseCredit);
    }, [credit_details]);

    const consentWindow = (startTime, endTime) => {
        const now = new Date();
        const startStr = typeof startTime === 'string' ? startTime : '';
        const endStr = typeof endTime === 'string' ? endTime : '';

        // Parse start and end times from strings
        const [startHour, startMinute] = startStr.split(':').map(Number);
        const [endHour, endMinute] = endStr.split(':').map(Number);

        // Create Date objects for start and end times
        const start = new Date(now);
        start.setHours(startHour, startMinute, 0, 0);

        const end = new Date(now);
        end.setHours(endHour, endMinute, 0, 0);
        // Check if current time is between start and end times
        return now >= start && now <= end;
    };

    let isInConsentWindow = consentWindow(secondPromiseStartTime, secondPromiseEndTime);

    let confirmed_by = login_id; // Default value

    if (Object.keys(sso_user_details).length) {
        confirmed_by = sso_user_details.data[0].user_id ?? login_id;
    }
    let promiseCreditData = {
        confirmed_by: confirmed_by,
        distributor_id: region_details.id,
        credit_shortfall: creditDifference,
        input_type: 'Second consent for promise credit',
        open_order_value: credit_details?.OPENNETVALUE,
    };

    const handlePromiseCreditSubmitted = (event) => {
        handleCloseModal();
    };
    const handleCloseModal = () => {
        setIsPromiseModalOpen(false);
    };
    const openPromiseModal = () => {
        if (creditDifference <= 0) {
            setIsPromiseModalOpen(true);
        }
    };

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
        if (login_id && login_id !== '') {
            props.getCreditLimitDetails(login_id);
            const { is_nourishco } = region_details;
            props.getAllMaterials(login_id, is_nourishco);
            props.getOrderList({
                items_per_page: itemsPerPage,
                page_no: offset,
            });
            props.getRegionDetails();
            props.removeExpiredCarts();
        }
    }, [login_id, itemsPerPage, offset]);

    useEffect(() => {
        if (role && props.location.state) {
            props.getOrderList({
                distributorId: props.location.state.distributorId,
                items_per_page: itemsPerPage,
                page_no: offset,
            });
            props.getRegionDetails(props.location.state.distributorId);
            props.getCreditLimitDetails(props.location.state.distributorId);
        }
    }, [role, props.location.state, itemsPerPage, offset]);

    const [formattedData, setFormattedData] = useState([]);
    const [formattedDraftData, setFormattedDraftData] = useState([]);
    const [rushOrderDrafts, setRushOrderDrafts] = useState([]);
    const [syncInProgress, setSyncInProgress] = useState(false);
    const adminRole = LocalAuth.getAdminRole();

    useEffect(() => {
        if (!getRole?.includes('SUPPORT') && syncing && formattedData && formattedData.length > 0) {
            setSyncInProgress(true);
            if (!syncInProgress) {
                notification.info({
                    message: 'Syncing..',
                    description: 'SO List is syncing in background. Please refresh after sometime to see the updated list.',
                    duration: 10,
                    className: 'notification-green',
                });
            }
        }
    }, [syncing, formattedData]);

    useEffect(() => {
        setFormattedData(orderData.slice(0, itemsPerPage));
        setFormattedDraftData(orderDraftData);
        setRushOrderDrafts(rushOrderDraftData);
    }, [orderData]);

    useEffect(() => {
        region_details.group5_id && getPDPWindows(region_details.group5_id);

        return () => {
            pdpWindows([]);
        };
    }, [region_details.group5_id]);

    const steps = [
        {
            selector: '.so-column',
        },
    ];

    useEffect(() => {
        setIsTourOpen(false);
    }, []);

    useEffect(() => {
        if (app_level_configuration && app_level_configuration.length) {
            for (let config of app_level_configuration) {
                if (!config) continue;
                if (config.key === appConfig.report_issue.key && config.value === appConfig.report_issue.inactive_value) {
                    setReportIssueFeatureFlag(false);
                }
            }
        } else {
            // props.fetchAppLevelConfiguration();
        }
    }, [app_level_configuration, adminRole]);

    const getPODetails = (event, item) => {
        event.preventDefault();
        const id = event.target.innerText;
        props.getPODetails(id, item.distributor_id);
        let pathUrl = '';
        if (props.location && props.location.state && props.location.state.distributorId) {
            pathUrl = '/admin/po-details';
        } else {
            pathUrl = '/distributor/po-details';
        }
        browserHistory.push({
            pathname: pathUrl,
            state: {
                delivery_no: item.delivery_no,
                invoice_no: item.invoice_no,
                market: market,
                so_number: item.so_number,
                so_date: item.so_date,
                po_number: item.po_number,
                po_date: item.po_date,
                distributorId: props.location.state && props.location.state.distributorId,
            },
        });
    };

    const newSalesOrderHandler = () => {
        if (props.location.state && props.location.state.distributorId) {
            browserHistory.push({
                pathname: '/admin/create-order',
                state: {
                    distributorId: props.location.state && props.location.state.distributorId,
                    distributorName: name,
                    isReorder: false,
                    activedivStr: activedivStr,
                    activeDivArray: activeDivArray,
                    allDivArray: allDivArray.current,
                    upcomingSalesDetails,
                },
            });
        } else {
            browserHistory.push({
                pathname: '/distributor/create-order',
                state: {
                    isReorder: false,
                    activedivStr: activedivStr,
                    activeDivArray: activeDivArray,
                    allDivArray: allDivArray.current,
                    upcomingSalesDetails,
                },
            });
        }
    };

    let errorHandler = (message, description) => {
        notification.error({
            message: message,
            description: description,
            duration: 8,
            className: 'notification-error',
        });
    };

    const ReOrderHandler = (so_number, product_type) => {
        getReOrderDetails(so_number, props.location.state && props.location.state.distributorId)
            .then((res) => {
                if (res && res.status === 200) {
                    const { data = {} } = res;
                    const { Itemset = [] } = data.data.length ? data.data[0]?.order_data : {};
                    if (Itemset.length <= 0) {
                        errorHandler('Error Occurred!', 'Technical error with re-order items, please try again later.');
                        errorReportFormat.distributor_dashboard.reord_001.logObj = Itemset;
                        props.logAppIssue(errorReportFormat.distributor_dashboard.reord_001);
                    } else {
                        props.logAppIssue({});
                        window.localStorage.setItem('TCPL_SAP_reorderData', JSON.stringify([]));
                        if (role) {
                            browserHistory.push({
                                pathname: '/admin/create-order',
                                state: {
                                    data: Itemset,
                                    order_product_type: product_type,
                                    distributorId: props.location.state.distributorId,
                                    distributorName: name,
                                    isReorder: true,
                                    activedivStr: activedivStr,
                                    upcomingSalesDetails,
                                },
                            });
                        } else {
                            browserHistory.push({
                                pathname: '/distributor/create-order',
                                state: {
                                    data: Itemset,
                                    order_product_type: product_type,
                                    isReorder: true,
                                    activedivStr: activedivStr,
                                    upcomingSalesDetails,
                                },
                            });
                        }
                    }
                } else {
                    errorHandler('Error Occurred!', 'Technical error with re-order items, please try again later.');
                    errorReportFormat.distributor_dashboard.reord_002.errorMessage = res.message || res;
                    errorReportFormat.distributor_dashboard.reord_002.logObj = res.response.data || res;
                    props.logAppIssue(errorReportFormat.distributor_dashboard.reord_002);
                }
            })
            .catch((err) => {
                errorHandler('Error Occurred!', 'Technical error with re-order items, please try again later.');
                errorReportFormat.distributor_dashboard.reord_003.logObj = err.response;
                props.logAppIssue(errorReportFormat.distributor_dashboard.reord_003);
            });
    };

    const [, /* ignored */ forceUpdate] = useReducer((x) => x + 1, 0);

    const sortColumn = (columnName) => {
        sortDirection = !sortDirection;
        if (sortDirection) {
            formattedData.sort((a, b) => {
                let comparison = 0;
                if (a[columnName] < b[columnName]) {
                    comparison = -1;
                }
                if (a[columnName] > b[columnName]) {
                    comparison = 1;
                }
                return comparison;
            });
        } else {
            formattedData.sort((a, b) => {
                let comparison = 0;
                if (a[columnName] < b[columnName]) {
                    comparison = -1;
                }
                if (a[columnName] > b[columnName]) {
                    comparison = 1;
                }
                return comparison * -1;
            });
        }
        setFormattedData(formattedData);
        forceUpdate();
    };

    const debouncedSave = useRef(debounce((nextValue) => setSearch(nextValue), 500)).current;

    const onSearch = (e) => {
        const { value } = e.target;
        debouncedSave(value);
        setShowSearch(value);
        setPageNo(1);
    };

    const resetPage = () => {
        debouncedSave('');
        setShowSearch('');
    };

    useEffect(() => {
        if (search === null) return;
        //changes for SOPE-47
        let data = {};
        if (search) {
            data.searchItem = search;
        }
        if (role) {
            data.distributorId = props.location.state && props.location.state.distributorId;
        }
        if (dateRange.length === 2) {
            const fromDate = dateRange[0];
            const toDate = dateRange[1];
            if (fromDate) {
                data.fromDate = fromDate;
            }
            if (toDate) {
                data.toDate = toDate;
            }
        }
        data.items_per_page = itemsPerPage;
        data.page_no = offset;
        props.getOrderList(data);
        if (config.app_environment === 'uat' || config.app_environment === 'prod' || config.app_environment === 'dev') {
            ReactGA4.event({
                category: 'Search',
                action: 'Search Previous SO',
            });
        }
    }, [search, itemsPerPage, offset]);

    //changes for SOPE-47
    const handleDateChange = (dateArray) => {
        let selectedDate = [];
        if (dateArray[0]) {
            selectedDate[0] = dateArray[0];
        }
        if (dateArray[1]) {
            selectedDate[1] = dateArray[1];
        }
        setDateRange(selectedDate);
        setPageNo(1);
    };

    //changes for SOPE-47
    useEffect(() => {
        let data = {};
        if (search) {
            data.searchItem = search;
        }
        if (role) {
            data.distributorId = props.location.state && props.location.state.distributorId;
        }
        if (dateRange.length === 2) {
            const fromDate = dateRange[0];
            const toDate = dateRange[1];

            if (fromDate) {
                data.fromDate = fromDate;
            }
            if (toDate) {
                data.toDate = toDate;
            }
        }
        data.items_per_page = itemsPerPage;
        data.page_no = offset;
        props.getOrderList(data);
    }, [dateRange, itemsPerPage, offset]);

    const getOrderDetails = (delivery_no, invoice_no, so_number, so_date, po_number, po_date, distributor_id) => {
        props.getPODetails(po_number, distributor_id);
        let pathUrl = '';
        if (props.location.state && props.location.state.distributorId) {
            pathUrl = '/admin/sales-order';
        } else {
            pathUrl = '/distributor/sales-order';
        }
        browserHistory.push({
            pathname: pathUrl,
            state: {
                delivery_no: delivery_no,
                invoice_no: invoice_no,
                market: market,
                so_number: so_number,
                so_date: so_date,
                po_number: po_number,
                po_date: po_date,
                distributorId: props.location.state && props.location.state.distributorId,
            },
        });
    };

    const changeTimerState = (ended) => {
        if (ended) {
            setTimerEnd(true);
            //changes for SOPE-47
            let data = {};
            if (search) {
                data.searchItem = search;
            }
            if (role) {
                data.distributorId = props.location.state && props.location.state.distributorId;
            }
            if (dateRange.length === 2) {
                const fromDate = dateRange[0];
                const toDate = dateRange[1];

                if (fromDate) {
                    data.fromDate = fromDate;
                }
                if (toDate) {
                    data.toDate = toDate;
                }
            }
            data.items_per_page = itemsPerPage;
            data.page_no = offset;
            props.getOrderList(data);
        } else {
            setTimerEnd(false);
        }
    };

    const handleCancel = () => {
        setIsModalVisible(false);
    };
    const downloadDataHandler = () => {
        let reqPayLoad = {
            items: [],
        };
        exportedList.map((item) => {
            let tempObj = {
                so_number: item.so_number,
                deliveries: item.delivery_no || [],
                invoices: item.invoice_no || [],
            };
            reqPayLoad.items.push(tempObj);
        });
        props
            .getMultipleSalesOrderDetails(reqPayLoad, props.location.state && props.location.state.distributorId)
            .then((res) => {
                props.logAppIssue({});
                setDownloadData(res);
                setDownloadReady(true);
                setIsModalVisible(true);
            })
            .catch((err) => {
                errorReportFormat.distributor_dashboard.dwnld_001.logObj = err.response.data;
                props.logAppIssue(errorReportFormat.distributor_dashboard.dwnld_001);
                errorHandler('Error Occurred!', 'Technical error while reaching server, please try again later.');
            });
    };
    const exportExcelHandler = (e, item, index) => {
        if (e.target.checked) {
            setExportedList(exportedList.concat(item));
        } else {
            setExportedList(exportedList.filter((exportItem) => exportItem !== item));
        }
    };

    const checkExisting = (item) => {
        let itemExist = false;
        if (exportedList.indexOf(item) >= 0) {
            itemExist = true;
        }
        return itemExist;
    };

    const syncNow = () => {
        if (!props.location.state) return;
        props
            .soSync(props.location.state.distributorId)
            .then((res) => {
                if (res && res.status === 200) {
                    const { data = {} } = res;
                    if (data.success) {
                        notification.info({
                            message: 'Synced',
                            description: res.data.message,
                            duration: 8,
                            className: 'notification-green',
                        });
                    }
                    setSyncInProgress(false);
                    //changes for SOPE-47
                    let requestdata = {};
                    if (search) {
                        requestdata.searchItem = search;
                    }
                    if (role) {
                        requestdata.distributorId = props.location.state && props.location.state.distributorId;
                    }
                    if (dateRange.length === 2) {
                        const fromDate = dateRange[0];
                        const toDate = dateRange[1];

                        if (fromDate) {
                            requestdata.fromDate = fromDate;
                        }
                        if (toDate) {
                            requestdata.toDate = toDate;
                        }
                    }
                    props.getOrderList(requestdata);
                }
            })
            .catch(() => {
                errorHandler('Error Occurred!', 'Technical error while fetching sync logs, please try again later.');
            });
        setSyncInProgress(false);
    };

    useEffect(() => {
        if (app_level_configuration && app_level_configuration.length) {
            for (let config of app_level_configuration) {
                if (!config) continue;
                if (config.key === appConfig.create_or_reorder_admin.key && config.value === appConfig.create_or_reorder_admin.enable_value) {
                    setAuthorizeCreateOrderByAdmin(true);
                }
                if (config.key === appConfig.show_draft.key && config.value === appConfig.show_draft.enable_value) {
                    setshowDraft(true);
                }
                if (config.key === appConfig.cart_expiry_window.key) {
                    setCartExpiryWindow(parseInt(config.value));
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
                if (config.key === appConfig.pdp_restriction.key) {
                    setAuthorizePdpRestriction(config.value === appConfig.pdp_restriction.enable_value);
                }
                if (config.key === appConfig.enable_reserved_credit.key) {
                    setEnableReservedCredit(config.value === appConfig.enable_reserved_credit.enable_value);
                }
                if (config.key === appConfig.enable_second_promise_credit.key) {
                    setEnablePromiseCredit(config.value === appConfig.enable_second_promise_credit.enable_value);
                }
                if (config.key === appConfig.second_promise_credit_start_time.key) {
                    setSecondPromiseStartTime(config.value);
                }
                if (config.key === appConfig.second_promise_credit_end_time.key) {
                    setSecondPromiseEndTime(config.value);
                }
            }
        }
    }, [region_details, app_level_configuration]);

    useEffect(() => {
        const switchConfig = arsConfigurations?.find((config) => +config.region_id === region_details?.group5_id && config.customer_group === region_details?.customer_group_code);
        if (switchConfig) {
            setIsCentralARSEnabled(switchConfig.auto_order);
        }
    }, [region_details, arsConfigurations]);

    const CustomHelper = () => (
        <div className="CustomerHelper">
            <h4>Step1 : Select the required SO number </h4>
            <h4>Step2 : Click on Action Icon ? for the required line item</h4>
            <button className="pop-up-btn" onClick={() => setIsTourOpen(false)}>
                Ok
            </button>
        </div>
    );
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

    // handle click event of the Remove button
    const handleRemoveClick = (index, item, distributor_id) => {
        if (!item) return;
        props
            .deleteDraft(item, distributor_id)
            .then((res) => {
                if (res && res.status === 200) {
                    notification.success({
                        message: 'Success',
                        description: res?.data?.message,
                        duration: 3,
                        className: 'notification-green',
                    });
                    //changes for SOPE-47
                    let data = {};
                    if (search) {
                        data.searchItem = search;
                    }
                    if (role) {
                        data.distributorId = props.location.state && props.location.state.distributorId;
                    }
                    if (dateRange.length === 2) {
                        const fromDate = dateRange[0];
                        const toDate = dateRange[1];

                        if (fromDate) {
                            data.fromDate = fromDate;
                        }
                        if (toDate) {
                            data.toDate = toDate;
                        }
                    }
                    props.getOrderList(data);
                }
            })
            .catch((error) => {
                errorHandler('Error Occurred!', 'Technical error while deleting the draft, please try again later.');
            });
    };
    // handle click event of the draft order button
    const DraftOrderHandler = (po_number, product_type) => {
        let distributorId = null;
        if (props.location && props.location.state && props.location.state.distributorId) {
            distributorId = props.location.state.distributorId;
        } else {
            distributorId = login_id;
        }
        props
            .getDraftOrderDetails(po_number, distributorId)
            .then((res) => {
                if (res && res.status === 200) {
                    if (res?.data?.data?.Itemset?.length <= 0) {
                        errorHandler('Error Occurred!', 'Technical error with draft order items, please try again later.');
                    } else {
                        props.logAppIssue({});
                        let path = null;
                        const stateObject = {
                            data: res?.data?.data?.Itemset,
                            partners: res?.data?.data?.partnerset,
                            order_product_type: product_type,
                            po_number,
                        };
                        if (role) {
                            path = '/admin/create-order';
                            stateObject['distributorId'] = props.location.state.distributorId;
                            stateObject['distributorName'] = name;
                        } else {
                            path = '/distributor/create-order';
                        }
                        browserHistory.push({
                            pathname: path,
                            state: stateObject,
                        });
                    }
                } else {
                    errorHandler('Error Occurred!', 'Technical error with re-order items, please try again later.');
                    errorReportFormat.distributor_dashboard.reord_002.errorMessage = res.message || res;
                    errorReportFormat.distributor_dashboard.reord_002.logObj = res.response.data || res;
                    props.logAppIssue(errorReportFormat.distributor_dashboard.reord_002);
                }
            })
            .catch((err) => {
                errorHandler('Error Occurred!', 'Technical error with re-order items, please try again later.');
                errorReportFormat.distributor_dashboard.reord_003.logObj = err.response;
                props.logAppIssue(errorReportFormat.distributor_dashboard.reord_003);
            });
    };

    useEffect(() => {
        if (region_details && region_details?.distributor_sales_details && region_details?.distributor_sales_details[0]?.division) {
            setIsDivision(false);
        } else {
            setIsDivision(true);
        }
    }, [region_details]);

    useMemo(() => {
        /**
         * Fetches CFA survey questions and determines if the survey should be open for the current user.
         *
         * Steps:
         * 1. Retrieves depot codes from distributor sales details.
         * 2. Fetches CFA survey questions based on depot codes.
         * 3. Checks if any survey is open for the logged-in user and updates the state.
         * 4. Fetches survey link data and checks for a valid survey link for the user.
         * 5. Updates the state to open the survey link if found.
         */
        async function fetchCfaSurveyQuestions() {
            try {
                let depot_code = distributor_sales_details?.reduce((a, item) => [...a, item.plant_name], []);
                let cfa_survey_questions = await get_cfa_questions({
                    depot_code,
                });
                let isOpen = false;

                if (cfa_survey_questions?.success) {
                    cfa_survey_questions?.data
                        ?.filter((i) => i.depot_code != '')
                        ?.forEach((item) => {
                            if (
                                moment(new Date()).isBetween(item.survey_start, item.survey_end) &&
                                item.applicable_distributors.includes(login_id) &&
                                !item.dbs_responded.includes(login_id)
                            ) {
                                isOpen = true;
                            }
                        });

                    if (isOpen) {
                        setIsCfaSurveyOpen(true);
                    }

                    const surveyLinkItem = cfa_survey_questions?.data?.find(
                        (item) =>
                            item.applicable_distributors.includes(login_id) &&
                            item.survey_link &&
                            !item.dbs_responded.includes(login_id) &&
                            moment(new Date()).isBetween(item.survey_start, item.survey_end),
                    );
                    if (surveyLinkItem) {
                        setSurveyLink(surveyLinkItem.survey_link);
                        setIsSurveyLinkOpen(true);
                        setLinkSurveyData(surveyLinkItem);
                    }
                }
            } catch (error) {
                console.error('Error fetching CFA survey questions:', error);
            }
        }

        if (distributor_sales_details?.length > 0 && browserHistory?.location?.state === id) {
            fetchCfaSurveyQuestions();
            window.history.replaceState({}, document.title);
        }
    }, [distributor_sales_details, browserHistory?.location?.state]);

    useEffect(() => {
        activePDPDate();
    }, [distributor_sales_details, authorizePdpRestriction, pdp_windows]);

    useEffect(() => {
        if (!sso_user_details || !Object.keys(sso_user_details).length) {
            const adminAccessDetails = Auth.getAdminAccessDetails();
            let sso_detail = {};
            if (adminAccessDetails && Object.keys(JSON.parse(adminAccessDetails)).length > 0) {
                sso_detail = JSON.parse(adminAccessDetails);
            }
            const emailId = sso_detail?.username?.replace(process.env.REACT_APP_COGNITO_IDP_NAME, '');
            emailId && getSSODetails(emailId, props.history);
        }
    }, [sso_user_details]);

    const selectAllPO = (e) => {
        if (e.target.checked) {
            setExportedList([...formattedData]);
        } else {
            setExportedList([]);
        }
    };
    const activePDPDate = () => {
        const allDivSet = new Set();
        const activePdpSet = new Set();
        const activePlantSet = new Set();
        const activeDivSet = new Set();
        const activeDescSet = new Set();

        const { activeArr: activePdp, inactiveArr: inactivePdp } = Util.getPdpDetails(region_details, app_level_configuration);

        activePdp?.forEach((item) => {
            activePlantSet.add(item.plant_name);
            activePdpSet.add(item.pdp_day);
            activeDivSet.add(item.division);
            activeDescSet.add(item.division_description);
            allDivSet.add(item?.division);
        });
        inactivePdp?.forEach((item) => {
            allDivSet.add(item?.division);
        });
        setactivepdpStr(activePdpSet.size > 0 ? [...activePdpSet].join('/') : 'N/A');
        setactiveplantStr(activePlantSet.size > 0 ? [...activePlantSet].join('/') : 'N/A');
        setactivedivStr(activeDivSet.size > 0 ? [...activeDivSet].join('/') : 'N/A');
        setsctivedesStr(activeDescSet.size > 0 ? [...activeDescSet].join('/') : 'N/A');
        setActiveDivArray([...activeDivSet]);
        allDivArray.current = [...allDivSet];
        setUpcomingSalesDetails(inactivePdp ?? []);
    };

    const onChangePage = (page) => {
        setOffset(page);
        setPageNo(page);
    };
    const cancelReportModal = () => {
        setIsReportModalVisible(false);
    };

    const handleReservedCreditSubmit = (credit) => {
        setShowReservedCreditModal(false);
        const payload = {
            distributor_id: props?.location?.state?.distributorId, //this will be empty in case of DB login
            amount: credit,
        };
        insertReservedCredit(payload)
            .then((res) => {
                if (res && res.status === 201 && res.data.success) {
                    Util.notificationSender('Success!', 'Reserved credit successfully.', true);
                } else {
                    Util.notificationSender('Error Occurred!', 'Failed to save reserved credit.', false);
                }
            })
            .catch((err) => {
                Util.notificationSender('Error Occurred!', 'Technical error with reserved credit, please try again later.');
            });
        //refresh of credit details after submit
        props.getCreditLimitDetails(distributor_code.current);
    };

    const getArsConfigurations = () => {
        fetchArsConfigurations(['SWITCH'])
            .then((res) => {
                if (res?.success) {
                    setArsConfigurations(res.data);
                }
            })
            .catch(() => {});
    };

    const handleReportModal = () => {
        setIsReportModalVisible(true);
        if (RequestPersona.hasViewPermission(RequestPersona.pages.SDR, RequestPersona.features.ONLY_SDR_VIEW)) {
            setServiceLevelCategory(report_issues);
        }
    };
    useEffect(() => {
        fetchDistributorAgreements().then((res) => {
            if (res?.success) {
                setDistributorId(res.data.distributorIDs.distributor_ids);
            }
        });
    }, []);

    useEffect(() => {
        fetchSurveyResponse().then((res) => {
            if (res?.success) {
                setHasSurveyResponse(res.data?.dbResponse);
                setApplicableDistributors(res.data?.applicableDistributors);
                setSurveyEndDate(res.data?.surveyEnd);
            }
        });
    }, []);

    useEffect(() => {
        if (login_id && login_id !== '') {
            props
                .getRegionDetails(login_id)
                .then((details) => {
                    setRegionDetails(details);
                })
                .catch((error) => {
                    console.error('Error fetching region details:', error);
                });
        }
    }, [login_id, props.getRegionDetails]);

    return (
        <>
            {width > 767 ? (
                <div className="distributor-main-page">
                    <div className="distributor-info-block">
                        <div className="distributor-info-left">
                            <div className="dist-title">
                                <h3>
                                    <span>{role && `${name}(${id})`}</span>
                                </h3>
                            </div>
                            <div className="info-left-col">
                                <h5 style={{ display: 'flex' }}>
                                    <span>Area</span>
                                    <div>{region ? region : '-'}</div>
                                </h5>
                            </div>
                            <div className="info-left-col">
                                <h5 style={{ display: 'flex' }}>
                                    <span>ASM</span>
                                    <div className="person-container">
                                        {asm?.map((asm, i) => {
                                            return (
                                                <div key={`${asm.code}_${i}`}>
                                                    {asm?.first_name ? asm.first_name + ' ' + asm.last_name : 'Not Available'} {asm?.code ? '(' + asm.code + ')' : ' '}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </h5>
                            </div>
                            <div className="info-left-col">
                                <h5 style={{ display: 'flex' }}>
                                    <span>TSE</span>
                                    <div className="person-container">
                                        {tse?.map((tse, i) => {
                                            return (
                                                <div key={`${tse.code}_${i}`}>
                                                    {tse?.first_name ? tse.first_name + ' ' + tse.last_name : ' '} {tse?.code ? '(' + tse.code + ')' : ''}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </h5>
                            </div>
                            <PdpComp activeDivStr={activedivStr} salesDetails={distributor_sales_details} />

                            {distributor_sales_details?.length > 0 && (
                                <table className="pdp-tbl" style={{ marginTop: '10px' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: '27%' }}>PDP Day (Upcoming)</th>
                                            <th style={{ width: '32%' }}>
                                                Plant Code
                                                <Popover content={contents} placement="bottom" trigger="hover" className="th-info-icon">
                                                    <InfoCircleFilled />
                                                </Popover>
                                            </th>
                                            <th>Division</th>
                                        </tr>
                                    </thead>
                                </table>
                            )}

                            <Collapse bordered={false} expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />} className="collapse-pdp-tbl">
                                <Collapse.Panel>
                                    <table className="pdp-tbl">
                                        <tbody>
                                            {upcomingSalesDetails?.length <= 0 && (
                                                <tr>
                                                    <td style={{ width: '27%' }}>N/A</td>
                                                    <td style={{ width: '32%' }}>N/A</td>
                                                    <td>N/A</td>
                                                </tr>
                                            )}
                                            {upcomingSalesDetails?.map((item, i) => {
                                                return (
                                                    <tr key={item.division}>
                                                        <td style={{ width: '27%' }}> {item ? item.pdp_day : 'Not Available'}</td>
                                                        <td style={{ width: '32%' }}>{item ? item.plant_name : 'Not Available'}</td>
                                                        <td>
                                                            {item ? item.division_description : 'Not Available'}/{item ? item.division : 'Not Available'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </Collapse.Panel>
                            </Collapse>
                        </div>
                        {
                            <div className="distributor-info-right">
                                <table className="dashboard-credit-info-tbl">
                                    <tr>
                                        <td>
                                            <span> Credit Limit </span>{' '}
                                        </td>
                                        <td>
                                            : {RUPEE_SYMBOL} {CREDIT_LIMIT ? CREDIT_LIMIT : ''}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <span>Consumed Limit </span>{' '}
                                        </td>
                                        <td>: ₹ {AMOUNT ? (AMOUNT.split('-').length === 2 ? `${AMOUNT.split('-').join('')} (-)` : AMOUNT) : ''}</td>
                                    </tr>
                                    {enablePromiseCredit && isInConsentWindow && (
                                        <tr>
                                            <td>
                                                <span>Required Credit </span>{' '}
                                            </td>
                                            <td>
                                                : ₹{' '}
                                                {creditDifference
                                                    ? creditDifference.split('-').length === 2
                                                        ? `${creditDifference.split('-').join('')} (-)`
                                                        : creditDifference
                                                    : ''}
                                            </td>
                                        </tr>
                                    )}

                                    {enablePromiseCredit && isInConsentWindow && (
                                        <tr>
                                            <td>
                                                {creditDifference <= 0 && (
                                                    <button className="promised-credit-consent-btn-lx" disabled={credit_details.SECOND_PROMISE_FLAG} onClick={openPromiseModal}>
                                                        Provide Consent
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                    {enableReservedCredit &&
                                        hasFeaturePermission(pages.DASHBOARD, features.VIEW_RESERVED_CREDIT) &&
                                        (RESERVED_CREDIT ? (
                                            <tr>
                                                <td>
                                                    {' '}
                                                    <span>Reserved Credit </span>
                                                </td>
                                                <td>: ₹ {RESERVED_CREDIT}</td>
                                            </tr>
                                        ) : (
                                            <tr>
                                                <td>
                                                    <span>
                                                        <button onClick={() => setShowReservedCreditModal(true)} className="reserved-credit-btn-lx">
                                                            Reserve Credit
                                                        </button>
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                </table>
                            </div>
                        }
                    </div>

                    <div className="card">
                        <div className="card-row">
                            {/* <div className="card-row-col">
                <h3>Purchase Orders</h3>
                <h5>{totalCount} records found</h5>
              </div> */}
                            <div className="dashboard-search-block width-st-sm-25">
                                <input
                                    value={showSearch}
                                    className="search-po-so"
                                    onChange={(e) => {
                                        onSearch(e);
                                    }}
                                    type="text"
                                    placeholder="Search by PO#, SO#"
                                />
                                <div
                                    onClick={() => {
                                        resetPage();
                                    }}>
                                    <CloseCircleOutlined />
                                </div>
                                <h5>{totalCount} records found</h5>
                            </div>
                            {/* changes for SOPE-47 */}
                            <div className="dashboard-search-block width-sb-25">
                                <RangePicker
                                    allowClear={true}
                                    className="search-po-so serch-date"
                                    placeholder={['Start SO', 'End SO']}
                                    format="YYYY-MM-DD"
                                    onChange={(value, ds) => handleDateChange(ds)}
                                    disabledDate={(current) => moment() < current}
                                />
                            </div>
                            {
                                <div>
                                    <div className="report-report-issue-btn-container">
                                        <>
                                            <button className="report-issue-btns" onClick={handleReportModal}>
                                                Order Related
                                            </button>
                                        </>

                                        {
                                            <ReportIssueModal
                                                visible={isReportModalVisible}
                                                onCancel={cancelReportModal}
                                                serviceLevelCategory={serviceLevelCategory}
                                                adminSwitchedToDistributor={admin_switched_to_distributor}
                                                history={props.history}
                                            />
                                        }
                                        <button className="report-issue-btns" onClick={() => setIsTourOpen(true)}>
                                            Order Processing Related
                                        </button>

                                        <CustomTour steps={steps} isOpen={isTourOpen} onRequestClose={() => setIsTourOpen(false)} />
                                    </div>
                                </div>
                            }

                            {role && hasViewPermission(pages.DASHBOARD) ? (
                                <>
                                    <div className="refresh-block">
                                        <div style={{ display: 'flex' }}>
                                            <button type="submit" className="refresh-button" onClick={syncNow}>
                                                <>
                                                    Sync Now
                                                    <img src="/assets/images/refresh-icon.svg" alt="" />
                                                </>
                                            </button>
                                        </div>
                                        <p style={{ whiteSpace: 'normal' }}>Last Refresh : {lastSync ? Util.formatDateTime(lastSync) : ''}</p>
                                        <ServerTimer />
                                    </div>
                                </>
                            ) : (
                                ''
                            )}

                            {!role && formattedData && formattedData.length > 0 && (
                                <>
                                    <div className="refresh-block">
                                        <div>
                                            <ServerTimer />
                                            <RefreshTimer lastSync={lastSync} setTimerEnd={(ended) => changeTimerState(ended)} />
                                        </div>
                                        <p style={{ whiteSpace: 'normal' }}>Last Refresh : {lastSync ? Util.formatDateTime(lastSync) : ''}</p>
                                    </div>
                                </>
                            )}
                            {((role && hasViewPermission(pages.DASHBOARD) && authorizeCreateOrderByAdmin) || !role) &&
                            (activedivStr == '' || activedivStr == null || isDivision == true) ? (
                                <button type="submit" className="add-button-purchase" onClick={newSalesOrderHandler} disabled="true">
                                    New Purchase Order
                                    <img src="/assets/images/plusIcon.svg" alt="" />
                                </button>
                            ) : (
                                <button type="submit" className="add-button-purchase" onClick={newSalesOrderHandler}>
                                    New Purchase Order
                                    <img src="/assets/images/plusIcon.svg" alt="" />
                                </button>
                            )}
                        </div>
                        <div className="dashboard-table new-dashboard-table">
                            <Loader>
                                <table>
                                    <thead className="sales-orders-th">
                                        <tr>
                                            <th style={{ width: '5px' }}>
                                                {formattedData && formattedData.length > 0 && (
                                                    <input
                                                        id={'checkbox-header'}
                                                        onChange={(e) => {
                                                            selectAllPO(e);
                                                        }}
                                                        type="checkbox"
                                                    />
                                                )}
                                            </th>
                                            <th className="thead-po" onClick={() => sortColumn('po_number')}>
                                                PO # <img src="/assets/images/sorting_icon.svg" alt="" />
                                            </th>
                                            <th onClick={() => sortColumn('po_date')}>
                                                PO Date <img src="/assets/images/sorting_icon.svg" alt="" />
                                            </th>
                                            <th className="so-column" onClick={() => sortColumn('so_number')}>
                                                SO # <img src="/assets/images/sorting_icon.svg" alt="" />
                                            </th>
                                            <th onClick={() => sortColumn('so_date')}>
                                                SO Date <img src="/assets/images/sorting_icon.svg" alt="" />
                                            </th>
                                            <th>
                                                SO Value ({' '}
                                                <span
                                                    style={{
                                                        color: 'white',
                                                        fontSize: 'large',
                                                    }}>
                                                    &#8377;
                                                </span>{' '}
                                                )
                                            </th>
                                            <th onClick={() => sortColumn('created_by')}>
                                                Created By <img src="/assets/images/sorting_icon.svg" alt="" />
                                            </th>
                                            <th onClick={() => sortColumn('status')}>
                                                Order Status <img src="/assets/images/sorting_icon.svg" alt="" />
                                            </th>
                                            {((role && hasViewPermission(pages.DASHBOARD) && authorizeCreateOrderByAdmin) || !role) && <th>Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {hasViewPermission(pages.DASHBOARD) &&
                                            showDraft &&
                                            formattedDraftData?.map((item, i) => {
                                                let itemExisting = checkExisting(item);
                                                const dateDiff = Util.diffOfDates(new Date(), new Date(item.po_date));
                                                const availableDays = cartExpiryWindow - dateDiff + 1;
                                                return (
                                                    <React.Fragment key={`items-list-${i}`}>
                                                        <tr>
                                                            <td style={{ width: '5px' }}></td>
                                                            <td className="#">
                                                                {' '}
                                                                {`${item.cart_number ? item.cart_number : 'CART'} ${
                                                                    !isNaN(availableDays) && availableDays >= 0 ? `(Available for ${availableDays} days)` : ''
                                                                }`}
                                                            </td>
                                                            <td> -</td>
                                                            <td className="#"> -</td>
                                                            <td> -</td>
                                                            <td> -</td>
                                                            <td
                                                                style={{
                                                                    maxWidth: '210px',
                                                                }}>
                                                                {item.created_by_user_group === 'SELF'
                                                                    ? name
                                                                        ? name
                                                                        : ''
                                                                    : (item.first_name ? item.first_name : '') + ' ' + (item.last_name ? item.last_name : '')}
                                                            </td>
                                                            <td> -</td>
                                                            <td>
                                                                <span className="cart-btn" onClick={() => DraftOrderHandler(item.po_number, item.product_type)}>
                                                                    <span style={{ color: '#34aeef' }}>({item.order_data.Itemset.length})</span>
                                                                    <ShoppingCartOutlined />
                                                                </span>
                                                                {!getRole?.includes('SUPPORT') && (
                                                                    <span className="delete-btn" onClick={() => handleRemoveClick(i, item.po_number, item.distributor_id)}>
                                                                        <DeleteOutlined />
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    </React.Fragment>
                                                );
                                            })}
                                        {rushOrderDrafts?.map((item, i) => {
                                            return (
                                                <tr key={item.po_number}>
                                                    <td style={{ width: '5px' }}></td>
                                                    <td>
                                                        <button onClick={(event) => getPODetails(event, item)} className="btn-link">
                                                            {item.po_number ?? '-'}
                                                        </button>
                                                    </td>
                                                    <td>{Util.formatDate(item.po_date) ?? '-'}</td>
                                                    <td>-</td>
                                                    <td>-</td>
                                                    <td>-</td>
                                                    <td
                                                        style={{
                                                            maxWidth: '210px',
                                                        }}>
                                                        {item.created_by_user_group === 'SELF' ? (name ?? '') : (item?.first_name ?? '') + ' ' + (item?.last_name ?? '')}
                                                    </td>
                                                    <td>-</td>
                                                    <td>
                                                        <span
                                                            className={`
                              reorder-btn 
                              ${item.order_request_status === 'PENDING' ? 'or-pending' : ''} 
                              ${item.order_request_status === 'REJECTED' ? 'or-rejected' : ''}
                              ${item.order_request_status === 'EXPIRED' ? 'or-expired' : ''} `}>
                                                            {item.order_request_status ?? '-'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {formattedData?.map((item, i) => {
                                            let itemExisting = checkExisting(item);
                                            return (
                                                <React.Fragment key={`items-list-${i}`}>
                                                    <tr>
                                                        <td style={{ width: '5px' }}>
                                                            <label htmlFor={`po-items-${i}`}>
                                                                {itemExisting && (
                                                                    <input id={`po-items-${i}`} type="checkbox" checked onChange={(event) => exportExcelHandler(event, item, i)} />
                                                                )}
                                                                {!itemExisting && (
                                                                    <input id={`po-items-${i}`} type="checkbox" onChange={(event) => exportExcelHandler(event, item, i)} />
                                                                )}
                                                                <span className="checkmark-box"></span>
                                                            </label>
                                                        </td>
                                                        <td className="#">
                                                            <div className="#">
                                                                <button className="btn-link" onClick={(event) => getPODetails(event, item)}>
                                                                    {item.po_number ? item.po_number : '-'}
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td>{item.po_date ? Util.formatDate(item.po_date) : '-'}</td>
                                                        <td className="so-column">
                                                            <div>
                                                                {item.so_number ? (
                                                                    // status wise SO start
                                                                    //     <a
                                                                    //     className={"badges " +
                                                                    //     (item.status == 'completed' ? 'so-status-completed' : '' ||
                                                                    //         item.status == 'partiallycompleted' ? 'so-status-partially-completed' : ''
                                                                    //          ||item.status == 'pending' ? 'so-status-pending' : '')
                                                                    // }
                                                                    //     onClick={() => getOrderDetails(
                                                                    //       item.delivery_no,
                                                                    //       item.invoice_no,
                                                                    //       item.so_number,
                                                                    //       item.so_date,
                                                                    //       item.po_number,
                                                                    //       item.po_date,
                                                                    //       item.distributor_id
                                                                    //     )}>
                                                                    //       {item.so_number ? item.so_number : '-'}
                                                                    //     </a>
                                                                    // status wise SO end
                                                                    <a
                                                                        onClick={() =>
                                                                            getOrderDetails(
                                                                                item.delivery_no,
                                                                                item.invoice_no,
                                                                                item.so_number,
                                                                                item.so_date,
                                                                                item.po_number,
                                                                                item.po_date,
                                                                                item.distributor_id,
                                                                            )
                                                                        }>
                                                                        {item.so_number ? item.so_number : '-'}
                                                                    </a>
                                                                ) : (
                                                                    '-'
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>{item.so_date ? Util.formatDate(item.so_date) : '-'}</td>
                                                        <td>
                                                            {item.so_value || (
                                                                <Tooltip placement="right" className="icon-sync" title="SO Sync Pending">
                                                                    <CloudSyncOutlined />
                                                                </Tooltip>
                                                            )}
                                                        </td>
                                                        <td
                                                            style={{
                                                                maxWidth: '210px',
                                                            }}>
                                                            {item.created_by_user_group === 'SELF'
                                                                ? name
                                                                    ? name
                                                                    : ''
                                                                : (item.first_name ? item.first_name : '') + ' ' + (item.last_name ? item.last_name : '')}
                                                        </td>
                                                        <td>{item.status}</td>
                                                        {((role && hasViewPermission(pages.DASHBOARD) && authorizeCreateOrderByAdmin) || !role) && (
                                                            <td>
                                                                {!(isCentralARSEnabled && region_details?.ao_enable) &&
                                                                item.order_type === 'NORMAL' &&
                                                                region_details?.reg_enable &&
                                                                !hasViewPermission(pages.DASHBOARD, features.NO_ACTIONS) &&
                                                                !item.po_number.includes('LIQ') &&
                                                                !item.po_number.includes('RO') &&
                                                                !item.po_number.includes('CCO') ? (
                                                                    <span className="reorder-btn" onClick={() => ReOrderHandler(item.so_number, item.product_type)}>
                                                                        Re-Order
                                                                    </span>
                                                                ) : (
                                                                    !item?.rush_status && '-'
                                                                )}
                                                                {item?.rush_status && !hasViewPermission(pages.DASHBOARD, features.NO_ACTIONS) && (
                                                                    <span
                                                                        className={`
                                                      reorder-btn 
                                                      ${item.rush_status === 'PENDING' ? 'or-pending' : ''} 
                                                      ${item.rush_status === 'REJECTED' ? 'or-rejected' : ''}
                                                      ${item.rush_status === 'EXPIRED' ? 'or-expired' : ''}
                                                      ${item.rush_status === 'APPROVED' ? 'or-approved' : ''}`}>
                                                                        {item.rush_status}
                                                                    </span>
                                                                )}
                                                            </td>
                                                        )}
                                                    </tr>
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </Loader>
                        </div>
                        <div className="btn-download">
                            {exportedList && exportedList.length ? <button onClick={downloadDataHandler}>Download</button> : <button disabled>Download</button>}
                            {downloadReady && <ExportSoModal visible={isModalVisible} onCancel={handleCancel} soData={downloadData} />}
                        </div>
                        {/* <Paginator
              data={orderData ? orderData : []}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              itemsCount={orderData ? orderData.length : 0}
              setModifiedData={(modifiedData) => {
                setFormattedData(modifiedData);
              }}
            /> */}
                        <Panigantion
                            data={orderData ? orderData : []}
                            itemsPerPage={itemsPerPage}
                            setItemsPerPage={setItemsPerPage}
                            itemsCount={orderData ? totalCount : 0}
                            setModifiedData={onChangePage}
                            pageNo={pageNo}
                        />
                    </div>
                </div>
            ) : (
                <div className="distributor-mobile-screen">
                    <div className="mobile-credit-block">
                        <div className="mobile-credit-top">
                            {role && <h3>{`${name}(${id})`}</h3>}
                            <div className="mobile-credit-info">
                                <h5>
                                    <span>Area</span> {region ? region : '-'}
                                </h5>
                                <h5>
                                    <span>PDP Day</span>
                                    {activepdpStr}
                                </h5>
                                <h5>
                                    <span>ASM</span>
                                    <div className="person-container">
                                        {asm?.map((asm, i) => {
                                            return (
                                                <div key={`${asm.code}_${i}`}>
                                                    {asm?.first_name ? asm.first_name + ' ' + asm.last_name : '-'} {asm?.code ? '(' + asm.code + ')' : ''}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </h5>
                                <h5>
                                    <span>TSE</span>
                                    <div className="person-container">
                                        {tse?.map((tse, i) => {
                                            return (
                                                <div key={`${tse.code}_${i}`}>
                                                    {tse?.first_name ? tse.first_name + ' ' + tse.last_name : '-'} {tse?.code ? '(' + tse.code + ')' : ''}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </h5>
                                <h5 style={{ display: 'table' }}>
                                    <span>Plant Code</span>
                                    <div style={{ float: 'left' }}>{activeplantStr}</div>
                                    <div style={{ float: 'left' }}>
                                        <Popover content={contents} placement="bottom" trigger="click" className="th-info-icon">
                                            <InfoCircleFilled />
                                        </Popover>
                                    </div>
                                </h5>
                                <h5>
                                    <span>Division</span> <label>{activedivStr}</label>
                                </h5>
                                <table className="pdp-tbl">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '29%' }}>PDP Day</th>
                                            <th style={{ width: '32%' }}>
                                                Plant Code
                                                <Popover content={contents} placement="bottom" trigger="hover" className="th-info-icon">
                                                    <InfoCircleFilled />
                                                </Popover>
                                            </th>
                                            <th>Division</th>
                                        </tr>
                                    </thead>
                                </table>
                                <Collapse bordered={false} expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />} className="collapse-pdp-tbl">
                                    <Collapse.Panel key="1">
                                        <table className="pdp-tbl">
                                            <tbody>
                                                {upcomingSalesDetails?.length <= 0 && (
                                                    <tr>
                                                        <td style={{ width: '27%' }}>N/A</td>
                                                        <td style={{ width: '32%' }}>N/A</td>
                                                        <td>N/A</td>
                                                    </tr>
                                                )}
                                                {upcomingSalesDetails?.map((item, i) => {
                                                    if (item?.distribution_channel === 10) {
                                                        return (
                                                            <tr key={item.division}>
                                                                <td style={{ width: '29%' }}> {item ? item.pdp_day : 'Not Available'}</td>
                                                                <td style={{ width: '32%' }}>{item ? item.plant_name : 'Not Available'}</td>
                                                                <td>
                                                                    {item ? item.division_description : item ? item.division_description : 'Not Available'}/
                                                                    {item ? item.division : 'Not Available'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    }
                                                })}
                                            </tbody>
                                        </table>
                                    </Collapse.Panel>
                                </Collapse>
                            </div>
                        </div>
                        <div className="mobile-credit-bottom">
                            <ul>
                                <li>
                                    <span>Credit Limit (₹) :</span> <em> {CREDIT_LIMIT ? CREDIT_LIMIT : ''}</em>
                                </li>
                                <li>
                                    <span>Consumed (₹) :</span> <em>{AMOUNT ? (AMOUNT.split('-').length === 2 ? `${AMOUNT.split('-').join('')} (-)` : AMOUNT) : ''}</em>
                                </li>
                                {enablePromiseCredit && isInConsentWindow && (
                                    <li>
                                        <span>Required Credit (₹) :</span>{' '}
                                        <em>
                                            {creditDifference ? (creditDifference.split('-').length === 2 ? `${creditDifference.split('-').join('')} (-)` : creditDifference) : ''}
                                        </em>
                                        {creditDifference <= 0 && (
                                            <button className="promised-credit-consent-btn-sx" disabled={credit_details.SECOND_PROMISE_FLAG} onClick={openPromiseModal}>
                                                Provide Consent
                                            </button>
                                        )}
                                    </li>
                                )}

                                {enableReservedCredit &&
                                    hasFeaturePermission(pages.DASHBOARD, features.VIEW_RESERVED_CREDIT) &&
                                    (RESERVED_CREDIT ? (
                                        <li>
                                            <span> Reserved Credit (₹) :</span> <em> {RESERVED_CREDIT}</em>
                                        </li>
                                    ) : (
                                        <li>
                                            <span>
                                                <button className="reserved-credit-btn-sx" onClick={() => setShowReservedCreditModal(true)}>
                                                    Reserve Credit
                                                </button>
                                            </span>
                                        </li>
                                    ))}
                            </ul>
                        </div>
                    </div>
                    <div className="distributor-content-head">
                        <div className="purchase-order-title">
                            <div className="purchase-order-block1">
                                {/* <h3>Purchase Orders</h3> */}
                                <h5>{totalCount} records found</h5>
                            </div>
                            {((role && hasViewPermission(pages.DASHBOARD) && authorizeCreateOrderByAdmin) || !role) && (
                                <div className="purchase-order-block2">
                                    {activedivStr == '' || activedivStr == null || isDivision == true ? (
                                        <button type="submit" className="add-button-purchase" disabled="true" onClick={newSalesOrderHandler}>
                                            New Purchase Order
                                            <img src="/assets/images/plusIcon.svg" alt="" />
                                        </button>
                                    ) : (
                                        <button type="submit" className="add-button-purchase" onClick={newSalesOrderHandler}>
                                            New Purchase Order
                                            <img src="/assets/images/plusIcon.svg" alt="" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="dashboard-search-block">
                            <input
                                value={showSearch}
                                className="search-po-so"
                                onChange={(e) => {
                                    onSearch(e);
                                }}
                                type="text"
                                placeholder="Search by PO#, SO#"
                            />
                            <div
                                onClick={() => {
                                    resetPage();
                                }}>
                                <CloseCircleOutlined />
                            </div>
                        </div>

                        {/* changes for SOPE-47 */}
                        <div className="dashboard-search-block">
                            <RangePicker
                                allowClear={true}
                                className="search-po-so serch-date"
                                format="YYYY-MM-DD"
                                style={{
                                    right: '0',
                                    position: 'initial',
                                }}
                                placeholder={['Start SO', 'End SO']}
                                onChange={(value, ds) => handleDateChange(ds)}
                                disabledDate={(current) => moment() < current}
                            />
                        </div>
                        <div className="distributor-refresh-block">
                            {role && hasViewPermission(pages.DASHBOARD) ? (
                                <>
                                    <div className="refresh-block">
                                        <div style={{ display: 'flex' }}>
                                            <button type="submit" className="refresh-button" onClick={syncNow}>
                                                <>
                                                    Sync Now
                                                    <img src="/assets/images/refresh-icon.svg" alt="" />
                                                </>
                                            </button>
                                        </div>
                                        <p>Last Refresh : {lastSync ? Util.formatDateTime(lastSync) : ''}</p>
                                        <ServerTimer />
                                    </div>
                                </>
                            ) : (
                                ''
                            )}
                            {!role && (
                                <div className="refresh-block">
                                    <div style={{ display: 'flex' }}>
                                        <ServerTimer />
                                        <RefreshTimer lastSync={lastSync} setTimerEnd={(ended) => changeTimerState(ended)} />
                                    </div>
                                    <p>Last Refresh : {lastSync ? Util.formatDateTime(lastSync) : ''}</p>
                                    <ServerTimer />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="distributor-card-list">
                        {hasViewPermission(pages.DASHBOARD) &&
                            showDraft &&
                            formattedDraftData?.map((item, i) => {
                                const dateDiff = Util.diffOfDates(new Date(), new Date(item.po_date));
                                const availableDays = cartExpiryWindow - dateDiff + 1;
                                return (
                                    <React.Fragment key={`items-list-${i}`}>
                                        <div className="distributor-card-item">
                                            <div className="distributor-card-row">
                                                <div className="distributor-card-col-half">
                                                    <div className="po-info">
                                                        <b>PO #</b>
                                                        <span>{`${item.cart_number ? item.cart_number : 'CART'} ${
                                                            !isNaN(availableDays) && availableDays >= 0 ? `(Available for ${availableDays} days)` : ''
                                                        }`}</span>
                                                    </div>
                                                </div>
                                                <div className="distributor-card-col-half">
                                                    <div className="po-date">
                                                        <b>PO Date</b>
                                                        <span>-</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="distributor-card-row">
                                                <div className="distributor-card-col-half">
                                                    <div className="po-info">
                                                        <b>SO #</b>
                                                        <span>-</span>
                                                    </div>
                                                </div>
                                                <div className="distributor-card-col-half">
                                                    <div className="po-date">
                                                        <b>SO Date</b>
                                                        <span>-</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="distributor-card-row">
                                                <div className="distributor-card-col-half">
                                                    <div className="po-info">
                                                        <b>SO Value ( &#8377; )</b>
                                                        <span>-</span>
                                                    </div>
                                                </div>
                                                <div className="distributor-card-col-half">
                                                    <div className="po-info">
                                                        <b>Created By</b>
                                                        <span>
                                                            {item.created_by_user_group === 'SELF'
                                                                ? name
                                                                    ? name
                                                                    : ''
                                                                : (item.first_name ? item.first_name : '') + ' ' + (item.last_name ? item.last_name : '')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="distributor-card-row">
                                                <div className="distributor-card-col-half">
                                                    <div className="po-actions">
                                                        {!hasViewPermission(pages.DASHBOARD, features.NO_ACTIONS) &&
                                                            ((role && hasViewPermission(pages.DASHBOARD) && authorizeCreateOrderByAdmin) || !role) && (
                                                                <>
                                                                    <span className="cart-btn" onClick={() => DraftOrderHandler(item.po_number, item.product_type)}>
                                                                        <ShoppingCartOutlined /> ({item.order_data.Itemset.length})
                                                                    </span>
                                                                    {!getRole?.includes('SUPPORT') && (
                                                                        <span className="delete-btn" onClick={() => handleRemoveClick(i, item.po_number, item.distributor_id)}>
                                                                            <DeleteOutlined />
                                                                        </span>
                                                                    )}
                                                                </>
                                                            )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        {rushOrderDraftData?.map((item, i) => {
                            return (
                                <div key={item.po_number} className="distributor-card-item">
                                    <div className="distributor-card-row">
                                        <div className="distributor-card-col-half">
                                            <div className="po-info">
                                                <b>PO #</b>
                                                <span className="link-enable" onClick={(event) => getPODetails(event, item)}>
                                                    {item.po_number ? item.po_number : '-'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="distributor-card-col-half">
                                            <div className="po-date">
                                                <b>PO Date</b>
                                                <span>{item.po_date ? Util.formatDate(item.po_date) : '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* <div className='distributor-card-row'>
                    <div className='distributor-card-col-half'>
                      <div className='po-info'>
                        <b>SO #</b>
                        <span>-</span>
                      </div>
                    </div>
                    <div className='distributor-card-col-half'>
                      <div className='po-date'>
                        <b>SO Date</b>
                        <span>-</span>
                      </div>
                    </div>
                  </div> */}
                                    <div className="distributor-card-row">
                                        <div className="distributor-card-col-half">
                                            <div className="po-info">
                                                <b>Request Id.</b>
                                                <span>{item.request_number ?? '-'}</span>
                                            </div>
                                        </div>
                                        <div className="distributor-card-col-half">
                                            <div className="po-info">
                                                <b>Created By</b>
                                                <span>
                                                    {item.created_by_user_group === 'SELF'
                                                        ? name
                                                            ? name
                                                            : ''
                                                        : (item.first_name ? item.first_name : '') + ' ' + (item.last_name ? item.last_name : '')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="distributor-card-row">
                                        <div className="distributor-card-col-half">
                                            <div className="po-actions">
                                                <span
                                                    className={`
                              reorder-btn 
                              ${item.order_request_status === 'PENDING' ? 'or-pending' : ''} 
                              ${item.order_request_status === 'REJECTED' ? 'or-rejected' : ''}
                              ${item.order_request_status === 'EXPIRED' ? 'or-expired' : ''}`}>
                                                    {item.order_request_status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {formattedData.map((item, i) => {
                            let itemExisting = checkExisting(item);
                            return (
                                <React.Fragment key={`items-list-${i}`}>
                                    <div className="distributor-card-item">
                                        <label htmlFor={`po-items-${i}`}>
                                            {itemExisting && <input id={`po-items-${i}`} type="checkbox" checked onChange={(event) => exportExcelHandler(event, item, i)} />}
                                            {!itemExisting && <input id={`po-items-${i}`} type="checkbox" onChange={(event) => exportExcelHandler(event, item, i)} />}
                                            <span className="checkmark-box"></span>
                                        </label>
                                        <div className="distributor-card-row">
                                            <div className="distributor-card-col-half">
                                                <div className="po-info">
                                                    <b>PO #</b>
                                                    <span className="link-enable" onClick={(event) => getPODetails(event, item)}>
                                                        {item.po_number ? item.po_number : '-'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="distributor-card-col-half">
                                                <div className="po-date">
                                                    <b>PO Date</b>
                                                    <span>{item.po_date ? Util.formatDate(item.po_date) : '-'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="distributor-card-row">
                                            <div className="distributor-card-col-half">
                                                <div className="po-info">
                                                    <b>SO #</b>
                                                    {item.so_number ? (
                                                        <span
                                                            className="link-enable"
                                                            onClick={() =>
                                                                getOrderDetails(
                                                                    item.delivery_no,
                                                                    item.invoice_no,
                                                                    item.so_number,
                                                                    item.so_date,
                                                                    item.po_number,
                                                                    item.po_date,
                                                                    item.distributor_id,
                                                                )
                                                            }>
                                                            {item.so_number ? item.so_number : '-'}
                                                        </span>
                                                    ) : (
                                                        <span>{'-'}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="distributor-card-col-half">
                                                <div className="po-date">
                                                    <b>SO Date</b>
                                                    <span>{item.so_date ? Util.formatDate(item.so_date) : '-'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="distributor-card-row">
                                            <div className="distributor-card-col-half">
                                                <div className="po-info">
                                                    <b>SO Value ( &#8377; )</b>
                                                    <span>
                                                        {item.so_value || (
                                                            <Tooltip placement="right" className="icon-sync" title="SO Sync Pending">
                                                                <CloudSyncOutlined />
                                                            </Tooltip>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="distributor-card-col-half">
                                                <div className="po-info">
                                                    <b>Created By</b>
                                                    <span>
                                                        {item.created_by_user_group === 'SELF'
                                                            ? name
                                                                ? name
                                                                : ''
                                                            : (item.first_name ? item.first_name : '') + ' ' + (item.last_name ? item.last_name : '')}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="distributor-card-col-half">
                                                <div className="po-info">
                                                    <b>Order Status</b>
                                                    <span>{item.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="distributor-card-row">
                                            <div className="distributor-card-col-half">
                                                <div className="po-actions">
                                                    {!hasViewPermission(pages.DASHBOARD, features.NO_ACTIONS) &&
                                                        ((role && hasViewPermission(pages.DASHBOARD) && authorizeCreateOrderByAdmin) || !role) && (
                                                            <span
                                                                className="reorder-btn"
                                                                onClick={() => ReOrderHandler(item.so_number, item.product_type)}
                                                                hidden={
                                                                    !(
                                                                        !(isCentralARSEnabled && region_details?.ao_enable) &&
                                                                        item.order_type === 'NORMAL' &&
                                                                        region_details?.reg_enable &&
                                                                        !hasViewPermission(pages.DASHBOARD, features.NO_ACTIONS) &&
                                                                        !item.po_number.includes('LIQ') &&
                                                                        !item.po_number.includes('RO') &&
                                                                        !item.po_number.includes('CCO')
                                                                    )
                                                                }>
                                                                Re-Order
                                                            </span>
                                                        )}
                                                    {item?.rush_status && !hasViewPermission(pages.DASHBOARD, features.NO_ACTIONS) && (
                                                        <span
                                                            className={`
                          reorder-btn 
                          ${item.rush_status === 'PENDING' ? 'or-pending' : ''} 
                          ${item.rush_status === 'REJECTED' ? 'or-rejected' : ''}
                          ${item.rush_status === 'EXPIRED' ? 'or-expired' : ''}
                          ${item.rush_status === 'APPROVED' ? 'or-approved' : ''}`}>
                                                            {item.rush_status}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                    <div className="btn-download">
                        {exportedList && exportedList.length ? (
                            <button onClick={downloadDataHandler}>
                                <DownloadOutlined />
                            </button>
                        ) : (
                            <button disabled>
                                <DownloadOutlined />
                            </button>
                        )}
                        {downloadReady && <ExportSoModal visible={isModalVisible} onCancel={handleCancel} soData={downloadData} />}
                    </div>
                    {/* <footer className='distributor-mobile-pagination'>
            <Paginator
              data={orderData ? orderData : []}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              itemsCount={orderData ? orderData.length : 0}
              setModifiedData={(modifiedData) => {
                setFormattedData(modifiedData);
              }}
            />
          </footer> */}
                </div>
            )}
            {!role && distributorId && !distributorId.includes(distributor_code.current) && regionDetails && regionDetails.noc_enable && (
                <DeclarationModal visible={isDeclarationModalVisible} onAgree={handleAgree} onDisagree={handleDisagree} closable={false} />
            )}
            <CfaSurveyModal
                isVisible={isCfaSurveyOpen}
                onCancel={() => setIsCfaSurveyOpen(false)}
                isSurveyLinkVisible={isSurveyLinkOpen}
                handleSurveyLinkCancel={() => setIsSurveyLinkOpen(false)}
                surveyLink={surveyLink}
                linkSurveyData={linkSurveyData}
            />
            {!role &&
                !hasSurveyResponse?.includes(distributor_code.current) &&
                applicableDistributors?.includes(distributor_code.current) &&
                (surveyEndDate ? new Date() <= new Date(surveyEndDate) : true) && <SurveyModal visible={isSurveyModalVisible} onSurveySubmit={handleSurveySubmit} />}
            <ReservedCredit
                visible={showReservedCreditModal}
                onReservedCreditCancel={() => setShowReservedCreditModal(false)}
                onReservedCreditSubmit={handleReservedCreditSubmit}
                creditLimit={CREDIT_LIMIT}
                availableCredit={availableCredit}
                getRole={getRole}
            />

            {creditDifference <= 0 && (
                <PromisedCreditModal
                    isPromiseModalOpen={handleCloseModal}
                    visible={isPromiseModalOpen}
                    onCancel={handleCloseModal}
                    setHandleCredit={handlePromiseCreditSubmitted}
                    creditData={creditData}
                    setCreditDifference={creditDifference}
                    distributorId={props.location.state && props.location.state.distributorId ? props.location.state.distributorId : login_id}
                    promiseCreditData={promiseCreditData}
                    setPromiseFlag={false}
                />
            )}
        </>
    );
};

const PdpComp = ({ activeDivStr, salesDetails }) => {
    const [content, setContent] = useState([]);
    useEffect(() => {
        let final_div = [];
        let finalArr = [];
        if (activeDivStr !== 'N/A' && activeDivStr !== '') {
            final_div = activeDivStr.includes('/') ? activeDivStr?.split('/') : new Array(activeDivStr);
            final_div.sort((a, b) => a - b);
            for (const element of final_div) {
                const sales = salesDetails?.find((item) => item?.division == element && (item?.distribution_channel === 10 || item?.distribution_channel === 90));
                finalArr.push({
                    pdp: sales?.pdp_day || 'N/A',
                    plant: sales?.plant_name,
                    div: `${sales?.division_description}/${element}`,
                });
            }
        } else {
            finalArr.push({
                pdp: 'N/A',
                plant: 'N/A',
                div: 'N/A',
            });
        }

        setContent(finalArr);
    }, [activeDivStr, salesDetails]);
    return (
        <>
            <table className="pdp-tbl">
                <thead>
                    <tr>
                        <th style={{ width: '27%' }}>PDP Day (Active)</th>
                        <th style={{ width: '32%' }}>
                            Plant Code!
                            <Popover content={contents} placement="bottom" trigger="hover" className="th-info-icon">
                                <InfoCircleFilled />
                            </Popover>
                        </th>
                        <th>Division</th>
                    </tr>
                </thead>
            </table>
            <Collapse bordered={false} expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />} className="collapse-pdp-tbl">
                <Collapse.Panel>
                    <table className="pdp-tbl">
                        <tbody>
                            {content?.map((item) => (
                                <tr key={item.div}>
                                    <td style={{ width: '27%' }}>{item.pdp === undefined ? 'N/A' : item.pdp}</td>
                                    <td style={{ width: '32%' }}>{item.plant === undefined ? 'N/A' : item.plant}</td>
                                    <td>{item.div === undefined ? 'N/A' : item.div}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Collapse.Panel>
            </Collapse>
        </>
    );
};

Dashboard.propTypes = {
    order_list: PropTypes.shape({
        data: PropTypes.array,
        drafts: PropTypes.array,
        rushDrafts: PropTypes.array,
        totalCount: PropTypes.number,
        sync: PropTypes.bool,
        lastSync: PropTypes.string,
    }),
    credit_details: PropTypes.shape({
        AMOUNT: PropTypes.string,
        CREDIT_LIMIT: PropTypes.string,
        RESERVED_CREDIT: PropTypes.string,
    }),
    history: PropTypes.object.isRequired,
    insertReservedCredit: PropTypes.func.isRequired,
};

PdpComp.propTypes = {
    activeDivStr: PropTypes.string,
    salesDetails: PropTypes.array,
};

const mapStateToProps = (state) => {
    return {
        credit_details: state.dashboard.get('credit_details'),
        order_list: state.dashboard.get('order_list'),
        region_details: state.dashboard.get('region_details'),
        app_level_configuration: state.auth.get('app_level_configuration'),
        pdp_windows: state.auth.get('pdp_windows'),
        sso_user_details: state.admin.get('sso_user_details'),
        admin_switched_to_distributor: state.admin.get('admin_switched_to_distributor'),
        report_issues: state.admin.get('report_issues'),
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        getMaintenanceRequests: (history) => dispatch(Actions.getMaintenanceRequests(history)),
        getAllMaterials: (login_id, isNourishCo) => dispatch(Action.getAllMaterials(login_id, isNourishCo)),
        getPODetails: (id, distributor_id) => dispatch(Action.getPODetails(id, distributor_id)),
        getRegionDetails: (id) => dispatch(Action.getRegionDetails(id)),
        getOrderList: (data) => dispatch(Action.getOrderList(data)),
        getReOrderDetails: (so_number, distributorId) => dispatch(Action.getReOrderDetails(so_number, distributorId)),
        getCreditLimitDetails: (login_id) => dispatch(Action.getCreditLimitDetails(login_id)),
        getMultipleSalesOrderDetails: (data, distributorId) => dispatch(Action.getMultipleSalesOrderDetails(data, distributorId)),
        soSync: (loginId) => dispatch(Actions.soSync(loginId)),
        logAppIssue: (data) => dispatch(ErrorAction.logAppIssue(data)),
        fetchAppLevelConfiguration: () => dispatch(AuthAction.fetchAppLevelSettings()),
        deleteDraft: (po_number, distributor_id) => dispatch(Action.deleteDraft(po_number, distributor_id)),
        getDraftOrderDetails: (po_number, distributorId) => dispatch(Action.getDraftOrderDetails(po_number, distributorId)),
        removeExpiredCarts: (distributorId) => dispatch(Action.removeExpiredCarts(distributorId)),
        distributorResetCreateOrderCompleteFormFields: () => dispatch(OrderAction.distributorResetCreateOrderCompleteFormFields()),
        adminSetSwitchToDistributor: (distributorId) => dispatch(Actions.adminSetSwitchToDistributor(distributorId)),
        getSSODetails: (emailId, history) => dispatch(Actions.getSSODetails(emailId, history)),
        get_cfa_questions: (data) => dispatch(AuthAction.get_cfa_questions(data)),
        insertReservedCredit: (data) => dispatch(Action.insertReservedCredit(data)),
        promiseCredit: (data) => dispatch(Actions.promiseCredit(data)),
        getPDPWindows: (regionId) => dispatch(Actions.getPDPWindow(regionId)),
        pdpWindows: (data) => dispatch(Actions.pdpWindows(data)),
        fetchArsConfigurations: (categoryArr) => dispatch(Actions.fetchArsConfigurations(categoryArr)),
        fetchServiceLevelCategory: (type) => dispatch(adminAction.fetchServiceLevelCategory(type)),
        saveNocResponse: (data) => dispatch(AuthAction.saveNocResponse(data)),
        fetchDistributorAgreements: () => dispatch(AuthAction.fetchDistributorAgreements()),
        getSessionsLog: (data) => dispatch(adminAction.getSessionsLog(data)),
        invalidateOtherSessions: (data) => dispatch(adminAction.invalidateOtherSessions(data)),
        submitSurvey: (data) => dispatch(AuthAction.submitSurvey(data)),
        fetchSurveyResponse: () => dispatch(AuthAction.fetchSurveyResponse()),
    };
};

const ConnectDashboard = connect(mapStateToProps, mapDispatchToProps)(Dashboard);

export default ConnectDashboard;
