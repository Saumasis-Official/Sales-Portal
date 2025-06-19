import { connect } from 'react-redux';
import { Col, Row, Select, Tooltip, Input, Popover, Modal } from 'antd';
import * as Action from '../actions/adminAction';
import PropTypes, { element, func } from 'prop-types';
import { useEffect, useState, useRef } from 'react';
import './RuleConfigurations.css';
import _ from 'lodash';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import CascadeCheckbox from '../../../components/CascadeCheckbox/CascadeCheckbox';
import { pages, hasViewPermission } from '../../../persona/distributorHeader';
import { NO_DATA_SYMBOL } from '../../../constants';
import Tabs from '../../../components/Tabs/Tabs';
import Prioritization from './Prioritization';
import NonForecastedPsku from './NonForecastedPsku';
import { DetailedView } from './DetailedView';
import NonForecastedAddView from './AddView'
import NonForecastedUpdateView  from './UpdateView';

// Uncomment this component when we have to enable Prioritization
const tabsOptions = [
    { label: 'Rule Configurations', value: 'ruleConfig', title: "Rule Configuration", default: true },
    { label: 'Non-Forecasted PSKU', value: 'nonForecast', title: "Non-Forecasted PSKU" },
];

function RuleConfigurations(props) {
    const { dashboardFilterCategories, getSKUCodes, getSKUDetails, getCustomerGroups, saveRuleConfig, getRuleConfig, isLoading, getAllDbList, upsertRuleConfiguration, upsertSingleRuleConfiguration } = props;
    const distChannels = ['GT', 'NOURISHCO']
    const { Option } = Select;
    const [areaDetails, setAreaDetails] = useState();
    const [areaCodes, setAreaCodes] = useState([]);
    const [selectedAreas, setSelectedAreas] = useState([]);
    const [customerGroups, setCustomerGroups] = useState([]);
    const [tableData, setTableData] = useState([]);
    const [skuCodes, setSkuCodes] = useState([]);
    const [zoneAreaOptions, setZoneAreaOptions] = useState([]);
    const [checkAllStatus, setCheckAllStatus] = useState([]); // contains of array of customer group names which are checked.
    const [search, setSearch] = useState('');
    const [selectedTab, setSelectedTab] = useState('ruleConfig');
    const [checkedRecords, setCheckedRecords] = useState({})
    const [originalCheckedRecords, setOriginalCheckedRecords] = useState({})
    const [selectedTseCodes, setSelectedTseCodes] = useState({})
    const [selectedDistChannels, setSelectedDistChannels] = useState('GT');
    const [modalStatus, setModalStatus] = useState({
        isModalOpen: false,
        modalType: null,
    })
    const [originalData, setOriginalData] = useState([]);

    const areaDbList = useRef({})
    const tseDbList = useRef({})
    const tseAreaMap = useRef({});
    const zoneAreaCodesMap = useRef({});
    const unsavedData = useRef([]);
    const selectedTseCode = useRef([]);
    const cgStatus = useRef({});
    const openedPsku = useRef(null);
    const initialDistChannel = useRef('');

    const debounceSearch = useRef(_.debounce(nextValue => setSearch(nextValue), 500)).current;

    async function fetchAreaDbList() {
        const dc = selectedDistChannels;
        const response = await getAllDbList({ dist_channels: distChannels.join(',') });
        const tempAreaDbList = {};
        const tempAreaTseList = {};
        const tempTseAreaMap = {} 
        response.data?.forEach(item => {
            tempAreaDbList[item.area_code] = item.db_list;
            tempAreaTseList[item.area_code] = {};
            Object.keys(item.db_list).forEach(cg => {
                item.db_list[cg]?.forEach(db => {
                    tempTseAreaMap[db.tse_code] = item.area_code;
                    if (!tempAreaTseList[item.area_code]?.hasOwnProperty(db.tse_code)) {
                        tempAreaTseList[item.area_code][db.tse_code] = {}
                        tempAreaTseList[item.area_code][db.tse_code][cg] = [db]   
                    }
                    else {
                        if (!tempAreaTseList[item.area_code][db.tse_code].hasOwnProperty(cg)) {
                            tempAreaTseList[item.area_code][db.tse_code][cg] = [db]
                        } else tempAreaTseList[item.area_code][db.tse_code][cg].push(db)
                    }

                })
            })
        })
        tseAreaMap.current = tempTseAreaMap
        tseDbList.current = tempAreaTseList;
        areaDbList.current = tempAreaDbList;
        if (initialDistChannel.current !== '' && areaCodes.length > 0) { //Make it empty on tab change
            fetchRuleConfig();
            fetchSKUCodes();
        } else 
            initialDistChannel.current = _.cloneDeep(selectedDistChannels);
    }

    useEffect(() => {
        async function getFilterCategories() {
            const res = await dashboardFilterCategories(true);
            setAreaDetails(res.response.area_details);
            const regions = new Set();
            const areas = new Set();
            res.response.area_details.forEach(item => {
                regions.add(item.region);
                areas.add(item.area_code);
                const channel = fetchChannelFromCode(item.distribution_channel);
            })
            setAreaCodes([...areas]);
        }

        async function fetchCustomerGroups() {
            const res = await getCustomerGroups();
            setCustomerGroups(res);
        }

        getFilterCategories();
        fetchCustomerGroups();
    }, []);

    useEffect(() => {
        if (selectedTab === 'ruleConfig')
        fetchAreaDbList();
    },[selectedDistChannels]);

    useEffect(() => {
        const options = [];
        const zoneAreaMap = {};
        const tseAreaMap = {}
        function mapZoneArea() {
            areaDetails?.forEach(item => {
                if (zoneAreaMap[item.region]) {
                    zoneAreaMap[item.region].add(item.area_code);
                } else {
                    zoneAreaMap[item.region] = new Set([item.area_code]);
                }
                if (!tseAreaMap[item.area_code]) {
                    tseAreaMap[item.area_code] = new Set();
                }
                tseAreaMap[item.area_code].add(item.tse_code)
            });
            zoneAreaCodesMap.current = zoneAreaMap;
            Object.keys(zoneAreaMap)?.sort().forEach(zone => {
                const zoneOptions = {
                    label: zone,
                    value: zone,
                    children: Array.from(zoneAreaMap[zone])?.sort().map(area => ({
                        label: area,
                        value: area,
                    }))
                }
                zoneOptions.children.forEach(area => {
                    area.children = Array.from(tseAreaMap[area.value])?.sort().map(tse => ({ label: tse, value: tse }));
                })
                options.push(zoneOptions);

            });
            setZoneAreaOptions(options);
        }
        mapZoneArea();
    }, [areaDetails]);

    useEffect(() => {
        if (areaCodes.length > 0) {
            if (selectedTab === 'ruleConfig') {
                fetchSKUCodes();
                fetchRuleConfig();
            }
        }
    }, [selectedAreas, search, selectedTab, areaCodes]);

    useEffect(() => {
        if(selectedAreas.length>0)
            setSelectedAreas([]);
        initialDistChannel.current = '';
    }, [selectedTab])

    useEffect(() => {
        const areaTse = [];
        selectedAreas.forEach(selectedItem => {
            if (selectedItem.length <= 4) {
                areaTse.push(...Object.keys(tseDbList.current[selectedItem] ?? {}));
            }
            else areaTse.push(selectedItem)
        })
        selectedTseCode.current = _.cloneDeep(areaTse);
    },[selectedAreas])

    async function fetchSKUCodes(areas) {
        const res = await getSKUCodes({ area_codes: selectedAreas?.length > 0 ? selectedAreas : areaCodes, dist_channels: [selectedDistChannels] });
        setSkuCodes(res);
    };

    async function fetchRuleConfig() {
        const res = await getRuleConfig({search, dist_channels: [selectedDistChannels] });
        const applicableArea = selectedTseCode.current.length > 0 ? selectedTseCode.current : areaCodes;
        const filteredRows =  res.data?.filter(row => {
            if(
                row.psku_code?.toLowerCase()?.includes(search.toLocaleLowerCase()) ||
                row.brand_name?.toLocaleLowerCase()?.includes(search.toLocaleLowerCase()) ||
                row.brand_variant?.toLocaleLowerCase()?.includes(search.toLocaleLowerCase()) ||
                row.psku_description?.toLocaleLowerCase()?.includes(search.toLocaleLowerCase())
            ){
                // filteredRows.push(row);
                return row.included_cg_list.some(areaTse => {
                    return applicableArea.includes(areaTse.tse_code)
                })
            }
        })
        setOriginalData(_.cloneDeep(res?.data ?? []))
        const finalData = selectedAreas.length > 0 ? filteredRows : res.data;
        setTableData(finalData);
        initializeCheckedRecords(res?.data ?? [])
    };

    // -------------------------===========Helpers============--------------------
    function initializeCheckedRecords(data) {
       
        const tempCheckedRecords = {};
        const tempCgStatus = {}
        const defaultIncludedCg = {}
        customerGroups.forEach(cg => defaultIncludedCg[cg.name] = false)
        const tseList = Object.values(tseDbList.current).reduce((acc, item) => { return [...acc, ...Object.keys(item)] }, []);

        function tseCg(psku, includedTseCgMap, tse ) {
            const areaCode = tseAreaMap.current[tse] ?? tse.substr(0, 4);
            const key = `${areaCode}#${psku.psku_code}#${tse}`
            tempCheckedRecords[key] = {};
            customerGroups.forEach(cg => {
                tempCheckedRecords[key][cg.name] = includedTseCgMap[tse]?.included_cg.hasOwnProperty(cg.name) ? typeof (includedTseCgMap[tse].included_cg[cg.name]) == 'boolean' ? includedTseCgMap[tse].included_cg[cg.name] : new Set(includedTseCgMap[tse].included_cg[cg.name]) : false ?? false
                if (!tempCgStatus[psku.psku_code].hasOwnProperty(cg.name)) {
                    tempCgStatus[psku.psku_code][cg.name] = new Set();
                }
                if (selectedTseCode.current.length == 0 || selectedTseCode.current.includes(tse))
                    tempCgStatus[psku.psku_code][cg.name].add(tempCheckedRecords[key][cg.name])
            })
        }

        if (tseList?.length > 0) {
            data.forEach(psku => {
                const includedTseCgMap = {};
                psku.included_cg_list.forEach(tseCg => {
                    includedTseCgMap[tseCg.tse_code] = { included_cg: tseCg.included_cg }
                })
                const tempIncludedTseCgMap = _.cloneDeep(includedTseCgMap);
                tempCgStatus[psku.psku_code] = {}
                tseList.forEach(tse => {
                    tseCg(psku,includedTseCgMap, tse)
                    if (tempIncludedTseCgMap[tse])
                        delete tempIncludedTseCgMap[tse];
                })
                if (Object.keys(tempIncludedTseCgMap).length > 0) {
                    Object.keys(tempIncludedTseCgMap).forEach(tse => {
                        tseCg(psku, includedTseCgMap, tse)
                        delete tempIncludedTseCgMap[tse];
                    })
                }
            })
        }
        cgStatus.current = tempCgStatus
        setCheckedRecords(tempCheckedRecords);
        setOriginalCheckedRecords(_.cloneDeep(tempCheckedRecords))
        return _.cloneDeep(tempCheckedRecords);
    }

    const openModal = function (operation, item = null) {
        setModalStatus({
            isModalOpen: true,
            modalType:operation
        })
        openedPsku.current = item
    }

    const fetchChannelFromCode=(code) => {
        if (code == '90')
            return 'NOURISHCO'
        else if (code == '10' || code == '40')
            return 'GT'
        else return 'OTHERS'
    }

    const getRuleConfigSKUDetails = (pskuCode) => {
        return getSKUDetails({ sku: pskuCode, area_codes: []});
    }

    async function fetchRuleConfigData() {
        const payload = { ...(selectedAreas?.length > 0 && { area_codes: selectedAreas }), search, dist_channels: [selectedDistChannels] }
        const initialData = await getRuleConfig(payload);
        if (initialData)
            return initialData.data;
    }


    // -----------------------=============Handlers================-----------------------

    function onChangeZoneAreaHandler(value) {
        let selectedAreaCodes = [];
        value?.forEach(v => {
            if (v.length > 1) {
                selectedAreaCodes.push(v[v.length-1]);
            } else {
                const areas = zoneAreaCodesMap.current[v[0]];
                selectedAreaCodes = [...selectedAreaCodes, ...areas];
            }
        });
        unsavedData.current = [];
        setSelectedAreas(selectedAreaCodes);
    };

    function onSearch(e) {
        debounceSearch(e.target.value);
    };

    function onTabChange(tab) {
        setCheckAllStatus([])
        setSelectedTab(tab);
    }

    function onDistChannelChange(value) {
        setSelectedDistChannels(value);
    }

    const cgCheckStatus = function (psku, cg) {
        const temp = cgStatus.current[psku]?.[cg] ?? new Set();
        if (temp.size == 1 && temp.has(true)) return 'CHECKED'
        if ((temp.size == 1 && temp.has(false)) || temp.size == 0) return 'UNCHECKED'
        else return 'PARTIAL'
    }

    async function resetHandler() {
        const data = await getRuleConfig({
            dist_channels: [selectedDistChannels]
        });
        if (data)
            return {
                data: data.data,
                initialCheckedRecords: initializeCheckedRecords(data.data, customerGroups)
            }
    };

    async function upsertAllRuleConfiguration(payload, selectedArea, operation) {
        return await upsertRuleConfiguration({ payload: payload, selectedArea: selectedArea, dist_channels: [selectedDistChannels], operation});
    }

    return (
        <div className='admin-dashboard-wrapper'>
            <div className="admin-dashboard-block">
                <div className="admin-dashboard-head">
                    <h2>{tabsOptions?.find(t => t.value === selectedTab)?.title}</h2>
                </div>
                <Row gutter={16}>
                    <Col span={8}>
                        {selectedTab != 'nonForecast' ? <CascadeCheckbox
                            options={zoneAreaOptions}
                            multiple={true}
                            onChange={onChangeZoneAreaHandler}
                            width={'100%'}
                            placeholder='Select Zones and Areas'
                        /> : <CascadeCheckbox
                            options={zoneAreaOptions}
                            multiple={true}
                            onChange={onChangeZoneAreaHandler}
                            width={'100%'}
                            placeholder='Select Zones, Areas or TSE' />}
                    </Col>
                    <Col span={12}>
                        <Input
                            autosize
                            addonBefore={<SearchOutlined />}
                            placeholder="Search by brand, brand variant, PSKU code and description"
                            onChange={onSearch}
                        />
                    </Col>
                    <Col span={4}>
                        <Select
                            value={selectedDistChannels}
                            onChange={(data) => {
                                setSelectedAreas([])
                                onDistChannelChange(data)
                            }
                            }
                            style={{ width: '100%' }}
                            placeholder='Dist Channels' >
                            {
                                distChannels.map((data) => {
                                    return (
                                        <Option value={data}>{data}</Option>
                                    )
                                })
                            }
                        </Select>
                    </Col>
                </Row>
                <Tabs tabs={tabsOptions} onChangeSelection={onTabChange} />

                {selectedTab === 'ruleConfig' &&
                    <>
                        <div className="n-card-h table-header-options ">
                        <span className='important-notification3 rule-config-disclaimer'>[CAUTION: Please be aware that any changes made here will directly affect the forecast. Ensure you understand the implications of these changes before proceeding.]</span>
                        <button className='addmore-button'>
                            <Tooltip title="Add New Rule" placement='bottom'>
                                <button className='reset-button' onClick={() => openModal('add-view', null)} >
                                    Add
                                </button>
                            </Tooltip>
                            <Tooltip title="Reset to last saved state" placement='bottom'>
                                <button className='reset-button' onClick={() => openModal('update-view', null)} >
                                    Edit
                                </button>
                            </Tooltip>
                        </button>
                        </div>
                        <div className="rule-config-table-container">
                            <table className='rule-config-table'>
                                <thead>
                                    <tr>
                                        <th className='width15'>Brand Variant</th>
                                        <th className='width10'>PSKU Code</th>
                                        <th style={{ width: '200px' }}>PSKU Description</th>
                                        <th className='width30' style={{padding: '10px 0' }}>Inclusion Customer Groups</th>
                                        <th className='width5'>
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableData?.length === 0 &&
                                        <tr className="material-table-row">
                                            <td colSpan={7} className="center-align">No Data Found. Please add new records</td>
                                        </tr> 
                                    }
                                {tableData?.map((item, index) => {
                                    const key = `${item.area}#${item.psku_code}`
                                        return (
                                            <tr key={item.id}>
                                                <td>{item.brand_variant_desc ? item.brand_variant_desc : NO_DATA_SYMBOL}</td>
                                                <td>{item.psku_code} </td>
                                                <td>{item.psku_name}</td>
                                                <td>
                                                    <tr>
                                                        {customerGroups?.map(cg => {
                                                            return (
                                                                <td className='width5' key={`cg=${cg.name}`}>
                                                                    <input
                                                                        id={`${index}-${cg.name}`}
                                                                        type="checkbox"
                                                                        name={cg.name}
                                                                        className="check-colm-op"
                                                                        checked={cgCheckStatus(item.psku_code, cg.name) == 'CHECKED'}
                                                                    />
                                                                    <label className={`colm-opt ${cgCheckStatus(item.psku_code, cg.name) == 'PARTIAL' ? 'colm-opt-partial-checked' : ''} `} key={cg.id} htmlFor={`${index}-${cg.name}`}>
                                                                        {cg.name}
                                                                    </label>
                                                                </td>
                                                            )
                                                        })
                                                        }
                                                    </tr>
                                                </td>
                                                <td className='admin-actions width10'>
                                                    {hasViewPermission(pages.RULES_CONFIGURATION) &&
                                                        <>
                                                            <EyeOutlined onClick={()=>openModal('detailed-view', item)}/>
                                                        </>
                                                    }
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>

                }
                {selectedTab === 'priority' &&
                    <Prioritization areaCodes={areaCodes} selectedAreas={selectedAreas} search={search} />
                }
                {selectedTab === "nonForecast" &&
                    <NonForecastedPsku areaCodes={areaCodes} selectedAreas={selectedAreas} search={search} zoneAreaOptions={zoneAreaOptions} selectedDistChannels={selectedDistChannels} setSelectedDistChannels={setSelectedDistChannels} tseAreaMap={tseAreaMap.current} />}
            </div>

            {modalStatus.isModalOpen && <Modal
                maskStyle={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                wrapClassName="comment-modal"
                bodyStyle={{ padding: '10px', height: '75vh', overflowY: 'auto', scrollbarWidth: 'thin' }}
                maskClosable={false}
                width='90vw'
                title={modalStatus.modalType == 'detailed-view' ? `Detailed View` : modalStatus.modalType == 'add-view' ? 'Add New PSKU' : 'Update'}
                visible={modalStatus.isModalOpen}
                footer={null}
                onCancel={() => {
                    if (selectedDistChannels != 'GT' && modalStatus.modalType !== 'detailed-view' )
                        setSelectedDistChannels('GT');
                    else {
                        fetchRuleConfig();
                        fetchSKUCodes();
                    } 
                    setModalStatus({
                        isModalOpen: false,
                        modalType: null
                    });
                    // loadData(selectedTseCodes.current, selectedDistChannels.length > 0 ? selectedDistChannels : distChannels);
                }}
            >
                {modalStatus.modalType === 'detailed-view' &&
                    <DetailedView
                        tseCodes={tseDbList.current}
                        customerGroups={customerGroups}
                        db_list={Object.values(tseDbList.current).reduce((obj, item) => ({ ...obj, ...item }), {})}
                        zoneAreaOptions={zoneAreaOptions}
                        selectedPsku={openedPsku.current}
                        tseAreaMap={tseAreaMap}
                        checkedRecords={Object.entries(checkedRecords).reduce((acc, [key, value]) => {
                            if (key.includes(openedPsku.current.psku_code)) {
                                acc[key] = value;
                            }
                            return acc;
                        }, {})}
                        checkedData={Object.fromEntries(Object.entries(checkedRecords).filter(([key, val]) => key.includes(openedPsku.current.psku_code)))}
                    />
                }
                {modalStatus.modalType === 'add-view' &&
                    <NonForecastedAddView
                        customerGroups={customerGroups}
                        tseCodes={tseDbList.current}
                        // upsertHandler={(payload)=>upsertSingleRuleConfiguration(payload,selectedDistChannels)}
                        getSKUDetails={getRuleConfigSKUDetails}
                        db_list={Object.values(tseDbList.current).reduce((obj, item) => ({ ...obj, ...item }), {})}
                        zoneAreaOptions={zoneAreaOptions}
                        existingPskus={_.cloneDeep(tableData).map(item => item.psku_code)}
                        skuCodes={skuCodes.sort((a, b) => a.description.localeCompare(b.description))}
                        upsertAllNonForecastedPskus={(data, selectedArea) => upsertAllRuleConfiguration(data, selectedArea,'INSERT')}
                        selectedDistChannels={selectedDistChannels.length > 0 ? selectedDistChannels : distChannels}
                        onDistChannelChange={onDistChannelChange}
                        tab={selectedTab}
                        tseAreaMap={tseAreaMap.current}
                    />
                }
                {modalStatus.modalType === 'update-view' &&
                    <NonForecastedUpdateView 
                        customerGroups={customerGroups}
                        tseCodes={tseDbList.current}
                        db_list={Object.values(tseDbList.current).reduce((obj, item) => ({ ...obj, ...item }), {})}
                        zoneAreaOptions={zoneAreaOptions}
                        initialTableData={originalData}
                        upsertAllNonForecastedPskus={(data, selectedArea) => upsertAllRuleConfiguration(data, selectedArea, 'UPDATE')}
                        initialCheckedRecords={checkedRecords}
                        initialIndicator={cgStatus.current}
                        checkedData={checkedRecords}
                        getNonForecastedPsku={fetchRuleConfigData}
                        resetHandler={resetHandler}
                        upsertHandler={(payload) => upsertSingleRuleConfiguration(payload, selectedDistChannels)}
                        selectedDistChannels={selectedDistChannels}
                        onDistChannelChange={onDistChannelChange}
                        tab={selectedTab}
                        tseAreaMap={tseAreaMap.current}
                    />
                }
            </Modal>
            }

        </div>
    );
}

RuleConfigurations.propTypes = {
    dashboardFilterCategories: PropTypes.func.isRequired,
    getSKUCodes: PropTypes.func.isRequired,
    getSKUDetails: PropTypes.func.isRequired,
    getCustomerGroups: PropTypes.func.isRequired,
    saveRuleConfig: PropTypes.func.isRequired,
    getRuleConfig: PropTypes.func.isRequired,
    isLoading: PropTypes.bool,
};

const mapStateToProps = (state) => {
    return {
        isLoading: state.loader.isLoading,
    };
};
const mapDispatchToProps = (dispatch) => {
    return {
        dashboardFilterCategories: (ruleConfig) => dispatch(Action.dashboardFilterCategories(ruleConfig)),
        getSKUCodes: (data) => dispatch(Action.getSKUCodes(data)),
        getSKUDetails: (data) => dispatch(Action.getSKUDetails(data)),
        getCustomerGroups: () => dispatch(Action.getCustomerGroups()),
        saveRuleConfig: (data) => dispatch(Action.saveRuleConfig(data)),
        getRuleConfig: (data) => dispatch(Action.getRuleConfig(data)),
        getAllDbList: (data) => dispatch(Action.getAllDbList(data)),
        upsertRuleConfiguration: (payload) => dispatch(Action.upsertAllRuleConfiguration(payload)),
        upsertSingleRuleConfiguration: (payload,channel) => dispatch(Action.upsertRuleConfiguration(payload, channel)),
    }
};

export default connect(mapStateToProps, mapDispatchToProps)(RuleConfigurations);