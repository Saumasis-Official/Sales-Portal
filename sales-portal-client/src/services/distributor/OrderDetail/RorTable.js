import React, { Fragment } from 'react';
import { connect } from 'react-redux';
import { useEffect } from 'react';
import * as Actions from '../../admin/actions/adminAction';
import { Table } from 'antd';
import './OrderDetails.css';


let RorTable = props => {
    const browserHistory = props.history;
    const { tableItems,  getMaintenanceRequests } = props;
    useEffect(() => {
        getMaintenanceRequests();
    });
    return (
        <div>
        <div className="sales-order-table purchase-order-table">
            <div>
        <table >
            <thead className="sales-orders-th">
                <tr style={{width:'100%'}}>
                    <th className="material-header" style={{ width: '10%' }}>Item Number</th>
                    <th className="material-header" style={{ width: '25%' }}>Material</th>
                    <th className="material-header" style={{ width: '15%' }}>Material Code</th>
                    <th className="material-header" style={{ width: '10%' }}>PO quantity</th>
                    <th className="material-header" style={{ width: '10%' }}>Allocated quantity</th>
                    <th className="material-header" style={{ width: '10%' }}>ROR quantity</th>
                    <th className="material-header" style={{ width: '30%' }}>ROR/Additional reason</th>
                </tr>
            </thead>
            <tbody >
                {tableItems && tableItems.length > 0 && tableItems.map((item, index) => {
                    
                    return (
                        <Fragment key={`items-list-${index}`}>
                            <tr key={item.key}  >
                            <td >{parseInt(item.itemNumber)/10}</td>
                                <td >{item.materialDescription}</td>
                                <td>{item.material}</td>
                                 <td>{item.qty}</td>
                                 <td>{item.allocatedQty}</td>
                                    <td>{item.allocatedQty?(parseFloat(item.qty) - parseFloat(item.allocatedQty)): '-'}</td>
                                    <td>{item.ror?item.ror:'-'}</td>
                                    <td>
                                   
                   
                    </td>
                            </tr>
                        </Fragment>
                    );
                })}
            </tbody>
        </table>
        </div>
    </div>
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

const ConnectRorTable = connect(
    mapStateToProps,
    mapDispatchToProps
)(RorTable)

export default ConnectRorTable;
