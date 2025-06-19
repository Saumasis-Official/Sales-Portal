import React, { useEffect, useState } from 'react';
import { Modal, notification } from 'antd';
import '.././PDPUnlockRequest/DistributorDetailsModal.css';
import { fetchMultiGrnCustomerDetails } from '../actions/adminAction';
import { connect } from 'react-redux';

const MTMultiGrnCustomerDetails = ({
  isDetailsModalVisible,
  hideDetailsModal,
  fetchMultiGrnCustomerDetails,
}) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const payload = { customer_group: '14' };
      try {
        const response = await fetchMultiGrnCustomerDetails(payload);
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
    };

    fetchData();
  }, [fetchMultiGrnCustomerDetails]);

  return (
    <div className="distributor-container">
      <Modal
        maskStyle={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
        title="Customer Details"
        visible={!!isDetailsModalVisible}
        onCancel={hideDetailsModal}
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
    </div>
  );
};

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch) => ({
  fetchMultiGrnCustomerDetails: (payload) =>
    dispatch(fetchMultiGrnCustomerDetails(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(MTMultiGrnCustomerDetails);
