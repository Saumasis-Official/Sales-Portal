import React, { useState, useEffect, useRef } from 'react';
import {
  Checkbox,
  Radio,
  DatePicker,
  Select,
  Row,
  Col,
  notification,
  Tooltip,
  Spin,
} from 'antd';
import { connect } from 'react-redux';
import * as Actions from '../actions/adminAction';
import 'antd/dist/antd.css';
import './Mtecom-rdd.css';
import dayjs from 'dayjs';
import { NO_DATA_SYMBOL } from '../../../constants';
import {
  MT_ECOM_MULTI_GRN,
  MT_ECOM_SINGLE_GRN,
} from '../../../config/constant';
import { Link } from 'react-router-dom';
import Util from '../../../util/helper/index.js';
import { RUPEE_SYMBOL } from '../../../constants';
import { cloneDeep } from 'lodash';
const { Option } = Select;

const RDD = ({
  RDDList,
  createAmendment,
  history,
  getAppSettingList,
}) => {
  const [inputValues, setInputValues] = useState([]);
  const [customerCodeOptions, setCustomerCodeOptions] = useState([]);
  const [siteCodeOptions, setSiteCodeOptions] = useState([]);
  const [selectedCustomerCode, setSelectedCustomerCode] =
    useState('');
  const [selectedSiteCode, setSelectedSiteCode] = useState('');
  const [selectedSONumbers, setSelectedSONumbers] = useState([]);
  const [soNumber, setSoNumber] = useState([]);
  const [itemData, setItemData] = useState([]);
  const [inputErrors, setInputErrors] = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState([]);
  const [groupedItemDataStates, setGroupedItemDataStates] = useState(
    [],
  );
  const [selectedRDD, setSelectedRDD] = useState(null);
  const [soDropdownOpen, setSODropdownOpen] = useState(false);
  const [isSelectingGroup, setIsSelectingGroup] = useState(false);
  const [isSubmitEnabled, setIsSubmitEnabled] = useState(false);
  const [appointmentQuantity, setAppointmentQuantity] = useState(0);
  const [checkAppQty, setCheckAppQty] = useState(false);
  const [previousApptQty, setPreviousApptQty] = useState();
  const [updatedItemData, setUpdatedItemData] = useState([]);
  const [soValue, setSoValue] = useState(0);
  const [plantName, setPlantName] = useState('');
  const [plantCode, setPlantCode] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState('CV');
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [prefillQtyClicked, setPrefillQtyClicked] = useState(false);
  const [dynamicMessage, setDynamicMessage] = useState(
    '[Match Appointment Quantity with total of Adjusted Quantities]',
  );
  const itemDataClone = useRef([]);
  const [customerData, setCustomerData] = useState('');

  useEffect(() => {
    enableEditView();
  }, [isSubmitEnabled]);
  useEffect(() =>{
    if (selectedCustomerCode) {
      fetchData();
    }
    setSelectedRDD(null);
    setSelectedSONumbers([]);
    setUpdatedItemData([]);
    setPlantCode('');
    setPlantName('');
    setSoValue(0);
    setSoNumber([]);
    setItemData([]);
    setInputErrors({});
    setUpdatedItemData([]);
    setAppointmentQuantity(0);
    setIsSelectingGroup(true);
    setCheckAppQty(false);
    setSelectedOption('CV');
    setIsCheckboxChecked(false);

  },[selectedCustomerCode])  
  
  const enableEditView = async () => {
    const res = await getAppSettingList();
    const appKeys = {
      ENABLE_MT_ECOM_RDD: '',
      ENABLE_RDD_START_TIME: '',
      ENABLE_RDD_END_TIME: '',
    };
    let rddGlobalFlag = false;
    let rddFromTime = '';
    let rddToTime = '';

    if (res.data) {
      res?.data?.map((item) => {
        if (Object.keys(appKeys).includes(item.key)) {
          appKeys[item.key] = item.value;
        }
      });

      rddGlobalFlag =
        appKeys['ENABLE_MT_ECOM_RDD'] === 'YES' ? true : false;
      rddFromTime = appKeys['ENABLE_RDD_START_TIME'];
      rddToTime = appKeys['ENABLE_RDD_END_TIME'];
    }

    if (
      !rddGlobalFlag ||
      !Util.getRDDDateFlag(rddFromTime, rddToTime)
    ) {
      history.push({
        pathname: '/admin/mt-ecom-dashboard',
        search: '?tab=RDD',
      });
    }
  };

  const fetchData = async (soNos = null) => {
    try {
      let user_id = localStorage.getItem('user_id');
      let payload = {
        site_code: selectedSiteCode,
        soNumbers: soNos ?? selectedSONumbers,
        rdd: selectedRDD,
        customer_code: selectedCustomerCode,
        user_id : user_id
      };

      const response = await RDDList(payload);
      const {
        filter_data,
        item_data,
        so_data,
        so_value,
        customer_type,
        plant_name,
        plant_code,
        customer_data
      } = response.data.body;

      itemDataClone.current = cloneDeep(item_data)
      setCustomerData(customer_data.customer)
      setCustomerType(customer_type);
      if (filter_data && filter_data.length > 0) {
        let codes = filter_data[0].customer_code
        setCustomerCodeOptions(codes);
        setInputValues(filter_data);
      }
      if (so_data?.length > 0) {
        setSoNumber(so_data);
      }
      if (item_data && item_data.length > 0) {
        const groupedItems = groupItemsBySalesOrder(item_data);
        setItemData(item_data);
        setSoValue(so_value);
        setPlantName(plant_name.join(', '));
        setPlantCode(plant_code.join(', '));
        setCollapsedGroups(groupedItems?.map((_, index) => index));
      }
    } catch (error) {
      console.error('Error fetching RDD data:', error);
    }
  };

  useEffect(() => {
    if (selectedRDD || !selectedSiteCode) {
      fetchData();
    }
  }, [selectedRDD, selectedSiteCode]);
  useEffect(() => {
    if (customerType === MT_ECOM_SINGLE_GRN) {
      setUpdatedItemData(itemData);
    }
  }, [itemData]);

  const handleCodeChange = (value, type) => {
    const isCustomer = type === 'customer';

    if (value) {
      const filteredCodes = inputValues
        .filter(
          (item) =>
            item[isCustomer ? 'customer_code' : 'site_code'] ===
            value,
        )
        .map(
          (item) => item[isCustomer ? 'site_code' : 'customer_code'],
        );

      const uniqueCodes = [...new Set(filteredCodes)];
      if (isCustomer) {
        setSiteCodeOptions(uniqueCodes);
        setSelectedCustomerCode(value);
        setSelectedSiteCode(uniqueCodes[0]);
      } else {
        setCustomerCodeOptions(uniqueCodes);
        setSelectedSiteCode(value);
        setSelectedCustomerCode(uniqueCodes[0]);
      }
      // Clear soNumbers when changing customer code
      setSelectedSONumbers([]);

      filterTableData(
        isCustomer ? value : '',
        isCustomer ? '' : value,
      );
    } else {
      setSelectedCustomerCode('');
      setSelectedSiteCode('');
      setCustomerCodeOptions([
        ...new Set(inputValues?.map((item) => item.customer_code)),
      ]);
      setSiteCodeOptions(inputValues?.map((item) => item.site_code));
      setSelectedRDD(null);
      setSelectedSONumbers([]);
      setUpdatedItemData([]);
      setPlantCode('');
      setPlantName('');
      setSoValue(0);
      setSoNumber([]);
      setItemData([]);
      setInputErrors({});
      setUpdatedItemData([]);
      filterTableData(value, '');
      setAppointmentQuantity(0);
      setIsSelectingGroup(true);
      setCheckAppQty(false);
      setSelectedOption('CV');
      setIsCheckboxChecked(false);
    }
  };

  const filterTableData = (customerCode, siteCode) => {
    inputValues.filter((item) => {
      return (
        (!customerCode || item.customer_code === customerCode) &&
        (!siteCode || item.site_code === siteCode)
      );
    });
  };

  const handleSONumberChange = (values) => {
    if (values.includes('ALL')) {
      if (selectedSONumbers.length === soNumber.length) {
        // Deselect all
        setSelectedSONumbers([]);
        setItemData([]);
        setAppointmentQuantity(0);
        setUpdatedItemData([]);
        setPlantCode('');
        setPlantName('');
        setSoValue(0);
        setCheckAppQty(false);
        setSelectedOption('CV');
      } else {
        // Select all
        const allSONumbers = soNumber.map((item) => item.so_number);
        setSelectedSONumbers(allSONumbers);
      }
    } else {
      setSelectedSONumbers(values);
    }

    if (selectedRDD) {
      if (
        !soDropdownOpen &&
        values?.length <= selectedSONumbers.length
      ) {
        fetchData(values);
      }
    }

    if (values.length === 0) {
      setItemData([]);
      setAppointmentQuantity(0);
      setUpdatedItemData([]);
      setPlantCode('');
      setPlantName('');
      setSoValue(0);
      setCheckAppQty(false);
      setSelectedOption('CV');
    }
    setInputErrors({});
    setIsSelectingGroup(true);
    setIsCheckboxChecked(false);
    setSelectedGroups([]);
    setPrefillQtyClicked(false);
  };

  const handleInputChange = (e, groupIndex, rowIndex, key) => {
    const { value } = e.target;
    const tempItemData = [...itemData];
    let tempUpdatedItemData = [...updatedItemData];
    const adjustedQuantity = parseFloat(value);
    let previousRddQty = 0;
    if (
      value !== '' &&
      !(Number.isInteger(adjustedQuantity) && adjustedQuantity >= 0)
    ) {
      return;
    }

    const data =
      tempItemData[
        groupedItemDataStates[groupIndex].start + rowIndex
      ];
    const initialOpenQty = itemDataClone.current[groupedItemDataStates[groupIndex].start + rowIndex].open_qty;

    let sumOfConfirmedQuantities = 0;
    let sumOfSubmittedQuantities = 0;
    data[key] = adjustedQuantity;

    // Loop through the group of data to sum up the confirmed quantities
    for (
      let i = groupedItemDataStates[groupIndex].start;
      i <
      groupedItemDataStates[groupIndex].start +
        groupedItemDataStates[groupIndex].length;
      i++
    ) {
      if (tempItemData[i].item_number === data.item_number) {
        sumOfConfirmedQuantities += isNaN(
          +tempItemData[i].confirmed_qty,
        )
          ? 0
          : +tempItemData[i].confirmed_qty;

        sumOfSubmittedQuantities += isNaN(
            +tempItemData[i].submitted_qty,
          )
            ? 0
            : +tempItemData[i].submitted_qty;
      }
    }
    previousRddQty = data.po_qty - (sumOfSubmittedQuantities + (initialOpenQty ? initialOpenQty : 0));
    
    // Update the open_qty for all items with the same item_number in the group
    for (
      let i = groupedItemDataStates[groupIndex].start;
      i <
      groupedItemDataStates[groupIndex].start +
        groupedItemDataStates[groupIndex].length;
      i++
    ) {
      if (tempItemData[i].item_number === data.item_number) {
        const openQtyValue = +data.po_qty - sumOfConfirmedQuantities - previousRddQty;
        tempItemData[i].open_qty =
          openQtyValue < 0 ? 0 : openQtyValue;
      }
    }
    setItemData(tempItemData);

    if (sumOfConfirmedQuantities > initialOpenQty + sumOfSubmittedQuantities) {
      setInputErrors({
        ...inputErrors,
        [`${groupIndex}-${rowIndex}`]:
          'Adjusted qty cannot exceed Open qty.',
      });
      // Find the index of the item in tempUpdatedItemData
      const updatedIndex = tempUpdatedItemData.findIndex(
        (d) =>
          d.schedule_line_number === data.schedule_line_number &&
          d.item_number === data.item_number,
      );

      // Remove the item from tempUpdatedItemData if it exists and has error
      if (updatedIndex !== -1) {
        tempUpdatedItemData.splice(updatedIndex, 1);
        setUpdatedItemData(tempUpdatedItemData);
      }
    } else {
      const newErrors = { ...inputErrors };
      delete newErrors[`${groupIndex}-${rowIndex}`];
      setInputErrors(newErrors);

      // Add or update the item in tempUpdatedItemData
      const updatedIndex = tempUpdatedItemData.findIndex(
        (d) =>
          d.schedule_line_number === data.schedule_line_number &&
          d.item_number === data.item_number && d.sales_order === data.sales_order,
      );

      if (updatedIndex === -1) {
        tempUpdatedItemData.push(data);
      } else {
        tempUpdatedItemData[updatedIndex] = data;
      }
      setUpdatedItemData(tempUpdatedItemData);
    }
  };

  const calculateColumnSum = (columnKey) => {
    if (!itemData || itemData.length === 0) {
      return 0;
    }
    if (columnKey === 'conversionToPieces' && itemData.length > 0) {
      return itemData.reduce(
        (acc, item) =>
          acc +
          (item.confirmed_qty && !item.ror_message 
            ? Math.floor(
                parseFloat(item.confirmed_qty) *
                  (item.buom_to_cs ? parseFloat(item.buom_to_cs) : 1),
              )
            : 0),
        0,
      );
    } else if (
      columnKey === 'confirmed_qty' ||
      columnKey === 'target_qty'
    ) {
      const sum = itemData.reduce((acc, item) => {
        const columnValue = parseInt(item[columnKey]);
        return acc + ((isNaN(columnValue) || item.ror_message ) ? 0 : columnValue);
      }, 0);
      return sum;
    }  else if(columnKey === 'open_qty'){
      const uniqueItemNumbers = new Set();
      let sum = 0;
      itemData.forEach((item) => {
        if (!uniqueItemNumbers.has(item.item_number+item.sales_order)) {
          uniqueItemNumbers.add(item.item_number+item.sales_order);
          sum += parseInt(item[columnKey]);
        }
      });      
      return sum;
    }
  };

  useEffect(() => {
    let start = 0;
    const groups = groupedItemData?.map((group) => {
      const groupInfo = { start: start, length: group.length };
      start += group.length;
      return groupInfo;
    });
    setGroupedItemDataStates(groups);
  }, [itemData]);

  const toggleCollapse = (groupIndex) => {
    setCollapsedGroups((prevCollapsedGroups) =>
      prevCollapsedGroups.includes(groupIndex)
        ? prevCollapsedGroups.filter((index) => index !== groupIndex)
        : [...prevCollapsedGroups, groupIndex],
    );
  };

  const groupItemsBySalesOrder = (items) => {
    return Object.values(
      items.reduce((groups, item) => {
        const group = groups[item.sales_order] || [];
        group.push(item);
        groups[item.sales_order] = group;
        return groups;
      }, {}),
    );
  };

  const groupedItemData = Object.values(
    itemData.reduce((groups, data) => {
      const group = groups[data.sales_order] || [];
      group.push(data);
      groups[data.sales_order] = group;
      return groups;
    }, {}),
  );

  const handleRDDChange = (dateString) => {
    setSelectedSONumbers([]);
    setUpdatedItemData([]);
    setPlantCode('');
    setPlantName('');
    setSoValue(0);
    setItemData([]);
    setIsSelectingGroup(true);
    setIsCheckboxChecked(false);
    setCheckAppQty(false);
    setSelectedOption('CV');
    setAppointmentQuantity(0);
    setInputErrors({});
    if (dateString) {
      setSelectedRDD(dateString);
    } else {
      setSelectedRDD(null);
    }
  };

  const handleSONumbersBlur = () => {
    if (selectedSONumbers.includes('ALL')) {
      const allSONumbers = soNumber.map((item) => item.so_number);
      setSelectedSONumbers(allSONumbers);
    }
    if (selectedSONumbers.length > 0) {
      fetchData();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    // Transform updatedItemData to replace 'open_qty' with 'balance_qty'
    const transformedData = updatedItemData?.map((item) => {
      let newItem = { ...item };
      if (newItem.hasOwnProperty('open_qty')) {
        newItem['balance_qty'] = newItem['open_qty'];
        delete newItem['open_qty'];
      }
      return newItem;
    });

    const data = {
      data: transformedData,
      rdd: selectedRDD,
      customer_code: selectedCustomerCode,
      user_id : localStorage.getItem('user_id')
    };

    try {
      const response = await createAmendment(data);

      if (response.statusCode === 200) {
        notification.success({
          message: 'Success',
          description: 'RDD Created Successfully',
          duration: 3,
          className: 'notification-success',
        });
        setSelectedSONumbers([]);
        setPlantCode('');
        setPlantName('');
        setSoValue(0);
        setItemData([]);
      } else {
        notification.error({
          message: 'Error',
          description:
            response.response.data.detail || 'Something went wrong',
          duration: 5,
          className: 'notification-red',
        });
      }
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'Something went wrong',
        duration: 5,
        className: 'notification-red',
      });
    } finally {
      setLoading(false);
      setUpdatedItemData([]);
    }
  };

  const calculateTotalQuantity = (
    groupIndex,
    useAdjustedQuantity = false,
    key = false
  ) => {
    const group = groupedItemData[groupIndex];
    let totalQuantity = 0;
    if (key === 'open_qty'){
      const uniqueItemNumbers = new Set();

      group.forEach((item) => {
        if (!uniqueItemNumbers.has(item.item_number)) {
          uniqueItemNumbers.add(item.item_number);
          totalQuantity += parseInt(item[key]);
        }
      });
  
      return totalQuantity;

    }
    else{
      totalQuantity = group.reduce((total, item) => {
        return (
          total +
          (useAdjustedQuantity
            ? item.confirmed_qty || 0
            : item.confirmed_qty === 0
            ? item.open_qty || 0
            : 0)
        );
      }, 0);
  
    }
    
    return totalQuantity;
  };

  const handleInputClick = (e, groupIndex) => {
    if (!collapsedGroups.includes(groupIndex)) {
      if (e.target.value === '0') {
        e.target.value = '';
      }
    }
  };

  const handleInputBlur = (
    e,
    groupIndex = null,
    rowIndex = null,
    key = '',
  ) => {
    if (!collapsedGroups.includes(groupIndex)) {
      if (e.target.value.trim() === '') {
        handleInputChange(
          { target: { value: '0', name: e.target.name } },
          groupIndex,
          rowIndex,
          key,
        );
      }
    }
  };

  const handleKeyDown = (e) => {
    if (
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === '.' ||
      e.key === '-' ||
      e.key === 'e'
    ) {
      e.preventDefault();
    }
  };

  const handleWheel = (e) => e.target.blur();

  const onCheckedShowAppQty = (e) => {
    if (e.target.checked == true) {
      setCheckAppQty(true);
    } else if (e.target.checked == false) {
      setCheckAppQty(false);
      setSelectedOption('CV');
      setAppointmentQuantity(0);
    }
  };

  const onAppointmentValueChange = () => {
    const ele = document.getElementById('AQ');
    if (ele) {
      if (
        Number(ele.value) ==
          Number(calculateColumnSum('confirmed_qty')) ||
        Number(ele.value) === 0
      ) {
        setIsSubmitEnabled(true);
      } else {
        setIsSubmitEnabled(false);
      }
    }
  };

  const handleAppointmentInputChange = (e, key) => {
    setAppointmentQuantity(e.target.value);
  };

  const shouldEnableSubmit = () => {
    const appointmentQty = Number(appointmentQuantity);
    let totalAdjustedQty;

    if (selectedOption === 'CV') {
      totalAdjustedQty = Number(calculateColumnSum('confirmed_qty'));
    } else if (selectedOption === 'Pieces') {
      totalAdjustedQty = Number(
        calculateColumnSum('conversionToPieces'),
      );
    }

    if (!checkAppQty && !isSelectingGroup) {
      return (
        totalAdjustedQty > 0 || (checkAppQty && appointmentQty > 0)
      );
    }
    if (checkAppQty) {
      return (
        totalAdjustedQty === appointmentQty && appointmentQty > 0
      );
    }
    if (isSelectingGroup) {
      return true;
    }
    return totalAdjustedQty === 0 && appointmentQty === 0;
  };

  const handlePrefillAndClearSelection = (groupIndex) => {
    onAppointmentValueChange();
    setIsSelectingGroup(true);
    if (
      groupIndex < 0 ||
      groupIndex >= groupedItemData?.length ||
      0
    ) {
      return;
    }

    const selectedItemData = [...itemData];
    const group = groupedItemData[groupIndex];
    let tempData = [];
    let tempItemData = [];

    if (!prefillQtyClicked) {
      tempData = selectedItemData?.map((data) => {
        if (group.includes(data)) {
          if (data?.open_qty > 0 && data?.confirmed_qty === 0) {
            data.confirmed_qty = data?.open_qty;
            data['temp_submitted_qty'] = data?.open_qty;
            data['selectedFlag'] = false;
            data['open_qty'] = 0;
            data['balance_qty'] = 0;
            tempItemData.push(data);
          } else {
            data['temp_submitted_qty'] = data?.open_qty;
            data['open_qty'] = 0;
            data['selectedFlag'] = true;
          }
        }
        return data;
      });
      setUpdatedItemData(tempItemData);
      setItemData(tempData);
    } else {
      setIsSelectingGroup(false);
      tempData = selectedItemData?.map((data) => {
        if (group.includes(data)) {
          if (!data.selectedFlag) {
            data.confirmed_qty = 0;
            data.open_qty = data?.temp_submitted_qty;
          } else{
            data.open_qty = data?.temp_submitted_qty;
          }
        }
        return data;
      });
      setUpdatedItemData([]);
      setItemData(tempData);
      setSelectedGroups([]);
    }
  };

  const toggleCheckbox = (groupIndex) => {
    if (selectedGroups.includes(groupIndex)) {
      setSelectedGroups(
        selectedGroups.filter((index) => index !== groupIndex),
      );
    } else {
      setSelectedGroups([...selectedGroups, groupIndex]);
    }
  };

  const handleRadioChange = (e) => {
    const selectedValue = e.target.value;
    setSelectedOption(selectedValue);

    if (selectedValue === 'CV') {
      setDynamicMessage(
        '[Match Appointment Quantity with total of Adjusted Quantities]',
      );
    } else if (selectedValue === 'Pieces') {
      setDynamicMessage(
        '[Match Appointment Quantity with total of CV To Pieces]',
      );
    }
  };

  return (
    <div id="id-spinner">
      <Spin spinning={loading} className="custom-spinner">
        <div className="admin-dashboard-wrapper">
          <div className="admin-dashboard-block-rdd">
            <div className="top-div-rdd">
              <div>
                <h2 className="page-tritle-rdd">
                  RDD Management Interface
                </h2>
                <Link to="/admin/mt-ecom-dashboard?tab=RDD">
                  <img
                    src="/assets/images/cross-icon.svg"
                    alt="cancel"
                    className="cancel-rdd"
                  />
                </Link>
                <div className="main-content-rdd">
                  <div className="left-section-rdd">
                    <Row>
                      <Col span={8}>
                        <label
                          htmlFor="customerCode"
                          className="selectLabel-rdd"
                        >
                          Customer Code
                          <span className="mandatory-mark">
                            *&nbsp;
                          </span>
                        </label>
                      </Col>
                      <Col span={16}>
                        <span className="span-rdd">:</span>
                        <Select
                          showSearch
                          allowClear
                          className="select-code"
                          placeholder="Select Customer Code"
                          mandatory={true}
                          optionFilterProp="children"
                          onChange={(value) =>
                            handleCodeChange(value, 'customer')
                          }
                          value={selectedCustomerCode || undefined}
                        >
                          {customerCodeOptions?.map((option) => (
                            <Option key={option} value={option}>
                              {option}
                            </Option>
                          ))}
                        </Select>
                      </Col>
                    </Row>
                    <br />
                    <Row>
                      <Col span={8} className="customer-data-rdd">
                        Customer Name
                      </Col>
                      <span className="span-rdd">:</span>
                      <Col span={12} className="customer-rdd">
                      {selectedCustomerCode && (
                        <Tooltip
                          title={customerData ? customerData : ''}
                          placement="left"
                          overlayClassName="tooltip-rdd"
                        >
                          {customerData ? customerData : NO_DATA_SYMBOL}
                        </Tooltip>
                      )}
                      </Col>
                    </Row>
                    <br/>
                    <Row>
                      <Col span={8} className="plant-name-rdd">
                        Plant Name
                      </Col>
                      <span className="span-rdd">:</span>
                      <Col span={12} className="plant-rdd">
                      <Tooltip
                          overlayClassName="tooltip-rdd"
                          title={plantName ? plantName : ''}
                          placement="left"
                        >
                          {plantName ? plantName : NO_DATA_SYMBOL}
                        </Tooltip>
                      </Col>
                    </Row>
                  </div>
                  <div className="middle-section-rdd">
                    <Row>
                      <Col span={5}>
                        <label
                          htmlFor="rdd"
                          className="selectLabel-rdd"
                        >
                          RDD
                          <span className="mandatory-mark">
                            *&nbsp;
                          </span>
                        </label>
                      </Col>
                      <Col span={18}>
                        <span className="span-rdd">:</span>
                        <DatePicker
                          className="ant-picker-rdd"
                          placeholder={'RDD'}
                          onChange={handleRDDChange}
                          value={selectedRDD}
                          disabled={
                            !selectedCustomerCode
                          }
                          disabledDate={(current) =>
                            current <
                              dayjs().add(1, 'day').startOf('day') ||
                            current >
                              dayjs().add(1, 'year').endOf('day')
                          }
                        />
                          <span className="span-date-msg"><br/>
                        [RDD selected is the date of dispatch from the linked CFA]
                      </span>
                      </Col>
                    </Row>
                    <Row>
                      <Col span={5}>
                        <label
                          htmlFor="soNumber"
                          className="selectLabel-rdd"
                        >
                          SO No.
                          <span className="mandatory-mark">
                            *&nbsp;
                          </span>
                        </label>
                      </Col>
                      <Col span={19}>
                        <span className="span-rdd">:</span>
                        <Select
                          mode="multiple"
                          allowClear
                          maxTagCount={1}
                          placeholder="Search SO No."
                          mandatory={true}
                          className="sono-rdd"
                          value={selectedSONumbers}
                          onChange={handleSONumberChange}
                          onBlur={handleSONumbersBlur}
                          onDropdownVisibleChange={(open) =>
                            setSODropdownOpen(open)
                          }
                          disabled={!selectedRDD}
                        >
                          {soNumber.length > 0  && (
                            <Option key="ALL" value="ALL">
                              Select All
                            </Option>
                          )}
                          {soNumber.length > 0 &&
                            soNumber?.map((item) => (
                              <Option
                                key={item.so_number}
                                value={item.so_number}
                              >
                                {item.so_number}
                              </Option>
                            ))}
                        </Select>
                      </Col>
                    </Row>
                    <br />
                    <Row>
                      <Col span={5} className="plant-name-rdd">
                        Plant Code
                      </Col>
                      <span className="plant-code-rdd">:</span>
                      <Col span={12} className="plant-rdd">
                        <Tooltip
                          title={plantCode ? plantCode : ''}
                          placement="left"
                          overlayClassName="tooltip-rdd"
                        >
                          {plantCode ? plantCode : NO_DATA_SYMBOL}
                        </Tooltip>
                      </Col>
                    </Row>
                  </div>
                  <div className="right-section-rdd">
                    <div className="appointment-info-rdd">
                      <Row className="appointmnent-row-rdd">
                        <Col span={18}>
                          Appointment Qty. Total(Pieces)
                        </Col>
                        <span className="span-rdd">:</span>
                        <Col>
                          {calculateColumnSum('conversionToPieces')}
                        </Col>
                      </Row>
                      <Row className="appointmnent-row-rdd">
                        <Col span={18}>
                          Appointment Qty. Total(Cases)
                        </Col>
                        <span className="span-rdd">:</span>
                        <Col>
                          {calculateColumnSum('confirmed_qty')}
                        </Col>
                      </Row>
                      <Row>
                        <Col span={18}>SO Value(In Lakhs)</Col>
                        <span className="span-rdd">:</span>
                        <Col>
                          {`${RUPEE_SYMBOL} `}
                          {soValue?.toFixed(2)}
                        </Col>
                      </Row>
                    </div>
                    <div>
                      <Row className="multi-select">
                        <Col span={1.5}>
                          <Checkbox
                            checked={isCheckboxChecked}
                            onChange={(e) => {
                              onCheckedShowAppQty(e);
                              setIsCheckboxChecked(e.target.checked);
                            }}
                            type="checkbox"
                          />
                        </Col>
                        <Col span={8} className="span-appt-qty">
                          Appointment Qty
                        </Col>
                        <Col span={9}>
                          <Radio.Group
                            name="option"
                            defaultValue="CV"
                            className="radio-group-rdd"
                            onChange={handleRadioChange}
                            value={selectedOption}
                            disabled={!isCheckboxChecked}
                          >
                            <Radio
                              key="cv"
                              value="CV"
                              className="radio-rdd"
                            >
                              CV
                            </Radio>
                            <Radio
                              key="pieces"
                              value="Pieces"
                              className="radio-group-rdd"
                            >
                              Pieces
                            </Radio>
                          </Radio.Group>
                        </Col>
                        <Col>
                          <span className='col-rdd'>:</span>
                          <input
                            className={
                              checkAppQty
                                ? 'appt-qty-input-rdd rdd-input'
                                : 'appt-qty-input-rdd-disabled rdd-input'
                            }
                            type="number"
                            id="AQ"
                            value={
                              !checkAppQty
                                ? appointmentQuantity
                                : previousApptQty
                            }
                            onChange={(e) =>
                              handleAppointmentInputChange(
                                e,
                                'confirmed_qty',
                              )
                            }
                            disabled={!checkAppQty}
                            onKeyDown={handleKeyDown}
                            onWheel={handleWheel}
                            onClick={(e) => {
                              if (e.target.value === '0') {
                                e.target.value = '';
                              }
                            }}
                          />
                        </Col>
                      </Row>

                      <Row>
                        <Col span={24}>
                          <span className="span-apt-qty">
                            {dynamicMessage}
                          </span>
                        </Col>
                      </Row>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <table className="table-rdd">
              <thead className="totalRow-rdd">
                <tr>
                  <th className="width3"></th>
                  <th className="width3">
                    <Checkbox
                      checked={
                        selectedGroups?.length &&
                        selectedGroups.length ===
                          groupedItemData.length
                      }
                      onChange={(e) => {
                        setIsSelectingGroup(true);
                        if (e.target.checked) {
                          setSelectedGroups(
                            groupedItemData?.map(
                              (group, index) => index,
                            ),
                          );
                        } else {
                          setSelectedGroups([]);
                        }
                      }}
                    />
                  </th>
                  <th className="width8">SO No.</th>
                  <th className="width8">PO No.</th>
                  <th className="width10">PO Expiry Date</th>
                  <th className="width5">Item #</th>
                  <th className="width10">Buyer Article Code</th>
                  <th className="width8">Parent SKU Code</th>
                  <th className="width15">SKU Name</th>
                  <th className="width8">PO Qty (CV)</th>
                  <th className="width10">Adjusted Qty (CV)</th>
                  <th className="width8">Open Qty (CV)</th>
                  <th className="width7">RDD</th>
                  <th className="width7">CV To Pieces</th>
                </tr>
              </thead>
              <tbody>
                {itemData.length > 0 && (
                  <>
                    {groupedItemData?.map((group, groupIndex) => (
                      <React.Fragment key={groupIndex}>
                        {group?.map((data, index) => (
                          <React.Fragment key={index}>
                            {/* Render the first row of the group */}
                            {index === 0 && (
                              <tr
                                className={
                                  groupIndex % 2 === 0
                                    ? 'collapsed-row'
                                    : ''
                                }
                                style={{
                                  textAlign: 'center',
                                  lineHeight: '2',
                                }}
                              >
                                <td className="width3">
                                  <button
                                    onClick={() =>
                                      toggleCollapse(groupIndex)
                                    }
                                    className="collapse-button-rdd"
                                  >
                                    {collapsedGroups.includes(
                                      groupIndex,
                                    )
                                      ? '+'
                                      : '-'}
                                  </button>
                                </td>
                                <td className="width3">
                                  <Checkbox
                                    checked={selectedGroups.includes(
                                      groupIndex,
                                    )}
                                    onChange={() => {
                                      toggleCheckbox(groupIndex);
                                    }}
                                  />
                                </td>
                                <td className="width8">
                                  {data.sales_order}
                                </td>
                                <td className="width8">
                                  {data.po_number}
                                </td>
                                <td className="width10">
                                {Util.formatDate(data.po_expiry_date,'DD-MM-YYYY')}
                                </td>
                                <td className="width5">
                                  {collapsedGroups.includes(
                                    groupIndex,
                                  )
                                    ? `${NO_DATA_SYMBOL}`
                                    : data.item_number}
                                </td>
                                <td className="width8">
                                  {collapsedGroups.includes(
                                    groupIndex,
                                  )
                                    ? `${NO_DATA_SYMBOL}`
                                    : data.article_id}
                                </td>
                                <td className="width8">
                                  {collapsedGroups.includes(
                                    groupIndex,
                                  )
                                    ? `${NO_DATA_SYMBOL}`
                                    : data.psku_code}
                                </td>
                                <td
                                  className="width15"
                                  style={{
                                    overflowWrap: 'break-word',
                                    paddingLeft: '18px',
                                  }}
                                >
                                  {collapsedGroups.includes(
                                    groupIndex,
                                  )
                                    ? `${NO_DATA_SYMBOL}`
                                    : data.sku_name}
                                </td>
                                <td className="width8">
                                  {collapsedGroups.includes(
                                    groupIndex,
                                  )
                                    ? `${NO_DATA_SYMBOL}`
                                    : data.po_qty}
                                </td>
                                {customerType ===
                                MT_ECOM_MULTI_GRN && !data?.ror_message ? (
                                  <td className="width10">
                                    <div
                                      style={{ position: 'relative' }}
                                    >
                                      <input
                                        className={
                                          collapsedGroups.includes(
                                            groupIndex,
                                          )
                                            ? 'qty-input-rdd-disabled rdd-input'
                                            : 'qty-input-rdd rdd-input input-focus-rdd'
                                        }
                                        type="number"
                                        value={
                                          collapsedGroups.includes(
                                            groupIndex,
                                          )
                                            ? calculateTotalQuantity(
                                                groupIndex,
                                                true,
                                              )
                                            : data.confirmed_qty
                                        }
                                        onChange={(e) =>
                                          handleInputChange(
                                            e,
                                            groupIndex,
                                            index,
                                            'confirmed_qty',
                                          )
                                        }
                                        onKeyDown={handleKeyDown}
                                        onWheel={handleWheel}
                                        onClick={(e) =>
                                          handleInputClick(
                                            e,
                                            groupIndex,
                                          )
                                        }
                                        onBlur={(e) =>
                                          handleInputBlur(
                                            e,
                                            groupIndex,
                                            index,
                                            'confirmed_qty',
                                          )
                                        }
                                        readOnly={collapsedGroups.includes(
                                          groupIndex,
                                        )}
                                      />
                                      {inputErrors[
                                        `${groupIndex}-${index}`
                                      ] && (
                                        <span className="error-message-rdd">
                                          {
                                            inputErrors[
                                              `${groupIndex}-${index}`
                                            ]
                                          }
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                ) : (
                                  <td className="width10">
                                    {collapsedGroups.includes(
                                      groupIndex,
                                    )
                                      ? calculateTotalQuantity(
                                          groupIndex,
                                        )
                                      : data.open_qty}
                                  </td>
                                )}
                                <td className="width5">
                                  {collapsedGroups.includes(
                                    groupIndex,
                                  )
                                    ? calculateTotalQuantity(
                                        groupIndex,
                                        false,
                                        'open_qty'
                                      )
                                    : data.open_qty}
                                  {data?.ror_message && (
                                    <Tooltip
                                      title={
                                        data?.ror_message
                                          ? data?.ror_message
                                          : ''
                                      }
                                    >
                                      <div className="message-open-qty">
                                        {data?.ror_message
                                          ? data?.ror_message
                                          : ''}
                                      </div>
                                    </Tooltip>
                                  )}
                                </td>
                                <td className="width10">
                                  {collapsedGroups.includes(
                                    groupIndex,
                                  )
                                    ? `${NO_DATA_SYMBOL}`
                                    : data?.rdd
                                    ? Util.formatDate(data?.rdd, 'DD-MM-YYYY')
                                    : `${NO_DATA_SYMBOL}`}
                                </td>
                                <td className="width10">
                                  {collapsedGroups.includes(
                                    groupIndex,
                                  )
                                    ? `${NO_DATA_SYMBOL}`
                                    : isNaN(data.confirmed_qty) || data.ror_message
                                    ? 0
                                    : data.confirmed_qty
                                    ? Math.floor(
                                        parseFloat(
                                          data.confirmed_qty,
                                        ) *
                                          (data.buom_to_cs
                                            ? parseFloat(
                                                data.buom_to_cs,
                                              )
                                            : 1),
                                      )
                                    : data.confirmed_qty}
                                </td>
                              </tr>
                            )}
                            {/* Render other rows of the group */}
                            {index !== 0 && (
                              <tr
                                key={index}
                                className={
                                  index % 2 === 0
                                    ? 'rdd-shaded-sub-row'
                                    : ''
                                }
                                style={{
                                  textAlign: 'center',
                                  lineHeight: '2',
                                  display: collapsedGroups.includes(
                                    groupIndex,
                                  )
                                    ? 'none'
                                    : 'table-row',
                                }}
                              >
                                <td></td>
                                <td></td>
                                <td>
                                  {index === 0
                                    ? data.sales_order
                                    : ''}
                                </td>
                                <td>
                                  {index === 0 ? data.po_number : ''}
                                </td>
                                <td>
                                  {index === 0
                                    ? data.po_expiry_date
                                    : ''}
                                </td>
                                <td className="width5">
                                  {data.item_number}
                                </td>
                                <td className="width10">
                                  {data.article_id}
                                </td>
                                <td className="width8">
                                  {data.psku_code}
                                </td>
                                <td
                                  className="width15"
                                  style={{
                                    overflowWrap: 'break-word',
                                    paddingLeft: '18px',
                                  }}
                                >
                                  {data.sku_name}
                                </td>
                                <td className="width8">
                                  {data.po_qty}
                                </td>
                                {customerType ===
                                MT_ECOM_MULTI_GRN && !data?.ror_message ? (
                                  <td className="width10">
                                    <div
                                      style={{ position: 'relative' }}
                                    >
                                      <input
                                        className="qty-input-rdd input-focus-rdd  rdd-input"
                                        type="number"
                                        value={data.confirmed_qty}
                                        onChange={(e) =>
                                          handleInputChange(
                                            e,
                                            groupIndex,
                                            index,
                                            'confirmed_qty',
                                          )
                                        }
                                        onKeyDown={handleKeyDown}
                                        onWheel={handleWheel}
                                        onClick={(e) =>
                                          handleInputClick(
                                            e,
                                            groupIndex,
                                          )
                                        }
                                        onBlur={(e) =>
                                          handleInputBlur(
                                            e,
                                            groupIndex,
                                            index,
                                            'confirmed_qty',
                                          )
                                        }
                                      />
                                      {inputErrors[
                                        `${groupIndex}-${index}`
                                      ] && (
                                        <span className="error-message-rdd">
                                          {
                                            inputErrors[
                                              `${groupIndex}-${index}`
                                            ]
                                          }
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                ) : (
                                  <td className="width10">
                                    {data?.open_qty}
                                  </td>
                                )}
                                <td className="width5">
                                  {data?.open_qty
                                    ? data?.open_qty
                                    : 0}
                                  {data?.ror_message && (
                                    <Tooltip
                                      title={
                                        data?.ror_message
                                          ? data?.ror_message
                                          : ''
                                      }
                                    >
                                      <div className="message-open-qty">
                                        {data?.ror_message
                                          ? data?.ror_message
                                          : ''}
                                      </div>
                                    </Tooltip>
                                  )}
                                </td>
                                <td className="width10">
                                  {data?.rdd
                                    ? Util.formatDate(data?.rdd, 'DD-MM-YYYY')
                                    : `${NO_DATA_SYMBOL}`}
                                </td>
                                <td className="width10">
                                  {isNaN(data.confirmed_qty) || data.ror_message
                                    ? 0
                                    : data.confirmed_qty
                                    ? Math.floor(
                                        parseFloat(
                                          data.confirmed_qty,
                                        ) *
                                          (data.buom_to_cs
                                            ? parseFloat(
                                                data.buom_to_cs,
                                              )
                                            : 1),
                                      )
                                    : data.confirmed_qty}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    ))}
                  </>
                )}
                {/* Render a message if there is no data available */}
                {itemData.length === 0 && (
                  <tr>
                    <td
                      colSpan="10"
                      style={{
                        textAlign: 'center',
                        fontSize: '16px',
                        paddingTop: '23px',
                        paddingLeft: '100px',
                      }}
                    >
                      <b>No Data Available</b>
                    </td>
                  </tr>
                )}

                <tr className="total-rdd">
                  <td colSpan="9" className="totalCell-rdd">
                    Total
                  </td>
                  <td className="totalCell-rdd"></td>
                  <td className="totalCell-rdd">
                    {customerType === MT_ECOM_MULTI_GRN 
                      ? calculateColumnSum('confirmed_qty')
                      : calculateColumnSum('open_qty')}
                  </td>
                  <td className="totalCell-rdd">
                    {calculateColumnSum('open_qty')}
                  </td>
                  <td></td>
                  <td className="totalCell-rdd">
                    {calculateColumnSum('conversionToPieces')}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>

            <br></br>
            <div className="submitButtonContainer-rdd">
              {selectedSONumbers?.length > 0 &&
                customerType === MT_ECOM_MULTI_GRN && (
                  <button
                    className="prefil-submitButton-rdd"
                    onClick={() => {
                      selectedGroups.forEach(
                        handlePrefillAndClearSelection,
                      );
                      setPrefillQtyClicked(!prefillQtyClicked);
                      if (prefillQtyClicked) {
                        setSelectedGroups([]);
                      }
                    }}
                    disabled={
                      !prefillQtyClicked && !selectedGroups?.length
                    }
                  >
                    {prefillQtyClicked ? 'Clear Qty' : 'Prefill Qty'}
                  </button>
                )}
              <button
                onClick={handleSubmit}
                className="submitButton-rdd"
                disabled={
                  updatedItemData.length === 0 ||
                  Object.keys(inputErrors).length > 0 ||
                  !shouldEnableSubmit()
                }
                style={
                  updatedItemData.length === 0 ||
                  Object.keys(inputErrors).length > 0 ||
                  !shouldEnableSubmit()
                    ? { background: 'grey', color: 'white' }
                    : { background: 'green', color: 'white' }
                }
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      </Spin>
    </div>
  );
};

const mapStateToProps = (state) => {
  return {};
};
const mapDispatchToProps = (dispatch) => {
  return {
    RDDList: (data) => dispatch(Actions.RDDList(data)),
    createAmendment: (data) =>
      dispatch(Actions.createAmendment(data)),
    getAppSettingList: () => dispatch(Actions.getAppSettingList()),
  };
};

const ConnectRDDData = connect(
  mapStateToProps,
  mapDispatchToProps,
)(RDD);

export default ConnectRDDData;
