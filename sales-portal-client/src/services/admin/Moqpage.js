import React, { useState, useRef, useEffect } from 'react';

import '../../style/admin/Dashboard.css'
import moqCss from '../admin/MoqDashboard/MoqDashboard.module.css'
import debounce from 'lodash.debounce';
import { CloseCircleOutlined, HistoryOutlined } from '@ant-design/icons';
import { Select, notification, Popover } from 'antd';
import { pages, hasEditPermission, hasViewPermission } from '../../persona/moq.js';

import { connect } from 'react-redux';
import * as AdminActions from './actions/adminAction';
import Panigantion from '../../components/Panigantion/index';
import Util from '../../util/helper';
import BulkOrderModal from './BulkOrderMoqDashboard/BulkOrderModal';
import { hasPermission, teams } from '../../persona/pegasus';
import LocalAuth from '../../util/middleware/auth.js';
const Moqpage = (props) => {
    const { bulkupdateMoq, updateMoq, getMoqDbMappingData, getBoMoqDbMappingData, getAreaCodes, dashboardFilterCategories, getCfaDepotMapping, bulkOrderMassUpdate } = props
    const [showSearch, setShowSearch] = useState('');
    const [originalTableData, setOriginalTableData] = useState([]);

    const [search, setSearch] = useState('');
    const [offset, setOffset] = useState(0);
    const [limit, setLimit] = useState(10);
    const [pageNo, setPageNo] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedArea, setSelectedArea] = useState();
    const [areaCodes, setAreaCodes] = useState([{ area_code: 'ALL' }]);
    const [visibility, setVisibility] = useState(false);
    const [isUpdate, setIsUpdate] = useState(false);
    const [updateMultiple, setUpdateMultiple] = useState(false);
    const [tableData, setTableData] = useState([]);
    const [updateCount, setUpdateCount] = useState(0);
    const [selectedMoq, setSelectedMoq] = useState('Moq');
    const [dataCount, setDataCount] = useState([]);
    const [areaDetails, setAreaDetails] = useState([]);
    const [region, setRegion] = useState();
    const [cfaData, setCfaData] = useState();
    const [tableItems, setTableItems] = useState();

    const [view, setView] = useState(false);


    const debouncedSearch = useRef(debounce(nextValue => setSearch(nextValue), 500)).current;

    useEffect(() => {
        async function fetchMoqMappingData() {
            let data;
            if (selectedMoq === 'Moq') {
                data = await getMoqDbMappingData({ area: selectedArea, search, limit, offset });
            }
            else {
                data = await getBoMoqDbMappingData({ area: selectedArea, search, limit, offset });

            }
            if (data?.success && data?.data?.rows) {
                const rows = data.data?.rows;
                setOriginalTableData([...rows]);
                setTableData([...rows]);
                setDataCount(data.data?.totalCount);
            }
            else {
                notificationSender('Fetch Error', data?.message, false);
            }
        }
        fetchMoqMappingData();
    }, [search, limit, offset, selectedArea, updateCount, getMoqDbMappingData, selectedMoq]);

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

    const onSearch = (e) => {
        const { value } = e.target;
        debouncedSearch(value);
        setShowSearch(value);
        setOffset(0);
        setLimit(itemsPerPage);
        setPageNo(1);
    }

    const handleVisibility = () => {
        setVisibility(false);
        setIsUpdate(false);
        setView(false);
        setUpdateMultiple(false);
    };

    const resetPage = () => {
        debouncedSearch('');
        setShowSearch('');
        setOffset(0);
    }


    const onAreaChangeHandler = (value) => {
        setSelectedArea(value);
        setSearch('');
        setShowSearch('');
    }


    const handleUpdates = () => {
        // setItemData(updateData);
        setVisibility(true);
        setIsUpdate(false);
        setUpdateMultiple(true);
    }


    useEffect(() => {
        dashboardFilterCategories()
            .then((res) => {
                setAreaDetails(res?.response?.area_details);
                const region = new Set();
                res.response.area_details.forEach((obj) => {
                    const value = obj['region'];
                    region.add(value);
                });
                setRegion([...region]);
            })
            .catch((error) => { });

        fetchCfaDepotMapping();
    }, []);


    const fetchCfaDepotMapping = () => {
        const body = hasViewPermission(pages.MOQ || pages.BULKMOQ) && hasPermission(teams.LOGISTICS) ? LocalAuth.getUserEmail() : null;
        getCfaDepotMapping(body)
            .then((response) => {
                setCfaData(JSON.parse(JSON.stringify(response?.data?.data)));
                setTableItems(response.data.data);
            })
            .catch((error) => { });
    }


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

    const onSaveHandler = async () => {

        let moq_data = [];
        tableData.forEach((item, index) => {
            if (parseFloat(item?.moq) !== parseFloat(originalTableData[index]?.moq)) {
                moq_data.push({ dbId: item.db_id, plantId: item.plant_id, moq: parseFloat(item.moq) });
            }
        });

        if (moq_data.length > 0) {

            let response = selectedMoq === 'BulkMoq' ? await bulkupdateMoq({ moq_data }) : await updateMoq({ moq_data });
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

    const formatValue = (value) => {

        //check if value is number, else return 0, also check if the value is within range of 0-100, if less than 0 then return 0, if greater than 100 then return 100
        if (isNaN(value)) {
            return '0';
        }
        // else if (value.length > 2 && value < 30) {
        //     return '0';
        // }

        else {
            return value.toString();
        }
    }

    const onKeyDownHandler = (e) => {
        console.log('onKeyDownHandler', e)
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
        if (selectedMoq === 'Moq') {
            const regex = /^[0-9\b]+$/;
            let val = (parseFloat(value)) ? Math.abs(parseFloat(value)) : 0.0;
            val = val > 1000 ? parseInt(val / 10) : val.toFixed(2);

            // if (regex.test(value))
            setTableData((prev) => {
                prev = JSON.parse(JSON.stringify(tableData));
                prev[id]['moq'] = +val;
                return [...prev];
            });
        }
        else {
            let val = formatValue(value);

            setTableData((prev) => {
                prev = JSON.parse(JSON.stringify(tableData));
                prev[id]['moq'] = val;
                return [...prev];
            });
        }
    }

    const onChangePage = (page, itemsPerPage) => {
        setLimit(itemsPerPage)
        setOffset((page - 1) * limit)
        setPageNo(page)
    }

    const handleSubmit = async (data) => {
        console.log(data);
        setVisibility(false);
        let response = await bulkOrderMassUpdate(data);
        if (response?.success) {
            notification.success({
                message: 'Success',
                description: 'MOQ updated successfully',
                duration: 4,
                className: 'notification-success',
            })
        }
        else {
            notification.error({
                message: 'Success',
                description: 'While Updating MOQ some error occurred.',
                duration: 4,
                className: 'notification-success',
            })
        }
    }

    const moqSelected = (value) => {

        setSelectedMoq(value);
        setOffset(0);
        setLimit(itemsPerPage);
        setPageNo(1);
        setSearch('');
        setShowSearch('');
        setSelectedArea('ALL');
    }
    return (
        <div className="admin-dashboard-wrapper">
            <div className="admin-dashboard-block">
                <div className="sdr-dashboard-head">
                    <h2>{selectedMoq === 'Moq' ? 'MOQ Dashboard' : 'Bulk Order MOQ Dashboard'}</h2>

                </div>
                <div style={{ display: 'flex' }}>

                    <div className={`req-tabs ${moqCss.req_width}`}>

                        <button id={`${moqCss.font_size_20}`} className={`tablink ${selectedMoq === 'Moq' ? 'active' : ''}`} onClick={() => moqSelected('Moq')}>MOQ</button>


                        <button id={`${moqCss.font_size_20}`} className={`tablink ${selectedMoq === 'BulkMoq' ? 'active' : ''}`} onClick={() => moqSelected('BulkMoq')}>Bulk MOQ</button>
                    </div>
                    <div className={`admin-dashboard-head ${moqCss.mb_0} ${moqCss.header_action}`} >


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
                                    className='width120px'
                                    style={{ fontSize: '13px' }}
                                    placeholder={selectedArea}
                                    value={selectedArea}
                                    optionFilterProp="children"
                                    onChange={onAreaChangeHandler}
                                    filterOption={(input, option) =>
                                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                    options={areaCodes?.map(item => { return { value: item.area_code, label: item.area_code } })}
                                />
                            </div>
                        </div>


                        {hasEditPermission(pages.MOQ || pages.BULKMOQ) && <div className='right-header'>
                            <div className="comment-section">

                                <button
                                    type="button"
                                    className={`${moqCss.ml3} ${moqCss.moq_page_btn} `}
                                    onClick={onResetHandler}
                                // disabled={!isTImelineOpen}
                                >Reset
                                </button>
                                <button
                                    type="button"
                                    className={`${moqCss.moq_page_btn} ${moqCss.ml3}`}
                                    // hidden={!isEdit}
                                    // disabled={difference || !isTImelineOpen || !canSave}
                                    onClick={onSaveHandler}>Save
                                </button>
                                {selectedMoq === 'BulkMoq' &&

                                    <button
                                        type="button"
                                        className={`${moqCss.ml3} ${moqCss.moq_page_btn} `}

                                        onClick={handleUpdates}
                                    >
                                        Multi.update
                                    </button>

                                }


                            </div>
                        </div>}


                    </div>
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
                                <th className="width10" >{selectedMoq === 'BulkMoq' ? 'Current MOQ day(TONS)' : 'Current MOQ in(TONS)'}</th>
                                <th className="width10" >{selectedMoq === 'BulkMoq' ? 'Updated MOQ day(TONS)' : 'Updated MOQ in(TONS)'}</th>
                                <th className="width5" >Actions</th>
                            </tr>
                        </thead>
                        <tbody>

                            {tableData?.length > 0 && originalTableData.length > 0 && tableData.map((item, index) => {
                                return (

                                    <tr key={index}>
                                        <td className="width10" >{item.area_code}</td>
                                        <td className="width25" >{item.db_name} ({item.db_code})</td>
                                        <td className="width15" >{item.db_location}</td>
                                        <td className="width10" >{item.plant_code}</td>
                                        <td className="width15" >{item.plant_location}</td>
                                        <td className="width10" >{parseFloat(originalTableData[index]?.moq)}</td>
                                        <td className="width10" >
                                            {hasEditPermission(pages.MOQ || pages.BULKMOQ) ?
                                                <input
                                                    id={index}
                                                    type='number'
                                                    min={selectedMoq === 'Moq' ? 0.0 : 30}
                                                    max={selectedMoq === 'Moq' ? 1000 : 100}
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
                {visibility && <BulkOrderModal
                    cfaDatas={cfaData}

                    region={region}
                    onHide={handleVisibility}
                    visible={visibility}
                    onUpdate={handleSubmit}
                    isUpdate={isUpdate}
                    view={view}
                    updateMultiple={updateMultiple}

                    areaDetails={areaDetails}

                />}




            </div>
        </div>

    )
}


const mapDispatchToProps = (dispatch) => {
    return {
        getAreaCodes: () => dispatch(AdminActions.getAreaCodes()),
        getBoMoqDbMappingData: (data) => dispatch(AdminActions.getBoMoqDbMappingData(data)),
        bulkupdateMoq: (data) => dispatch(AdminActions.BulkOrderupdateMoq(data)),
        dashboardFilterCategories: (data) =>
            dispatch(AdminActions.dashboardFilterCategories(data)),
        getCfaDepotMapping: (email) => dispatch(AdminActions.getCfaDepotMapping(email)),
        bulkOrderMassUpdate: (data) => dispatch(AdminActions.bulkOrderMassUpdate(data)),
        getMoqDbMappingData: (data) => dispatch(AdminActions.getMoqDbMappingData(data)),
        updateMoq: (data) => dispatch(AdminActions.updateMoq(data)),
    }
}


export default connect(null, mapDispatchToProps)(Moqpage)


