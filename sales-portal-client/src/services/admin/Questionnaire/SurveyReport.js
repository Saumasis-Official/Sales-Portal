import { connect } from 'react-redux';
import { Select, Space, DatePicker, Tooltip, notification } from 'antd';
import './survey.css';
import { useEffect, useRef, useState } from 'react';
import * as AdminActions from '../actions/adminAction';
import { SearchOutlined } from '@ant-design/icons';
import * as AuthAction from '../../auth/action';
import * as Action from '../actions/adminAction';
import Loader from '../../../components/Loader';
import Util from '../../../util/helper/index'
import _, { set } from 'lodash';
import HeaderSearchBox from '../../../components/HeaderSearchBox/HeaderSearchBox';
import { debounce } from 'lodash';
import SurveyReportModal from './SurveyReportModal';
import Auth from '../../../util/middleware/auth';
import { teams, hasPermission } from '../../../persona/pegasus';

let Report = (props) => {
  const { get_survey_satistics, dashboardFilterCategories, get_depot_code } = props;
  const adminAccessDetails = JSON.parse(Auth.getAdminAccessDetails());
  const logistics_email = adminAccessDetails?.username?.split('_')[1];

  const [surveyData, setSurveyData] = useState([]);
  const [codes, setCodes] = useState([])
  const [limit, setLimit] = useState(10)
  const [offset, setOffset] = useState(0)
  const payload = useRef();
  const [selectedAreaCodes, setSelectedAreaCodes] = useState([]);
  const [selectedZones, setSelectedZones] = useState([]);
  const [enableSearch, setEnableSearch] = useState({ depoSearch: false })
  const [headerFilter, setHeaderFilter] = useState({})
  const [showReport, setShowReport] = useState(false);
  const [depot, setDepotCode] = useState()
  let areaCodes = []
  let zones = []

  const handleChange = (value, property) => {
    if (property === 'area_codes') {
      setSelectedAreaCodes([...value])
    } else if (property === 'zones') {
      setSelectedZones([...value])
    }
    payload.current = { ...payload.current, [property]: value }
    getData(payload.current);
  };

  useEffect(async () => {
    areaZoneData()
  }, []);

  useEffect(() => { }, [areaCodes, zones, codes, offset, limit, headerFilter])

  useEffect(() => {
    async function fetchActivePlantDistributors() {
      let body = hasPermission(teams.ADMIN) ? null : { logistics_email };
      let result = await get_depot_code(body);
      if (result && result.data) {
        setDepotCode(
          result.data.map((data) => ({
            label: data.depot_code,
            value: data.depot_code,
          })),
        );
      }
    }
    fetchActivePlantDistributors();
  }, []);

  const areaZoneData = async () => {
    await dashboardFilterCategories()
      .then((res) => {
        const result = [];
        res.response.area_details.forEach((obj) => {
          areaCodes.push(obj.area_code)
          zones.push(obj.region)
          result?.push({
            'Area Code': obj.area_code,
            'Zone': obj.region
          })
        })
        setCodes(result);
      })
      .catch((error) => { })
  }
  const getData = async () => {
    let surveyPayload = {
      ...payload.current,
      offset: offset,
      limit: limit,
      headerFilter: headerFilter || {},
    }
    const data = await get_survey_satistics(surveyPayload)
    setSurveyData(data?.data)
  }

  const onFilterChange = (e, propsKey) => {
    headerFilter[propsKey] = e.target.value
    setHeaderFilter({ ...headerFilter })
    getData()
  }
  const debouncedOnFilterChange = debounce(onFilterChange, 500);

  const onClose = (propKey) => {
    setEnableSearch({ ...enableSearch, [propKey]: false })
    delete headerFilter[propKey]
    setHeaderFilter({ ...headerFilter })
    getData();
  };

  function handelSurveyReportModal() {
    setShowReport(true);
  };
  function handelSurveyReportModal() {
    setShowReport(true);
  };
  function handleReportModalCancel() {
    setShowReport(false);
  }

  return (
    <div className='admin-dashboard-table Mdm-TableHeader mt10'>
      <div className="report-header-filter">
        <Space wrap className='space-heading' >
          <div className='header-select'>
            <span className="heading-title-filter">Select Zone</span>
            <Select
              showSearch
              mode="multiple"
              className='report-select'
              allowClear={true}
              placeholder='Select a Zone'
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.label.toLowerCase().includes(input.toLowerCase())
              }
              filterSort={(optionA, optionB) =>
                (optionA?.label ?? '').toLowerCase().localeCompare((optionB?.label ?? '').toLowerCase())
              }
              onChange={(value) => handleChange(value, "zones")}
              options={

                [...new Set(codes?.map(item => {
                  if (selectedAreaCodes.length == 0 || selectedAreaCodes.includes(item["Area Code"])) {
                    return item["Zone"]
                  }
                  return null
                }
                ))]
                  .filter(i => i != null)
                  .map(i => {
                    return {
                      label: i,
                      value: i
                    }
                  })
              }
            />
          </div>
          <div className="header-select">
            <span className="heading-title-filter">Select Area Code</span>
            <Select
              showSearch
              className='report-select'
             
              mode="multiple"
              allowClear={true}
              placeholder='Select a Area code'
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.label.toLowerCase().includes(input.toLowerCase())
              }
              filterSort={(optionA, optionB) =>
                (optionA?.label ?? '').toLowerCase().localeCompare((optionB?.label ?? '').toLowerCase())
              }
              onChange={(value) => handleChange(value, "area_codes")}
              options={[...new Set(codes?.map(item => {
                if (selectedZones.length == 0 || selectedZones.includes(item["Zone"])) {
                  return item["Area Code"]
                }
                return null
              }
              ))]
                .filter(i => i != null)
                .map(i => {
                  return {
                    label: i,
                    value: i
                  }
                })
              }
            />

          </div>
        </Space>
        <Space wrap className='space-heading' >
          <Tooltip placement="bottom" title="Download Last Completed Survey Report">
            <button className='submitButton' onClick={handelSurveyReportModal} >Download Report</button>
          </Tooltip>
        </Space>
      </div>
      <Loader>
        <table className='SurveyTable' >
          <thead>
            <tr>
              <th className=" sub-heading width10">Area Code</th>
              {!enableSearch.depoSearch ?
                <th className=" sub-heading width15">Depot Code   <SearchOutlined onClick={() => { setEnableSearch({ ...enableSearch, depoSearch: true }) }} /></th>
                :
                <th className=" sub-heading width15"><HeaderSearchBox onClose={onClose} onFilterChange={debouncedOnFilterChange} propKey={'depoSearch'} searchedValue={headerFilter['depoSearch']} /></th>}
              <th className=" sub-heading width15">Total Distributors to whom Survey was sent</th>
              <th className=" sub-heading width15">Total Distributors responded</th>
              <th className=" sub-heading width10">Average score</th>
              <th className=" sub-heading width15">Survey Start Date</th>
              <th className=" sub-heading width15">Survey End Date</th>
            </tr>
          </thead>
          <tbody className="tablebody">
            {surveyData && surveyData?.length > 0
              && (surveyData.map((data, index) => {
                return (
                  <tr>
                    <td>{data?.area_code}</td>
                    <td>{data?.depot_code} </td>
                    <td>{data?.total_dbs}</td>
                    <td>{data?.db_response_count} </td>
                    <td>{data?.avg_score} </td>
                    <td>{Util.formatDate(data?.survey_start)} , {Util.formatTime(data?.survey_start)}</td>
                    <td>{Util.formatDate(data?.survey_end)} , {Util.formatTime(data?.survey_end)}</td>
                  </tr>
                )
              })
              )}
          </tbody>
        </table>
      </Loader>
      {!(surveyData?.length > 0) && (<div className='NoDataDiv'>
        <b> No data available. Please make sure you have selected a "Area Code" or "Zone"</b>
      </div>)}
      {showReport && <SurveyReportModal depotCodes={depot.map((item) => item.value).sort()} open={showReport} onReportCancel={handleReportModalCancel} />}
    </div>
  );
};
const mapStateToProps = (state) => { };

const mapDispatchToProps = (dispatch) => {
  return {
    get_survey_satistics: data => dispatch(AuthAction.get_survey_satistics_by_admin(data)),
    getAreaCodes: () => dispatch(AdminActions.getAreaCodes()),
    get_depot_code: logistics_email => dispatch(AuthAction.get_Depot_Code(logistics_email)),
    dashboardFilterCategories: (data) => dispatch(Action.dashboardFilterCategories(data)),
  }
};

const QuestionnaireReport = connect(
  mapStateToProps,
  mapDispatchToProps,
)(Report);

export default QuestionnaireReport;

