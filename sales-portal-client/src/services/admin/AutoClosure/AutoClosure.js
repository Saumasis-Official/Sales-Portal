import React, { useEffect, useState } from 'react';
import Tabs from '../../../components/Tabs/Tabs';
import GTAutoClosureSettings from './GTAutoClosureSetting';
import MTAutoClosureSettings from './MTAutoClosureSetting';
import EcomAutoClosureSettings from './EcomAutoClosureSetting';
import { Link } from 'react-router-dom';
import { features, hasViewPermission, pages } from '../../../persona/distributorHeader';

const AutoClosure = () => {
    const [activeTab, setActiveTab] = useState('GT');

    const hasGTPermission = hasViewPermission(pages.AUTO_CLOSURE, features.EDIT_GT_AUTO_CLOSURE);
    const hasMTPermission = hasViewPermission(pages.AUTO_CLOSURE, features.EDIT_MT_AUTO_CLOSURE);
    const hasEcomPermission = hasViewPermission(pages.AUTO_CLOSURE, features.EDIT_Ecom_AUTO_CLOSURE);

    useEffect(() => {
        if (hasGTPermission) {
            setActiveTab('GT');
        } else if (hasMTPermission) {
            setActiveTab('MT');
        }
    }, [hasGTPermission, hasMTPermission]);

    const tabStyle = {
        width: '80px',
        textAlign: 'center',
        display: 'inline-block',
    };

    const tabs = [
        {
            label: <span style={tabStyle}>GT</span>,
            value: 'GT',
            default: true,
            permission: hasGTPermission,
        },
        {
            label: <span style={tabStyle}>MT</span>,
            value: 'MT',
            permission: hasMTPermission,
        },
        // {
        //   label: <span style={tabStyle}>Ecom</span>,
        //   value: 'Ecom',
        //   permission: hasEcomPermission,
        // },
    ].filter((tab) => tab.permission);

    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
    };

    return (
        <div className="admin-dashboard-wrapper">
            <div className="admin-dashboard-block">
                <h2 className="page-tritle-rdd">SO Auto Closure Settings</h2>
                <div
                    style={{
                        float: 'right',
                        marginTop: '-35px',
                        fontSize: 'medium',
                    }}>
                    <Link
                        to={{
                            pathname: '/admin/auto-closure-reports',
                            state: { activeTab },
                        }}>
                        <img src="/assets/images/chart.svg" alt="report-img" style={{ width: '20px' }} /> <em> {activeTab} Short Close Reports</em>
                    </Link>
                </div>
                <div className="req-tabs">
                    <Tabs tabs={tabs} value={activeTab} onChangeSelection={handleTabChange} />
                </div>
                <div className="tab-content">
                    {activeTab === 'GT' && hasGTPermission && <GTAutoClosureSettings />}
                    {activeTab === 'MT' && hasMTPermission && <MTAutoClosureSettings />}
                    {activeTab === 'Ecom' && hasEcomPermission && <EcomAutoClosureSettings />}
                </div>
            </div>
        </div>
    );
};

export default AutoClosure;
