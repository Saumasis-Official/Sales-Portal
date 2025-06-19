import React, { useState, useEffect } from 'react';
import { Button, Input, Table, DatePicker, notification } from 'antd';
import { connect } from 'react-redux';
import * as AuthAction from '../../auth/action';
import './SurveyLink.css';
import Util from '../../../util/helper';
import { pages, hasEditPermission } from '../../../persona/distributorHeader';

const { RangePicker } = DatePicker;

const SurveyLink = (props) => {
  const [showInputs, setShowInputs] = useState(false);
  const [link, setLink] = useState('');
  const [dateRange, setDateRange] = useState([null, null]);
  const [saveButtonEnabled, setSaveButtonEnabled] = useState(false);
  const [data, setData] = useState([]);
  const { get_cfa_questions, surveyLink } = props;

  const columns = [
    {
      title: 'Survey Link',
      dataIndex: 'survey_link',
      key: 'link',
      headerStyle: { background: 'blue' },
    },
    {
      title: 'Start Date',
      dataIndex: 'survey_start',
      key: 'startDate',
      render: (text) => `${Util.formatDate(text)} ${Util.formatTime(text)}`,
    },
    {
      title: 'End Date',
      dataIndex: 'survey_end',
      key: 'endDate',
      render: (text) => `${Util.formatDate(text)} ${Util.formatTime(text)}`,
    },
  ];

  useEffect(() => {
    get_cfa_questions().then((response) => {
      const filteredData = response.data.filter((item) => {
        return item.survey_link != null;
      });
      setData(filteredData);
    });
  }, [get_cfa_questions]);

  const handleAddClick = () => {
    setShowInputs(true);
  };

  const handleCancelClick = () => {
    setShowInputs(false);
    setLink('');
    setDateRange([null, null]);
    setSaveButtonEnabled(false);
  };

  const handleSaveClick = () => {
    const surveyData = {
      survey_link: link,
      survey_start: dateRange[0],
      survey_end: dateRange[1],
    };
    props.surveyLink(surveyData).then(() => {
      setData([surveyData]);
      setLink('');
      setDateRange([null, null]);
      setSaveButtonEnabled(false);
      setShowInputs(false);

      notification.success({
        message: 'Link Added Successfully',
        duration: 3,
        className: 'notification-green',
      });
    });
  };

  const handleInputChange = (event) => {
    const newLink = event.target.value;
    setLink(newLink);
    setSaveButtonEnabled(newLink && dateRange[0] && dateRange[1]);
  };

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
    setSaveButtonEnabled(link && dates[0] && dates[1]);
  };



  return (
    <div>
      {showInputs ? (
        <div className="survey-link-input-fields">
          <Input
            value={link}
            onChange={handleInputChange}
            placeholder="Link"
            className="survey-link-input"
          />
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            placeholder={['Start Date', 'End Date']}
            className="survey-link-input wide-date-picker"
          />
          <div className="survey-link-button-container">
            <Button
              type="default"
              onClick={handleCancelClick}
              className="survey-link-cancel-button"
            >
              Cancel
            </Button>
            <Button
              type="default"
              onClick={handleSaveClick}
              className="survey-link-save-button"
              disabled={!saveButtonEnabled || !hasEditPermission(pages.CFA_SURVEY)}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <Button
          className="survey-link-add-button"
          type="primary"
          onClick={handleAddClick}
        >
          Add +
        </Button>
      )}
      <Table columns={columns} dataSource={data} className="survey-link-table" />
    </div>
  );
};

const mapDispatchToProps = (dispatch) => {
  return {
    get_cfa_questions: (data) =>
      dispatch(AuthAction.get_cfa_questions(data)),
    surveyLink: (data) => dispatch(AuthAction.surveyLink(data)),
  };
};

export default connect(null, mapDispatchToProps)(SurveyLink);
