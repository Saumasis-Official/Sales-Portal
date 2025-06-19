import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { getAllArsTolerance, updateArsTolerance } from '../../actions/adminAction';
import { Tooltip, notification, Radio } from 'antd';
import { customerGroupList } from '../../../../constants/index';
import { SearchOutlined } from '@ant-design/icons';
import SearchBox from '../../../../components/SearchBox';
import Loader from '../../../../components/Loader';
import '../../Forecast/StockNormAudit.css';
import ToleranceMultiUpdate from './ToleranceMultiUpdate';
import './ToleranceMultiUpdate.css';
import { pages, hasEditPermission } from '../../../../persona/distributorHeader.js';

function Tolerance(props) {
    const { getAllArsTolerance, updateArsTolerance } = props;
    const [customerGroup, setCustomerGroup] = useState('31');
    const [toleranceData, setToleranceData] = useState([]);
    const [isEditable, setIsEditable] = useState(false);
    const [isDisable, setIsDisable] = useState(true);
    const [initialData, setInitialData] = useState([]);
    const [searchCol, setSearchCol] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [tableData, setTableData] = useState([]);
    const [multiUpdateModalVisible, setMultiUpdateModalVisible] = useState(false);

    const toleranceObj = {
        A: ['class_a_max', 'class_a_min'],
        B: ['class_b_max', 'class_b_min'],
        C: ['class_c_max', 'class_c_min'],
    };

    const classArray = ['Class A', 'Class B', 'Class C'];

    const isSupportAdmin = false;
    useEffect(() => {
        fetchToleranceData();
    }, [customerGroup]);

    useEffect(() => {
        const filteredData = toleranceData?.filter((data) => {
            if (searchValue === '') return data;
            else {
                return data.area_code.toLowerCase().includes(searchValue.toLowerCase());
            }
        });
        setTableData(filteredData);
    }, [toleranceData, searchValue]);

    function fetchToleranceData() {
        let toleranceData = [];
        getAllArsTolerance(customerGroup).then((response) => {
            setInitialData(response?.data?.data?.rows);
            for (let data of response?.data?.data ?? []) {
                toleranceData.push({ ...data, disabled: true });
            }
            setToleranceData(toleranceData);
        });
    }

    const formatValue = (value, category) => {
        //check if value is number, else return 0, also check if the value is within range of 0-100, if less than 0 then return 0, if greater than 100 then return 100
        if (isNaN(value)) {
            return '0';
        }
        let formatValue = value;
        // https://tataconsumer.atlassian.net/browse/SOPE-1278: SOPE-1219 DEV/UAT Quantity tolerance to be limited to -100 % to +999%
        const maxUpperLimitAllowable = 9999;
        const maxLowerLimitAllowable = -100;
        switch (category) {
            case 'max':
                if (+value > maxUpperLimitAllowable) {
                    formatValue = maxUpperLimitAllowable;
                } else if (+value < 0) {
                    formatValue = 0;
                }
                break;
            case 'min':
                if (+value < maxLowerLimitAllowable) {
                    formatValue = maxLowerLimitAllowable;
                } else if (+value > 0) {
                    formatValue = 0;
                }
                break;
            default:
                break;
        }
        formatValue = Number.isInteger(+formatValue) ? formatValue : Math.round(+formatValue);
        return formatValue.toString();
    };

    const changeToleranceHandler = (e) => {
        let { id, name, value } = e.target;
        const property = id.split('_');
        const index = toleranceData?.findIndex((i) => i.id === property[0]);
        toleranceData[index]['disabled'] = false;
        toleranceData[index][name] = formatValue(value, property[3]);
        setToleranceData([...toleranceData]);
    };

    const editOrCancelSettingHandler = () => {
        if (isDisable) {
            setToleranceData(toleranceData.map((item) => ({ ...item, remarks: '' })));
        }
        if (!isDisable) {
            setToleranceData();
            let setData = [];
            initialData?.forEach((data) => {
                setData.push({ ...data, disabled: true });
            });

            setToleranceData(setData);
        }
        if (isEditable) {
            fetchToleranceData();
        }
        setIsEditable(!isEditable);
        setIsDisable(!isDisable);
    };
    const saveSettingHandler = () => {
        const updateDetails = toleranceData
            ?.filter((item) => !item.disabled)
            ?.map((i) => {
                return {
                    class_a_max: i.class_a_max,
                    class_b_max: i.class_b_max,
                    class_c_max: i.class_c_max,
                    class_a_min: i.class_a_min,
                    class_b_min: i.class_b_min,
                    class_c_min: i.class_c_min,
                    remarks: i.remarks,
                    id: i.id,
                    area_code: i.area_code,
                };
            });
        if (Array.isArray(updateDetails) && updateDetails.length) saveSetting(updateDetails);
        else {
            return notification.error({
                message: 'Error',
                description: `Please enter remarks for feature`,
                duration: 5,
                className: 'notification-error',
            });
        }
    };

    const saveSetting = async (updateData) => {
        for (let datum of updateData) {
            if (!datum.remarks) {
                return notification.error({
                    message: 'Error',
                    description: `Please enter remarks for feature  ${datum.area_code}`,
                    duration: 5,
                    className: 'notification-error',
                });
            } else if (datum.remarks.trim().length < 10) {
                return notification.error({
                    message: 'Error',
                    description: `Please enter minimum 10 characters in remarks to update the feature ${datum.area_code}`,
                    duration: 5,
                    className: 'notification-error',
                });
            }
            delete datum.area_code;
        }
        updateArsTolerance(updateData)
            .then((response) => {
                if (!response) {
                    return notification.error({
                        message: 'Error',
                        description: `Could not update tolerance data, all tolerance values must be filled and Valid`,
                        duration: 5,
                        className: 'notification-error',
                    });
                }
                fetchToleranceData();
                setIsEditable(false);
                setIsDisable(true);
                return notification.success({
                    message: 'Success',
                    description: `Successfully submitted`,
                    duration: 5,
                    className: 'notification-green',
                });
            })
            .catch((error) => {
                return notification.error({
                    message: 'Error',
                    description: `Error: Could not update tolerance data:  ${error}}`,
                    duration: 5,
                    className: 'notification-error',
                });
            });
    };

    const changeRemarksHandler = (event, feature) => {
        setIsDisable(false);
        toleranceData?.forEach((data) => {
            if (data.area_code === feature) {
                data.remarks = event.target.value;
            }
        });
        setToleranceData([...toleranceData]);
        let remarkState = setToleranceData;
        toleranceData?.forEach((item, index) => {
            if (item.key === feature) {
                remarkState[index].remarks = event.target.value;
            }
        });
        setToleranceData(remarkState);
    };

    const enableSearch = () => {
        setSearchCol(true);
    };

    const onSearch = (value) => {
        setSearchValue(value);
    };

    const resetPage = () => {
        setSearchValue('');
        setSearchCol(false);
    };

    const handleMultiUpdateClick = () => {
        setMultiUpdateModalVisible(true);
    };

    const handleMultiUpdateOk = (data) => {
        const classes = ['A', 'B', 'C'];
        const updatedTableData = [];
        tableData.forEach((row) => {
            if (data.areaCodes.includes(row.area_code)) {
                // Update the row with the new values
                classes.forEach((cls) => {
                    if (data.classes.includes(cls) && data.maxValues && data.minValues) {
                        row[`class_${cls.toLowerCase()}_max`] = data.maxValues[cls] || row[`class_${cls.toLowerCase()}_max`];
                        row[`class_${cls.toLowerCase()}_min`] = data.minValues[cls] || row[`class_${cls.toLowerCase()}_min`];
                    }
                });
                row.remarks = data.remarks;
                updatedTableData.push({
                    class_a_max: row.class_a_max,
                    class_b_max: row.class_b_max,
                    class_c_max: row.class_c_max,
                    class_a_min: row.class_a_min,
                    class_b_min: row.class_b_min,
                    class_c_min: row.class_c_min,
                    remarks: row.remarks,
                    id: row.id,
                });
            }
        });
        updateArsTolerance(updatedTableData)
            .then((response) => {
                fetchToleranceData();
                notification.success({
                    message: 'Success',
                    description: 'Tolerance data updated successfully',
                    duration: 5,
                    className: 'notification-green',
                });
            })
            .catch((error) => {
                notification.error({
                    message: 'Error',
                    description: 'Error updating tolerance data',
                    duration: 5,
                    className: 'notification-error',
                });
            });

        setTableData(updatedTableData);
        setToleranceData(updatedTableData);
        setMultiUpdateModalVisible(false);
    };

    const handleMultiUpdateCancel = () => {
        setMultiUpdateModalVisible(false);
    };

    return (
        <>
            <div className="btn-radio-wrapper">
                <div className="radio-grp-content">
                    <p>
                        <span id="customer-grp-p"> Customer Group: </span>
                        <Radio.Group onChange={(e) => setCustomerGroup(e.target.value)} value={customerGroup} id="radio-grp">
                            {customerGroupList.map((item, index) => (
                                <Radio key={item?.value} value={item.value}>
                                    {item.label}
                                </Radio>
                            ))}
                        </Radio.Group>
                    </p>
                </div>

                <div className="multi-update-ars" id="multi-update-button">
                    <button type="button" onClick={handleMultiUpdateClick}>
                        Multi Update
                    </button>
                    {multiUpdateModalVisible && (
                        <ToleranceMultiUpdate visible={multiUpdateModalVisible} onCancel={handleMultiUpdateCancel} onOk={handleMultiUpdateOk} tableData={tableData} />
                    )}
                </div>
            </div>

            <Loader>
                <div className="sn-table-container">
                    <table className="table-brand-variants">
                        <thead>
                            <tr>
                                <th className="sub-header">
                                    {searchCol ? (
                                        <SearchBox onReset={resetPage} onSearchChange={onSearch} value={searchValue} />
                                    ) : (
                                        <>
                                            Area Code
                                            <span id="area-code-search" className="colm-search-icon" onClick={enableSearch}>
                                                <SearchOutlined />
                                            </span>
                                        </>
                                    )}
                                </th>
                                {classArray?.map((c) => {
                                    return (
                                        <th key={c} className="sub-header">
                                            <span className="sub-header-text">{c}</span>
                                            <tr className="grid-container-row-2">
                                                <th className="grid-container-cell">
                                                    <Tooltip placement="bottom" title="Value should be +ve">
                                                        max(%)
                                                    </Tooltip>
                                                </th>
                                                <th className="grid-container-cell">
                                                    <Tooltip placement="bottom" title="Value should be -ve">
                                                        min(%)
                                                    </Tooltip>
                                                </th>
                                            </tr>
                                        </th>
                                    );
                                })}
                                <th className="sub-header">Last Updated By</th>
                                <th className="sub-header">Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData?.map((data) => {
                                return (
                                    <tr key={data.id}>
                                        <td className="center sn-padding">{data.area_code}</td>
                                        {Object.keys(toleranceObj).map((key, index) => {
                                            return (
                                                <td key={key} className="sub-header sn-padding">
                                                    <tr className="grid-container-row-2">
                                                        {toleranceObj[key].map((item_key, index) => {
                                                            return (
                                                                <td key={item_key} className="sn-padding center">
                                                                    {isEditable ? (
                                                                        <input
                                                                            id={`${data.id}_${item_key}`}
                                                                            className="value-text-fld"
                                                                            type="number"
                                                                            name={item_key}
                                                                            value={data[item_key]}
                                                                            onWheel={(e) => e.target.blur()}
                                                                            onChange={changeToleranceHandler}
                                                                        />
                                                                    ) : (
                                                                        data[item_key]
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                </td>
                                            );
                                        })}
                                        <td className="ao-header width15">
                                            {data.first_name && data.last_name && data.updated_by ? `${data.first_name} ${data.last_name} (${data.updated_by})` : data.updated_by}
                                        </td>
                                        <td className="remarks-value width20">
                                            {!isEditable ? (
                                                <>
                                                    {!data.remarks || data.remarks.trim().length === 0 ? (
                                                        '-'
                                                    ) : (
                                                        <Tooltip placement="left" title={data.remarks}>
                                                            {data.remarks}
                                                        </Tooltip>
                                                    )}
                                                </>
                                            ) : (
                                                <textarea
                                                    placeholder="Please enter your remarks (minimum 10 characters)"
                                                    onChange={(e) => changeRemarksHandler(e, data.area_code)}
                                                    disabled={data.disabled}
                                                />
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Loader>
            {!isSupportAdmin && (
                <div className="btn-wrapper">
                    <button type="button" onClick={editOrCancelSettingHandler} hidden={!hasEditPermission(pages.APP_SETTINGS)}>
                        {isEditable ? 'Cancel' : 'Edit'}
                    </button>
                    <button type="button" onClick={saveSettingHandler} disabled={isDisable} hidden={!hasEditPermission(pages.APP_SETTINGS)}>
                        Save
                    </button>
                </div>
            )}
        </>
    );
}

const mapDispatchToProps = (dispatch) => {
    return {
        getAllArsTolerance: (data) => dispatch(getAllArsTolerance(data)),
        updateArsTolerance: (data) => dispatch(updateArsTolerance(data)),
    };
};

export default connect(null, mapDispatchToProps)(Tolerance);
