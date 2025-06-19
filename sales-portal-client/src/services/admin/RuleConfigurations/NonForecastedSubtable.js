import _ from "lodash";
import React, { useState, useEffect } from "react";
import FilterSearch from "../../../components/FilterSearch";
import { FilterOutlined } from "@ant-design/icons";

export function NonForecastedSubtable(props) {
    const [isFilterEnable, setIsFilterEnable] = useState(false)
    const [filteredDbList, setFilteredDbList] = useState([])
    const [cgOptions, setCgOptions] = useState([]);
    const [formattedDbList, setFormattedDbList] = useState([])
    const {
        pskuCode,
        db_list,
        selectedDistChannels=[],
        checkedDB,
        onChangeDb,
        tseAreaMap,
    } = props;

    useEffect(() => {
        let cgs = new Set();
        const tempDbList = []
        const distributorSet = new Set();
        Object.keys(db_list ?? {}).forEach(tse => {
            Object.keys(db_list[tse]).forEach(cg => {
                db_list[tse][cg].forEach(item => {
                    if (!item.deleted) {
                        // if(selectedDistChannels.length > 0 && !selectedDistChannels.includes(item.distribution_channel)) return;
                        tempDbList.push({ ...item, cg: cg, tse: tse })
                        cgs.add(cg)
                        distributorSet.add(item.id)
                    }
                })
            })
        })
        setFormattedDbList(tempDbList.sort((a, b) => a.cg.localeCompare(b.cg) || a.tse.localeCompare(b.tse)))
        setCgOptions(Array.from(cgs).sort())
    }, [db_list])

    function onSearch(cg) {
        const tempAllDb = _.cloneDeep(formattedDbList) ?? [];
        const tempFilteredDb = []
        tempAllDb.forEach(item => {
            if (item.hasOwnProperty('cg') && item.cg == cg) tempFilteredDb.push(item)
        })
        setFilteredDbList(tempFilteredDb)
    }

    function onReset() {
        setFilteredDbList([])
        setIsFilterEnable(false);
    }

    function isChecked(cg, key, db) {
        const indicator = checkedDB[key]?.[cg] ?? false;
        let status;
        if (indicator === true)
            status = true
        else if (indicator && indicator.has(db))
            status = true
        else
            status = false
        return status;
    }

    return (
        <table className="table-brand-variants snc-table">
            <thead>
                <th>TSE Code</th>
                <th>Distributor Code</th>
                <th>Distributor Name</th>
                <th className="non-forecasted-cg-filter">
                    {isFilterEnable ? <FilterSearch optionsArray={cgOptions} onReset={onReset} onSearchChange={onSearch} /> :
                        <>Customer Group <span onClick={e => setIsFilterEnable(true)}><FilterOutlined /></span></>}
                </th>
                <th></th>
            </thead>
            <tbody className="rule-config-sub-table">
                {(filteredDbList.length > 0 ? filteredDbList : formattedDbList)?.map((item) => {
                    const area = tseAreaMap[item.tse] ?? item.tse.substr(0, 4).trim();
                    return (
                        <tr>
                            <td>{item.tse}</td>
                            <td>{item.id}</td>
                            <td>{item.name}</td>
                            <td>{item.cg}</td>
                            <td style={{ padding: '8px 0' }}>
                                <input
                                    className="checkmark-box"
                                    type="checkbox"
                                    name={`${area}#${pskuCode}#${item.cg}#${item.id}#${item.tse}`}
                                    checked={isChecked(item.cg, `${area}#${pskuCode}#${item.tse}`, item.id)}
                                    onChange={(e) => onChangeDb(item.tse, area, pskuCode, item.cg, e, item.id)}
                                />
                            </td>
                        </tr>
                    )
                })
                }
            </tbody>
        </table>
    );

}