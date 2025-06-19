import React, { useEffect, useState, useCallback } from 'react';
import { connect } from 'react-redux';
import { DatePicker, Space, message, Button, Select } from 'antd';
import { FilterOutlined, CloseOutlined } from '@ant-design/icons';
import moment from 'moment';
import '../Report/Report.css';
import * as Action from '../actions/adminAction';
import * as DBAction from '../../distributor/action';
import Auth from '../../../util/middleware/auth';
import Util from '../../../util/helper';
import {
  ComposedChart,
  LineChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import _, { get } from 'lodash'; // cool kids know _ is low-dash
import {
  pages,
  features,
  hasViewPermission,
} from '../../../persona/distributorHeader';

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#4572A7',
  '#3366cc',
  '#dc3912',
  '#ff9900',
  '#109618',
  '#990099',
  '#0099c6',
  '#dd4477',
  '#AA4643',
  '#89A54E',
  '#80699B',
  '#3D96AE',
  '#DB843D',
  '#92A8CD',
  '#A47D7C',
  '#B5CA92',
];

const { RangePicker } = DatePicker;

let currentDate = new Date();
currentDate = String(
  moment(currentDate).format('YYYY-MM-DD HH:mm:ss'),
);
let startDate = String(
  moment().startOf('month').format('YYYY-MM-DD HH:mm:ss'),
);
let portalIssueStartDate = String(
  moment().startOf('month').format('YYYY-MM-DD HH:mm:ss'),
);
let sdrStartDate = String(
  moment().startOf('month').format('YYYY-MM-DD HH:mm:ss'),
);

