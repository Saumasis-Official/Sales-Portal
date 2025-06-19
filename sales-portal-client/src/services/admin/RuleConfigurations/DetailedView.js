import React, {useState, useEffect, useRef} from 'react';
import CascadeCheckbox from '../../../components/CascadeCheckbox/CascadeCheckbox';
import { Select, Table } from 'antd';
import _ from 'lodash';
import { NonForecastedSubtable } from './NonForecastedSubtable';

export function DetailedView(props) {
    
    const { zoneAreaOptions, selectedPsku, db_list, customerGroups, tseCodes, checkedRecords, tseAreaMap} = props;
    const [areaTseList, setAreaTseList] = useState({});
    const [checkedCgIndicator, setCheckedCgIndicator] = useState({});
    const [selctedZoneAreaTseFilter, setSelctedZoneAreaTseFilter] = useState([]);
    const [expandedArea, setExpandedArea] = useState(null)
    const originalAreaTseList = useRef({})


    const columns = [
        {
            title: 'PSKU Code',
            dataIndex: 'code',
            key: 'code',
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
        },
        {
            title: 'Brand',
            dataIndex: 'brand',
            key: 'brand',
        },

    ]
    
    useEffect(() => {
        const tempAreaTseList = {};
        const areaSelectedCgList = {};
        selectedPsku?.included_cg_list?.forEach(item => {
            if (!tempAreaTseList[item.area_code]) {
                tempAreaTseList[item.area_code] = [item.tse_code]
            }
            else tempAreaTseList[item.area_code].push(item.tse_code)

            if (!areaSelectedCgList[item.area_code])
                areaSelectedCgList[item.area_code] = {}
            customerGroups.forEach(cg => {
                if (!areaSelectedCgList[item.area_code][cg.name]) {
                    areaSelectedCgList[item.area_code][cg.name] = new Set();
                }
                areaSelectedCgList[item.area_code][cg.name].add(item.included_cg[cg.name]??false )
            })
        })
        setCheckedCgIndicator(areaSelectedCgList)
        originalAreaTseList.current = _.cloneDeep(tempAreaTseList)
        setAreaTseList(tempAreaTseList)
    }, [])

    useEffect(() => {
        if (selctedZoneAreaTseFilter.length == 0)
            setAreaTseList(originalAreaTseList.current);
        else {
            const tempOriginalAreaTseList = _.cloneDeep(originalAreaTseList.current);
            const filteredAreaTseList = {};
            selctedZoneAreaTseFilter.forEach(tse => {
                const areaCode = tse.substr(0, 4);
                if (tempOriginalAreaTseList[areaCode]?.includes(tse)) {
                    filteredAreaTseList[areaCode] = tempOriginalAreaTseList[areaCode]
                }
            })
            setAreaTseList(filteredAreaTseList)
        }
    },[selctedZoneAreaTseFilter])
    
    function checkedStatus(cg, areaCode) {
        if (checkedCgIndicator[areaCode][cg].size == 1 && checkedCgIndicator[areaCode][cg].has(true))
            return 'CHECKED';
        if (checkedCgIndicator[areaCode][cg].size == 1 && checkedCgIndicator[areaCode][cg].has(false))
            return 'UNCHECKED';
        else return 'PARTIAL'
    }

    function handleFilterChange(value) {
        const selectedAreaCodes = []
        value.forEach(entry => {
            if (entry.length > 2) {
                selectedAreaCodes.push(entry[entry.length-1])
            }
            else if (entry.length == 2) {
                selectedAreaCodes.push(...Object.keys(tseCodes[entry[1]]));
            }
            else {
                zoneAreaOptions.forEach(zone => {
                    if (zone.label == entry[0]) {
                        zone.children?.forEach(area => {
                            selectedAreaCodes.push(...Object.keys(tseCodes[area.label]))
                        })
                    }
                })
            }
        })
        setSelctedZoneAreaTseFilter(selectedAreaCodes)
    }

    return (
        <>
            <div className="region-filter">
                <div className='detail-view-details' style={{marginBottom:'10px'}}>
                    <Table bordered size='small' pagination={false} columns={columns} dataSource={[{ code: selectedPsku.psku_code, description: selectedPsku.psku_name, brand: selectedPsku.brand_desc }]} />
                </div>
                <CascadeCheckbox
                    options={zoneAreaOptions}
                    multiple={true}
                    onChange={handleFilterChange}
                    width={'100%'}
                    placeholder='Select Zones and Areas and TSE'
                />
                <table className="rule-config-table non-forecasted-sub-table">
                    <thead>
                        <tr>
                            <th className="width5"></th>
                            <th className="width15" style={{ padding: '10px 0' }}>Area</th>
                            <th className="width15">TSE Code</th>
                            <th>Customer Groups</th>
                        </tr>
                    </thead>
                    <tbody style={{ display: 'block', height: '400px', overflowY: 'auto' }}>
                        {Object.keys(areaTseList).sort().map((area,index) => {
                            return (
                                <>
                                    <tr>
                                        <td className="width5">
                                            {expandedArea != area && <button onClick={e => setExpandedArea(area)} className="collapse-button-audit">+</button>}
                                            {expandedArea == area && <button onClick={e => setExpandedArea(null)} className="collapse-button-audit">-</button>}
                                        </td>
                                        <td className="width15">{area}</td>
                                        <td className="width15">
                                            <Select
                                                mode='multiple'
                                                maxTagCount={1}
                                                options={Object.keys(db_list ?? {})?.filter(tse => tse.startsWith(area))?.sort()?.map(item => ({ label: item, value: item }))}
                                                value={areaTseList[area]}
                                                getPopupContainer={trigger => trigger.parentNode}
                                            />
                                        </td>
                                        <td>
                                            <tr>
                                                {customerGroups.map(cg => {
                                                    return <td className='non-forecasted-detailed-cg' key={`sub-cg=${cg.name}`} >
                                                        <input
                                                            id={`dv-${index}-${cg.name}`}
                                                            type="checkbox"
                                                            name={cg.name}
                                                            className="check-colm-op"
                                                            checked={checkedStatus(cg.name, area) == 'CHECKED'}
                                                        />
                                                        <label
                                                            key={'dv-' + cg.id}
                                                            htmlFor={`dv-${index}-${cg.name}`}
                                                            className={`colm-opt
                                                                ${checkedStatus(cg.name, area) == 'PARTIAL' ? 'colm-opt-partial-checked' : ''}`}>
                                                            {cg.name}
                                                        </label>
                                                    </td>
                                                })}
                                            </tr>
                                        </td>
                                    </tr>
                                    {expandedArea == area && <tr>
                                        <td colSpan={8}>
                                            <NonForecastedSubtable
                                                db_list={tseCodes[area]}
                                                onChangeDb={() => { }}
                                                checkedDB={checkedRecords}
                                                pskuCode={selectedPsku.psku_code}
                                                tseAreaMap = {tseAreaMap}
                                            />
                                        </td>
                                    </tr>
                                    }
                                </>
                            );
                        })}
                        {Object.keys(areaTseList) == 0 && <tr>
                            <td colSpan={5}>No Data Available</td>
                        </tr>}
                    </tbody>
                </table>
            </div>
        </>
    )

}
