import React, { useEffect, useState } from 'react';
import { Modal, Select, Input, Button, notification } from 'antd';
import './ToleranceModal.css';

const { Option } = Select;

const ToleranceModal = ({
  visible,
  onCancel,
  onSave,
  isEdit,
  initialCustomer,
  initialTolerance,
  fetchCustomers,
}) => {
  const [customer, setCustomer] = useState('');
  const [tolerance, setTolerance] = useState('');
  const [customerList, setCustomerList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Set initial values when modal opens
  useEffect(() => {
    if (visible && isEdit) {
      setCustomer(initialCustomer || '');
      setTolerance(initialTolerance || '');
    } else if (!visible) {
      // Reset form when modal closes
      setCustomer('');
      setTolerance('');
    }
  }, [visible, isEdit, initialCustomer, initialTolerance]);

  useEffect(() => {
    if (!isEdit && visible) {
      setLoading(true);
      fetchCustomers().then((list) => {
        setCustomerList(list);
        setLoading(false);
      });
    }
    if (isEdit && initialCustomer) {
      setCustomerList([{ customer: initialCustomer }]);
    }
  }, [visible, isEdit, initialCustomer, fetchCustomers]);

  const handleSave = () => {
    if (!customer) {
      notification.error({ message: 'Please select a customer.' });
      return;
    }
    if (
      tolerance === '' ||
      isNaN(Number(tolerance)) ||
      Number(tolerance) < 0
    ) {
      notification.error({
        message: 'Please enter a valid positive tolerance.',
      });
      return;
    }
    onSave({
      tot_tolerance: Number(Number(tolerance)),
      customer,
      type: isEdit ? 'edit' : 'add',
    });
  };

  return (
    <Modal
      title={isEdit ? 'Edit Tolerance' : 'Add Tolerance'}
      visible={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      className="tolerance-modal"
    >
      <div className="tolerance-form-item">
        <label>Customer Name:</label>
        <Select
          showSearch
          value={customer}
          onChange={setCustomer}
          disabled={isEdit}
          loading={loading}
          placeholder="Select Customer"
        >
          {customerList?.map((c) => {
            const customerName = c.customer;
            return (
              <Option key={customerName} value={customerName}>
                {customerName}
              </Option>
            );
          })}
        </Select>
      </div>
      <div className="tolerance-form-item">
        <label>Tolerance:</label>
        <Input
          type="number"
          min={1}
          max={100}
          step={1}
          className="mt-ecom-input"
          value={tolerance}
          onKeyDown={(e) => {
            if (
              e.key === 'e' ||
              e.key === 'E' ||
              e.key === '-' ||
              e.key === '.' ||
              e.key === '+'
            ) {
              e.preventDefault();
            }
          }}
          onChange={(e) => {
            let val = e.target.value;
            if (/^\d{0,3}$/.test(val)) {
              let intVal = parseInt(val, 10);
              if (val === '' || (intVal >= 1 && intVal <= 100)) {
                setTolerance(val === '' ? '' : intVal);
              }
            }
          }}
          placeholder="Enter tolerance"
        />
      </div>
      <div className="tolerance-form-buttons">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="primary" onClick={handleSave}>
          Save
        </Button>
      </div>
    </Modal>
  );
};

export default ToleranceModal;
