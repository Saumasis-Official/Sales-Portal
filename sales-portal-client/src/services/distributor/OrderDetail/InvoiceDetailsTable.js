import React, { Fragment } from 'react';
import { connect } from 'react-redux';
import moment from 'moment';
import { NO_DATA_SYMBOL } from '../../../constants';
import Util from '../../../util/helper';

let InvoiceDetailsTable = (props) => {
  const browserHistory = props.history;
  const {
    tableItems,
    headerData,
    delivery_no,
    invoice_no,
    distributorId,
  } = props;

  const getInvoiceDetails = (invoiceNumber) => {
    let invoiceList = tableItems.filter((val) => {
      return val.invoice === invoiceNumber;
    });
    let pathUrl = '';
    if (distributorId) {
      pathUrl = '/admin/sales-order/details';
    } else {
      pathUrl = '/distributor/sales-order/details';
    }
    browserHistory.push({
      pathname: pathUrl,
      state: {
        type: 'invoice',
        tableItems: invoiceList,
        headerData,
        delivery_no,
        invoice_no,
        distributorId,
      },
    });
  };

  let uniqueObjArray = [
    ...new Map(
      tableItems.map((item) => [item['invoice'], item]),
    ).values(),
  ];
  return (
    <div className="sales-order-table purchase-order-table">
      <table>
        <thead className="sales-orders-th">
          <tr>
            <th className="material-header">Invoice #</th>
            <th className="material-header-code">Invoice Date</th>
            <th>
              Value ({' '}
              <span style={{ color: 'white', fontSize: 'large' }}>
                &#8377;
              </span>{' '}
              )
            </th>
            <th>Delivery Code</th>
            <th>Invoice Timestamp</th>
            <th>Delivery Verify Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {uniqueObjArray &&
            uniqueObjArray.length > 0 &&
            uniqueObjArray.map((input, index) => {
              return (
                <Fragment key={`items-list-${index}`}>
                  <tr>
                    <td>
                      <a
                        onClick={() =>
                          getInvoiceDetails(input.invoice)
                        }
                      >
                        {input.invoice}
                      </a>
                    </td>
                    <td>
                      {input.invoice_date
                        ? Util.formatDate(input.invoice_date,'YYYYMMDD')
                        : NO_DATA_SYMBOL}
                    </td>
                    <td>{input.value}</td>
                    <td>
                      {input.grn_code
                        ? input.grn_code
                        : NO_DATA_SYMBOL}
                    </td>
                    <td>
                      {input.grn_code && input.invoice_date
                        ? Util.formatDate(input.invoice_date,'YYYYMMDD')
                        : NO_DATA_SYMBOL}
                    </td>
                    <td>
                      {input.vehicle_arrival_date_time
                        ? Util.formatDateTime(
                            input.vehicle_arrival_date_time,
                            'DD.MM.YYYY HH:mm:ss'
                          )
                        : NO_DATA_SYMBOL}
                    </td>
                  </tr>
                </Fragment>
              );
            })}
        </tbody>
      </table>
    </div>
  );
};

const mapStateToProps = (state, ownProps) => {
  return {};
};
const mapDispatchToProps = (dispatch, ownProps) => {
  return {};
};

const ConnectInvoiceDetailsTable = connect(
  mapStateToProps,
  mapDispatchToProps,
)(InvoiceDetailsTable);

export default ConnectInvoiceDetailsTable;
