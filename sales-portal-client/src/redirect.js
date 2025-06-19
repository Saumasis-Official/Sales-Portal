import React from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import config from './config/server';
import useAuth from './services/auth/hooks/useAuth';

const Redirect = () => {
    const location = useLocation();
    const history = useHistory();

    const queryParams = new URLSearchParams(location.search);
    const path = queryParams.get('path');

    const original_path = path.replaceAll('*', '/');
    window.localStorage.setItem('REDIRECT_URL', `/${original_path}`);
    if (original_path === 'admin/rush-order-details') {
        const po_num = queryParams.get('po_num');
        const dist_id = queryParams.get('dist_id');
        const action = queryParams.get('action');
        const paramsObj = {
            po_num: po_num,
            dist_id: dist_id,
        };
        if (action != null) paramsObj['action'] = action;
        window.localStorage.setItem('REDIRECT_PARAMS', JSON.stringify(paramsObj));
    } else if (original_path === 'admin/pdp-unlock-requests') {
        const id = queryParams.get('id');
        const action = queryParams.get('action');
        const paramsObj = {
            id: id,
        };
        if (action != null) paramsObj['action'] = action;
        window.localStorage.setItem('REDIRECT_PARAMS', JSON.stringify(paramsObj));
    } else if (original_path === 'admin/cl-order-request') {
        const transaction_id = queryParams.get('transaction_id');
        const action = queryParams.get('action');
        const paramsObj = {
            transaction_id: transaction_id,
        };
        if (action != null) paramsObj['action'] = action;
        window.localStorage.setItem('CREDIT_LIMIT_REDIRECT_PARAMS', JSON.stringify(paramsObj));
    } else if (original_path === 'admin/cl-gt-request') {
        const transaction_id = queryParams.get('transaction_id');
        const action = queryParams.get('action');
        const paramsObj = {
            transaction_id: transaction_id,
        };
        if (action != null) paramsObj['action'] = action;
        window.localStorage.setItem('GT_CREDIT_LIMIT_REDIRECT_PARAMS', JSON.stringify(paramsObj));
    }
    const token = window.localStorage.getItem('TCPL_SSO_token');

    const { signIn } = useAuth({
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

    if (!token) {
        signIn();
    } else {
        if (original_path === 'admin/rush-order-details') {
            let path = original_path;
            const po_num = queryParams.get('po_num');
            const dist_id = queryParams.get('dist_id');
            path = path + `/${po_num}/${dist_id}`;
            if (queryParams.get('action') != null)
                history.push({
                    pathname: `/${path}`,
                    state: { action: queryParams.get('action') },
                });
            else history.push({ pathname: `/${path}` });
        } else if (original_path === 'admin/pdp-unlock-requests') {
            let path = original_path;
            const id = queryParams.get('id');
            const action = queryParams.get('action');
            if (action) {
                const obj = {
                    pathname: `/${path}`,
                    state: { id: id, action: action },
                };
                history.push(obj);
            } else {
                history.push({ pathname: `/${path}` });
            }
        } else if (original_path === 'admin/cl-order-request') {
            let path = original_path;
            const transaction_id = queryParams.get('transaction_id');
            path = path + `/${transaction_id}`;
            if (queryParams.get('action') != null)
                history.push({
                    pathname: `/${path}`,
                    state: { action: queryParams.get('action') },
                });
            else history.push({ pathname: `/${path}` });
        } else if (original_path === 'admin/cl-gt-request') {
            let path = original_path;
            const transaction_id = queryParams.get('transaction_id');
            path = path + `/${transaction_id}`;
            if (queryParams.get('action') != null)
                history.push({
                    pathname: `/${path}`,
                    state: { action: queryParams.get('action') },
                });
            else history.push({ pathname: `/${path}` });
        }
    }

    return <div>Redirecting...</div>;
};

export default Redirect;
