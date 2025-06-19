import React, { useEffect, useState } from 'react';
import NavigationNavigation from "./DistributorNav";
import DistributorHeader from "./DistributorHeader";

import jwt from 'jsonwebtoken';
import { connect } from 'react-redux';
import Auth from '../util/middleware/auth';
import useAuth from '../services/auth/hooks/useAuth';
import config from '../config/server';
import * as Action from '../services/admin/actions/adminAction';
import * as AuthAction from '../services/auth/action';

let DistributorLayout = (props) => {
    const browserHistory = props.history;
    const { loaderShowHide, fetchAppLevelConfiguration} = props;
    let access_token = Auth.getAccessToken();
    const [isPathAdmin] = useState(props.location.pathname.split('/')[1]);
    useEffect(() => {
        fetchAppLevelConfiguration()
    },[])
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
                responseType: config.sso_login.responseType
            }
        }
    });
    let login_id = '';
    if (isPathAdmin !== 'admin') {
        if (!access_token) {
            browserHistory.push("/");
        } else {
            login_id = jwt.decode(access_token).login_id;
        }
    } else if (isPathAdmin === 'admin') {
        loaderShowHide(true);
        setTimeout(() => {
            const isAdminLoggedIn = Auth.adminLoggedIn();
            if (!isAdminLoggedIn) {
                 browserHistory.push("/no-access");
            }
            const ssoAuthTime = window.localStorage.getItem("TCPL_SSO_at");
            const anHourAgo = Date.now() - (1000 * 60 * 60);
            if (new Date(Number(ssoAuthTime)) < new Date(anHourAgo)) {
                Auth.removeSSOCreds();
                window.localStorage.clear();
                signOut();
            }
            loaderShowHide(false);
        }, 3000);
    }
    return (
        <div id="dashboard-wrapper">
            <NavigationNavigation isAdminLogin={isPathAdmin} history={browserHistory}/>
            <DistributorHeader isAdminLogin={isPathAdmin} history={browserHistory} />
            {props.children}
        </div>
    )

}

const mapStateToProps = () => {
    return {}
}
const mapDispatchToProps = (dispatch) => {
    return {
        loaderShowHide: (show) =>
            dispatch(Action.loaderShowHide(show)),
            fetchAppLevelConfiguration: () =>
            dispatch(AuthAction.fetchAppLevelSettings())
    }
}

const ConnectDistributorLayout = connect(
    mapStateToProps,
    mapDispatchToProps
)(DistributorLayout)
export default ConnectDistributorLayout;