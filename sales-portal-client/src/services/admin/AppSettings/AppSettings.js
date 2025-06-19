import React, { useEffect, useState } from 'react'
import '../AppSettings/AppSettings1.css'
import GeneralSettings from "./Pages/GeneralSettings";
import PdpWindow from "./Pages/PdpWindow";
import AutoOrderSettings from './Pages/AutoOrderSettings';
import MoqSettings from './Pages/Moq';
import MTEcomSettings from './Pages/MTEcomSettings';
import Auth from '../../../util/middleware/auth';
import { pages, features, hasViewPermission } from '../../../persona/distributorHeader';
import { useLocation } from 'react-router-dom';
import CfaSurveySettings from './Pages/CfaSurveySettings';
import SpecialOrderSettings from './Pages/SpecialOrderSettings';
import CreditLimitSetting from './Pages/CreditLimitSetting';
import _ from 'lodash';
import DeliveryCodeSettings from './Pages/DeliveryCodeSettings';

let AppSettings = (props) => {

    const [activeTab, setActiveTab] = useState("tab1");
    let role = Auth.getAdminRole()
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const tabFromUrl = queryParams.get('tab');
    const browserHistory = props.history;
    useEffect(() => {
        if (!hasViewPermission(pages.APP_SETTINGS,features.VIEW_APP_SETTINGS)) {
            const redirect = {
                'KAMS': '/admin/app-settings',
            }
            !_.isEmpty(_.intersection(role,Object.keys(redirect))) &&  browserHistory.push({ 
                    pathname: redirect.KAMS, 
                    search: "?tab=mtecom"
            });
        }
    },[]);
    useEffect(() => {
        if (tabFromUrl === 'mtecom') {
            setActiveTab('mtecom');
        }
      }, [tabFromUrl]);



    return (
        <div className="row">
            <ul className="nav-1">
                {
                    hasViewPermission(pages.APP_SETTINGS,features.VIEW_APP_SETTINGS) && 
                <li
                    className={activeTab === "tab1" ? "active" : ""}
                    onClick={() => setActiveTab("tab1")}
                >
                    App Settings
                </li>
                }
                 {
                    hasViewPermission(pages.APP_SETTINGS,features.VIEW_PDP) &&
                <li
                    className={activeTab === "tab2" ? "active" : ""}
                    onClick={() => setActiveTab("tab2")}
                >
                    PDP Window
                </li>
                }
                {
                    hasViewPermission(pages.APP_SETTINGS,features.VIEW_ARS) &&
                <li
                    className={activeTab === "tab3" ? "active" : ""}
                    onClick={() => setActiveTab("tab3")}
                >
                    ARS
                </li>
                }
                {
                    hasViewPermission(pages.APP_SETTINGS,features.VIEW_MOQ) &&
                <li
                    className={activeTab === "tab4" ? "active" : ""}
                    onClick={() => setActiveTab("tab4")}
                >
                    MOQ
                </li>
                }
                {
                    hasViewPermission(pages.APP_SETTINGS,features.VIEW_APP_SETTINGS) &&
                <li
                    className={activeTab === "mtecom" ? "active" : ""}
                    onClick={() => setActiveTab("mtecom")}
                >
                    MT ECOM
                </li>
                }
                {
                    hasViewPermission(pages.APP_SETTINGS,features.VIEW_APP_SETTINGS) &&
                <li
                    className={activeTab === "tab6" ? "active" : ""}
                    onClick={() => setActiveTab("tab6")}
                >
                    CFA
                </li>
                }
                {
                    hasViewPermission(pages.APP_SETTINGS,features.VIEW_APP_SETTINGS) &&
                <li
                    className={activeTab === "cco" ? "active" : ""}
                    onClick={() => setActiveTab("cco")}
                >
                    CCO
                </li>
                }
                {
                    hasViewPermission(pages.APP_SETTINGS,features.VIEW_APP_SETTINGS) &&
                    <li
                    className={activeTab === "credit" ? "active" : ""}
                    onClick={() => setActiveTab("credit")}
                > Credit Limit
                </li>
                }
                {
                    hasViewPermission(pages.APP_SETTINGS,features.VIEW_APP_SETTINGS) &&
                    <li
                    className={activeTab === "deliveryCode" ? "active" : ""}
                    onClick={() => setActiveTab("deliveryCode")}
                > Delivery Code
                </li>
                }
            </ul>
            <hr />
            <div className="outlet">
            {
                    hasViewPermission(pages.APP_SETTINGS,features.VIEW_APP_SETTINGS) && 
                activeTab === "tab1" && <GeneralSettings />
            }
            {
                hasViewPermission(pages.APP_SETTINGS,features.VIEW_PDP) &&
                activeTab === "tab2" && <PdpWindow />
            }
            {
                 hasViewPermission(pages.APP_SETTINGS,features.VIEW_ARS) &&
                activeTab === "tab3" && <AutoOrderSettings />
            }
            {
                hasViewPermission(pages.APP_SETTINGS,features.VIEW_MOQ) &&
                activeTab === "tab4" && <MoqSettings />
            }
            {
                hasViewPermission(pages.APP_SETTINGS,features.VIEW_APP_SETTINGS) &&
                activeTab === "mtecom" && <MTEcomSettings />
            }
                        {
                hasViewPermission(pages.APP_SETTINGS,features.VIEW_APP_SETTINGS) &&
                activeTab === "tab6" && <CfaSurveySettings />
            }
            {
                hasViewPermission(pages.APP_SETTINGS,features.VIEW_APP_SETTINGS) &&
                activeTab === "cco" && <SpecialOrderSettings />
            }
            {
                hasViewPermission(pages.APP_SETTINGS,features.VIEW_APP_SETTINGS) &&
                activeTab === "credit" && <CreditLimitSetting />
            }
            {
                hasViewPermission(pages.APP_SETTINGS,features.VIEW_APP_SETTINGS) &&
                activeTab === "deliveryCode" && <DeliveryCodeSettings />
            }
            </div>
        </div>
    )
}

export default AppSettings;
