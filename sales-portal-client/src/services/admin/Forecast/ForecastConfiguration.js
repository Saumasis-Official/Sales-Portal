import React, { useEffect, useRef, useState } from 'react';
import { notification } from 'antd';
// import { browserHistory } from 'react-router';
import { connect } from 'react-redux';
import '../../../style/admin/Dashboard.css';
import './ForecastConfiguration.css';
import * as AdminActions from '../actions/adminAction';
import Util from '../../../util/helper/index.js';
import _ from "lodash";
import StockNormAudit from './StockNormAudit';

const ForecastConfiguration = props => {
    const { areaCode, getForecastConfigurations, updateForecastConfiguration, editEnable } = props;

    const [data, setData] = useState();
    const [configuration, setConfiguration] = useState();
    const [canSave, setCanSave] = useState(false);
    let gridTemplateColumnsValue = useRef('');

    const notificationSender = (success, message, description) => {
        if (success) {
            notification.success({
                message: message,
                description: description,
                duration: 3,
                className: 'notification-green',
            });
        } else {
            notification.error({
                message: message,
                description: description,
                duration: 3,
                className: 'notification-error',
            })
        }
    }

    useEffect(() => {
        fetchConfigurationData();
    }, [areaCode]);

    const fetchConfigurationData = () => {
        getForecastConfigurations({
            areaCode: areaCode
        })
            .then((response) => {
                let d= response?.data?.data?.rows;
                gridTemplateColumnsValue.current = '';
                if(d?.config_data != null || Object.keys(d?.config_data).length>0){
                    let cd = {};
                    for(let key in d.config_data){
                        let obj = d.config_data[key];
                        if(+obj.weekly_week1 !== 0 || +obj.weekly_week2 !== 0 || +obj.weekly_week3 !== 0 || +obj.weekly_week4 !== 0 || +obj.fortnightly_week12 !== 0 || +obj.fortnightly_week34 !== 0){
                            cd[key] = obj;
                            gridTemplateColumnsValue.current += "1fr ";
                        }
                    }
                    d.config_data = cd;
                    setData(JSON.parse(JSON.stringify(d)));
                    setConfiguration(d);

                }else{
                    notificationSender(false, 'Error Occurred', 'Some error ocurred while fetching forecast configuration data. Please try again later.');
                }
            })
    }

    const onChangeHandler = (e, key) => {
    /**
     * https://tataconsumer.atlassian.net/browse/SOPE-1579
     * I/P -> O/P
     * 6.0 -> 6.0
     * -2 -> ""
     * -89.5671 -> ""
     * 2.568 -> 2.56
     * 158.5671 -> 100
     */
        const { name, value } = e.target;
        let configs = { ...configuration };
        let v = value;
        v = +v > 100 ? '100' : v;
        v = +v < 0 ? '0' : v;
        v = v.replace(/[^0-9.]/g, '');
        v = v.replace(/^0+/, '');
        v = v.replace(/(\.\d\d)\d+/, '$1'); // Truncate all characters after the second decimal place
        configs.config_data[key][name] = v;
        /**
         * TODO: Scenario to handle:
         * Suppose I make a change in the weekly configuration, then save button is enabled, which is correct.
         * Now I change the fortnightly configuration(or any other input box), and revert back to the original data
         * (eg. If original is 6.85, my input patter is 6.85 -> 6.8 -> 6.85)
         * Then canSave is assigned true and save button is disabled which is incorrect.
         */
        (data.config_data[key][name] !== v) ? setCanSave(true) : setCanSave(false)
        setConfiguration({ ...configs });
    };

    const onKeyDownHandler = (e) => {
        const { id } = e.target;
        if (e.code === 'NumpadEnter' || e.code === 'Enter' || e.code === 'ArrowDown') {
            e.preventDefault();
            document.getElementById(`${Number(id) + 10}`)?.focus();
        } else if (e.code === 'ArrowUp') {
            e.preventDefault();
            document.getElementById(`${Number(id) - 10}`)?.focus();
        }else if (e.code === 'ArrowRight') {
            e.preventDefault();
            document.getElementById(`${Number(id) + 5}`)?.focus();
        }else if (e.code === 'ArrowLeft') {
            e.preventDefault();
            document.getElementById(`${Number(id) - 5}`)?.focus();
        }
    };

    const differenceCalculator = (type,key) => {
        let result = 0.00;
        if(configuration?.config_data[key] !== undefined) {
            if (configuration && type === 'weekly') {
                const sum = Number(configuration?.config_data[key].weekly_week1) + Number(configuration?.config_data[key].weekly_week2) + Number(configuration?.config_data[key].weekly_week3) + Number(configuration?.config_data[key].weekly_week4);
                result = (parseFloat(sum - 100).toFixed(2));
            } else if (configuration && type === 'fortnightly') {
                const sum = Number(configuration?.config_data[key].fortnightly_week12) + Number(configuration?.config_data[key].fortnightly_week34);
                result = (parseFloat(sum - 100).toFixed(2));
            }
        }
        
        return ( +result === 0 ? 0.00 : result);
    };

    const editOrCancelSettingHandler = (e) => {
        setConfiguration(_.cloneDeep(data));
        setCanSave(false);
    };

    const saveSettingHandler = (e) => {

        delete configuration.updated_on;
        delete configuration.updated_by;
        delete configuration.first_name;
        delete configuration.last_name;
        delete configuration.user_id;
        let payload = JSON.parse(JSON.stringify(configuration));
        // let cd = for(let key in configuration.config_data){}
        updateForecastConfiguration(payload)
            .then((response) => {
                if (response?.data?.success === true) {
                    notificationSender(true, 'Success', 'Forecast Configurations updated successfully');
                    fetchConfigurationData();
                    setCanSave(false);
                } else {
                    notificationSender(false, 'Error Occurred', 'Some error ocurred while updating Forecast Configurations');
                }
            }).catch((error) => {
                notificationSender(false, 'Error Occurred', 'Some error ocurred while updating Forecast Configurations');
            })

    };

    const checkSaveDisableConditions = () => {
        /**
         * disable Save 
         * 1. if there has been no change ( i.e. canSave is false)
         * 2. or timeline window of the customer_group is open and the total is not 100%.
         */
        let result = false; //true -> button disabled
        const keys = Object.keys(editEnable);

        if (!canSave) {
            result = true;
        } else {
            for (let key of keys) {
                if (editEnable[key] && !(!+differenceCalculator('weekly', key) && !+differenceCalculator('fortnightly', key))) {
                    result = true;
                    break;
                }
            }
        }
        return result;
    }

    return (
        <>
            {(configuration?.config_data && !(_.isEmpty(configuration?.config_data))) ? <div className='brand-variants-container'>
                <table className="table-brand-variants">
                    <thead>
                        <tr>
                            <th className="sub-header width30">Weekly PDP</th>
                            <th className="sub-header width30">Days</th>
                            <th className="sub-header">
                                <span className='sub-header-text'>Percentage Division(%)</span>
                                {configuration?.config_data && <tr className='grid-container-row' style={{gridTemplateColumns: gridTemplateColumnsValue.current }}>
                                    {Object.keys(configuration?.config_data).map((key, index) => {
                                        return (<th className='grid-container-cell' key={key}>{key.split('#')[1]}</th>)
                                    })}
                                </tr>}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className='center sn-padding'>Week - 1</td>
                            <td className='center sn-padding'>1 - 7</td>
                            <td className='sub-header sn-padding'>
                                {configuration?.config_data && <tr className='grid-container-row' style={{gridTemplateColumns: gridTemplateColumnsValue.current }}>
                                    {Object.keys(configuration?.config_data).map((key, index) => {
                                        return (
                                            <td className='sn-padding' key={key}>
                                                {editEnable[key] ?
                                                    <input
                                                        id={0 + index*5}
                                                        name='weekly_week1'
                                                        type='number'
                                                        className='qty-input'
                                                        value={configuration?.config_data[key]?.weekly_week1}
                                                        onWheel={e => e.target.blur()}
                                                        onKeyDown={onKeyDownHandler}
                                                        onChange={e => onChangeHandler(e,key)} />
                                                    : configuration?.config_data[key] === undefined ? '-'
                                                        : configuration?.config_data[key]?.weekly_week1
                                                }
                                            </td>
                                        )
                                    })}
                                    
                                </tr>}
                            </td>
                        </tr>
                        <tr>
                            <td className='center sn-padding'>Week - 2</td>
                            <td className='center sn-padding'>8 - 14</td>
                            <td className='sub-header sn-padding'>
                                {configuration?.config_data && <tr className='grid-container-row' style={{gridTemplateColumns: gridTemplateColumnsValue.current }}>
                                {Object.keys(configuration?.config_data).map((key, index) => {
                                        return (
                                            <td className='sn-padding' key={key}>
                                                {editEnable[key] ?
                                                    <input
                                                        id={10 + index*5}
                                                        name='weekly_week2'
                                                        type='number'
                                                        className='qty-input'
                                                        value={configuration?.config_data[key]?.weekly_week2}
                                                        onWheel={e => e.target.blur()}
                                                        onKeyDown={onKeyDownHandler}
                                                        onChange={e => onChangeHandler(e,key)} />
                                                    : configuration?.config_data[key] === undefined ? '-'
                                                        : configuration?.config_data[key]?.weekly_week2
                                                }
                                            </td>
                                        )
                                    })}
                                </tr>}
                            </td>
                        </tr>
                        <tr>
                            <td className='center sn-padding'>Week - 3</td>
                            <td className='center sn-padding'>15 - 21</td>
                            <td className='sub-header sn-padding'>
                                {configuration?.config_data && <tr className='grid-container-row' style={{gridTemplateColumns: gridTemplateColumnsValue.current }}>
                                {Object.keys(configuration?.config_data).map((key, index) => {
                                        return (
                                            <td className='sn-padding' key={key}>
                                                {editEnable[key] ?
                                                    <input
                                                        id={20 + index*5}
                                                        name='weekly_week3'
                                                        type='number'
                                                        className='qty-input'
                                                        value={configuration?.config_data[key]?.weekly_week3}
                                                        onKeyDown={onKeyDownHandler}
                                                        onWheel={e => e.target.blur()}
                                                        onChange={e => onChangeHandler(e,key)} />
                                                    : configuration?.config_data[key] === undefined ? '-'
                                                        : configuration?.config_data[key]?.weekly_week3
                                                }
                                            </td>
                                        )
                                    })}
                                </tr>}
                            </td>
                        </tr>
                        <tr>
                            <td className='center sn-padding'>Week - 4</td>
                            <td className='center sn-padding'>22 - End Of Month</td>
                            <td className='sub-header sn-padding'>
                                {configuration?.config_data && <tr className='grid-container-row' style={{gridTemplateColumns: gridTemplateColumnsValue.current }}>
                                {Object.keys(configuration?.config_data).map((key, index) => {
                                        return (
                                            <td className='sn-padding' key={key}>
                                                {editEnable[key] ?
                                                    <input
                                                        id={30 + index*5}
                                                        name='weekly_week4'
                                                        type='number'
                                                        className='qty-input'
                                                        value={configuration?.config_data[key]?.weekly_week4}
                                                        onWheel={e => e.target.blur()}
                                                        onKeyDown={onKeyDownHandler}
                                                        onChange={e => onChangeHandler(e,key)} />
                                                    : configuration?.config_data[key] === undefined ? '-'
                                                        : configuration?.config_data[key]?.weekly_week4
                                                }
                                            </td>
                                        )
                                })}
                                </tr>}
                            </td>
                        </tr>
                        <tr>
                            <td className='total center sn-padding'>Total</td>
                            <td className='total center sn-padding'></td>
                            <td className='total sub-header sn-padding'>
                                {configuration?.config_data && <tr className='grid-container-row' style={{gridTemplateColumns: gridTemplateColumnsValue.current }}>
                                {Object.keys(configuration?.config_data).map((key, index) => {
                                        return (<td className='sn-padding' key={key}>{configuration === undefined ? '-' : `100% ( ${differenceCalculator('weekly',key)}% )`}</td>)
                                    })}
                                </tr>}
                            </td>
                        </tr>
                    </tbody>
                </table>
                <br />
                <table className="table-brand-variants">
                    <thead>
                        <tr>
                            <th className="sub-header width30">Fortnightly PDP</th>
                            <th className="sub-header width30">Days</th>
                            <th className="sub-header">
                                <span className='sub-header-text'>Percentage Division(%)</span>
                                {configuration?.config_data && <tr className='grid-container-row' style={{gridTemplateColumns: gridTemplateColumnsValue.current }}>
                                {Object.keys(configuration?.config_data).map((key, index) => {
                                        return (<th className='grid-container-cell' key={key}>{key.split('#')[1]}</th>)
                                    })}
                                </tr>}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className='center sn-padding'>Week - 1, 2</td>
                            <td className='center sn-padding'>1 - 14</td>
                            <td className='sub-header sn-padding'>
                                {configuration?.config_data && <tr className='grid-container-row' style={{gridTemplateColumns: gridTemplateColumnsValue.current }}>
                                {Object.keys(configuration?.config_data).map((key, index) => {
                                        return (
                                            <td className='sn-padding' key={key}>
                                                {editEnable[key] ?
                                                    <input
                                                        id={40 + index*5}
                                                        name='fortnightly_week12'
                                                        type='number'
                                                        className='qty-input'
                                                        value={configuration?.config_data[key]?.fortnightly_week12}
                                                        onWheel={e => e.target.blur()}
                                                        onKeyDown={onKeyDownHandler}
                                                        onChange={e => onChangeHandler(e,key)} />
                                                    : configuration?.config_data[key] === undefined ? '-'
                                                        : configuration?.config_data[key]?.fortnightly_week12
                                                }
                                            </td>
                                        )
                                    })}
                                </tr>}
                            </td>
                        </tr>
                        <tr>
                            <td className='center sn-padding'>Week - 3, 4</td>
                            <td className='center sn-padding'>15 - End Of Month</td>
                            <td className='sub-header sn-padding'>
                                {configuration?.config_data && <tr className='grid-container-row' style={{gridTemplateColumns: gridTemplateColumnsValue.current }}>
                                {Object.keys(configuration?.config_data).map((key, index) => {
                                        return (
                                            <td className='sn-padding' key={key}>
                                                {editEnable[key] ?
                                                    <input
                                                        id={50 + index*5}
                                                        name='fortnightly_week34'
                                                        type='number'
                                                        className='qty-input'
                                                        value={configuration?.config_data[key]?.fortnightly_week34}
                                                        onWheel={e => e.target.blur()}
                                                        onKeyDown={onKeyDownHandler}
                                                        onChange={e => onChangeHandler(e,key)} />
                                                    : configuration?.config_data[key] === undefined ? '-'
                                                        : configuration?.config_data[key]?.fortnightly_week34
                                                }
                                            </td>
                                        )
                                    })}
                                </tr>}
                            </td>
                        </tr>
                        <tr>
                            <td className='total center sn-padding'>Total</td>
                            <td className='total center sn-padding'></td>
                            <td className='total sub-header sn-padding'>
                                {configuration?.config_data && <tr className='grid-container-row' style={{gridTemplateColumns: gridTemplateColumnsValue.current }}>
                                {Object.keys(configuration?.config_data).map((key, index) => {
                                        return (<td className='sn-padding' key={key}>{configuration === undefined ? '-' : `100% ( ${differenceCalculator('fortnightly',key)}% )`}</td>)
                                    })}
                                </tr>}
                            </td>
                        </tr>
                    </tbody>
                </table>
                {configuration &&
                    <>
                        <span className='audit-trail'> Last updated by:
                        {(configuration?.first_name && configuration?.last_name && configuration?.updated_by) ?
                            ` ${configuration?.first_name} ${configuration?.last_name} (${configuration?.updated_by}) `
                                : ` ${configuration?.updated_by} `}
                            on {Util.formatDate(configuration?.updated_on)}, {Util.formatTime(configuration?.updated_on)}
                        </span>
                        <div className='btn-wrapper'>
                        <button type='button' onClick={editOrCancelSettingHandler} disabled={!(Object.keys(editEnable).some(cg=>editEnable[cg])) || !canSave}>Reset</button>
                        <button type='button' onClick={saveSettingHandler} disabled={checkSaveDisableConditions()}>Save</button>
                        </div>
                    </>}
            </div> : <div className='no-data'>No Forecast Configuration Data Found for area - {areaCode}</div>}
            
        </>
    )

}

const mapStateToProps = (state) => {
    return {
        // pdp_req_list: state.admin.get('pdp_update_requests'),
    }
}
const mapDispatchToProps = (dispatch) => {
    return {
        // getCustomerGroupDetails: () => dispatch(AdminAction.getCustomerGroupDetails()),
        getForecastConfigurations: (data) => dispatch(AdminActions.getForecastConfigurations(data)),
        updateForecastConfiguration: (data) => dispatch(AdminActions.updateForecastConfiguration(data)),
    }
}


export default connect(mapStateToProps, mapDispatchToProps)(ForecastConfiguration);