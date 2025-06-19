import React, { useState, useEffect } from "react";
import { connect } from 'react-redux';
import { Tooltip, Select } from "antd";
import { customerGroupList } from "../../../../constants";
import * as AdminActions from '../../actions/adminAction';
import _ from 'lodash';
import { pages, hasEditPermission } from "../../../../persona/distributorHeader";
import CommentModal from "../../../../components/CommentModal/CommentModal";
import Util from '../../../../util/helper';

function ArsAdjustmentTimeline(props) {
    const { Option } = Select;

    const {
        fetchArsConfigurations,
        updateArsConfigurations
    } = props;
    const adjustmentEnable = "enable_adjustment";
    const startDate = "start_date";
    const endDate = "end_date";

    //-----------------------------------------------------=====useState=====-------------------------------------------------------
    const [tableData, setTableData] = useState([]);
    const [isEditable, setIsEditable] = useState(false);
    const [isDisable, setIsDisable] = useState(true);
    const [isRemarkModalVisible, setIsRemarkModalVisible] = useState(false);
    const [customerGroups, setCustomerGroups] = useState(customerGroupList);

    //-----------------------------------------------------=====useRef=====---------------------------------------------------------
    //-----------------------------------------------------=====useEffect=====------------------------------------------------------
    useEffect(() => {
        getArsTimelineSettings();
    }, []);

    //-----------------------------------------------------=====API Calls=====------------------------------------------------------
    async function getArsTimelineSettings() {
        try {
            const res = await fetchArsConfigurations(['TIMELINE']);
            if (res?.success) {
                res.data.forEach(item => {
                    item.disabled = true;
                });
                const settingData = _.cloneDeep(res.data);
                const filtered_cgs = customerGroupList.filter(cg => settingData.some(item => item.customer_group === cg.value));
                setCustomerGroups(filtered_cgs);
                setTableData(settingData);
                setIsEditable(false);
                setIsDisable(true);
            }
        } catch (error) {
            console.log(error);
        }
    };

    const saveSettingHandler = () => {
        const updatedData = tableData?.filter(i => i.disabled === false);
        const isValid = validatePayload(updatedData);
        if (isValid) {
            const payload = updatedData.map((item) => {
                item.disabled = true;
                return {
                    id: item.id,
                    enable_adjustment: item.enable_adjustment,
                    start_date: item.start_date,
                    end_date: item.end_date,
                    remarks: item.remarks
                };
            });
            updatedData.length > 0 &&
                updateArsConfigurations({ data: payload })
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
                        getArsTimelineSettings();
                    });

        } else {
            getArsTimelineSettings();
        }
        setIsEditable(false);
        setIsDisable(true);
    };

    //-----------------------------------------------------=====Helpers=====--------------------------------------------------------
    const findValue = (customerGroup, key) => {
        const data = tableData?.find((item) => item.customer_group === customerGroup);
        return data ? data[key] : false;
    };

    const validatePayload = (data) => {
        /**
         * 1. start date should be less than end date
         * 2. remarks should be minimum 5 characters
         * 3. remarks cannot be empty or null
         * 4. at least one customer group should be selected
         */
        let isValid = true;
        const errors = [];
        if (data?.length > 0) {
            data.forEach(item => {
                const customerGroupName = customerGroups.find(cg => cg.value === item.customer_group)?.label;
                if (!item.start_date || !item.end_date || (item.start_date && item.end_date && +item.start_date > +item.end_date)) {
                    isValid = false;
                    errors.push(`${customerGroupName}: Start date should be less than end date`);
                }
                if (item.remarks && item.remarks.length < 5) {
                    isValid = false;
                    errors.push(`${customerGroupName}: Remarks should be minimum 5 characters`);
                }
                if (!item.remarks) {
                    isValid = false;
                    errors.push(`${customerGroupName}: Remarks for cannot be empty`);
                }
            });
        } else {
            isValid = false;
            errors.push('No change found to Save');
        }

        if (isValid) {
            return true;
        } else {
            errors.forEach(error => {
                Util.notificationSender('Validation Error', error, false);
            });
            return false;
        }
    };
    //-----------------------------------------------------=====Event Handlers=====-------------------------------------------------
    const editOrCancelSettingHandler = () => {
        document.documentElement.scrollTop = 0;
        if (isEditable) {
            getArsTimelineSettings();
        }
        setIsEditable(!isEditable);
        setIsDisable(true);
    };

    const allSelectHandler = (e, key) => {
        const { checked } = e.target;
        const updatedData = tableData.map((item) => {
            item[key] = checked;
            item.disabled = false;
            return item;
        });
        setTableData(updatedData);
        setIsDisable(false);
    };

    const onCheckboxChangeHandler = (e, customerGroup, key) => {
        const { checked } = e.target;
        const updatedData = tableData.map((item) => {
            if (item.customer_group === customerGroup) {
                item[key] = checked;
                item.disabled = false;
                item.remarks = null;
            }
            return item;
        });
        setTableData(updatedData);
        setIsDisable(false);
    };

    const changeRemarksHandler = (e, customerGroup) => {
        const updatedData = tableData.map((item) => {
            if (item.customer_group === customerGroup) {
                item.remarks = e.target.value;
            }
            return item;
        });
        setTableData(updatedData);
        setIsDisable(false);
    };

    const changeSelectSettingHandler = (val, customerGroup, key) => {
        const updatedData = tableData.map((item) => {
            if (item.customer_group === customerGroup) {
                item[key] = val;
                item.disabled = false;
                item.remarks = null;
            }
            return item;
        });
        setTableData(updatedData);
        setIsDisable(false);
    };

    //-----------------------------------------------------=====Render=====---------------------------------------------------------
    return (
        <>
            <div className="we-table">
                <table>
                    <thead>
                        <tr>
                            <th className="ao-header">Customer Group</th>
                            <th className="ao-header">
                                <Tooltip placement="bottom" title="To allow adjustment of ARS forecast within the specified start and end dates">Enable Adjustment</Tooltip>
                            </th>
                            <th className="ao-header">
                                <Tooltip placement="bottom" title="To set the date form which the user will be able to edit the forecast. Applicable for all 12 months">Start Date</Tooltip>
                            </th>
                            <th className="ao-header">
                                <Tooltip placement="bottom" title="To set the date till which the user will be able to edit the forecast. Applicable for all 12 months">End Date</Tooltip>
                            </th>
                            <th className="ao-header">Last Updated By</th>
                            <th className="ao-header">Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData && customerGroups.filter(cg => tableData.some(item => item.customer_group === cg.value)).map((item, index) => {
                            return (
                                <tr key={index}>
                                    <td className="ao-header">{item.label}</td>
                                    <td>
                                        <label htmlFor={item.value + adjustmentEnable}>
                                            <input
                                                type="checkbox"
                                                id={item.value + adjustmentEnable}
                                                name={adjustmentEnable}
                                                defaultChecked={findValue(item.value, adjustmentEnable)}
                                                checked={findValue(item.value, adjustmentEnable)}
                                                disabled={!isEditable}
                                                onChange={(event) => onCheckboxChangeHandler(event, item.value, adjustmentEnable)}
                                                className="ao-checkbox" />
                                            <span className="checkmark-box"></span>
                                        </label></td>
                                    <td>
                                        {isEditable ?
                                            <Select
                                                className="value-text-fld width70px"
                                                id={`${item.value}${startDate}`}
                                                value={findValue(item.value, startDate)}
                                                onChange={(val) => changeSelectSettingHandler(val, item.value, startDate)}
                                                dropdownClassName="user-role-dropdown"
                                            >
                                                {findValue(item.value, "allowed_values")?.map((value, index) => {
                                                    return <Option key={index} value={value}>{value}</Option>
                                                })}
                                            </Select>
                                            : <Tooltip placement="bottom" title={findValue(item.value, startDate)}>{findValue(item.value, startDate)}</Tooltip>}
                                    </td>
                                    <td className="ao-header">
                                        {isEditable ?
                                            <Select
                                                className="value-text-fld width70px"
                                                id={`${item.value}${endDate}`}
                                                value={findValue(item.value, endDate)}
                                                onChange={(val) => changeSelectSettingHandler(val, item.value, endDate)}
                                                dropdownClassName="user-role-dropdown"
                                            >
                                                {findValue(item.value, "allowed_values")?.map((value, index) => {
                                                    return <Option key={index} value={value}>{value}</Option>
                                                })}
                                            </Select>
                                            : <Tooltip placement="bottom" title={findValue(item.value, endDate)}>{findValue(item.value, endDate)}</Tooltip>}
                                    </td>
                                    <td>{(findValue(item.value, "first_name") && findValue(item.value, "last_name") && findValue(item.value, "updated_by")) ?
                                        `${findValue(item.value, "first_name")} ${findValue(item.value, "last_name")} ( ${findValue(item.value, "updated_by")})`
                                        : findValue(item.value, "updated_by")}
                                    </td>
                                    <td className="remarks">
                                        {isEditable ?
                                            <textarea
                                                placeholder="Please enter your remarks (minimum 5 characters)"
                                                onChange={(e) => {changeRemarksHandler(e, item.value);}}
                                                disabled={findValue(item.value, "disabled")}
                                            />
                                            : (!findValue(item.value, "remarks") || findValue(item.value, "remarks")?.trim()?.length === 0) ? '-'
                                                : <Tooltip placement="left" title={findValue(item.value, "remarks")}>{findValue(item.value, "remarks")}</Tooltip>
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
                placeholder="Please enter your remarks (minimum 10 characters)"
                onOk={saveSettingHandler}
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

export default connect(mapStateToProps, mapDispatchToProps)(ArsAdjustmentTimeline);