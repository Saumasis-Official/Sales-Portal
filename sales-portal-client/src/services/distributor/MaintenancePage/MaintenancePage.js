import React from 'react'
import './MaintenancePage.css'
import { Link } from 'react-router-dom'
import { connect } from 'react-redux';
import * as Action from '../../admin/actions/adminAction';
import { useEffect } from 'react'
import { useState } from 'react'
import { notLoggedIn } from '../../../util/middleware';
import AuthLayout from '../../../layout/Auth';
function MaintenancePage(props) {
    notLoggedIn(props.history.location.pathname,props.history.replace);
    const { getMaintenanceRequests } = props
    const [maintainancetime, setMaintenanceTime] = useState()
    async function maintenanceendtime() {
        const response = await getMaintenanceRequests();
        if (response?.data) {
            if (response.data.length > 0) {
                const mytime = new Date(`${response.data[0].start_date_time}`).getTime();
                setMaintenanceTime(`${new Date(mytime + response.data[0].duration * 60 * 1000)}`.slice(0, 21))
            }
        }
    }
    useEffect(async () => {
        maintenanceendtime()
    }, []
    )
    return (
      <AuthLayout>
        <div className="tcp-form-wrapper container">
          <div className="tcp-logo-block inner-container">
            <img
              src="/assets/images/tcp-logo.svg"
              id="image-logo"
              alt="Image Not Available"
            />
            <div className="maintainance-message ">
              Site is Und
              <Link
                to="superadmin/login"
                className="super-admin-login-link"
              >
                er
              </Link>{' '}
              Maintenance
            </div>
            <h4 className="time">Till - {maintainancetime}</h4>
            <h4 className="try-again loading">
              Please Try Again Later
            </h4>
          </div>
        </div>
        <div className="super-admin-login">
          {/* <Link to='superadmin/login'>Super admin login</Link> */}
        </div>
      </AuthLayout>
    );
}

const mapDispatchToProps = (dispatch, ownProps) => {
    return {
        getMaintenanceRequests: () =>
            dispatch(Action.getMaintenanceRequests()),

    };
};

const Maintenancepage = connect(
    null,
    mapDispatchToProps,
)(MaintenancePage);
export default Maintenancepage