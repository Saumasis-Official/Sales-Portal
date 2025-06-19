import React, { useEffect, useState } from 'react';
import { Modal, notification } from 'antd';
import '.././PDPUnlockRequest/DistributorDetailsModal.css';
import { fetchAutoClosureMTEcomSingleGrnCustomerDetails } from '../actions/adminAction';
import { connect } from 'react-redux';

const EcomAutoCLosureDetails = ({
  isModalVisible,
  hideModal,
  payerCode,
  fetchCustomerDetails,
}) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (payerCode) {
        const payload = { payer_code: payerCode };
        try {
          const response = await fetchCustomerDetails(payload);
          if (response && response.success) {
            setData(response.data);
          } else {
            notification.error({
              message: 'Error Occurred',
              description: response?.message
                ? response.message
                : 'Some error occurred while fetching data',
              duration: 5,
              className: 'notification-error',
            });
          }
        } catch (error) {
          notification.error({
            message: 'Technical Error',
            description: 'Some error occurred while fetching data',
            duration: 5,
            className: 'notification-error',
          });
        }
      }
    };

    fetchData();
  }, [payerCode]);

  return (
    <div className="distributor-container">
      {payerCode && (
        <Modal
          maskStyle={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
          title="Customer Details"
          visible={!!isModalVisible}
          onCancel={hideModal}
          footer={null}
          wrapClassName="comment-modal"
          className="distributor-details-modal"
          bodyStyle={{ padding: '10px' }}
        >
          <div className="distributor-table-header">
            <table className="distributor-table">
              <thead>
                <tr className="form-wrapper">
                  <th className="width10">Payer Code</th>
                  <th className="width10">Payer Name</th>
                  <th className="width10">Customer Code</th>
                  <th className="width10">Customer Name</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={index}>
                    <td>{item.payer_code}</td>
                    <td>{item.payer_name}</td>
                    <td>{item.customer_code}</td>
                    <td>{item.customer_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
};

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch) => ({
  fetchCustomerDetails: (payload) =>
    dispatch(fetchAutoClosureMTEcomSingleGrnCustomerDetails(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(EcomAutoCLosureDetails);
