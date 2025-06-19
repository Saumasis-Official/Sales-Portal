import { connect } from 'react-redux';
import React, { useEffect, useState } from 'react';
import Util from '../../../util/helper/index';
import { Link } from 'react-router-dom';
import Panigantion from '../../../components/Panigantion';
import '../Questionnaire/survey.css';
import './CreditLimit.css';
import { InfoCircleFilled } from '@ant-design/icons';
import { Popover } from 'antd';

function SummaryTable(props) {
    const { tableData, updatedLimit, updatedOffset, pageNo, setPageNo } = props;
    const [limit, setLimit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortDirection, setSortDirection] = useState(false);
    const default_expiry_content = (
        <div>
            <div>Time : 11:59 PM</div>
        </div>
    );

    useEffect(() => {
        updatedLimit(limit);
        updatedOffset(offset);
    }, [limit, offset]);

    const onChangePage = (page, itemsPerPage) => {
        setLimit(itemsPerPage);
        setOffset((page - 1) * limit);
        setPageNo(page);
    };

    const sortColumn = (columnName) => {
        const newSortDirection = !sortDirection;
        setSortDirection(newSortDirection);

        const sortedRows =
            tableData && tableData.rows
                ? [...tableData.rows].sort((a, b) => {
                      let comparison = 0;

                      const firstRow = columnName === 'amount_requested' ? parseFloat(a && a[columnName] ? a[columnName] : 0) : a && a[columnName] ? a[columnName] : '';

                      const secondRow = columnName === 'amount_requested' ? parseFloat(b && b[columnName] ? b[columnName] : 0) : b && b[columnName] ? b[columnName] : '';

                      if (firstRow < secondRow) {
                          comparison = -1;
                      }
                      if (firstRow > secondRow) {
                          comparison = 1;
                      }
                      return newSortDirection ? comparison : comparison * -1;
                  })
                : [];

        tableData.rows = sortedRows;
    };

    return (
        <>
            <div className="admin-dashboard-table CL-TableHeader">
                <table>
                    {/* <Loader> */}
                    <thead>
                        <tr>
                            {/* <th className="sub-header ">Customer Group</th> */}
                            <th className="sub-header " onClick={() => sortColumn('transaction_id')}>
                                Transaction Id <img src="/assets/images/sorting_icon.svg" alt="" />
                            </th>
                            <th className="sub-header ">Payer Name (Code)</th>
                            <th className="sub-header " onClick={() => sortColumn('expirydate')}>
                                Expiry Date{' '}
                                <Popover content={default_expiry_content} placement="top" className="th-info-icon">
                                    <InfoCircleFilled />
                                </Popover>{' '}
                                <img src="/assets/images/sorting_icon.svg" alt="" />
                            </th>
                            <th className="sub-header " onClick={() => sortColumn('amount_requested')}>
                                Extension Amount (₹)
                                <img src="/assets/images/sorting_icon.svg" alt="" />
                            </th>
                            <th className="sub-header ">Requested By</th>

                            <th className="sub-header" onClick={() => sortColumn('requested_on')}>
                                Requested On
                                <img src="/assets/images/sorting_icon.svg" alt="" />
                            </th>

                            <th className="sub-header ">Approved By</th>
                            <th className="sub-header ">Approved On</th>
                            {/* <th className="sub-header ">Action</th> */}
                        </tr>
                    </thead>

                    <tbody style={{ textAlign: 'center' }}>
                        {tableData && tableData?.rows?.length > 0 ? (
                            tableData?.rows?.map((data, index) => {
                                let backgroundColor = '';
                                if (data.status === 'PENDING') backgroundColor = 'rgb(242, 216, 168)';
                                else if (data.status === 'APPROVED') backgroundColor = '#adefc0';
                                else if (data.status === 'REJECTED') backgroundColor = 'rgb(225 95 95 / 63%)';
                                const encrypted_id = Util.encryptData(data?.transaction_id).replaceAll('/', '*').replaceAll('+', '-');
                                const detailsPath = `/admin/cl-order-request/${encrypted_id}`;

                                return (
                                    <tr key={index} style={{ backgroundColor }}>
                                        {/* <td>{data?.customer_group ? data.customer_group  : '-'}</td>
                                         */}
                                        <td>
                                            <Link
                                                to={{
                                                    pathname: detailsPath,
                                                    state: { flag: false },
                                                }}>
                                                {data?.transaction_id ? data?.transaction_id : '-'}
                                            </Link>
                                        </td>
                                        <td>{data?.payer_name ? `${data.payer_name} (${data.payercode})` : '-'}</td>
                                        <td>{data?.expirydate ? <> {Util.formatDate(data?.expirydate)}</> : '-'}</td>
                                        {/* <td>{data?.baselimit ? data?.baselimit : "-"}</td> */}
                                        <td>{data?.amount_requested ? data?.amount_requested : '-'}</td>

                                        <td>{data?.requested_by ? data?.requested_by : '-'}</td>

                                        <td>{data?.requested_on ? Util.formatDate(data?.requested_on) : '-'}</td>

                                        <td style={{ whiteSpace: 'pre-line' }}>{data?.responded_by && data.responded_by.length > 0 ? data.responded_by.join(', \n') : '-'}</td>
                                        <td style={{ whiteSpace: 'pre-line' }}>
                                            {data.responded_on && data.responded_on.length > 0
                                                ? data.responded_on.map((item, index) => (
                                                      <p key={item.id || index} style={{ marginBottom: '0px' }}>
                                                          {Util.formatDate(item.date || item)},{''}
                                                          {Util.formatTime(item.date || item)}
                                                          {index < data.responded_on.length - 1 && ','}
                                                      </p>
                                                  ))
                                                : '-'}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="10" className="NoDataDiv">
                                    <b>No Data Available.</b>
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {/* </Loader> */}
                </table>
            </div>
            <Panigantion
                data={tableData ? tableData : []}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
                itemsCount={tableData?.totalCount}
                setModifiedData={onChangePage}
                pageNo={pageNo}
            />
        </>
    );
}

const mapStateToProps = () => {
    return {};
};
const mapDispatchToProps = () => {
    return {};
};

export default connect(mapStateToProps, mapDispatchToProps)(SummaryTable);
