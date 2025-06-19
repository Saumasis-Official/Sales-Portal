import React from 'react';
import { Select, DatePicker, Radio, Space, InputNumber, Button, Checkbox } from 'antd';
import { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import * as AdminAction from '../actions/adminAction';
import Helper from '../../../util/helper';
import moment from 'moment';
import { CUSTOMER_GROUPS_FOR_ARS } from '../../../constants';
import _ from 'lodash';

const { RangePicker } = DatePicker;
const { Option } = Select;

function ForecastSync(props) {
    const { areaCodes, fetchAreaForecastDumpDetails, insertSyncLog, syncForecastDump, onCancel } = props;
    const [originalData, setOriginalData] = useState(null);
    const [selectedDbAreaCode, setSelectedDbAreaCode] = useState(null);
    const [mode, setMode] = useState('area');
    const [isSubmitDisabled, setIsSubmitDisabled] = useState(false);
    const [errorObject, setErrorObject] = useState({});

    const forecastMonth = Helper.formatDateToCustomString(null, Helper.applicableMonth('next'));
    const currentForecastMonth = Helper.formatDateToCustomString(null, Helper.applicableMonth());
    const initialSalesMonths = calculateSalesMonth(forecastMonth);
    const initialWeightages = setDefaultWeightages(initialSalesMonths);
    const [areaPayload, setAreaPayload] = useState({
        area_codes: [],
        weightages: initialWeightages,
        forecast_dump_method: 'L3M_SALES_AVG',
        sales_type: 'SECONDARY_SALES',
        remove_deleted_customers: false,
        execute_post_program_apis: false,
        customer_groups: null,
        sync_type: null,
        forecast_month: forecastMonth,
        sales_months: initialSalesMonths,
    });
    const [distPayload, setDistPayload] = useState({
        area_codes: null,
        sales_months: [null, null],
        forecast_dump_method: 'L3M_SALES_AVG',
        sales_type: 'SECONDARY_SALES',
        weightages: {},
        db_codes: [],
        sync_type: 'monthly_sales,sales_allocation',
        forecast_month: null,
    });

    useEffect(() => {
        if (mode === 'distributor' && selectedDbAreaCode) {
            const tempDistPayload = {
                area_codes: null,
                sales_months: [null, null],
                forecast_dump_method: 'L3M_SALES_AVG',
                weightages: {},
                db_codes: [],
                forecast_month: null,
            };
            setIsSubmitDisabled(true);
            setErrorObject({ db_codes: `Distributor Codes Can't be Empty` });
            fetchAreaForecastDumpDetails(selectedDbAreaCode)
                .then((res) => {
                    if (res.data) {
                        const result = res.data[0];
                        tempDistPayload.sales_months =
                            result.start_month && result.end_month ? [moment(result.start_month).format('YYYY-MM'), moment(result.end_month).format('YYYY-MM')] : [null, null];
                        tempDistPayload.area_codes = selectedDbAreaCode;
                        tempDistPayload.weightages = tempDistPayload.sales_months[0] ? setDefaultWeightages(tempDistPayload.sales_months) : {};
                        tempDistPayload.forecast_month = result.forecast_month;
                        setDistPayload({ ...distPayload, ...tempDistPayload });
                        setOriginalData(result);
                    } else Helper.notificationSender('Error', res?.message, false);
                })
                .catch((error) => {
                    console.error('Error fetching area forecast dump details:', error);
                    Helper.notificationSender('Error', `Failed to fetch data for ${distPayload?.area_codes}`, false);
                });
        }
    }, [selectedDbAreaCode]);

    useEffect(() => {
        setDistPayload({
            area_codes: [],
            sales_months: [null, null],
            forecast_dump_method: 'L3M_SALES_AVG',
            weightages: {},
            db_codes: [],
            sync_type: 'monthly_sales,sales_allocation',
            forecast_month: null,
            sales_type: 'SECONDARY_SALES',
        });
        setAreaPayload({
            area_codes: [],
            weightages: initialWeightages,
            forecast_dump_method: 'L3M_SALES_AVG',
            remove_deleted_customers: false,
            execute_post_program_apis: false,
            customer_groups: null,
            sync_type: null,
            forecast_month: forecastMonth,
            sales_months: initialSalesMonths,
            sales_type: 'SECONDARY_SALES',
        });
        setIsSubmitDisabled(false);
        if (mode === 'distributor') setIsSubmitDisabled(true);
        setSelectedDbAreaCode(null);
        setOriginalData(null);
        setErrorObject({});
    }, [mode]);

    useEffect(() => {}, [distPayload]);

    //------------------------------Helper--------------------------------
    function fetchRange() {
        if (mode === 'distributor') {
            if (originalData?.start_month && originalData?.end_month) return [moment(originalData?.start_month, 'YYYYMM'), moment(originalData?.end_month, 'YYYYMM')];
            return [null, null];
        } else {
            if (areaPayload?.sales_months[0] && areaPayload?.sales_months[1]) return [moment(areaPayload.sales_months[0], 'YYYYMM'), moment(areaPayload.sales_months[1], 'YYYYMM')];
            return [null, null];
        }
    }

    function setDefaultWeightages(sales_months) {
        const weightages = {};
        for (let i = moment(sales_months[0], 'YYYYMM'); i.isSameOrBefore(moment(sales_months[1], 'YYYYMM')); i.add(1, 'months')) {
            weightages[i.format('YYYYMM')] = 0;
        }

        const monthsCount = Object.keys(weightages)?.length ?? 1;
        let total = 0;
        Object.keys(weightages)?.forEach((key) => {
            weightages[key] = +(100 / monthsCount).toFixed(2); // Set each month's weightage to 100 divided by the number of months
            total += parseFloat(weightages[key]);
        });
        // adjust to 100
        const diff = 100 - total;
        const lastKey = Object.keys(weightages).pop();
        weightages[lastKey] = +(parseFloat(weightages[lastKey]) + diff).toFixed(2);
        return weightages;
    }

    function calculateSalesMonth(forecast_month) {
        const fetchedMonths = Helper.fetchMonths(forecast_month, 3, 2);
        return [fetchedMonths.yearMonth[0], fetchedMonths.yearMonth[2]];
    }

    const validateInputChange = (data) => {
        if (data.area_codes) {
            const tempValidationObj = {};
            if (data.sales_months?.filter((f) => f !== '' || !(f == null)).length !== 2) tempValidationObj.l3m = `Sales Months should be selected`;
            else if (Object.values(data.weightages).some((w) => w == null || w === '')) tempValidationObj.l3m = `Weightages should be selected`;
            else if (Object.values(data.weightages).reduce((a, b) => a + +b, 0) !== 100) tempValidationObj.l3m = `Sum of weightages should be 100`;
            setIsSubmitDisabled(Object.keys(tempValidationObj).length > 0 ? true : false);
            setErrorObject(tempValidationObj);
        }
    };

    const validateDistInputChange = (data) => {
        const tempValidationObj = {};
        const forecastMonths = [forecastMonth, currentForecastMonth];
        if (data.db_codes.length <= 0) tempValidationObj.db_codes = `Distributor Codes Can't be Empty`;
        else if (!forecastMonths.includes(originalData?.forecast_month)) tempValidationObj.no_forecast = `Forecast dump hasn't run for ${data.area_codes}`;
        else if (Object.keys(data.weightages).length > 0 && Object.values(data.weightages).reduce((a, b) => a + +b, 0) !== 100)
            tempValidationObj.l3m = `Sum of weightages should be 100`;
        setIsSubmitDisabled(Object.keys(tempValidationObj).length > 0 ? true : false);
        setErrorObject(tempValidationObj);
    };
    //--------------------------------Handler---------------------------------------
    function handleInputChange(field, value) {
        if (value === '') value = null;
        const currValue = _.cloneDeep(areaPayload);
        currValue[field] = value;
        if (field === 'forecast_month') {
            const updatedSalesMonths = calculateSalesMonth(value);
            currValue.sales_months = updatedSalesMonths;
            const updatedWeightages = setDefaultWeightages(updatedSalesMonths);
            currValue.weightages = updatedWeightages;
        } else if (field === 'sales_months') {
            const updatedWeightages = setDefaultWeightages(value);
            currValue['weightages'] = updatedWeightages;
        }
        validateInputChange(currValue);
        setAreaPayload({ ...areaPayload, ...currValue });
    }

    function handleDbInputChange(field, value) {
        if (value === '') value = null;
        const currValue = _.cloneDeep(distPayload);
        currValue[field] = value;
        if (field === 'forecast_dump_method') {
            currValue.weightages = initialWeightages;
            if (value === 'PREV_MONTH_ADJ') currValue.weightages = {};
        }
        validateDistInputChange(currValue);
        setDistPayload({ ...distPayload, ...currValue });
    }

    function handleSubmit() {
        const payload = {
            type: 'ARS_FORECAST_DUMP',
            result: 'SUCCESS',
            configuration: mode === 'area' ? areaPayload : distPayload,
            isCronJob: false,
        };
        setIsSubmitDisabled(true);
        insertSyncLog(payload)
            .then((res) => {
                if (res.success) {
                    Helper.notificationSender('Success', `ARS_FORECAST_DUMP is running in the background`, true);
                    syncForecastDump(payload.configuration);
                    onCancel();
                } else {
                    Helper.notificationSender('Failure', `Failed to run ARS_FORECAST_DUMP`, false);
                    setIsSubmitDisabled(false);
                }
            })
            .catch(() => {
                setIsSubmitDisabled(false);
                Helper.notificationSender('Failure', `Failed to run ARS_FORECAST_DUMP`, false);
            });
    }

    return (
        <div className="tab-container">
            <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)} style={{ marginBottom: 16 }}>
                <Radio.Button value="area">Area Level</Radio.Button>
                <Radio.Button value="distributor">Distributor Level</Radio.Button>
            </Radio.Group>
            <form>
                <div className="formItems">
                    <label>Area Codes</label>
                    <Select
                        mode={mode === 'area' ? 'multiple' : undefined}
                        showSearch
                        placeholder={mode === 'area' ? 'All selected by default' : 'Select Area Code'}
                        getPopupContainer={(trigger) => trigger.parentNode}
                        value={mode === 'area' ? areaPayload.area_codes : distPayload.area_codes}
                        onChange={(areas) => (mode === 'area' ? handleInputChange('area_codes', areas) : setSelectedDbAreaCode(areas))}
                        options={areaCodes.map((item) => ({
                            label: item.code,
                            value: item.code,
                        }))}
                    />
                </div>
                {mode === 'distributor' && (
                    <div className="formItems">
                        <label>DB Codes</label>
                        <Select
                            placeholder="Select DB Code"
                            options={originalData?.db_codes?.map((item) => ({
                                label: item.replace('#', ' - '),
                                value: item.split('#')[0],
                            }))}
                            value={distPayload.db_codes}
                            mode="multiple"
                            getPopupContainer={(trigger) => trigger.parentNode}
                            onChange={(val) =>
                                handleDbInputChange(
                                    'db_codes',
                                    val.map((item) => item.split('#')[0]),
                                )
                            }
                            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                            allowClear
                        />
                    </div>
                )}
                {mode === 'distributor' && (
                    <div className="formItems">
                        <span>
                            <b>Forecast Month :</b>{' '}
                        </span>
                        <span> {originalData?.forecast_month} </span>
                    </div>
                )}
                {mode === 'area' && (
                    <div className="formItems">
                        <label>Sync Type</label>
                        <Select
                            mode="multiple"
                            placeholder="All selected by default"
                            allowClear
                            getPopupContainer={(trigger) => trigger.parentNode}
                            onChange={(syncTypes) => handleInputChange('sync_type', syncTypes.join(','))}>
                            <Option value="monthly_sales">Monthly Sales</Option>
                            <Option value="sales_allocation">Sales Allocation</Option>
                            <Option value="phasing">Phasing</Option>
                        </Select>
                    </div>
                )}

                {mode === 'area' && (
                    <div className="formItems">
                        <label>Customer Groups</label>
                        <Select
                            mode="multiple"
                            placeholder="All selected by default"
                            onChange={(cg) => handleInputChange('customer_groups', cg.join(','))}
                            getPopupContainer={(trigger) => trigger.parentNode}
                            options={CUSTOMER_GROUPS_FOR_ARS.map((item) => ({
                                label: item,
                                value: item,
                            }))}
                        />
                    </div>
                )}

                {mode === 'area' && (
                    <div className="formItems">
                        <label>Forecast Month</label>
                        <Select
                            placeholder="Forecast Month"
                            getPopupContainer={(trigger) => trigger.parentNode}
                            onChange={(month) => handleInputChange('forecast_month', month)}
                            defaultValue={Helper.formatDateToCustomString(null, Helper.applicableMonth('next'))}>
                            <Option value={Helper.formatDateToCustomString(new Date())}>Current Month</Option>
                            <Option value={Helper.formatDateToCustomString(null, Helper.applicableMonth('next'))}>Next Month</Option>
                        </Select>
                    </div>
                )}

                <div className="formItems">
                    <label style={{ marginBottom: '15px' }}>Forecast Allocation Method</label>
                    <Radio.Group
                        onChange={(e) =>
                            mode === 'area' ? handleInputChange('forecast_dump_method', e.target.value) : handleDbInputChange('forecast_dump_method', e.target.value)
                        }
                        value={mode === 'area' ? areaPayload.forecast_dump_method : distPayload.forecast_dump_method}>
                        <Space direction="vertical">
                            <Radio style={{ display: 'flex' }} value="FORECAST_L3M_CONTRIBUTION">
                                L3M contribution on B.Y. forecast( +weighed average)
                            </Radio>
                            <Radio style={{ display: 'flex' }} value="L3M_SALES_AVG">
                                L3M sales only average(+weighed average)
                            </Radio>
                            <Radio style={{ display: 'flex' }} value="PREV_MONTH_ADJ">
                                Allocation by previous month adjustment on B.Y. forecast
                            </Radio>
                        </Space>
                    </Radio.Group>
                </div>
                <div className="formItems">
                    <label style={{ marginBottom: '15px' }}>Sales Type</label>
                    <Radio.Group
                        onChange={(e) => (mode === 'area' ? handleInputChange('sales_type', e.target.value) : handleDbInputChange('sales_type', e.target.value))}
                        value={mode === 'area' ? areaPayload.sales_type : distPayload.sales_type}>
                        <Space direction="vertical">
                            <Radio style={{ display: 'flex' }} value="PRIMARY_SALES">
                                {' '}
                                Primary Sales
                            </Radio>
                            <Radio style={{ display: 'flex' }} value="SECONDARY_SALES">
                                {' '}
                                Secondary Sales
                            </Radio>
                        </Space>
                    </Radio.Group>
                </div>

                <>
                    {mode === 'area' && (
                        <div className="formItems vertical-layout">
                            <label>Sales Months</label>
                            <RangePicker
                                allowClear={false}
                                picker="month"
                                value={fetchRange()}
                                onChange={(_, value) => mode === 'area' && handleInputChange('sales_months', value)}
                            />
                        </div>
                    )}
                    {mode === 'distributor' && (
                        <div className="formItems">
                            <span>
                                <b>Sales Months : </b>
                            </span>
                            <span>
                                {fetchRange()
                                    .filter((item) => item)
                                    .map((item) => item.format('MMM-YYYY'))
                                    .join(' - ')}
                            </span>
                        </div>
                    )}
                    {((mode === 'area' && areaPayload.forecast_dump_method !== 'PREV_MONTH_ADJ') ||
                        (mode === 'distributor' && distPayload.forecast_dump_method !== 'PREV_MONTH_ADJ' && distPayload.sales_months[0])) && (
                        <table>
                            <thead>
                                <tr>
                                    <th>Months</th>
                                    <th>Weight(%)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.keys(mode === 'area' ? (areaPayload.weightages ?? {}) : (distPayload.weightages ?? {}))?.map((key, index) => {
                                    const weightage = mode === 'area' ? areaPayload.weightages : distPayload.weightages;
                                    return (
                                        <tr key={index}>
                                            <td>{moment(key, 'YYYYMM').format('MMM-YYYY')}</td>
                                            <td>
                                                <InputNumber
                                                    min={0}
                                                    max={100}
                                                    placeholder="Enter a number"
                                                    onChange={(val) =>
                                                        mode === 'area'
                                                            ? handleInputChange('weightages', {
                                                                  ...weightage,
                                                                  [key]: isNaN(+val?.toFixed(2)) ? 0 : +val?.toFixed(2),
                                                              })
                                                            : handleDbInputChange('weightages', {
                                                                  ...weightage,
                                                                  [key]: isNaN(+val?.toFixed(2)) ? 0 : +val?.toFixed(2),
                                                              })
                                                    }
                                                    value={weightage[key] ?? 0}
                                                    style={{ width: '100%' }}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                    {mode === 'area' && (
                        <div className="formItems">
                            <Checkbox checked={areaPayload.remove_deleted_customers ?? false} onChange={(e) => handleInputChange('remove_deleted_customers', e.target.checked)}>
                                Remove deleted customers
                            </Checkbox>
                        </div>
                    )}
                    {mode === 'area' && (
                        <div className="formItems">
                            <Checkbox checked={areaPayload.execute_post_program_apis ?? false} onChange={(e) => handleInputChange('execute_post_program_apis', e.target.checked)}>
                                Execute Forecast Allocation
                            </Checkbox>
                        </div>
                    )}
                </>
                {Object.hasOwn(errorObject, 'l3m') && <p className="audit-trail">{errorObject.l3m}</p>}
                {Object.hasOwn(errorObject, 'db_codes') && <p className="audit-trail">{errorObject.db_codes}</p>}
                {Object.hasOwn(errorObject, 'no_forecast') && <p className="audit-trail">{errorObject.no_forecast}</p>}
                <div style={{ marginTop: '10px', textAlign: 'right' }}>
                    <Button type="primary" disabled={isSubmitDisabled} onClick={handleSubmit}>
                        Submit
                    </Button>
                </div>
            </form>
        </div>
    );
}

const mapDispatchToProps = (dispatch) => {
    return {
        fetchAreaForecastDumpDetails: (areaCode) => dispatch(AdminAction.fetchAreaForecastDumpDetails(areaCode)),
        syncForecastDump: (payload) => dispatch(AdminAction.syncForecastDump(payload)),
        insertSyncLog: (payload) => dispatch(AdminAction.insertSyncLog(payload)),
    };
};
const ForecastSyncConnect = connect(null, mapDispatchToProps)(ForecastSync);
export default ForecastSyncConnect;
