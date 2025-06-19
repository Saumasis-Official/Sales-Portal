
import { Route } from "react-router-dom"
import LoginPage from '../services/auth/Login';
import LogoutPage from '../services/auth/Logout';
import ValidateTokenPage from '../services/auth/ValidateToken';
import ResetPasswordPage from '../services/auth/ResetPassword';
export default function Auths(){
    return (
        <>
               
               <Route path="/auth/login" component={LoginPage} />
                <Route path="/auth/logout" component={LogoutPage} />
             
                <Route path="/auth/validate-token" component={ValidateTokenPage} />

              
                <Route
                    path="/auth/reset-password"
                    component={ResetPasswordPage} />
                {/* <IndexRoute component={WelcomePage} onEnter={notLoggedIn} /> */}
        </>   
    )
}