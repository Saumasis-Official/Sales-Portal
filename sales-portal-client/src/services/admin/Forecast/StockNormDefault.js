import { connect } from 'react-redux';
import React, { useEffect, useState, useRef } from 'react';
import * as AdminActions from '../actions/adminAction';
import Util from '../../../util/helper/index.js';
import { notification, Popover } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import _ from 'lodash';
import './StockNormDefault.css';
import { pages, hasEditPermission } from '../../../persona/forecast';
import Loader from '../../../components/Loader/index.js';


const stockNormObj = {
    classA: {
        name: 'Class A',
        cycleStock: 'class_a_cs',
        safetyStock: 'class_a_ss_percent',
        stockNorm: 'class_a_sn'
    },
    classB: {
        name: 'Class B',
        cycleStock: 'class_b_cs',
        safetyStock: 'class_b_ss_percent',
        stockNorm: 'class_b_sn'
    },
    classC: {
        name: 'Class C',
        cycleStock: 'class_c_cs',
        safetyStock: 'class_c_ss_percent',
        stockNorm: 'class_c_sn'
    },
}

function StockNormDefault(props) {
    const { adjustment_timeline, getStockNormDefault, updateStockNormDefault, customerGroup } = props;
    const originalStockNorm = useRef([]);
    const [stockNorm, setStockNorm] = useState([]);
    const [enableViewComment, setEnableViewComment] = useState(false);
    const [editEnable, setEditEnable] = useState(false);
    const [canSave, setCanSave] = useState(false);

    useEffect(() => {
        fetchStockNormDefault(customerGroup);
    }, [customerGroup]);

    useEffect(() => {
        let isTimeLineOpen = false;
        switch (customerGroup) {
            case '10':
                isTimeLineOpen = adjustment_timeline.isTimelineOpenGtMetro
                break;
            case '31':
                isTimeLineOpen = adjustment_timeline.isTimelineOpenGtNonMetro
                break;
            case '48':
                isTimeLineOpen = adjustment_timeline.isTimelineOpenPragati
                break;
            default:
                isTimeLineOpen = adjustment_timeline.isTimelineOpenGtMetro
                break;
        }
        if (hasEditPermission(pages.STOCK_NORM_DEFAULT))
            setEditEnable(true);
    }, [adjustment_timeline]);

    function fetchStockNormDefault(customerGroup) {
        return getStockNormDefault(customerGroup)
            .then(res => {
                originalStockNorm.current = _.cloneDeep(res?.data?.data[0]);
                setStockNorm(res?.data?.data[0])
            })
    };

    function stockNormChangeHandler(e) {
        const { name, value } = e.target;
        let formattedValue = value;
        const stockNormCopy = _.cloneDeep(stockNorm);
        if (name.includes('ss_percent')) {
            if (formattedValue > 100)
                formattedValue = 100;
            else if (formattedValue < 0)
                formattedValue = 0;
        }
        stockNormCopy[name] = (Math.round(Math.abs(formattedValue))).toString();
        setStockNorm(stockNormCopy);
        (_.isEqual(stockNormCopy, originalStockNorm.current)) ? setCanSave(false) : setCanSave(true);
    };

    function resetHandler() {
        setStockNorm(_.cloneDeep(originalStockNorm.current));
        setCanSave(false);
    };

    function saveSettingHandler(e) {
        e.preventDefault();
        const updatedData = _.cloneDeep(stockNorm);
        delete updatedData.updated_at;
        delete updatedData.updated_by;
        delete updatedData.first_name;
        delete updatedData.last_name;

        updateStockNormDefault({
            customerGroup: customerGroup,
            update: updatedData
        }).then(response => {
            if (response?.data?.success === true) {
                notification.success({
                    message: 'Success',
                    description: 'App settings updated successfully',
                    duration: 2,
                    className: 'notification-green',
                });
                fetchStockNormDefault(customerGroup);
                setCanSave(false);
            } else {
                notification.error({
                    message: 'Error Occurred',
                    description: (response?.data?.message) ? response.data.message : 'Some error ocurred while updating stock norm default',
                    duration: 5,
                    className: 'notification-error',
                });
            }
        }).catch((error) => {
            notification.error({
                message: 'Technical Error',
                description: 'Some error ocurred while updating stock norm configurations',
                duration: 5,
                className: 'notification-error',
            });
        })

    };

    return (
        <Loader>
            <div>
                <div className='brand-variants-container sn-table-container'>
                    <table className='table-brand-variants'>
                        <thead>
                            <tr>
                                {Object.values(stockNormObj).map((item) => {
                                    return (
                                        <th key={item.name} className='sub-header'>
                                            <span className='sub-header-text'>{item.name}</span>
                                            <tr className='grid-container-row-sn-default'>
                                                <th className='grid-container-cell'>Safety Stock(%)</th>
                                                <th className='grid-container-cell'>Stock Norm(Days)</th>
                                            </tr>
                                        </th>
                                    );
                                })}
                                <th className='sub-header'>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr key={stockNorm.area_code}>
                                {Object.values(stockNormObj).map((item) => {
                                    return (
                                        <td key={item.safetyStock} className='sub-header sn-padding'>
                                            <tr key={item.stockNorm} className='grid-container-row-sn-default'>
                                                <td className='sn-padding'>
                                                    {editEnable ?
                                                        <input
                                                            type="number"
                                                            name={item.safetyStock}
                                                            className='sn-input'
                                                            max={100}
                                                            min={0}
                                                            onWheel={(e) => e.target.blur()}
                                                            value={stockNorm[item.safetyStock]}
                                                            onChange={(e) => stockNormChangeHandler(e)} />
                                                        :
                                                        stockNorm[item.safetyStock]}</td>
                                                <td className='sn-padding'>
                                                    {
                                                        // editEnable ?
                                                        //     <input
                                                        //         type="number"
                                                        //         name={item.stockNorm}
                                                        //         className='sn-input'
                                                        //         onWheel={(e) => e.target.blur()}
                                                        //         value={stockNorm[item.stockNorm]}
                                                        //         onChange={(e) => stockNormChangeHandler(e)} />
                                                        //     :
                                                            stockNorm[item.stockNorm]
                                                    }
                                                </td>
                                            </tr>
                                        </td>
                                    );
                                })}
                                <td className='admin-actions center'>
                                    <Popover
                                        content={
                                            <div className="time-details " >
                                                <p style={{ marginBottom: "5px" }}><b><i>Last Updated by:</i></b> {stockNorm.first_name ? `${stockNorm.first_name} ${stockNorm.last_name}` : null} ({stockNorm.updated_by})</p>
                                                <p style={{ marginBottom: "5px" }}><b><i>Last Updated on:</i></b> {Util.formatDate(stockNorm.updated_at)} {Util.formatTime(stockNorm.updated_at)}</p>
                                            </div>}
                                        title=""
                                        trigger="hover"
                                        placement="leftBottom"
                                        open={enableViewComment}
                                        onOpenChange={(newOpen) => setEnableViewComment(newOpen)}
                                    >
                                        <HistoryOutlined />
                                    </Popover>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                {stockNorm &&
                    <>
                    {/* <span className='audit-trail'>Changes made in stock norm will be effective from next month onwards.</span> */}
                        <span className='audit-trail'>Changes made in safety stock will be effective immediately.</span>
                        <div className='btn-wrapper'>
                            <button type='button' onClick={resetHandler} disabled={!editEnable || !canSave}>Reset</button>
                            <button type='button' onClick={saveSettingHandler} disabled={!editEnable || !canSave}>Save</button>
                        </div>
                    </>}
            </div>
        </Loader>
    )
}

const mapStateToProps = (state) => ({
    adjustment_timeline: state.admin.get('adjustment_timeline'),
});

const mapDispatchToProps = (dispatch) => ({
    getStockNormDefault: (customerGroup) => dispatch(AdminActions.getStockNormDefault(customerGroup)),
    updateStockNormDefault: (data) => dispatch(AdminActions.updateStockNormDefault(data)),
});

export default connect(mapStateToProps, mapDispatchToProps)(StockNormDefault);