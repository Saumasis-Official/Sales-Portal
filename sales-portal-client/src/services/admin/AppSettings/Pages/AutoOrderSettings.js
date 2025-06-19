/**
 * As per SOPE-978(https://tataconsumer.atlassian.net/browse/SOPE-978)- Stock norm configuration page under Forecast Tab,
 * SOPE-774(https://tataconsumer.atlassian.net/browse/SOPE-774)- Configuration of Stock norm, is deprecated.
 */
import React, { useState, useEffect } from "react";
import * as Action from '../../actions/adminAction';
import { connect } from 'react-redux';
// import { Modal } from 'antd';
// import { FormOutlined } from '@ant-design/icons';
import Auth from '../../../../util/middleware/auth';
import '../AppSettings1.css';
// import { Tooltip, notification, Select } from "antd";
// import { useRef } from "react";
import Tolerance from "../Tabs/Tolerance";
import StockTolerance from "../Tabs/StockTolerance";
import { hasViewPermission, pages } from "../../../../persona/distributorHeader";
import ARSGeneralSettings from "../Tabs/ARSGeneralSettings";
import ToleranceExemption from "../Tabs/ToleranceExemption";
import Tabs from "../../../../components/Tabs/Tabs";
import ArsSwitches from "../Tabs/ArsSwitches";
import ArsAdjustmentTimeline from "../Tabs/ArsAdjustmentTimeline";
import DBPskuTolerance from "../Tabs/DBPskuTolerance";

const tabsOptions = [
    { label: 'Switch', value: 'switch', title: "ARS Switches", default: true },
    { label: 'Tolerance', value: 'tolerance-metro', title: "Tolerance" },
    { label: 'Tolerance Exemption', value: 'tolerance-exemption', title: "Tolerance Exemptions" },
    { label: 'DBxPSKU Tolerance', value: 'tolerance-db-psku', title: "Tolerance DBxPSKU level" },
    { label: 'Adjustment Timeline', value: 'adjustment-timeline', title: "Adjustment Timeline" },
    { label: 'General', value: 'general', title: "ARS General Settings" },
];

const AutoOrderSettings = (props) => {
    const browserHistory = props.history;
    const { sso_user_details, getAppSettingList, getMaintenanceRequests, getSSODetails
    } = props;
    const ssoRole = sso_user_details.data && sso_user_details.data.length && sso_user_details.data[0].roles;

    const [activeTab, setActiveTab] = useState("switch");

    useEffect(() => {
        // getAppSettingList();
        getMaintenanceRequests();
    }, []);



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
        if (ssoRole && !hasViewPermission(pages.APP_SETTINGS)) {
            browserHistory.push("/admin/dashboard");
        }
    }, [ssoRole]);

    return (
        <div className="admin-dashboard-wrapper-1">
            <div
                className="ao-tabs">
                <Tabs value={activeTab} tabs={tabsOptions} onChangeSelection={(value) => setActiveTab(value)} />
            </div>
            <div className="admin-dashboard-table">
                {activeTab === "switch" &&
                    <ArsSwitches />
                }
                {/* Tolerance settings for GT-Metro */}
                {activeTab === "tolerance-metro" &&
                    <>
                        <Tolerance />
                        {/* <StockTolerance /> */}
                    </>
                }
                {/* Adjustment Timeline */}
                {activeTab === "adjustment-timeline" &&
                    <ArsAdjustmentTimeline/>
                }
                {/* General Settings */}
                {activeTab === 'general' &&
                    <ARSGeneralSettings />
                }
                {activeTab === 'tolerance-exemption' &&
                    <ToleranceExemption/>
                }
                {activeTab === 'tolerance-db-psku' &&
                    <DBPskuTolerance />
                }
            </div>
        </div>
    );
};

const mapStateToProps = (state) => {
    return {
        app_setting_list: state.admin.get('app_setting_list'),
        sso_user_details: state.admin.get('sso_user_details'),
    }
};

const mapDispatchToProps = (dispatch) => {
    return {
        getMaintenanceRequests: () => dispatch(Action.getMaintenanceRequests()),
        getAppSettingList: () => dispatch(Action.getAppSettingList()),
        updateAppSetting: (data) => dispatch(Action.updateAppSetting(data)),
        getSSODetails: (emailId, history) => dispatch(Action.getSSODetails(emailId, history)),
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(AutoOrderSettings);