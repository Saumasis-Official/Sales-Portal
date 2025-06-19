import React, { useEffect, useState, useRef } from 'react';
import { connect } from 'react-redux';
import { notification, Tooltip, Select, Modal } from 'antd';
import { CheckCircleOutlined, InfoCircleOutlined, CloseCircleOutlined, EyeOutlined, ProfileOutlined } from '@ant-design/icons';
import _ from 'lodash';
import debounce from 'lodash.debounce';
import LocalAuth from '../../util/middleware/auth';
import Panigantion from '../../components/Panigantion';
import * as Action from './actions/adminAction';
import * as Actions from '../../services/admin/actions/adminAction';
import CommentModal from './CommentModal/CommentModal';
import MassEditCommentModal from './CommentModal/MassEditCommentModal';
import CommentListModal from './CommentModal/CommentListModal';
import DistributorMoqModal from './DistributorMoqModal/DistributorMoqModal';
import '../../style/admin/Dashboard.css';
import useAuth from '../auth/hooks/useAuth';
import config from '../../config/server';
import EditDistributorContactModal from './EditDistributorModal/EditDistributorModal';
import './EditDistributorModal/EditDistributorModal.css';
import { Hub } from 'aws-amplify';
import Loader from '../../components/Loader';
import './DashboardButton.css';
import { pages, features, hasViewPermission, hasEditPermission, hasFeaturePermission } from '../../persona/distributorNav.js';
import Util from '../../util/helper/index';
import PDPUnlockModal from './PDPUnlockRequest/RequestModal.js';
import * as DistAction from '../distributor/action';
import useWindowDimensions from '../../hooks/useWindowDimensions';

const { Option } = Select;
const { fromDate, toDate } = Util.activeSessionToAndFromTimestamp();

