import React, { Fragment } from 'react';
import { connect } from 'react-redux';
import { useEffect } from 'react';
import * as Actions from '../../admin/actions/adminAction';
import Util from '../../../util/helper';

let DeliveriesTable = props => {
    const browserHistory = props.history;
    const { tableItems, headerData, delivery_no, invoice_no, distributorId, getMaintenanceRequests } = props;
    useEffect(() => {
        getMaintenanceRequests();
    });

    const getDeliveryDetails = (deliveryNumber) => {
        let deliveryDetails = tableItems.filter((val) => {
            return val.delivery === deliveryNumber
        })
        let pathUrl = ''
        if (distributorId) {
            pathUrl = '/admin/sales-order/details';
        } else {
            pathUrl = '/distributor/sales-order/details';
        }
        browserHistory.push({ pathname: pathUrl, state: { type: 'delivery', tableItems: deliveryDetails, headerData, delivery_no, invoice_no, distributorId } })
    };

    let uniqueObjArray = [
        ...new Map(tableItems.map((item) => [item["delivery"], item])).values(),
    ];

    return (
        <div className="sales-order-table purchase-order-table">
            <table>
                <thead className="sales-orders-th">
                    <tr>
                        <th className="material-header" style={{ width: '5%' }}>Delivery #</th>
                        <th className="material-header-code">Delivery Date</th>
                    </tr>
                </thead>
                <tbody>
                    {uniqueObjArray && uniqueObjArray.length > 0 && uniqueObjArray.map((input, index) => {
                        return (
                            <Fragment key={`items-list-${index}`}>
                                <tr>
                                    <td ><a onClick={() => getDeliveryDetails(input.delivery)}>{input.delivery}</a></td>
                                    <td>{input.delivery_date ? Util.formatDate(input.delivery_date,'YYYYMMDD') : ''}</td>
                                </tr>
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    )
}

const mapStateToProps = (state, ownProps) => {
    return {
    }
}
const mapDispatchToProps = (dispatch, ownProps) => {
    return {
        getMaintenanceRequests: () =>
            dispatch(Actions.getMaintenanceRequests()),
    }
}

const ConnectDeliveriesTable = connect(
    mapStateToProps,
    mapDispatchToProps
)(DeliveriesTable)

export default ConnectDeliveriesTable;
