import React, { useEffect, useState } from 'react';
import { DatePicker, Select, notification } from 'antd';
import dayjs from 'dayjs';
import moment from 'moment';
import { connect } from 'react-redux';
import * as AuthAction from '../../auth/action';
import * as AdminAction from '../actions/adminAction';
import PropTypes from 'prop-types';
import Auth from '../../../util/middleware/auth';
import Loader from '../../../components/Loader';
import * as SurveyAction from '../../distributor/actions/surveyAction';
import Panigantion from '../../../components/Panigantion/index';
import { pages, hasEditPermission } from '../../../persona/distributorHeader';
import _ from 'lodash';

const QuestionModal = (props) => {
  const now = new Date();
  const startdate = moment(
    new Date(now.getFullYear(), now.getMonth() + 1, 1),
  );
  const endDate = moment(
    new Date(now.getFullYear(), now.getMonth() + 1, 14),
  );

  const {

    get_depot_code,
    update_survey,
    prev,
    question,
    active_depot_distributors,
  } = props;

  const [dates, setDates] = useState([startdate, endDate]);
  const [dateValue, setDateValue] = useState([startdate, endDate]);
  const [disabledState, setDisabledState] = useState(true);
  const [cascadeOptions, setCascadeOptions] = useState();
  const [selectedDepotDB, setSelectedDepotDB] = useState({});
  const [activePlantDistributors, setActivePlantDistributors] =
    useState({});
  const [plantDistributors, setPlantDistributors] = useState({});
  const [option, setOption] = useState();
  const [selectedDB, setSelectedDB] = useState('');
  const [page, setPage] = useState(1);
  const [itemPerPage, setItemsPerPage] = useState(10);
  const [offset, setOffset] = useState(0);
  const [optionList, setOptionList] = useState([]);
  const [dropdownList, setDropdownList] = useState();
  const [selectedCustomerGroup, setSelectedCustomerGroup] = useState("");
  const [applicableCustomerGroups, setApplicableCustomerGroups] = useState([]);
  const [filteredDistributors, setFilteredDistributors] = useState([]);
  const adminAccessDetails = JSON.parse(Auth.getAdminAccessDetails());
  const logistics_email = adminAccessDetails?.username?.split('_')[1];
  const [selectAllCheckedStatus, setSelectAllCheckedStatus] =
    useState(false);
  const { RangePicker } = DatePicker;
  const defaultDB = selectedDB === '' ? props.depot[0] : selectedDB;
  const onChangePage = (page, itemsPerPage) => {
    setItemsPerPage(itemsPerPage);
    setPage(page);
    setOffset(Number((page - 1) * itemPerPage));
  };

  useEffect(() => {

    if (dates[0] === null && dates[1] === null) {
      notification.error({
        message: 'please select start and end date',
        duration: 10,
        className: 'notification-error',
      })
    }

  }, [dates])

  useEffect(() => {

    let limit = offset + Number(itemPerPage);

    let dbSelected = option?.find(
      (item) => item.value === (selectedDB === '' ? defaultDB : selectedDB),
    );
    const allDistributors = dbSelected?.all_distributors ?? [];
    const filteredDistributorsArr = selectedCustomerGroup ? allDistributors?.filter(i => i.name.split('$')[1] === selectedCustomerGroup) : allDistributors;
    setFilteredDistributors(filteredDistributorsArr);
    const tableData = filteredDistributorsArr?.slice(offset, limit);
    setApplicableCustomerGroups([...new Set(allDistributors?.map(i => (`${i?.name?.split('$')[1]}$${i?.name?.split('$')[2]}`)))].sort());
    setOptionList(tableData);
  }, [option, page, itemPerPage, selectedDB, defaultDB, selectedCustomerGroup])

  useEffect(() => {

    async function fetchActivePlantDistributors() {
      const adminRole = Auth.getAdminRole();
      let body = _.isEmpty(_.intersection(adminRole, ['SUPPORT', 'SUPER_ADMIN'])) ? { logistics_email } : null;
      let result = await get_depot_code(body);
      let results = result.data.filter((item) => {
        if (props.depot.includes(item.depot_code)) {
          return true;
        } else {
          return false;
        }
      });

      let dropdown = results.map((item) => ({
        label: item?.description,
        value: item?.depot_code,
      }));
      setDropdownList(dropdown);
      let filterResult = results.map((item) => ({
        label: item?.depot_code,
        value: item?.depot_code,
        description: item?.description,
        all_distributors: item?.all_distributors,
      }));

      let transformList = filterResult.map((option) => {
        const distributors = Object.entries(
          option?.all_distributors,
        ).map(([key, value]) => {
          return {
            id: key,
            name: value,
            checked: false,
          };
        });

        return {
          ...option,
          checkedAll: false,
          all_distributors: distributors,
        };
      });

      setOption(transformList);
      setSelectedDB(selectedDB === '' ? defaultDB : selectedDB);
      setOffset(0);
    }

    fetchActivePlantDistributors();
  }, []);

  const disabledDate = (current) => {
    if (!dates) {
      return false;
    }
    const next7 = dates[0] && current.diff(dates[0], 'days') !== 6;
    const next14 = dates[0] && current.diff(dates[0], 'days') !== 13;
    const prev7 = dates[1] && dates[1].diff(current, 'days') !== 6;
    const prev14 = dates[1] && dates[1].diff(current, 'days') !== 13;
    return (
      current &&
      (current < dayjs().endOf('day') ||
        (!!next7 && !!next14) ||
        (!!prev7 && !!prev14))
    );
  };

  const onOpenChange = (open) => {
    if (open) {
      setDates([null, null]);
    }
  };
  function calendarChanges(value) {
    setDates(value);
    if (
      selectedDepotDB != null &&
      selectedDepotDB.length > 0 &&
      dates != null &&
      dates[0] != null &&
      dates[1] != null
    ) {
      setDisabledState(false);
    }
  }

  const DBlist = (value) => {
    setPage(1);
    setSelectAllCheckedStatus(false);
    setSelectedDB(value);
  };

  function checked(e, index, code) {
    let isChecked = e.target.checked;
    let plantName = selectedDB === '' ? defaultDB : selectedDB;

    let checkedlist = option
      ?.find(
        (item) =>
          item.value === plantName,
      )
      ?.all_distributors?.map((item) => {
        if (item.id === code) {
          return {
            ...item,
            checked: isChecked
          };
        } else {
          return {
            ...item,
            checked: item.checked,
          };
        }
      });

    let lists = option.map((item) => {
      if (item.value === plantName) {
        return {
          ...item,
          all_distributors: checkedlist,
        };
      } else {
        return {
          ...item,
          // all_distributors: item.all_distributors,
        };
      }
    });

    setOption(lists);
  }

  function checkall(e) {
    const updatedOptions = option.map(item => ({
      ...item,
      checkedAll: e.target.checked, 
      all_distributors: item.all_distributors.map(distributor => ({
        ...distributor,
        checked: e.target.checked, 
      })),
    }));
  
    // Update the state with the new options
    setSelectAllCheckedStatus(e.target.checked);
    setOption(updatedOptions);
  }

  function payload() {
    let payload = {};
    let depot_code_selected = [];
    option.forEach((item) => {

      if (item.all_distributors.some((item) => item.checked === true)) {
        depot_code_selected.push({
          depot_code: item.value,
          status: true,
        });
      }
      else {
        depot_code_selected.push({
          depot_code: item.value,
          status: false,
        });
      }
    })

    if (depot_code_selected.some((item) => item.status === false)) {
      notification.error({
        message: 'Please select at least one distributor from each depot code',
        duration: 10,
        className: 'notification-error',
      })
    }
    else {
      option.forEach((item) => {
        Object.assign(payload, {
          [item.value]: item.all_distributors
            .filter((item) => item.checked)
            .map((item) => item.id),
        });
      });
      update_survey({
        depo_code: payload,
        status: true,
        date: dates,
        questions: question,
      });

      prev();
    }

  }

  function onCustomerGroupChange(value) {
    setPage(1);
    setOffset(0);
    setSelectedCustomerGroup(value);
  }
  return (
    <React.Fragment>
      <Loader>
        <div className="admin-dashboard-wrapper mtd-20">
          <div className="space">
            <div className='survey-selected-container'>
              <span className='survey-select-title'>Depot Code</span>
              <Select
                placeholder="Select depot-code"
                options={dropdownList?.map((item) => ({
                  label: `${item?.value}  ${item?.label}`,
                  value: `${item?.value}`,
                }))}
                onChange={(value) => DBlist(value)}
                className='survey-selected'
                defaultValue={dropdownList?.[0]?.value}
                value={selectedDB === '' ? props.depot[0] : selectedDB}
              />
            </div>

            <div className='survey-selected-container'>
              <span className='survey-select-title'>Customer Group</span>
              <Select
                allowClear
                placeholder="Select customer group"
                options={applicableCustomerGroups?.map((item) => ({
                  label: `${item.split('$')[1]} - ${item.split('$')[0]}`,
                  value: item.split('$')[0],
                }))}
                onChange={onCustomerGroupChange}
                className='survey-selected'
              // defaultValue={applicableCustomerGroups?.[0]}
              // value={selectedDB === '' ? props.depot[0] : selectedDB}
              />
            </div>

            <RangePicker
              value={dates || dateValue}
              disabledDate={disabledDate}
              onCalendarChange={calendarChanges}
              onChange={(val) => {
                setDateValue(val);
              }}
              onOpenChange={onOpenChange}
              changeOnBlur
              className="mb20"
              format={'DD-MM-YYYY'}
              allowClear={false}
            />
          </div>
          <div className="admin-dashboard-table survey_tables">
            <table className="">
              <thead>
                <tr>
                  <th className="width5">
                    <input
                      type="checkbox"
                      onClick={(e) => checkall(e)}
                      className="mr5 checkboxsurvey"
                      checked={selectAllCheckedStatus}
                    // checked={
                    //   option?.find(
                    //     (item) => item?.value === selectedDB,
                    //   )?.checkedAll
                    // }
                    />

                  </th>
                  <th className="width20">Distributor Code </th>
                  <th className="width30">Distributor Name</th>
                  <th className="width10">Customer Group</th>
                  <th className="width10">Plant Code</th>
                  <th className="width30">Plant Description</th>
                </tr>
              </thead>
              <tbody>
                {optionList?.map((item, index) => (
                  <tr>
                    <td className='center'>
                      <input
                        type="checkbox"
                        onClick={(e) => checked(e, index, item.id)}
                        className="checkboxsurvey"
                        checked={item?.checked}
                      />
                    </td>
                    <td>{item?.id}</td>
                    <td>{item?.name?.split('$')[0]}</td>
                    <td>{item.name?.split('$')[1]}</td>
                    <td className="width10">
                      {selectedDB === '' ? defaultDB : selectedDB}
                    </td>
                    <td className="width30">
                      {
                        option?.find(
                          (item) =>
                            item?.value ===
                            (selectedDB === ''
                              ? defaultDB
                              : selectedDB),
                        )?.description
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Panigantion
              data={optionList ? optionList : []}
              pageNo={page}
              itemsPerPage={itemPerPage}
              setItemsPerPage={setItemsPerPage}
              itemsCount={filteredDistributors?.length ?? 0}
              setModifiedData={onChangePage}
            />
            <div className="space-end">

              <button onClick={prev} className="submitButton prev">
                Previous
              </button>
              <button
                onClick={payload}
                className="submitButton mt90"
                disabled={
                  (dates[0] && dates[1] !== null ? false : true) || !hasEditPermission(pages.CFA_SURVEY)
                }
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </Loader>
    </React.Fragment>
  );
};

QuestionModal.propTypes = {
  onChangesDate: PropTypes.func.isRequired,
  setOpenBox: PropTypes.func.isRequired,
  get_cfa_questions: PropTypes.func.isRequired,
  allDepotDBDetails: PropTypes.array.isRequired,
  active_depot_distributors: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => {
  return {
    survey_details: state.survey.get('loading'),
    survey_depot_details: state.survey.get('depot_code'),
    update_table_data: state.survey.get('table'),
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    active_depot_distributors: () =>
      dispatch(AdminAction.getActivePlantDistributors()),
    get_cfa_questions: (depot_code) =>
      dispatch(AuthAction.get_cfa_questions(depot_code)),

    get_depot_code: (logistics_email) =>
      dispatch(AuthAction.get_Depot_Code(logistics_email)),
    update_survey: (data) =>
      dispatch(SurveyAction.update_survey(data)),
  };
};

const QuestionModalPage = connect(
  mapStateToProps,
  mapDispatchToProps,
)(QuestionModal);

export default QuestionModalPage;
