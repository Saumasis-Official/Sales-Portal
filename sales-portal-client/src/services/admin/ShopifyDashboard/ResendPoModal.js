import React, { useState, useEffect } from 'react';
import { Modal, Select, Button, notification } from 'antd';
import { connect } from 'react-redux';
import * as AdminActions from '../../admin/actions/adminAction';
import {
  hasViewPermission,
  pages,
  features,
} from '../../../persona/distributorNav';

const { Option } = Select;

const ResendPoModal = ({
  visible,
  onClose,
  getAllResendPOData,
  resendPOData,
  salesOrg,
}) => {
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedText, setSelectedText] = useState(null);
  const [yearOptions, setYearOptions] = useState([]);
  const [textOptions, setTextOptions] = useState([]);

  useEffect(() => {
    if (resendPOData) {
      setYearOptions(resendPOData.map((item) => item.year));
    }
  }, [resendPOData]);

  const fetchText = async (year) => {
    try {
      const res = await getAllResendPOData(null, year, salesOrg);
      if (res.status === 'success') {
        setTextOptions(res.file_name.map((item) => item.file_name));
      } else {
        throw new Error('Fetch text was not successful.');
      }
    } catch (error) {
      notification.error({
        message: 'Error',
        description: error.message,
        duration: 4,
        className: 'notification-error',
      });
    }
  };

  const handleYearChange = async (value) => {
    setSelectedYear(value);
    setSelectedText(null);
    await fetchText(value);
  };

  const handleTextChange = (value) => {
    setSelectedText(value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (selectedYear && selectedText) {
      try {
        const res = await getAllResendPOData(
          null,
          null,
          null,
          selectedText,
        );
        if (res.status === 'success') {
          notification.success({
            message: 'Success',
            description: 'File Processed Successfully',
            duration: 4,
            className: 'notification-success',
          });
        } else {
          throw new Error('Error in processing file.');
        }
      } catch (error) {
        notification.error({
          message: 'Error',
          description: error.message,
          duration: 4,
          className: 'notification-error',
        });
      }
    }
    resetForm();
  };

  const handleCancel = () => {
    resetForm();
  };

  const resetForm = () => {
    setSelectedYear(null);
    setSelectedText(null);
    onClose();
  };

  return (
    <Modal
      title="Resend failed PO to Portal"
      visible={visible}
      onCancel={handleCancel}
      footer={null}
      wrapClassName="comment-modal"
    >
      <form onSubmit={handleSubmit}>
        <div className="comment-fld">
          <label>Year</label>
          <Select
            placeholder="Select Year"
            onChange={handleYearChange}
            value={selectedYear}
          >
            {yearOptions.map((year) => (
              <Option key={year} value={year}>
                {year}
              </Option>
            ))}
          </Select>
        </div>
        <br />
        <div className="comment-fld">
          <label>File Name</label>
          <Select
            placeholder="Select Text"
            onChange={handleTextChange}
            value={selectedText}
            disabled={!selectedYear}
            showSearch
          >
            {textOptions.map((text, index) => (
              <Option key={index} value={text}>
                {text}
              </Option>
            ))}
          </Select>
        </div>
        <br />
        <div className="comment-btn">
          <Button
            type="primary"
            className="submit-btn"
            htmlType="submit"
            disabled={
              !selectedText ||
              hasViewPermission(
                pages.SHOPIFY,
                features.DISABLE_SUBMIT,
              )
            }
          >
            Submit
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const mapStateToProps = (state) => ({});

const mapDispatchToProps = (dispatch) => ({
  getAllResendPOData: (userId, year, salesOrg, fileName) =>
    dispatch(
      AdminActions.getAllResendPOData(
        userId,
        year,
        salesOrg,
        fileName,
      ),
    ),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ResendPoModal);
