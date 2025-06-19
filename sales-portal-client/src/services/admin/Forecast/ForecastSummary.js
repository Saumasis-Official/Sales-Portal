import React, { useEffect, useState } from 'react';
import { Select, notification, Tooltip } from 'antd';
import { connect } from 'react-redux';
import * as AdminActions from '../actions/adminAction';
import Util from '../../../util/helper/index.js';
import '../../../style/admin/Dashboard.css';
import './ForecastSummary.css';
import Loader from '../../../components/Loader';
import { pages, hasEditPermission } from '../../../persona/forecast';
import { NO_DATA_SYMBOL } from '../../../constants/index.js';
import _ from 'lodash';

const ForecastSummary = (props) => {
    const browserHistory = props.history;
    const { data, areaCode, last_forecast_date, getLastForecastDate, quantityNormMode, onChangeQuantityNorms, timelineEditEnable, forecastDelta, forecastEndMonth } = props;
    const [tableData, setTableData] = useState([]);
    const [mTotal, setMTotal] = useState([0.0, 0.0, 0.0, 0.0]);
    const [applicableMonthYearName, setApplicableMonthYearName] = useState([]);
    const [applicableMonthYear, setApplicableMonthYear] = useState([]);
    const [updatedValues, setUpdatedValues] = useState({});
    const [editEnable, setEditEnable] = useState(false);
    const [forecastmonth, setForecastMonth] = useState('');

    useEffect(() => {
        const monthData = forecastEndMonth ? Util.fetchMonths(forecastEndMonth, forecastDelta) : Util.applicableYearMonths(last_forecast_date?.forecast_month);
        if (!monthData) return;
        setApplicableMonthYearName([...monthData?.monthNames]);
        setApplicableMonthYear([...monthData?.monthYear]);
    }, [forecastEndMonth, forecastDelta]);

    useEffect(() => {
        setTableData(data);
        const tempMTotal = [];
        tempMTotal[0] = data?.reduce((a, v) => (a = a + parseFloat(v.forecast)), 0).toFixed(2);
        applicableMonthYearName?.slice(0, forecastDelta)?.forEach((month, index) => {
            const monthlyData = data?.reduce((a, v) => (a = a + parseFloat(v[`month_${index + 1}`])), 0).toFixed(2);
            tempMTotal.push(monthlyData);
        });
        setMTotal(tempMTotal);
        const temp = {};
        data?.forEach((item) => {
            if (+item?.quantity_norm > 0) temp[item.parent_sku] = item?.quantity_norm;
        });
        setUpdatedValues(temp);
    }, [data, applicableMonthYearName]);

    useEffect(() => {
        getLastForecastDate({ areaCode: areaCode });
    }, [areaCode]);

    useEffect(() => {
        const timelineOpen = timelineEditEnable?.some((i) => i === true);
        if (timelineOpen && hasEditPermission(pages.QUANTITY_NORM)) {
            setEditEnable(true);
        }
    }, [timelineEditEnable]);

    useEffect(() => {
        const applicableYearMonths = Util.applicableYearMonths(last_forecast_date?.forecast_month);
        if (applicableYearMonths) setForecastMonth(applicableYearMonths.monthNames.at(-1));
    }, [last_forecast_date]);

    function onQuantityNormChange(e) {
        const { name } = e.target;
        const [psku, buom_to_cs] = name.split('#');
        let value = e.target.value;
        value = Math.round(value);
        value = Util.removeLeadingZeros(value);
        const temp = { ...updatedValues };
        temp[psku] = _.round(+value * (buom_to_cs || 1), 2);
        setUpdatedValues(temp);
        onChangeQuantityNorms(temp);
    }

    return (
        <>
            <div className="brand-variants-container" style={{ overflow: 'auto' }}>
                <Loader>
                    <table className="table-brand-variants quantity-norm-table" style={{ minWidth: `${360 + (forecastDelta + 1) * 130}px` }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid white' }}>
                                {quantityNormMode ? (
                                    <>
                                        <th></th>
                                        <th colSpan={forecastDelta + 1} className="top-header">
                                            Sales Volume (in BUOM)
                                        </th>
                                        <th className="top-header">Quantity Norm For Each Distributor</th>
                                    </>
                                ) : (
                                    <th colSpan={forecastDelta > 3 ? 5 + (forecastDelta - 3) : 5} className="top-header">
                                        Sales Volume (in BUOM)
                                    </th>
                                )}
                            </tr>
                            <tr>
                                <th className="brand-variants-header summary-psku-desc">PSKU Description</th>
                                {applicableMonthYearName.slice(0, forecastDelta).map((month, index) => {
                                    return <th className={`brand-variants-header ${quantityNormMode && index === 0 ? 'top-header' : ''} summary-sales-cols`}>{month}</th>;
                                })}
                                <th className="brand-variants-header summary-sales-cols">Forecast for {forecastmonth}</th>
                                {quantityNormMode && (
                                    <th className="brand-variants-header top-header summary-sales-cols">
                                        <tr>
                                            <th className="width50">CV</th>
                                            <th className="width50">BUOM</th>
                                        </tr>
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {tableData?.length > 0 && (
                                <>
                                    {tableData.map((item, index) => {
                                        return (
                                            <tr key={index}>
                                                <td
                                                    className="brand-variants-body"
                                                    style={{
                                                        textAlign: 'left',
                                                        paddingLeft: '15px',
                                                    }}>
                                                    <button
                                                        type="button"
                                                        className="link-button"
                                                        disabled={quantityNormMode}
                                                        onClick={() => {
                                                            browserHistory.push({
                                                                pathname: '/admin/forecast',
                                                                state: {
                                                                    areaCode: areaCode,
                                                                    brandVariantCode: item.parent_sku,
                                                                    pskuClass: item.psku_class,
                                                                    applicableMonthName: applicableMonthYearName,
                                                                    applicableMonthYear: applicableMonthYear,
                                                                    forecastDelta: forecastDelta,
                                                                },
                                                            });
                                                        }}>
                                                        {item.parent_desc}
                                                    </button>
                                                </td>
                                                {applicableMonthYearName.slice(0, forecastDelta).map((month, index) => {
                                                    return <td className="brand-variants-body summary-sales-cols">{Math.round(item[`month_${index + 1}`])}</td>;
                                                })}
                                                <td className="brand-variants-body highlight1 summary-sales-cols">{item.forecast}</td>
                                                {quantityNormMode && (
                                                    <td className="brand-variants-body summary-sales-cols qantity-norm-cv-buom">
                                                        <tr>
                                                            <td className="width50">
                                                                {!editEnable ? (
                                                                    <div style={{ width: '50px' }}>
                                                                        {(Math.round(updatedValues[item.parent_sku] / +(item.buom_to_cs || 1)) || 0) ?? NO_DATA_SYMBOL}
                                                                    </div>
                                                                ) : (
                                                                    <input
                                                                        type="number"
                                                                        name={`${item.parent_sku}#${item.buom_to_cs}`}
                                                                        className="qty-input"
                                                                        onWheel={(e) => e.target.blur()}
                                                                        disabled={!editEnable}
                                                                        onChange={onQuantityNormChange}
                                                                        value={Util.removeLeadingZeros(Math.round(updatedValues[item.parent_sku] / +(item.buom_to_cs || 1))) || 0}
                                                                    />
                                                                )}
                                                            </td>
                                                            <td className="width50">{updatedValues[item.parent_sku] || 0}</td>
                                                        </tr>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                    <tr>
                                        <td className="total summary-psku-desc">Total</td>
                                        {applicableMonthYearName.slice(0, forecastDelta).map((month, index) => {
                                            return <td className="total summary-sales-cols">{Math.round(mTotal[index + 1])}</td>;
                                        })}
                                        <td className="total summary-sales-cols">{[_.round(mTotal[0], 2)]}</td>
                                        {quantityNormMode && <td className="total summary-sales-cols">{NO_DATA_SYMBOL}</td>}
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                    {!(tableData?.length > 0) && <div style={{ textAlign: 'center' }}>No data available</div>}
                </Loader>
            </div>
        </>
    );
};

const mapStateToProps = (state) => {
    return {
        // pdp_req_list: state.admin.get('pdp_update_requests'),
        last_forecast_date: state.admin.get('last_forecast_date'),
    };
};
const mapDispatchToProps = (dispatch) => {
    return {
        getRegionalBrands: (data) => dispatch(AdminActions.getRegionalBrands(data)),
        getLastForecastDate: (data) => dispatch(AdminActions.getLastForecastDate(data)),
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(ForecastSummary);
