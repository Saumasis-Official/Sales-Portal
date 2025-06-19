import { connect } from 'react-redux';
import React, { useEffect, useState } from 'react';
import Util from '../../../util/helper/index';
import Loader from '../../../components/Loader/mtIndex';
import { Link } from 'react-router-dom';
import Panigantion from '../../../components/Panigantion';
import '../Questionnaire/survey.css';
import '../MTEcomDashboard/Mtecom.css';
import { Select, Button } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import * as Actions from '../../admin/actions/adminAction';
import auth from '../../../util/middleware/auth';

const { Option } = Select;

function ClosedPoTable(props) {
    const { poData, flag, status, updatedLimit, updatedOffset, pageNo, setPageNo, setRetriggerSo, setCustomerCodes, getAllShopifyCustomers, visible } = props;
    const [limit, setLimit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedCustomerCodes, setSelectedCustomerCodes] = useState([]);
    const [shopifyCustomersList, setShopifyCustomersList] = useState([]);
    const [isSelectVisible, setIsSelectVisible] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        flag(true);
        status('Closed');
        updatedLimit(limit);
        updatedOffset(offset);
        setRetriggerSo(true);
        const fetchShopifyCustomers = async () => {
            let payload = {
                role: auth.getAdminRole(),
                id: localStorage.getItem('user_id'),
            };
            payload['status'] = 'Closed';
            const shopifyCustomers = await getAllShopifyCustomers(payload);
            if (shopifyCustomers?.success) {
                const customersData = shopifyCustomers.data.customer_codes;
                const filteredCustomers = customersData.map((customer) => {
                    return {
                        ...customer,
                    };
                });
                setShopifyCustomersList(filteredCustomers);
            }
        };

        fetchShopifyCustomers();
    }, [limit, offset]);

    useEffect(() => {
        if (visible) {
            setIsSelectVisible(false);
            if (!isSaved) {
                setSelectedCustomerCodes([]);
            }
        }
    }, [visible]);

    const onChangePage = (page, itemsPerPage) => {
        setLimit(itemsPerPage);
        setOffset((page - 1) * limit);
        setPageNo(page);
        setRetriggerSo(false);
    };

    const handleCustomerCodeChange = (value) => {
        setSelectedCustomerCodes(value);
        setCustomerCodes(value);
        setIsSaved(false);
    };

    const handleClear = () => {
        setSelectedCustomerCodes([]);
        setCustomerCodes([]);
        setRetriggerSo(true);
        setIsSelectVisible(false);
    };
    const handleOkClick = () => {
        setCustomerCodes(selectedCustomerCodes);
        setRetriggerSo(true);
        setIsSelectVisible(false);
        setIsSaved(true);
    };

    return (
        <>
            <div className="admin-dashboard-table Mdm-TableHeader">
                <table>
                    <Loader>
                        <thead>
                            <tr>
                                <th className="sub-header ">PO Number</th>
                                {!isSelectVisible ? (
                                    <th className="sub-header " style={{ width: '160px' }}>
                                        Customer Code
                                        <span onClick={() => setIsSelectVisible(true)} style={{ cursor: 'pointer' }}>
                                            <DownOutlined />
                                        </span>
                                    </th>
                                ) : (
                                    <th className="sub-header " style={{ width: '150px' }}>
                                        <Select
                                            mode="multiple"
                                            autoFocus
                                            open
                                            maxTagCount={0}
                                            style={{ width: '100%' }}
                                            placeholder="Select customer codes"
                                            value={selectedCustomerCodes}
                                            onChange={handleCustomerCodeChange}
                                            allowClear={shopifyCustomersList?.length > 0}
                                            onClear={handleClear}
                                            dropdownRender={(menu) => (
                                                <div>
                                                    {menu}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: 8 }}>
                                                        <Button type="primary" onClick={handleOkClick}>
                                                            {' '}
                                                            OK{' '}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}>
                                            {shopifyCustomersList.map((value) => (
                                                <Option key={value.partnnumb} value={value.partnnumb}>
                                                    {value.partnnumb}
                                                </Option>
                                            ))}
                                        </Select>
                                    </th>
                                )}
                                <th className="sub-header ">Customer Name</th>
                                <th className="sub-header ">SO Number</th>
                                <th className="sub-header ">Sales Org</th>
                                <th className="sub-header ">PO Date</th>
                                <th className="sub-header ">RDD</th>
                            </tr>
                        </thead>
                        <tbody style={{ textAlign: 'left' }}>
                            {poData && poData?.data && poData?.data?.length > 0 ? (
                                poData?.data?.map((data, index) => (
                                    <tr key={index}>
                                        <td>
                                            <Link
                                                to={{ pathname: '/admin/shopify-po-details' }}
                                                onMouseEnter={() => {
                                                    localStorage.setItem('hideDeleteButton', true);
                                                    localStorage.setItem('deletedBy', true);
                                                    localStorage.setItem('deletionTimeStamp', true);
                                                    localStorage.setItem('shopify-po-details', JSON.stringify(data));
                                                }}>
                                                {data?.po_number ? data?.po_number : '-'}
                                            </Link>
                                        </td>
                                        <td>{data?.order_partners[0][0].PartnNumb ? String(Number(data?.order_partners[0][0].PartnNumb)) : '-'}</td>
                                        <td>{data?.customer ? data?.customer : '-'}</td>
                                        <td>{data?.sales_order ? data?.sales_order : '-'}</td>
                                        <td>{data?.sales_org ? data?.sales_org : '-'}</td>
                                        <td>{data?.po_date && !isNaN(new Date(data?.po_date).getTime()) ? Util.getDateAsMonthName(data?.po_date) : '-'}</td>
                                        <td>{data?.rdd && !isNaN(new Date(data?.rdd).getTime()) ? Util.getDateAsMonthName(data?.rdd) : '-'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" className="NoDataDiv">
                                        <b>No Data Available.</b>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Loader>
                </table>
            </div>
            {
                // poData && poData?.count > 10 &&
                <Panigantion
                    data={poData?.data ? poData?.data : []}
                    itemsPerPage={itemsPerPage}
                    setItemsPerPage={setItemsPerPage}
                    itemsCount={poData?.count}
                    setModifiedData={onChangePage}
                    pageNo={pageNo}
                />
            }
        </>
    );
}

const mapStateToProps = () => {
    return {};
};
const mapDispatchToProps = (dispatch) => {
    return {
        getAllShopifyCustomers: (payload) => dispatch(Actions.getAllShopifyCustomers(payload)),
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(ClosedPoTable);
