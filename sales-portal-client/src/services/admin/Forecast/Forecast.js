import React, { useEffect, useRef, useState } from 'react';
import { connect } from 'react-redux';
import BrandVariantsModal from './BrandVariantsModal';
import '../../../style/admin/Dashboard.css';
import './Forecast.css';
import { Select, notification, Tooltip } from 'antd';
import * as Actions from '../actions/adminAction';
import Util from '../../../util/helper/index.js';
import Loader from '../../../components/Loader';
import ExportForecastDataToExcel from './ExportForecastDataToExcel';
import _ from 'lodash';
import { pages, hasEditPermission } from '../../../persona/forecast.js';
import { NO_DATA_SYMBOL } from '../../../constants/index.js';

let Forecast = (props) => {
    /*
     * the page should act like an excel sheet, fully capable to operate using tab, arrow and enter key
     * there must be a popup to warn unsaved changes
     */

    //local variables
    const browserHistory = props.history;

    const { getMaintenanceRequests, getPSKUList, getForecast, updateForecast, last_forecast_date, adjustment_timeline } = props;
    const distributorCount = useRef(0);
    const areaCode = useRef(0);
    const updatedValue = useRef([]);
    const originalData = useRef();

    //state variables
    const [isBrandVariantModalOpen, setIsBrandVariantModalOpen] = useState(false);
    const [brandVariantModalData, setBrandVariantModalData] = useState();
    const [pskuList, setPskuList] = useState([]);
    const [pskuCode, setPskuCode] = useState();
    const [forecastData, setForecastData] = useState([]);
    const [difference, setDifference] = useState(0);
    const [applicableMonthYear, setApplicableMonthYear] = useState([]);
    const [applicableMonthYearName, setApplicableMonthYearName] = useState([]);
    const [isEdit, setIsEdit] = useState(true);
    const [auditTrail, setAuditTrail] = useState();
    const [isTImelineOpen, setIsTimelineOpen] = useState(false);
    const [canSave, setCanSave] = useState(false);
    const [exportedList, setExportedList] = useState([]);
    const [canDownload, setCanDownload] = useState(false);
    const [forecastDelta, setForecastDelta] = useState(3);

    const originalAdjustedForecast = useRef({});

    // const recommendedForecastTotal = useRef({
    //     suggestedForecast: 0,
    //     adjustedForecast : 0,
    // });

    //useEffects
    useEffect(() => {
        // getMaintenanceRequests();
        setPskuCode(props?.location?.state?.brandVariantCode);
        areaCode.current = props?.location?.state?.areaCode;
        setForecastDelta(props?.location?.state?.forecastDelta);
        setApplicableMonthYearName(props?.location?.state?.applicableMonthName);
        setApplicableMonthYear(props?.location?.state?.applicableMonthYear);
        getPSKUList({ areaCode: areaCode.current })
            .then((response) => {
                setPskuList(response?.data?.data?.rows);
            })
            .catch((error) => {});
        calculateTotal('recommended_forecast');
    }, []);

    // useEffect(() => {
    //     const monthData = Util.applicableYearMonths(last_forecast_date?.forecast_month);
    //     setApplicableMonthYear([...monthData?.monthYear]);
    //     setApplicableMonthYearName([...monthData?.monthNames]);
    // }, [last_forecast_date]);

    useEffect(() => {
        let exported_list = {};
        exported_list['psku'] = pskuCode;
        exported_list['data'] = forecastData?.map((o) => {
            let res = {
                distributor_code: o.distributor_code,
                distributor_name: o.distributor_name,
                status: o.status,
                recommended_forecast: o.recommended_forecast,
                adjusted_forecast: o.adjusted_forecast,
                updated_on: o.updated_on,
                customer_group: o.customer_group,
                customer_group_description: o.customer_group_description,
            };
            res['month_names'] = applicableMonthYearName.slice(0, forecastDelta).map((monthName) => monthName);
            res['month_sales'] = applicableMonthYear.slice(0, forecastDelta)?.map((yearMonth) => findValue(yearMonth, o.distributor_code));
            return res;
        });
        setExportedList(exported_list);
        if (difference === 0) setCanDownload(true);
        else setCanDownload(false);
    }, [forecastData, pskuCode, applicableMonthYear, applicableMonthYearName]);

    useEffect(() => {
        getForecastDetails();
    }, [areaCode.current, pskuCode]);

    useEffect(() => {
        if (Object.keys(adjustment_timeline).some((cg) => adjustment_timeline[cg]?.editEnable) && hasEditPermission(pages.FORECAST_DASHBOARD)) setIsTimelineOpen(true);
    }, [adjustment_timeline]);

    const getForecastDetails = () => {
        areaCode.current &&
            pskuCode &&
            getForecast({ areaCode: areaCode.current, brandVariantCode: pskuCode })
                .then((response) => {
                    const { rows, rowCount, firstName, lastName } = response?.data?.data;
                    setForecastData(rows);
                    originalAdjustedForecast.current = rows.reduce((acc, item) => {
                        acc[item.distributor_code] = item.adjusted_forecast;
                        return acc;
                    }, {});
                    distributorCount.current = rowCount;
                    const lastUpdateBy = {
                        firstName: firstName || 'PORTAL',
                        lastName: lastName,
                        dateTime: `${Util.formatDate(rows[0]?.updated_on)}, ${Util.formatTime(rows[0]?.updated_on)}`,
                    };
                    setAuditTrail(lastUpdateBy);
                    originalData.current = _.cloneDeep(response?.data?.data?.rows);
                    updatedValue.current = [];
                    response?.data?.data?.rows?.forEach((item) => {
                        updatedValue.current.push({
                            sales_allocation_key: item.key,
                            distributorCode: item.distributor_code,
                            updated_allocation: +item.adjusted_forecast,
                            pskuClass: item.class,
                        });
                    });
                })
                .catch((error) => {
                    notification.error({
                        message: 'Technical Error',
                        description: `Some error ocurred while fetching forecast data [${error}]`,
                        duration: 5,
                        className: 'notification-error',
                    });
                });
    };

    const openBrandVariantModal = () => {
        let data = {
            dbName: 'DISTRIBUTOR A',
            dbCode: '000000',
            brandName: 'Chakra',
            tableData: [
                { SKU: '1000023', SKU_Name: 'Chakra Gold', qty_m0: '17.1', qty_m1: '12', qty_m2: '16.5', qty_m3: '14.2' },
                { SKU: '1000027', SKU_Name: 'Chakra Platinum', qty_m0: '27.8', qty_m1: '20.3', qty_m2: '26.5', qty_m3: '18.2' },
                { SKU: '1000025', SKU_Name: 'Chakra Silver', qty_m0: '30.4', qty_m1: '29.2', qty_m2: '26.6', qty_m3: '22.9' },
            ],
        };
        setBrandVariantModalData(data);
        setIsBrandVariantModalOpen(true);
    };

    const closeBrandVariantModal = () => {
        setIsBrandVariantModalOpen(false);
        setBrandVariantModalData();
    };

    const onChangeQuantityHandler = (e) => {
        const { id, value } = e.target;
        const qtyArr = [...forecastData];
        const regex = /\b\d+\.\d{3,}\b/; //To allow decimal numbers upto 2 places
        if (isNaN(value) || regex.test(value)) return;
        qtyArr[id].adjusted_forecast = parseFloat(value) < 0 || value === '' ? 0 : value.includes('.') ? value : parseFloat(value);
        const isAdjusredForecastModified = qtyArr.some((item) => {
            return item.adjusted_forecast != originalAdjustedForecast.current[item.distributor_code];
        });
        isAdjusredForecastModified ? setCanSave(true) : setCanSave(false);

        updatedValue.current?.forEach((item) => {
            if (item.distributorCode === qtyArr[id].distributor_code) {
                item.updated_allocation = qtyArr[id].adjusted_forecast;
            }
        });
        setForecastData([...qtyArr]);
        calcDiff();
    };

    const calcDiff = () => {
        //SOPE-3535: Removing the check for total mismatch at PSKU level
        setDifference(0);
        // const recommendedTotal = calculateTotal("recommended_forecast");
        // const adjustedTotal = calculateTotal("adjusted_forecast");
        // if (+recommendedTotal === 0)
        //     setDifference(0)
        // else
        //     setDifference((Number(adjustedTotal) - Number(recommendedTotal)).toFixed(2));
    };

    const onKeyDownHandler = (e) => {
        const isInputField = !e.target.id?.includes('detail');
        const isDetailField = e.target.id?.includes('detail-');
        if (e.code === 'ArrowUp' || (e.shiftKey && e.key === 'Tab')) {
            e.preventDefault();
            if (Number(e.target.id) - 1 >= 0) {
                document.getElementById(`${Number(e.target.id) - 1}`)?.focus();
            } else {
                document.getElementById(`${distributorCount.current - 1}`)?.focus();
            }
        } else if (isInputField && (e.code === 'NumpadEnter' || e.code === 'Enter' || e.code === 'ArrowDown' || e.code === 'Tab')) {
            e.preventDefault();
            if (Number(e.target.id) + 1 < distributorCount.current) {
                document.getElementById(`${Number(e.target.id) + 1}`)?.focus();
            } else {
                document.getElementById('0').focus();
            }
        } else if (isDetailField && (e.code === 'NumpadEnter' || e.code === 'Enter')) {
            openBrandVariantModal(e);
        }
    };

    const calculateTotal = (data) => {
        let total = 0;
        if (data === 'recommended_forecast' || data === 'adjusted_forecast') {
            forecastData?.forEach((forecast) => {
                total += +forecast[data];
            });
            // recommendedForecastTotal.current[data] = total;
        } else {
            forecastData?.forEach((forecast) => {
                forecast?.sales_value?.forEach((value) => {
                    if (value.yearMonth === data) {
                        total += Number(Math.round(value.sales_qty));
                    }
                });
            });
        }
        return +total.toFixed(2);
    };

    const findValue = (yearMonth, distributor_code) => {
        for (const data of forecastData) {
            if (data.distributor_code === distributor_code) {
                for (const value of data.sales_value) {
                    //loose equality comparison mandatory
                    if (value.yearMonth == yearMonth) {
                        return Math.round(Number(value.sales_qty));
                    }
                }
            }
        }
        return NO_DATA_SYMBOL;
    };

    const onEditCancelHandler = (e) => {
        if (isEdit) {
            updatedValue.current = [];
            const qtyArr = _.cloneDeep(originalData.current);
            setForecastData([...qtyArr]);
            // calcDiff();
        }
        setIsEdit(!isEdit);
        calcDiff();
    };

    const onSaveHandler = (e) => {
        const updatedData = {
            areaCode: areaCode.current,
            pskuCode: pskuCode,
            adjusted: updatedValue.current,
        };
        updateForecast(updatedData)
            .then((response) => {
                notification.success({
                    message: 'Success',
                    description: response.message,
                    duration: 3,
                    className: 'notification-green',
                });
                getForecastDetails();
                setCanSave(false);
                setDifference(0);
            })
            .catch((error) => {
                notification.error({
                    message: 'Technical Error',
                    description: `Some error occurred while updating forecast [${error}]`,
                    duration: 5,
                    className: 'notification-error',
                });
            });
    };

    const onResetHandler = () => {
        getForecastDetails();
        setDifference(0);
        setCanSave(false);

        /**
         * Initially on "Reset", the suggested forecast was populated in the adjusted column.
         * But after introduction of Quantity Norm scheduler job(SOPE-1884), this can be used to override the quantity norm values
         * Hence the "Reset" function is now used to refresh the page
         * CODE KEPT FOR REFERENCE
        const qtyArr = [...forecastData];
        qtyArr.forEach(item => item.adjusted_forecast = item.recommended_forecast);
        qtyArr.forEach(qty => {
            updatedValue.current?.forEach((item) => {
                if (item.distributorCode === qty.distributor_code) {
                    item.updated_allocation = Math.round(Number(qty.recommended_forecast));
                }
            })
        });
        const updatedData = {
            areaCode: areaCode.current,
            pskuCode: pskuCode,
            pskuClass: pskuClass,
            adjusted: updatedValue.current
        }
        updateForecast(updatedData)
            .then((response) => {
                notification.success({
                    message: 'Success',
                    description: response.message,
                    duration: 3,
                    className: 'notification-green',
                });
                getForecastDetails();
                setDifference(0);
                setCanSave(false);
            }).catch((error) => {
                notification.error({
                    message: 'Technical Error',
                    description: `Some error occurred while updating forecast [${error}]`,
                    duration: 5,
                    className: 'notification-error',
                });
            })
             */
    };

    //jsx
    return (
        <>
            <div className="admin-dashboard-wrapper">
                <div className="admin-dashboard-block">
                    <div className="admin-dashboard-head">
                        <h2>Forecast</h2>
                        <div className="header-left">
                            <Select
                                id="brand-variants"
                                aria-label="select-brand-variants"
                                placeholder="Brand Variant Name"
                                style={{ width: '350px' }}
                                allowClear
                                showSearch
                                value={pskuCode}
                                onChange={(value) => setPskuCode(value)}
                                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                options={
                                    pskuList && [
                                        ...pskuList?.map((item) => {
                                            return {
                                                value: item.parent_sku,
                                                label: `${item.parent_desc} - ${item.parent_sku}`,
                                            };
                                        }),
                                    ]
                                }
                            />
                        </div>
                        <div className="right-header">
                            {/* {search and filters} */}
                            <button
                                className="back-btn"
                                onClick={() =>
                                    browserHistory.push({
                                        pathname: '/admin/forecast-dashboard',
                                        state: {
                                            areaCode: areaCode,
                                        },
                                    })
                                }>
                                Back to Forecast Summary
                            </button>
                            <div className="comment-section">
                                <button type="button" className="sbmt-btn space-5" hidden={!isEdit} disabled={+difference || !isTImelineOpen || !canSave} onClick={onSaveHandler}>
                                    {+difference ? +difference : 'Save'}
                                </button>
                                <button type="button" className="sbmt-btn space-5" onClick={onResetHandler} disabled={!isTImelineOpen}>
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="admin-dashboard-table forecast-dashboard-table">
                        <Loader>
                            <table style={{ minWidth: `${720 + (forecastDelta + 5) * 130}px` }}>
                                <thead>
                                    <tr>
                                        <th colSpan={4}></th>
                                        <th colSpan={forecastDelta} className="top-header">
                                            Sales Volume (in BUOM)
                                        </th>
                                        <th colSpan={2} className="top-header">
                                            Month To Date (in BUOM)
                                        </th>
                                        <th colSpan={2} className="top-header">
                                            Forecast for {applicableMonthYearName[3]} (in BUOM)
                                        </th>
                                        {/* <th colSpan={1} className='top-header'></th> */}
                                    </tr>
                                    <tr>
                                        <th className="forecast-dist-name">Distributor</th>
                                        <th className="forecast-col">Code</th>
                                        <th className="forecast-cg">Customer Group</th>
                                        <th className="forecast-col">Status</th>
                                        {applicableMonthYearName.slice(0, forecastDelta).map((item, index) => {
                                            return <th className={`${index === 0 ? 'top-header' : ''} forecast-col`}>{item}</th>;
                                        })}
                                        <th className="top-header forecast-col">MTD</th>
                                        <th className="forecast-col">Balance to Go</th>
                                        <th className="top-header forecast-col">Recommended</th>
                                        <th className="forecast-col" style={{ textAlign: 'center' }}>
                                            Adjusted
                                        </th>
                                        {/* <th className='width-sm top-header'>Details</th> */}
                                    </tr>
                                </thead>
                                <tbody>
                                    {forecastData?.map((item, index) => {
                                        return (
                                            <tr key={item.distributor_code}>
                                                <td>{item.distributor_name}</td>
                                                <td className="text-body">{item.distributor_code}</td>
                                                <td>{`${item.customer_group}-${item.customer_group_description}`}</td>
                                                <td className="text-body">{item.status}</td>
                                                {applicableMonthYear.slice(0, forecastDelta)?.map((yearMonth, i) => {
                                                    return (
                                                        <td key={yearMonth} className="text-body">
                                                            {findValue(yearMonth, item.distributor_code)}
                                                        </td>
                                                    );
                                                })}
                                                <td className="text-body">{item.mtd ?? NO_DATA_SYMBOL}</td>
                                                <td className="text-body">{item.balance_to_go ?? NO_DATA_SYMBOL}</td>
                                                <td className="text-body">{Number(item.recommended_forecast)}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {!isTImelineOpen ? (
                                                        item.adjusted_forecast
                                                    ) : (
                                                        <input
                                                            id={index}
                                                            className="qty-input"
                                                            onWheel={(e) => e.currentTarget.blur()}
                                                            value={item.adjusted_forecast}
                                                            // disabled={!Math.round(Number(item.recommended_forecast)) || !isTImelineOpen}
                                                            onKeyDown={onKeyDownHandler}
                                                            onChange={onChangeQuantityHandler}
                                                        />
                                                    )}
                                                </td>
                                                {/* <td className='admin-actions'>
                                                    <div className='admin-actions'>
                                                        <i
                                                            tabIndex={index}
                                                            id={`detail-${index}`}
                                                            name={item.distributor_code}
                                                            onKeyDown={onKeyDownHandler}
                                                            className='info-icon'
                                                            hidden={isEdit}
                                                            onClick={e => openBrandVariantModal(e)}>
                                                            <Tooltip placement="bottom" title="Info"><InfoCircleOutlined /></Tooltip>
                                                        </i>
                                                    </div>
                                                </td> */}
                                            </tr>
                                        );
                                    })}
                                    {forecastData && (
                                        <tr>
                                            <td className="totals" style={{ fontWeight: 700 }}>
                                                TOTAL
                                            </td>
                                            <td className="totals"></td>
                                            <td className="totals"></td>
                                            <td className="totals"></td>
                                            {applicableMonthYear?.slice(0, forecastDelta).map((item, i) => {
                                                return (
                                                    <td className="text-body totals" style={{ fontWeight: 700 }}>
                                                        {calculateTotal(item)}
                                                    </td>
                                                );
                                            })}
                                            <td className="totals"></td>
                                            <td className="totals"></td>
                                            <td className="text-body totals" style={{ fontWeight: 700 }}>
                                                {' '}
                                                {calculateTotal('recommended_forecast')}
                                            </td>
                                            <td className="totals" style={{ fontWeight: 700, textAlign: 'center' }}>
                                                {calculateTotal('adjusted_forecast')}
                                            </td>
                                        </tr>
                                    )}
                                    {!forecastData && (
                                        <tr style={{ textAlign: 'center' }}>
                                            <td colSpan="10">No forecast available </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            {forecastData && (
                                <>
                                    <span className="audit-trail">
                                        Last updated by: {auditTrail?.firstName} {auditTrail?.lastName} on {auditTrail?.dateTime}
                                    </span>
                                </>
                            )}
                        </Loader>
                    </div>
                    <div className="btn-download" style={{ width: '100%', margin: '0' }}>
                        {canDownload && (exportedList || exportedList.data != null || exportedList.data.length > 0) ? (
                            <ExportForecastDataToExcel
                                fData={exportedList}
                                applicableMonthName={applicableMonthYearName}
                                onCancel={(o) => {
                                    setExportedList({});
                                    setCanDownload(false);
                                }}
                            />
                        ) : (
                            <button disabled>Download</button>
                        )}
                    </div>
                </div>
            </div>

            {/* {Modals} */}
            {brandVariantModalData && (
                <BrandVariantsModal isModalVisible={isBrandVariantModalOpen} closeModal={closeBrandVariantModal} userRole={''} data={brandVariantModalData}></BrandVariantsModal>
            )}
        </>
    );
};

const mapStateToProps = (state) => {
    return {
        last_forecast_date: state.admin.get('last_forecast_date'),
        adjustment_timeline: state.admin.get('adjustment_timeline'),
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        getMaintenanceRequests: () => dispatch(Actions.getMaintenanceRequests()),
        getPSKUList: (data) => dispatch(Actions.getBrandVariantList(data)),
        getForecast: (data) => dispatch(Actions.getForecast(data)),
        updateForecast: (data) => dispatch(Actions.updateForecast(data)),
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(Forecast);
