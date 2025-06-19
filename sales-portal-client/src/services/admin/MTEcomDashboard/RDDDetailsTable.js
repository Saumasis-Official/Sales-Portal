import React, { useState } from 'react';
import { connect } from 'react-redux';
import { useEffect } from 'react';
import Loader from '../../../components/Loader';
import Panigantion from '../../../components/Panigantion';
import '../Questionnaire/survey.css';
import '../../distributor/OrderDetail/OrderDetailsTable.css';
import './Mtecom.css';
import { NO_DATA_SYMBOL } from '../../../constants';
import Util from '../../../util/helper/index';

let RDDDetailsTable = (props) => {
    const { rddItems, updatedLimit, updatedOffset } = props;
    const [limit, setLimit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [pageNo, setPageNo] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        updatedLimit(limit);
        updatedOffset(offset);
    }, [limit, offset]);

    const onChangePage = (page, itemsPerPage) => {
        setLimit(itemsPerPage);
        setOffset((page - 1) * limit);
        setPageNo(page);
    };

    return (
        <>
            <div className="admin-dashboard-table Mdm-TableHeader">
                <Loader>
                    <table>
                        <thead>
                            <tr>
                                <th className="sub-header width15" style={{ width: '8%' }}>
                                    Line Item ID
                                </th>
                                <th className="sub-header width15" style={{ width: '8%' }}>
                                    Customer Product ID
                                </th>
                                <th className="sub-header width15" style={{ width: '10%' }}>
                                    SKU
                                </th>
                                <th className="sub-header width15" style={{ width: '20%' }}>
                                    SKU Description
                                </th>
                                <th className="sub-header width15" style={{ width: '10%' }}>
                                    PO Expiry
                                </th>
                                <th className="sub-header width15" style={{ width: '10%' }}>
                                    PO Qty
                                </th>
                                <th className="sub-header width15" style={{ width: '10%' }}>
                                    RDD
                                </th>
                                <th className="sub-header width15" style={{ width: '10%' }}>
                                    Confirmed Qty
                                </th>
                            </tr>
                        </thead>
                        <tbody style={{ textAlign: 'center' }}>
                            {rddItems &&
                                rddItems.rddList &&
                                rddItems.rddList.length > 0 &&
                                rddItems.rddList.map((data, index) => {
                                    return (
                                        <tr>
                                            <td>{data?.po_item_number ? data?.po_item_number : NO_DATA_SYMBOL}</td>
                                            <td>{data?.article_id ? data?.article_id : NO_DATA_SYMBOL}</td>
                                            <td>{data?.system_sku ? data?.system_sku : NO_DATA_SYMBOL}</td>
                                            <td>{data?.sku_name ? data?.sku_name : NO_DATA_SYMBOL}</td>
                                            <td>{data?.po_expiry_date ? Util.formatDate(data?.po_expiry_date) : NO_DATA_SYMBOL}</td>
                                            <td>{data?.po_qty ? data?.po_qty : NO_DATA_SYMBOL}</td>
                                            <td>{data?.rdd ? Util.formatDate(data?.rdd) : NO_DATA_SYMBOL}</td>
                                            <td>{data?.confirmed_quantity !== null && data?.confirmed_quantity !== undefined ? data?.confirmed_quantity : NO_DATA_SYMBOL}</td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </Loader>
                {!(rddItems?.rddList?.length > 0) && (
                    <div className="NoDataDiv">
                        <b> No data available.</b>
                    </div>
                )}
            </div>

      <Panigantion
        data={rddItems?.rddList ? rddItems?.rddList : []}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        itemsCount={rddItems?.count}
        setModifiedData={onChangePage}
        pageNo={pageNo}
      />
    </>
  );
};
const mapStateToProps = (state, ownProps) => {
    return {};
};
const mapDispatchToProps = (dispatch, ownProps) => {
    return {};
};

const ConnectRDDDetailsTable = connect(mapStateToProps, mapDispatchToProps)(RDDDetailsTable);

export default ConnectRDDDetailsTable;
