import React, { useEffect } from 'react';
import { connect } from 'react-redux';

import config from '../../../config/server';
import useAuth from '../../auth/hooks/useAuth';
import * as Action from '../../../services/auth/action';
import Auth from '../../../util/middleware/auth';
function SuperAdminlogin(props) {
    const browserHistory = props.history;
    window.localStorage.setItem("TCPL_SAP_formData", JSON.stringify([]));
    window.localStorage.setItem("TCPL_SAP_reorderData", JSON.stringify([]));
    window.localStorage.setItem("TCPL_SSOUserDetail", JSON.stringify({}));

    const { fetchAppLevelConfiguration } = props;

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
                responseType: config.sso_login.responseType
            }
        }
    });
    const handleSSOLogin = async (e) => {
        e.preventDefault()
        signIn();
    };

    useEffect(() => {
        fetchAppLevelConfiguration();
        if (Auth.adminLoggedIn() && Auth.checkAdminLogin()) {
            browserHistory.push('/admin/dashboard');
        }
    }, []);


    return (
        <section className="main-page-wrapper otp-page-wrapper">
        <div className="main-page-left">
            <img src="/assets/images/home-pattern.png" alt="" />
        </div>
        <div className="main-page-right">
            <div className="better-logo">
                <img src="/assets/images/better-logo.svg" alt="" />
            </div>
             <div className="tcp-form-wrapper">
           <h1>SUPER ADMIN</h1>

           <div className="tcp-logo-block">
               <img src="/assets/images/tcp-logo.svg" alt="" />
                <h2>PURCHASE ORDER PORTAL</h2>
          </div>
            <div className="distributer-btn">

             <div style={{ marginTop: "-48px", marginLeft: "-22px" }}>
                  <br />
                <a className="sso-login" style={{ border: "1px solid #1268b3", padding: "3px 15px" }} onClick={handleSSOLogin} >
                      Login with SSO
                 </a>
         </div>
          </div>
     </div>
        
        </div>
    </section>
    
    )
}


const mapStateToProps = (/* state */) => {
    return {}
}

const mapDispatchToProps = (dispatch) => {
    return {
        fetchAppLevelConfiguration: () =>
            dispatch(Action.fetchAppLevelSettings()),
    }
}

const ConnectSuperadmin = connect(
    mapStateToProps,
    mapDispatchToProps
)(SuperAdminlogin)

export default ConnectSuperadmin
