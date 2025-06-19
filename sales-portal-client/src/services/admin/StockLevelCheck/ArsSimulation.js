import React, { useState, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import ReactExport from 'react-data-export';
import { Select, Button, DatePicker } from 'antd';
import _ from 'lodash';
import moment from 'moment';

import * as AdminActions from '../actions/adminAction';
import * as Actions from '../../distributor/actions/dashboardAction';
import Util from '../../../util/helper';
import { ALL_DIVISIONS } from '../../../constants';

const { ExcelFile, ExcelSheet } = ReactExport;

const ArsSimulation = (props) => {
    const { getRegionDetails, getForecastConfigurations, getForecastDistribution, getArsRecommendationSimulation } = props;
    const currentMonthStart = moment().startOf('month');
    const nextMonthEnd = moment().add(1, 'month').endOf('month');

    const applicableMonths = [Util.applicableMonth(), Util.applicableMonth('next'), Util.applicableMonth('next-next')];
    const [payload, setPayload] = useState({
        distributor_code: '',
        divisions: ALL_DIVISIONS,
        applicable_month: applicableMonths[0],
        next_applicable_month: '',
        simulation_date: null,
    });
    const [exportData, setExportData] = useState({});
    // const [isLoading, setIsLoading] = useState(false);
    const isLoading = useRef(false);

    const generateSimulation = async () => {
        isLoading.current = true;
        try {
            const selectedApplicableMonthIndex = applicableMonths.indexOf(payload.applicable_month);
            const nextApplicableMonth = applicableMonths[selectedApplicableMonthIndex + 1];
            const selectedPayload = _.cloneDeep(payload);
            selectedPayload.next_applicable_month = nextApplicableMonth;
            setPayload(selectedPayload);

            if (!payload.distributor_code) {
                return;
            }

            /**
             * 1. find the distributor profile
             * 2. applicable phasing
             * 3. forecast distribution
             * 4. SOQ calculation
             * 5. Excluded Materials
             */
            //setting with a default value
            let phasing = [
                {
                    area_code: '',
                    applicable_month: '',
                    weekly_week1: '0.0',
                    weekly_week2: '0.0',
                    weekly_week3: '0.0',
                    weekly_week4: '0.0',
                    fortnightly_week12: '0.0',
                    fortnightly_week34: '0.0',
                },
            ];
            const profile = [];
            const [distributorProfile, forecastDistribution, recommendation] = await Promise.all([
                getRegionDetails(selectedPayload.distributor_code),
                getForecastDistribution({
                    distributor_code: selectedPayload.distributor_code,
                    applicable_month: selectedPayload.applicable_month,
                    next_applicable_month: selectedPayload.next_applicable_month,
                }),
                getArsRecommendationSimulation(selectedPayload),
            ]);
            if (distributorProfile?.area_code) {
                profile.push({
                    distributor_code: distributorProfile?.id,
                    distributor_name: distributorProfile?.name,
                    area_code: distributorProfile?.area_code,
                    tse_code: distributorProfile?.tse[0]?.code,
                    customer_group_code: distributorProfile?.customer_group_code,
                    customer_group: distributorProfile?.customer_group,
                });
                const forecastConfiguration = await getForecastConfigurations({
                    areaCode: distributorProfile.area_code,
                    applicableMonth: selectedPayload.applicable_month,
                    nextApplicableMonth: selectedPayload.next_applicable_month,
                });
                const customerGroupString = `${distributorProfile.customer_group_code}#${distributorProfile.customer_group}`;
                if (forecastConfiguration?.data?.data?.rows) {
                    const forecastConfig = forecastConfiguration?.data?.data?.rows?.config_data;
                    const customerGroupConfig = forecastConfig?.filter((f) => f.customer_group === customerGroupString);
                    if (customerGroupConfig) {
                        phasing = customerGroupConfig?.map((c) => {
                            return {
                                area_code: c.area_code,
                                applicable_month: c.applicable_month,
                                weekly_week1: c.weekly_week1,
                                weekly_week2: c.weekly_week2,
                                weekly_week3: c.weekly_week3,
                                weekly_week4: c.weekly_week4,
                                fortnightly_week12: c.fortnightly_week12,
                                fortnightly_week34: c.fortnightly_week34,
                            };
                        });
                    }
                }
            }
            const mappedRecommendation = suggestedOrderQuantityTransformer(recommendation?.data, selectedPayload);

            setExportData({
                'Distributor Profile': profile,
                Phasing: phasing,
                'Forecast Distribution': forecastDistribution?.data,
                'Excluded Materials': mappedRecommendation.excluded,
                'ARS Suggestions': mappedRecommendation.soqArray,
            });
        } catch (error) {
            console.log(error);
            Util.notificationSender('Error', 'Failed to process.', false);
            return null;
        } finally {
            isLoading.current = false;
        }
    };

    function suggestedOrderQuantityTransformer(data, selectedPayload = payload) {
        const result = [];
        for (const item of data?.forecastedPSKUDistWise || []) {
            const pdpDivision = data?.distPdpDistributionArray.find((d) => d.psku === item.sku);

            const applicableDaysObj = data?.weekColumnsPskuWise?.find((d) => d.psku?.includes(item.sku));
            const daysObj = {
                [selectedPayload.applicable_month]: '',
                [selectedPayload.next_applicable_month]: '',
            };
            const current = applicableDaysObj?.current;
            const next = applicableDaysObj?.next;
            const current_days = applicableDaysObj?.[current];
            const next_days = applicableDaysObj?.[next];

            if (current_days) {
                daysObj[current] = current_days.join(',');
            }
            if (next_days) {
                daysObj[next] = next_days.join(',');
            }

            const norms = data?.normCycleSafetyValues[item.sku];
            const lastOrder = data?.lastOrderDetails?.find((d) => d.psku === item.sku);
            const final = data?.finalArray.find((d) => d.productCode === item.sku);

            const obj = {
                psku: item.sku ?? '',
                class: item.class ?? '',
                division: pdpDivision?.division ?? '',
                pdp: pdpDivision?.pdp ?? '',
                stock_norm_days: norms?.stock_norm ?? 0,
                safety_stock_percent: norms?.safety_stock ?? 0,
                pak_to_cs: norms?.pak_to_cs ?? 0,
                stock_norm_buom: data?.stockNormData?.[item.sku] ?? 0,
                sit: data?.transitStockData?.[item.sku] ?? 0,
                sih: data?.inhandStockData?.[item.sku] ?? 0,
                oo: data?.openOrderStockData?.[item.sku] ?? 0,
                base_to_case: data?.base_to_case?.[item.sku] ?? 0,
                pac_to_case: data?.pac_to_case?.[item.sku] ?? 0,
                soq_norms: data?.soqNorms?.[item.sku] ?? 0,
                sku_soq_norm: data?.skuSoqNorm?.[payload.distributor_code]?.[item.sku] ?? 0,
                last_order_details: lastOrder?.total_qty ?? 0,
                soq: final?.qty ?? 0,
                ...daysObj,
            };
            result.push(obj);
        }
        return {
            soqArray: result,
            excluded: data?.excludedPSKU?.map((e) => ({ excluded_materials: e })),
        };
    }

    function disabledDate(current) {
        return current < currentMonthStart || current > nextMonthEnd;
    }

    return (
        <div>
            <input
                className="inputs"
                type="text"
                placeholder="DB code"
                value={payload.distributor_code}
                onChange={(e) => setPayload({ ...payload, distributor_code: e.target.value })}
            />

            <Select
                style={{
                    width: 200,
                }}
                placeholder="Applicable Month"
                value={payload.applicable_month}
                onChange={(value) => setPayload({ ...payload, applicable_month: value })}
                options={applicableMonths.slice(0, 2).map((d) => ({ label: d, value: d }))}
            />
            <Select
                style={{
                    width: 200,
                }}
                placeholder="All Divisions"
                mode="multiple"
                onChange={(value) => setPayload({ ...payload, divisions: value })}
                options={ALL_DIVISIONS.map((d) => ({ label: d, value: d }))}
            />
            <DatePicker disabledDate={disabledDate} onChange={(date, dateString) => setPayload({ ...payload, simulation_date: dateString })} />
            <Button id="simulate-btn" type="submit" onClick={generateSimulation} loading={isLoading.current}>
                Simulate & Download
            </Button>
            {exportData && Object.keys(exportData).length > 0 && (
                <ExportArsSimulationToExcel
                    filename={`ARS Simulation_${payload.distributor_code}_${payload?.simulation_date ? moment(payload.simulation_date, 'YYYY-MM-DD').format('YYYY-MM-DD_HH-mm-ss') : moment().format('YYYY-MM-DD_HH-mm-ss')}`}
                    exportData={exportData}
                    onCancel={() => setExportData({})}
                />
            )}
        </div>
    );
};

const mapDispatchToProps = (dispatch) => {
    return {
        getRegionDetails: (id) => dispatch(Actions.getRegionDetails(id)),
        getForecastConfigurations: (data) => dispatch(AdminActions.getForecastConfigurations(data)),
        getForecastDistribution: (payload) => dispatch(AdminActions.forecastDistribution(payload)),
        getArsRecommendationSimulation: (payload) => dispatch(AdminActions.arsRecommendationSimulation(payload)),
    };
};

export default connect(null, mapDispatchToProps)(ArsSimulation);

const ExportArsSimulationToExcel = (props) => {
    const { filename, exportData, onCancel } = props;

    useEffect(() => {
        if (exportData && Object.keys(exportData).length) {
            document.getElementById('simulation-download-excel')?.click();
        }
    }, [exportData]);

    const generateSheets = () => {
        return Object.keys(exportData)
            .map((key) => {
                const data = exportData[key];
                if (!Array.isArray(data) || data.length === 0) {
                    return null;
                }

                // Collect all unique column names
                const allColumns = new Set();
                data.forEach((row) => {
                    Object.keys(row).forEach((col) => allColumns.add(col));
                });

                const columns = Array.from(allColumns).map((col) => ({
                    title: col,
                    width: { wpx: 100 },
                    style: { font: { bold: true } },
                }));

                const rows = data.map((row) => Object.values(row));

                return <ExcelSheet dataSet={[{ columns, data: rows }]} name={key} key={key} />;
            })
            .filter((sheet) => sheet !== null);
    };

    return (
        <div>
            <ExcelFile
                filename={filename}
                element={
                    <button id="simulation-download-excel" onClick={onCancel}>
                        Download Excel
                    </button>
                }>
                {generateSheets()}
            </ExcelFile>
        </div>
    );
};
