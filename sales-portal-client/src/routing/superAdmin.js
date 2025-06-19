import { Route } from "react-router-dom"
import superadminlogin from '../services/admin/SuperAdminLogin/SuperAdminLogin';
import AuthLayout from '../layout/Auth';

export default function Superadmin(){
    return(
        <>
              <Route path="/superadmin" exact component={AuthLayout}/>
                <Route
                    path="/superadmin/login"
                    component={superadminlogin}
                />
        
        </>
    )
}