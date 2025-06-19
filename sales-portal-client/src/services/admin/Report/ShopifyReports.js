import React, { useEffect, useState, useCallback } from 'react';
import { connect } from 'react-redux';
import { DatePicker, Space, message, Button } from 'antd';
import moment from 'moment';
import '../Report/Report.css';
import * as Action from '../actions/adminAction';
import Auth from '../../../util/middleware/auth';
import Util from '../../../util/helper';
import _, { set } from "lodash"; // cool kids know _ is low-dash
import { pages, hasViewPermission } from '../../../persona/distributorHeader'
import Loader from '../../../components/Loader';


const { RangePicker } = DatePicker;
let currentDate = new Date();
currentDate = String(moment(currentDate).format("YYYY-MM-DD"));
let previousDate = String(moment().subtract(1, 'days').format("YYYY-MM-DD"));

let ShopifyReport = props => {
    const browserHistory = props.history;
    const [isLoadingDownload, setIsLoadingDownload] = useState(false);
    const [shopifyReportDateRange, setshopifyReportDateRange] = useState([previousDate, currentDate]);
    const [ztableDateRange, setZtableDateRange]= useState([previousDate, currentDate]);
    const {downloadShopifyReports, sso_user_details, getSSODetails, exportZtables } = props;
    const ssoRole = sso_user_details.data && sso_user_details.data.length && sso_user_details.data[0].roles;

    let data = {};
    var adminRole = Auth.getAdminRole();

    Date.prototype.addDays = function (days) {
        var date = new Date(this.valueOf());
        date.setDate(date.getDate() + days);
        return date;
    }
 
    const handleDateChange = (dateArray, type) => {
       let selectedDate = [previousDate, currentDate];
        if (dateArray[0]) {
            selectedDate[0] = dateArray[0];
        }
        if (dateArray[1]) {
            selectedDate[1] = dateArray[1];
        }
        if(type === 'shopify-report') {
            setshopifyReportDateRange(selectedDate);
        }
        if(type === 'z-table-export'){
            setZtableDateRange(selectedDate);
        }
    };

    useEffect(() => {
        if (!sso_user_details || !Object.keys(sso_user_details).length) {
            const adminAccessDetails = Auth.getAdminAccessDetails();
            let sso_detail = {};
            if (adminAccessDetails && Object.keys(JSON.parse(adminAccessDetails)).length > 0) {
                sso_detail = JSON.parse(adminAccessDetails);
            }
            const emailId = sso_detail && sso_detail.username && sso_detail.username.replace(process.env.REACT_APP_COGNITO_IDP_NAME, '');
            emailId && getSSODetails(emailId, props.history);
        }
    }, [sso_user_details]);

    useEffect(() => {
        if (ssoRole && !hasViewPermission(pages.SHOPIFY_REPORTS)) {
            browserHistory.push("/admin/shopify-dashboard");
        }
    }, [ssoRole || adminRole]);


    const downloadData = async (loaderOff) => {
        data =
        { 
            from_date : shopifyReportDateRange[0] || previousDate,
            to_date : shopifyReportDateRange[1] || currentDate
        }
        setIsLoadingDownload(true)
        const responseData = await downloadShopifyReports({ data });
        if (!responseData.length) {
          Util.notificationSender('Error', 'No data available for the selected date range.', false)
        }
        else {
          await Util.downloadExcelFile(responseData,"Shopify-Reports " + (data.from_date+ ' to ' +data.to_date));
          Util.notificationSender('Success', 'Report downloaded successfully', true)
        }
        const Timeout = setTimeout(() => {
          setIsLoadingDownload(loaderOff)
        }, 2000);
    
        return (() => {
          clearTimeout(Timeout)
        })
      }

    const exportZData = async (loaderOff) => {
        data =
        { 
            from_date : ztableDateRange[0] || previousDate,
            to_date : ztableDateRange[1] || currentDate
        }
        setIsLoadingDownload(true)
        const responseData = await exportZtables({ data });
        if (!responseData.length) {
          Util.notificationSender('Error', 'No data available for the selected date range.', false)
        }
        else {
          await Util.downloadExcelFile(responseData,"Z-table-reports " + (data.from_date+ ' to ' +data.to_date));
          Util.notificationSender('Success', 'Report downloaded successfully', true)
        }
        const Timeout = setTimeout(() => {
          setIsLoadingDownload(loaderOff)
        }, 2000);
    
        return (() => {
          clearTimeout(Timeout)
        })
      }

    return (
        <>
            <div className="log-wrapper">
                <>
               {hasViewPermission(pages.SHOPIFY_REPORTS) &&
                    <div className="detail-log">
                        <div className="header-container">
                            <div className="card-row-col">
                                <h1>Shopify-Reports</h1>
                            </div>
                          </div>
                        <div className="session-log-table">
                           <Loader>
                           <div className="card mb-3" style={{ marginLeft: '10px' }}>
                                <div className="card-body">
                                    <table  style={{ width: '100%' }}>
                                        <tbody>
                                         <tr>
                                                <td>
                                                    <h2>Shopify Portal Reports</h2>
                                                    <div className="session-date-picker">
                                                        <Space direction="vertical" size={12}>
                                                            <RangePicker
                                                                defaultValue={[moment().subtract(1, 'days'), moment()]}
                                                                format="YYYY-MM-DD"
                                                                onChange={(value, ds) => handleDateChange(ds, 'shopify-report')}
                                                                style={{ fontWeight: '600' }}
                                                                disabledDate={(current) => {
                                                                    const oneMonthAgo = moment().subtract(1, 'month');
                                                                    const today = moment().endOf('day');
                                                                    return current && (current < oneMonthAgo || current > today);
                                                                }}
                                                            />
                                                        </Space>
                                                        
                                                    </div>
                                                    <div className="mt-downloadbtn">
                                                        <button onClick={() => downloadData()}>Download</button>
                                                    </div>
                                                </td>
                                            </tr>
                                           
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                           </Loader>
                        </div>
                        <div className="session-log-table">
                           <Loader>
                           <div className="card mb-3" style={{ marginLeft: '10px' }}>
                                <div className="card-body">
                                    <table  style={{ width: '100%' }}>
                                        <tbody> 
                                            <tr>
                                                <td >
                                                <h2>Z Table Export</h2>
                                                    <div className="session-date-picker">
                                                        <Space direction="vertical" size={12}>
                                                            <RangePicker
                                                                defaultValue={[moment().subtract(1, 'days'), moment()]}
                                                                format="YYYY-MM-DD"
                                                                onChange={(value, ds) => handleDateChange(ds, 'z-table-export')}
                                                                style={{ fontWeight: '600' }}
                                                                disabledDate={(current) => {
                                                                    const oneMonthAgo = moment().subtract(1, 'month');
                                                                    const today = moment().endOf('day');
                                                                    return current && (current < oneMonthAgo || current > today);
                                                                }}
                                                            />
                                                        </Space>
                                                    </div>
                                                    <div className="mt-downloadbtn">
                                                        <button onClick={() => exportZData()}>Export</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                           </Loader>
                        </div>
                        </div> 
                }</>
            </div>
        </>
    )
}

const mapStateToProps = (state) => {
    return {
        sso_user_details: state.admin.get('sso_user_details'),
    }
}
const mapDispatchToProps = (dispatch) => {
    return {
         getSSODetails: (emailId, history) => dispatch(Action.getSSODetails(emailId, history)),
         downloadShopifyReports: (dataDownload) => dispatch(Action.downloadShopifyReports(dataDownload)),
         exportZtables: (data) => dispatch(Action.exportZtables(data)),
    }
}

const ConnectReport = connect(
    mapStateToProps,
    mapDispatchToProps
)(ShopifyReport)

export default ConnectReport;
