import { notification, Popover, Select, Tooltip } from "antd";
import React, { useEffect, useRef, useState } from "react";
import CascadeCheckbox from "../../../components/CascadeCheckbox/CascadeCheckbox";
import _ from "lodash";
import { hasEditPermission, pages } from "../../../persona/distributorHeader";
import { CheckCircleOutlined, DeleteOutlined, HistoryOutlined, SaveOutlined, SyncOutlined } from "@ant-design/icons";
import Util from "../../../util/helper";
import { NO_DATA_SYMBOL } from "../../../constants";
import { NonForecastedSubtable } from "./NonForecastedSubtable";
import { connect } from "react-redux";

function NonForecastedUpdateView(props) {
    const {
        db_list,
        zoneAreaOptions,
        initialTableData,
        initialCheckedRecords,
        initialIndicator,
        tseCodes,
        customerGroups,
        upsertAllNonForecastedPskus,
        isLoading,
        resetHandler,
        getNonForecastedPsku,
        upsertHandler,
        selectedDistChannels,
        onDistChannelChange,
        tab = '',
        tseAreaMap,
    } = props;
    const channels = ['GT', 'NOURISHCO']

    //-------------------------------======State=====----------------------
    const [selectedAreaTseFilter, setSelectedAreaTseFilter] = useState([]);
    const [tableData, setTableData] = useState([]);
    const [checkedCgIndicator, setCheckedCgIndicator] = useState(initialIndicator);
    const [expandedPsku, setExpandedPsku] = useState(null)
    const [originalTableData, setOriginalTableData] = useState([])
    const [selectedChannel, setSelectedChannel] = useState(selectedDistChannels);
    const [selectedPsku,setSelectedPsku] = useState([])

    //-------------------------------======Refs=====----------------------
    const filtredTse = useRef({});
    const selectedPskus = useRef([]);
    const checkedRecords = useRef({})
    const pskuSaveMap = useRef({})
    const checkAllStatus = useRef(new Set())
    const originalCheckedRecords = useRef({});
    const selectedTse = useRef({});
    const excludedTse  = useRef({})
    
    //-------------------------------======Effects=====----------------------
    useEffect(() => {
        const pskuArr = []
        checkedRecords.current = _.cloneDeep(originalCheckedRecords.current);
        checkAllStatus.current = new Set()
        if (selectedAreaTseFilter.length == 0) {
            const tempSelectedTse = {};
            originalTableData?.forEach(initialTableItem => {
                tempSelectedTse[initialTableItem.psku_code] = new Set();
                initialTableItem.included_cg_list?.forEach(cgList => {
                    tempSelectedTse[initialTableItem.psku_code].add(cgList.tse_code)
                })
            })
            selectedTse.current = tempSelectedTse;
            if (selectedPskus.current.length > 0) {
                handlePskuFilterChange(selectedPskus.current)
            } else
                setTableData(_.cloneDeep(originalTableData));
        }
        else {
            const tempPskuData = _.cloneDeep(originalTableData)
            tempPskuData.forEach(item => {
                const includedCgList = []
                item.included_cg_list?.forEach(cgList => {
                    if (filtredTse.current[cgList.tse_code])
                        includedCgList.push(cgList);
                })
                item.included_cg_list = includedCgList;
                if(selectedPskus.current.length==0 || selectedPskus.current.includes(item.psku_code))
                    pskuArr.push(item);
                selectedTse.current = {...selectedTse.current, [item.psku_code]:new Set(_.cloneDeep(includedCgList).map(item=>item.tse_code))}

            })
            setTableData(pskuArr);
        }
    }, [selectedAreaTseFilter])

    useEffect(() => {
        updateCheckedCgIndicator();
    }, [tableData])

    useEffect(() => {
        setTableData(_.cloneDeep(initialTableData));
        setOriginalTableData(_.cloneDeep(initialTableData));
    }, [initialTableData])
    
    useEffect(() => {
        originalCheckedRecords.current = initialCheckedRecords
        checkedRecords.current = _.cloneDeep(originalCheckedRecords.current);
        updateCheckedCgIndicator();
    }, [initialCheckedRecords])

    useEffect(() => {
        const initialSelection = {};
        originalTableData.forEach(item => {
            if (pskuSaveMap.current[item.psku_code] && selectedTse.current[item.psku_code]) {
                initialSelection[item.psku_code] = new Set(selectedTse.current[item.psku_code])   
            }
            else {
                const includedTse = item.included_cg_list.reduce((acc, item) => {
                    if (selectedAreaTseFilter.length === 0 || selectedAreaTseFilter.includes(item.tse_code)) {
                        acc.push(item.tse_code);
                    }
                    return acc;
                }, []).sort();
                initialSelection[item.psku_code] = new Set(includedTse);
            }
        })
        selectedTse.current = initialSelection;
        updateCheckedCgIndicator();
    }, [originalTableData])
    
    //-------------------------------======Helpers=====----------------------
    function isSaveEnable(pskuCode) {
        return pskuSaveMap.current[pskuCode] ?? false;
    }

    function checkedStatus(pskuCode, cg) {
        if (checkedCgIndicator[pskuCode]?.[cg]?.size == 1 && checkedCgIndicator[pskuCode][cg].has(true))
            return 'CHECKED';
        if (!checkedCgIndicator[pskuCode] || (!checkedCgIndicator[pskuCode][cg]) || (checkedCgIndicator[pskuCode][cg].size == 1 && checkedCgIndicator[pskuCode][cg].has(false)))
            return 'UNCHECKED';
        else return 'PARTIAL'
    }

    function payloadFormatter(payload) {
        Object.keys(payload).forEach(pskuCode => {
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
                    const area = tseAreaMap[tse] ? tseAreaMap[tse]:tse.substr(0, 4);
                    if (!areaSelectionMap[area]) {
                        areaSelectionMap[area] = []
                    }
                    areaSelectionMap[area].push(tse);
                })
                Object.keys(areaSelectionMap).forEach(area => {
                    if (areaSelectionMap[area].length === Object.keys(tseCodes[area] ?? {}).length) {
                        areaTseArr.push(area)
                    }
                    else areaTseArr.push(...areaSelectionMap[area]);
                })
                if (areaTseArr.length > 0)
                    currentPayload[tseArray] = areaTseArr;
            })
            payload[pskuCode].selectedTse = Array.from(selectedTse.current[pskuCode] ?? new Set());
        })
        return payload;
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
                selectedAreaCodes.push(...Object.keys(tseCodes[entry[1]]));
            }
            else {
                zoneAreaOptions.forEach(zone => {
                    if (zone.label == entry[0]) {
                        zone.children?.forEach(area => {
                            selectedAreaCodes.push(...Object.keys(tseCodes[area.label] ?? {}))
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
        setSelectedPsku(value.map(newValue => {
            const existingPsku = selectedPsku.find(selectedPskuItem => selectedPskuItem.includes(newValue));
            return existingPsku || newValue;
        }));
        selectedPskus.current = value.map(item => item.split("#")[0])
        const filterSource =_.cloneDeep(originalTableData)
        if (value.length > 0) {
            const filteredPskuList = filterSource.filter(item => selectedPskus.current.includes(item.psku_code))
            setTableData(filteredPskuList)
            return;
        }
        setTableData(_.cloneDeep(filterSource))
    }

    function onCgCheckHandler(event, pskuCode, cg, item) {
        const checked = event.target.checked;
        const tempCheckedRecords = _.cloneDeep(checkedRecords.current)
        const tempCheckedData = {};
        const targetTse = Array.from(selectedTse.current[item.psku_code] ?? []);
        targetTse?.forEach(tse => {
            const areaCode = tseAreaMap[tse] ?? tse.substring(0, 4).trim();
            const key = `${areaCode}#${pskuCode}#${tse}`
            const currentCheckedRecord = tempCheckedRecords[key];
            if (currentCheckedRecord) {
                currentCheckedRecord[cg] = checked;
                tempCheckedData[key] = currentCheckedRecord   
            }
        })
        checkedRecords.current = { ...checkedRecords.current, ...tempCheckedData }
        updateCheckedCgIndicator(pskuCode)
    }

    function cgAllCheckHandler(event) {
        const checked = event.target.checked;
        const tempCheckAllStatus = _.cloneDeep(checkAllStatus.current);
        const cg = event.target.name
        if (checked) tempCheckAllStatus.add(cg);
        else tempCheckAllStatus.delete(cg);
        const currentPskus = tableData.map(item => item.psku_code);
        const tempCheckedRecords = _.cloneDeep(checkedRecords.current)
        const tempCheckedData = {}
        Object.keys(tempCheckedRecords).forEach(key => {
            const [area, pskuCode, tse] = key.split('#');
            const currentCheckedRecord = tempCheckedRecords[key];
            if (currentPskus.includes(pskuCode) && selectedTse.current[pskuCode]?.has(tse)) {
                if (selectedAreaTseFilter.length == 0 || (selectedAreaTseFilter.length > 0 && selectedAreaTseFilter.includes(tse))) {
                    currentCheckedRecord[cg] = checked;
                    tempCheckedData[key] = currentCheckedRecord
                }
            }
        })
        checkedRecords.current = { ...checkedRecords.current, ...tempCheckedRecords }
        checkAllStatus.current = tempCheckAllStatus;
        updateCheckedCgIndicator()
    }

    function updateCheckedCgIndicator(pskuCode = null) {
        const tempcheckedCgIndicator = {};
        const targetPsku = pskuCode ? tableData.filter(item => item.psku_code == pskuCode) : tableData;
        const tempPskuCanSaveMap = {};
        const tempCheckedRecords = _.cloneDeep(checkedRecords.current)
        Object.keys(tempCheckedRecords).length>0 && targetPsku.forEach(item => {
            tempPskuCanSaveMap[item.psku_code] = false; 
            const cgMapping = {};
            // Concat target tse if excluded tse has values
            const targetTse = Array.from(new Set([
                ...(selectedTse.current[item.psku_code] ?? []),
                ...(excludedTse.current[item.psku_code] ?? [])
            ]));
            targetTse.forEach(cgTse => {
                const areaCode = tseAreaMap[cgTse] ?? cgTse.substring(0, 4).trim();
                const tseCode = cgTse
                const key = `${areaCode}#${item.psku_code}#${tseCode}`
                const currentCheckedRecord = tempCheckedRecords[key];
                if (currentCheckedRecord) {
                    if (!_.isEqual(currentCheckedRecord, originalCheckedRecords.current[key])) {
                        tempPskuCanSaveMap[item.psku_code] = true;
                    }
                    //Don't Update cgMapping if the tse is in the excluded tse
                    if(!excludedTse.current[item.psku_code] || (!excludedTse.current[item.psku_code]?.has(tseCode)))
                    customerGroups.forEach(cg => {
                        if (!cgMapping[cg.name])
                            cgMapping[cg.name] = new Set();
                        cgMapping[cg.name].add(currentCheckedRecord[cg.name])
                    })   
                }
            })
            tempcheckedCgIndicator[item.psku_code] = cgMapping;
        })
        pskuSaveMap.current = { ...pskuSaveMap.current, ...tempPskuCanSaveMap };
        setCheckedCgIndicator({ ...checkedCgIndicator, ...tempcheckedCgIndicator })
    }

    function onDbCheckHandler(tse, areaCode, pskuCode, cg, e, dbCode){
        const checked = e.target.checked;
        const key = `${areaCode}#${pskuCode}#${tse}`;
        const currentCheckedRecord = _.cloneDeep(checkedRecords.current[key]);
        const tempSelectedTse = _.cloneDeep(selectedTse.current);
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
            tempSelectedTse[pskuCode] = new Set([...(tempSelectedTse[pskuCode] ?? []), tse])
            selectedTse.current = tempSelectedTse;    
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

    async function saveAllHandler(savePsku=null, saveType='save-all') {
        const tempCheckedRecords = _.cloneDeep(checkedRecords.current);
        const payload = {};
        Object.keys(tempCheckedRecords).forEach(key => {
            const currentCheckedRecord = tempCheckedRecords[key];
            const [area, pskuCode, tse] = key.split("#");
            if (pskuSaveMap.current[pskuCode] && (saveType =='save-all' || (pskuCode==savePsku && saveType=='save-line'))) {
                if (selectedPskus.current.length == 0 || (selectedPskus.current.length > 0 && selectedPskus.current.includes(pskuCode))) {
                    if (!payload[pskuCode]) payload[pskuCode] = {
                        cg_data: {},
                        selectedTse:[]
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
            }
        })
        if (Object.keys(payload).length > 0) {
            const formattedPayload = payloadFormatter(payload);
            let payloadData = []
            if(Object.keys(formattedPayload).length > 10){
                for (let i = 0; i < Object.keys(formattedPayload).length; i += 10){
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
            if (upsertAllResponse) {
                if (upsertAllResponse[0]?.success) {
                    notification.success({
                        message: "Success",
                        description: "Saved Successfully",
                        duration: 5,
                        className: "notification-success"
                    });
                    const tempPskuCanSaveMap = _.cloneDeep(pskuSaveMap.current);
                    Object.keys(payload).forEach(psku => {
                        tempPskuCanSaveMap[psku] = false;
                    })
                    pskuSaveMap.current = tempPskuCanSaveMap;
                    if (saveType == 'save-line') {
                        const tempCheckedRecords = _.cloneDeep(originalCheckedRecords.current);
                        Object.keys(tempCheckedRecords).forEach(key => {
                            if (savePsku && savePsku != '' && key.includes(savePsku))
                            tempCheckedRecords[key] = checkedRecords.current[key]
                        })
                        if (selectedPskus.current.length <= 1)
                            checkAllStatus.current = new Set();
                        excludedTse.current = {...excludedTse.current,[savePsku]:new Set()}
                        originalCheckedRecords.current = tempCheckedRecords;
                    }
                    else {
                        checkAllStatus.current = new Set();
                        excludedTse.current = {};
                        originalCheckedRecords.current = _.cloneDeep(checkedRecords.current)
                    }
                    getNonForecastedPsku().then(res => {
                        setOriginalTableData(_.cloneDeep(res));
                        const tempTableData = res.filter(item => tableData.some(data=>data.psku_code==item?.psku_code));
                        setTableData(tempTableData);
                    })
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
    }

    function handleDelete(pskuCode) {
        const tseArr = tableData.filter(item => item.psku_code === pskuCode)[0]?.included_cg_list.map(tse_cg => tse_cg.tse_code)
        if (tseArr.length === 0) {
            Util.notificationSender("Error", "Save the item to delete it")
            return;
        }
        const targetTse = selectedAreaTseFilter.length > 0 ? tseArr.filter(item => selectedAreaTseFilter.includes(item)):tseArr

        const payload = {};
        targetTse.forEach(tse => {
            const areaCode = tseAreaMap[tse] ?? tse.substring(0, 4).trim();
            if (!payload[areaCode]) {
                payload[areaCode] = {
                    area_code: areaCode,
                    psku: pskuCode,
                    deleted: true,
                    cg_db: {
                    },
                    dist_channels: selectedDistChannels
                };
            }
            payload[areaCode].cg_db[tse] = {};
            
        })
        upsertHandler(Object.values(payload)).then(res => {
            if (res.success) {
                notification.success({
                    "message": "Success",
                    "description": "Deleted Successfully",
                    "duration": "5",
                    "className": "notification-success"
                })
                excludedTse.current = {...excludedTse.current,[pskuCode]:new Set()}
                setTableData(tableData.filter(item => item.psku_code != pskuCode))
                getNonForecastedPsku().then(res => {
                    setOriginalTableData(res);
                })
            }
            else {
                notification.error({
                    "message": "Fail",
                    "description": "Delete Unsuccessful",
                    "duration": '5',
                    "className": "notification-error"
                })
            }
        })
    }

    async function handleReset() {
        if (!isLoading) {
            const res = await resetHandler();
            if (res) {
                originalCheckedRecords.current = _.cloneDeep(res.initialCheckedRecords);
                checkAllStatus.current = new Set();
                excludedTse.current = {};
                checkedRecords.current = res.initialCheckedRecords;
                setOriginalTableData(_.cloneDeep(res.data));
                updateCheckedCgIndicator();
            }   
        }
    }

    function handleTseChange(tseArr, pskuCode, item) {
        const tempSelectedTse = _.cloneDeep(selectedTse.current);
        const tseToCompare = tempSelectedTse[pskuCode] ? Array.from(tempSelectedTse[pskuCode]) : item.included_cg_list.map(item => item.tse_code)
        const deletedTse = tseToCompare.filter(tse => !tseArr.includes(tse)) ?? []
        const tempCheckedRecords = {};
        let excludedTseList = new Set();
        deletedTse.forEach(tse => {
            excludedTseList.add(tse);
            const areaCode = tseAreaMap[tse] ?? tse.substr(0, 4).trim();
            const key = `${areaCode}#${pskuCode}#${tse}`;
            tempCheckedRecords[key] = {}
            customerGroups.forEach(cg => {
                tempCheckedRecords[key][cg.name] = false
            })
        })
        excludedTse.current = { ...excludedTse.current, [pskuCode]: excludedTseList };
        if (Object.keys(tempCheckedRecords).length > 0) {
            checkedRecords.current = { ...checkedRecords.current, ...tempCheckedRecords };
        }
        selectedTse.current = { ...selectedTse.current, [pskuCode]: new Set(tseArr) };
        updateCheckedCgIndicator(pskuCode);
    }
    
    function handleSelectAllTse() {
        const pskuTseMap = {};
        const tempCheckedRecords = {};
        const tempExcludedTseList = _.cloneDeep(excludedTse.current);
        tableData.forEach(tableItem => {
            pskuTseMap[tableItem.psku_code] = new Set(Object.keys(db_list ?? {}).sort().reduce((acc, item) => {
                if (selectedAreaTseFilter.length == 0 || selectedAreaTseFilter.includes(item)) {
                    acc.push(item);
                }
                return acc;
            }, []));
            for (let tseCode of pskuTseMap[tableItem.psku_code]) {
                if (!selectedTse.current[tableItem.psku_code]?.has(tseCode)) {
                    const areaCode = tseAreaMap[tseCode] ?? tseCode.substr(0, 4).trim();
                    const key = `${areaCode}#${tableItem.psku_code}#${tseCode}`;
                    const tempRecord = {}
                    customerGroups.forEach(cg => {
                        if (checkedStatus(tableItem.psku_code, cg.name) == 'UNCHECKED')
                            tempRecord[cg.name] = false;
                        else
                            tempRecord[cg.name] = true;
                    })
                    tempCheckedRecords[key] = tempRecord;
                }
            }
            tempExcludedTseList[tableItem.psku_code] = new Set();
        })
        checkedRecords.current = { ...checkedRecords.current, ...tempCheckedRecords };
        excludedTse.current = tempExcludedTseList;
        selectedTse.current = { ...selectedTse.current, ...pskuTseMap };
        updateCheckedCgIndicator();
    }

    function addNewTseForPsku(tse, pskuCode) {
        const area = tseAreaMap[tse] ?? tse.substr(0, 4).trim();
        const excludedTseList = _.cloneDeep(excludedTse.current[pskuCode])
        const key = `${area}#${pskuCode}#${tse}`;
        const currentCheckedRecord = {};
        customerGroups.forEach(cg => {
            if (checkedStatus(pskuCode, cg.name) == 'UNCHECKED') {
                currentCheckedRecord[cg.name] = false;
            }
            else currentCheckedRecord[cg.name] = true;
        }) 
        if (excludedTseList && excludedTseList.has(tse)) {
            excludedTseList.delete(tse);
            excludedTse.current = {...excludedTse.current,[pskuCode]:excludedTseList}
        }
        checkedRecords.current = { ...checkedRecords.current, [key]: currentCheckedRecord };
        updateCheckedCgIndicator(pskuCode);
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
                placeholder="Select PSKUs to update"
                onChange={handlePskuFilterChange}
                value={selectedPsku}
                options={originalTableData?.map(item => ({ label: item.psku_code + " " + item.psku_name, value: item.psku_code+'#'+item.psku_name }))}
                style={{ width: '100%', marginTop:'10px' }}
                allowClear
                dropdownClassName="non-forecasted-tse-dropdown"
                getPopupContainer={trigger => trigger.parentNode}
            />
            <Select
                placeholder="Distribution Channel"
                value={selectedChannel}
                onChange={(data) => {
                    setSelectedAreaTseFilter([])
                    setSelectedChannel(data)
                    onDistChannelChange(data);
                    handlePskuFilterChange([])
                }}
                options={channels.map((item) => ({ label: item, value: item }))}
                style={{ width: '100%', marginTop: '10px' }}
                dropdownClassName="non-forecasted-tse-dropdown"
            />
            <div className="n-card-h table-header-options ">
                <Tooltip title='Select All Tse' placement="bottom">
                    <button className="select-all-tse save-all-button" onClick={handleSelectAllTse}>
                        Select All TSE
                    </button>
                </Tooltip>
                <Tooltip title="Reset to last saved state" placement='bottom'>
                    <button className='reset-button' onClick={handleReset}>
                        <SyncOutlined spin={isLoading} /> Reset
                    </button>
                </Tooltip>
                <button className='save-all-button'
                    onClick={saveAllHandler}
                    disabled={!(hasEditPermission(pages.RULES_CONFIGURATION)
                        && Object.values(pskuSaveMap.current).includes(true)
                        && !isLoading
                    )}
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
                            <th className="width10"> TSE Code </th>
                            <th className="width10">Brand Variant</th>
                            <th className="width10">PSKU Code</th>
                            <th className="width15">PSKU Description</th>
                            <th>
                                <tr >
                                    <th colSpan={customerGroups.length}>
                                        Inclusion Customer Groups
                                    </th>
                                </tr>
                                <tr>
                                    {customerGroups?.map(item =>
                                        <th className="non-forecasted-update-cg-th">
                                            <Tooltip title={item.description} placement='bottom'>
                                                <input
                                                    id={`update-header-${item.name}`}
                                                    type='checkbox'
                                                    className="check-colm-op"
                                                    onClick={cgAllCheckHandler}
                                                    name={item.name}
                                                    checked={checkAllStatus.current.has(item.name)}
                                                />
                                                <label
                                                    className={`${checkAllStatus.current.has(item.name) ? 'checked-th' : ''}`}
                                                    htmlFor={`update-header-${item.name}`}>{item.name}</label>
                                            </Tooltip>
                                        </th>
                                    )}
                                </tr>
                            </th>
                            <th className="width10">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map((item, index) => {
                            return (
                                <>
                                    <tr>
                                        <td className="width5">
                                            {expandedPsku != item.psku_code && <button onClick={e=>setExpandedPsku(item.psku_code)} className="collapse-button-audit">+</button>}
                                            {expandedPsku == item.psku_code && <button onClick={e=>setExpandedPsku(null)} className="collapse-button-audit">-</button>}
                                        </td>
                                        <td className="width10">
                                            <Select
                                                mode="multiple"
                                                maxTagCount={1}
                                                options={Object.keys(db_list ?? {}).sort().reduce((acc, elem) => {
                                                    if (selectedAreaTseFilter.length == 0 || selectedAreaTseFilter.includes(elem)) {
                                                        acc.push({ key: elem, value: elem });
                                                    }
                                                    return acc;
                                                }, [])}
                                                value={Object.keys(db_list ?? {}).filter(tse => selectedTse.current[item.psku_code]?.has(tse)??false)}
                                                onChange={(e) => handleTseChange(e, item.psku_code, item)}
                                                onSelect={(selectedTse=>{addNewTseForPsku(selectedTse,item.psku_code)})}
                                                autoClearSearchValue={false}
                                                dropdownClassName="non-forecasted-tse-dropdown"
                                                getPopupContainer={trigger => trigger.parentNode}
                                            />
                                        </td>
                                        <td >{item.brand_variant_desc ? item.brand_variant_desc : NO_DATA_SYMBOL}</td>
                                        <td>
                                            {item.psku_code}
                                        </td>
                                        <td>
                                            {item.psku_name}
                                        </td>
                                        <td>
                                            <tr>
                                                {customerGroups?.map(cg => {
                                                    const cgCheckedStatus = checkedStatus(item.psku_code, cg.name);
                                                    return (
                                                        <td key={`cg=${cg.name}`} className="non-forecasted-update-cg-th">
                                                            <input
                                                                id={`update-${index}-${cg.name}`}
                                                                type="checkbox"
                                                                name={cg.name}
                                                                className="check-colm-op"
                                                                checked={cgCheckedStatus == 'CHECKED'}
                                                                onChange={(e) => onCgCheckHandler(e, item.psku_code, cg.name, item)}
                                                            // disabled={(selectedTseCodes.current.hasOwnProperty(key) && selectedTseCodes.current[key].length == 0) || item.all_db_list[cg.name]?.length == 0 ? true : false ?? false}
                                                            />
                                                            <label
                                                                key={cg.id}
                                                                htmlFor={`update-${index}-${cg.name}`}
                                                                className={`non-forecast-update-opt
                                                            ${cgCheckedStatus == 'PARTIAL' ? 'colm-opt-partial-checked' : ''}`}
                                                            >
                                                                {cg.name}
                                                            </label>
                                                        </td>
                                                    )
                                                })
                                                }
                                            </tr>
                                        </td>
                                        <td className='admin-actions'>{hasEditPermission(pages.RULES_CONFIGURATION) &&
                                            <>
                                                <i
                                                className={`info-icon ${isSaveEnable(item.psku_code) ? '' :  'disabled-icon'}`}
                                                onClick={()=>saveAllHandler(item.psku_code,'save-line')}
                                                >
                                                    <Tooltip
                                                        placement="bottom"
                                                        title="Save">
                                                        <CheckCircleOutlined />
                                                    </Tooltip>
                                            </i>
                                                <i className={`info-icon`} onClick={(e) => handleDelete(item.psku_code)}
                                                ><Tooltip placement="bottom" title="Delete"><DeleteOutlined /></Tooltip></i>
                                        </>
                                        }
                                            {item.updated_by && <Popover
                                                content={
                                                    <div className="time-details " >
                                                        <p style={{ marginBottom: "5px" }}><b><i>Last Updated by:</i></b> {item.user_name ? `${item.user_name}` : null} ({item.updated_by})</p>
                                                        <p style={{ marginBottom: "5px" }}><b><i>Last Updated on:</i></b> {Util.formatDate(item.updated_on)} {Util.formatTime(item.updated_on)}</p>
                                                    </div>}
                                                title=""
                                                trigger="hover"
                                                placement="leftBottom"
                                            >
                                                <HistoryOutlined />
                                            </Popover>
                                            }
                                        </td>
                                    </tr>
                                    {expandedPsku == item.psku_code && <tr>
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
                                                        Object.entries(_.cloneDeep(checkedRecords.current)).filter(([key, record]) => key.includes(item.psku_code))
                                                    )
                                                }
                                                pskuCode = {item.psku_code}
                                                selectedDistChannels={selectedDistChannels}
                                                tseAreaMap={tseAreaMap}
                                            />
                                        </td>
                                    </tr>}
                                </>

                            )
                        })}
                    </tbody >

                </table >
            </div>
        </>
    )

}

const mapStateToProps = state => {
    return {
        isLoading: state.loader.isLoading,
    };
};

export default connect(mapStateToProps)(NonForecastedUpdateView);