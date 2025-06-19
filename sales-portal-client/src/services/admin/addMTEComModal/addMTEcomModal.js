import React, { useState } from 'react';
import { Modal, Select } from 'antd';
import LocalAuth from '../../../util/middleware/auth';
import './addMTEcomModal.css';
import { hasRaisePermission, pages } from '../../../persona/requests';

let AddMTEcomModal = (props) => {
  const { Option } = Select;
  const {
    createRequest,
    flag,
    poType,
    workflowType,
    createRequestWorkflow,
    customers
  } = props;
  const [customerType, setCustomerType] = useState('');
  const [customer_code, setCustomerCode] = useState('');
  const [customer_name, setCustomerName] = useState('');
  const [workflowTypes, setWorkflowType] = useState([]);
  const [poTypes, setPoType] = useState('');
  const [status, setStatus] = useState('');
  const handleCustomerName = (e) => {
    setCustomerName(e.target.value);
  };
  const handleCancel = () => {
    setCustomerCode('');
    setCustomerName('');
    setCustomerType('');
    setWorkflowType([]);
    setPoType('');
    setStatus('');
    props.onCancel();
  };
  const handleCustomerType = (e) => {
    setCustomerType(e);
  };
  const handleCustomerNameWorkflow = (e) => {
    setCustomerName(e);
  };
  const handleCustomerCode = (e) => {
    setCustomerCode(e.target.value);
  };
  const handleWorkflowtype = (e) => {
    setWorkflowType(e);
  };
  const handlePotype = (e) => {
    setPoType(e);
  };
  const handleStatus = (e) => {
    setStatus(e)
  };
  const handleSubmit = () => {
    const data = {
      customerType: customerType,
      customer_code: customer_code,
      customer_name: customer_name,
    };
    createRequest(data);
    setCustomerCode('');
    setCustomerName('');
    setCustomerType('');
  };
  const handleWorkflowSubmit = () => {
    const data = {
      customer_name: customer_name,
      workflow_type: workflowTypes,
      po_type: poTypes,
      enabled: status === 'ACTIVE' ? true : false,
    };
    createRequestWorkflow(data);
    setWorkflowType([]);
    setCustomerName('');
    setStatus('');
    setPoType('');
  };
  return flag ? (
    <>
      <Modal
        title="Add Customer Workflow"
        visible={props.visible}
        onCancel={handleCancel}
        footer={null}
        wrapClassName="comment-modal"
      >
        <form>
        <div className="comment-fld">
            <label>Customer Name</label>
            <Select
               onChange={(e) => {
                handleCustomerNameWorkflow(e);
              }}
              placeholder="Select"
              name="reason"
              value={customer_name? customer_name : 'Select Customer Name'}
              options={customers && customers?.map((e) => {
                return { label: e.customer, value: e.customer };
              })}
            ></Select>
          </div>
          <br />
          <div className="comment-fld">
            <label>PO Type</label>
            <Select
              onChange={(e) => {
                handlePotype(e);
              }}
              placeholder="Select"
              name="reason"
              value={poTypes? poTypes : 'Select PO Type'}
              options={poType && poType?.map((e) => {
                return { label: e.enumlabel, value: e.enumlabel };
              })}
            ></Select>
          </div>
          <br />
          <div className="comment-fld">
            <label>Workflow Type</label>
            <Select
              onChange={(e) => {
                handleWorkflowtype(e);
              }}
              placeholder="Select workflow type"
              name="reason"
              value={workflowTypes}
              options={workflowType}
              mode="multiple"
            ></Select>
          </div>
          <br />
          <br/>
          <div className="comment-btn">
            <button
              type="button"
              className="sbmt-btn"
              disabled={
                !workflowTypes ||
                !poTypes ||
                !customer_name
              }
              onClick={() => {
                handleWorkflowSubmit();
              }}
            >
              Submit
            </button>
          </div>
        </form>
      </Modal>
    </>
  ) : (
    <>
      <Modal
        title="Add Customer"
        visible={props.visible}
        onCancel={handleCancel}
        footer={null}
        wrapClassName="comment-modal"
      >
        <form>
          <div className="comment-fld">
            <label>Customer Type</label>
            <Select
              onChange={(e) => {
                handleCustomerType(e);
              }}
              placeholder="Select"
              name="reason"
              value={customerType}
            >
              <Option value="Single GRN">Single GRN</Option>
              <Option value="Multi GRN">Multi GRN</Option>
            </Select>
          </div>
          <br />
          <div className="comment-fld">
            <label>Customer Name</label>
            <div>
              <input
                className="cust-code"
                onChange={(e) => {
                  handleCustomerName(e);
                }}
                type="text"
                value={customer_name}
              ></input>
            </div>
          </div>
          <br />
          <div className="comment-fld">
            <label>Customer Code</label>
            <div>
              <input
                className="cust-code"
                type="number"
                value={customer_code}
                onWheel={(e) => e.target.blur()}
                onKeyDown={(e) => {
                  if (
                    e.key === 'e' ||
                    e.key === '.' ||
                    e.key === '-' ||
                    e.key === '+'
                  ) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  handleCustomerCode(e);
                }}
              ></input>
            </div>
          </div>
          <div className="comment-btn">
            <button
              type="button"
              className="sbmt-btn"
              disabled={
                !customerType || !customer_code || !customer_name
              }
              onClick={() => {
                handleSubmit();
              }}
            >
              Submit
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default AddMTEcomModal;
