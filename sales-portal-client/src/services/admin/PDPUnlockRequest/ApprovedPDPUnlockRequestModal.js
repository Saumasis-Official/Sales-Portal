import React, { useState, useEffect } from 'react';
import { Modal, Select, DatePicker } from 'antd';
import moment from 'moment';

const ApprovedPDPUnlockRequestModal = (props) => {
  const {
    isModalVisible,
    hideModal,
    filterData,
    submitRequest,
    pdpWindow = 31,
    width,
    height,
  } = props;
  const { RangePicker } = DatePicker;

  const [plantCodes, setPlantCodes] = useState([]);
  const [selectedPlantCodes, setSelectedPlantCodes] = useState([]);
  const [dates, setDates] = useState(null);
  const [datesValue, setDatesValue] = useState(null);
  const [datesString, setDatesString] = useState(null);
  const [comment, setComment] = useState('');
  const [startDateValue, setStartDateValue] = useState(null);
  const [endDateValue, setEndDateValue] = useState(null);
  const [startDateString, setStartDateString] = useState(null);
  const [endDateString, setEndDateString] = useState(null);
  //   const [tableData, setTableData] = useState({0: {plantCodes: '', start_date: '', end_date: '', comments: ''}});

  useEffect(() => {
    const plantSet = new Set();
    if (!filterData['area_details']?.length) return;
    filterData['area_details']?.forEach((area) => {
      plantSet.add(area['plant_code']);
    });

    setPlantCodes([...plantSet].sort());
  }, [filterData]);

  const disabledDate = (current) => {
    if (!dates || !dates[0]) {
      return current && current < moment().startOf('day');
    }

    const lastDate = dates[0].clone().add(+pdpWindow - 1, 'days');
    const endOfMonth = dates[0].clone().endOf('month');
    const maxDate = lastDate.isBefore(endOfMonth)
      ? lastDate
      : endOfMonth;
    return current && (current < dates[0] || current > maxDate);
  };

  const onDatesOpenChange = (open) => {
    if (open) {
      setDates([null, null]);
    } else {
      setDates(null);
    }
  };

  const handleComment = (event) => {
    const { value } = event.target;
    setComment(value);
  };

  const setFieldsEmpty = () => {
    setSelectedPlantCodes([]);
    setDates(null);
    setDatesValue(null);
    setDatesString(null);
    setStartDateValue(null);
    setEndDateValue(null);
    setStartDateString(null);
    setEndDateString(null);
  };

  const onCancel = () => {
    setFieldsEmpty();
    setComment('');
    hideModal();
  };

  const onSubmit = () => {
    const payload = {
      plant_codes: selectedPlantCodes,
      start_date:
        datesString?.length > 0 ? datesString[0] : startDateString,
      end_date:
        datesString?.length > 0 ? datesString[1] : endDateString,
      comments: comment,
    };
    submitRequest(payload);
    setFieldsEmpty();
  };

  const onStartDateChange = (date, dateString) => {
    setStartDateValue(date);
    setStartDateString(dateString);
    setEndDateValue(null);
    setEndDateString(null);
  };

  const disabledStartDate = (current) => {
    return current && current < moment().startOf('day');
  };

  const onEndDateChange = (date, dateString) => {
    setEndDateValue(date);
    setEndDateString(dateString);
  };

  const disabledEndDate = (current) => {
    if (!startDateValue) {
      return true;
    }

    const endOfMonth = startDateValue.clone().endOf('month');
    return (
      current && (current < startDateValue || current > endOfMonth)
    );
  };

  return (
    <Modal
      title="New Approved PDP Unlock Request"
      visible={!!isModalVisible}
      onCancel={onCancel}
      footer={null}
      width={600}
      style={{ top: 20, fontSize: width > 767 ? '14px' : '12px' }}
      wrapClassName="comment-modal2"
    >
      <div className="modal-container">
        <div className="plant-div">
          <label>Plant Codes</label>
          <Select
            mode="multiple"
            showSearch
            placeholder="Plant Code"
            value={selectedPlantCodes}
            onChange={(value) => setSelectedPlantCodes(value)}
            style={{ width: '100%' }}
            allowClear={selectedPlantCodes?.length > 0}
            options={plantCodes.map((p) => ({ label: p, value: p }))}
          />
        </div>
        {width > 767 ? (
          <div className="date-div">
            <label>Start-End Dates</label>
            <RangePicker
              value={dates || datesValue}
              style={{ fontWeight: '600', width: '100%' }}
              format="YYYY-MM-DD"
              disabledDate={disabledDate}
              onCalendarChange={(val, fs) => {
                setDates(val);
              }}
              onChange={(val, fs) => {
                setDatesValue(val);
                setDatesString(fs);
              }}
              onOpenChange={onDatesOpenChange}
              // onBlur={() => console.log('blur has been triggered')}
            />
          </div>
        ) : (
          <>
            <div className="mobile-date-div">
              <label>Start Date</label>
              <DatePicker
                style={{ fontWeight: '600', width: '100%' }}
                value={startDateValue}
                disabledDate={disabledStartDate}
                format="YYYY-MM-DD"
                onChange={onStartDateChange}
              />
            </div>
            <div className="mobile-date-div">
              <label>End Date</label>
              <DatePicker
                style={{ fontWeight: '600', width: '100%' }}
                value={endDateValue}
                disabledDate={disabledEndDate}
                format="YYYY-MM-DD"
                onChange={onEndDateChange}
              />
            </div>
          </>
        )}

        <div className="comment-div">
          <label>Comments</label>
          <textarea
            value={comment}
            onChange={handleComment}
            placeholder="Enter comment for this PDP Unlock Request (10-255 characters)"
          />
        </div>
        <div className="buttons-div">
          <button
            type="button"
            className="sbmt-btn"
            disabled={
              !selectedPlantCodes.length ||
              !(comment.length > 9) ||
              (!datesString?.length &&
                !startDateString &&
                !endDateString)
            }
            onClick={onSubmit}
          >
            Submit
          </button>
        </div>
      </div>
      {/* <div className='admin-dashboard-table'>
                <table>
                    <thead>
                        <tr>
                            <th className='width30'>Plant Code</th>
                            <th className='width40'>Start-End Dates</th>
                            <th className='width30'>Comments</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className='width30'>
                                <Select
                                    style={{ width: '100%', lineHeight: 2.6500}}
                                    showSearch mode='multiple'  
                                    value={selectedPlantCodes}
                                    onChange={(value) => setSelectedPlantCodes(value)} 
                                    allowClear={selectedPlantCodes?.length > 0} 
                                    // disabled={customer_group?.some(value => disableValues.includes(value))} 
                                    placeholder='Plant Code'>
                                    {
                                        plantCodes?.sort().map((data) => {
                                            return (
                                                <Option value={data}>{data}</Option>
                                            )
                                        })
                                    }
                                </Select>
                            </td>
                            <td className='width40'>
                                <RangePicker
                                    value={dates || datesValue}
                                    style={{ fontWeight: '600', width: '100%' }}
                                    format="YYYY-MM-DD"
                                    disabledDate={disabledDate}
                                    onCalendarChange={(val,fs) => {setDates(val)}}
                                    onChange={(val, fs) => {
                                        setDatesValue(val)
                                        }}
                                    onOpenChange={onDatesOpenChange}
                                    // onBlur={() => console.log('blur has been triggered')}
                                />
                            </td>
                            <td className='width30'>
                                <div className="comment-div">
                                    <textarea
                                        value={comment}
                                        onChange={handleComment}
                                        placeholder="Enter comment for this PDP Unlock Request (10-255 characters)"
                                    />
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div> */}
    </Modal>
  );
};
export default ApprovedPDPUnlockRequestModal;
