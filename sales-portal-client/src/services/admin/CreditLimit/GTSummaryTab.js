import { connect } from 'react-redux';
import React, { useEffect, useState } from 'react';
import Util from '../../../util/helper/index';
import { Link } from 'react-router-dom';
import Panigantion from '../../../components/Panigantion';
import '../Questionnaire/survey.css';
import './CreditLimit.css';
// import { SearchOutlined } from '@ant-design/icons';
// import HeaderSearchBox from '../../../components/HeaderSearchBox/HeaderSearchBox';
// import { debounce } from 'lodash';
import Loader from '../../../components/Loader';

function GTSummaryTable(props) {
    const { tableData, updatedLimit, updatedOffset, pageNo, setPageNo, requestedBySearch } = props;
    const [limit, setLimit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortDirection, setSortDirection] = useState(false);
    const [enableSearch, setEnableSearch] = useState({ requesterSearch: false });
    const [requestorSearch, setRequestorSearch] = useState('');
  
    useEffect(() => {
        updatedLimit(limit);
        updatedOffset(offset);
        requestedBySearch(requestorSearch)
    }, [limit, offset,requestorSearch]);


    const onChangePage = (page, itemsPerPage) => {
        setLimit(itemsPerPage);
        setOffset((page - 1) * limit);
        setPageNo(page);
    };

    const sortColumn = (columnName) => {
        const newSortDirection = !sortDirection;
        setSortDirection(newSortDirection);

        const sortedRows =
            tableData && tableData?.data?.rows
                ? [...tableData.data.rows].sort((a, b) => {
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

        tableData.data.rows = sortedRows;
    };

    // const onClose = (propKey) => {
    //     setEnableSearch({ ...enableSearch, [propKey]: false })
    //     setRequestorSearch('')
    // }
    // const onFilterChange = (e) => {
    //     setRequestorSearch(e.target.value)
    // }
    // const debouncedOnFilterChange = debounce(onFilterChange, 500);

    return (
        <>
            <div className="admin-dashboard-table CL-TableHeader">
                <Loader>
                <table>
                    <thead>
                        <tr>
                                <th className="sub-header " id="subheader-trans-id" onClick={() => sortColumn('transaction_id')}>
                                Transaction Id <img src="/assets/images/sorting_icon.svg" alt="" />
                            </th>
                                <th className="sub-header "  id="subheader-party-name" >Party Code</th>
                                <th className="sub-header "  id="subheader-party-name" >Party Name</th>
                           
                            <th className="sub-header " onClick={() => sortColumn('amount')}>
                                Amount (₹)
                                <img src="/assets/images/sorting_icon.svg" alt="" />
                            </th>
                            <th className="sub-header " onClick={() => sortColumn('requested_on')}>
                                Date of Upload
                                <img src="/assets/images/sorting_icon.svg" alt="" />
                            </th>
                            <th className="sub-header" onClick={() => sortColumn('start_date')}>
                                Start Date
                                <img src="/assets/images/sorting_icon.svg" alt="" />
                            </th>
                            <th className="sub-header" onClick={() => sortColumn('end_date')}>
                                End Date
                                <img src="/assets/images/sorting_icon.svg" alt="" />
                            </th>
                            <th className="sub-header" onClick={() => sortColumn('end_date')}>
                                Requested by
                            </th>
                            <th className="sub-header ">Approved By</th>
                            <th className="sub-header ">Approved On</th>
                        </tr>
                    </thead>

                    <tbody style={{ textAlign: 'center' }}>
                        {tableData && tableData?.data?.rows?.length > 0 ? (
                            tableData?.data?.rows?.map((data, index) => {
                                let backgroundColor = '';
                                if (data.status === 'PENDING') backgroundColor = 'rgb(242, 216, 168)';
                                else if (data.status === 'APPROVED') backgroundColor = '#adefc0';
                                else if (data.status === 'REJECTED') backgroundColor = 'rgb(225 95 95 / 63%)';
                                const encrypted_id = Util.encryptData(data?.transaction_id).replaceAll('/', '*').replaceAll('+', '-');
                                const detailsPath = `/admin/cl-gt-request/${encrypted_id}`;

                                return (
                                    <tr key={index} style={{ backgroundColor }}>
                                        <td>
                                            <Link
                                                to={{
                                                    pathname: detailsPath,
                                                    state: { flag: false },
                                                }}>
                                                {data?.transaction_id ? data?.transaction_id : '-'}
                                            </Link>
                                        </td>
                                        <td>{data?.distributor_code ? `${data.distributor_code}` : '-'}</td>
                                        <td>{data?.distributor_name ? `${data.distributor_name}` : '-'}</td>
                                        <td>{data?.amount ? data?.amount : '-'}</td>
                                        <td>{data?.requested_on ? Util.formatDate(data?.requested_on) : '-'}</td>
                                        <td>{data?.start_date ? Util.formatDate(data?.start_date) : '-'}</td>
                                        <td>
                                            {data?.end_date
                                                ? data?.end_date.split('T')[0] === '9999-12-12'
                                                    ? '99-99-9999'
                                                    : Util.formatDate(data?.end_date)
                                                : '-'}
                                        </td>
                                        <td>{data?.requested_by ? data?.requested_by : '-'}</td>
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
                                <td colSpan="11" className="NoDataDiv">
                                    <b>No Data Available.</b>
                                </td>
                            </tr>
                        )}
                    </tbody>
                    </table>
                </Loader>
            </div>

            <Panigantion
                data={tableData ? tableData : []}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
                itemsCount={tableData?.data?.totalCount}
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

export default connect(mapStateToProps, mapDispatchToProps)(GTSummaryTable);