let Admindashboard = (props) => {
    const browserHistory = props.history;
    const { width } = useWindowDimensions();
    const {
        alert_comment_list,
        distributor_list,
        getDistributorList,
        getAlertCommentList,
        getSSODetails,
        sso_user_details,
        updateDistributorSetting,
        updateMassDistributorSetting,
        updateDistributorMobile,
        updateDistributorEmail,
        loaderShowHide,
        getMaintenanceRequests,
        dashboardFilterCategories,
        getDbMoqDetails,
        db_moq_details,
        insertAdminSession,
        inserPdpUnlockRequest,
        getAppSettingList,
        setFilterState,
        filterState,
        getSessionsLog,
        invalidateOtherSessions,
        setCorrelationId,
        insertApprovedPdpUnlockRequest,
    } = props;

    const [tableDatas, setTableDatas] = useState([]);
    const [orignalValue, setOrignalValue] = useState([]);
    const [isRowEdit, setIsRowEdit] = useState(-1);
    const [offset, setOffset] = useState(0);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState('');
    const [pageNo, setPageNo] = useState(1);
    const [showSearch, setShowSearch] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isMassEditModalVisible, setIsMassEditModalVisible] = useState(false);
    const [enableViewComment, setEnableViewComment] = useState(false);
    const [commentId, setCommentId] = useState('');
    const [distributor_ids, setdistributor_ids] = useState('');
    // const [tseCode] = useState(sso_user_details.data && (sso_user_details.data[0].code))
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [status, setStatus] = useState('ACTIVE');
    const [ssoRole, setSsoRole] = useState('');
    const [edit, setEdit] = useState(false);
    const [checked, setChecked] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const [areaDetails, setAreaDetails] = useState();
    const [customerGroups, setCustomerGroups] = useState(filterState.customerGroups ?? []);
    const [states, setStates] = useState(filterState.states ?? []);
    const [regions, setRegions] = useState(filterState.regions ?? []);
    const [areaCodes, setAreaCodes] = useState(filterState.areaCodes ?? []);
    const [plants, setPlants] = useState(filterState.plants ?? []);
    const [distChannels, setDistChannels] = useState(filterState.distChannels ?? []);

    const [selectedCustomerGroups, setSelectedCustomerGroups] = useState(filterState.selectedCustomerGroups ?? []);
    const [selectedStates, setSelectedStates] = useState(filterState.selectedStates ?? []);
    const [selectedRegions, setSelectedRegions] = useState(filterState.selectedRegions ?? []);
    const [selectedAreaCodes, setSelectedAreaCodes] = useState(filterState.selectedAreaCodes ?? []);
    const [selectedPlants, setSelectedPlants] = useState(filterState.selectedPlants ?? []);
    const [selectedDistChannels, setSelectedDistChannels] = useState(filterState.selectedDistChannels ?? []);

    const [isMoqModalVisible, setIsMoqModalVisible] = useState(false);
    const [selectedDistributors, setSelectedDistributors] = useState([]);
    const [selectedDBRegions, setSelectedDBRegions] = useState([]);
    const [selectedDBAreas, setSelectedDBAreas] = useState([]);
    const [isPDPUnlockModalVisible, setIsPDPUnlockModalVisible] = useState(false);
    const [enablePdpCheckbox, setEnablePdpCheckbox] = useState(false);
    const [isEditingPdp, setIsEditingPdp] = useState(false);
    const [pdpApprovers, setPdpApprovers] = useState([]);
    const [pdpUnlockConfirmText, setPdpUnlockConfirmText] = useState('');
    const [pdpUnlockWindow, setPdpUnlockWindow] = useState(7);
    const [activeSessions, setActiveSessions] = useState([]);
    const [windowSize, setWindowSize] = useState({
        width: undefined,
        height: undefined,
    });
    const originalDashboardFilters = useRef({});

    const isPDPUnlockSelectAll = useRef(false);

    const redirect_url = window.localStorage.getItem('REDIRECT_URL');
    const redirect_params = window.localStorage.getItem('REDIRECT_PARAMS');
    const credit_limit_redirect_params = window.localStorage.getItem('CREDIT_LIMIT_REDIRECT_PARAMS');
    const disableValues = ['MT Exclusive Distrs', 'Inst.Business Distrs', 'Vending Sales', 'Foods Service', 'SAMT Dist (Metro)', 'SAMT Dist (Non-Metro'];

    const adminRole = LocalAuth.getAdminRole();
    const dashboardFilter = () => {
        dashboardFilterCategories()
            .then((res) => {
                originalDashboardFilters.current = _.cloneDeep(res.response);

                setAreaDetails(res.response.area_details);
            })
            .catch((error) => {
                console.error('Error fetching dashboard filter categories:', error);
            });
    };

    async function fetchSessionLog(email, correlation_id) {
        const sessionPayload = {
            from: fromDate,
            to: toDate,
            type: 'active',
            login_id: email,
        };
        const { data } = await getSessionsLog(sessionPayload);
        if (data?.success) {
            checkActiveSessions(data?.data?.result || [], correlation_id);
            setActiveSessions(data?.data?.result || []);
        }
    }

    function checkActiveSessions(actSessions, correlation_id) {
        let hasPreviousActiveSessions = false;
        actSessions.forEach((session) => {
            if (session.correlation_id !== correlation_id) {
                hasPreviousActiveSessions = true;
            }
        });
        if (!hasFeaturePermission(pages.DASHBOARD, features.MULTIPLE_SESSIONS) && hasPreviousActiveSessions) {
            // Invalidating other sessiongs if multiple sessions are not allowed, previously confirmation modal was shown
            // but now as per new bussiness requirement, other sessions will be invalidated without confirmation.
            // sessionConfirm();
            // handleOtherSessionsLogout(); // Commented this to disable the multiple session restriction feature
        }
    }

    useEffect(() => {
        let filteredAreaDetails = areaDetails || [];

        if (selectedCustomerGroups && selectedCustomerGroups.length > 0) {
            filteredAreaDetails = filteredAreaDetails.filter((item) => selectedCustomerGroups.includes(item.customer_groups));
        }
        if (selectedRegions && selectedRegions.length > 0) {
            filteredAreaDetails = filteredAreaDetails.filter((item) => selectedRegions.includes(item.region));
        }
        if (selectedStates && selectedStates.length > 0) {
            filteredAreaDetails = filteredAreaDetails.filter((item) => selectedStates.includes(item.state));
        }
        if (selectedAreaCodes && selectedAreaCodes.length > 0) {
            filteredAreaDetails = filteredAreaDetails.filter((item) => selectedAreaCodes.includes(item.area_code));
        }
        if (selectedPlants && selectedPlants.length > 0) {
            filteredAreaDetails = filteredAreaDetails.filter((item) => selectedPlants.includes(item.plant_code));
        }
        if (selectedDistChannels && selectedDistChannels.length > 0) {
            filteredAreaDetails = filteredAreaDetails.filter((item) => selectedDistChannels.includes(item.distribution_channel));
        }
        let newRegions = [],
            newStates = [],
            newAreaCodes = [],
            newPlants = [],
            newDistChannels = [],
            newCustomerGroups = [];

        if (filteredAreaDetails) {
            newRegions = [...new Set(filteredAreaDetails.filter((item) => item.region).map((item) => item.region))];
            newStates = [...new Set(filteredAreaDetails.filter((item) => item.state).map((item) => item.state))];
            newAreaCodes = [...new Set(filteredAreaDetails.filter((item) => item.area_code).map((item) => item.area_code))];
            newPlants = [...new Set(filteredAreaDetails.filter((item) => item.plant_code).map((item) => item.plant_code))];
            newDistChannels = [...new Set(filteredAreaDetails.filter((item) => item.distribution_channel).map((item) => item.distribution_channel))];
            newCustomerGroups = [...new Set(filteredAreaDetails.filter((item) => item.customer_groups).map((item) => item.customer_groups))];
        }

        if (!selectedRegions || selectedRegions.length === 0) setRegions(newRegions);
        if (!selectedStates || selectedStates.length === 0) setStates(newStates);
        if (!selectedAreaCodes || selectedAreaCodes.length === 0) setAreaCodes(newAreaCodes);
        if (!selectedPlants || selectedPlants.length === 0) setPlants(newPlants);
        if (!selectedDistChannels || selectedDistChannels.length === 0) setDistChannels(newDistChannels);
        if (!selectedCustomerGroups || selectedCustomerGroups.length === 0) setCustomerGroups(newCustomerGroups);

        const filterValues = {
            selectedCustomerGroups,
            selectedStates,
            selectedRegions,
            selectedAreaCodes,
            selectedPlants,
            customerGroups,
            regions,
            states,
            areaCodes,
            plants,
            selectedDistChannels,
            distChannels,
        };
        setFilterState(filterValues);
    }, [selectedRegions, selectedStates, selectedAreaCodes, selectedCustomerGroups, selectedPlants, areaDetails, selectedDistChannels]);

    useEffect(() => {
        setPageNo(1);
    }, [selectedCustomerGroups, selectedStates, selectedRegions, selectedAreaCodes, selectedPlants, selectedDistChannels]);

    let adminAccessDetail = LocalAuth.getAdminAccessDetails();
    const adminAccessToken = LocalAuth.getAdminAccessToken();
    let isChecked = {
        enable_login: false,
        enable_po_so_email: false,
        enable_po_so_sms: false,
        enable_invoice_sync_email: false,
        enable_invoice_sync_sms: false,
        sms_tse_asm: false,
        email_tse_asm: false,
        enable_liquidation: false,
        enable_pdp: false,
        enable_ao: false,
        enable_reg: false,
        enable_ro: false,
        enable_bo: false,
        enable_aos: false,
        enable_noc: false,
        enable_delivery_code_email: false,
        enable_delivery_code_sms: false,
    };
    let message = '';

    const debouncedSave = useRef(debounce((nextValue) => setSearch(nextValue), 500)).current;

    useEffect(() => {
        redirectFromDashboard();
    }, [sso_user_details, customerGroups, states, regions, areaCodes, distChannels]);

    useEffect(() => {
        getMaintenanceRequests(props.history);
        props.adminSetSwitchToDistributor(null);
    }, []);

    useEffect(() => {
        async function fetchAppSettings() {
            const res = await getAppSettingList();
            if (res.data) {
                const approvers = res.data.find((item) => item.key === 'PDP_APPROVERS');
                const confirmText = res.data.find((item) => item.key === 'PDP_UNLOCK_CONFIRM_TEXT')['value'];
                const pdpWindow = res.data.find((item) => item.key === 'PDP_UNLOCK_WINDOW')['value'] || 7;
                if (approvers?.value) {
                    setPdpApprovers(
                        approvers.value
                            .split(',')
                            .filter((o) => o.trim().length > 8)
                            .map((o) => o.trim().toLowerCase()),
                    );
                }
                setPdpUnlockConfirmText(confirmText);
                setPdpUnlockWindow(pdpWindow);
            }
        }

        if (adminRole.length > 0 && pdpApprovers.length === 0) {
            fetchAppSettings();
        }
    }, [adminRole]);

    useEffect(() => {
        setTableDatas(distributor_list.data && distributor_list.data.rows);
        setOrignalValue(_.cloneDeep(distributor_list.data && distributor_list.data.rows));
    }, [distributor_list.data && distributor_list.data.rows]);

    Hub.listen('auth', ({ payload: { event, data } }) => {
        switch (event) {
            case 'signIn':
                if (data) {
                    const emailId = data?.username.replace(process.env.REACT_APP_COGNITO_IDP_NAME, '');
                    window.localStorage.setItem('email', emailId);
                    window.localStorage.setItem('TCPL_SSOUserDetail', JSON.stringify(data));
                    window.localStorage.setItem('TCPL_SSO_token', JSON.stringify(data.signInUserSession.accessToken.jwtToken));
                    if (!window.localStorage.getItem('TCPL_SSO_at')) {
                        window.localStorage.setItem('TCPL_SSO_at', Date.now());
                    }
                    let correlationId = Util.createUUID();
                    window.localStorage.setItem('TCPL_correlation_id', correlationId);
                    setCorrelationId(correlationId);
                    fetchSessionLog(emailId, correlationId);
                    getSSODetails(emailId, props.history, true);
                    insertAdminSession(correlationId);
                    browserHistory.push('/admin/dashboard');
                }
                break;
            case 'signOut':
                break;
            default:
        }
    });
    useAuth({
        provider: config.sso_login.provider,
        options: {
            userPoolId: config.sso_login.userPoolId,
            userPoolWebClientId: config.sso_login.userPoolWebClientId,
            oauth: {
                domain: config.sso_login.domain,
                scope: config.sso_login.scope,
                redirectSignIn: config.sso_login.redirectSignIn,
                redirectSignOut: config.sso_login.redirectSignOut,
                region: config.sso_login.region,
                responseType: config.sso_login.responseType,
            },
        },
    });

    const handleSessionLogout = () => {
        browserHistory.push('/logout');
    };

    const handleOtherSessionsLogout = async () => {
        const session_id = window.localStorage.getItem('TCPL_correlation_id');
        const invalidatePayload = {
            fromDate,
            toDate,
            sessionId: session_id,
        };
        const invalidateSessionResponse = await invalidateOtherSessions(invalidatePayload);
        if (invalidateSessionResponse?.success) {
            notificationSender(true, 'Success', 'Logged out of other sessions successfully.');
        } else {
            notificationSender(false, 'Error', 'Failed to logout from other sessions. Hence logging out from this session.');
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

    function redirectFromDashboard() {
        if (sso_user_details?.data?.length) {
            let role = sso_user_details.data[0].roles;
            let user_id = sso_user_details.data[0].user_id;
            window.localStorage.setItem('user_id', user_id);
            let email = sso_user_details.data[0].email;
            window.localStorage.setItem('email', email);
            setSsoRole(role);
            let trans_id = JSON.parse(window.localStorage.getItem('CREDIT_LIMIT_REDIRECT_PARAMS'));
            let gt_trans_id = JSON.parse(window.localStorage.getItem('GT_CREDIT_LIMIT_REDIRECT_PARAMS'));
            if (!hasViewPermission(pages.DASHBOARD)) {
                const redirect = {
                    CFA: '/admin/cfa-so-requests',
                    LOGISTIC_OFFICER: '/admin/cfa-so-requests',
                    ZONAL_OFFICER: '/admin/cfa-so-requests',
                    MDM: '/admin/mdm-dashboard',
                    KAMS: '/admin/mdm-dashboard',
                    SHOPPER_MARKETING: '/admin/rules-configuration',
                    FINANCE: '/admin/finance-details',
                    VP: '/admin/pdp-unlock-requests',
                    SHOPIFY_UK: '/admin/shopify-dashboard',
                    SHOPIFY_SUPPORT: '/admin/shopify-dashboard',
                    SHOPIFY_OBSERVER: '/admin/shopify-dashboard',
                    FINANCE_CONTROLLER: '/admin/finance-controller-details',
                    CL_PRIMARY_APPROVER: trans_id ? `/admin/cl-order-request/${trans_id?.transaction_id}` : '/admin/credit-dashboard',
                    CL_SECONDARY_APPROVER: trans_id ? `/admin/cl-order-request/${trans_id?.transaction_id}` : '/admin/credit-dashboard',
                    RCM: '/admin/credit-dashboard',
                    HOF: '/admin/credit-dashboard',
                    GT_PRIMARY_APPROVER: gt_trans_id ? `/admin/cl-gt-request/${gt_trans_id?.transaction_id}` : '/admin/credit-dashboard',
                    GT_SECONDARY_APPROVER: gt_trans_id ? `/admin/cl-gt-request/${gt_trans_id?.transaction_id}` : '/admin/credit-dashboard',
                };
                const currRole = role.find((r) => redirect[r]); //Picking random role to navigate
                redirect[currRole] && browserHistory.push(redirect[currRole]);
            }
        }
    }

    const notificationSender = (success, message, description) => {
        if (success) {
            notification.success({
                message: message,
                description: description,
                duration: 3,
                className: 'notification-green',
            });
        } else {
            notification.error({
                message: message,
                description: description,
                duration: 3,
                className: 'notification-error',
            });
        }
    };

    const checkboxEmailHandler = (code, value, index, type) => {
        if (isRowEdit === -1 || isRowEdit === index || (type === 'enable_pdp' && isEditingPdp)) {
            tableDatas.map((data) => {
                if (data.id === code) {
                    data[type] = !value;
                }
            });
            setTableDatas([...tableDatas]);
            setIsRowEdit(index);
        } else {
            notificationSender(false, 'Error', 'Please save the changes first');
        }
    };

    useEffect(() => {
        let isArrayEqual = function (x, y) {
            return _(x).differenceWith(y, _.isEqual).isEmpty();
        };
        let result = isArrayEqual(tableDatas, orignalValue);
        if (result) {
            setIsRowEdit(-1);
        }
    }, [tableDatas]);

    const saveHandler = (id) => {
        let data = tableDatas?.filter((d) => d.id === id)[0];
        let originalData = orignalValue?.filter((d) => d.id === id)[0];
        if (data['enable_ao'] === false && data['enable_reg'] === false) {
            notificationSender(false, 'Error', 'Both ARS and Regular cannot be off any distributor');
        } else if (!hasEditPermission(pages.DASHBOARD, features.PDP_LOCK_BYEPASS) && data['enable_pdp'] === false && originalData['enable_pdp'] === true) {
            if (!pdpApprovers.length) {
                notificationSender(false, 'Error', 'PDP Unlock Request Approvers are not set. Please contact admin.');
            } else {
                setSelectedDistributors((p) => (data.id ? [id] : []));
                setSelectedDBAreas((p) => (data.area_code ? [data.area_code] : []));
                setSelectedDBRegions((p) => (data.region ? [data.region] : []));
                setIsPDPUnlockModalVisible(true);
            }
        } else {
            setCommentId(id);
            setIsModalVisible(true);
        }
    };

    const showMassEditModal = () => {
        let ids = tableDatas.map((data) => data.id);
        setdistributor_ids(ids);
        setIsMassEditModalVisible(true);

        if (message !== null && undefined && '') {
            isChecked.enable_login = document.getElementById('enable_login').checked = false;
            isChecked.enable_po_so_email = document.getElementById('enable_po_so_email').checked = false;
            isChecked.enable_po_so_sms = document.getElementById('enable_po_so_sms').checked = false;
            isChecked.enable_invoice_sync_email = document.getElementById('enable_invoice_sync_email').checked = false;
            isChecked.enable_invoice_sync_sms = document.getElementById('enable_invoice_sync_sms').checked = false;
            isChecked.sms_tse_asm = document.getElementById('sms_tse_asm').checked = false;
            isChecked.email_tse_asm = document.getElementById('email_tse_asm').checked = false;
            isChecked.enable_liquidation = document.getElementById('enable_liquidation').checked = false;
            isChecked.enable_pdp = document.getElementById('enable_pdp').checked = false;
            isChecked.enable_ao = document.getElementById('enable_ao').checked = false;
            isChecked.enable_reg = document.getElementById('enable_reg').checked = false;
            isChecked.enable_ro = document.getElementById('enable_ro').checked = false;
            isChecked.enable_bo = document.getElementById('enable_bo').checked = false;
            isChecked.enable_aos = document.getElementById('enable_aos').checked = false;
            isChecked.enable_noc = document.getElementById('enable_noc').checked = false;
            isChecked.enable_delivery_code_email = document.getElementById('enable_delivery_code_email').checked = false;
            isChecked.enable_delivery_code_sms = document.getElementById('enable_delivery_code_sms').checked = false;
            setChecked(false);
        }
    };
    const handleChange = (e) => {
        // setLimit(-1);
        setEdit(!edit);
        setIsEditMode(true);
        const val = e.target.value;
        if (val === 'Cancel') {
            setIsEditMode(false);
            setChecked(false);
            isChecked.enable_po_so_email = document.getElementById('enable_po_so_email').checked = false;
            isChecked.enable_po_so_sms = document.getElementById('enable_po_so_sms').checked = false;
            isChecked.enable_invoice_sync_email = document.getElementById('enable_invoice_sync_email').checked = false;
            isChecked.enable_invoice_sync_sms = document.getElementById('enable_invoice_sync_sms').checked = false;
            isChecked.sms_tse_asm = document.getElementById('sms_tse_asm').checked = false;
            isChecked.email_tse_asm = document.getElementById('email_tse_asm').checked = false;
            isChecked.enable_liquidation = document.getElementById('enable_liquidation').checked = false;
            isChecked.enable_ao = document.getElementById('enable_ao').checked = false;
            isChecked.enable_reg = document.getElementById('enable_reg').checked = false;
            isChecked.enable_ro = document.getElementById('enable_ro').checked = false;
            isChecked.enable_bo = document.getElementById('enable_bo').checked = false;
            isChecked.enable_aos = document.getElementById('enable_aos').checked = false;
            isChecked.enable_noc = document.getElementById('enable_noc').checked = false;
            isChecked.enable_delivery_code_email = document.getElementById('enable_delivery_code_email').checked = false;
            isChecked.enable_delivery_code_sms = document.getElementById('enable_delivery_code_sms').checked = false;

            getDistributorList({
                offset,
                limit,
                search,
                status,
                customer_group: selectedCustomerGroups,
                state: selectedStates,
                region: selectedRegions,
                areaCode: selectedAreaCodes,
                plantCode: selectedPlants,
                dist_channel: selectedDistChannels,
            });
        }
    };

    const showModal = (data) => {
        setIsEditModalVisible(data);
    };

    const handleEditDistributorCancelModal = () => {
        setIsEditModalVisible(false);
    };

    const updatedData = (msg) => {
        let finalObj = tableDatas.filter(function (obj) {
            return obj.id === commentId;
        })[0];
        let orignalObj = orignalValue.filter(function (orVal) {
            return orVal.id === commentId;
        })[0];

        let updateObj = {};
        _.forEach(orignalObj, function (value, key) {
            if (value !== finalObj[key]) {
                updateObj[key] = finalObj[key];
            }
        });
        let obj = {
            ...updateObj,
            remarks: msg,
        };

        updateDistributorSetting(obj, commentId)
            .then((res) => {
                getDistributorList({
                    offset,
                    limit,
                    search,
                    status,
                    customer_group: selectedCustomerGroups,
                    state: selectedStates,
                    region: selectedRegions,
                    areaCode: selectedAreaCodes,
                    plantCode: selectedPlants,
                    dist_channel: selectedDistChannels,
                });
                if (res.success) {
                    setIsRowEdit(-1);
                    setCommentId('');
                    notificationSender(true, 'Success', 'Updated Successfully !');
                } else {
                    setIsRowEdit(-1);
                    setCommentId('');
                    notificationSender(false, 'Error', res.message);
                }
            })
            .catch((error) => {
                notificationSender(false, 'Error', 'Error while updating');
            });
    };
    const updatedDataMassEdit = (msg) => {
        message = msg;
        let updateObj = {};
        let isArsRegularFalse = false;

        const enablePdpCheckbox = document.getElementById('enable_pdp');

        if (enablePdpCheckbox) {
            updateObj = { enable_pdp: enablePdpCheckbox.checked };
        }
        if (edit && !selectedDistributors.length) {
            for (let i = 0; i < tableDatas.length; i++) {
                if (tableDatas[i].enable_login !== orignalValue[i].enable_login) {
                    updateObj = {
                        ...updateObj,
                        enable_login: tableDatas[i].enable_login,
                    };
                }
                if (tableDatas[i].enable_po_so_email !== orignalValue[i].enable_po_so_email) {
                    updateObj = {
                        ...updateObj,
                        enable_po_so_email: tableDatas[i].enable_po_so_email,
                    };
                }
                if (tableDatas[i].enable_po_so_sms !== orignalValue[i].enable_po_so_sms) {
                    updateObj = {
                        ...updateObj,
                        enable_po_so_sms: tableDatas[i].enable_po_so_sms,
                    };
                }
                if (tableDatas[i].sms_tse_asm !== orignalValue[i].sms_tse_asm) {
                    updateObj = {
                        ...updateObj,
                        sms_tse_asm: tableDatas[i].sms_tse_asm,
                    };
                }
                if (tableDatas[i].email_tse_asm !== orignalValue[i].email_tse_asm) {
                    updateObj = {
                        ...updateObj,
                        email_tse_asm: tableDatas[i].email_tse_asm,
                    };
                }
                if (tableDatas[i].enable_invoice_sync_email !== orignalValue[i].enable_invoice_sync_email) {
                    updateObj = {
                        ...updateObj,
                        enable_invoice_sync_email: tableDatas[i].enable_invoice_sync_email,
                    };
                }
                if (tableDatas[i].enable_invoice_sync_sms !== orignalValue[i].enable_invoice_sync_sms) {
                    updateObj = {
                        ...updateObj,
                        enable_invoice_sync_sms: tableDatas[i].enable_invoice_sync_sms,
                    };
                }
                if (tableDatas[i].email_tse_asm !== orignalValue[i].email_tse_asm) {
                    updateObj = {
                        ...updateObj,
                        email_tse_asm: tableDatas[i].email_tse_asm,
                    };
                }
                if (tableDatas[i].enable_liquidation !== orignalValue[i].enable_liquidation) {
                    updateObj = {
                        ...updateObj,
                        enable_liquidation: tableDatas[i].enable_liquidation,
                    };
                }
                if (tableDatas[i].enable_ao !== orignalValue[i].enable_ao) {
                    updateObj = {
                        ...updateObj,
                        enable_ao: tableDatas[i].enable_ao,
                    };
                }
                if (tableDatas[i].enable_reg !== orignalValue[i].enable_reg) {
                    updateObj = {
                        ...updateObj,
                        enable_reg: tableDatas[i].enable_reg,
                    };
                }
                if (tableDatas[i].enable_ro !== orignalValue[i].enable_ro) {
                    updateObj = {
                        ...updateObj,
                        enable_ro: tableDatas[i].enable_ro,
                    };
                }
                if (tableDatas[i].enable_bo !== orignalValue[i].enable_bo) {
                    updateObj = {
                        ...updateObj,
                        enable_bo: tableDatas[i].enable_bo,
                    };
                }
                if (tableDatas[i].enable_aos != orignalValue[i].enable_aos) {
                    updateObj = {
                        ...updateObj,
                        enable_aos: tableDatas[i].enable_aos,
                    };
                }
                if (tableDatas[i].enable_noc !== orignalValue[i].enable_noc) {
                    updateObj = {
                        ...updateObj,
                        enable_noc: tableDatas[i].enable_noc,
                    };
                }
                if (tableDatas[i].enable_delivery_code_email != orignalValue[i].enable_delivery_code_email) {
                    updateObj = {
                        ...updateObj,
                        enable_delivery_code_email: tableDatas[i].enable_delivery_code_email,
                    };
                }
                if (tableDatas[i].enable_delivery_code_sms != orignalValue[i].enable_delivery_code_sms) {
                    updateObj = {
                        ...updateObj,
                        enable_delivery_code_sms: tableDatas[i].enable_delivery_code_sms,
                    };
                }
                if (tableDatas[i].enable_ao === false && tableDatas[i].enable_reg === false) {
                    isArsRegularFalse = true;
                    break;
                }
            }
        }

        if (isArsRegularFalse) {
            getDistributorList({
                offset,
                limit,
                search,
                status,
                customer_group: selectedCustomerGroups,
                state: selectedStates,
                region: selectedRegions,
                areaCode: selectedAreaCodes,
                plantCode: selectedPlants,
                dist_channel: selectedDistChannels,
            });
            setdistributor_ids('');
            notificationSender(false, 'Error', 'Both ARS and Regular cannot be off for any distributor');
            return;
        }

        let obj = {
            ...updateObj,
            distributor_ids,
            remarks: msg,
            customer_group: selectedCustomerGroups,
            state: selectedStates,
            region: selectedRegions,
            areaCode: selectedAreaCodes,
            plant: selectedPlants,
            search: search,
            status: status,
        };

        updateMassDistributorSetting(obj)
            .then((res) => {
                if (res.success) {
                    notificationSender(true, 'Success', 'Updated Successfully !');
                } else {
                    notificationSender(false, 'Error', res.message);
                }
                getDistributorList({
                    offset,
                    limit,
                    search,
                    status,
                    customer_group: selectedCustomerGroups,
                    state: selectedStates,
                    region: selectedRegions,
                    areaCode: selectedAreaCodes,
                    plantCode: selectedPlants,
                    dist_channel: selectedDistChannels,
                });
                setdistributor_ids('');
                setSelectedDistributors([]);
                setSelectedDBAreas([]);
                setSelectedDBRegions([]);
            })
            .catch((error) => {
                notificationSender(false, 'Error', 'Error while updating');
            });
    };

    const updateDistributorDetails = async (data) => {
        let updateDistributorEmailId, updateDistributorPhone;
        if (data.phoneNumber) {
            updateDistributorPhone = await updateDistributorMobile(
                {
                    mobile_number: data.phoneNumber,
                    remark: data.commentValue,
                },
                isEditModalVisible.id,
            );
        }

        if (data.email_id) {
            updateDistributorEmailId = await updateDistributorEmail({ email: data.email_id, remark: data.commentValue }, isEditModalVisible.id);
        }

        if ((updateDistributorEmailId && updateDistributorEmailId.success) || (updateDistributorPhone && updateDistributorPhone.success)) {
            setIsEditModalVisible(false);
        }

        getDistributorList({
            offset,
            limit,
            search,
            status,
            customer_group: selectedCustomerGroups,
            state: selectedStates,
            region: selectedRegions,
            areaCode: selectedAreaCodes,
            plantCode: selectedPlants,
            dist_channel: selectedDistChannels,
        });
    };

    const handleCancel = () => {
        setCommentId('');
        setIsModalVisible(false);
    };
    const handleMassEditModalCancel = () => {
        setdistributor_ids('');
        setIsMassEditModalVisible(false);
    };
    const handleCloseCommentList = () => {
        setEnableViewComment(false);
    };
    const handleCloseMoqModal = () => {
        setIsMoqModalVisible(false);
    };

    const handleViewCommentModal = (distributorId) => {
        setEnableViewComment(true);
        getAlertCommentList(distributorId);
    };
    const handleViewMoqModal = (distributorId) => {
        async function getMoqData() {
            await getDbMoqDetails(distributorId);
            setIsMoqModalVisible(true);
        }
        getMoqData();
    };

    useEffect(() => {
        if (adminAccessToken) {
            dashboardFilter();
        }
    }, [adminAccessToken]);

    useEffect(() => {
        if (adminAccessToken) {
            loaderShowHide(true);

            const isDisabled = selectedCustomerGroups?.some((value) => disableValues.includes(value));
            const payload = {
                offset,
                limit,
                search,
                status,
                customer_group: selectedCustomerGroups,
                dist_channel: selectedDistChannels,
            };

            if (!isDisabled) {
                payload.state = selectedStates;
                payload.region = selectedRegions;
                payload.areaCode = selectedAreaCodes;
                payload.plantCode = selectedPlants;
            }

            getDistributorList(payload);
            setIsRowEdit(-1);
            // dashboardFilter();
        }
    }, [adminAccessToken, offset, limit, search, status, selectedCustomerGroups, selectedStates, selectedRegions, selectedAreaCodes, selectedPlants, selectedDistChannels]);

    const onChangePage = (page, itemsPerPage) => {
        setLimit(itemsPerPage);
        setOffset((page - 1) * limit);
        setPageNo(page);
    };

    const onSearch = (e) => {
        const { value } = e.target;
        debouncedSave(value);
        setShowSearch(value);
        setPageNo(1);
        setOffset(0);
        setLimit(itemsPerPage);
    };
    const salesOrderList = (distributorId) => {
        browserHistory.push({
            pathname: '/admin/distributor',
            state: { distributorId },
        });
    };

    const resetPage = () => {
        debouncedSave('');
        setShowSearch('');
        // setLimit(10);
    };
    const selectStatusHandler = (value) => {
        setStatus(value);
        setPageNo(1);
    };

    const handleAll = (e) => {
        isChecked.enable_po_so_email = document.getElementById('enable_po_so_email').checked;
        isChecked.enable_po_so_sms = document.getElementById('enable_po_so_sms').checked;
        isChecked.enable_invoice_sync_email = document.getElementById('enable_invoice_sync_email').checked;
        isChecked.enable_invoice_sync_sms = document.getElementById('enable_invoice_sync_sms').checked;
        isChecked.sms_tse_asm = document.getElementById('sms_tse_asm').checked;
        isChecked.email_tse_asm = document.getElementById('email_tse_asm').checked;
        isChecked.enable_liquidation = document.getElementById('enable_liquidation').checked;
        isChecked.enable_pdp = !edit && document.getElementById('enable_pdp') && document.getElementById('enable_pdp').checked;
        isChecked.enable_ao = document.getElementById('enable_ao').checked;
        isChecked.enable_reg = document.getElementById('enable_reg').checked;
        isChecked.enable_ro = document.getElementById('enable_ro').checked;
        isChecked.enable_bo = document.getElementById('enable_bo').checked;
        isChecked.enable_aos = document.getElementById('enable_aos').checked;
        isChecked.enable_noc = document.getElementById('enable_noc').checked;
        isChecked.enable_delivery_code_email = document.getElementById('enable_delivery_code_email').checked;
        isChecked.enable_delivery_code_sms = document.getElementById('enable_delivery_code_sms').checked;
        if (
            isChecked.enable_login === true ||
            isChecked.enable_po_so_email === true ||
            isChecked.enable_po_so_sms === true ||
            isChecked.enable_invoice_sync_email === true ||
            isChecked.enable_invoice_sync_sms === true ||
            isChecked.sms_tse_asm === true ||
            isChecked.email_tse_asm === true ||
            isChecked.enable_liquidation === true ||
            isChecked.enable_pdp === true ||
            isChecked.enable_ao === true ||
            isChecked.enable_reg === true ||
            isChecked.enable_ro === true ||
            isChecked.enable_bo === true ||
            isChecked.enable_aos === true ||
            isChecked.enable_noc === true ||
            isChecked.enable_delivery_code_email === true ||
            isChecked.enable_delivery_code_sms === true
        ) {
            setChecked(true);
        }

        const value = e.currentTarget.value;
        if (value === 'enable_login') {
            tableDatas.map((item) => (item[value] = isChecked.enable_login));
            setTableDatas([...tableDatas]);
        } else if (value === 'enable_po_so_email') {
            tableDatas.map((item) => (item[value] = isChecked.enable_po_so_email));
            setTableDatas([...tableDatas]);
        } else if (value === 'enable_po_so_sms') {
            tableDatas.map((item) => (item[value] = isChecked.enable_po_so_sms));
            setTableDatas([...tableDatas]);
        } else if (value === 'enable_invoice_sync_email') {
            tableDatas.map((item) => (item[value] = isChecked.enable_invoice_sync_email));
            setTableDatas([...tableDatas]);
        } else if (value === 'enable_invoice_sync_sms') {
            tableDatas.map((item) => (item[value] = isChecked.enable_invoice_sync_sms));
            setTableDatas([...tableDatas]);
        } else if (value === 'sms_tse_asm') {
            tableDatas.map((item) => (item[value] = isChecked.sms_tse_asm));
            setTableDatas([...tableDatas]);
        } else if (value === 'email_tse_asm') {
            tableDatas.map((item) => (item[value] = isChecked.email_tse_asm));
            setTableDatas([...tableDatas]);
        } else if (value === 'enable_liquidation') {
            tableDatas.map((item) => (item[value] = isChecked.enable_liquidation));
            setTableDatas([...tableDatas]);
        } else if (value === 'enable_pdp') {
            tableDatas.map((item) => (item[value] = isChecked.enable_pdp));
            setTableDatas([...tableDatas]);
        } else if (value === 'enable_ao') {
            tableDatas.map((item) => (item[value] = isChecked.enable_ao));
            setTableDatas([...tableDatas]);
        } else if (value === 'enable_reg') {
            tableDatas.map((item) => (item[value] = isChecked.enable_reg));
            setTableDatas([...tableDatas]);
        } else if (value === 'enable_ro') {
            tableDatas.map((item) => (item[value] = isChecked.enable_ro));
            setTableDatas([...tableDatas]);
        } else if (value === 'enable_bo') {
            tableDatas.map((item) => (item[value] = isChecked.enable_bo));
            setTableDatas([...tableDatas]);
        } else if (value === 'enable_aos') {
            tableDatas.map((item) => (item[value] = isChecked.enable_aos));
            setTableDatas([...tableDatas]);
        } else if (value === 'enable_noc') {
            tableDatas.map((item) => (item[value] = isChecked.enable_noc));
            setTableDatas([...tableDatas]);
        } else if (value === 'enable_delivery_code_email') {
            tableDatas.map((item) => (item[value] = isChecked.enable_delivery_code_email));
            setTableDatas([...tableDatas]);
        } else if (value === 'enable_delivery_code_sms') {
            tableDatas.map((item) => (item[value] = isChecked.enable_delivery_code_sms));
            setTableDatas([...tableDatas]);
        }
    };

    useEffect(() => {
        props.adminSetSwitchToDistributor(null);
    }, []);

    useEffect(() => {
        if (redirect_url && adminRole) {
            window.localStorage.removeItem('REDIRECT_URL');
            if (redirect_params) {
                window.localStorage.removeItem('REDIRECT_PARAMS');
                let path = `${redirect_url}`;
                const params_obj = JSON.parse(redirect_params);
                if (redirect_url === '/admin/rush-order-details') {
                    const po_num = params_obj['po_num'];
                    const dist_id = params_obj['dist_id'];

                    path = path + `/${po_num}/${dist_id}`;
                    if ('action' in params_obj) {
                        browserHistory.push({
                            pathname: path,
                            state: { action: params_obj['action'] },
                        });
                    } else {
                        browserHistory.push({ pathname: path });
                    }
                } else if (redirect_url === '/admin/pdp-unlock-requests') {
                    const id = params_obj['id'];
                    if ('action' in params_obj) {
                        browserHistory.push({
                            pathname: path,
                            state: { id: id, action: params_obj['action'] },
                        });
                    } else {
                        browserHistory.push({ pathname: path });
                    }
                } else if (redirect_url === '/admin/cl-order-request') {
                    const id = params_obj['transaction_id'];
                    path = path + `/${id}`;
                    if ('action' in params_obj) {
                        browserHistory.push({
                            pathname: path,
                            state: { action: params_obj['action'] },
                        });
                    }
                } else if (redirect_url === '/admin/cl-gt-request') {
                    const id = params_obj['transaction_id'];
                    path = path + `/${id}`;
                    if ('action' in params_obj) {
                        browserHistory.push({
                            pathname: path,
                            state: { action: params_obj['action'] },
                        });
                    }
                }
            } else {
                browserHistory.push(redirect_url);
            }
        }
    }, [redirect_url, adminRole, redirect_params]);

    const massPdpUpdateHandler = (e) => {
        const item = e.currentTarget;
        const isChecked = item.checked;
        const value = item.value;

        const dbs = orignalValue.filter((item) => item[value] === !isChecked).map((item) => item.id);
        const regions = orignalValue
            .filter((item) => item[value] === !isChecked && item.region)
            .map((item) => item.region)
            .filter((region, index, array) => array.indexOf(region) === index);
        const areas = orignalValue
            .filter((item) => item[value] === !isChecked && item.area_code)
            .map((item) => item.area_code)
            .filter((area, index, array) => array.indexOf(area) === index);
        tableDatas.forEach((item) => (item[value] = isChecked));
        setTableDatas([...tableDatas]);

        setSelectedDistributors(dbs);
        setSelectedDBRegions(regions);
        setSelectedDBAreas(areas);
    };

    const onPDPEditHandler = (e) => {
        const value = e.currentTarget.id;
        if (value === 'PdpCancel') {
            document.getElementById('enable_pdp').checked = false;
            setEnablePdpCheckbox(false);
            setIsEditingPdp(false);
            setSelectedDistributors([]);
            setSelectedDBAreas([]);
            setSelectedDBRegions([]);
            setIsEditMode(false);
            getDistributorList({
                offset,
                limit,
                search,
                status,
                customer_group: selectedCustomerGroups,
                state: selectedStates,
                region: selectedRegions,
                areaCode: selectedAreaCodes,
                plantCode: selectedPlants,
                dist_channel: selectedDistChannels,
            });
        }
        if (value === 'PdpSave') {
            setIsEditMode(true);
            const isChecked = document.getElementById('enable_pdp').checked;
            if (isChecked) {
                if (hasEditPermission(pages.DASHBOARD, features.LOCK_PDP)) {
                    setdistributor_ids(selectedDistributors);
                    setIsMassEditModalVisible(true);
                    setIsEditMode(true);
                } else {
                    setIsEditMode(true);
                    notificationSender(false, 'Error', 'You are not authorized to lock PDP.');
                }
            } else {
                if (!pdpApprovers.length) {
                    setIsEditMode(true);
                    notificationSender(false, 'Error', 'PDP Unlock Request Approvers are not set. Please contact admin.');
                } else {
                    setIsEditMode(false);
                    isPDPUnlockSelectAll.current = true;
                    setIsPDPUnlockModalVisible(true);
                }
            }
        }
    };

    const handlePDPUnlockCancel = () => {
        setIsPDPUnlockModalVisible(false);
        isPDPUnlockSelectAll.current = false;
    };

    const handlePDPUnlockSave = async (data, as = selectedDBAreas, rs = selectedDBRegions, ds = selectedDistributors) => {
        if (data?.datesString.length === 2 && data?.comment && (ds.length || isPDPUnlockSelectAll.current)) {
            try {
                const payload = {
                    regions: rs,
                    area_codes: as,
                    customer_group: selectedCustomerGroups ?? [],
                    state: selectedStates ?? [],
                    region: selectedRegions ?? [],
                    areaCode: selectedAreaCodes ?? [],
                    plant: selectedPlants ?? [],
                    search: search ?? '',
                    status: status ?? [],
                    distributor_ids: ds ?? [],
                    start_date: data.datesString[0],
                    end_date: data.datesString[1],
                    comments: data.comment,
                    approver_email: pdpApprovers[0],
                };
                const preApprovedRequestPayload = {
                    start_date: data.datesString[0],
                    end_date: data.datesString[1],
                    plant_codes: selectedPlants,
                    dist_channels: selectedDistChannels?.map((dp) => dp + ''),
                    customer_groups: selectedCustomerGroups,
                    regions: selectedRegions,
                    area_codes: selectedAreaCodes,
                    states: selectedStates,
                    comments: data.comment,
                };
                if (isPDPUnlockSelectAll.current) {
                    payload.select_all = true;
                }
                const insertResponse = hasEditPermission(pages.DASHBOARD, features.PDP_LOCK_BYEPASS)
                    ? await insertApprovedPdpUnlockRequest(preApprovedRequestPayload)
                    : await inserPdpUnlockRequest(payload);
                if (insertResponse?.success) {
                    notificationSender(true, 'Success', 'PDP unlock request has been raised successfully');
                } else {
                    notificationSender(false, 'Error', insertResponse?.message);
                }
                setIsPDPUnlockModalVisible(false);
                isPDPUnlockSelectAll.current = false;
                setSelectedDistributors([]);
                setSelectedDBAreas([]);
                setSelectedDBRegions([]);

                getDistributorList({
                    offset,
                    limit,
                    search,
                    status,
                    customer_group: selectedCustomerGroups,
                    state: selectedStates,
                    region: selectedRegions,
                    areaCode: selectedAreaCodes,
                    plantCode: selectedPlants,
                    dist_channel: selectedDistChannels,
                });
            } catch (error) {
                notificationSender(false, 'Technical Error', 'Failed to insert PDP Unlock Request. Please try again later.');
            }
        } else {
            notificationSender(false, 'Error', 'Please fill all the fields.');
        }
    };
    const handleEditPdp = () => {
        setEnablePdpCheckbox(true);
        setIsEditingPdp(true);
        setIsEditMode(true);
    };

    return (
        <>
            <div className="admin-dashboard-wrapper">
                <div className="admin-dashboard-block">
                    {width > 767 ? (
                        <div className="admin-dashboard-head2">
                            <div className="admin-dashboard-head-top">
                                <h2>Distributors</h2>
                                <div className="admin-dashboard-head-top-right"></div>
                            </div>
                            <div className="admin-dashboard-head-bottom">
                                <div className="dashboard-parent-div">
                                    <div style={{ paddingRight: '5px' }}>
                                        <Select
                                            showSearch
                                            mode="multiple"
                                            maxTagCount={0}
                                            value={selectedCustomerGroups}
                                            hidden={!hasViewPermission(pages.DASHBOARD, features.VIEW_CUSTOMER_GROUP_FILTER)}
                                            onChange={(value) => setSelectedCustomerGroups(value)}
                                            allowClear={selectedCustomerGroups?.length > 0}
                                            placeholder="Customer Group">
                                            {customerGroups?.sort().map((data) => {
                                                return <Option value={data}>{data}</Option>;
                                            })}
                                        </Select>
                                    </div>
                                    <div style={{ paddingRight: '5px' }}>
                                        <Select
                                            showSearch
                                            mode="multiple"
                                            maxTagCount={0}
                                            value={selectedDistChannels}
                                            hidden={!hasViewPermission(pages.DASHBOARD, features.VIEW_CUSTOMER_GROUP_FILTER)}
                                            onChange={(value) => setSelectedDistChannels(value)}
                                            allowClear={selectedDistChannels?.length > 0}
                                            placeholder="Dist Channel">
                                            {distChannels?.sort().map((data) => {
                                                return <Option value={data}>{data}</Option>;
                                            })}
                                        </Select>
                                    </div>
                                    <div style={{ paddingRight: '5px' }}>
                                        <Select
                                            showSearch
                                            mode="multiple"
                                            maxTagCount={0}
                                            value={selectedCustomerGroups?.some((value) => disableValues.includes(value)) ? [] : selectedRegions}
                                            hidden={!hasViewPermission(pages.DASHBOARD, features.VIEW_REGION_FILTER)}
                                            onChange={(value) => setSelectedRegions(value)}
                                            allowClear={selectedRegions?.length > 0}
                                            placeholder="Region"
                                            disabled={selectedCustomerGroups?.some((value) => disableValues.includes(value))}>
                                            {regions?.sort().map((data) => {
                                                return <Option value={data}>{data}</Option>;
                                            })}
                                        </Select>
                                    </div>
                                    <div style={{ paddingRight: '5px' }}>
                                        <Select
                                            value={selectedCustomerGroups?.some((value) => disableValues.includes(value)) ? [] : selectedStates}
                                            mode="multiple"
                                            maxTagCount={0}
                                            showSearch
                                            hidden={!hasViewPermission(pages.DASHBOARD, features.VIEW_STATE_FILTER)}
                                            onChange={(value) => setSelectedStates(value)}
                                            allowClear={selectedStates?.length > 0}
                                            disabled={selectedCustomerGroups?.some((value) => disableValues.includes(value))}
                                            placeholder="State">
                                            {states?.sort().map((data) => {
                                                return <Option value={data}>{data}</Option>;
                                            })}
                                        </Select>
                                    </div>
                                    <div style={{ paddingRight: '5px' }}>
                                        <Select
                                            showSearch
                                            mode="multiple"
                                            maxTagCount={0}
                                            value={selectedCustomerGroups?.some((value) => disableValues.includes(value)) ? [] : selectedAreaCodes}
                                            hidden={!hasViewPermission(pages.DASHBOARD, features.VIEW_AREA_CODE_FILTER)}
                                            onChange={(value) => setSelectedAreaCodes(value)}
                                            allowClear={selectedAreaCodes?.length > 0}
                                            disabled={selectedCustomerGroups?.some((value) => disableValues.includes(value))}
                                            placeholder="Area Code">
                                            {areaCodes?.sort().map((data) => {
                                                return <Option value={data}>{data}</Option>;
                                            })}
                                        </Select>
                                    </div>
                                    <div style={{ paddingRight: '5px' }}>
                                        <Select
                                            showSearch
                                            mode="multiple"
                                            maxTagCount={0}
                                            value={selectedCustomerGroups?.some((value) => disableValues.includes(value)) ? [] : selectedPlants}
                                            hidden={!hasViewPermission(pages.DASHBOARD, features.VIEW_PLANT_FILTER)}
                                            onChange={(value) => setSelectedPlants(value)}
                                            allowClear={selectedPlants?.length > 0}
                                            disabled={selectedCustomerGroups?.some((value) => disableValues.includes(value))}
                                            placeholder="Plant Code">
                                            {plants?.sort().map((data) => {
                                                return <Option value={data}>{data}</Option>;
                                            })}
                                        </Select>
                                    </div>
                                </div>
                                <div className="dash-search-cont">
                                    <input
                                        value={showSearch}
                                        onChange={(e) => {
                                            onSearch(e);
                                        }}
                                        type="text"
                                        className="dash-search-fld"
                                        placeholder="Search by distributor name, code, state and region"
                                    />
                                    <div
                                        onClick={() => {
                                            resetPage();
                                        }}
                                        className="dash-search-close">
                                        <CloseCircleOutlined />
                                    </div>
                                </div>
                                <div className="sdr-status-filter" style={{ margin: '0px', padding: '0px' }}>
                                    <Select
                                        defaultValue={status}
                                        className="width120p"
                                        hidden={!hasViewPermission(pages.DASHBOARD, features.SHOW_STATUS)}
                                        onChange={(value) => selectStatusHandler(value)}>
                                        <Option value="ACTIVE"> Active </Option>
                                        <Option value="INACTIVE">Inactive</Option>
                                        <Option value="DELETED">Deleted</Option>
                                    </Select>
                                </div>
                                <div className="dashboard-header-action">
                                    {!isEditingPdp && (
                                        <div>
                                            {tableDatas && tableDatas.length > 0 ? (
                                                <div className="massEditBtnDiv">
                                                    <button
                                                        type="button"
                                                        hidden={
                                                            !hasEditPermission(pages.DASHBOARD, features.VIEW_MASS_EDIT) ||
                                                            status === 'DELETED' ||
                                                            status === 'INACTIVE' ||
                                                            isEditingPdp
                                                        }
                                                        className="massEditBtn"
                                                        value={edit === true ? 'Cancel' : 'Edit'}
                                                        disabled={selectedDistributors.length}
                                                        onClick={handleChange}>
                                                        {edit === true ? 'Cancel' : 'Edit'}
                                                    </button>
                                                    <button type="button" id="massEditBtn" onClick={showMassEditModal} disabled={!checked} hidden={!edit || isEditingPdp}>
                                                        Save
                                                    </button>
                                                </div>
                                            ) : (
                                                <></>
                                            )}
                                        </div>
                                    )}
                                    <div>
                                        {enablePdpCheckbox && (
                                            <div className="massEditBtnDiv">
                                                <button
                                                    type="button"
                                                    id="PdpCancel"
                                                    hidden={!hasEditPermission(pages.DASHBOARD, features.EDIT_PDP)}
                                                    className="massEditBtn"
                                                    onClick={onPDPEditHandler}>
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    id="PdpSave"
                                                    hidden={!hasEditPermission(pages.DASHBOARD, features.EDIT_PDP)}
                                                    className="massEditBtn"
                                                    onClick={onPDPEditHandler}
                                                    disabled={!selectedDistributors.length}>
                                                    Save
                                                </button>
                                            </div>
                                        )}
                                        {!enablePdpCheckbox && !edit && (
                                            <div
                                                className="massEditBtnDiv"
                                                // style={{ float: 'right', marginLeft: '10px', marginRight: '-10px'}}
                                            >
                                                <button
                                                    type="button"
                                                    hidden={!hasEditPermission(pages.DASHBOARD, features.EDIT_PDP) || status === 'DELETED' || status === 'INACTIVE'}
                                                    className="massEditBtn"
                                                    onClick={handleEditPdp}
                                                    style={{ width: '60px' }}>
                                                    Edit PDP
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="admin-dashboard-head2-mob">
                            <div className="admin-dashboard-head-top">
                                <h2>Distributors</h2>
                            </div>
                            <div className="admin-dashboard-head-bottom-mob">
                                <div className="dashboard-filters-mob">
                                    <div className="dashboard-filter-mob">
                                        <Select
                                            style={{ width: 103 }}
                                            showSearch
                                            mode="multiple"
                                            maxTagCount={0}
                                            value={selectedCustomerGroups}
                                            hidden={!hasViewPermission(pages.DASHBOARD, features.VIEW_CUSTOMER_GROUP_FILTER)}
                                            onChange={(value) => setSelectedCustomerGroups(value)}
                                            allowClear={selectedCustomerGroups?.length > 0}
                                            placeholder="Customer Group">
                                            {customerGroups?.sort().map((data) => {
                                                return <Option value={data}>{data}</Option>;
                                            })}
                                        </Select>
                                    </div>
                                    <div className="dashboard-filter-mob">
                                        <Select
                                            style={{ width: 103 }}
                                            showSearch
                                            mode="multiple"
                                            maxTagCount={0}
                                            value={selectedDistChannels}
                                            hidden={!hasViewPermission(pages.DASHBOARD, features.VIEW_CUSTOMER_GROUP_FILTER)}
                                            onChange={(value) => setSelectedDistChannels(value)}
                                            allowClear={selectedDistChannels?.length > 0}
                                            placeholder="Dist Channel">
                                            {distChannels?.sort().map((data) => {
                                                return <Option value={data}>{data}</Option>;
                                            })}
                                        </Select>
                                    </div>
                                    {hasViewPermission(pages.DASHBOARD, features.VIEW_REGION_FILTER) && (
                                        <div className="dashboard-filter-mob">
                                            <Select
                                                style={{ width: 103 }}
                                                showSearch
                                                mode="multiple"
                                                maxTagCount={0}
                                                value={selectedCustomerGroups?.some((value) => disableValues.includes(value)) ? [] : selectedRegions}
                                                // hidden={}
                                                onChange={(value) => setSelectedRegions(value)}
                                                allowClear={selectedRegions?.length > 0}
                                                placeholder="Region"
                                                disabled={selectedCustomerGroups?.some((value) => disableValues.includes(value))}>
                                                {regions?.sort().map((data) => {
                                                    return <Option value={data}>{data}</Option>;
                                                })}
                                            </Select>
                                        </div>
                                    )}
                                    {hasViewPermission(pages.DASHBOARD, features.VIEW_STATE_FILTER) && (
                                        <div className="dashboard-filter-mob">
                                            <Select
                                                style={{ width: 103 }}
                                                value={selectedCustomerGroups?.some((value) => disableValues.includes(value)) ? [] : selectedStates}
                                                mode="multiple"
                                                maxTagCount={0}
                                                showSearch
                                                // hidden={!}
                                                onChange={(value) => setSelectedStates(value)}
                                                allowClear={selectedStates?.length > 0}
                                                disabled={selectedCustomerGroups?.some((value) => disableValues.includes(value))}
                                                placeholder="State">
                                                {states?.sort().map((data) => {
                                                    return <Option value={data}>{data}</Option>;
                                                })}
                                            </Select>
                                        </div>
                                    )}
                                    {hasViewPermission(pages.DASHBOARD, features.VIEW_AREA_CODE_FILTER) && (
                                        <div className="dashboard-filter-mob">
                                            <Select
                                                style={{ width: 103 }}
                                                showSearch
                                                mode="multiple"
                                                maxTagCount={0}
                                                value={selectedCustomerGroups?.some((value) => disableValues.includes(value)) ? [] : selectedAreaCodes}
                                                // hidden={!}
                                                onChange={(value) => setSelectedAreaCodes(value)}
                                                allowClear={selectedAreaCodes?.length > 0}
                                                disabled={selectedCustomerGroups?.some((value) => disableValues.includes(value))}
                                                placeholder="Area Code">
                                                {areaCodes?.sort().map((data) => {
                                                    return <Option value={data}>{data}</Option>;
                                                })}
                                            </Select>
                                        </div>
                                    )}
                                    {hasViewPermission(pages.DASHBOARD, features.VIEW_PLANT_FILTER) && (
                                        <div className="dashboard-filter-mob">
                                            <Select
                                                style={{ width: 103 }}
                                                showSearch
                                                mode="multiple"
                                                maxTagCount={0}
                                                value={selectedCustomerGroups?.some((value) => disableValues.includes(value)) ? [] : selectedPlants}
                                                // hidden={!}
                                                onChange={(value) => setSelectedPlants(value)}
                                                allowClear={selectedPlants?.length > 0}
                                                disabled={selectedCustomerGroups?.some((value) => disableValues.includes(value))}
                                                placeholder="Plant Code">
                                                {plants?.sort().map((data) => {
                                                    return <Option value={data}>{data}</Option>;
                                                })}
                                            </Select>
                                        </div>
                                    )}
                                </div>
                                <div className="dashboard-search-mob">
                                    <input
                                        value={showSearch}
                                        onChange={(e) => {
                                            onSearch(e);
                                        }}
                                        type="text"
                                        className="dash-search-fld"
                                        placeholder="Search by distributor name, code, state and region"
                                    />
                                    <div
                                        onClick={() => {
                                            resetPage();
                                        }}
                                        className="dash-search-close">
                                        <CloseCircleOutlined />
                                    </div>
                                </div>
                                <div className="dashboard-buttons-mob">
                                    <div className="dashboard-status-filter-mob">
                                        <Select
                                            placeholder="Status"
                                            value={status}
                                            style={{ width: 150 }}
                                            hidden={!hasViewPermission(pages.DASHBOARD, features.SHOW_STATUS)}
                                            onChange={(value) => selectStatusHandler(value)}>
                                            <Option value="ACTIVE"> Active </Option>
                                            <Option value="INACTIVE">Inactive</Option>
                                            <Option value="DELETED">Deleted</Option>
                                        </Select>
                                    </div>
                                    <div className="dashboard-header-action">
                                        {!isEditingPdp && (
                                            <div>
                                                {tableDatas && tableDatas.length > 0 ? (
                                                    <div className="massEditBtnDiv-mob">
                                                        <button
                                                            type="button"
                                                            hidden={
                                                                !hasEditPermission(pages.DASHBOARD, features.VIEW_MASS_EDIT) ||
                                                                status === 'DELETED' ||
                                                                status === 'INACTIVE' ||
                                                                isEditingPdp
                                                            }
                                                            className="massEditBtn"
                                                            value={edit === true ? 'Cancel' : 'Edit'}
                                                            disabled={selectedDistributors.length}
                                                            onClick={handleChange}>
                                                            {edit === true ? 'Cancel' : 'Edit'}
                                                        </button>
                                                        <button type="button" id="massEditBtn" onClick={showMassEditModal} disabled={!checked} hidden={!edit || isEditingPdp}>
                                                            Save
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <></>
                                                )}
                                            </div>
                                        )}
                                        <div>
                                            {enablePdpCheckbox && (
                                                <div className="massEditBtnDiv-mob">
                                                    <button
                                                        type="button"
                                                        id="PdpCancel"
                                                        hidden={!hasEditPermission(pages.DASHBOARD, features.EDIT_PDP)}
                                                        className="massEditBtn"
                                                        onClick={onPDPEditHandler}>
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        id="PdpSave"
                                                        hidden={!hasEditPermission(pages.DASHBOARD, features.EDIT_PDP)}
                                                        className="massEditBtn"
                                                        disabled={!selectedDistributors.length}
                                                        onClick={onPDPEditHandler}>
                                                        Save
                                                    </button>
                                                </div>
                                            )}
                                            {!enablePdpCheckbox && !edit && (
                                                <div className="massEditBtnDiv-mob">
                                                    <button
                                                        type="button"
                                                        hidden={!hasEditPermission(pages.DASHBOARD, features.EDIT_PDP) || status === 'DELETED' || status === 'INACTIVE'}
                                                        className="massEditBtn"
                                                        onClick={handleEditPdp}>
                                                        Edit PDP
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="admin-dashboard-table">
                        <Loader>
                            <table>
                                <thead>
                                    <tr>
                                        {hasViewPermission(pages.DASHBOARD, features.VIEW_REGION) && <th>Region</th>}
                                        <th>State</th>
                                        <th>Distributor</th>
                                        <th>
                                            <span>Login</span>
                                        </th>
                                        <th className="sub-head">
                                            <span className="sub-head-text">PO/SO</span>
                                            <tr className="grid-container-row-sn-default">
                                                <th className="grid-cont-cell">
                                                    <span>Email</span>
                                                    <br />
                                                    <input
                                                        hidden={!edit}
                                                        type="checkbox"
                                                        name="all-check"
                                                        id="enable_po_so_email"
                                                        value={'enable_po_so_email'}
                                                        onChange={handleAll}
                                                    />
                                                </th>
                                                <th className="grid-cont-cell">
                                                    <span>SMS</span>
                                                    <br />
                                                    <input hidden={!edit} type="checkbox" name="all-check" id="enable_po_so_sms" value={'enable_po_so_sms'} onChange={handleAll} />
                                                </th>
                                            </tr>
                                        </th>

                                        <th style={{ display: 'none' }}>
                                            <span>Invoice Sync Email</span>
                                            <span id="checkbox-span">
                                                <input
                                                    hidden={!edit}
                                                    type="checkbox"
                                                    name="all-check"
                                                    id="enable_invoice_sync_email"
                                                    value={'enable_invoice_sync_email'}
                                                    onChange={handleAll}
                                                />
                                            </span>
                                        </th>
                                        <th style={{ display: 'none' }}>
                                            <span>Invoice Sync SMS</span>
                                            <span id="checkbox-span">
                                                <input
                                                    hidden={!edit}
                                                    type="checkbox"
                                                    name="all-check"
                                                    id="enable_invoice_sync_sms"
                                                    value={'enable_invoice_sync_sms'}
                                                    onChange={handleAll}
                                                />
                                            </span>
                                        </th>

                                        <th className="sub-head">
                                            <span className="sub-head-text">TSE/ASM</span>
                                            <tr className="grid-container-row-sn-default">
                                                <th className="grid-cont-cell">
                                                    <span>Email</span>
                                                    <br />
                                                    <input hidden={!edit} type="checkbox" name="all-check" id="email_tse_asm" value={'email_tse_asm'} onChange={handleAll} />
                                                </th>
                                                <th className="grid-cont-cell">
                                                    <span>SMS</span>
                                                    <br />
                                                    <input hidden={!edit} type="checkbox" name="all-check" id="sms_tse_asm" value={'sms_tse_asm'} onChange={handleAll} />
                                                </th>
                                            </tr>
                                        </th>
                                        <th className="sub-head">
                                            <span className="sub-head-text">Deliv Code</span>
                                            <tr className="grid-container-row-sn-default">
                                                <th className="grid-cont-cell">
                                                    <span>Email</span>
                                                    <br />
                                                    <input
                                                        hidden={!edit}
                                                        type="checkbox"
                                                        name="all-check"
                                                        id="enable_delivery_code_email"
                                                        value={'enable_delivery_code_email'}
                                                        onChange={handleAll}
                                                        disabled={!hasEditPermission(pages.DASHBOARD, features.EDIT_DELIVERY_CODE_EMAIL)}
                                                    />
                                                </th>
                                                <th className="grid-cont-cell">
                                                    <span>SMS</span>
                                                    <br />
                                                    <input
                                                        hidden={!edit}
                                                        type="checkbox"
                                                        name="all-check"
                                                        id="enable_delivery_code_sms"
                                                        value={'enable_delivery_code_sms'}
                                                        disabled={!hasEditPermission(pages.DASHBOARD, features.EDIT_DELIVERY_CODE_SMS)}
                                                        onChange={handleAll}
                                                    />
                                                </th>
                                            </tr>
                                        </th>
                                        <th style={{ padding: '2px', textAlign: 'center' }}>
                                            <div
                                                style={{
                                                    height: '1.5rem',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    marginTop: edit ? '-20px' : '0px',
                                                }}>
                                                <span>PDP</span>
                                                {enablePdpCheckbox && (
                                                    <input
                                                        style={{
                                                            textAlign: 'center',
                                                            marginTop: '5px',
                                                        }}
                                                        disabled={!hasEditPermission(pages.DASHBOARD, features.EDIT_PDP) || edit}
                                                        type="checkbox"
                                                        name="all-check"
                                                        id="enable_pdp"
                                                        value={'enable_pdp'}
                                                        onChange={massPdpUpdateHandler}
                                                    />
                                                )}
                                            </div>
                                        </th>
                                        <th>
                                            <span>Reg</span>
                                            <br />
                                            <input
                                                hidden={!edit}
                                                disabled={!hasViewPermission(pages.DASHBOARD, features.EDIT_REGULAR)}
                                                type="checkbox"
                                                name="all-check"
                                                id="enable_reg"
                                                value={'enable_reg'}
                                                onChange={handleAll}
                                            />
                                        </th>
                                        <th>
                                            <span>Liq</span>
                                            <br />
                                            <input
                                                hidden={!edit}
                                                disabled={!hasEditPermission(pages.DASHBOARD, features.EDIT_LIQ)}
                                                type="checkbox"
                                                name="all-check"
                                                id="enable_liquidation"
                                                value={'enable_liquidation'}
                                                onChange={handleAll}
                                            />
                                        </th>
                                        <th>
                                            <span>ARS</span>
                                            <br />
                                            <input
                                                hidden={!edit}
                                                disabled={!hasEditPermission(pages.DASHBOARD, features.EDIT_ARS)}
                                                type="checkbox"
                                                name="all-check"
                                                id="enable_ao"
                                                value={'enable_ao'}
                                                onChange={handleAll}
                                            />
                                        </th>
                                        <th>
                                            <span>AOS</span>
                                            <br />
                                            <input
                                                hidden={!edit}
                                                disabled={!hasEditPermission(pages.DASHBOARD, features.EDIT_AOS)}
                                                type="checkbox"
                                                name="all-check"
                                                id="enable_aos"
                                                value={'enable_aos'}
                                                onChange={handleAll}
                                            />
                                        </th>
                                        <th>
                                            <span>RO</span>
                                            <br />
                                            <input
                                                hidden={!edit}
                                                disabled={!hasEditPermission(pages.DASHBOARD, features.EDIT_RO)}
                                                type="checkbox"
                                                name="all-check"
                                                id="enable_ro"
                                                value={'enable_ro'}
                                                onChange={handleAll}
                                            />
                                        </th>
                                        <th>
                                            <span>BO</span>
                                            <br />
                                            <input
                                                hidden={!edit}
                                                disabled={!hasEditPermission(pages.DASHBOARD, features.EDIT_BO)}
                                                type="checkbox"
                                                name="all-check"
                                                id="enable_bo"
                                                value={'enable_bo'}
                                                onChange={handleAll}
                                            />
                                        </th>
                                        <th>
                                            <span>NOC</span>
                                            <br />
                                            <input
                                                hidden={!edit}
                                                disabled={!hasEditPermission(pages.DASHBOARD, features.EDIT_NOC)}
                                                type="checkbox"
                                                name="all-check"
                                                id="enable_noc"
                                                value={'enable_noc'}
                                                onChange={handleAll}
                                            />
                                        </th>

                                        <th className="action-title">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableDatas &&
                                        tableDatas.length > 0 &&
                                        tableDatas.map((tableData, i) => {
                                            return (
                                                <tr key={i}>
                                                    {hasViewPermission(pages.DASHBOARD, features.VIEW_REGION) && <td>{tableData.region}</td>}
                                                    <td className="admin-dbstate">{tableData.state}</td>
                                                    <td className="admin-dbname">
                                                        <a disabled={status === 'DELETED' || status === 'INACTIVE'} onClick={() => salesOrderList(tableData.id)}>
                                                            {tableData.name} ({tableData.id})
                                                        </a>
                                                    </td>
                                                    <td>
                                                        <label htmlFor={`enable_login-${i}`}>
                                                            <input
                                                                id={`enable_login-${i}`}
                                                                type="checkbox"
                                                                checked={tableData.enable_login}
                                                                disabled={
                                                                    !!(!hasEditPermission(pages.DASHBOARD, features.EDIT_LOGIN) || edit || isEditingPdp || status === 'DELETED')
                                                                }
                                                                onChange={() => checkboxEmailHandler(tableData.id, tableData.enable_login, i, 'enable_login')}
                                                            />
                                                            <span className="checkmark-box"></span>
                                                        </label>
                                                    </td>
                                                    <td className="sub-head sn-padding">
                                                        <tr className="grid-container-row-sn-default" style={{ backgroundColor: 'inherit' }}>
                                                            <td className="sn-padding">
                                                                <label style={{ width: 0 }} htmlFor={`enable_po_so_email-${i}`}>
                                                                    <input
                                                                        id={`enable_po_so_email-${i}`}
                                                                        type="checkbox"
                                                                        checked={tableData.enable_po_so_email}
                                                                        disabled={
                                                                            !!(
                                                                                !hasEditPermission(pages.DASHBOARD, features.EDIT_PO_SO_EMAIL) ||
                                                                                edit ||
                                                                                isEditingPdp ||
                                                                                status === 'DELETED' ||
                                                                                status === 'INACTIVE'
                                                                            )
                                                                        }
                                                                        onChange={() => checkboxEmailHandler(tableData.id, tableData.enable_po_so_email, i, 'enable_po_so_email')}
                                                                    />
                                                                    <span className="checkmark-box"></span>
                                                                </label>
                                                            </td>
                                                            <td className="sn-padding">
                                                                <label htmlFor={`enable_po_so_sms-${i}`}>
                                                                    <input
                                                                        id={`enable_po_so_sms-${i}`}
                                                                        type="checkbox"
                                                                        checked={tableData.enable_po_so_sms}
                                                                        disabled={
                                                                            !!(
                                                                                !hasEditPermission(pages.DASHBOARD, features.EDIT_PO_SO_SMS) ||
                                                                                edit ||
                                                                                isEditingPdp ||
                                                                                status === 'DELETED' ||
                                                                                status === 'INACTIVE'
                                                                            )
                                                                        }
                                                                        onChange={() => checkboxEmailHandler(tableData.id, tableData.enable_po_so_sms, i, 'enable_po_so_sms')}
                                                                    />
                                                                    <span className="checkmark-box"></span>
                                                                </label>
                                                            </td>
                                                        </tr>
                                                    </td>
                                                    <td style={{ display: 'none' }}>
                                                        <label htmlFor={`enable_invoice_sync_email-${i}`}>
                                                            <input
                                                                id={`enable_invoice_sync_email-${i}`}
                                                                type="checkbox"
                                                                checked={tableData.enable_invoice_sync_email}
                                                                disabled={
                                                                    !!(
                                                                        !hasEditPermission(pages.DASHBOARD, features.EDIT_INVOICE_EMAIL) ||
                                                                        edit ||
                                                                        isEditingPdp ||
                                                                        status === 'DELETED' ||
                                                                        status === 'INACTIVE'
                                                                    )
                                                                }
                                                                onChange={() =>
                                                                    checkboxEmailHandler(tableData.id, tableData.enable_invoice_sync_email, i, 'enable_invoice_sync_email')
                                                                }
                                                            />
                                                            <span className="checkmark-box"></span>
                                                        </label>
                                                    </td>
                                                    <td style={{ display: 'none' }}>
                                                        <label htmlFor={`enable_invoice_sync_sms-${i}`}>
                                                            <input
                                                                id={`enable_invoice_sync_sms-${i}`}
                                                                type="checkbox"
                                                                checked={tableData.enable_invoice_sync_sms}
                                                                disabled={
                                                                    !!(
                                                                        !hasEditPermission(pages.DASHBOARD, features.EDIT_INVOICE_SMS) ||
                                                                        edit ||
                                                                        isEditingPdp ||
                                                                        status === 'DELETED' ||
                                                                        status === 'INACTIVE'
                                                                    )
                                                                }
                                                                onChange={() => checkboxEmailHandler(tableData.id, tableData.enable_invoice_sync_sms, i, 'enable_invoice_sync_sms')}
                                                            />
                                                            <span className="checkmark-box"></span>
                                                        </label>
                                                    </td>
                                                    <td className="sub-head sn-padding">
                                                        <tr className="grid-container-row-sn-default" style={{ backgroundColor: 'inherit' }}>
                                                            <td className="sn-padding">
                                                                <label style={{ width: 0 }} htmlFor={`email_tse_asm-${i}`}>
                                                                    <input
                                                                        id={`email_tse_asm-${i}`}
                                                                        type="checkbox"
                                                                        checked={tableData.email_tse_asm}
                                                                        disabled={
                                                                            !!(
                                                                                !hasEditPermission(pages.DASHBOARD, features.EDIT_TSE_EMAIL) ||
                                                                                edit ||
                                                                                isEditingPdp ||
                                                                                status === 'DELETED' ||
                                                                                status === 'INACTIVE'
                                                                            )
                                                                        }
                                                                        onChange={() => checkboxEmailHandler(tableData.id, tableData.email_tse_asm, i, 'email_tse_asm')}
                                                                    />
                                                                    <span className="checkmark-box"></span>
                                                                </label>
                                                            </td>
                                                            <td className="sn-padding">
                                                                <label htmlFor={`sms_tse_asm-${i}`}>
                                                                    <input
                                                                        id={`sms_tse_asm-${i}`}
                                                                        type="checkbox"
                                                                        checked={tableData.sms_tse_asm}
                                                                        disabled={
                                                                            !!(
                                                                                !hasEditPermission(pages.DASHBOARD, features.EDIT_TSE_SMS) ||
                                                                                edit ||
                                                                                isEditingPdp ||
                                                                                status === 'DELETED' ||
                                                                                status === 'INACTIVE'
                                                                            )
                                                                        }
                                                                        onChange={() => checkboxEmailHandler(tableData.id, tableData.sms_tse_asm, i, 'sms_tse_asm')}
                                                                    />
                                                                    <span className="checkmark-box"></span>
                                                                </label>
                                                            </td>
                                                        </tr>
                                                    </td>
                                                    <td className="sub-head sn-padding">
                                                        <tr className="grid-container-row-sn-default" style={{ backgroundColor: 'inherit' }}>
                                                            <td className="sn-padding">
                                                                <label style={{ width: 0 }} htmlFor={`enable_delivery_code_email-${i}`}>
                                                                    <input
                                                                        id={`enable_delivery_code_email-${i}`}
                                                                        type="checkbox"
                                                                        checked={tableData.enable_delivery_code_email}
                                                                        disabled={
                                                                            !!(
                                                                                !hasEditPermission(pages.DASHBOARD, features.EDIT_DELIVERY_CODE_EMAIL) ||
                                                                                edit ||
                                                                                isEditingPdp ||
                                                                                status === 'DELETED' ||
                                                                                status === 'INACTIVE'
                                                                            )
                                                                        }
                                                                        onChange={() =>
                                                                            checkboxEmailHandler(
                                                                                tableData.id,
                                                                                tableData.enable_delivery_code_email,
                                                                                i,
                                                                                'enable_delivery_code_email',
                                                                            )
                                                                        }
                                                                    />
                                                                    <span className="checkmark-box"></span>
                                                                </label>
                                                            </td>
                                                            <td className="sn-padding">
                                                                <label htmlFor={`enable_delivery_code_sms-${i}`}>
                                                                    <input
                                                                        id={`enable_delivery_code_sms-${i}`}
                                                                        type="checkbox"
                                                                        checked={tableData.enable_delivery_code_sms}
                                                                        disabled={
                                                                            !!(
                                                                                !hasEditPermission(pages.DASHBOARD, features.EDIT_DELIVERY_CODE_SMS) ||
                                                                                edit ||
                                                                                isEditingPdp ||
                                                                                status === 'DELETED' ||
                                                                                status === 'INACTIVE'
                                                                            )
                                                                        }
                                                                        onChange={() =>
                                                                            checkboxEmailHandler(tableData.id, tableData.enable_delivery_code_sms, i, 'enable_delivery_code_sms')
                                                                        }
                                                                    />
                                                                    <span className="checkmark-box"></span>
                                                                </label>
                                                            </td>
                                                        </tr>
                                                    </td>
                                                    <td style={{ width: '4%' }}>
                                                        {/* <Tooltip placement="right" 
                                                        title={(tableData.pdp_unlock_end && tableData.pdp_unlock_start) ?
                                                                <div>
                                                                    <p style={{margin:'0px'}}>Unlock start: </p>
                                                                    <p style={{margin:'0px'}}>Unlock end: </p>
                                                                </div>: ""} 
                                                        arrow={ { pointAtCenter: true }} 
                                                        color='#34aeef'> */}
                                                        <Tooltip
                                                            title={
                                                                !orignalValue[i].enable_pdp && !hasEditPermission(pages.DASHBOARD, features.LOCK_PDP)
                                                                    ? 'You are not authorized to lock pdp'
                                                                    : undefined
                                                            }>
                                                            <label htmlFor={`pdp-${i}`}>
                                                                <input
                                                                    id={`pdp-${i}`}
                                                                    type="checkbox"
                                                                    checked={tableData.enable_pdp}
                                                                    disabled={
                                                                        !!(
                                                                            !hasEditPermission(pages.DASHBOARD, features.EDIT_PDP) ||
                                                                            edit ||
                                                                            isEditingPdp ||
                                                                            status === 'DELETED' ||
                                                                            status === 'INACTIVE' ||
                                                                            (!orignalValue[i].enable_pdp && !hasEditPermission(pages.DASHBOARD, features.LOCK_PDP))
                                                                        )
                                                                    }
                                                                    onChange={() => checkboxEmailHandler(tableData.id, tableData.enable_pdp, i, 'enable_pdp')}
                                                                />
                                                                <span className="checkmark-box"></span>
                                                            </label>
                                                        </Tooltip>
                                                        {/* </Tooltip> */}
                                                    </td>
                                                    <td>
                                                        <label htmlFor={`reg-${i}`}>
                                                            <input
                                                                id={`reg-${i}`}
                                                                type="checkbox"
                                                                checked={tableData.enable_reg}
                                                                disabled={
                                                                    !!(
                                                                        !hasEditPermission(pages.DASHBOARD, features.EDIT_REGULAR) ||
                                                                        edit ||
                                                                        isEditingPdp ||
                                                                        status === 'DELETED' ||
                                                                        status === 'INACTIVE'
                                                                    )
                                                                }
                                                                onChange={() => checkboxEmailHandler(tableData.id, tableData.enable_reg, i, 'enable_reg')}
                                                            />
                                                            <span className="checkmark-box"></span>
                                                        </label>
                                                    </td>
                                                    <td>
                                                        <label htmlFor={`liq-${i}`}>
                                                            <input
                                                                id={`liq-${i}`}
                                                                type="checkbox"
                                                                checked={tableData.enable_liquidation}
                                                                disabled={
                                                                    !!(
                                                                        !hasEditPermission(pages.DASHBOARD, features.EDIT_LIQ) ||
                                                                        edit ||
                                                                        isEditingPdp ||
                                                                        status === 'DELETED' ||
                                                                        status === 'INACTIVE'
                                                                    )
                                                                }
                                                                onChange={() => checkboxEmailHandler(tableData.id, tableData.enable_liquidation, i, 'enable_liquidation')}
                                                            />
                                                            <span className="checkmark-box"></span>
                                                        </label>
                                                    </td>

                                                    <td>
                                                        <label htmlFor={`ao-${i}`}>
                                                            <input
                                                                id={`ao-${i}`}
                                                                type="checkbox"
                                                                checked={tableData.enable_ao}
                                                                disabled={
                                                                    !!(
                                                                        !hasEditPermission(pages.DASHBOARD, features.EDIT_ARS) ||
                                                                        edit ||
                                                                        isEditingPdp ||
                                                                        status === 'DELETED' ||
                                                                        status === 'INACTIVE'
                                                                    )
                                                                }
                                                                onChange={() => checkboxEmailHandler(tableData.id, tableData.enable_ao, i, 'enable_ao')}
                                                            />
                                                            <span className="checkmark-box"></span>
                                                        </label>
                                                    </td>

                                                    <td>
                                                        <label htmlFor={`aos-${i}`}>
                                                            <input
                                                                id={`aos-${i}`}
                                                                type="checkbox"
                                                                checked={tableData.enable_aos}
                                                                disabled={
                                                                    !!(
                                                                        !hasEditPermission(pages.DASHBOARD, features.EDIT_AOS) ||
                                                                        edit ||
                                                                        isEditingPdp ||
                                                                        status === 'DELETED' ||
                                                                        status === 'INACTIVE'
                                                                    )
                                                                }
                                                                onChange={() => checkboxEmailHandler(tableData.id, tableData.enable_aos, i, 'enable_aos')}
                                                            />
                                                            <span className="checkmark-box"></span>
                                                        </label>
                                                    </td>

                                                    <td>
                                                        <label htmlFor={`ro-${i}`}>
                                                            <input
                                                                id={`ro-${i}`}
                                                                type="checkbox"
                                                                checked={tableData.enable_ro}
                                                                disabled={
                                                                    !!(
                                                                        !hasEditPermission(pages.DASHBOARD, features.EDIT_RO) ||
                                                                        edit ||
                                                                        isEditingPdp ||
                                                                        status === 'DELETED' ||
                                                                        status === 'INACTIVE'
                                                                    )
                                                                }
                                                                onChange={() => checkboxEmailHandler(tableData.id, tableData.enable_ro, i, 'enable_ro')}
                                                            />
                                                            <span className="checkmark-box"></span>
                                                        </label>
                                                    </td>

                                                    <td>
                                                        <label htmlFor={`bo-${i}`}>
                                                            <input
                                                                id={`bo-${i}`}
                                                                type="checkbox"
                                                                checked={tableData.enable_bo}
                                                                disabled={
                                                                    !!(
                                                                        !hasEditPermission(pages.DASHBOARD, features.EDIT_BO) ||
                                                                        edit ||
                                                                        isEditingPdp ||
                                                                        status === 'DELETED' ||
                                                                        status === 'INACTIVE'
                                                                    )
                                                                }
                                                                onChange={() => checkboxEmailHandler(tableData.id, tableData.enable_bo, i, 'enable_bo')}
                                                            />
                                                            <span className="checkmark-box"></span>
                                                        </label>
                                                    </td>

                                                    <td>
                                                        <label htmlFor={`noc-${i}`}>
                                                            <input
                                                                id={`noc-${i}`}
                                                                type="checkbox"
                                                                checked={tableData.enable_noc}
                                                                disabled={
                                                                    !!(
                                                                        !hasEditPermission(pages.DASHBOARD, features.EDIT_NOC) ||
                                                                        edit ||
                                                                        isEditingPdp ||
                                                                        status === 'DELETED' ||
                                                                        status === 'INACTIVE'
                                                                    )
                                                                }
                                                                onChange={() => checkboxEmailHandler(tableData.id, tableData.enable_noc, i, 'enable_noc')}
                                                            />
                                                            <span className="checkmark-box"></span>
                                                        </label>
                                                    </td>

                                                    <td className="admin-ations">
                                                        <div className="action-btns">
                                                            {hasEditPermission(pages.DASHBOARD, features.EDIT_DB_FLAGS) && (
                                                                <button
                                                                    key={i}
                                                                    className="save-btn"
                                                                    id={'save-' + i}
                                                                    disabled={isRowEdit !== i}
                                                                    hidden={edit}
                                                                    onClick={() => saveHandler(tableData.id)}>
                                                                    <Tooltip placement="bottom" title="Save">
                                                                        <CheckCircleOutlined />
                                                                    </Tooltip>
                                                                </button>
                                                            )}
                                                            <em className="edit-distributor-contact-icon" onClick={() => showModal(tableData)}>
                                                                <Tooltip placement="bottom" title="Contact Details">
                                                                    <ProfileOutlined />
                                                                </Tooltip>
                                                            </em>
                                                            <i
                                                                className="info-icon"
                                                                hidden={status === 'DELETED' ? true : false}
                                                                onClick={() => handleViewCommentModal(tableData.id)}>
                                                                <Tooltip placement="bottom" title="Info">
                                                                    <InfoCircleOutlined />
                                                                </Tooltip>
                                                            </i>
                                                            <i className="info-icon" hidden={status === 'DELETED' ? true : false} onClick={() => handleViewMoqModal(tableData.id)}>
                                                                <Tooltip placement="bottom" title="MOQ">
                                                                    <EyeOutlined />
                                                                </Tooltip>
                                                            </i>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </Loader>
                    </div>
                    <Panigantion
                        data={tableDatas ? tableDatas : []}
                        itemsPerPage={itemsPerPage}
                        setItemsPerPage={setItemsPerPage}
                        itemsCount={distributor_list && distributor_list.data && distributor_list.data.totalCount}
                        setModifiedData={onChangePage}
                        pageNo={pageNo}
                        disabled={isEditMode}
                    />
                </div>
                <CommentModal
                    visible={isModalVisible}
                    onCancel={handleCancel}
                    // rawIndex={() => defaultRaw(i)}
                    onUpdateData={updatedData}
                />
                <MassEditCommentModal
                    visible={isMassEditModalVisible}
                    onCancel={handleMassEditModalCancel}
                    onUpdateDataMassEdit={updatedDataMassEdit}
                    setIsEditMode={setIsEditMode}
                    setChecked={setChecked}
                    setEnablePdpCheckbox={setEnablePdpCheckbox}
                    setIsEditingPdp={setIsEditingPdp}
                    setEdit={setEdit}
                />
                <CommentListModal visible={enableViewComment} onCancel={handleCloseCommentList} data={alert_comment_list && alert_comment_list.data} />
                <EditDistributorContactModal
                    visible={!!isEditModalVisible}
                    onCancel={handleEditDistributorCancelModal}
                    data={isEditModalVisible}
                    onUpdateDistributorDetails={updateDistributorDetails}
                    ssoRole={ssoRole}
                    dbStatusDeleted={status === 'DELETED' || status === 'INACTIVE'}
                />

                <DistributorMoqModal visible={isMoqModalVisible} onCancel={handleCloseMoqModal} data={db_moq_details && db_moq_details.data} />

                <PDPUnlockModal
                    visible={isPDPUnlockModalVisible}
                    onCancel={handlePDPUnlockCancel}
                    onSubmit={handlePDPUnlockSave}
                    pdpWindow={pdpUnlockWindow}
                    pdpUnlockConfirmText={hasEditPermission(pages.DASHBOARD, features.PDP_LOCK_BYEPASS) ? '' : pdpUnlockConfirmText}
                    setIsEditMode={setIsEditMode}
                    setChecked={setChecked}
                    setEnablePdpCheckbox={setEnablePdpCheckbox}
                    setIsEditingPdp={setIsEditingPdp}
                />
            </div>
        </>
    );
};

const mapStateToProps = (state, ownProps) => {
    return {
        distributor_list: state.admin.get('distributor_list'),
        alert_comment_list: state.admin.get('alert_comment_list'),
        sso_user_details: state.admin.get('sso_user_details'),
        db_moq_details: state.admin.get('db_moq_details'),
        filterState: state.admin.get('dashboard_selected_filters'),
    };
};
const mapDispatchToProps = (dispatch, ownProps) => {
    return {
        getMaintenanceRequests: (history) => dispatch(Actions.getMaintenanceRequests(history)),
        setFilterState: (filterState) => dispatch(Actions.setDashboardFilterState(filterState)),
        getDistributorList: ({ offset, limit, search, status, customer_group, state, region, areaCode, plantCode, dist_channel }) =>
            dispatch(
                Action.getDistributorList({
                    offset,
                    limit,
                    search,
                    status,
                    customer_group,
                    state,
                    region,
                    areaCode,
                    plantCode,
                    dist_channel,
                }),
            ),
        updateDistributorSetting: (data, commentId) => dispatch(Action.updateDistributorSetting(data, commentId)),
        getAlertCommentList: (distributorId) => dispatch(Action.getAlertCommentList(distributorId)),
        getSSODetails: (emailId, history, newLogin = null) => dispatch(Action.getSSODetails(emailId, history, newLogin)),
        updateDistributorMobile: (data, mobileNumber) => dispatch(Action.updateDistributorMobile(data, mobileNumber)),
        updateDistributorEmail: (data, email) => dispatch(Action.updateDistributorEmail(data, email)),
        loaderShowHide: (show) => dispatch(Action.loaderShowHide(show)),
        adminSetSwitchToDistributor: (distributorId) => dispatch(Action.adminSetSwitchToDistributor(distributorId)),
        updateMassDistributorSetting: (data) => dispatch(Action.updateMassDistributorSetting(data)),
        dashboardFilterCategories: () => dispatch(Action.dashboardFilterCategories()),
        getDbMoqDetails: (distributorId) => dispatch(Action.getDbMoqDetails(distributorId)),
        insertAdminSession: (correlationId) => dispatch(Action.insertAdminSession(correlationId)),
        inserPdpUnlockRequest: (data) => dispatch(Action.inserPdpUnlockRequest(data)),
        getAppSettingList: () => dispatch(Action.getAppSettingList()),
        getSessionsLog: (data) => dispatch(DistAction.getSessionsLog(data)),
        invalidateOtherSessions: (data) => dispatch(Action.invalidateOtherSessions(data)),
        setCorrelationId: (id) => dispatch(Action.setCorrelationId(id)),
        insertApprovedPdpUnlockRequest: (data) => dispatch(Action.insertApprovedPdpUnlockRequest(data)),
    };
};

const AdminDashboard = connect(mapStateToProps, mapDispatchToProps)(Admindashboard);

export default AdminDashboard;
