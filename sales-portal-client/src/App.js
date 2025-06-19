import React, { useEffect } from 'react';
import ReactGA4 from 'react-ga4';
import AppRoutes from './AppRoutes';
import config from './config/server';
import auth from './util/middleware/auth';
import SpinLoader from './components/SpinLoader';

// import TagManager from 'react-gtm-module'
function App(props) {
    const browserHistory = props.history;
    // const updateCache = (cacheVersion) => {
    //     window.localStorage.setItem("TCPL_CACHE_VERSION", config.cache_version);
    //     if (cacheVersion !== config.cache_version) {
    //         caches.keys().then((names) => {
    //             names.forEach((name) => {
    //                 caches.delete(name);
    //             });
    //         });
    //         console.log('Cache Cleared due to new deployment')
    //     }

    // };
    const clear_Cached = (cache_version, new_cache) => {
        window.localStorage.setItem('TCPL_CACHE_VERSION', new_cache);
        let url = window.location.href;
        if (cache_version !== new_cache) {
            fetch(url, {
                headers: {
                    Pragma: 'no-cache',
                    Expires: '-1',
                    'Cache-Control': 'no-cache',
                },
            }).then(() => {
                console.log('Cache Cleared due to new deployment');
            });
        }
    };

    useEffect(() => {
        const cacheVersion = window.localStorage.getItem('TCPL_CACHE_VERSION');
        const role = auth.getAdminRole();
        let trans_id = JSON.parse(window.localStorage.getItem('CREDIT_LIMIT_REDIRECT_PARAMS'));
        let gt_trans_id = JSON.parse(window.localStorage.getItem('GT_CREDIT_LIMIT_REDIRECT_PARAMS'));
        if (role) {
            if (role.includes('CFA')) {
                browserHistory.push('/admin/cfa-so-requests');
            } else if (role.includes('LOGISTIC_OFFICER')) {
                browserHistory.push('/admin/tse-requests');
            } else if (role.includes('KAMS') || role.includes('MDM') || role.includes('NKAMS')) {
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
            } else if (role.includes('ZONAL_OFFICER')) {
                browserHistory.push('/admin/pdp-update');
            } else if (role.includes('FINANCE')) {
                browserHistory.push('/admin/finance-details');
            } else if (role.includes('FINANCE_CONTROLLER')) {
                browserHistory.push('/admin/finance-controller-details');
            } else if (role.includes('SHOPIFY_UK') || role.includes('SHOPIFY_SUPPORT') || role.includes('SHOPIFY_OBSERVER')) {
                browserHistory.push('/admin/shopify-dashboard');
            } else if (role.includes('CL_PRIMARY_APPROVER') || role.includes('CL_SECONDARY_APPROVER')) {
                switch (window.location.pathname) {
                    case '/admin/credit-dashboard':
                        browserHistory.push('/admin/credit-dashboard');
                        break;
                    default: {
                        const targetPath = trans_id ? `/admin/cl-order-request/${trans_id?.transaction_id}` : '/admin/credit-dashboard';
                        browserHistory.push(targetPath);
                        break;
                    }
                }
            } else if (role.includes('RCM') || role.includes('HOF') || role.includes('GT_PRIMARY_APPROVER') || role.includes('GT_SECONDARY_APPROVER')) {
                switch (window.location.pathname) {
                    case '/admin/credit-dashboard':
                        browserHistory.push('/admin/credit-dashboard');
                        break;
                    default: {
                        const targetPath = gt_trans_id ? `/admin/cl-gt-request/${gt_trans_id?.transaction_id}` : '/admin/credit-dashboard';
                        browserHistory.push(targetPath);
                        break;
                    }
                }
            }
        }
        // updateCache(cacheVersion);
        // clear_Cached(cacheVersion, data.cache_version)

        clear_Cached(cacheVersion, config.cache_version);
    }, []);

    useEffect(() => {
        if (config.app_environment === 'uat' || config.app_environment === 'prod' || config.app_environment === 'dev') {
            ReactGA4.initialize(config.google_analytics_id);

            ReactGA4.send({
                hitType: 'pageview',
                page: window.location.pathname + window.location.search,
            });
            ReactGA4.event({
                category: 'Page Visits',
                action: window.location.pathname,
            });
        }
    }, [window.location.pathname]);
    return (
        <div>
            <SpinLoader message="Loading ...">
                <AppRoutes />
            </SpinLoader>
        </div>
    );
}

export default App;
