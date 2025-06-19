import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Button } from 'antd';
import './ToleranceMultiUpdate.css';
import _ from 'lodash';
import { Input } from 'antd';
import { hasEditPermission, pages } from '../../../../persona/distributorHeader';
const { TextArea } = Input;

const ToleranceMultiUpdate = ({
  visible,
  onCancel,
  onOk,
  tableData,
}) => {
  const [areaCodes, setAreaCodes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [maxValues, setMaxValues] = useState({});
  const [minValues, setMinValues] = useState({});
  const [remarks, setRemarks] = useState('');
  const [allAreaCodes, setAllAreaCodes] = useState([]);
  const [showRemarks, setShowRemarks] = useState(false);

  useEffect(() => {
    setAllAreaCodes(tableData.map((data) => data.area_code));
  }, [tableData]);

  const handleAreaCodeChange = (values) => {
    if (values.includes('all')) {
      setAreaCodes(allAreaCodes);
    } else {
      setAreaCodes(values);
    }
  };

  const handleClassChange = (values) => {
    setClasses(values);
  };

  const handleMaxValueChange = (classKey, value) => {
    const tempMaxValues = _.cloneDeep(maxValues);
    tempMaxValues[classKey] = value;
    setMaxValues(tempMaxValues);

    if (Object.keys(tempMaxValues).length > 0) {
      setShowRemarks(true);
    }
  };

  const handleMinValueChange = (classKey, value) => {
    const tempMinValues = _.cloneDeep(minValues);
    tempMinValues[classKey] = value;
    setMinValues(tempMinValues);
    if (Object.keys(tempMinValues).length > 0) {
      setShowRemarks(true);
    }
  };

  const handleRemarksChange = (e) => {
    setRemarks(e.target.value);
  };

  const isValid = () => {
    let hasAtLeastOneValue = false;
    let hasInvalidMinValue = false;
    classes.forEach((classKey) => {
      if (maxValues[classKey] !== '' || minValues[classKey] !== '') {
        hasAtLeastOneValue = true;
      }
      if (minValues[classKey] === '-') {
        hasInvalidMinValue = true;
      }
    });
    return (
      areaCodes.length > 0 &&
      classes.length > 0 &&
      remarks !== '' &&
      remarks.length >= 5 &&
      hasAtLeastOneValue &&
      !hasInvalidMinValue
    );
  };

  const handleOk = () => {
    if (isValid()) {
      const data = {
        areaCodes,
        classes,
        maxValues,
        minValues,
        remarks,
      };

      // Use previous values if max and min values are not provided
      areaCodes.forEach((areaCode) => {
        classes.forEach((classKey) => {
          if (!data.maxValues[classKey]) {
            const maxValue = tableData.find(
              (row) => row.area_code === areaCode,
            )[`class_${classKey.toLowerCase()}_max`];
            if (maxValue) {
              data.maxValues[classKey] = '';
            }
          }
          if (!data.minValues[classKey]) {
            const minValue = tableData.find(
              (row) => row.area_code === areaCode,
            )[`class_${classKey.toLowerCase()}_min`];
            if (minValue) {
              data.minValues[classKey] = '';
            }
          }
        });
      });
      onOk(data);
    }
  };

  const validateInput = (type, value) => {
    const numericValue = value.replace(/[^0-9-]/g, '');

    if (type === 'max') {
      let maxValue = numericValue.replace(/[^0-9]/g, '');
      if (parseInt(maxValue, 10) > 9999) {
        maxValue = '9999';
      }
      return maxValue;
    } else if (type === 'min') {
      if (numericValue === '-') {
        return '-';
      } else if (numericValue === '--') {
        return '';
      } else if (
        numericValue.startsWith('-') &&
        numericValue.length > 1 &&
        !numericValue.startsWith('--')
      ) {
        let minValue = parseInt(numericValue, 10);
        if (minValue < -100) {
          minValue = -100;
        }
        return minValue.toString();
      } else if (
        numericValue !== '' &&
        !numericValue.startsWith('-')
      ) {
        return `-${numericValue}`;
      }
    }
    return numericValue;
  };

  return (
    <Modal
      title="Multi Update Tolerance"
      visible={visible}
      className="cfa-depot-modal"
      onCancel={onCancel}
      width={'60%'}
      footer={[
        <Button key="back" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleOk}
          disabled={!(isValid() && hasEditPermission(pages.APP_SETTINGS,'EDIT'))}
        >
          OK
        </Button>,
      ]}
    >
      <Form>
        <Form.Item
          label={
            <span>
              Area Codes{' '}
              <span className="mandatory-mark">
                <b>*</b>
              </span>
            </span>
          }
        >
          <Select
            mode="multiple"
            className="basic-details"
            value={areaCodes}
            allowClear
            onChange={handleAreaCodeChange}
            options={[
              { value: 'all', label: 'Select All' },
              ...tableData.map((data) => ({
                value: data.area_code,
                label: data.area_code,
              })),
            ]}
            maxTagCount={9}
          />
        </Form.Item>
        <Form.Item
          label={
            <span>
              Classes{' '}
              <span
                className="mandatory-mark"
                style={{ paddingRight: '25px' }}
              >
                <b>*</b>
              </span>
            </span>
          }
        >
          <Select
            mode="multiple"
            value={classes}
            className="basic-details"
            allowClear
            onChange={handleClassChange}
            options={[
              { value: 'A', label: 'Class A' },
              { value: 'B', label: 'Class B' },
              { value: 'C', label: 'Class C' },
            ]}
          />
        </Form.Item>
        {classes.map((classKey) => (
          <div key={classKey}>
            <Form.Item
              label={<span>Update Values for Class {classKey} </span>}
            >
              <Input
                value={maxValues[classKey]}
                onChange={(e) => {
                  const validatedValue = validateInput(
                    'max',
                    e.target.value,
                  );
                  handleMaxValueChange(classKey, validatedValue);
                }}
                placeholder="Max Value"
                className="input-small"
              />
              <Input
                value={minValues[classKey]}
                onChange={(e) => {
                  const validatedValue = validateInput(
                    'min',
                    e.target.value,
                  );
                  handleMinValueChange(classKey, validatedValue);
                }}
                placeholder="Min Value"
                className="input-small"
              />
            </Form.Item>
          </div>
        ))}
        {showRemarks && (
          <Form.Item
            label={
              <span>
                Remarks
                <span className="mandatory-mark">
                  <b>*</b>
                </span>
              </span>
            }
          >
            <TextArea
              value={remarks}
              onChange={handleRemarksChange}
              placeholder="Enter remarks (at least 5 words)"
              rows={1}
              className="textarea-multiupdate-ars"
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default ToleranceMultiUpdate;
