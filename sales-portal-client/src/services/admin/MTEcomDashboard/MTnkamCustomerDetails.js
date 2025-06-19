import React, { useState } from 'react';
import { connect } from 'react-redux';
import '../AppSettings/AppSettings1.css';
import '../MdmDashboard/MdmMasterDashboard.css';
import AddKamsCustomers from './AddKamsCustomers';
import ViewKamsCustomers from './ViewKamsCustomers';

const MTnkamCustomerDetails = (props) => {
  const [tabName, setTabName] = useState('Add KAMS Customers');
  const tabFunction = (value) => {
    setTabName(value);
  };

  return (
    <>
      <div className="mt-nkam-customer-details-wrapper">
        <div className="admin-dashboard-block">
          <div className="page-title-survey tabs-kams">
            {tabName === 'Add KAMS Customers' && (
              <h2>Add KAMS/NKAMS Customers </h2>
            )}
            {tabName === 'KAMS Customer Details' && (
              <h2>KAMS/NKAMS Customer Details</h2>
            )}
          </div>
          <div className="dashboard-head mt10 kams-tabs">
            <div className="dashboard-tabs add-kams">
              <button
                className={
                  tabName === 'Add KAMS Customers'
                    ? `tablink active`
                    : 'tablink'
                }
                onClick={() => tabFunction('Add KAMS Customers')}
              >
                <span>Add KAMS/NKAMS Customers</span>
              </button>
              <button
                className={
                  tabName === 'KAMS Customer Details'
                    ? `tablink active`
                    : 'tablink'
                }
                onClick={() => tabFunction('KAMS Customer Details')}
              >
                <span>KAMS/NKAMS Customer Details</span>
              </button>
            </div>
          </div>
          {tabName === 'Add KAMS Customers' && <AddKamsCustomers />}
          {tabName === 'KAMS Customer Details' && (
            <ViewKamsCustomers />
          )}
        </div>
      </div>
    </>
  );
};
const mapStateToProps = (state) => {
};
const mapDispatchToProps = (dispatch) => {
};
export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(MTnkamCustomerDetails);
