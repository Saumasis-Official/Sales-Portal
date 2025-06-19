import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import * as Action from "../actions/adminAction";
import {
    Tooltip, Select, Popover, Modal
} from "antd";
import { NO_DATA_SYMBOL } from "../../../constants";
import _, { cloneDeep } from 'lodash';
import "./NonForecastedPsku.css"
import { DetailedView } from "./DetailedView";
import NonForecastedUpdateView from './UpdateView'
import NonForecastedAddView from "./AddView";
import { EyeTwoTone } from "@ant-design/icons";
import { hasEditPermission, pages } from "../../../persona/distributorHeader";


function NonForecastedPsku(props) {
    const {
        getNonForecastedPsku,
        getCustomerGroups,
        getSKUCodes,
        areaCodes,
        selectedAreas,
        selectedDistChannels,
        getSKUDetails,
        getAllDbList,
        search,
        zoneAreaOptions,
        upsertNonForecastedPsku,
        upsertAllNonForecasted,
        setSelectedDistChannels,
        tseAreaMap
    } = props;
    const [tableData, setTableData] = useState([]);
    const [customerGroups, setCustomerGroups] = useState([]);
    const [checkedRecords, setCheckedRecords] = useState({}); // state to maintain the checked distributors and customer groups
    const [skuCodes, setSkuCodes] = useState([])
    const [allDbList, setAllDbList] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalOperation, setModalOperation] = useState(null);

    /*---------------useRef----------------*/
    const originalData = useRef([]);
    const tempTable = useRef([]);
    const tseCodes = useRef({});
    const selectedTseCodes = useRef([])
    const formattedDbResult = useRef({})
    const openedPsku = useRef(null)
    const cgStatus = useRef({})
    const selectedChannel = useRef(null);
    //--------------------=====useEffect====-----------------
    useEffect(() => {
        getSkuCodesForNonForecast();
    }, [selectedDistChannels]);

    useEffect(() => {
        const areaTse = [];
        selectedAreas.forEach(selectedItem => {
            if (selectedItem.length == 4) {
                areaTse.push(...Object.keys(tseCodes.current[selectedItem] ?? {}));
            }
            else areaTse.push(selectedItem)
        })
        selectedTseCodes.current = _.cloneDeep(areaTse);
    }, [selectedAreas])
    
    useEffect(() => {
        searchFilter();
    }, [search])

    useEffect(() => {
        const temp = {}
        const tempDbList = {}
        allDbList.forEach(area => {
            tempDbList[area.area_code] = area.db_list
            temp[area.area_code] = {}
            Object.keys(area.db_list).forEach(cg => {
                for (let db of area.db_list[cg]) {
                    if (!temp[area.area_code].hasOwnProperty(db.tse_code)) {
                        temp[area.area_code][db.tse_code] = {};
                        temp[area.area_code][db.tse_code] = {
                            [cg]: [db]
                        };
                    }
                    else {
                        if (!temp[area.area_code][db.tse_code].hasOwnProperty(cg)) {
                            temp[area.area_code][db.tse_code][cg] = [db]
                        }
                        else temp[area.area_code][db.tse_code][cg].push(db)
                    }
                }
            })
        })
        tseCodes.current = temp;
        formattedDbResult.current = tempDbList;
        if (Object.keys(checkedRecords).length < 1 && Object.keys(cgStatus.current).length<1)
            initializeCheckedRecords(originalData.current, customerGroups);
    }, [allDbList])

    //----------------=====API CALLS=====--------------
    async function fetchNonForecastedPsku(area_code = []) {
        const response = await getNonForecastedPsku({ area_code: [], dist_channels: [selectedDistChannels] });
        const pskuForSelectedAreas = response.data?.filter(item => {
            if (item.brand_desc?.toLowerCase()?.includes(search.toLowerCase()) ||
                item.brand_variant_desc?.toLowerCase()?.includes(search.toLowerCase()) ||
                item.psku_code?.toLowerCase()?.includes(search.toLowerCase()) ||
                item.psku_name?.toLowerCase()?.includes(search.toLowerCase()))
                return item.included_cg_list.some(areaTse => {
                    return area_code.includes(areaTse.tse_code)
                })
        });
        originalData.current = _.cloneDeep(response.data);
        tempTable.current = area_code.length>0 ? pskuForSelectedAreas : response.data;
        setTableData(area_code.length > 0 ? pskuForSelectedAreas : response.data);
        return response.data;
    };

    async function fetchCustomerGroups() {
        const res = await getCustomerGroups();
        setCustomerGroups(res);
        return res;
    };

    async function loadData(area_code = []) {
        const data = await fetchNonForecastedPsku(area_code);
        const cgs = await fetchCustomerGroups();
        initializeCheckedRecords(data, cgs)
        if (search != '') {
            searchFilter();
        }
    }

    async function getSkuCodesForNonForecast() {
        const dbData = await getAllDbList({dist_channels: 'GT,NOURISHCO'});
        setAllDbList(dbData.data);
        const res = await getSKUCodes({ area_codes: selectedAreas?.length > 0 ? selectedAreas : areaCodes, non_forecasted: true, dist_channels: ['GT', 'NOURISHCO'] });
        if (dbData) {
            loadData(selectedTseCodes.current)
            selectedChannel.current = selectedDistChannels;
        }
        setSkuCodes(res);
    };
    
    function getNonForecastedSKUDetails(pskuCode) {
        return getSKUDetails({ sku: pskuCode, area_codes: [], non_forecasted: true });
    }

    async function fetchNonForecastedData() {
        const initialData = await getNonForecastedPsku({ area_code: [], dist_channels: [selectedDistChannels] });
        if(initialData)
            return initialData.data;
    }

    //-------------------------------======Helpers=====----------------------

    const initializeCheckedRecords = function (data, cgs) {
        const tempCheckedRecords = {};
        const tempCgStatus = {}
        const defaultIncludedCg = {}
        cgs.forEach(cg => defaultIncludedCg[cg.name] = false)
        const tseList = Object.values(tseCodes.current).reduce((acc, item) => { return [...acc, ...Object.keys(item)] }, []);

        function tseCg(psku, includedTseCgMap, tse) {
            const areaCode = tseAreaMap[tse] ?? tse.substr(0, 4).trim();
            const key = `${areaCode}#${psku.psku_code}#${tse}`
            tempCheckedRecords[key] = {};
            cgs.forEach(cg => {
                tempCheckedRecords[key][cg.name] = includedTseCgMap[tse]?.included_cg.hasOwnProperty(cg.name) ? typeof (includedTseCgMap[tse].included_cg[cg.name]) == 'boolean' ? includedTseCgMap[tse].included_cg[cg.name] : new Set(includedTseCgMap[tse].included_cg[cg.name]) : false ?? false
                if (!tempCgStatus[psku.psku_code].hasOwnProperty(cg.name)) {
                    tempCgStatus[psku.psku_code][cg.name] = new Set();
                }
                if (selectedTseCodes.current.length == 0 || selectedTseCodes.current.includes(tse))
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
                    tseCg(psku, includedTseCgMap, tse);
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
            cgStatus.current = tempCgStatus
            setCheckedRecords(tempCheckedRecords);   
        }
        return _.cloneDeep(tempCheckedRecords);
    }

    const cgCheckStatus = function (psku, cg) {
        const temp = cgStatus.current[psku]?.[cg] ?? new Set();
        if (temp.size == 1 && temp.has(true)) return 'CHECKED'
        if ((temp.size == 1 && temp.has(false)) || temp.size ==0) return 'UNCHECKED'
        else return 'PARTIAL'
    }

    const searchFilter = () => {
        const tempTableData = _.cloneDeep(tempTable.current)
        const filteredTableData = tempTableData.filter(item => (item.area_code?.toLowerCase()?.includes(search.toLowerCase()) ||
            item.brand_desc?.toLowerCase()?.includes(search.toLowerCase()) ||
            item.brand_variant_desc?.toLowerCase()?.includes(search.toLowerCase()) ||
            item.psku_code?.toLowerCase()?.includes(search.toLowerCase()) ||
            item.psku_name?.toLowerCase()?.includes(search.toLowerCase())))
        setTableData(filteredTableData)
    }

    //--------------------------------=====Handlers=====---------------------------------

    const openModal = function (operation, item = null) {
        setIsModalOpen(true);
        setModalOperation(operation)
        openedPsku.current = item
    }
    async function upsertAllNonForecastedPskus(payload, selectedArea) {
        return await upsertAllNonForecasted({payload : payload,selectedArea:selectedArea,dist_channels:selectedDistChannels});
    }

    async function resetHandler() {
        const data = await getNonForecastedPsku({ area_code: [], dist_channels: [selectedDistChannels] });
        if (data)
            return {
                data : data.data,
                initialCheckedRecords: initializeCheckedRecords(data.data, customerGroups)
            }
    };

    function upsertHandler(payload) {
        return upsertNonForecastedPsku(payload);
    }

    

    return (
        <>
            <div className="n-card-h table-header-options ">
                <span className='important-notification3 rule-config-disclaimer'>[CAUTION: Please be aware that any changes made here will directly affect the forecast. Ensure you understand the implications of these changes before proceeding.]</span>
                <button
                    className='addmore-button'
                // disabled={disableAdd}
                >
                    <>
                        <Tooltip title="Add New Item" placement='bottom'>
                            <button className='save-all-button' onClick={e => openModal('add-new')}>
                                Add
                            </button>
                        </Tooltip>
                        <Tooltip title="Edit" placement='bottom'>
                            <button className='save-all-button' onClick={() => openModal('update-view')}> Edit
                            </button>
                        </Tooltip>
                    </>
                </button>
            </div>
            <div className="rule-config-table-container">
                <table className="rule-config-table">
                    <thead>
                        <tr>
                            <th>Brand Variant</th>
                            <th >PSKU Code</th>
                            <th>PSKU Description</th>
                            <th className="inclusion-header" style={{ width :`${customerGroups.length*30}px` ,padding: '10px 0' }}>
                                Inclusion Customer Groups
                            </th>
                            <th className='width10'>
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map((item, index) => {
                            return (
                                <tr className={item.updated_on ? "" : "unsaved-rule"}>
                                    <td>{item.brand_variant_desc ? item.brand_variant_desc : NO_DATA_SYMBOL}</td>
                                    <td>
                                        {item.psku_code ?
                                            <span>{item.psku_code}</span> :
                                            <Select
                                                style={{ width: '100%' }}
                                                showSearch
                                                autoFocus
                                                placeholder='Select a PSKU Code'
                                                optionFilterProp='children'
                                                // onChange={(value) => { onSKUChangeHandler(value, index) }}
                                                filterOption={(input, option) =>
                                                    option.label.toLowerCase().includes(input.toLowerCase())
                                                }
                                                options={_.sortBy(skuCodes, ['code'])?.map(item => ({ label: item.code, value: item.code }))}
                                            />
                                        }
                                    </td>
                                    <td>
                                            <span>{item.psku_name}</span>
                                    </td>
                                    <td>
                                        <tr>
                                            {customerGroups?.map(cg => {
                                                return (
                                                    <td style={{ width: '30px'}} className="inclusion-cg" key={`cg=${cg.name}`}>
                                                        <input
                                                            id={`${index}-${cg.name}`}
                                                            type="checkbox"
                                                            name={cg.name}
                                                            className="check-colm-op"
                                                            checked={cgCheckStatus(item.psku_code, cg.name) == 'CHECKED'}
                                                            onChange={e => { }}
                                                        />
                                                        <label
                                                            key={cg.id}
                                                            htmlFor={`${index}-${cg.name}`}
                                                            className={`colm-opt
                                                                ${cgCheckStatus(item.psku_code, cg.name) == 'PARTIAL' ? 'colm-opt-partial-checked' : ''}
                                                            `}
                                                        >
                                                            {cg.name}
                                                        </label>
                                                    </td>
                                                )
                                            })
                                            }
                                        </tr>
                                    </td>
                                    <td onClick={() => { openModal('detailed-view', item) }}>
                                        <EyeTwoTone />
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>

                </table>
            </div>
            {isModalOpen && <Modal
                maskStyle={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                wrapClassName="comment-modal"
                bodyStyle={{ padding: '10px', height: '75vh', overflowY: 'auto', scrollbarWidth: 'thin' }}
                maskClosable={false}
                width='90vw'
                title={modalOperation == 'detailed-view' ? `Detailed View` : modalOperation == 'add-new' ? 'Add New PSKU' : 'Update'}
                visible={isModalOpen}
                footer={null}
                onCancel={() => {
                    setIsModalOpen(false);
                    setModalOperation(null);
                    modalOperation != 'detailed-view' && setSelectedDistChannels('GT')
                    loadData(selectedTseCodes.current);
                }}
            >
                {
                    modalOperation == 'detailed-view' ? <DetailedView
                        tseCodes={tseCodes.current}
                        customerGroups={customerGroups}
                        db_list={Object.values(tseCodes.current).reduce((obj, item) => ({ ...obj, ...item }), {})}
                        zoneAreaOptions={zoneAreaOptions}
                        selectedPsku={openedPsku.current}
                        tseAreaMap={tseAreaMap}
                        checkedRecords={Object.entries(checkedRecords).reduce((acc, [key, value]) => {
                            if (key.includes(openedPsku.current.psku_code)) {
                                acc[key] = value;
                            }
                            return acc;
                        }, {})}
                        checkedData={Object.fromEntries(Object.entries(checkedRecords).filter(([key, val]) => key.includes(openedPsku.current.psku_code)))} /> :
                        modalOperation == 'update-view' ? <NonForecastedUpdateView
                            customerGroups={customerGroups}
                            tseCodes={tseCodes.current}
                            db_list={Object.values(tseCodes.current).reduce((obj, item) => ({ ...obj, ...item }), {})}
                            zoneAreaOptions={zoneAreaOptions}
                            initialTableData={originalData.current}
                            upsertAllNonForecastedPskus={(data,selectedArea) => upsertAllNonForecastedPskus(data,selectedArea)}
                            initialCheckedRecords={checkedRecords}
                            initialIndicator={cgStatus.current}
                            checkedData={checkedRecords}
                            getNonForecastedPsku={fetchNonForecastedData}
                            resetHandler={resetHandler}
                            upsertHandler={upsertHandler} 
                            onDistChannelChange={(channel) => setSelectedDistChannels(channel)}
                            tseAreaMap={tseAreaMap}
                            selectedDistChannels={selectedDistChannels}/> :
                        <NonForecastedAddView
                            customerGroups={customerGroups}
                            tseCodes={tseCodes.current}
                            upsertHandler ={upsertHandler}
                            getSKUDetails={getNonForecastedSKUDetails}
                            db_list={Object.values(tseCodes.current).reduce((obj, item) => ({ ...obj, ...item }), {})}
                            zoneAreaOptions={zoneAreaOptions}
                            existingPskus={_.cloneDeep(tableData).map(item=>item.psku_code)}
                            skuCodes={skuCodes.sort((a, b) => a.description.localeCompare(b.description))}
                            upsertAllNonForecastedPskus={(data,selectedArea) => upsertAllNonForecastedPskus(data,selectedArea)}
                            selectedDistChannels={selectedDistChannels}
                            onDistChannelChange={(channel) => setSelectedDistChannels(channel)}
                            tseAreaMap={tseAreaMap}
                        />
                }
            </Modal>
            }
        </>
    );

};


const mapStateToProps = state => {
    return {
    };
};

const mapDispatchToProps = dispatch => {
    return {
        getNonForecastedPsku: (data) => dispatch(Action.getNonForecastedPsku(data)),
        getCustomerGroups: () => dispatch(Action.getCustomerGroups()),
        getSKUCodes: (data) => dispatch(Action.getSKUCodes(data)),
        getSKUDetails: (data) => dispatch(Action.getSKUDetails(data)),
        getAllDbList: (data) => dispatch(Action.getAllDbList(data)),
        upsertNonForecastedPsku: (data) => dispatch(Action.upsertNonForecastedPsku(data)),
        upsertAllNonForecasted : (data) => dispatch(Action.upsertAllNonForecasted(data))
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(NonForecastedPsku);