let Report = (props) => {
  const browserHistory = props.history;
  const [dateRange, setDateRange] = useState([
    startDate,
    currentDate,
  ]);
  const [dateRangeOrder, setDateRangeOrder] = useState([
    startDate,
    currentDate,
  ]);
  const [portalIssueDateRange, setPortalIssueDateRange] = useState([
    portalIssueStartDate,
    currentDate,
  ]);
  const [
    portalIssueCumulativeDateRange,
    setPortalIssueCumulativeDateRange,
  ] = useState([portalIssueStartDate, currentDate]);

  const [originalChartData, setOriginalChartData] = useState([]);
  const [originalChartData1, setOriginalChartData1] = useState([]);

  const [chartData, setChartData] = useState([]);
  const [chartDataOrder, setChartDataOrder] = useState([]);

  const [portalIssuesChartData, setPortalIssuesChartData] = useState(
    [],
  );
  const [
    portalIssuesCumulativeChartData,
    setPortalIssuesCumulativeChartData,
  ] = useState([]);

  const [salesValueZones, setSalesValueZones] = useState('');
  const [issueCumulativeCountZones, setIssueCumulativeCountZones] =
    useState('');

  const [opacity, setOpacity] = useState({});
  const [opacityOrder, setOpacityOrder] = useState({});

  const [uniqueZones, setUniqueZones] = useState([]);
  const [uniqueZonesOrder, setUniqueZonesOrder] = useState([]);


  const [sdrCategories, setSdrCategories] = useState([]);
  const [sdrLineChartDataObj, setSdrLineChartDataObj] = useState();
  const [originalSdrLineChartData, setOriginalSdrLineChartData] =
    useState([]);
  const [sdrLineChartData, setSdrLineChartData] = useState([]);
  const [sdrDateRange, setSdrDateRange] = useState([
    sdrStartDate,
    currentDate,
  ]);
  const [uniqueSdrCategory, setUniqueSdrCategory] = useState([]);
  const [
    sdrCumulativeLineChartDataObj,
    setSdrCumulativeLineChartDataObj,
  ] = useState();
  const [
    originalSdrCumulativeLineChartData,
    setOriginalSdrCumulativeLineChartData,
  ] = useState([]);
  const [sdrCumulativeLineChartData, setSdrCumulativeLineChartData] =
    useState([]);
  const [sdrCumulativeDateRange, setSdrCumulativeDateRange] =
    useState([sdrStartDate, currentDate]);
  const [
    uniqueSdrCumulativeCategory,
    setUniqueSdrCumulativeCategory,
  ] = useState([]);

  const [sdResponseCategories, setSdResponseCategories] = useState(
    [],
  );
  const [sdResponseLineChartDataObj, setSdResponseLineChartDataObj] =
    useState();
  const [
    originalSdResponseLineChartData,
    setOriginalSdResponseLineChartData,
  ] = useState([]);
  const [sdResponseLineChartData, setSdResponseLineChartData] =
    useState([]);
  const [sdResponseDateRange, setSdResponseDateRange] = useState([
    sdrStartDate,
    currentDate,
  ]);
  const [uniqueSdResponseCategory, setUniqueSdResponseCategory] =
    useState([]);

  const [
    sdResponseCumulativeLineChartDataObj,
    setSdResponseCumulativeLineChartDataObj,
  ] = useState();
  const [
    originalSdResponseCumulativeLineChartData,
    setOriginalSdResponseCumulativeLineChartData,
  ] = useState([]);
  const [
    sdResponseCumulativeLineChartData,
    setSdResponseCumulativeLineChartData,
  ] = useState([]);
  const [
    sdResponseCumulativeDateRange,
    setSdResponseCumulativeDateRange,
  ] = useState([sdrStartDate, currentDate]);
  const [
    uniqueSdResponseCumulativeCategory,
    setUniqueSdResponseCumulativeCategory,
  ] = useState([]);

  const [activeSessionDateRange, setActiveSessionDateRange] =
    useState([startDate, currentDate]);
  const [activeSessionData, setActiveSessionData] = useState([]);

  const [maxActiveSession, setMaxActiveSession] = useState('auto');
  const { sso_user_details, getSSODetails, getActiveSessionReport } =
    props;
  const ssoRole =
    sso_user_details.data &&
    sso_user_details.data.length &&
    sso_user_details.data[0].roles;

  const min = 0;
  const max = 'auto';

  var adminRole = Auth.getAdminRole();

  const orderListType = [
    {label:"All",value:"ALL"},
    { label: "Normal", value: "NORMAL" },
    { label: "Liquidation", value: "LIQUIDATION" },
    { label: "Self Lifting", value: "SELF_LIFTING" },
    { label: "ARS", value: "ARS" },
    { label: "Rush", value: "RUSH" },
    { label: "Bulk", value: "BULK" },
  ];
 const [orderType, setOrderType] = useState("ALL");

  const handleOrderTypeChange  =(value) => {
    setOrderType(value);
  }

  Date.prototype.addDays = function (days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
  };

  const getLineChart = (chartDetails) => {
    if (chartDetails.length > 0) {
      const keysArr = Object.keys(chartDetails[0]).slice(1);
      let lineArr = [];
      keysArr.forEach((item, index) => {
        if (item == 'Total') {
          lineArr.push(
            <Line
              yAxisId="right"
              key={index}
              dataKey={item}
              stroke={'rgba(0, 0, 0, 1)'}
              strokeWidth={3}
              strokeOpacity={opacity[item]}
            />,
          );
        } else {
          lineArr.push(
            <Line
              yAxisId="left"
              key={index}
              dataKey={item}
              stroke={COLORS[index]}
              strokeWidth={2}
              strokeOpacity={opacity[item]}
            />,
          );
        }
      });
      return lineArr;
    }
  };
  const getIssueCountLineChart = (chartDetails) => {
    if (chartDetails.length > 0) {
      const keysArr = Object.keys(chartDetails[0]).slice(1);
      const lineArr = [];
      keysArr.forEach((item, index) => {
        if (item == 'Total') {
          lineArr.push(
            <Line
              key={index}
              dataKey={item}
              stroke={'rgba(0, 0, 0, 1)'}
              strokeWidth={3}
            />,
          );
        } else {
          lineArr.push(
            <Line
              key={index}
              dataKey={item}
              stroke={COLORS[index]}
              strokeWidth={2}
            />,
          );
        }
      });
      return lineArr;
    }
  };
  const getIssueCumulativeCountLineChart = (chartDetails) => {
    if (chartDetails.length > 0) {
      const keysArr = Object.keys(chartDetails[0]).slice(1);
      const lineArr = [];
      keysArr.forEach((item, index) => {
        if (item == 'Total') {
          lineArr.push(
            <Line
              yAxisId="right"
              key={index}
              dataKey={item}
              stroke={'rgba(0, 0, 0, 1'}
              strokeWidth={3}
            />,
          );
        } else {
          lineArr.push(
            <Line
              yAxisId="left"
              key={index}
              dataKey={item}
              stroke={COLORS[index]}
              strokeWidth={2}
            />,
          );
        }
      });
      return lineArr;
    }
  };

  const getSalesValueZones = (chartDetails) => {
    if (chartDetails.length > 0) {
      const keysArr = Object.keys(chartDetails[0]).slice(1);
      let seriesArr = [];
      let seriesArrStr = '';
      keysArr.forEach((item, index) => {
        if (item != 'Total') {
          seriesArr.push(item);
        }
      });
      if (seriesArr.length > 0) {
        seriesArrStr = seriesArr.join(',');
      }
      setSalesValueZones(seriesArrStr);
    }
  };

  const getIssueCountCumulativeZones = (chartDetails) => {
    if (chartDetails.length > 0) {
      const keysArr = Object.keys(chartDetails[0]).slice(1);
      let seriesArr = [];
      let seriesArrStr = '';
      keysArr.forEach((item, index) => {
        if (item != 'Total') {
          seriesArr.push(item);
        }
      });
      if (seriesArr.length > 0) {
        seriesArrStr = seriesArr.join(',');
      }
      setIssueCumulativeCountZones(seriesArrStr);
    }
  };

  const getSdrCountLineChart = (chartDetails) => {
    if (chartDetails.length > 0) {
      const keysArr = Object.keys(chartDetails[0]).slice(1);
      const lineArr = [];
      keysArr.forEach((item, index) => {
        if (item == 'total (OPEN)') {
          lineArr.push(
            <Line
              key={index}
              yAxisId="left"
              dataKey={item}
              stroke={'rgba(0, 0, 0, 1)'}
              strokeWidth={3}
              strokeDasharray="5 5"
            />,
          );
        } else if (item == 'total (CLOSE)') {
          lineArr.push(
            <Line
              key={index}
              yAxisId="right"
              dataKey={item}
              stroke={'rgba(0, 0, 0, 1)'}
              strokeWidth={3}
            />,
          );
        } else {
          if (item.endsWith('(OPEN)'))
            lineArr.push(
              <Line
                key={index}
                yAxisId="left"
                dataKey={item}
                stroke={COLORS[index]}
                strokeWidth={2}
                strokeDasharray="5 5"
              />,
            );
          else if (item.endsWith('(CLOSE)'))
            lineArr.push(
              <Line
                key={index}
                yAxisId="right"
                dataKey={item}
                stroke={COLORS[index - 1]}
                strokeWidth={2}
              />,
            );
        }
      });
      return lineArr;
    }
  };

  const getActiveSessionLineChart = (chartDetails) => {
    if (chartDetails.length > 0) {
      const keysArr = Object.keys(chartDetails[0]).slice(1);
      const lineArr = [];
      keysArr.forEach((item, index) => {
        lineArr.push(
          <Line
            key={index}
            dataKey={item}
            stroke={COLORS[index]}
            strokeWidth={2}
          />,
        );
      });
      return lineArr;
    }
  };

  useEffect(async () => {
    let obj = { date: '', 'total (OPEN)': 0, 'total (CLOSE)': 0 };
    if (!(sdrCategories && sdrCategories.length)) {
      let response = await props.fetchServiceLevelCategory(
        'SD_REQUEST',
      );
      if (response?.data && response.data.data) {
        let sdr_labels = [];
        response.data.data.forEach((item) => {
          sdr_labels.push(item.label);
        });

        for (const key of sdr_labels) {
          let key1 = key + ' (OPEN)';
          let key2 = key + ' (CLOSE)';
          obj[key1] = 0;
          obj[key2] = 0;
        }

        setSdrCategories(sdr_labels);
        setSdrLineChartDataObj(obj);

        let uniqueSdrCategoryArr = [];
        const keysArr = Object.keys(obj).slice(1);
        for (let key of keysArr) {
          let temp_obj = {
            Name: key,
            Value: true,
          };
          uniqueSdrCategoryArr.push(temp_obj);
        }
        setUniqueSdrCategory(uniqueSdrCategoryArr);
      }
    }

    let sdrReportData = await props.getSdrReportData({
      toDate: sdrDateRange[0],
      fromDate: sdrDateRange[1],
    });
    if (
      sdrReportData &&
      sdrReportData.data &&
      sdrReportData.data.rows
    ) {
      let sdr_data = sdrReportData.data.rows
        .sort((a, b) =>
          a.sd_request_date > b.sd_request_date ? 1 : -1,
        )
        .map((o) => {
          return {
            id: o.id,
            label: o.label,
            sd_request_date: new Date(
              o.sd_request_date,
            ).toLocaleDateString(),
            status: o.status,
          };
        });

      let sdr_line_chart_data = [];
      for (
        let d = new Date(sdrDateRange[0]);
        d <= new Date(sdrDateRange[1]);
        d = d.addDays(1)
      ) {
        let o = !sdrLineChartDataObj
          ? { ...obj }
          : { ...sdrLineChartDataObj };
        o.date = d.toLocaleDateString();
        sdr_line_chart_data.push(o);
      }

      let sdr_data_index = 0;
      let sdr_line_chart_data_index = 0;
      let total_open = 'total (OPEN)';
      let total_close = 'total (CLOSE)';
      while (
        sdr_line_chart_data_index < sdr_line_chart_data.length &&
        sdr_data_index < sdr_data.length
      ) {
        let sdr_data_obj = { ...sdr_data[sdr_data_index] };
        let sdr_line_chart_data_obj = {
          ...sdr_line_chart_data[sdr_line_chart_data_index],
        };
        let key1 = sdr_data_obj.label + ' (OPEN)';
        let key2 = sdr_data_obj.label + ' (CLOSE)';
        if (
          sdr_data_obj.sd_request_date ===
          sdr_line_chart_data_obj.date
        ) {
          if (sdr_data_obj.status === 'OPEN') {
            sdr_line_chart_data_obj[key1] += 1;
            sdr_line_chart_data_obj[total_open] += 1;
          } else {
            sdr_line_chart_data_obj[key2] += 1;
            sdr_line_chart_data_obj[total_close] += 1;
          }

          sdr_line_chart_data[sdr_line_chart_data_index] =
            sdr_line_chart_data_obj;
          sdr_data_index += 1;
        } else {
          sdr_line_chart_data_index += 1;
        }
      }
      setSdrLineChartData(sdr_line_chart_data);
      setOriginalSdrLineChartData(sdr_line_chart_data);
    }
  }, [sdrDateRange]);

  useEffect(async () => {
    let obj = { date: '', 'total (OPEN)': 0, 'total (CLOSE)': 0 };
    if (!(sdrCategories && sdrCategories.length)) {
      let response = await props.fetchServiceLevelCategory(
        'SD_REQUEST',
      );
      if (response?.data && response.data.data) {
        let sdr_labels = [];
        response.data.data.forEach((item) => {
          sdr_labels.push(item.label);
        });

        for (const key of sdr_labels) {
          let key1 = key + ' (OPEN)';
          let key2 = key + ' (CLOSE)';
          obj[key1] = 0;
          obj[key2] = 0;
        }

        setSdrCategories(sdr_labels);
        setSdrCumulativeLineChartDataObj(obj);

        let uniqueSdrCumulativeCategoryArr = [];
        const keysArr = Object.keys(obj).slice(1);
        for (let key of keysArr) {
          let temp_obj = {
            Name: key,
            Value: true,
          };
          uniqueSdrCumulativeCategoryArr.push(temp_obj);
        }
        setUniqueSdrCumulativeCategory(
          uniqueSdrCumulativeCategoryArr,
        );
      }
    }

    let sdrReportData = await props.getSdrReportData({
      toDate: sdrCumulativeDateRange[0],
      fromDate: sdrCumulativeDateRange[1],
    });
    if (
      sdrReportData &&
      sdrReportData.data &&
      sdrReportData.data.rows
    ) {
      let sdr_data = sdrReportData.data.rows
        .sort((a, b) =>
          a.sd_request_date > b.sd_request_date ? 1 : -1,
        )
        .map((o) => {
          return {
            id: o.id,
            label: o.label,
            sd_request_date: new Date(
              o.sd_request_date,
            ).toLocaleDateString(),
            status: o.status,
          };
        });

      let sdr_cumulative_line_chart_data = [];
      for (
        let d = new Date(sdrCumulativeDateRange[0]);
        d <= new Date(sdrCumulativeDateRange[1]);
        d = d.addDays(1)
      ) {
        let o = !sdrCumulativeLineChartDataObj
          ? { ...obj }
          : { ...sdrCumulativeLineChartDataObj };
        o.date = d.toLocaleDateString();
        sdr_cumulative_line_chart_data.push(o);
      }

      let sdr_data_index = 0;
      let sdr_cumulative_line_chart_data_index = 0;
      let total_open = 'total (OPEN)';
      let total_close = 'total (CLOSE)';
      while (
        sdr_cumulative_line_chart_data_index <
          sdr_cumulative_line_chart_data.length &&
        sdr_data_index < sdr_data.length
      ) {
        let sdr_data_obj = { ...sdr_data[sdr_data_index] };
        let sdr_cumulative_line_chart_data_obj = {
          ...sdr_cumulative_line_chart_data[
            sdr_cumulative_line_chart_data_index
          ],
        };
        let key1 = sdr_data_obj.label + ' (OPEN)';
        let key2 = sdr_data_obj.label + ' (CLOSE)';
        if (
          sdr_data_obj.sd_request_date ===
          sdr_cumulative_line_chart_data_obj.date
        ) {
          if (sdr_data_obj.status === 'OPEN') {
            sdr_cumulative_line_chart_data_obj[key1] += 1;
            sdr_cumulative_line_chart_data_obj[total_open] += 1;
          } else {
            sdr_cumulative_line_chart_data_obj[key2] += 1;
            sdr_cumulative_line_chart_data_obj[total_close] += 1;
          }

          sdr_cumulative_line_chart_data[
            sdr_cumulative_line_chart_data_index
          ] = sdr_cumulative_line_chart_data_obj;
          sdr_data_index += 1;
        } else {
          sdr_cumulative_line_chart_data_index += 1;
          let date =
            sdr_cumulative_line_chart_data[
              sdr_cumulative_line_chart_data_index
            ].date;
          sdr_cumulative_line_chart_data[
            sdr_cumulative_line_chart_data_index
          ] = { ...sdr_cumulative_line_chart_data_obj };
          sdr_cumulative_line_chart_data[
            sdr_cumulative_line_chart_data_index
          ].date = date;
        }
      }
      sdr_cumulative_line_chart_data_index += 1;
      while (
        sdr_cumulative_line_chart_data_index <
        sdr_cumulative_line_chart_data.length
      ) {
        let date =
          sdr_cumulative_line_chart_data[
            sdr_cumulative_line_chart_data_index
          ].date;
        let objs = {
          ...sdr_cumulative_line_chart_data[
            sdr_cumulative_line_chart_data_index - 1
          ],
        };
        objs.date = date;
        sdr_cumulative_line_chart_data[
          sdr_cumulative_line_chart_data_index
        ] = { ...objs };
        sdr_cumulative_line_chart_data_index += 1;
      }
      setSdrCumulativeLineChartData(sdr_cumulative_line_chart_data);
      setOriginalSdrCumulativeLineChartData(
        sdr_cumulative_line_chart_data,
      );
    }
  }, [sdrCumulativeDateRange]);

  useEffect(async () => {
    let obj = { date: '', 'total (OPEN)': 0, 'total (CLOSE)': 0 };
    if (!(sdResponseCategories && sdResponseCategories.length)) {
      let response = await props.fetchServiceLevelCategory(
        'SD_RESPONSE',
      );
      if (response?.data && response.data.data) {
        let sd_response_labels = [];
        response.data.data.forEach((item) => {
          sd_response_labels.push(item.label);
        });

        for (const key of sd_response_labels) {
          let key1 = key + ' (OPEN)';
          let key2 = key + ' (CLOSE)';
          obj[key1] = 0;
          obj[key2] = 0;
        }

        setSdResponseCategories(sd_response_labels);
        setSdResponseLineChartDataObj(obj);

        let uniqueSdResponseCategoryArr = [];
        const keysArr = Object.keys(obj).slice(1);
        for (let key of keysArr) {
          let temp_obj = {
            Name: key,
            Value: true,
          };
          uniqueSdResponseCategoryArr.push(temp_obj);
        }
        setUniqueSdResponseCategory(uniqueSdResponseCategoryArr);
      }
    }

    let sdResponseReportData = await props.getSdResponseReportData({
      toDate: sdResponseDateRange[0],
      fromDate: sdResponseDateRange[1],
    });
    if (
      sdResponseReportData &&
      sdResponseReportData.data &&
      sdResponseReportData.data.rows
    ) {
      let sd_response_data = sdResponseReportData.data.rows
        .sort((a, b) =>
          a.sd_response_date > b.sd_response_date ? 1 : -1,
        )
        .map((o) => {
          return {
            id: o.id,
            label: o.label,
            sd_response_date: new Date(
              o.sd_response_date,
            ).toLocaleDateString(),
            status: o.status,
          };
        });

      let sd_response_line_chart_data = [];
      for (
        let d = new Date(sdResponseDateRange[0]);
        d <= new Date(sdResponseDateRange[1]);
        d = d.addDays(1)
      ) {
        let o = !sdResponseLineChartDataObj
          ? { ...obj }
          : { ...sdResponseLineChartDataObj };
        o.date = d.toLocaleDateString();
        sd_response_line_chart_data.push(o);
      }

      let sd_response_data_index = 0;
      let sd_response_line_chart_data_index = 0;
      let total_open = 'total (OPEN)';
      let total_close = 'total (CLOSE)';
      while (
        sd_response_line_chart_data_index <
          sd_response_line_chart_data.length &&
        sd_response_data_index < sd_response_data.length
      ) {
        let sd_response_data_obj = {
          ...sd_response_data[sd_response_data_index],
        };
        let sd_response_line_chart_data_obj = {
          ...sd_response_line_chart_data[
            sd_response_line_chart_data_index
          ],
        };
        let key1 = sd_response_data_obj.label + ' (OPEN)';
        let key2 = sd_response_data_obj.label + ' (CLOSE)';
        if (
          sd_response_data_obj.sd_response_date ===
          sd_response_line_chart_data_obj.date
        ) {
          if (sd_response_data_obj.status === 'OPEN') {
            sd_response_line_chart_data_obj[key1] += 1;
            sd_response_line_chart_data_obj[total_open] += 1;
          } else {
            sd_response_line_chart_data_obj[key2] += 1;
            sd_response_line_chart_data_obj[total_close] += 1;
          }

          sd_response_line_chart_data[
            sd_response_line_chart_data_index
          ] = sd_response_line_chart_data_obj;
          sd_response_data_index += 1;
        } else {
          sd_response_line_chart_data_index += 1;
        }
      }
      setSdResponseLineChartData(sd_response_line_chart_data);
      setOriginalSdResponseLineChartData(sd_response_line_chart_data);
    }
  }, [sdResponseDateRange]);

  useEffect(async () => {
    let obj = { date: '', 'total (OPEN)': 0, 'total (CLOSE)': 0 };
    if (!(sdResponseCategories && sdResponseCategories.length)) {
      let response = await props.fetchServiceLevelCategory(
        'SD_RESPONSE',
      );
      if (response?.data && response.data.data) {
        let sd_response_labels = [];
        response.data.data.forEach((item) => {
          sd_response_labels.push(item.label);
        });

        for (const key of sd_response_labels) {
          let key1 = key + ' (OPEN)';
          let key2 = key + ' (CLOSE)';
          obj[key1] = 0;
          obj[key2] = 0;
        }

        setSdResponseCategories(sd_response_labels);
        setSdResponseCumulativeLineChartDataObj(obj);

        let uniqueSdResponseCumulativeCategoryArr = [];
        const keysArr = Object.keys(obj).slice(1);
        for (let key of keysArr) {
          let temp_obj = {
            Name: key,
            Value: true,
          };
          uniqueSdResponseCumulativeCategoryArr.push(temp_obj);
        }
        setUniqueSdResponseCumulativeCategory(
          uniqueSdResponseCumulativeCategoryArr,
        );
      }
    }

    let sdResponseReportData = await props.getSdResponseReportData({
      toDate: sdResponseCumulativeDateRange[0],
      fromDate: sdResponseCumulativeDateRange[1],
    });
    if (
      sdResponseReportData &&
      sdResponseReportData.data &&
      sdResponseReportData.data.rows
    ) {
      let sd_response_data = sdResponseReportData.data.rows
        .sort((a, b) =>
          a.sd_response_date > b.sd_response_date ? 1 : -1,
        )
        .map((o) => {
          return {
            id: o.id,
            label: o.label,
            sd_response_date: new Date(
              o.sd_response_date,
            ).toLocaleDateString(),
            status: o.status,
          };
        });

      let sd_response_cumulative_line_chart_data = [];
      for (
        let d = new Date(sdResponseCumulativeDateRange[0]);
        d <= new Date(sdResponseCumulativeDateRange[1]);
        d = d.addDays(1)
      ) {
        let o = !sdResponseCumulativeLineChartDataObj
          ? { ...obj }
          : { ...sdResponseCumulativeLineChartDataObj };
        o.date = d.toLocaleDateString();
        sd_response_cumulative_line_chart_data.push(o);
      }

      let sd_response_data_index = 0;
      let sd_response_cumulative_line_chart_data_index = 0;
      let total_open = 'total (OPEN)';
      let total_close = 'total (CLOSE)';
      while (
        sd_response_cumulative_line_chart_data_index <
          sd_response_cumulative_line_chart_data.length &&
        sd_response_data_index < sd_response_data.length
      ) {
        let sd_response_data_obj = {
          ...sd_response_data[sd_response_data_index],
        };
        let sd_response_cumulative_line_chart_data_obj = {
          ...sd_response_cumulative_line_chart_data[
            sd_response_cumulative_line_chart_data_index
          ],
        };
        let key1 = sd_response_data_obj.label + ' (OPEN)';
        let key2 = sd_response_data_obj.label + ' (CLOSE)';
        if (
          sd_response_data_obj.sd_response_date ===
          sd_response_cumulative_line_chart_data_obj.date
        ) {
          if (sd_response_data_obj.status === 'OPEN') {
            sd_response_cumulative_line_chart_data_obj[key1] += 1;
            sd_response_cumulative_line_chart_data_obj[
              total_open
            ] += 1;
          } else {
            sd_response_cumulative_line_chart_data_obj[key2] += 1;
            sd_response_cumulative_line_chart_data_obj[
              total_close
            ] += 1;
          }

          sd_response_cumulative_line_chart_data[
            sd_response_cumulative_line_chart_data_index
          ] = sd_response_cumulative_line_chart_data_obj;
          sd_response_data_index += 1;
        } else {
          sd_response_cumulative_line_chart_data_index += 1;
          let date =
            sd_response_cumulative_line_chart_data[
              sd_response_cumulative_line_chart_data_index
            ].date;
          sd_response_cumulative_line_chart_data[
            sd_response_cumulative_line_chart_data_index
          ] = { ...sd_response_cumulative_line_chart_data_obj };
          sd_response_cumulative_line_chart_data[
            sd_response_cumulative_line_chart_data_index
          ].date = date;
        }
      }
      sd_response_cumulative_line_chart_data_index += 1;
      while (
        sd_response_cumulative_line_chart_data_index <
        sd_response_cumulative_line_chart_data.length
      ) {
        let date =
          sd_response_cumulative_line_chart_data[
            sd_response_cumulative_line_chart_data_index
          ].date;
        let objs = {
          ...sd_response_cumulative_line_chart_data[
            sd_response_cumulative_line_chart_data_index - 1
          ],
        };
        objs.date = date;
        sd_response_cumulative_line_chart_data[
          sd_response_cumulative_line_chart_data_index
        ] = { ...objs };
        sd_response_cumulative_line_chart_data_index += 1;
      }
      setSdResponseCumulativeLineChartData(
        sd_response_cumulative_line_chart_data,
      );
      setOriginalSdResponseCumulativeLineChartData(
        sd_response_cumulative_line_chart_data,
      );
    }
  }, [sdResponseCumulativeDateRange]);

  //order type useeffect
  useEffect(() => {
    const fromDate = String(
      Util.convertDataTimeToIST(dateRange).from,
    );
    const toDate = String(Util.convertDataTimeToIST(dateRange).to);

    props
      .getZoneWiseOrders({
        from_date: fromDate,
        to_date: toDate,
      })
      .then((response) => {
        if (response && response.data) {
          let salesData = response.data;
          let uniqueZoneTempArr = ['Total'];
          let uniqueZoneArr = [{ Name: 'Total', Value: true }];
          salesData.forEach((record) => {
            record.creation_date = new Date(
              record.creation_date,
            ).toLocaleDateString();
            record.sum = parseFloat(record.sum.toFixed(2));
            if (uniqueZoneTempArr.indexOf(record.name) == -1) {
              uniqueZoneTempArr.push(record.name);
            }
            const found = uniqueZoneArr.some(
              (el) => el.Name === record.name,
            );
            if (!found)
              uniqueZoneArr.push({ Name: record.name, Value: true });
          });
          setUniqueZones(uniqueZoneArr);
          let obj = {};
          let map = { total: 0 };
          let opacity = {};

          uniqueZoneTempArr.forEach((zone) => (map[zone] = 0));
          uniqueZoneTempArr.forEach((zone) => (opacity[zone] = 1));
          setOpacity(opacity);

          salesData.forEach((record) => {
            if (obj[record.creation_date]) {
              uniqueZoneTempArr.forEach((zone) => {
                if (zone === record.name) {
                  map[zone] += parseFloat(record.sum);
                  map['total'] += parseFloat(record.sum);
                  obj[record.creation_date][zone] = map[zone];
                  obj[record.creation_date]['Total'] = map['total'];
                } else if (!obj[record.creation_date][zone]) {
                  obj[record.creation_date][zone] = map[zone];
                }
              });
            } else {
              obj[record.creation_date] = {
                creation_date: record.creation_date,
              };
              uniqueZoneTempArr.forEach((zone) => {
                if (zone === record.name) {
                  map[zone] += parseFloat(record.sum);
                  map['total'] += parseFloat(record.sum);
                  obj[record.creation_date][zone] = map[zone];
                  obj[record.creation_date]['Total'] = map['total'];
                } else if (!obj[record.creation_date][zone]) {
                  obj[record.creation_date][zone] = map[zone];
                }
              });
            }
          });

          let data = Object.values(obj);
          data.forEach((datum) => {
            for (let key in datum) {
              if (key === 'creation_date') continue;
              datum[key] = parseFloat(datum[key].toFixed(2));
            }
          });

          setChartData(Object.values(obj));
          setOriginalChartData(Object.values(obj));
          getSalesValueZones(Object.values(obj));
        } else {
          message.error('No orders found between selected dates');
        }
      });
  }, [dateRange]);

  // ordertype usefffect 

    useEffect(() => {
        const fromDate = String(
          Util.convertDataTimeToIST(dateRangeOrder).from,
        );
        const toDate = String(Util.convertDataTimeToIST(dateRangeOrder).to);
    
        
    
        props
          .getZoneWiseSalesByOrderType({
            from_date: fromDate,
            to_date: toDate,
            orderType:orderType
          })
          .then((response) => {
            if (response && response.data) {
              let salesDataByOrder = response.data;
              let uniqueZoneTempArrOrder = ['Total'];
              let uniqueZoneArrOrder = [{ Name: 'Total', Value: true }];
              salesDataByOrder.forEach((record) => {
                record.creation_date = new Date(
                  record.creation_date,
                ).toLocaleDateString();
                record.sum = parseFloat(record.sum.toFixed(2));
                if (uniqueZoneTempArrOrder.indexOf(record.name) == -1) {
                  uniqueZoneTempArrOrder.push(record.name);
                }
                const found = uniqueZoneArrOrder.some(
                  (el) => el.Name === record.name,
                );
                if (!found)
                  uniqueZoneArrOrder.push({ Name: record.name, Value: true });
              });
              setUniqueZonesOrder(uniqueZoneArrOrder);
              let obj = {};
              let map = { total: 0 };
              let opacity = {};
    
              uniqueZoneTempArrOrder.forEach((zone) => (map[zone] = 0));
              uniqueZoneTempArrOrder.forEach((zone) => (opacity[zone] = 1));
              setOpacityOrder(opacity);
    
              salesDataByOrder.forEach((record) => {
                if (obj[record.creation_date]) {
                  uniqueZoneTempArrOrder.forEach((zone) => {
                    if (zone === record.name) {
                      map[zone] += parseFloat(record.sum);
                      map['total'] += parseFloat(record.sum);
                      obj[record.creation_date][zone] = map[zone];
                      obj[record.creation_date]['Total'] = map['total'];
                    } else if (!obj[record.creation_date][zone]) {
                      obj[record.creation_date][zone] = map[zone];
                    }
                  });
                } else {
                  obj[record.creation_date] = {
                    creation_date: record.creation_date,
                  };
                  uniqueZoneTempArrOrder.forEach((zone) => {
                    if (zone === record.name) {
                      map[zone] += parseFloat(record.sum);
                      map['total'] += parseFloat(record.sum);
                      obj[record.creation_date][zone] = map[zone];
                      obj[record.creation_date]['Total'] = map['total'];
                    } else if (!obj[record.creation_date][zone]) {
                      obj[record.creation_date][zone] = map[zone];
                    }
                  });
                }
              });
    
              let data = Object.values(obj);
              data.forEach((datum) => {
                for (let key in datum) {
                  if (key === 'creation_date') continue;
                  datum[key] = parseFloat(datum[key].toFixed(2));
                }
              });
    
              setChartDataOrder(Object.values(obj));
              setOriginalChartData1(Object.values(obj));
              getSalesValueZones(Object.values(obj));
            } else {
              message.error('No orders found between selected dates');
            }
          });
      }, [dateRangeOrder,orderType]);

    useEffect(() => {
        const fromDate = String(Util.convertDataTimeToIST(portalIssueDateRange).from);
        const toDate = String(Util.convertDataTimeToIST(portalIssueDateRange).to);

        props.getCategoryWisePortalIssues({
            "from_date": fromDate,
            "to_date": toDate,
        }).then((response) => {
            if (response && response.data) {
                let portalIssuesData = response.data;
                let uniqueCategoryTempArr = ['Total'];
                portalIssuesData.forEach(record => {
                    record.creation_date = new Date(record.creation_date).toLocaleDateString()
                    if (uniqueCategoryTempArr.indexOf(record.category) == -1) {
                        uniqueCategoryTempArr.push(record.category);
                    }
                });
                let obj = {};
                portalIssuesData.forEach(record => {
                    if (obj[record.creation_date]) {
                        uniqueCategoryTempArr.forEach(category => {
                            if (category === record.category) {
                                obj[record.creation_date][category] = record.count;
                                obj[record.creation_date]['Total'] += parseInt(record.count);
                            } else if (!obj[record.creation_date][category]) {
                                obj[record.creation_date][category] = 0;
                            }
                        });
                    } else {
                        obj[record.creation_date] = {
                            creation_date: record.creation_date
                        };
                        uniqueCategoryTempArr.forEach(category => {
                            if (category === record.category) {
                                obj[record.creation_date][category] = record.count;
                                obj[record.creation_date]['Total'] = parseInt(record.count);
                            } else if (!obj[record.creation_date][category]) {
                                obj[record.creation_date][category] = 0;
                            }
                        });
                    }
                });
                setPortalIssuesChartData(Object.values(obj));
            } else {
                message.error("No orders found between selected dates");
            }
        })
    }, [portalIssueDateRange]);

  useEffect(() => {
    const fromDate = String(
      Util.convertDataTimeToIST(portalIssueCumulativeDateRange).from,
    );
    const toDate = String(
      Util.convertDataTimeToIST(portalIssueCumulativeDateRange).to,
    );

    props
      .getCategoryWisePortalIssues({
        from_date: fromDate,
        to_date: toDate,
      })
      .then((response) => {
        if (response && response.data) {
          let portalIssuesData = response.data;
          let uniqueCategoryTempArr = ['Total'];
          portalIssuesData.forEach((record) => {
            record.creation_date = new Date(
              record.creation_date,
            ).toLocaleDateString();
            if (
              uniqueCategoryTempArr.indexOf(record.category) == -1
            ) {
              uniqueCategoryTempArr.push(record.category);
            }
          });

          let obj = {};
          let map = { total: 0 };

          uniqueCategoryTempArr.forEach(
            (category) => (map[category] = 0),
          );

          portalIssuesData.forEach((record) => {
            if (obj[record.creation_date]) {
              uniqueCategoryTempArr.forEach((category) => {
                if (category === record.category) {
                  map[category] += parseInt(record.count);
                  map['total'] += parseInt(record.count);
                  obj[record.creation_date][category] = map[category];
                  obj[record.creation_date]['Total'] = map['total'];
                } else if (!obj[record.creation_date][category]) {
                  obj[record.creation_date][category] = map[category];
                }
              });
            } else {
              obj[record.creation_date] = {
                creation_date: record.creation_date,
              };
              uniqueCategoryTempArr.forEach((category) => {
                if (category === record.category) {
                  map[category] += parseInt(record.count);
                  map['total'] += parseInt(record.count);
                  obj[record.creation_date][category] = map[category];
                  obj[record.creation_date]['Total'] = map['total'];
                } else if (!obj[record.creation_date][category]) {
                  obj[record.creation_date][category] = map[category];
                }
              });
            }
          });

          setPortalIssuesCumulativeChartData(Object.values(obj));
          getIssueCountCumulativeZones(Object.values(obj));
        } else {
          message.error('No orders found between selected dates');
        }
      });
  }, [portalIssueCumulativeDateRange]);

  useEffect(() => {
    async function fetchSessionData() {
      const response = await getActiveSessionReport({
        toDate: new Date(activeSessionDateRange[0]),
        fromDate: new Date(activeSessionDateRange[1]),
      });
      if (response?.data) {
        const max = Math.max(
          ...response.data.map((o) => +o['Login Session']),
        );
        setMaxActiveSession(max);
        setActiveSessionData(response.data);
      } else {
        message.error(
          'No active sessions found between selected dates',
        );
      }
    }
    fetchSessionData();
  }, [activeSessionDateRange]);

    const handleDateChange = (dateArray, type) => {
        let start_date;
        if (type === 'sdr' || type === 'sdr-cumulative' || type === 'sd-response' || type === 'sd-response-cumulative')
            start_date = sdrStartDate;
        else if (type === 'portal-issue' || type === 'portal-issue-cumulative')
            start_date = portalIssueStartDate;
        else
            start_date = startDate;
        let selectedDate = [start_date, currentDate];
        if (dateArray[0]) {
            selectedDate[0] = dateArray[0];  
        }
        if (dateArray[1]) {
            selectedDate[1] = dateArray[1];   
        }
        if (type === 'sales-order-value') {
            setDateRange(selectedDate);
        }
        else if(type === "sales-order-value-by-order-type"){
            setDateRangeOrder(selectedDate);
          }
        else if (type === 'portal-issue') {
            setPortalIssueDateRange(selectedDate);
        } else if (type === 'portal-issue-cumulative') {
            setPortalIssueCumulativeDateRange(selectedDate);
        } else if (type === 'sdr') {
            setSdrDateRange(selectedDate)
        } else if (type === 'sdr-cumulative') {
            setSdrCumulativeDateRange(selectedDate)
        } else if (type === 'sd-response') {
            setSdResponseDateRange(selectedDate)
        } else if (type === 'sd-response-cumulative') {
            setSdResponseCumulativeDateRange(selectedDate)
        } else if (type === 'active-session') {
            setActiveSessionDateRange(selectedDate);
        }
    };

  

  const handleMouseEnter = useCallback(
    (o) => {
      const { dataKey } = o;
      for (let op in opacity) {
        if (op != dataKey) {
          opacity[op] = 0;
        }
      }
      setOpacity({ ...opacity, [dataKey]: 1 });
    },
    [opacity, setOpacity],
  );

  const handleMouseLeave = useCallback(
    (o) => {
      const { dataKey } = o;
      for (let op in opacity) {
        if (op != dataKey) {
          opacity[op] = 1;
        }
      }
      setOpacity({ ...opacity, [dataKey]: 1 });
    },
    [opacity, setOpacity],
  );

    const checkboxEmailHandler = (name, evt, index) => {
        uniqueZones.map((data) => {
            if (data.Name === name) {
                data.Value = evt.target.checked
            }
        })
        setUniqueZones([...uniqueZones]);
        //logic to add/remove series
        let tempChartData = [];
        originalChartData.forEach((record) => {
            let obj = {};
            for (let key in record) {
                if (key == 'creation_date') {
                    obj[key] = record[key];
                }
                uniqueZones.forEach((zone) => {
                    if (key == zone.Name) {
                        if (zone.Value == true) {
                            obj[key] = record[key];
                        }
                    }
                })
            }
            tempChartData.push(obj);
        })
        setChartData(tempChartData);
    }

    
  const checkboxEmailHandler1 = (name, evt, index) => {
    uniqueZonesOrder.map((data) => {
      if (data.Name === name) {
        data.Value = evt.target.checked;
      }
    });
    setUniqueZonesOrder([...uniqueZonesOrder]);
    //logic to add/remove series
    let tempChartData = [];
    originalChartData1.forEach((record) => {
      let obj = {};
      for (let key in record) {
        if (key == 'creation_date') {
          obj[key] = record[key];
        }
        uniqueZonesOrder.forEach((zone) => {
          if (key == zone.Name) {
            if (zone.Value == true) {
              obj[key] = record[key];
            }
          }
        });
      }
      tempChartData.push(obj);
    });
    setChartDataOrder(tempChartData);
  };

  const sdrFilterHandler = (name, evt, index) => {
    uniqueSdrCategory.map((data) => {
      if (data.Name === name) {
        data.Value = evt.target.checked;
      }
    });
    setUniqueSdrCategory([...uniqueSdrCategory]);

    //logic to add/remove series
    let tempChartData = [];
    originalSdrLineChartData.forEach((record) => {
      let obj = {};
      for (let key in record) {
        if (key == 'date') {
          obj[key] = record[key];
        }
        uniqueSdrCategory.forEach((category) => {
          if (key == category.Name) {
            if (category.Value == true) {
              obj[key] = record[key];
            }
          }
        });
      }
      tempChartData.push(obj);
    });
    setSdrLineChartData(tempChartData);
  };

  const sdrCumulativeFilterHandler = (name, evt, index) => {
    uniqueSdrCumulativeCategory.map((data) => {
      if (data.Name === name) {
        data.Value = evt.target.checked;
      }
    });
    setUniqueSdrCumulativeCategory([...uniqueSdrCumulativeCategory]);

    //logic to add/remove series
    let tempChartData = [];
    originalSdrCumulativeLineChartData.forEach((record) => {
      let obj = {};
      for (let key in record) {
        if (key == 'date') {
          obj[key] = record[key];
        }
        uniqueSdrCumulativeCategory.forEach((category) => {
          if (key == category.Name) {
            if (category.Value == true) {
              obj[key] = record[key];
            }
          }
        });
      }
      tempChartData.push(obj);
    });
    setSdrCumulativeLineChartData(tempChartData);
  };

  const sdResponseFilterHandler = (name, evt, index) => {
    uniqueSdResponseCategory.map((data) => {
      if (data.Name === name) {
        data.Value = evt.target.checked;
      }
    });
    setUniqueSdResponseCategory([...uniqueSdResponseCategory]);

    //logic to add/remove series
    let tempChartData = [];
    originalSdResponseLineChartData.forEach((record) => {
      let obj = {};
      for (let key in record) {
        if (key == 'date') {
          obj[key] = record[key];
        }
        uniqueSdResponseCategory.forEach((category) => {
          if (key == category.Name) {
            if (category.Value == true) {
              obj[key] = record[key];
            }
          }
        });
      }
      tempChartData.push(obj);
    });
    setSdResponseLineChartData(tempChartData);
  };

  const sdResponseCumulativeFilterHandler = (name, evt, index) => {
    uniqueSdResponseCumulativeCategory.map((data) => {
      if (data.Name === name) {
        data.Value = evt.target.checked;
      }
    });
    setUniqueSdResponseCumulativeCategory([
      ...uniqueSdResponseCumulativeCategory,
    ]);

    //logic to add/remove series
    let tempChartData = [];
    originalSdResponseCumulativeLineChartData.forEach((record) => {
      let obj = {};
      for (let key in record) {
        if (key == 'date') {
          obj[key] = record[key];
        }
        uniqueSdResponseCumulativeCategory.forEach((category) => {
          if (key == category.Name) {
            if (category.Value == true) {
              obj[key] = record[key];
            }
          }
        });
      }
      tempChartData.push(obj);
    });
    setSdResponseCumulativeLineChartData(tempChartData);
  };

  useEffect(() => {
    if (!sso_user_details || !Object.keys(sso_user_details).length) {
      const adminAccessDetails = Auth.getAdminAccessDetails();
      let sso_detail = {};
      if (
        adminAccessDetails &&
        Object.keys(JSON.parse(adminAccessDetails)).length > 0
      ) {
        sso_detail = JSON.parse(adminAccessDetails);
      }
      const emailId =
        sso_detail &&
        sso_detail.username &&
        sso_detail.username.replace(
          process.env.REACT_APP_COGNITO_IDP_NAME,
          '',
        );
      emailId && getSSODetails(emailId, props.history);
    }
  }, [sso_user_details]);

  useEffect(() => {
    if (ssoRole && !hasViewPermission(pages.REPORTS)) {
      browserHistory.push('/admin/dashboard');
    }
  }, [ssoRole || adminRole]);

    //filter dropdown
    const [isFilterSalesOrderVisible, setIsFilterSalesOrderVisible] = useState(false);
    const showFilterSalesOrder = () => {
        setIsFilterSalesOrderVisible(!isFilterSalesOrderVisible);
    };

     //filter sales order dropdown 
    const [isFilterSalesOrderVisibleByOrder, setIsFilterSalesOrderVisibleByOrder] = useState(false);
    const showFilterSalesOrderByOrder = () => {
           setIsFilterSalesOrderVisibleByOrder(!isFilterSalesOrderVisibleByOrder);
    };

  //filter dropdown
  const [isFilterSdrVisible, setIsFilterSdrVisible] = useState(false);
  const showFilterSdr = () => {
    setIsFilterSdrVisible(!isFilterSdrVisible);
  };

  //filter dropdown
  const [
    isFilterSdrCumulativeVisible,
    setIsFilterSdrCumulativeVisible,
  ] = useState(false);
  const showFilterSdrCumulative = () => {
    setIsFilterSdrCumulativeVisible(!isFilterSdrCumulativeVisible);
  };

  //filter dropdown
  const [isFilterSdResponseVisible, setIsFilterSdResponseVisible] =
    useState(false);
  const showFilterSdResponse = () => {
    setIsFilterSdResponseVisible(!isFilterSdResponseVisible);
  };

  //filter dropdown
  const [
    isFilterSdResponseCumulativeVisible,
    setIsFilterSdResponseCumulativeVisible,
  ] = useState(false);
  const showFilterSdResponseCumulative = () => {
    setIsFilterSdResponseCumulativeVisible(
      !isFilterSdResponseCumulativeVisible,
    );
  };


  return (
    <>
      <div className="log-wrapper">
        {/* sales order  report */}

        {hasViewPermission(
          pages.REPORTS,
          features.VIEW_SALES_ORDER_VALUE_REPORT,
        ) && (
          <div className="detail-log">
            <div className="header-container">
              <div className="card-row-col">
                <h1>Sales Order Value Report </h1>
              </div>
              <div className="session-date-picker">
                <Space direction="vertical" size={12}>
                  <RangePicker
                    defaultValue={[
                      moment().startOf('month'),
                      moment(),
                    ]}
                    // showTime={{ format: 'HH:mm' }}
                    format="YYYY-MM-DD"
                    onChange={(value, ds) =>
                      handleDateChange(ds, 'sales-order-value')
                    }
                    style={{ fontWeight: '600' }}
                    disabledDate={(current) => moment() < current}
                  />
                </Space>
                <div className="filter-container">
                  <Button
                    title={
                      isFilterSalesOrderVisible
                        ? 'Close Filter'
                        : 'Apply Zone Filter'
                    }
                    icon={
                      isFilterSalesOrderVisible ? (
                        <CloseOutlined />
                      ) : (
                        <FilterOutlined />
                      )
                    }
                    onClick={showFilterSalesOrder}
                  ></Button>
                  <div
                    className={
                      'ddl-chart-filter' +
                      ' ' +
                      (isFilterSalesOrderVisible
                        ? 'show-data'
                        : 'hide-data')
                    }
                  >
                    {uniqueZones &&
                      uniqueZones.length > 0 &&
                      uniqueZones.map((zone, i) => {
                        return (
                          <div key={i} className="filter-li">
                            <label htmlFor={`enable_login-${i}`}>
                              <input
                                id={`enable_login-${i}`}
                                type="checkbox"
                                checked={zone.Value}
                                onChange={(e) =>
                                  checkboxEmailHandler(
                                    zone.Name,
                                    e,
                                    i,
                                  )
                                }
                              />
                              <span className="checkmark-box">
                                {zone.Name}
                              </span>
                            </label>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>

            <div className="session-log-table">
              <div
                className="card mb-3"
                style={{ marginLeft: '10px' }}
              >
                <div
                  className="card-header mb-3"
                  style={{ fontWeight: '600', fontSize: 18 }}
                >
                  Sales Order Value (INR in lakhs)
                </div>
                <div className="card-body">
                  <div className="chart-container">
                    <ResponsiveContainer width={'99%'} height={300}>
                      <LineChart
                        width={800}
                        height={300}
                        data={chartData}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 5,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          horizontal={false}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="creation_date"
                          fontWeight={600}
                        />

                                                <YAxis yAxisId="left"
                                                    type="number"
                                                    domain={[min, max]}
                                                    allowDecimals={false}
                                                    fontWeight={600}
                                                    label={{ value: 'Zones: ' + salesValueZones, angle: -90, position: 'insideBottomLeft', style: { 'font-size': '13px', 'font-weight': '600' } }} />
                                                <YAxis yAxisId="right"
                                                    orientation="right"
                                                    type="number"
                                                    domain={[min, max]}
                                                    allowDecimals={false}
                                                    fontWeight={'bold'}
                                                    label={{ value: 'Total', angle: 90, position: 'insideRight', style: { 'font-size': '13px', 'font-weight': '600' } }} />
                                                <Tooltip />
                                                <Legend onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} />
                                                {chartData.length > 0 && getLineChart(chartData)}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                 {hasViewPermission(
               pages.REPORTS,
               features.VIEW_SALES_ORDER_VALUE_REPORT,
                  ) && (
                 <div className="detail-log">
            <div className="header-container">
              <div className="card-row-col">
                <h1>Sales Order Value Report by Order type</h1>
              </div>
              <Select
                defaultValue={orderListType[0]}
                value={orderType}
                onChange={handleOrderTypeChange}
                placeholder="Select Order Type"
                options={orderListType}
                />
              <div className="session-date-picker">
             
                <Space direction="vertical" size={12}>
                  <RangePicker
                    defaultValue={[
                      moment().startOf('month'),
                      moment(),
                    ]}
                    // showTime={{ format: 'HH:mm' }}
                    format="YYYY-MM-DD"
                    onChange={(value, ds) =>
                      handleDateChange(ds, 'sales-order-value-by-order-type')
                    }
                    style={{ fontWeight: '600' }}
                    disabledDate={(current) => moment() < current}
                  />
                </Space>
                <div className="filter-container">
                  <Button
                    title={
                      isFilterSalesOrderVisibleByOrder
                        ? 'Close Filter'
                        : 'Apply Zone Filter'
                    }
                    icon={
                      isFilterSalesOrderVisibleByOrder ? (
                        <CloseOutlined />
                      ) : (
                        <FilterOutlined />
                      )
                    }
                    onClick={showFilterSalesOrderByOrder}
                  ></Button>
                  <div
                    className={
                      'ddl-chart-filter' +
                      ' ' +
                      (isFilterSalesOrderVisibleByOrder
                        ? 'show-data'
                        : 'hide-data')
                    }
                  >
                    {uniqueZonesOrder &&
                      uniqueZonesOrder.length > 0 &&
                      uniqueZonesOrder.map((zone, i) => {
                        return (
                          <div key={i} className="filter-li">
                            <label htmlFor={`enable_login-${i}`}>
                              <input
                                id={`enable_login-${i}`}
                                type="checkbox"
                                checked={zone.Value}
                                onChange={(e) =>
                                  checkboxEmailHandler1(
                                    zone.Name,
                                    e,
                                    i,
                                  )
                                }
                              />
                              <span className="checkmark-box">
                                {zone.Name}
                              </span>
                            </label>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
             
              
            </div>

            <div className="session-log-table">
              <div
                className="card mb-3"
                style={{ marginLeft: '10px' }}
              >
                <div
                  className="card-header mb-3"
                  style={{ fontWeight: '600', fontSize: 18 }}
                >
                  Sales Order Value By Order Type(INR in lakhs)
                </div>
                <div className="card-body">
                  <div className="chart-container">
                    <ResponsiveContainer width={'99%'} height={300}>
                      <LineChart
                        width={800}
                        height={300}
                        data={chartDataOrder}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 5,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          horizontal={false}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="creation_date"
                          fontWeight={600}
                        />

                        <YAxis
                          yAxisId="left"
                          type="number"
                          domain={[min, max]}
                          allowDecimals={false}
                          fontWeight={600}
                          label={{
                            value: 'Zones: ' + salesValueZones,
                            angle: -90,
                            position: 'insideBottomLeft',
                            style: {
                              'font-size': '13px',
                              'font-weight': '600',
                            },
                          }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          type="number"
                          domain={[min, max]}
                          allowDecimals={false}
                          fontWeight={'bold'}
                          label={{
                            value: 'Total',
                            angle: 90,
                            position: 'insideRight',
                            style: {
                              'font-size': '13px',
                              'font-weight': '600',
                            },
                          }}
                        />
                        <Tooltip />
                        <Legend
                          onMouseEnter={handleMouseEnter}
                          onMouseLeave={handleMouseLeave}
                        />
                        {chartDataOrder.length > 0 &&
                          getLineChart(chartDataOrder)}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
                </div>
                  )}

                {hasViewPermission(pages.REPORTS, features.VIEW_PORTAL_ISSUES_REPORT) &&
                    <>
                        <div className="detail-log">
                            <div className="header-container">
                                <div className="card-row-col">
                                    <h1>Portal Issues Report</h1>
                                </div>
                                <div className="session-date-picker">
                                    <Space direction="vertical" size={12}>
                                        <RangePicker
                                            defaultValue={[moment().startOf('month'), moment()]}
                                            // showTime={{ format: 'HH:mm' }}
                                            format="YYYY-MM-DD"
                                            onChange={(value, ds) => handleDateChange(ds, 'portal-issue')}
                                            disabledDate={(current) => moment('01-JUN-2022') > current || moment() < current}
                                            style={{ fontWeight: '600' }}
                                        />
                                    </Space>
                                </div>
                            </div>

              <div className="session-log-table">
                <div
                  className="card mb-3"
                  style={{ marginLeft: '10px' }}
                >
                  <div
                    className="card-header mb-3"
                    style={{ fontWeight: '600', fontSize: 18 }}
                  >
                    Portal Issues (Count)
                  </div>
                  <div className="card-body">
                    <div className="chart-container">
                      <ResponsiveContainer width={'99%'} height={300}>
                        <LineChart
                          width={800}
                          height={300}
                          data={portalIssuesChartData}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 5,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                            vertical={false}
                          />
                          <XAxis
                            dataKey="creation_date"
                            fontWeight={600}
                          />
                          <YAxis
                            type="number"
                            domain={[min, max]}
                            allowDecimals={false}
                            fontWeight={600}
                            //label={{ value: 'Issue Count', angle: -90, position: 'center', style: { 'font-size': '13px', 'font-weight': '600' } }}
                          />
                          <Tooltip />
                          <Legend />
                          {getIssueCountLineChart(
                            portalIssuesChartData,
                          )}
                          {portalIssuesChartData.length > 0 &&
                            getIssueCountLineChart(
                              portalIssuesChartData,
                            )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
                  </div>

            <div className="detail-log">
              <div className="header-container">
                <div className="card-row-col">
                  <h1>Portal Issues Cumulative Report</h1>
                </div>
                <div className="session-date-picker">
                  <Space direction="vertical" size={12}>
                    <RangePicker
                      defaultValue={[
                        moment().startOf('month'),
                        moment(),
                      ]}
                      // showTime={{ format: 'HH:mm' }}
                      format="YYYY-MM-DD"
                      onChange={(value, ds) =>
                        handleDateChange(
                          ds,
                          'portal-issue-cumulative',
                        )
                      }
                      disabledDate={(current) =>
                        moment('01-JUN-2022') > current ||
                        moment() < current
                      }
                      style={{ fontWeight: '600' }}
                    />
                  </Space>
                </div>
              </div>

              <div className="session-log-table">
                <div
                  className="card mb-3"
                  style={{ marginLeft: '10px' }}
                >
                  <div
                    className="card-header mb-3"
                    style={{ fontWeight: '600', fontSize: 18 }}
                  >
                    Portal Issues (Cumulative count)
                  </div>
                  <div className="card-body">
                    <div className="chart-container">
                      {
                        <ResponsiveContainer
                          width={'99%'}
                          height={300}
                        >
                          <LineChart
                            width={800}
                            height={300}
                            data={portalIssuesCumulativeChartData}
                            margin={{
                              top: 5,
                              right: 30,
                              left: 5,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              horizontal={false}
                              vertical={false}
                            />
                            <XAxis
                              dataKey="creation_date"
                              fontWeight={600}
                            />
                            <YAxis
                              yAxisId="left"
                              type="number"
                              domain={[min, max]}
                              allowDecimals={false}
                              fontWeight={600}
                              //label={{ value: 'Zones: ' + issueCumulativeCountZones, angle: -90, position: 'center' }}
                              label={{
                                value: 'Rest of the categories',
                                angle: -90,
                                position: 'insideBottomLeft',
                                style: {
                                  'font-size': '13px',
                                  'font-weight': '600',
                                },
                              }}
                            />
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              type="number"
                              domain={[min, max]}
                              allowDecimals={false}
                              fontWeight={600}
                              label={{
                                value: 'Total',
                                angle: 90,
                                position: 'insideRight',
                                style: {
                                  'font-size': '13px',
                                  'font-weight': '600',
                                },
                              }}
                            />
                            <Tooltip />
                            <Legend />
                            {portalIssuesCumulativeChartData.length >
                              0 &&
                              getIssueCumulativeCountLineChart(
                                portalIssuesCumulativeChartData,
                              )}
                          </LineChart>
                        </ResponsiveContainer>
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        }

        <div className="detail-log">
          <div className="header-container">
            <div className="card-row-col">
              <h1>Service Delivery Requests Report</h1>
            </div>
            <div className="session-date-picker">
              <Space direction="vertical" size={12}>
                <RangePicker
                  defaultValue={[moment().startOf('month'), moment()]}
                  // showTime={{ format: 'HH:mm' }}
                  format="YYYY-MM-DD"
                  onChange={(value, ds) =>
                    handleDateChange(ds, 'sdr')
                  }
                  disabledDate={(current) =>
                    moment('01-JUN-2022') > current ||
                    moment() < current
                  }
                  style={{ fontWeight: '600' }}
                />
              </Space>
              <div className="filter-container">
                <Button
                  title={
                    isFilterSdrVisible
                      ? 'Close Filter'
                      : 'Apply Sdr Category Filter'
                  }
                  icon={
                    isFilterSdrVisible ? (
                      <CloseOutlined />
                    ) : (
                      <FilterOutlined />
                    )
                  }
                  onClick={showFilterSdr}
                ></Button>
                <div
                  className={
                    'ddl-chart-filter' +
                    ' ' +
                    (isFilterSdrVisible ? 'show-data' : 'hide-data')
                  }
                >
                  {uniqueSdrCategory &&
                    uniqueSdrCategory.length > 0 &&
                    uniqueSdrCategory.map((category, i) => {
                      return (
                        <div key={i} className="filter-li">
                          <label htmlFor={`enable_login-${i}`}>
                            <input
                              id={`enable_login-${i}`}
                              type="checkbox"
                              checked={category.Value}
                              onChange={(e) =>
                                sdrFilterHandler(category.Name, e, i)
                              }
                            />
                            <span className="checkmark-box">
                              {category.Name}
                            </span>
                          </label>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>

          <div className="session-log-table">
            <div className="card mb-3" style={{ marginLeft: '10px' }}>
              <div
                className="card-header mb-3"
                style={{ fontWeight: '600', fontSize: 18 }}
              >
                Service Delivery Requests (Count)
              </div>
              <div className="card-body">
                <div className="chart-container">
                  <ResponsiveContainer width={'99%'} height={400}>
                    <LineChart
                      width={900}
                      height={300}
                      data={sdrLineChartData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 5,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={true}
                        vertical={true}
                      />
                      <XAxis dataKey="date" fontWeight={600} />
                      <YAxis
                        yAxisId="left"
                        allowDecimals={false}
                        fontWeight={600}
                        label={{
                          value: 'Open SD Request Count',
                          angle: -90,
                          position: 'insideBottomLeft',
                          style: {
                            'font-size': '15px',
                            'font-weight': '600',
                          },
                        }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        allowDecimals={false}
                        fontWeight={'bold'}
                        label={{
                          value: 'Close SD Request Count',
                          angle: 90,
                          position: 'insideBottomRight',
                          style: {
                            'font-size': '15px',
                            'font-weight': '600',
                          },
                        }}
                      />

                      <Tooltip />
                      <Legend />

                      {sdrLineChartData.length > 0 &&
                        getSdrCountLineChart(sdrLineChartData)}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="detail-log">
          <div className="header-container">
            <div className="card-row-col">
              <h1>Service Delivery Requests Cumulative Report</h1>
            </div>
            <div className="session-date-picker">
              <Space direction="vertical" size={12}>
                <RangePicker
                  defaultValue={[moment().startOf('month'), moment()]}
                  // showTime={{ format: 'HH:mm' }}
                  format="YYYY-MM-DD"
                  onChange={(value, ds) =>
                    handleDateChange(ds, 'sdr-cumulative')
                  }
                  disabledDate={(current) =>
                    moment('01-JUN-2022') > current ||
                    moment() < current
                  }
                  style={{ fontWeight: '600' }}
                />
              </Space>
              <div className="filter-container">
                <Button
                  title={
                    isFilterSdrCumulativeVisible
                      ? 'Close Filter'
                      : 'Apply Sdr Cumulative Category Filter'
                  }
                  icon={
                    isFilterSdrCumulativeVisible ? (
                      <CloseOutlined />
                    ) : (
                      <FilterOutlined />
                    )
                  }
                  onClick={showFilterSdrCumulative}
                ></Button>
                <div
                  className={
                    'ddl-chart-filter' +
                    ' ' +
                    (isFilterSdrCumulativeVisible
                      ? 'show-data'
                      : 'hide-data')
                  }
                >
                  {uniqueSdrCumulativeCategory &&
                    uniqueSdrCumulativeCategory.length > 0 &&
                    uniqueSdrCumulativeCategory.map((category, i) => {
                      return (
                        <div key={i} className="filter-li">
                          <label htmlFor={`enable_login-${i}`}>
                            <input
                              id={`enable_login-${i}`}
                              type="checkbox"
                              checked={category.Value}
                              onChange={(e) =>
                                sdrCumulativeFilterHandler(
                                  category.Name,
                                  e,
                                  i,
                                )
                              }
                            />
                            <span className="checkmark-box">
                              {category.Name}
                            </span>
                          </label>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>

          <div className="session-log-table">
            <div className="card mb-3" style={{ marginLeft: '10px' }}>
              <div
                className="card-header mb-3"
                style={{ fontWeight: '600', fontSize: 18 }}
              >
                Service Delivery Requests (Cumulative Count)
              </div>
              <div className="card-body">
                <div className="chart-container">
                  <ResponsiveContainer width={'99%'} height={400}>
                    <LineChart
                      width={800}
                      height={300}
                      data={sdrCumulativeLineChartData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 5,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={true}
                        vertical={true}
                      />
                      <XAxis dataKey="date" fontWeight={600} />
                      <YAxis
                        yAxisId="left"
                        allowDecimals={false}
                        fontWeight={600}
                        label={{
                          value: 'Open SD Request Cumulative Count',
                          angle: -90,
                          position: 'insideBottomLeft',
                          style: {
                            'font-size': '15px',
                            'font-weight': '600',
                          },
                        }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        allowDecimals={false}
                        fontWeight={'bold'}
                        label={{
                          value: 'Close SD Request Cumulative Count',
                          angle: 90,
                          position: 'insideBottomRight',
                          style: {
                            'font-size': '15px',
                            'font-weight': '600',
                          },
                        }}
                      />

                      <Tooltip />
                      <Legend />

                      {sdrCumulativeLineChartData.length > 0 &&
                        getSdrCountLineChart(
                          sdrCumulativeLineChartData,
                        )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="detail-log">
          <div className="header-container">
            <div className="card-row-col">
              <h1>Service Delivery Response Report</h1>
            </div>
            <div className="session-date-picker">
              <Space direction="vertical" size={12}>
                <RangePicker
                  defaultValue={[moment().startOf('month'), moment()]}
                  // showTime={{ format: 'HH:mm' }}
                  format="YYYY-MM-DD"
                  onChange={(value, ds) =>
                    handleDateChange(ds, 'sd-response')
                  }
                  disabledDate={(current) =>
                    moment('01-JUN-2022') > current ||
                    moment() < current
                  }
                  style={{ fontWeight: '600' }}
                />
              </Space>
              <div className="filter-container">
                <Button
                  title={
                    isFilterSdResponseVisible
                      ? 'Close Filter'
                      : 'Apply Sd Response Category Filter'
                  }
                  icon={
                    isFilterSdResponseVisible ? (
                      <CloseOutlined />
                    ) : (
                      <FilterOutlined />
                    )
                  }
                  onClick={showFilterSdResponse}
                ></Button>
                <div
                  className={
                    'ddl-chart-filter' +
                    ' ' +
                    (isFilterSdResponseVisible
                      ? 'show-data'
                      : 'hide-data')
                  }
                >
                  {uniqueSdResponseCategory &&
                    uniqueSdResponseCategory.length > 0 &&
                    uniqueSdResponseCategory.map((category, i) => {
                      return (
                        <div key={i} className="filter-li">
                          <label htmlFor={`enable_login-${i}`}>
                            <input
                              id={`enable_login-${i}`}
                              type="checkbox"
                              checked={category.Value}
                              onChange={(e) =>
                                sdResponseFilterHandler(
                                  category.Name,
                                  e,
                                  i,
                                )
                              }
                            />
                            <span className="checkmark-box">
                              {category.Name}
                            </span>
                          </label>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>

          <div className="session-log-table">
            <div className="card mb-3" style={{ marginLeft: '10px' }}>
              <div
                className="card-header mb-3"
                style={{ fontWeight: '600', fontSize: 18 }}
              >
                Service Delivery Responses (Count)
              </div>
              <div className="card-body">
                <div className="chart-container">
                  <ResponsiveContainer width={'99%'} height={400}>
                    <LineChart
                      width={900}
                      height={300}
                      data={sdResponseLineChartData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 5,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={true}
                        vertical={true}
                      />
                      <XAxis dataKey="date" fontWeight={600} />
                      <YAxis
                        yAxisId="left"
                        allowDecimals={false}
                        fontWeight={600}
                        label={{
                          value: 'Open SD Responses Count',
                          angle: -90,
                          position: 'insideBottomLeft',
                          style: {
                            'font-size': '15px',
                            'font-weight': '600',
                          },
                        }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        allowDecimals={false}
                        fontWeight={'bold'}
                        label={{
                          value: 'Close SD Responses Count',
                          angle: 90,
                          position: 'insideBottomRight',
                          style: {
                            'font-size': '15px',
                            'font-weight': '600',
                          },
                        }}
                      />

                      <Tooltip />
                      <Legend />

                      {sdResponseLineChartData.length > 0 &&
                        getSdrCountLineChart(sdResponseLineChartData)}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="detail-log">
          <div className="header-container">
            <div className="card-row-col">
              <h1>Service Delivery Responses Cumulative Report</h1>
            </div>
            <div className="session-date-picker">
              <Space direction="vertical" size={12}>
                <RangePicker
                  defaultValue={[moment().startOf('month'), moment()]}
                  // showTime={{ format: 'HH:mm' }}
                  format="YYYY-MM-DD"
                  onChange={(value, ds) =>
                    handleDateChange(ds, 'sd-response-cumulative')
                  }
                  disabledDate={(current) =>
                    moment('01-JUN-2022') > current ||
                    moment() < current
                  }
                  style={{ fontWeight: '600' }}
                />
              </Space>
              <div className="filter-container">
                <Button
                  title={
                    isFilterSdResponseCumulativeVisible
                      ? 'Close Filter'
                      : 'Apply Sdr Cumulative Category Filter'
                  }
                  icon={
                    isFilterSdResponseCumulativeVisible ? (
                      <CloseOutlined />
                    ) : (
                      <FilterOutlined />
                    )
                  }
                  onClick={showFilterSdResponseCumulative}
                ></Button>
                <div
                  className={
                    'ddl-chart-filter' +
                    ' ' +
                    (isFilterSdResponseCumulativeVisible
                      ? 'show-data'
                      : 'hide-data')
                  }
                >
                  {uniqueSdResponseCumulativeCategory &&
                    uniqueSdResponseCumulativeCategory.length > 0 &&
                    uniqueSdResponseCumulativeCategory.map(
                      (category, i) => {
                        return (
                          <div key={i} className="filter-li">
                            <label htmlFor={`enable_login-${i}`}>
                              <input
                                id={`enable_login-${i}`}
                                type="checkbox"
                                checked={category.Value}
                                onChange={(e) =>
                                  sdResponseCumulativeFilterHandler(
                                    category.Name,
                                    e,
                                    i,
                                  )
                                }
                              />
                              <span className="checkmark-box">
                                {category.Name}
                              </span>
                            </label>
                          </div>
                        );
                      },
                    )}
                </div>
              </div>
            </div>
          </div>

          <div className="session-log-table">
            <div className="card mb-3" style={{ marginLeft: '10px' }}>
              <div
                className="card-header mb-3"
                style={{ fontWeight: '600', fontSize: 18 }}
              >
                Service Delivery Responses (Cumulative Count)
              </div>
              <div className="card-body">
                <div className="chart-container">
                  <ResponsiveContainer width={'99%'} height={400}>
                    <LineChart
                      width={800}
                      height={300}
                      data={sdResponseCumulativeLineChartData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 5,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={true}
                        vertical={true}
                      />
                      <XAxis dataKey="date" fontWeight={600} />
                      <YAxis
                        yAxisId="left"
                        allowDecimals={false}
                        fontWeight={600}
                        label={{
                          value: 'Open SD Responses Cumulative Count',
                          angle: -90,
                          position: 'insideBottomLeft',
                          style: {
                            'font-size': '15px',
                            'font-weight': '600',
                          },
                        }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        allowDecimals={false}
                        fontWeight={'bold'}
                        label={{
                          value:
                            'Close SD Responses Cumulative Count',
                          angle: 90,
                          position: 'insideBottomRight',
                          style: {
                            'font-size': '15px',
                            'font-weight': '600',
                          },
                        }}
                      />

                      <Tooltip />
                      <Legend />

                      {sdResponseCumulativeLineChartData.length > 0 &&
                        getSdrCountLineChart(
                          sdResponseCumulativeLineChartData,
                        )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Session Report */}
        <div className="detail-log">
          <div className="header-container">
            <div className="card-row-col">
              <h1>Login Session Report</h1>
            </div>
            <div className="session-date-picker">
              <Space direction="vertical" size={12}>
                <RangePicker
                  defaultValue={[moment().startOf('month'), moment()]}
                  showTime={{ format: 'HH:mm' }}
                  format="YYYY-MM-DD HH:mm"
                  onChange={(value, ds) =>
                    handleDateChange(ds, 'active-session')
                  }
                  style={{ fontWeight: '600' }}
                />
              </Space>
            </div>
          </div>
          <div className="session-log-table">
            <div className="card mb-3" style={{ marginLeft: '10px' }}>
              <div
                className="card-header mb-3"
                style={{ fontWeight: '600', fontSize: 18 }}
              >
                Sessions Activity
              </div>
              <div className="card-body">
                <div className="chart-container">
                  <ResponsiveContainer width={'99%'} height={400}>
                    <LineChart
                      width={800}
                      height={300}
                      data={activeSessionData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 5,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={true}
                        vertical={true}
                      />
                      <XAxis dataKey="date_time" fontWeight={600} />
                      <YAxis
                        allowDecimals={false}
                        fontWeight={600}
                        domain={[min, maxActiveSession]}
                        label={{
                          value: 'Sessions Count',
                          angle: -90,
                          position: 'insideBottomLeft',
                          style: {
                            'font-size': '15px',
                            'font-weight': '600',
                          },
                        }}
                      />
                      <Tooltip />
                      <Legend />
                      {activeSessionData.length > 0 &&
                        getActiveSessionLineChart(activeSessionData)}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    sso_user_details: state.admin.get('sso_user_details'),
  };
};

const mapDispatchToProps = (dispatch) => {
    return {
        getZoneWiseOrders: (data) => dispatch(Action.getZoneWiseOrders(data)),
        getZoneWiseSalesByOrderType: (data) =>
            dispatch(Action.getZoneWiseOrdersByOrderType(data)),
        getCategoryWisePortalIssues: (data) => dispatch(Action.getCategoryWisePortalIssues(data)),
        getSSODetails: (emailId, history) => dispatch(Action.getSSODetails(emailId, history)),
        getSdrReportData: (data) => dispatch(Action.getSdrReportData(data)),
        getSdResponseReportData: (data) => dispatch(Action.getSdResponseReportData(data)),
        fetchServiceLevelCategory: (type) => dispatch(DBAction.fetchServiceLevelCategory(type)),
        getActiveSessionReport: (data) => dispatch(Action.getActiveSessionReport(data))
    }
}

const ConnectReport = connect(
  mapStateToProps,
  mapDispatchToProps,
)(Report);

export default ConnectReport;