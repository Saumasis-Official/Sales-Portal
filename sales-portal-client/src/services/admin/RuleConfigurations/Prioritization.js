import React, { useEffect, useState, useRef } from 'react';
import { SyncOutlined, HistoryOutlined, SaveOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Popover, Tooltip, Table, Select } from 'antd';
import { connect } from 'react-redux';
import { features, hasEditPermission, pages } from '../../../persona/distributorHeader';
import Util from '../../../util/helper';
import * as Actions from '../actions/adminAction';
import _ from "lodash";
import PropTypes from 'prop-types';



const expandedRowRender = (record) => {
    const columns = [
        {
            title: 'PSKU Code',
            dataIndex: 'psku',
            key: 'psku',
        },
        {
            title: 'PSKU Description',
            dataIndex: 'psku_desc',
            key: 'psku_desc',
        },

    ];
    const data = [];
    record?.psku_details?.forEach(i => {
        data.push({
            key: `${i.area}_${i.brand_variant}`,
            psku: i.psku,
            psku_desc: i.description,
        });
    });
    return <Table columns={columns} dataSource={data} pagination={false} />;
};




function Prioritization(props) {
    const {
        isLoading,
        getBrandAndBrandVariantCombinations,
        getBrandVariantDetails,
        upsertPrioritization,
        getPrioritization,
        areaCodes,
        selectedAreas,
        search
    } = props;

    const columns = [
        {
            title: 'Area',
            dataIndex: 'area',
            key: 'area',
            width: '10%',
        },
        {
            title: 'Brand Code',
            dataIndex: 'brand',
            key: 'brand',
            width: '15%'
        },
        {
            title: 'Brand',
            dataIndex: 'brand_desc',
            key: 'brand_desc',
        },
        {
            title: 'Brand Variant Code',
            dataIndex: 'brand_variant',
            key: 'brand_variant',
            width: '15%',
            render: (text, record) => (
                text || <Select
                    style={{ width: '100%' }}
                    onChange={onBrandVariantChangeHandler}
                    showSearch
                    filterOption={(input, option) =>
                        option.label.toLowerCase().includes(input.toLowerCase())}
                    options={_.sortBy(
                        _.uniqBy(brandCombinations?.map(i => ({ label: i.brand_variant, value: i.brand_variant })), 'value')
                        , ['label'])}
                />
            )

        },
        {
            title: 'Brand Variant',
            dataIndex: 'brand_variant_desc',
            key: 'brand_variant_desc',
            render: (text, record) => (
                text || <Select
                    style={{ width: '100%' }}
                    onChange={onBrandVariantChangeHandler}
                    showSearch
                    filterOption={(input, option) =>
                        option.label.toLowerCase().includes(input.toLowerCase())}
                    options={_.sortBy(
                        _.uniqBy(brandCombinations?.map(i => ({ label: i.brand_variant_desc, value: i.brand_variant })), 'value')
                        , ['label'])}
                />
            )
        },
        {
            title: 'Priority',
            dataIndex: 'priority',
            key: 'priority',
            width: '10%',
            render: (text, record) => (
                <input
                    style={{ width: '100%' }}
                    type="number"
                    value={text}
                    className='qty-input'
                    name={`${record.area}_${record.brand_variant}`}
                    onChange={onPriorityChangeHandler}
                />
            )
        },
        {
            title: 'Action',
            key: 'action',
            width: '6%',
            render: (record) => {
                return (
                    <>
                        {
                            hasEditPermission(pages.RULES_CONFIGURATION, features.EDIT_PRIORITIZATION) &&
                            <button
                                name={record.key}
                                className='info-action-btn'
                                disabled={!record?.hasChanges}
                                onClick={onSaveHandler}>
                                <CheckCircleOutlined />
                            </button>
                        }
                        {record.updated_by && <Popover
                            content={
                                <div className="time-details " >
                                    <p style={{ marginBottom: "5px" }}><b><i>Last Updated by:</i></b> {record.user_name ? `${record.user_name}` : null} ({record.updated_by})</p>
                                    <p style={{ marginBottom: "5px" }}><b><i>Last Updated on:</i></b> {Util.formatDate(record.updated_on)} {Util.formatTime(record.updated_on)}</p>
                                </div>}
                            title=""
                            trigger="hover"
                            placement="leftBottom"
                        >
                            <HistoryOutlined />
                        </Popover>
                        }
                    </>
                )
            }
        }
    ];

    const [disableAdd, setDisableAdd] = useState(false);
    const [tableData, setTableData] = useState([]);
    const [brandCombinations, setBrandCombinations] = useState([])

    const changedPriority = useRef({});
    const originalPriority = useRef({});

    useEffect(() => {
        fetchBrandAndBrandVariantCombinations();
        fetchPrioritizationData();
    }, [areaCodes, selectedAreas, search]);


    useEffect(() => {
        const tableLength = tableData?.length;
        if (!tableData || tableLength <= 0)
            setDisableAdd(false);
        else if (tableData[tableLength - 1]?.brand_variant)
            setDisableAdd(false);
        else
            setDisableAdd(true);
    }, [tableData]);

    async function fetchPrioritizationData() {
        const payload = {};
        selectedAreas && (payload.area_codes = selectedAreas);
        search && (payload.search = search);
        const res = await getPrioritization(payload ?? null);
        const data = [];
        res?.data?.forEach(i => {
            data.push({
                key: `${i.area_code}_${i.brand_variant}`,
                id: i.id,
                area: i.area_code,
                brand: i.brand,
                priority: i.priority,
                brand_desc: i.brand_desc,
                brand_variant: i.brand_variant,
                brand_variant_desc: i.brand_variant_desc,
                psku_details: i.psku_details,
                updated_by: i.updated_by,
                updated_on: i.updated_on,
                user_name: `${i.first_name} ${i.last_name}`,
                hasChanges: false
            })
            originalPriority.current[`${i.area_code}_${i.brand_variant}`] = i.priority;
        })
        setTableData(data)
    }

    function fetchBrandAndBrandVariantCombinations() {
        const payload = {};
        selectedAreas && (payload.area_codes = selectedAreas);
        getBrandAndBrandVariantCombinations(payload ?? null)
            .then((response) => {
                setBrandCombinations(response.data)
            })
            .catch((error) => {
            })
    }

    async function onBrandVariantChangeHandler(e) {
        const payload = {
            brand_variant_code: e
        };
        selectedAreas && (payload.area_codes = selectedAreas);
        const res = await getBrandVariantDetails(payload)
        const data = _.cloneDeep(tableData) ?? [];
        data.splice(-1, 1)
        res?.data?.forEach(i => {
            data.push({
                key: `${i.area_code}_${i.brand_variant}`,
                area: i.area_code,
                brand: i.brand,
                brand_desc: i.brand_desc,
                brand_variant: i.brand_variant,
                brand_variant_desc: i.brand_variant_desc,
                psku_details: i.psku_details,
                hasChanges: false
            })
            originalPriority.current[`${i.area_code}_${i.brand_variant}`] = "";
        })
        const uniqData = findUniqueKeepFirstMaintainOrder(data);
        setTableData(uniqData)
    }

    function findUniqueKeepFirstMaintainOrder(arr) {
        const uniqueArr = [];
        const map = {};
        for (const element of arr) {
            const { area, brand_variant } = element;
            if (!map[`${area}_${brand_variant}`]) {
                map[`${area}_${brand_variant}`] = true;
                uniqueArr.push(element);
            }
        }
        return uniqueArr;
    }

    function onResetHandler() {
        fetchPrioritizationData()
    };

    function onClickAddHandler() {
        const emptyRow = {
            area: '',
            brand: '',
            brand_name: '',
            brand_variant: '',
            brand_variant_desc: '',
            hasChanges: false
        };

        (tableData?.length) ? setTableData([...tableData, emptyRow]) : setTableData([emptyRow])
    };

    function onPriorityChangeHandler(e) {
        let { value, name } = e.target;
        value = Math.round(Math.abs(value))
        value = Util.removeLeadingZeros(value);
        changedPriority.current[name] = value;
        const data = _.cloneDeep(tableData);
        const index = data.findIndex(i => i.key === name);
        data[index].priority = value;
        if (+originalPriority.current[name] === +value) {
            data[index].hasChanges = false;
            delete changedPriority.current[name];
        } else if (value === "" || value == null) {
            data[index].hasChanges = false;
        } else {
            data[index].hasChanges = true;
        }
        setTableData(data);
    }

    async function onSaveHandler(e) {
        const { name } = e.currentTarget;
        const [area, brand_variant] = name.split("_");
        const payload = [];
        if (changedPriority.current[name]) {
            payload.push({ area, brand_variant, priority: changedPriority.current[name] })
            const save = await upsertPrioritization({ data: payload });
            if (save.success) {
                Util.notificationSender('Success', save.message, true);
                if (save.data) {
                    const savedId = save.data;
                    const data = _.cloneDeep(tableData);
                    data.forEach(d => {
                        if (savedId[d.key]) {
                            d.id = savedId[d.key]
                            d.hasChanges = false;
                            delete changedPriority.current[d.key];
                            originalPriority.current[d.key] = d.priority;
                        }

                    });
                    setTableData(data);
                }
            } else {
                Util.notificationSender("Error", save.message, false)
            }
        }
    }

    async function saveAllHandler() {
        const payload = [];
        Object.entries(changedPriority.current)?.forEach(([key, value]) => {
            if (value) {
                const [area, brand_variant] = key.split("_");
                payload.push({ area, brand_variant, priority: value })
            }
        });
        const save = await upsertPrioritization({ data: payload });
        if (save.success) {
            Util.notificationSender('Success', save.message, true);
            if (save.data) {
                const savedId = save.data;
                const data = _.cloneDeep(tableData);
                data.forEach(d => {
                    if (savedId[d.key]) {
                        d.id = savedId[d.key]
                        d.hasChanges = false;
                        delete changedPriority.current[d.key];
                        originalPriority.current[d.key] = d.priority;
                    }
                });
                setTableData(data);
            }
        } else {
            Util.notificationSender("Error", save.message, false)
        }
    }

    return (
        <>
            <div className="n-card-h table-header-options">
                <span className='important-notification3 rule-config-disclaimer'>[CAUTION: Please be aware that any changes made here will directly affect the order placement and delivery. Ensure you understand the implications of these changes before proceeding.]</span>
                <Tooltip title="Reset to last saved state" placement='bottom'>
                    <button className='reset-button' onClick={onResetHandler} >
                        <SyncOutlined spin={isLoading} /> Reset
                    </button>
                </Tooltip>
                <button className='save-all-button' onClick={saveAllHandler}
                    disabled={!(hasEditPermission(pages.RULES_CONFIGURATION, features.EDIT_PRIORITIZATION) && tableData?.some(t => t.hasChanges))}
                >
                    <Tooltip title="Save All Changes" placement='bottom'>
                        <SaveOutlined /> Save All
                    </Tooltip>
                </button>
                <button
                    className='addmore-button'
                    onClick={onClickAddHandler}
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
            <div className="prioritization-table-container">
                <Table
                    columns={columns}
                    expandable={{ expandedRowRender }}
                    dataSource={tableData}
                    size="small"
                    pagination={false}
                    loading={isLoading}
                    scroll={{ y: 'calc(100vh - 440px)' }}
                    rowClassName={(record) => record.id ? "" : "unsaved-rule"}
                />
            </div>
        </>
    );
};

Prioritization.propTypes = {
    isLoading: PropTypes.bool,
    getBrandAndBrandVariantCombinations: PropTypes.func.isRequired,
    getBrandVariantDetails: PropTypes.func.isRequired,
    upsertPrioritization: PropTypes.func.isRequired,
    getPrioritization: PropTypes.func.isRequired,
};

const mapStateToProps = state => {
    return {
        isLoading: state.loader.isLoading,
    };
}
const mapDispatchToProps = dispatch => {
    return {
        getBrandAndBrandVariantCombinations: (data) => dispatch(Actions.getBrandAndBrandVariantCombinations(data)),
        getBrandVariantDetails: (data) => dispatch(Actions.getBrandVariantDetails(data)),
        upsertPrioritization: (data) => dispatch(Actions.upsertPrioritization(data)),
        getPrioritization: (data) => dispatch(Actions.getPrioritization(data)),
    };
}
export default connect(mapStateToProps, mapDispatchToProps)(Prioritization);