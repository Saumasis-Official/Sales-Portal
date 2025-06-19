import React, { useState } from 'react';
import { Modal, Radio, Input, Button, Form } from 'antd';

const SurveyModal = ({ visible, onSurveySubmit }) => {
  const [form] = Form.useForm();
  const [selectedSoftware, setSelectedSoftware] = useState(null);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [showVersionInput, setShowVersionInput] = useState(false);

  const handleSoftwareChange = (e) => {
    const value = e.target.value;
    setSelectedSoftware(value);
    setShowOtherInput(value === 'Others');
    setShowVersionInput(value !== 'Others' && value);
  };

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        const surveyData = {
          accountingSoftware: selectedSoftware,
          otherSoftware: values.otherSoftware || '',
          version: values.version || '',
        };
        onSurveySubmit(surveyData);
        form.resetFields();
        setSelectedSoftware(null);
        setShowOtherInput(false);
        setShowVersionInput(false);
      })
      .catch((info) => {
        console.log('Validation Failed:', info);
      });
  };

  return (
    <Modal
      title="Accounting Software Survey"
      visible={visible}
      onOk={handleOk}
      closable={false}
      maskClosable={false}
      footer={[
        <Button key="submit" type="primary" onClick={handleOk}>
          Submit
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="software"
          label="Please select the accounting software that you use."
          rules={[
            { required: true, message: 'Please select an option' },
          ]}
        >
          <Radio.Group
            onChange={handleSoftwareChange}
            value={selectedSoftware}
          >
            <Radio value="Tally ERP">Tally ERP</Radio>
            <Radio value="Tally Prime">Tally Prime</Radio>
            <Radio value="Marg">Marg</Radio>
            <Radio value="Busy">Busy</Radio>
            <Radio value="Others">Others</Radio>
          </Radio.Group>
        </Form.Item>

        {showOtherInput && (
          <Form.Item
            name="otherSoftware"
            label="Please specify the software"
            rules={[
              {
                required: showOtherInput,
                message: 'Please specify the software',
              },
              { max: 20, message: 'Maximum 20 characters allowed' },
            ]}
          >
            <Input placeholder="Enter software name" />
          </Form.Item>
        )}

        {showVersionInput && (
          <Form.Item
            name="version"
            label="Version"
            rules={[
              {
                required: showVersionInput,
                message: 'Please specify the version',
              },
              { max: 10, message: 'Maximum 10 characters allowed' },
            ]}
          >
            <Input placeholder="Enter version number" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default SurveyModal;
