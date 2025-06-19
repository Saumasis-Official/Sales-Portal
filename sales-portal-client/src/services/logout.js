import { connect } from 'react-redux';
import ReactGA4 from 'react-ga4';
import * as AdminAction from "./admin/actions/adminAction";
import * as DashboardAction from './distributor/actions/dashboardAction';
import * as DistAction from './distributor/action';
import useAuth from './auth/hooks/useAuth';
import config from '../config/server';
import Util from "../util/helper";
import auth from '../util/middleware/auth';
import { useEffect } from 'react';
// import logoutIcon from '../../public/assets/images/logout.svg';
import searchIcon from '../assets/images/search.svg';


const LogoutHandler = (props) => {
    const { invalidateAdminSession, logout, distributorResetCreateOrderCompleteFormFields, history} = props;
    const SSOConfig = config.sso_login;
    const role = auth.getRole();
    const correlationId = window.localStorage.getItem('TCPL_correlation_id');

    const { signOut } = useAuth({
        provider: SSOConfig.provider,
        options: {
            userPoolId: SSOConfig.userPoolId,
            userPoolWebClientId: SSOConfig.userPoolWebClientId,
            oauth: {
                domain: SSOConfig.domain,
                scope: SSOConfig.scope,
                redirectSignIn: SSOConfig.redirectSignIn,
                redirectSignOut: SSOConfig.redirectSignOut,
                region: SSOConfig.region,
                responseType: SSOConfig.responseType
            }
        }
    });

    useEffect(() => {
        function clearLocalStorage() {
            //updating local storage
            window.localStorage.setItem("TCPL_SAP_formData", JSON.stringify([]));
            window.localStorage.setItem("TCPL_SAP_reorderData", JSON.stringify([]));
            window.localStorage.setItem("TCPL_SSOUserDetail", JSON.stringify({}));
    
            window.localStorage.removeItem("role");
            window.localStorage.removeItem("distributorRole");
            window.localStorage.removeItem('TCPL_SSO_token');
            localStorage.removeItem('TCPL_SSO_at');
            window.localStorage.removeItem("SSOUserName");
            window.localStorage.removeItem("user_id");
            window.localStorage.removeItem("email");
            window.localStorage.removeItem("db-order-pages-opened");
            distributorResetCreateOrderCompleteFormFields();
        }
        async function logoutUser(params) {
            //logging out user
            if(role){
                const data = {
                    correlationId,
                    userId : auth.getUserEmail(),
                    role
                }
    
                const invalidateSessionResponse = await invalidateAdminSession(data);
                if(invalidateSessionResponse?.success){
                    if (config.app_environment === 'uat' || config.app_environment === 'prod' || config.app_environment === 'dev') {
                        ReactGA4.event({
                            category: 'Login',
                            action: 'User logged out'
                        });
                    };
                    clearLocalStorage();
                    signOut();
                }else{
                    Util.notificationSender("Error","Failed to Logout");
                }
            }else{
                const distributorLogoutResponse = await logout();
                if(distributorLogoutResponse?.success){
                    if (config.app_environment === 'uat' || config.app_environment === 'prod' || config.app_environment === 'dev') {
                        ReactGA4.event({
                            category: 'Login',
                            action: 'User logged out'
                        });
                    };
                    clearLocalStorage();
                    history.push('/auth/logout');
                }else{
                    Util.notificationSender("Error","Failed to Logout");
                }
            }
        }
        setTimeout(() => {
            logoutUser();
        },3000);
    }, []);

    

    return (
        <div className='logout-body'>  
            <img src="/assets/images/logout-icon.svg" alt="" className='logout-icon' />
            <span className='logout-text'>Logging Out ...</span>
        </div>
    );
    
}

const mapStateToProps = (state) => {
    return {
        sso_user_details: state.admin.get('sso_user_details'),
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        distributorResetCreateOrderCompleteFormFields: () => dispatch(DistAction.distributorResetCreateOrderCompleteFormFields()),
        invalidateAdminSession : (data)=>dispatch(AdminAction.invalidateSession(data)),
        logout: () => dispatch(DashboardAction.logout()),
    }
}

const logoutHandler = connect(mapStateToProps, mapDispatchToProps)(LogoutHandler);

export default logoutHandler;