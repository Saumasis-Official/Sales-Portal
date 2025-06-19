import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import * as Action from '../services/distributor/action';
import * as AdminAction from '../services/admin/actions/adminAction';
import ReportIssueModal from '../services/distributor/ReportIssueModal/ReportIssueModal';
import {
    IssuesCloseOutlined,
    QuestionCircleOutlined,
    CopyOutlined,
    FileTextFilled,
    AppstoreFilled,
    DiffFilled,
    FolderFilled,
    ShopOutlined,
    ShoppingOutlined,
    UnorderedListOutlined,
} from '@ant-design/icons';
import LocalAuth from '../util/middleware/auth';
import appLevelConfig from '../config';
import '../assets/iconmoon.css';
import './DistributorNav.css';
import * as NavPersona from '../persona/distributorNav.js';
import * as RequestPersona from '../persona/requests.js';
const appConfig = appLevelConfig.app_level_configuration;

let Navigation = (props) => {
    const { app_level_configuration, isAdminLogin, admin_switched_to_distributor, getCFAReportIssuesList, report_issues } = props;
    const [isReportModalVisible, setIsReportModalVisible] = useState(false);
    const [serviceLevelCategory, setServiceLevelCategory] = useState([]);
    const [reportIssueFeatureFlag, setReportIssueFeatureFlag] = useState(true);
    // Flag,function
    const [, /*dashboardLinkActive*/ setDashboardLinkActive] = useState(true);
    const [, /*sdRequestsLinkActive*/ setSdRequestsLinkActive] = useState(false);
    const [, /*shRequestsLinkActive*/ setShRequestsLinkActive] = useState(false);
    const [, /*forecastLinkActive*/ setForecastLinkActive] = useState(false);
    const [, /*moqLinkActive*/ setMoqLinkActive] = useState(false);
    const [, /*mdmLinkActive*/ setMdmLinkActive] = useState(false);
    const [purchaseOrdersLinkActive /*setpurchaseOrdersLinkActive*/] = useState(true);
    const [, /*mtEcomLinkActive*/ setMtEcomLinkActive] = useState(false);
    const [, /*shopifyLinkActive*/ setShopifyLinkActive] = useState(false);
    const [, /*reditLimitActive*/ setCreditLimitActive] = useState(false);
    const [, /*requestSummary*/ setRequestSummary] = useState(false);

    const adminRole = LocalAuth.getAdminRole();

    const setActive = (menu) => {
        setDashboardLinkActive(menu === 'dashboard');
        setSdRequestsLinkActive(menu === 'sdRequests');
        setShRequestsLinkActive(menu === 'shRequests');
        setForecastLinkActive(menu === 'forecast');
        setMoqLinkActive(menu === 'moq');
        setMdmLinkActive(menu === 'mdm');
        setMtEcomLinkActive(menu === 'mtecom');
        setShopifyLinkActive(menu === 'shopify');
        setCreditLimitActive(menu === 'creditLimit');
        setRequestSummary(menu === 'requestSummary');
    };

    const cancelReportModal = () => {
        setIsReportModalVisible(false);
    };

    // let links;
    // if (isAdminLogin === 'admin') {
    //   links = AdminLink;
    // } else {
    //   links = DistributorLink;
    // }

    const handleReportModal = () => {
        setIsReportModalVisible(true);
        if (RequestPersona.hasViewPermission(RequestPersona.pages.SDR, RequestPersona.features.ONLY_SDR_VIEW)) {
            setServiceLevelCategory(report_issues);
        }
    };
    let screenWidth = window.screen.width;
    const toggleNavbar = () => {
        if (screenWidth <= 767) {
            document.querySelector('body').classList.remove('show-sidebar');
        } else {
            document.querySelector('body').classList.add('hide-sidebar');
        }
    };

    useEffect(() => {
        getCFAReportIssuesList('CFA_REPORT_ISSUE');
    }, []);

    useEffect(() => {
        if (screenWidth <= 767) {
            document.addEventListener('mousedown', toggleNavbar);
        }
        return () => document.removeEventListener('mousedown', toggleNavbar);
    });

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
        if (RequestPersona.hasViewPermission(RequestPersona.pages.SDR, RequestPersona.features.ONLY_SDR_VIEW) || window.location.pathname === '/admin/cfa-so-requests') {
            setActive('sdRequests');
        }
    }, [adminRole]);

    return (
        <div className="left-sidebar">
            <div id="nav-icon" className="nav-icon" onClick={toggleNavbar}>
                <span></span>
                <span></span>
                <span></span>
            </div>
            <div className="menu">
                <ul>
                    {isAdminLogin === 'admin' ? (
                        <>
                            {
                                <>
                                    {NavPersona.hasViewPermission(NavPersona.pages.DASHBOARD) && (
                                        <li onClick={() => setActive('dashboard')} className={window.location.pathname === '/admin/dashboard' ? 'active-side-li' : ' '}>
                                            <Link to="/admin/dashboard">
                                                <span>
                                                    <FolderFilled />
                                                </span>
                                                Dashboard
                                            </Link>
                                        </li>
                                    )}
                                    {NavPersona.hasViewPermission(NavPersona.pages.REQUEST) && (
                                        <li
                                            onClick={() => setActive('shRequests')}
                                            className={
                                                window.location.pathname === '/admin/tse-requests' ||
                                                window.location.pathname === '/admin/pending-requests' ||
                                                window.location.pathname === '/admin/cfa-so-requests' ||
                                                window.location.pathname === '/admin/pdp-update' ||
                                                window.location.pathname === '/admin/pdp-unlock-requests' || 
                                                window.location.pathname === '/admin/rush-order-requests' 
                                                    ? 'active-side-li'
                                                    : ' '
                                            }>
                                            <Link to="/admin/pdp-unlock-requests">
                                                <span>
                                                    <DiffFilled />
                                                </span>
                                                Requests
                                            </Link>
                                        </li>
                                    )}

                                    {NavPersona.hasViewPermission(NavPersona.pages.FORECAST) && (
                                        <li onClick={() => setActive('forecast')} className={window.location.pathname === '/admin/forecast-dashboard' ? 'active-side-li' : ' '}>
                                            <Link to="/admin/forecast-dashboard">
                                                <span>
                                                    <AppstoreFilled />
                                                </span>
                                                Forecast
                                            </Link>
                                        </li>
                                    )}

                                    {NavPersona.hasViewPermission(NavPersona.pages.MOQ) && (
                                        <li onClick={() => setActive('moq')} className={window.location.pathname === '/admin/moq-dashboard' ? 'active-side-li' : ' '}>
                                            <Link to="/admin/moq-dashboard">
                                                <span>
                                                    <FileTextFilled />
                                                </span>
                                                MOQ
                                            </Link>
                                        </li>
                                    )}
                                    {NavPersona.hasViewPermission(NavPersona.pages.SKU_DATA) && (
                                        <li
                                            onClick={() => setActive('mdm')}
                                            onKeyDown={() => setActive('mdm')}
                                            className={window.location.pathname === '/admin/mdm-dashboard' ? 'active-side-li' : ' '}>
                                            <Link to="/admin/mdm-dashboard">
                                                <span>
                                                    <CopyOutlined />
                                                </span>
                                                SKU Data
                                            </Link>
                                        </li>
                                    )}
                                    {NavPersona.hasViewPermission(NavPersona.pages.MT_ECOM) && (
                                        <li
                                            onClick={() => setActive('mtecom')}
                                            onKeyDown={() => setActive('mtecom')}
                                            className={window.location.pathname === '/admin/mt-ecom-dashboard' ? 'active-side-li' : ' '}>
                                            <Link to="/admin/mt-ecom-dashboard">
                                                <span>
                                                    <ShopOutlined />
                                                </span>
                                                MT Ecom
                                            </Link>
                                        </li>
                                    )}
                                    {NavPersona.hasViewPermission(NavPersona.pages.CREDIT_LIMIT) && (
                                        <li
                                            onClick={() => setActive('creditLimit')}
                                            onKeyDown={() => setActive('creditLimit')}
                                            className={window.location.pathname === '/admin/credit-dashboard' ? 'active-side-li' : ' '}>
                                            <Link to="/admin/credit-dashboard">
                                                <span>
                                                    <UnorderedListOutlined />
                                                </span>
                                                Credit Limit
                                            </Link>
                                        </li>
                                    )}
                                    {NavPersona.hasViewPermission(NavPersona.pages.SHOPIFY) && (
                                        <li
                                            onClick={() => setActive('shopify')}
                                            onKeyDown={() => setActive('shopify')}
                                            className={window.location.pathname === '/admin/shopify-dashboard' ? 'active-side-li' : ' '}>
                                            <Link to="/admin/shopify-dashboard">
                                                <span>
                                                    <ShoppingOutlined />
                                                </span>
                                                Shopify
                                            </Link>
                                        </li>
                                    )}
                                </>
                            }
                        </>
                    ) : (
                        <>
                            <li className={purchaseOrdersLinkActive ? 'active-side-li' : ' '}>
                                <Link to="/distributor/dashboard">
                                    <span>
                                        <FolderFilled />
                                    </span>
                                    Purchase Orders
                                </Link>
                            </li>
                        </>
                    )}
                </ul>
            </div>
            <div className="footer-menu">
                {isAdminLogin === 'admin' ? (
                    <>
                        <div className="help-section">
                            {NavPersona.hasViewPermission(NavPersona.pages.HELP, NavPersona.features.ADMIN_VIEW) ? (
                                <Link to={'/admin/help'}>
                                    <QuestionCircleOutlined />
                                    Help
                                </Link>
                            ) : (
                                <Link to="/" style={{ color: '#1268b3', cursor: 'default' }}>
                                    <QuestionCircleOutlined />
                                    Help
                                </Link>
                            )}
                        </div>

                        <div className="report-issue-menu">
                            {reportIssueFeatureFlag &&
                            (admin_switched_to_distributor || NavPersona.hasViewPermission(NavPersona.pages.REPORT_ISSUE, NavPersona.features.LOGISTICS_VIEW)) ? (
                                <a onClick={handleReportModal} title="Report Issue">
                                    <IssuesCloseOutlined />
                                    Report Issue
                                </a>
                            ) : (
                                <a title="Report Issue" style={{ color: '#1268b3', cursor: 'default' }}>
                                    <IssuesCloseOutlined />
                                    Report Issue
                                </a>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="help-section">
                            <Link to="/distributor/help">
                                <QuestionCircleOutlined />
                                Help
                            </Link>
                        </div>
                        <div className="report-issue-menu">
                            {reportIssueFeatureFlag ? (
                                <a onClick={handleReportModal} title="Report Issue">
                                    <IssuesCloseOutlined />
                                    Report Issue
                                </a>
                            ) : (
                                <a title="Report Issue" style={{ color: '#1268b3', cursor: 'default' }}>
                                    <IssuesCloseOutlined />
                                    Report Issue
                                </a>
                            )}
                        </div>
                    </>
                )}
                {
                    <ReportIssueModal
                        visible={isReportModalVisible}
                        onCancel={cancelReportModal}
                        serviceLevelCategory={serviceLevelCategory}
                        adminSwitchedToDistributor={admin_switched_to_distributor}
                        history={props.history}
                    />
                }
            </div>
        </div>
    );
};

const mapStateToProps = (state) => {
    return {
        createOrderData: state.distributor.get('create_order'),
        app_level_configuration: state.auth.get('app_level_configuration'),
        admin_switched_to_distributor: state.admin.get('admin_switched_to_distributor'),
        sso_user_details: state.admin.get('sso_user_details'),
        report_issues: state.admin.get('report_issues'),
    };
};
const mapDispatchToProps = (dispatch) => {
    return {
        distributorResetCreateOrderCompleteFormFields: () => dispatch(Action.distributorResetCreateOrderCompleteFormFields()),
        // fetchAppLevelConfiguration: () =>
        //   dispatch(AuthAction.fetchAppLevelSettings()),
        fetchServiceLevelCategory: (type) => dispatch(Action.fetchServiceLevelCategory(type)),
        getCFAReportIssuesList: (type) => dispatch(AdminAction.getCFAReportIssuesAction(type)),
    };
};

const ConnectNavigation = connect(mapStateToProps, mapDispatchToProps)(Navigation);

export default ConnectNavigation;
