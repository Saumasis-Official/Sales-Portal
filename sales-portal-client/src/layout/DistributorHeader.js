import React, { useState, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import { Tooltip } from 'antd';
import { Link } from 'react-router-dom';
import { BellOutlined } from '@ant-design/icons';
import Auth from '../util/middleware/auth';
import * as Action from '../services/distributor/action';
import * as AdminAction from '../../src/services/admin/actions/adminAction';
import * as DashboardAction from '../services/distributor/actions/dashboardAction';
import useAuth from '../services/auth/hooks/useAuth';
import config from '../config/server';
import appLevelConfig from '../config';
import ReactGA4 from 'react-ga4';
import { pages, hasViewPermission } from '../persona/distributorHeader.js';
import Util from '../util/helper/index.js';
import _ from 'lodash';

var adminRole;
const appConfig = appLevelConfig.app_level_configuration;

let DistributorHeader = (props) => {
    const browserHistory = props.history;
    const isEmpty = (obj) => {
        return Object.keys(obj).length === 0;
    };
    const [isAdmin] = useState(props.isAdminLogin);
    const [activeCount, setActiveCount] = useState(0);
    const [profileFeatureFlag, setProfileFeatureFlag] = useState(true);
    const [changePasswordFeatureFlag, setChangePasswordFeatureFlag] = useState(true);
    const [sessionInfoFeatureFlag, setSessionInfoFeatureFlag] = useState(false);
    const { app_level_configuration, sso_user_details, userData, getASMRequests, update_req_response, asm_requests, invalidateAdminSession } = props;
    const offset = 0;
    const limit = 10;
    const status = 'PENDING';
    const [data, setData] = useState([]);
    const role = Auth.getRole();
    const showCfa = role === false ? true : false;
    let ssoUserName = '';
    if (!isEmpty(sso_user_details)) {
        ssoUserName = sso_user_details.data && sso_user_details.data[0].first_name + ' ' + sso_user_details.data[0].last_name;
        window.localStorage.setItem('SSOUserName', ssoUserName);
    }

    const { signOut } = useAuth({
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

    // const handleLogoutClick = async () => {
    //     const role = Auth.getRole();
    //     let data = {};
    //     if (role) {
    //         data.correlationId = window.localStorage.getItem('TCPL_correlation_id');
    //         data.userId = Auth.getUserEmail();
    //         data.role = Auth.getAdminRole();
    //         try {
    //             await invalidateAdminSession(data);
    //         } catch (err) {
    //             console.log(err);
    //         }
    //     }
    //     window.localStorage.setItem('TCPL_SAP_formData', JSON.stringify([]));
    //     window.localStorage.setItem('TCPL_SAP_reorderData', JSON.stringify([]));
    //     window.localStorage.setItem('TCPL_SSOUserDetail', JSON.stringify({}));
    //     window.localStorage.removeItem('role');
    //     window.localStorage.removeItem('distributorRole');
    //     window.localStorage.removeItem('TCPL_SSO_token');
    //     localStorage.removeItem('TCPL_SSO_at');
    //     window.localStorage.removeItem('SSOUserName');
    //     window.localStorage.removeItem('user_id');
    //     window.localStorage.removeItem('email');
    //     props.distributorResetCreateOrderCompleteFormFields();
    //     if (config.app_environment === 'uat' || config.app_environment === 'prod' || config.app_environment === 'dev') {
    //         ReactGA4.event({
    //             category: 'Login',
    //             action: 'User logged out',
    //         });
    //     }

    //     if (role) {
    //         signOut();
    //     } else {
    //         props.logout();
    //         browserHistory.push('/auth/logout');
    //     }
    // };

    const handleLogout = () => {
        browserHistory.push('/logout');
    };
    const [open, setOpen] = useState(false);
    const myRef = useRef();

    const ssoRole = sso_user_details.data && sso_user_details.data.length && sso_user_details.data[0].roles;
    useEffect(() => {
        adminRole = Auth.getAdminRole();
        if (!_.isEmpty(_.intersection(adminRole, ['KAMS', 'MDM', 'NKAMS']))) {
            switch (window.location.pathname) {
                case '/admin/mdm-dashboard':
                    browserHistory.push('/admin/mdm-dashboard');
                    break;
                case '/admin/mt-ecom-dashboard':
                    browserHistory.push('/admin/mt-ecom-dashboard');
                    break;
                case '/admin/po-data':
                    browserHistory.push('/admin/po-data');
                    break;
                // case '/admin/credit-dashboard':
                //     browserHistory.push("/admin/credit-dashboard");
                //     break;
                default:
                    browserHistory.push('/admin/mdm-dashboard');
                    break;
            }
        } else if (!_.isEmpty(_.intersection(adminRole, ['SHOPIFY_UK', 'SHOPIFY_SUPPORT', 'SHOPIFY_OBSERVER']))) {
            browserHistory.push('/admin/shopify-dashboard');
        } else if (_.intersection(adminRole, ['CL_PRIMARY_APPROVER', 'CL_SECONDARY_APPROVER']).length > 0) {
            let trans_id = JSON.parse(window.localStorage.getItem('CREDIT_LIMIT_REDIRECT_PARAMS'));
            if (trans_id?.transaction_id) {
                browserHistory.push(`/admin/cl-order-request/${trans_id?.transaction_id}`);
            }
        } else if (_.intersection(adminRole, ['RCM', 'HOF', 'GT_PRIMARY_APPROVER', 'GT_SECONDARY_APPROVER'])) {
            let trans_id = JSON.parse(window.localStorage.getItem('GT_CREDIT_LIMIT_REDIRECT_PARAMS'));
            if (trans_id?.transaction_id) {
                browserHistory.push(`/admin/cl-gt-request/${trans_id?.transaction_id}`);
            }
        }
    }, [ssoRole]);

    const handleMenuClick = (e) => {
        e.preventDefault();
        if (open === false && sessionInfoFeatureFlag) {
            props
                .getSessionsLog({
                    from: fromDate,
                    to: toDate,
                    type: 'active',
                    login_id: userData.login_id,
                })
                .then((response) => {
                    if (response && response.data && response.data.data) {
                        setActiveCount(response.data.data.totalCount);
                    }
                });
        }
        setOpen(!open);
    };

    const handleClickOutside = (e) => {
        if (!myRef.current?.contains(e.target)) {
            setOpen(false);
        }
    };

    const handleSubMenu = () => {
        setOpen(false);
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    });
    let screenWidth = window.screen.width;
    const toggleLeftNavbar = () => {
        if (screenWidth <= 767) {
            document.querySelector('body').classList.add('show-sidebar');
        } else {
            document.querySelector('body').classList.remove('hide-sidebar');
        }
    };

    const { fromDate, toDate } = Util.activeSessionToAndFromTimestamp();

    useEffect(() => {
        if (app_level_configuration && app_level_configuration.length) {
            for (let config of app_level_configuration) {
                if (!config) continue;
                if (config.key === appConfig.profile_update.key && config.value === appConfig.profile_update.inactive_value) {
                    setProfileFeatureFlag(false);
                }
                if (config.key === appConfig.change_password.key && config.value === appConfig.change_password.inactive_value) {
                    setChangePasswordFeatureFlag(false);
                }
                if (config.key === appConfig.session_info.key && config.value === appConfig.session_info.active_value) {
                    setSessionInfoFeatureFlag(true);
                }
            }
        } else {
            // props.fetchAppLevelConfiguration();
        }
    }, [app_level_configuration]);

    useEffect(() => {
        if (sso_user_details.data && sso_user_details.data.length && sso_user_details.data[0].roles) {
            getASMRequests({ offset, limit, status });
        }
    }, [update_req_response, sso_user_details]);

    useEffect(() => {
        if (asm_requests) {
            if (asm_requests.rows) {
                setData(asm_requests?.rows);
            }
        }
    }, [asm_requests]);
    return (
        <header className="dashboard-header">
            <div className="header-logo">
                <div id="nav-icon2" className="nav-icon" onClick={toggleLeftNavbar}>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <img src="/assets/images/tcp-logo.svg" alt="" />
            </div>
            <div className="header-right">
                {hasViewPermission(pages.NOTIFICATION_ICON) && (
                    <Link to="/admin/pending-requests">
                        <Tooltip placement="bottom" title="Pending Requests">
                            <div className="top-notification">
                                <BellOutlined />
                                {data && data.length > 0 && <div className="req-count">{data && data.length}</div>}
                            </div>
                        </Tooltip>
                    </Link>
                )}
                {isAdmin === 'admin' ? (
                    <span>{ssoUserName ? ssoUserName : window.localStorage.getItem('SSOUserName')}</span>
                ) : (
                    <span>
                        {userData && userData.name} ({userData && userData.login_id})
                    </span>
                )}
                <div ref={myRef} className="user-img">
                    <img onClick={(e) => handleMenuClick(e)} src="/assets/images/user.svg" alt="" />
                    <ul className={`sub-menu ${isAdmin === 'admin' ? 'admin-sub-menu' : ''}`} onClick={handleSubMenu} style={{ display: open ? 'block' : 'none' }}>
                        {isAdmin === 'admin' ? (
                            <>
                                {
                                    <>
                                        {hasViewPermission(pages.APP_SETTINGS) && (
                                            <li>
                                                <div className="change-password">
                                                    <Link to="/admin/app-settings">
                                                        <img src="/assets/images/setting-icon.svg" alt="" style={{ width: '16px' }} /> <em>App Settings</em>
                                                    </Link>
                                                </div>
                                            </li>
                                        )}

                                        {hasViewPermission(pages.USER_MANAGEMENT) && (
                                            <li>
                                                <div className="change-password">
                                                    <Link to="/admin/cfa-process">
                                                        <img src="/assets/images/cfa-process-logs.svg" alt="" style={{ width: '16px' }} /> <em>CFA Dashboard</em>
                                                    </Link>
                                                </div>
                                            </li>
                                        )}

                                        {hasViewPermission(pages.USER_MANAGEMENT) && (
                                            <li>
                                                <div className="change-password">
                                                    <Link to="/admin/user-management">
                                                        <img src="/assets/images/user-management.svg" alt="" style={{ width: '13px' }} /> <em>User Management</em>
                                                    </Link>
                                                </div>
                                            </li>
                                        )}

                                        {hasViewPermission(pages.SYNC_JOBS) && (
                                            <li>
                                                <div className="change-password">
                                                    <Link to="/admin/sync-jobs">
                                                        <img src="/assets/images/sync-job.svg" alt="" style={{ width: '13px' }} /> <em>Sync Jobs</em>
                                                    </Link>
                                                </div>
                                            </li>
                                        )}

                                        {hasViewPermission(pages.MAINTENANCE) && (
                                            <li>
                                                <div className="maintenance">
                                                    <Link to="/admin/updatemaintenance">
                                                        <img src="/assets/images/maintenance.svg" alt="" style={{ width: '16px' }} /> <em>Maintenance</em>
                                                    </Link>
                                                </div>
                                            </li>
                                        )}

                                        {hasViewPermission(pages.HELP_MANAGEMENT) && (
                                            <li>
                                                <div className="file-history">
                                                    <Link to="/admin/file-upload-history">
                                                        <img src="/assets/images/help section.svg" alt="" style={{ width: '16px' }} /> <em>Help Management</em>
                                                    </Link>
                                                </div>
                                            </li>
                                        )}

                                        {hasViewPermission(pages.SESSION_LOGS) && (
                                            <li>
                                                <div className="change-password">
                                                    <Link to="/admin/session-log">
                                                        <img src="/assets/images/session-icon.svg" alt="" style={{ width: '13px' }} /> <em>Session logs</em>
                                                    </Link>
                                                </div>
                                            </li>
                                        )}

                                        {hasViewPermission(pages.REPORTS) && (
                                            <li>
                                                <div className="change-password">
                                                    <Link to="/admin/report">
                                                        <img src="/assets/images/chart.svg" alt="" style={{ width: '13px' }} /> <em>Reports</em>
                                                    </Link>
                                                </div>
                                            </li>
                                        )}

                                        {hasViewPermission(pages.MATERIAL_LIST) && (
                                            <li>
                                                <div className="change-password">
                                                    <Link to="/admin/sap-material-dashboard">
                                                        <img src="/assets/images/icons8-material-list.png" alt="material-list-page-icon" style={{ width: '13px' }} />{' '}
                                                        <em>Material List</em>
                                                    </Link>
                                                </div>
                                            </li>
                                        )}
                                        {hasViewPermission(pages.STOCK_LEVEL_CHECK) && (
                                            <li>
                                                <div className="change-password">
                                                    <Link to="/admin/stock-level-check">
                                                        <img src="/assets/images/stock-level-check.svg" alt="material-list-page-icon" style={{ width: '13px' }} />{' '}
                                                        <em>Stock Level Check</em>
                                                    </Link>
                                                </div>
                                            </li>
                                        )}
                                        {hasViewPermission(pages.CFA_DEPOT_MAPPING) && (
                                            <li>
                                                <div className="change-password">
                                                    <Link to="/admin/cfa-depot">
                                                        <img src="/assets/images/depot.svg" alt="material-list-page-icon" style={{ width: '13px' }} /> <em>CFA Depot Mapping</em>
                                                    </Link>
                                                </div>
                                            </li>
                                        )}

                                        {hasViewPermission(pages.CFA_SURVEY) && (
                                            <li>
                                                <div className="change-password">
                                                    <Link to="/admin/cfa-survey">
                                                        <img src="/assets/images/icon-cfa-survey.png" alt="" style={{ width: '13px' }} />
                                                        <em>CFA Survey</em>
                                                    </Link>
                                                </div>
                                            </li>
                                        )}

                                        {hasViewPermission(pages.CREDIT_LIMIT) && (
                                            <li>
                                                <div className="change-password">
                                                    <Link to="/admin/credit-dashboard">
                                                        <img src="/assets/images/credit-limit.svg" alt="" style={{ width: '13px' }} />
                                                        <em>Credit Limit</em>
                                                    </Link>
                                                </div>
                                            </li>
                                        )}
                                        {hasViewPermission(pages.RULES_CONFIGURATION) && (
                                            <li>
                                                <div className="change-password">
                                                    <Link to="/admin/rules-configuration">
                                                        <img src="/assets/images/material-list-page-icon.png" alt="" style={{ width: '13px' }} />
                                                        <em>Rules Configuration</em>
                                                    </Link>
                                                </div>
                                            </li>
                                        )}
                                        {hasViewPermission(pages.FINANCE) && (
                                            <li>
                                                <div className="change-password">
                                                    <Link to="/admin/finance-details">
                                                        <img src="/assets/images/so-request.svg" alt="" style={{ width: '13px' }} />
                                                        <em>GST/PAN Details</em>
                                                    </Link>
                                                </div>
                                            </li>
                                        )}
                                        {hasViewPermission(pages.FINANCE_CONTROLLER) && (
                                            <li>
                                                <div className="change-password">
                                                    <Link to="/admin/finance-controller-details">
                                                        <img src="/assets/images/shield.svg" alt="" style={{ width: '13px' }} />
                                                        <em>NOC Report</em>
                                                    </Link>
                                                </div>
                                            </li>
                                        )}

                                        {hasViewPermission(pages.SHOPIFY_REPORTS) && (
                                            <li>
                                                <div className="change-password">
                                                    <Link to="/admin/shopify-report">
                                                        <img src="/assets/images/chart.svg" alt="" style={{ width: '13px' }} /> <em>Shopify Reports</em>
                                                    </Link>
                                                </div>
                                            </li>
                                        )}

                                        {hasViewPermission(pages.MT_ECOM_REPORTS) && (
                                            <li>
                                                <div className="change-password">
                                                    <Link to="/admin/mt-ecom-report">
                                                        <img src="/assets/images/chart.svg" alt="" style={{ width: '13px' }} /> <em>MT-Ecom Reports</em>
                                                    </Link>
                                                </div>
                                            </li>
                                        )}

                                        {hasViewPermission(pages.NKAM_DETAIL) && (
                                            <li>
                                                <div className="change-password">
                                                    <Link to="/admin/mt-nkam-customer-details">
                                                        <img src="/assets/images/user-management.svg" alt="" style={{ width: '13px' }} /> <em>KAMS/NKAMS Mapping Details</em>
                                                    </Link>
                                                </div>
                                            </li>
                                        )}

                                        {hasViewPermission(pages.SO_SYNC) && (
                                            <li>
                                                <div className="change-password">
                                                    <Link to="/admin/mt-ecom-customer-details">
                                                        <img src="/assets/images/user-management.svg" alt="" style={{ width: '13px' }} /> <em>MT-ECOM Customer Details</em>
                                                    </Link>
                                                </div>
                                            </li>
                                        )}
                                        {hasViewPermission(pages.AUTO_CLOSURE) && (
                                            <li>
                                                <div className="change-password">
                                                    <Link to="/admin/auto-closure">
                                                        <img src="/assets/images/checkmark.svg" alt="" style={{ width: '13px' }} /> <em>Auto Closure</em>
                                                    </Link>
                                                </div>
                                            </li>
                                        )}

                                        {hasViewPermission(pages.DELIVERY_CODE_REPORT) && (
                                            <li>
                                                <div className="change-password">
                                                    <Link to="/admin/delivery-code-reports">
                                                        <img src="/assets/images/chart.svg" alt="" style={{ width: '13px' }} /> <em>Delivery Code Reports</em>
                                                    </Link>
                                                </div>
                                            </li>
                                        )}
                                    </>
                                }
                                <li onClick={handleSubMenu}>
                                    <div className="change-password">
                                        <a href="#" onClick={handleLogout}>
                                            <img src="/assets/images/log-out.svg" alt="" style={{ width: '11px' }} />
                                            <em>Logout</em>
                                        </a>
                                    </div>
                                </li>
                            </>
                        ) : (
                            <>
                                {sessionInfoFeatureFlag && (
                                    <li>
                                        <div className="change-password session-counter">
                                            <Link to="/">
                                                <em>{activeCount === '1' ? `${activeCount} Active Session` : `${activeCount} Active Sessions`}</em>
                                            </Link>
                                        </div>
                                    </li>
                                )}

                                {profileFeatureFlag && (
                                    <li>
                                        <div className="change-password">
                                            <Link to="/distributor/profile">
                                                <img src="/assets/images/profile.svg" alt="" /> <em>Profile</em>
                                            </Link>
                                        </div>
                                    </li>
                                )}
                                {/* {showCfa && (
                                    <li>
                                        <div className="change-password">
                                            <Link to="/distributor/cfa-survey">
                                                <img src="/assets/images/survey.svg" alt="" className="survey-icon" /> <em>CFA Survey</em>
                                            </Link>
                                        </div>
                                    </li>
                                )} */}
                                {changePasswordFeatureFlag && (
                                    <li>
                                        <div className="change-password">
                                            <Link to="/distributor/change-password">
                                                <img src="/assets/images/change-password.svg" alt="" /> <em>Change Password</em>
                                            </Link>
                                        </div>
                                    </li>
                                    )}
                                    
                                <li>
                                    <div className="change-password">
                                        <a href="#" onClick={handleLogout}>
                                            <img src="/assets/images/logout.svg" alt="" /> <em>Logout</em>
                                        </a>
                                    </div>
                                </li>
                            </>
                        )}
                    </ul>
                </div>
            </div>
        </header>
    );
};

const mapStateToProps = (state) => {
    let userData = {};
    const token = Auth.getAccessToken();
    if (token !== null) {
        userData = Auth.decodeToken(token);
    }
    return {
        sso_user_details: state.admin.get('sso_user_details'),
        app_level_configuration: state.auth.get('app_level_configuration'),
        userData,
        asm_requests: state.admin.get('asm_requests'),
    };
};
const mapDispatchToProps = (dispatch) => {
    return {
        distributorResetCreateOrderCompleteFormFields: () => dispatch(Action.distributorResetCreateOrderCompleteFormFields()),
        getSessionsLog: (data) => dispatch(Action.getSessionsLog(data)),
        logout: () => dispatch(DashboardAction.logout()),
        // fetchAppLevelConfiguration: () => dispatch(AuthAction.fetchAppLevelSettings()),
        getASMRequests: (offset, limit, status) => dispatch(AdminAction.getASMRequests(offset, limit, status)),
        invalidateAdminSession: (data) => dispatch(AdminAction.invalidateSession(data)),
    };
};

const ConnectDistributorHeader = connect(mapStateToProps, mapDispatchToProps)(DistributorHeader);

export default ConnectDistributorHeader;
