import React, { useState, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import { Checkbox, Col, notification, Row, Select, Popconfirm, Tooltip, Modal } from 'antd';
import { DeleteOutlined, PlusOutlined, SyncOutlined, SaveOutlined, EyeOutlined } from '@ant-design/icons';
import _ from 'lodash';
import Util from '../../../util/helper';
import { NO_DATA_SYMBOL } from '../../../constants/index';
import * as AdminActions from '../actions/adminAction';
import './SoqNorm.css';
import { pages, hasEditPermission } from '../../../persona/forecast';
import '../PDPUnlockRequest/DistributorDetailsModal.css';


const SoqNorm = (props) => {
    const {
        upsertSoqNorms,
        fetchSoqNorms,
        fetchSoqNormDivisionList,
        deleteSoqNorm,
        isLoading,
    } = props;


    //--------------------------------=====useState====-------------------------------
    const [tableData, setTableData] = useState([]);
    const [expandedRow, setExpandedRow] = useState(null);
    const [divisionList, setDivisionList] = useState([]);
    const [existingDivision, setExistingDivision] = useState([]);
    const [disableAdd, setDisableAdd] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [pskuTotals, setPskuTotals] = useState([]);

    //--------------------------------=====useRef====-------------------------------
    const sortDirection = useRef(true);

    //--------------------------------=====useEffect====-------------------------------

    useEffect(() => {
        getTableData();
        getDivisionList();
    }, []);

    useEffect(() => {
        let isDisableAdd = false;
        for (let item of tableData) {
            if (item.division == '' && item.forecast == 0) {
                isDisableAdd = true
                break
            }
        }
        setDisableAdd(isDisableAdd)
    }, [tableData])

    //--------------------------------=====API Calls=====------------------------------

    async function getTableData() {
        const response = await fetchSoqNorms();
        if (response?.success) {
            const tempResponse = response.data;
            tempResponse.forEach(item => {
                item.slabs?.sort((a, b) => (a.min - b.min))
            })
            setTableData(tempResponse);
            setExistingDivision(response.data.map(i => +i.division));
        } else {
            Util.notificationSender("Error", "Error in fetching data");
        }

    }

    async function getDivisionList() {
        const response = await fetchSoqNormDivisionList();
        if (response?.success) {
            setDivisionList(response.data);
        }
    }

    async function saveData(payload) {
        const res = await upsertSoqNorms(payload);
        if (res.success)
            Util.notificationSender("Success", "Data Saved Successfully", "success");
        else
            Util.notificationSender("Error", "Error in saving data");
        getTableData();
    }

    async function deleteData(payload) {
        const res = await deleteSoqNorm(payload);
        if (res.success)
            Util.notificationSender("Success", "Data Deleted Successfully", "success");
        else
            Util.notificationSender("Error", "Error in deleting data");
        getTableData();
    }

    //--------------------------------======Helpers=====--------------------------------------

    function validateData(data) {
        /**
         * VALIDATION APPLIED:
         * 1. Min value should be less than max value( if max value is not -999)
         * 2. Max value should be > 0
         * 3. SOQ value should be +ve integer
         */
        let isValid = true;
        const validationError = new Set();
        data?.forEach(i => {
            for (let s of i.slabs) {
                if (s.min != 0 && s.max == s.min) {
                    continue;
                }
                if (s.max !== -999 && s.max <= s.min) {
                    isValid = false;
                    validationError.add("Max value should be greater than min value for division " + i.division)
                }
                if (s.max <= 0 && s.max !== -999) {
                    isValid = false;
                    validationError.add("Max value should be greater than 0 for division " + i.division)
                }
                if (!Number.isInteger(s.soq) || s.soq < 0) {
                    isValid = false;
                    validationError.add("SOQ value should be positive integer for division " + i.division)
                }
            };
        });
        if (!isValid) {
            Util.notificationSender('Error', Array.from(validationError).join('\n'), false, 5)
        }
        return isValid;
    }

    function sortColumn(columnName) {
        sortDirection.current = !sortDirection.current;
        const temp = _.cloneDeep(pskuTotals);
        if (sortDirection.current) {
            temp.sort((a, b) => {
                let comparison = 0;
                if (a[columnName] < b[columnName]) {
                    comparison = -1;
                }
                if (a[columnName] > b[columnName]) {
                    comparison = 1;
                }
                if (!b[columnName]) {
                    comparison = -1;
                }
                return comparison;
            });
        } else {
            temp.sort((a, b) => {
                let comparison = 0;
                if (a[columnName] < b[columnName]) {
                    comparison = -1;
                }
                if (a[columnName] > b[columnName]) {
                    comparison = 1;
                }
                if (!b[columnName]) {
                    comparison = 1;
                }
                return comparison * -1;
            });
        }
        setPskuTotals(temp)
    }

    //--------------------------------=====Event Handlers=====---------------------------------
    function onSlabChange(change, divisionIndex) {
        const temp = tableData;
        temp[divisionIndex].slabs = change;
        setTableData(_.cloneDeep(temp))
    }

    function onSaveHandler() {
        const payload = [];
        tableData?.forEach(i => {
            i.slabs?.forEach(s => {
                payload.push(
                    {
                        range_min: s.min,
                        range_max: s.max,
                        quantity: s.soq,
                        division: i.division
                    }
                )
            });
        });
        if (validateData(tableData))
            saveData({ data: payload });
    }

    function onDivisionAddHandler() {
        const temp = tableData;
        temp.push({
            division: '',
            division_name: '',
            forecast: 0,
            isNewlyAdded: true,
            slabs: [
                {
                    min: 0,
                    max: 0,
                    soq: 0
                }
            ]
        });
        setTableData(_.cloneDeep(temp));
        // setDisableAdd(true);
    }

    function onDivisionSelection(value) {
        const selectedDivision = divisionList.find(i => i.division === value);
        const temp = tableData[tableData.length - 1];
        temp['division'] = value;
        temp['division_name'] = selectedDivision?.division_description;
        temp['forecast'] = selectedDivision?.forecast;
        temp['psku_totals'] = selectedDivision?.psku_totals;
        const tempDivision = [...existingDivision];
        tempDivision.push(value)
        setExistingDivision(_.cloneDeep(tempDivision));
        setTableData(_.cloneDeep(tableData));
        setDisableAdd(false);
    }

    function onDeleteDivisionHandler(division, item, index) {
        const tempDivision = [...existingDivision];
    
        if (item.isNewlyAdded) {
            setTableData(tableData.filter((_, idx) => idx !== index));
            const updatedExistingDivision = tempDivision.filter(div => div !== division);
            setExistingDivision(updatedExistingDivision);
        } else {
            tempDivision.splice(tempDivision.indexOf(division), 1);
            setExistingDivision(tempDivision);
            division && deleteData(division);
        }
    }

    function onResetHandler() {
        getTableData();
        setDisableAdd(false);
    }

    function showPskuTotal(psku_totals) {
        setIsModalVisible(true);
        setPskuTotals(psku_totals);
    }

    return (
        <>
            <div className="n-card-h table-header-options">
                <Tooltip title="Reset to last saved state" placement='bottom'>
                    <button className='reset-button' onClick={onResetHandler} >
                        <SyncOutlined spin={isLoading} /> Reset
                    </button>
                </Tooltip>
                <button className='save-all-button' onClick={onSaveHandler}
                    disabled={!(hasEditPermission(pages.STOCK_NORM))}
                >
                    <Tooltip title="Save" placement='bottom'>
                        <SaveOutlined /> Save
                    </Tooltip>
                </button>
                <button
                    className='addmore-button'
                    onClick={onDivisionAddHandler}
                    disabled={disableAdd}
                >
                    {disableAdd ?
                        <Tooltip title="Add New Item Disabled" placement='bottom'>
                            <img
                                src="/assets/images/add-order-disabled.svg"
                                alt="Add New Item" />
                        </Tooltip>
                        :
                        <Tooltip title="Add New Item" placement='bottom'>
                            <img
                                src="/assets/images/add-order.svg"
                                alt="Add New Item" />
                        </Tooltip>
                    }
                </button>
            </div>
            <div className="brand-variants-container sn-table-container soq-norm-margin">
                <table className='table-brand-variants'>
                    <thead>
                        <tr>
                            <th></th>
                            <th>Division</th>
                            <th>Division Name</th>
                            <th>Total forecast {tableData[0]?.applicable_month && `of ${Util.applicableMonthToMonthYearString(tableData[0].applicable_month)}`} (CV)</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData?.map((item, index) => {
                            return (
                                <>
                                    <tr key={item.division}>
                                        <td>
                                            <button
                                                className='collapse-button-audit'
                                                onClick={() => setExpandedRow(expandedRow === item.division ? null : item.division)}
                                            >
                                                {expandedRow === item.division ? '-' : '+'}
                                            </button>
                                        </td>
                                        <td className='center'>{
                                            item.division ?
                                                item.division
                                                : <Select
                                                    className='width120px'
                                                    options={divisionList?.sort((a, b) => (a.division - b.division))?.map(i => ({ value: i.division, label: i.division, disabled: existingDivision?.includes(i.division) }))}
                                                    onChange={onDivisionSelection}
                                                />
                                        }</td>
                                        <td className='center'>{
                                            item.division_name ?
                                                item.division_name
                                                : <Select
                                                    className='width120px'
                                                    options={divisionList?.sort((a, b) => (a.division_description - b.division_description))?.map(i => ({ value: i.division, label: i.division_description, disabled: existingDivision?.includes(i.division) }))}
                                                    onChange={onDivisionSelection}
                                                />
                                        }</td>
                                        <td className='center'>{item.forecast}</td>
                                        <td className='center'>
                                            {item.isNewlyAdded ?
                                                <i className='info-icon' onClick={() => onDeleteDivisionHandler(item.division, item, index)}><DeleteOutlined /></i>
                                                :
                                                <Popconfirm
                                                    title="Are you sure to delete this rule?"
                                                    onConfirm={() => onDeleteDivisionHandler(item.division, item, index)}
                                                    // onCancel={cancel}
                                                    okText="Yes"
                                                    cancelText="No"
                                                >
                                                    <i className='info-icon'><DeleteOutlined /></i>
                                                </Popconfirm>
                                            }
                                            <i className='info-icon' onClick={() => showPskuTotal(item.psku_totals)}><EyeOutlined /></i>
                                        </td>
                                    </tr>
                                    {expandedRow === item.division &&
                                        <SubTable
                                            slabs={item.slabs}
                                            onSlabChange={(change) => onSlabChange(change, index)}
                                        />

                                    }
                                </>
                            )
                        })}
                        {tableData.length === 0 &&
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center' }}>
                                    No Data Available
                                </td>
                            </tr>
                        }
                    </tbody>
                </table>
            </div>
            <div className='distributor-container'>


                <Modal
                    maskStyle={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
                    wrapClassName="comment-modal"
                    className="distributor-details-modal"
                    bodyStyle={{ padding: '10px' }}
                    width={800}
                    title="PSKU Total"
                    visible={isModalVisible}
                    footer={null}
                    onCancel={() => { setIsModalVisible(false); setPskuTotals([]); }}
                >
                    <div className="distributor-table-header">
                        <table className='distributor-table'>
                            <thead>
                                <tr className="form-wrapper ">
                                    <th onClick={() => sortColumn('psku')}>PSKU&nbsp;
                                        <img
                                            src="/assets/images/sorting_icon.svg"
                                            alt=""
                                        /></th>
                                    <th onClick={() => sortColumn('description')}>PSKU Description&nbsp;
                                        <img
                                            src="/assets/images/sorting_icon.svg"
                                            alt=""
                                        /></th>
                                    <th onClick={() => sortColumn('forecast_cs')}>Total Forecast(CV)&nbsp;
                                        <img
                                            src="/assets/images/sorting_icon.svg"
                                            alt=""
                                        /></th>
                                </tr>
                            </thead>
                            <tbody>
                                {pskuTotals?.map(i => {
                                    return (
                                        <tr className="form-wrapper">
                                            <td>{i.psku}</td>
                                            <td>{i.description}</td>
                                            <td>{i.forecast_cs}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                </Modal>
            </div>
        </>
    )
};

function SubTable(props) {
    const { slabs, onSlabChange } = props;

    //--------------------------------=====useState====-------------------------------
    const [slabData, setSlabData] = useState(slabs);
    //--------------------=====useEffect====---------------------
    useEffect(() => {
        setSlabData(_.cloneDeep(slabs));
    }, [slabs]);


    //-------------------------------======Helpers=====----------------------
    //--------------------------------=====Event Handlers=====---------------------------------

    function onCheckHandler(e) {
        const temp = slabs;
        if (e.target.checked) {
            temp[temp.length - 1].max = -999;
        } else {
            temp[temp.length - 1].max = 0;
        }
        onSlabChange(temp);
        setSlabData(_.cloneDeep(temp));
    };

    function addNextSlab() {
        const temp = slabs;
        temp.push({
            min: temp[temp.length - 1].max + 1,
            max: 0,
            soq: 0
        });
        onSlabChange(temp);
        setSlabData(_.cloneDeep(temp));
    }

    function onValueChange(e, index = null) {
        const temp = slabs;
        const idx = index != null ? index : slabs.length - 1;
        let value = e.target.value;
        let key = e.target.name;
        value = isNaN(value) ? 0 : +value
        value = Math.round(value)
        value = Util.removeLeadingZeros(value);
        temp[idx][key] = +value;
        onSlabChange(temp, idx);
        setSlabData(_.cloneDeep(temp));
    }

    function validateInput(e) {
        const temp = slabs;
        const index = slabs.length - 1;
        if (temp[index]['max'] < temp[index]['min']) {
            notification.error({
                message: 'Error',
                description: 'Max value should be greater than min value',
                duration: 5,
                className: 'notification-error'
            });
        }
    }

    function deleteSlab() {
        const temp = slabs;
        temp.pop();
        if (temp.length == 0) {
            temp.push({
                min: 0,
                max: 0,
                soq: 0
            })
        }
        onSlabChange(temp);
        setSlabData(_.cloneDeep(temp));
    }



    return (
        <tr className='snc-table-tr' >
            <td colSpan={5} className='sub-table-background'>
                <table className='snc-table table-brand-variants soq-norm-sub'>
                    <thead>
                        <th>Forecast(CV)</th>
                        <th className='sub-header'>SOQ(CV)</th>
                        <th className='sub-header width15'>Action</th>
                    </thead>
                    <tbody>
                        {slabData?.map((item, index) => {
                            return (
                                <tr>
                                    <td>
                                        <Row>
                                            <Col span={10}>
                                                {item.min > 0 ? item.min - 1 : item.min}
                                            </Col>
                                            <Col span={2}>
                                                {NO_DATA_SYMBOL}
                                            </Col>
                                            <Col span={12}>
                                                {index !== slabData?.length - 1 ?
                                                    item.max
                                                    : <input
                                                        name='max'
                                                        className='qty-input'
                                                        value={item.max}
                                                        hidden={item.max === -999}
                                                        disabled={index !== slabData?.length - 1}
                                                        onChange={onValueChange}
                                                        onBlur={validateInput}
                                                    />
                                                }

                                                {index === slabData?.length - 1 &&
                                                    <Checkbox
                                                        checked={item.max === -999}
                                                        onChange={onCheckHandler}
                                                    >
                                                        Above
                                                    </Checkbox>
                                                }
                                            </Col>
                                        </Row>
                                    </td>
                                    <td>
                                        <input
                                            name='soq'
                                            // type="number"
                                            className='qty-input'
                                            value={item.soq}
                                            onChange={(e) => onValueChange(e, index)}
                                        />
                                    </td>
                                    <td className='width15'>
                                        {index === slabData?.length - 1 &&
                                            <>
                                                {(item.max !== -999 && item.max !== 0 && item.max >= item.min) &&
                                                    <i
                                                        className='info-icon'
                                                        onClick={addNextSlab}
                                                    >
                                                        <PlusOutlined />
                                                    </i>
                                                }
                                                <i
                                                    className='info-icon'
                                                    onClick={deleteSlab}
                                                >
                                                    <DeleteOutlined />
                                                </i>

                                            </>
                                        }
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </td>
        </tr>
    )
}


const mapStateToProps = (state) => {
    return {
        isLoading: state.loader.isLoading
    }
}
const mapDispatchToProps = (dispatch) => {
    return {
        upsertSoqNorms: (data) => dispatch(AdminActions.upsertSoqNorms(data)),
        fetchSoqNorms: () => dispatch(AdminActions.fetchSoqNorms()),
        fetchSoqNormDivisionList: () => dispatch(AdminActions.fetchSoqNormDivisionList()),
        deleteSoqNorm: (data) => dispatch(AdminActions.deleteSoqNorm(data)),
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(SoqNorm);