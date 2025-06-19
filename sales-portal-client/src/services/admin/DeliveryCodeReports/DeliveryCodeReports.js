import './DeliveryCodeReports.css';
import { connect } from 'react-redux';
import { CloseCircleOutlined } from '@ant-design/icons';
import * as Action from '../actions/adminAction';
import Panigantion from '../../../components/Panigantion';
import React, { useState, useEffect, useRef } from 'react';
import debounce from 'lodash.debounce';
import Loader from '../../../components/Loader';
import { notification } from 'antd';

const DeliveryCodeReports = (props) => {

    //-----------------------------------------------------=====Props and Constants====--------------------------------------------
    const { deliveryCodeReports } = props;
    
   //-----------------------------------------------------=====useState====---------------------------------------------------------
    const [offset, setOffset] = useState(0);
    const [limit, setLimit] = useState(10);
    const [pageNo, setPageNo] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [reportsData, setReportsData] = useState([]);
    const [showSearch, setShowSearch] = useState('');
    const [search, setSearch] = useState('');

    //-----------------------------------------------------=====useRef====---------------------------------------------------------

    const debouncedSearch = useRef(debounce((nextValue) => setSearch(nextValue), 1000)).current;

    //-----------------------------------------------------=====API Calls=====-----------------------------------------------------
    const fetchReportsData = async () => {
            let payload = {
                queryParams: {
                    search: search.trim().replace(/\s+/g, ' '),
                    limit: limit,
                    offset: offset,
                },
            };
            let data = [];
            try {
                data = await deliveryCodeReports(payload);
                setReportsData(data?.data)
            } catch (error) {
                notification.error({
                    message: 'Error',
                    description: error.message || 'Failed to fetch delivery code reports.',
                });
        }
    };
    
    //-----------------------------------------------------=====useEffect====------------------------------------------------------

    useEffect(() => {
        fetchReportsData();
    }, [search, limit, offset, pageNo]);
    

    //-----------------------------------------------------=====Event Handlers=====------------------------------------------------
    const onChangePage = (page, itemsPerPage) => {
        setLimit(itemsPerPage);
        setOffset((page - 1) * limit);
        setPageNo(page);
    };

    const onSearch = (e) => {
        debouncedSearch(e);
        setShowSearch(e);
        setPageNo(1);
    };
    
    const resetPage = () => {
        debouncedSearch('');
        setShowSearch('');
        setOffset(0);
        setPageNo(1);
        setLimit(10);
    };

    // ----------------------------------------------------=====Renders=====-------------------------------------------------------

    return (
        <>
            <div className="admin-dashboard-wrapper">
                <div className="admin-dashboard-block">
                    <div className="admin-dashboard-head">
                        <h2>Delivery Code Reports</h2>
                    </div>

                    <div className="admin-dashboard-head-bottom delivery-report-head-bottom" >
                        <div className="dashboard-parent-div delivery-report-head-bottom" >

                            <div className='delivery-report-search-div'>
                                <input
                                    type="text"
                                    className="dash-search-fld-cl delivery-report-search"
                                    placeholder={'Search by distributor name, code, area, region, invoice number'}
                                    value={showSearch}
                                    onChange={(e) => {
                                        onSearch(e.target.value);
                                    }}
                                />
                                <div
                                    onClick={() => {
                                        resetPage();
                                    }}
                                    className="dash-search-close-cl">
                                    <CloseCircleOutlined />
                                </div>
                            </div>

                        </div>
                    </div>
                    <div className="admin-dashboard-table CL-TableHeader">
                        <Loader>
                        <table>
                            <thead>
                                <tr>

                                    <th className="sub-header ">
                                        Region
                                    </th>
                                    <th className="sub-header ">Area</th>
                                    <th className="sub-header width200px">Distributor </th>
                                    {/* <th className="sub-header ">Ship to (code)</th> */}
                                    <th className="sub-header ">Invoice#</th>
                                    <th className="sub-header ">Email</th>
                                    <th className="sub-header ">Mobile#</th>
                                    <th className="sub-header ">Email Sent</th>
                                    <th className="sub-header ">SMS Sent</th>
                                </tr>
                            </thead>

                            <tbody style={{ textAlign: 'center' }} >                 
                                {reportsData && reportsData?.rows?.length > 0 ? (
                                    reportsData?.rows.map((item, index) => {
                                        return (
                                            <tr key={index}>
                                                <td>{item.region}</td>
                                                <td>{item.area_code}</td>
                                                <td>{item.name}{' '}({item.distributor_code})</td>
                                                {/* <td>shiptooo</td> */}
                                                <td>{item.invoice_number}</td>
                                                <td>{item.email}</td>
                                                <td>{item.mobile_number}</td>
                                                <td>
                                                    <label className='delivery-code-check-box'>
                                                        <input type="checkbox"  checked={item.email_status} readonly/> 
                                                        <span class="checkmark-box" ></span>
                                                    </label>
                                                </td>
                                                <td>
                                                    <label className='delivery-code-check-box'>
                                                        <input type="checkbox" checked={item.sms_status} readonly />
                                                        <span class="checkmark-box"></span>
                                                    </label>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="8">No data available</td>
                                    </tr>
                                )}
                             
                            </tbody>
                            </table>
                        </Loader>
                    </div>
                    <Panigantion
                            data={reportsData && reportsData?.rows?.length>0 ? reportsData?.rows : []}
                            itemsPerPage={itemsPerPage}
                            setItemsPerPage={setItemsPerPage}
                            itemsCount={reportsData?.totalCount}
                            setModifiedData={onChangePage}
                            pageNo={pageNo}
                        />
                </div>
            </div>
        </>
    );
};

const mapStateToProps = () => {
    return {};
};

const mapDispatchToProps = (dispatch) => {
    return {
        deliveryCodeReports: (data) => dispatch(Action.deliveryCodeReports(data)),
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(DeliveryCodeReports);
