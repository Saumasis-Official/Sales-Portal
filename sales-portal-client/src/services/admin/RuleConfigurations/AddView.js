import React, { useEffect, useRef, useState } from "react";
import CascadeCheckbox from "../../../components/CascadeCheckbox/CascadeCheckbox";
import _ from "lodash";
import { notification, Select, Tooltip } from "antd";
import { CheckCircleOutlined, DeleteOutlined, SaveOutlined, SyncOutlined } from "@ant-design/icons";
import { NO_DATA_SYMBOL } from "../../../constants";
import { NonForecastedSubtable } from "./NonForecastedSubtable";
import { hasEditPermission, pages } from "../../../persona/distributorHeader";
import { connect } from "react-redux";

function NonForecastedAddView(props) {
    const {
        db_list,
        zoneAreaOptions,
        tseCodes,
        customerGroups,
        skuCodes,
        isLoading,
        upsertAllNonForecastedPskus,
        getSKUDetails,
        selectedDistChannels,
        onDistChannelChange,
        tab = '',
        tseAreaMap,
    } = props;
    const distributionChannels = ['GT', 'NOURISHCO'];

    //-------------------------------======State=====----------------------
    const [selectedAreaTseFilter, setSelectedAreaTseFilter] = useState([]);
    const [selectedPsku, setSelectedPsku] = useState([])
    const [expandedPsku, setExpandedPsku] = useState(null)
    const [pskuDetails, setPskuDetails] = useState({});
    const [checkedCgIndicator, setCheckedCgIndicator] = useState({});
    const [distChannel, setDistChannel] = useState(selectedDistChannels);

    //-------------------------------======Refs=====----------------------
    const filtredTse = useRef({});
    const formattedPsku = useRef({});
    const checkedRecords = useRef({});
    const checkAllStatus = useRef(new Set());
    const pskuSaveMap = useRef({});

    //-------------------------------======Effects=====----------------------
    useEffect(() => {
        const tempPskuMap = {};
        skuCodes.map(item => {
            tempPskuMap[item.code] = item;
        })
        formattedPsku.current = tempPskuMap;
    }, [skuCodes])

    useEffect(() => {
        async function pskuChange() {
            const tseSource = Object.keys(db_list || {});
            const tempCheckedRecords = _.cloneDeep(checkedRecords.current);
            const updatedCheckedRecord = {};
            pskuSaveMap.current = Object.keys(pskuSaveMap.current).reduce((acc, psku) => {
                if(selectedPsku.includes(psku))
                    acc[psku] = pskuSaveMap.current[psku];
                return acc;
            },{})
            selectedPsku.forEach(async(psku) => {
                tseSource.forEach(tse => {
                    const areaCode = tseAreaMap[tse] ?? tse.substring(0, 4).trim();
                    const key = `${areaCode}#${psku}#${tse}`;
                    if (!tempCheckedRecords[key]) {
                        const cgMap = {};
                        customerGroups.forEach(cg => {
                            cgMap[cg.name] = checkAllStatus.current.has(cg.name)
                        })
                        updatedCheckedRecord[key] = cgMap;
                    }
                    else updatedCheckedRecord[key] = tempCheckedRecords[key]

                })
            })
            checkedRecords.current = updatedCheckedRecord; 
            updateCheckedCgIndicator();

            selectedPsku.forEach(async (psku) => {
                if (!pskuDetails[psku]) {
                    const res = await getSKUDetails(psku);
                    if (res) {
                        setPskuDetails({
                            ...pskuDetails, [psku]: {
                                brand_name: res[0].brand_name,
                                brand_variant: res[0].brand_variant,
                                brand_desc: res[0].description
                            }
                        })
                    }
                }
            })
        }
        pskuChange();
    }, [selectedPsku])
    
    //-------------------------------======Helpers=====----------------------
    
    function payloadFormatter(payload) {
        Object.keys(payload || {}).forEach(pskuCode => {
            customerGroups.forEach(cg => {
                let tseArray = 'unselected';
                const areaSelectionMap = {};
                const areaTseArr = [];
                const currentPayload = payload[pskuCode].cg_data[cg.name];
                if (currentPayload.selected.length > currentPayload.unselected.length) {
                    currentPayload.selected = true;
                    tseArray = 'unselected';
                }
                else if (currentPayload.selected.length < currentPayload.unselected.length) {
                    currentPayload.unselected = true;
                    tseArray = 'selected';
                }
                currentPayload[tseArray].forEach(tse => {
                    const area = tseAreaMap[tse] ?? tse.substr(0, 4).trim();
                    if (!areaSelectionMap[area]) {
                        areaSelectionMap[area] = []
                    }
                    areaSelectionMap[area].push(tse);
                })
                Object.keys(areaSelectionMap).forEach(area => {
                    if (areaSelectionMap[area].length === Object.keys(tseCodes[area] || {}).length) {
                        areaTseArr.push(area)
                    }
                    else areaTseArr.push(...areaSelectionMap[area]);
                })
                if (areaTseArr.length > 0)
                    currentPayload[tseArray] = areaTseArr;
            })
        })
        return payload;
    }

    function isSaveEnable(pskuCode) {
        return pskuSaveMap.current[pskuCode] ?? false;
    }

    //-------------------------------======Handlers=====----------------------
    
    function handleFilterChange(value) {
        const tempSelectedTse = {};
        const selectedAreaCodes = []
        value.forEach(entry => {
            if (entry.length > 2) {
                selectedAreaCodes.push(entry[entry.length - 1])
            }
            else if (entry.length == 2) {
                selectedAreaCodes.push(...Object.keys(tseCodes[entry[1]] || {}));
            }
            else {
                zoneAreaOptions.forEach(zone => {
                    if (zone.label == entry[0]) {
                        zone.children?.forEach(area => {
                            selectedAreaCodes.push(...Object.keys( tseCodes[area.label] || {}))
                        })
                    }
                })
            }
        })
        selectedAreaCodes.forEach(tse => {
            tempSelectedTse[tse] = true;
        })
        filtredTse.current = tempSelectedTse;
        setSelectedAreaTseFilter(selectedAreaCodes)
    }

    function handlePskuFilterChange(value) {
        const selectedPskus = value.map(item => item.split("#")[0])
        setSelectedPsku(selectedPskus)
    }

    function onCgCheckHandler(pskuCode, cgArray) {
        const tempCheckedRecords = _.cloneDeep(checkedRecords.current)
        const tempCheckedData = {};
        const targetTse = selectedAreaTseFilter.length > 0 ? selectedAreaTseFilter : Object.keys(db_list)
        targetTse.forEach(tse => {
            const areaCode = tseAreaMap[tse] ?? tse.substring(0, 4).trim();
            const key = `${areaCode}#${pskuCode}#${tse}`
            const currentCheckedRecord = tempCheckedRecords[key];
            customerGroups.forEach(cg => {
                if (cgArray.includes(cg.name))
                    currentCheckedRecord[cg.name] = true;
                else currentCheckedRecord[cg.name] = false;
            })
            tempCheckedData[key] = currentCheckedRecord
        })
        checkedRecords.current = { ...checkedRecords.current, ...tempCheckedRecords }
        updateCheckedCgIndicator(pskuCode)
    }

    function cgAllCgCheckHandler(cgArray) {
        const tempCheckedRecords = _.cloneDeep(checkedRecords.current)
        const tempCheckedData = {}
        Object.keys(tempCheckedRecords || {}).forEach(key => {
            const [area, pskuCode, tse] = key.split('#');
            const currentCheckedRecord = tempCheckedRecords[key];
            if (selectedAreaTseFilter.length == 0 || (selectedAreaTseFilter.length > 0 && selectedAreaTseFilter.includes(tse))) {
                customerGroups.forEach(cg => {
                    if (cgArray.includes(cg.name) && !checkAllStatus.current.has(cg.name)) { //Make the status true if selection has the cg for the first time
                        currentCheckedRecord[cg.name] = true;
                    }
                    else if (!cgArray.includes(cg.name) && checkAllStatus.current.has(cg.name)) { //Make status false if cg is absent from current selection and it used to be present before
                        currentCheckedRecord[cg.name] = false;
                    }
                })
                tempCheckedData[key] = currentCheckedRecord
            }
        })
        checkedRecords.current = { ...checkedRecords.current, ...tempCheckedRecords }
        checkAllStatus.current = new Set(cgArray);
        updateCheckedCgIndicator()
    }

    function onDbCheckHandler(tse, areaCode, pskuCode, cg, e, dbCode) {
        const checked = e.target.checked;
        const key = `${areaCode}#${pskuCode}#${tse}`;
        const currentCheckedRecord = _.cloneDeep(checkedRecords.current[key]);
        if (checked) {
            if (currentCheckedRecord[cg].size) {
                currentCheckedRecord[cg].add(dbCode);
                if (db_list[tse][cg].length == currentCheckedRecord[cg].size)
                    currentCheckedRecord[cg] = true;
            }
            else {
                currentCheckedRecord[cg] = new Set();
                currentCheckedRecord[cg].add(dbCode)
            }

        } else {
            if (currentCheckedRecord[cg].size) {
                currentCheckedRecord[cg].delete(dbCode);
                if (currentCheckedRecord[cg].size == 0)
                    currentCheckedRecord[cg] = false;
            }
            else {
                currentCheckedRecord[cg] = new Set();
                db_list[tse][cg].forEach(dbData => {
                    if (dbData.id != dbCode)
                        currentCheckedRecord[cg].add(dbData.id)
                })
            }
        }
        checkedRecords.current = { ...checkedRecords.current, [key]: currentCheckedRecord }
        updateCheckedCgIndicator(pskuCode)
    }

    function updateCheckedCgIndicator(pskuCode = null) {
        const tempcheckedCgIndicator = {};
        const targetPsku = pskuCode ? [pskuCode] : selectedPsku;
        const tempPskuCanSaveMap = {};
        const falseCg = customerGroups.reduce((acc, cg) => {
            acc[cg.name] = false;
            return acc;
        }, {})
        targetPsku.forEach(psku => {
            tempPskuCanSaveMap[psku] = false;
            const cgMapping = {};
            const targetTse = selectedAreaTseFilter.length > 0 ? selectedAreaTseFilter : Object.keys(db_list)
            targetTse.forEach(cgTse => {
                const areaCode = tseAreaMap[cgTse] ?? cgTse.substring(0, 4).trim();
                const tseCode = cgTse
                const key = `${areaCode}#${psku}#${tseCode}`
                const currentCheckedRecord = checkedRecords.current[key];
                if (currentCheckedRecord) {
                    if (!_.isEqual(currentCheckedRecord, falseCg) || tab == 'ruleConfig') {
                        tempPskuCanSaveMap[psku] = true;
                    }
                    customerGroups.forEach(cg => {
                        if (!cgMapping[cg.name])
                            cgMapping[cg.name] = new Set();
                        cgMapping[cg.name].add(currentCheckedRecord[cg.name])
                    })   
                }
            })
            tempcheckedCgIndicator[psku] = cgMapping;
        })
        pskuSaveMap.current = { ...pskuSaveMap.current, ...tempPskuCanSaveMap };
        setCheckedCgIndicator({ ...checkedCgIndicator, ...tempcheckedCgIndicator })
    }

    function checkStatus(pskuCode) {
        const values = []
        const currentCheckedData = checkedCgIndicator[pskuCode];
        customerGroups.forEach(cg => {
            const cgData = currentCheckedData?.[cg.name];
            if (cgData?.has(true) || cgData?.size > 1 || (cgData?.size === 1 && [...cgData][0].size)) 
                values.push(cg.name)
        })
        return values
    }

    async function saveAllHandler(psku = null, saveType='save-all') {
        const tempCheckedRecords = _.cloneDeep(checkedRecords.current);
        const payload = {};
        Object.keys(tempCheckedRecords || {}).forEach(key => {
            const currentCheckedRecord = tempCheckedRecords[key];
            const [area, pskuCode, tse] = key.split("#");
            if (((saveType == 'save-line' && pskuCode == psku) || saveType == 'save-all') && pskuSaveMap.current[pskuCode] ) {
                if (!payload[pskuCode]) payload[pskuCode] = {
                    cg_data: {},
                    selectedTse: []
                }
                customerGroups.forEach(cg => {
                    if (!payload[pskuCode].cg_data[cg.name]) {
                        payload[pskuCode].cg_data[cg.name] = {
                            selected: [],
                            unselected: [],
                            partial: {}
                        }
                    }
                    if (currentCheckedRecord[cg.name].size)
                        payload[pskuCode].cg_data[cg.name].partial[tse] = Array.from(currentCheckedRecord[cg.name]);
                    else if (currentCheckedRecord[cg.name]) {
                        payload[pskuCode].cg_data[cg.name].selected.push(tse)
                    }
                    else
                        payload[pskuCode].cg_data[cg.name].unselected.push(tse)
                })   
            }
        })
        if (Object.keys(payload).length > 0) {
            const formattedPayload = payloadFormatter(payload);
            let payloadData = []
            if (Object.keys(formattedPayload).length > 10) {
                for (let i = 0; i < Object.keys(formattedPayload).length; i += 10) {
                    const pskus = Object.keys(formattedPayload).slice(i, i + 10);
                    const payloadChunk = pskus.reduce((acc, item) => {
                        acc[item] = formattedPayload[item];
                        return acc;
                    }, {})
                    payloadData.push([payloadChunk])
                }
            }
            payloadData.length == 0 && payloadData.push([formattedPayload])
            const upsertAllResponse = await Promise.all(payloadData.map(item => upsertAllNonForecastedPskus(...item, selectedAreaTseFilter)))
            if (upsertAllResponse[0].success) {
                notification.success({
                    message: "Success",
                    description: "Saved Successfully",
                    duration: 5,
                    className: "notification-success"
                });
                if (saveType == 'save-all') {
                    if (Object.keys(formattedPayload).length == selectedPsku) {
                        handleReset();
                    }
                    else {
                        const remainingPsku = [];
                        const remainingPskuSaveMap = {};
                        _.cloneDeep(selectedPsku).forEach(item => {
                            if (!Object.keys(formattedPayload).includes(item)) {
                                remainingPsku.push(item);
                                remainingPskuSaveMap[item] = pskuSaveMap.current[item];
                            }
                        })
                        checkAllStatus.current = new Set();
                        pskuSaveMap.current = remainingPskuSaveMap;
                        setSelectedPsku(remainingPsku);
                    }
                } else if (saveType == 'save-line') {
                    const tempCheckedRecords = _.cloneDeep(checkedRecords.current);
                    Object.keys(tempCheckedRecords || {}).forEach(key => {
                        if(psku!='' && key.includes(psku))
                            delete tempCheckedRecords[key];
                    })
                    checkedRecords.current = tempCheckedRecords;
                    const remainingPsku = selectedPsku.filter(item => item != psku)
                    if (remainingPsku.length == 0)
                        checkAllStatus.current = new Set();
                    setSelectedPsku(remainingPsku);
                }
            } else {
                notification.error({
                    message: "Fail",
                    description: "Save Unsuccessful",
                    duration: 5,
                    className: "notification-error"
                });
            }
        }
    }

    function handleDelete(pskuCode) {
        const remainingPsku = selectedPsku.filter(selectedPskuCode => selectedPskuCode != pskuCode)
        if (remainingPsku.length == 0) {
            checkAllStatus.current = new Set();
        }
        setSelectedPsku(remainingPsku);
    }

    function handleReset() {
        checkedRecords.current = {};
        checkAllStatus.current = new Set();
        setSelectedPsku([]);
    }
    return (
        <>
            <CascadeCheckbox
                options={zoneAreaOptions}
                multiple={true}
                onChange={handleFilterChange}
                width={'100%'}
                placeholder='PAN India'
            />
            <Select
                mode="multiple"
                placeholder="Select PSKUs to Add"
                onChange={handlePskuFilterChange}
                getPopupContainer={trigger => trigger.parentNode}
                options={skuCodes.filter(item => (selectedDistChannels === 'GT' && (item.dist_channels.includes(10) || item.dist_channels.includes(40))) || (selectedDistChannels === 'NOURISHCO' && item.dist_channels.includes(90)))
                    .map(item => ({ label: item.code + " " + item.description, value: item.code + '#' + item.description }))}
                value={selectedPsku.map(item => {
                    if (formattedPsku.current[item])
                        return item + '#' + formattedPsku.current[item]?.description
                })}
                style={{ width: '100%', marginTop:'10px' }}
                allowClear
                dropdownClassName="non-forecasted-tse-dropdown"
            />
            <Select
                placeholder="Select Distribution Channel"
                options={distributionChannels.map(item => ({ label: item, value: item }))}
                style={{ width: '100%', marginTop: '10px' }}
                value={distChannel}
                getPopupContainer={trigger => trigger.parentNode}
                onChange={(data) => {
                    setSelectedPsku([])
                    setDistChannel(data);
                    onDistChannelChange(data)
                }}
            />
            {selectedPsku.length > 0 && <>
                <div className='important-notification3 rule-config-disclaimer'>[CAUTION: Please be aware that any changes made here will directly affect the existing records. Ensure you understand the implications of these changes before proceeding.]</div>
                <div style={{display: 'flex',width:'100%', justifyContent: 'flex-end' }}>
                    <Tooltip title="Reset to last saved state" placement='bottom'>
                        <button className='reset-button'
                        onClick={handleReset}
                        >
                            <SyncOutlined spin={isLoading} />
                            Reset
                        </button>
                    </Tooltip>
                    <button className='save-all-button'
                        disabled={!hasEditPermission(pages.RULES_CONFIGURATION) || ((!Object.keys(pskuSaveMap.current).some(item => pskuSaveMap.current[item])) || (Object.keys(pskuSaveMap.current).some(item => pskuSaveMap.current[item]) && isLoading))}
                        onClick={saveAllHandler}
                    >
                        <Tooltip title="Save All Changes" placement='bottom'>
                            <SaveOutlined /> Save All
                        </Tooltip>
                    </button>
                </div>
                <div className="update-table-wrapper">
                    <table className="rule-config-table">
                        <thead>
                            <tr>
                                <th className="width5"></th>
                                <th >Brand Variant</th>
                                <th>PSKU Code</th>
                                <th >PSKU Description</th>
                                <th className="width30">
                                    <tr >
                                        <th colSpan={customerGroups.length}>
                                            Inclusion Customer Groups
                                        </th>
                                    </tr>
                                    <tr>
                                        <th style={{paddingBottom:'10px'}}>
                                            <Select
                                                mode="multiple"
                                                options={customerGroups.map(item => ({ label: item.name, value: item.name }))}
                                                allowClear
                                                getPopupContainer={trigger => trigger.parentNode}
                                                style={{ width: '400px' }}
                                                placeholder="Select Customer Groups"
                                                onChange={e => cgAllCgCheckHandler(e)}
                                                dropdownClassName="non-forecasted-tse-dropdown"
                                            />
                                        </th>
                                    </tr>
                                </th>
                                <th>
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedPsku.map((item, index) => {

                                const value = checkStatus(item)
                                return (
                                    <>
                                        <tr>
                                            <td className="width5">
                                                {expandedPsku != item && <button onClick={e => setExpandedPsku(item)} className="collapse-button-audit">+</button>}
                                                {expandedPsku == item && <button onClick={e => setExpandedPsku(null)} className="collapse-button-audit">-</button>}
                                            </td>
                                            <td className="width10">{pskuDetails[item]?.brand_desc ? pskuDetails[item].brand_desc : NO_DATA_SYMBOL}</td>
                                            {/* <td >{formattedPsku.current[item]?.brand_variant_desc ? formattedPsku.current[item].brand_variant_desc : NO_DATA_SYMBOL}</td> */}
                                            <td className="width15">
                                                {item}
                                            </td>
                                            <td className="width10"> 
                                                {formattedPsku.current[item]?.description}
                                            </td>
                                            <td className="width30">
                                                <tr>
                                                    <Select
                                                        mode="multiple"
                                                        options={customerGroups.map(item => ({ label: item.name, value: item.name }))}
                                                        getPopupContainer={trigger => trigger.parentNode}
                                                        style={{ width: '400px' }}
                                                        placeholder="Select Customer Groups"
                                                        value={value.map(item=>item)}
                                                        onChange={e => onCgCheckHandler(item, e)}
                                                        allowClear
                                                        dropdownClassName="non-forecasted-tse-dropdown"
                                                    />
                                                </tr>
                                            </td>
                                            <td className='admin-actions width10'>{hasEditPermission(pages.RULES_CONFIGURATION) &&
                                                <>
                                                    <i
                                                        className={`info-icon ${isSaveEnable(item) ? '' : 'disabled-icon'}`}
                                                        onClick={() => saveAllHandler(item,'save-line')}
                                                    >
                                                        <Tooltip
                                                            placement="bottom"
                                                            title="Save">
                                                            <CheckCircleOutlined />
                                                        </Tooltip>
                                                    </i>
                                                    <i className='info-icon' onClick={(e) => handleDelete(item)}
                                                    ><Tooltip placement="bottom" title="Delete"><DeleteOutlined /></Tooltip></i>
                                                </>
                                            }
                                            </td>
                                        </tr>
                                        {expandedPsku == item && <tr>
                                            <td colSpan={8}>
                                                <NonForecastedSubtable
                                                    db_list={selectedAreaTseFilter.length == 0 ? db_list :
                                                        Object.entries(db_list).reduce((acc, [key, value]) => {
                                                            if (selectedAreaTseFilter.includes(key))
                                                                acc[key] = value;
                                                            return acc;
                                                        }, {})
                                                    }
                                                    onChangeDb={onDbCheckHandler}
                                                    checkedDB={
                                                        Object.fromEntries(
                                                            Object.entries(_.cloneDeep(checkedRecords.current)).filter(([key, record]) => key.includes(item))
                                                        )
                                                    }
                                                    pskuCode={item}
                                                    selectedDistChannels={selectedDistChannels}
                                                    tseAreaMap={tseAreaMap}
                                                />
                                            </td>
                                        </tr>}
                                    </>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </>}
        </>
    )   
}

const mapStateToProps = state => {
    return {
        isLoading: state.loader.isLoading,
    };
};

export default connect(mapStateToProps)(NonForecastedAddView);