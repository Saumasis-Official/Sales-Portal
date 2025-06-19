import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { GiftOutlined } from '@ant-design/icons';
import { Modal } from 'antd';
import './MaterialBreakdown.css';
import * as Actions from '../../admin/actions/adminAction';



let MaterialBreakdown = props => {
    const { getMaintenanceRequests } = props
    useEffect(() => {
        getMaintenanceRequests();
    })

    return (
        <>
            {props.windowSize > 767 ?
                <div className="new-material-list-table" id={props.id}>
                    <table>
                        <tbody>
                            <tr>
                                <td><div className='offer-material-name'>{props.promoName}</div></td>
                                <td>{props.promoCode}</td>
                                <td>{props.promoQuantity}</td>
                                <td>{props.promoUnits}</td>
                                {/* <td>{props.code}</td> */}
                                <td>{props.type === 'promo' &&
                                    <GiftOutlined />}</td>
                            </tr>
                        </tbody>
                    </table>
                </div> :
                <Modal title="Promo Items" footer={null} visible={props.visible} onCancel={props.onCancel}>
                    <ul className='promo-items-modal'>
                        <li><b>Promo Name</b>{props.promoName}</li>
                        <li><b>Promo Code</b>{props.promoCode}</li>
                        <li><b>Promo Quantity</b>{props.promoQuantity}</li>
                        <li><b>Promo Units</b>{props.promoUnits}</li>
                        {props.type === 'promo' && <li>
                            <b>Promo Type</b><GiftOutlined /></li>}
                    </ul>
                </Modal>}
        </>
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

const MaterialDropdownList = connect(
    mapStateToProps,
    mapDispatchToProps
)(MaterialBreakdown)

export default MaterialDropdownList;
