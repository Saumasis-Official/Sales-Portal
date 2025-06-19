import React, { useEffect, useState, useRef } from 'react';
import { Select, notification, Popover} from 'antd';
import { CloseCircleOutlined, HistoryOutlined } from '@ant-design/icons';
import { connect } from 'react-redux';
import debounce from 'lodash.debounce';
import Loader from '../../../components/Loader';
import Util from '../../../util/helper/index.js';
import Panigantion from '../../../components/Panigantion';
import * as AdminActions from '../actions/adminAction';
import  moqCss from './MoqDashboard.module.css';
import { update } from 'lodash';
import {pages, hasEditPermission} from '../../../persona/moq.js';

const MoqDashboard = props => {
    const { getMoqDbMappingData, getAreaCodes, updateMoq } = props;

    const [tableData, setTableData] = useState([]);
    const [originalTableData, setOriginalTableData] = useState([]);
    const [dataCount, setDataCount] = useState([]);
    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState('');
    const [offset, setOffset] = useState(0);
    const [limit, setLimit] = useState(10);
    const [pageNo, setPageNo] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isTimestampModalOpen, setIsTimestampModalOpen] = useState(false);
    const [selectedArea, setSelectedArea] = useState();
    const [areaCodes, setAreaCodes] = useState([{ area_code: 'ALL' }]);
    const [updateCount, setUpdateCount] = useState(0);

    const debouncedSearch = useRef(debounce(nextValue => setSearch(nextValue), 500)).current;


    useEffect(() => {
        getAreaCodes()
            .then((response) => {
                if (response?.data?.success) {
                    setAreaCodes([{ area_code: 'ALL' }, ...response?.data?.data?.rows.sort((a, b) => (a.area_code.toUpperCase() >= b.area_code.toUpperCase()) ? 1 : -1)]);
                    if (response?.data?.data?.rowCount > 0) {
                        setSelectedArea('ALL')
                    }
                } else {
                    notificationSender('Technical Error', 'Could not fetch area codes', false);
                }
            });
    }, [getAreaCodes]);
    useEffect(() => {
        async function fetchMoqMappingData() {
            let data = await getMoqDbMappingData({ area: selectedArea, search, limit, offset });
            if (data?.success && data?.data?.rows) {
                const rows = data.data?.rows;
                setOriginalTableData([...rows]);
                setTableData([...rows]);
                setDataCount(data.data?.totalCount);
            }
            else {
                notificationSender('Fetch Error', data.message, false);
            }
        }
        fetchMoqMappingData();
    }, [search, limit, offset, selectedArea, updateCount, getMoqDbMappingData]);



    const notificationSender = (message, description, success) => {
        if (success) {
            notification.success({
                message: message,
                description: description,
                duration: 4,
                className: 'notification-success',
            });
        }
        else {
            notification.error({
                message: message,
                description: description,
                duration: 4,
                className: 'notification-error',
            });
        }
    }


    const onSearch = (e) => {
        const { value } = e.target;
        debouncedSearch(value);
        setShowSearch(value);
        setOffset(0);
        setLimit(itemsPerPage);
        setPageNo(1);
    }

    const resetPage = () => {
        debouncedSearch('');
        setShowSearch('');
        setOffset(0);
    }

    const onChangePage = (page, itemsPerPage) => {
        setLimit(itemsPerPage)
        setOffset((page - 1) * limit)
        setPageNo(page)
    }

    const onSaveHandler = async () => {
        let moq_data = [];
        tableData.forEach((item, index) => {
            if (parseFloat(item?.moq) !== parseFloat(originalTableData[index]?.moq)) {
                moq_data.push({ dbId: item.db_id, plantId: item.plant_id, moq: parseFloat(item.moq) });
            }
        });
        if (moq_data.length > 0) {
            let response = await updateMoq({ moq_data });
            if (response?.success) {
                setUpdateCount(prev => prev + 1);
                notificationSender('Success', 'MOQ updated successfully', true);
            }
            else {
                notificationSender('Error', 'Failed to update MOQ', false);
            }
        }
    }
    const onResetHandler = async () => {
        setTableData(JSON.parse(JSON.stringify(originalTableData)));
    }
    const handleTimePopover = (newOpen) => {
        setIsTimestampModalOpen(newOpen);
    };

    const onAreaChangeHandler = (value) => {
        setSelectedArea(value);
        setSearch('');
        setShowSearch('');
    }

    const onKeyDownHandler = (e) => {
        const isInputField = !e.target.id?.includes('detail');
        if (e.code === 'ArrowUp' || (e.shiftKey && e.key === 'Tab')) {
            e.preventDefault();
            if (Number(e.target.id) - 1 >= 0) {
                document.getElementById(`${Number(e.target.id) - 1}`)?.focus();
            } else {
                document.getElementById(`${tableData?.length - 1}`)?.focus();
            }
        } else if (isInputField && (e.code === 'NumpadEnter' || e.code === 'Enter' || e.code === 'ArrowDown' || e.code === 'Tab')) {
            e.preventDefault();
            if (Number(e.target.id) + 1 < tableData?.length) {
                document.getElementById(`${Number(e.target.id) + 1}`)?.focus();
            } else {
                document.getElementById('0').focus();
            }
        }
    }
    const onChangeQuantityHandler = (e) => {
        const { id, value } = e.target;
        const regex = /^[0-9\b]+$/;
        let val = (parseFloat(value))? Math.abs(parseFloat(value)): 0.0;
        val = val>1000 ? parseInt(val/10) : val.toFixed(2);
        // if (regex.test(value))
        setTableData((prev) => {
            prev = JSON.parse(JSON.stringify(tableData));
            prev[id]['moq'] = +val;
            return [...prev];
        });
    }
    return (
        <>
            <div className="admin-dashboard-wrapper">
                <div className="admin-dashboard-block">
                    <div className="admin-dashboard-head">

                        <h2>MOQ Dashboard</h2>
                        <div className={moqCss.left_header}>
                            <div className={moqCss.search_box}>
                                <input type="text" className="search-fld"
                                    placeholder="Search by- DB Code/ DB name/ Plant Code"
                                    value={showSearch} onChange={(e) => { onSearch(e) }} />
                                <div onClick={resetPage} className="close-search"><CloseCircleOutlined /></div>
                            </div>
                            <div className="area-filter">
                                <Select
                                    showSearch
                                    style={{ fontSize: '13px' }}
                                    placeholder={selectedArea}
                                    optionFilterProp="children"
                                    onChange={onAreaChangeHandler}
                                    filterOption={(input, option) =>
                                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                    options={areaCodes?.map(item => { return { value: item.area_code, label: item.area_code } })}
                                />
                            </div>
                        </div>
                        {hasEditPermission(pages.MOQ) && <div className='right-header'>
                            <div className="comment-section">
                                <button
                                    type="button"
                                    className="sbmt-btn space-5"
                                    // hidden={!isEdit}
                                    // disabled={difference || !isTImelineOpen || !canSave}
                                    onClick={onSaveHandler}>Save
                                </button>
                                <button
                                    type="button" className="sbmt-btn space-5"
                                    onClick={onResetHandler}
                                // disabled={!isTImelineOpen}
                                >Reset
                                </button>

                            </div>
                        </div>}


                    </div>

                    <div className='admin-dashboard-table'>
                        <table>
                            <thead>
                                <tr>
                                    <th className="width10" >Area</th>
                                    <th className="width25" >Distributor</th>
                                    <th className="width15" >Distributor Location</th>
                                    <th className="width10" >Depot Code</th>
                                    <th className="width15" >Depot Location</th>
                                    <th className="width10" >Current MOQ (in tons)</th>
                                    <th className="width10" >Updated MOQ (in tons)</th>
                                    <th className="width5" >Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableData?.length > 0 && originalTableData.length > 0 && <>{tableData.map((item, index) => {
                                    return (
                                        <tr key={index}>
                                            <td className="width10" >{item.area_code}</td>
                                            <td className="width25" >{item.db_name} ({item.db_code})</td>
                                            <td className="width15" >{item.db_location}</td>
                                            <td className="width10" >{item.plant_code}</td>
                                            <td className="width15" >{item.plant_location}</td>
                                            <td className="width10" >{parseFloat(originalTableData[index]?.moq)}</td>
                                            <td className="width10" >
                                            {hasEditPermission(pages.MOQ)? 
                                                <input
                                                id={index}
                                                type='number'
                                                min={0.0}
                                                max={1000}
                                                step={1.0}
                                                className='qty-input'
                                                onWheel={(e) => e.target.blur()}
                                                value={+(item.moq)}
                                                onKeyDown={onKeyDownHandler}
                                                onChange={onChangeQuantityHandler} /> : 
                                                parseFloat(item.moq)
                                            }
                                            </td>
                                            <td className="width5" ><Popover
                                                content={<div className="time-details" >
                                                    <p style={{ marginBottom: "5px" }}><b><i>Last Updated by:</i></b> {item.modified_by?.lastIndexOf(" ") > 0 ? item.modified_by?.substring(0, item.modified_by?.lastIndexOf(" ")) : item.modified_by}</p>
                                                    <p style={{ marginBottom: "5px" }}><b><i>Last Updated on:</i></b> {Util.formatDate(item.modified_on)} {Util.formatTime(item.modified_on)}</p>
                                                </div>}
                                                title=""
                                                trigger="click"
                                                placement="leftBottom"
                                                // open={isTimestampModalOpen}
                                                // onOpenChange={handleTimePopover}
                                            >
                                                <HistoryOutlined />
                                            </Popover>
                                            </td>

                                        </tr>
                                    )
                                })}
                                </>}


                            </tbody>
                        </table>
                        {!(tableData?.length > 0) && <div style={{ textAlign: 'center' }}>
                            No data available
                        </div>}
                    </div>
                    <Panigantion
                        data={tableData?.length > 0 ? tableData : []}
                        itemsPerPage={itemsPerPage}
                        setItemsPerPage={setItemsPerPage}
                        itemsCount={dataCount}
                        setModifiedData={onChangePage}
                        pageNo={pageNo}
                    />


                </div>
            </div>
        </>
    )

}

const mapStateToProps = (state) => {
    return {
        // last_forecast_date: state.admin.get('last_forecast_date'),
    }
}
const mapDispatchToProps = (dispatch) => {
    return {
        getAreaCodes: () => dispatch(AdminActions.getAreaCodes()),
        getMoqDbMappingData: (data) => dispatch(AdminActions.getMoqDbMappingData(data)),
        updateMoq: (data) => dispatch(AdminActions.updateMoq(data)),
    }
}


export default connect(mapStateToProps, mapDispatchToProps)(MoqDashboard)