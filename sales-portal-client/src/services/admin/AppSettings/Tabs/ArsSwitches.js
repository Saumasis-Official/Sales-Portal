import React, { useState, useEffect } from "react";
import { connect } from 'react-redux';
import { Radio, Tooltip } from "antd";
import { FormOutlined } from '@ant-design/icons';
import { customerGroupList } from "../../../../constants";
import * as AdminActions from '../../actions/adminAction';
import _ from 'lodash';
import { pages, hasEditPermission } from "../../../../persona/distributorHeader";
import CommentModal from "../../../../components/CommentModal/CommentModal";
import Util from '../../../../util/helper';

function ArsSwitches(props) {

    const { fetchArsConfigurations, updateArsConfigurations } = props;
    const enable = "auto_order";
    const submit = "auto_order_submit";

    //-----------------------------------------------------=====useState=====-------------------------------------------------------
    const [customerGroup, setCustomerGroup] = useState('31');
    const [switchSettings, setSwitchSettings] = useState([]);
    const [tableData, setTableData] = useState([]);
    const [isEditable, setIsEditable] = useState(false);
    const [isDisable, setIsDisable] = useState(true);
    const [isRemarkModalVisible, setIsRemarkModalVisible] = useState(false);
    const [regions, setRegions] = useState([]);

    //-----------------------------------------------------=====useRef=====---------------------------------------------------------
    //-----------------------------------------------------=====useEffect=====------------------------------------------------------
    useEffect(() => {
        getArsSwitchSettings();
    }, []);

    useEffect(() => {
        document.documentElement.scrollTop = 0;
        const regionSet = new Set();
        const filteredSettings = switchSettings?.filter((item) => item.customer_group === customerGroup)
        filteredSettings?.forEach((item) => {
            item.disabled = true;
            regionSet.add(item.region);
        });
        setTableData(_.cloneDeep(filteredSettings));
        setRegions([...regionSet]?.sort());
    }, [switchSettings, customerGroup]);

    //-----------------------------------------------------=====API Calls=====------------------------------------------------------
    async function getArsSwitchSettings() {
        try {
            const res = await fetchArsConfigurations(['SWITCH']);
            if (res?.success) {
                setSwitchSettings(res?.data);
                setIsEditable(false);
                setIsDisable(true);
            }
        } catch (error) {
            console.log(error);
        }
    };

    async function saveArsSwitchSettings(updatedData) {
        updatedData.length > 0 &&
            updateArsConfigurations({ data: updatedData })
                .then(res => {
                    if (res.success) {
                        Util.notificationSender('Success', 'Settings updated successfully', true);
                    } else {
                        Util.notificationSender('Error', 'Failed to update settings', false);
                    }
                })
                .catch(() => {
                    Util.notificationSender('Technical Error', 'Failed to update settings', false);
                })
                .finally(() => {
                    getArsSwitchSettings();
                });
    }

    //-----------------------------------------------------=====Helpers=====--------------------------------------------------------
    const findValue = (region, key) => {
        const data = tableData.find((item) => item.region === region);
        return data ? data[key] : false;
    };

    const validateData = (data) => {
        /**
         * 1. Remarks can not be empty or null
         * 2. Remarks should be minimum 5 characters
         */
        let isValid = true;
        const errors = new Set();
        data.forEach(item => {
            if (!item.remarks || item.remarks.length < 5) {
                isValid = false;
                errors.add(`Remarks should be minimum 5 characters`);
            }
        });
        if (isValid) {
            return true;
        } else {
            errors.forEach(error => {
                Util.notificationSender('Validation Error', error, false);
            });
            return false;
        }
    }
    //-----------------------------------------------------=====Event Handlers=====-------------------------------------------------
    const editOrCancelSettingHandler = () => {
        document.documentElement.scrollTop = 0;
        if (isEditable) {
            getArsSwitchSettings();
        }
        setIsEditable(!isEditable);
        setIsDisable(true);
    };

    const allSelectHandler = (e, key) => {
        const { checked } = e.target;
        const updatedData = tableData.map((item) => {
            item[key] = checked;
            item.disabled = false;
            item.remarks = null;
            return item;
        });
        setTableData(updatedData);
        setIsDisable(false);
    };

    const onCheckboxChangeHandler = (e, region, key) => {
        const { checked } = e.target;
        const updatedData = tableData.map((item) => {
            if (item.region === region) {
                item[key] = checked;
                item.disabled = false;
                item.remarks = null;
            }
            return item;
        });
        setTableData(updatedData);
        setIsDisable(false);
    };

    const saveSettingHandler = () => {
        const updatedData = tableData
            ?.filter(i => i.disabled === false)
            .map((item) => {
                item.disabled = true;
                return {
                    id: item.id,
                    auto_order: item.auto_order,
                    auto_order_submit: item.auto_order_submit,
                    remarks: item.remarks
                };
            });
        const isValid = validateData(updatedData);
        if (isValid) {
            saveArsSwitchSettings(updatedData);
        } else {
            getArsSwitchSettings();
        }
    };

    const changeRemarksHandler = (e, region) => {
        const updatedData = tableData.map((item) => {
            if (item.region === region) {
                item.remarks = e.target.value;
            }
            return item;
        });
        setTableData(updatedData);
        setIsDisable(false);
    };

    const setRemarksToAll = (identifier, comment) => {
        const updatedData = tableData
            ?.filter(i => i.disabled === false)
            .map((item) => {
                item.disabled = true;
                return {
                    id: item.id,
                    auto_order: item.auto_order,
                    auto_order_submit: item.auto_order_submit,
                    remarks: comment
                };
            });
        const isValid = validateData(updatedData);
        if (isValid) {
            saveArsSwitchSettings(updatedData);
        } else {
            getArsSwitchSettings();
        }
        setIsRemarkModalVisible(false);
    };
    //-----------------------------------------------------=====Render=====---------------------------------------------------------
    return (
        <>
            <div className="btn-radio-wrapper">

                <div className="radio-grp-content">
                    <p>
                        <span id="customer-grp-p"> Customer Group: </span>
                        <Radio.Group onChange={(e) => setCustomerGroup(e.target.value)} value={customerGroup} id='radio-grp'>
                            {
                                customerGroupList.map((item, index) => (
                                    <Radio key={item?.value} value={item.value}>{item.label}</Radio>
                                ))
                            }
                        </Radio.Group>
                    </p>
                </div>
            </div>
            <div className='we-table'>
                <table>
                    <thead>
                        <tr>
                            <th className='ao-header'>Region</th>
                            <th className='ao-header'>
                                <input type="checkbox"
                                    id={'all-ars-enable'}
                                    style={{ marginRight: '5px', cursor: isEditable ? 'pointer' : '' }}
                                    disabled={!isEditable}
                                    onChange={(event) => allSelectHandler(event, enable)}
                                />
                                Auto Order
                            </th>
                            <th className='ao-header'>
                                <input type="checkbox"
                                    id={'all-ars-submit'}
                                    style={{ marginRight: '5px', cursor: isEditable ? 'pointer' : '' }}
                                    disabled={!isEditable}
                                    onChange={(event) => allSelectHandler(event, submit)}
                                />
                                Auto Order Submit
                            </th>
                            <th className='ao-header'>Last Updated By</th>
                            <th className='ao-header'>
                                {isEditable &&
                                    <FormOutlined
                                        style={{ marginRight: '5px' }}
                                        onClick={() => {
                                            setIsRemarkModalVisible(true)
                                        }}>
                                    </FormOutlined>}
                                Remarks

                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {regions && regions.map((data, i) => {
                            return (
                                <tr key={i}>
                                    <td className="ao-header">{data}</td>
                                    <td className="ao-check">
                                        <label htmlFor={`${enable}_${data}`}>

                                            <input type="checkbox" id={`${enable}_${data}`}
                                                defaultChecked={findValue(data, enable)}
                                                checked={findValue(data, enable)}
                                                disabled={!isEditable}
                                                onChange={(event) => onCheckboxChangeHandler(event, data, enable)}>
                                            </input>
                                            <span className="checkmark-box"></span>
                                        </label>
                                    </td>
                                    <td className="ao-header">
                                        <label htmlFor={`${submit}_${data}`}>
                                            <input type="checkbox" id={`${submit}_${data}`}
                                                defaultChecked={findValue(data, submit)}
                                                checked={findValue(data, submit)}
                                                disabled={!isEditable}
                                                onChange={(event) => onCheckboxChangeHandler(event, data, submit)} >
                                            </input>
                                            <span className="checkmark-box"></span>
                                        </label>
                                    </td>
                                    <td>{(findValue(data, "first_name") && findValue(data, "last_name") && findValue(data, "updated_by")) ?
                                        `${findValue(data, "first_name")} ${findValue(data, "last_name")} ( ${findValue(data, "updated_by")})`
                                        : findValue(data, "updated_by")}
                                    </td>
                                    <td className="remarks">
                                        {!isEditable ?
                                            (!findValue(data, "remarks") || findValue(data, "remarks")?.trim()?.length === 0) ? '-'
                                                : <Tooltip placement="left" title={findValue(data, "remarks")}>{findValue(data, "remarks")}</Tooltip>
                                            : <textarea
                                                placeholder="Please enter your remarks (minimum 5 characters)"
                                                onChange={(e) => { changeRemarksHandler(e, data); }}
                                                // value={findValue(data, "remarks")}
                                                disabled={findValue(data, "disabled")} />
                                        }
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {hasEditPermission(pages.APP_SETTINGS) &&
                <div className='btn-wrapper'>
                    <button type='button' onClick={editOrCancelSettingHandler}>{isEditable ? 'Cancel' : 'Edit'}</button>
                    <button type='button' onClick={saveSettingHandler} disabled={isDisable}>Save</button>
                </div>
            }
            <CommentModal
                visible={isRemarkModalVisible}
                title="Remarks"
                okButtonText="Save and Submit"
                cancelButtonText="Cancel"
                placeholder="Please enter your remarks (minimum 5 characters)"
                minCommentLength={5}
                onOk={setRemarksToAll}
                onCancel={() => setIsRemarkModalVisible(false)}
            />
        </>
    );
}


const mapStateToProps = (state) => {
    return {};
}

const mapDispatchToProps = (dispatch) => {
    return {
        fetchArsConfigurations: (categoryArr) => dispatch(AdminActions.fetchArsConfigurations(categoryArr, true)),
        updateArsConfigurations: (data) => dispatch(AdminActions.updateArsConfigurations(data))
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(ArsSwitches);