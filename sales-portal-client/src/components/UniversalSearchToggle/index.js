import React, { useState, useEffect } from 'react';
import { Switch } from 'antd';
// import CustomModal from '../CustomModal';

let UniversalSearchToggle = props => {

    const { toggleText, profile } = props;
    const [allowToggle, setAllowToggle] = useState(false);
    const [disabledToggleReason, setDisabledToggleReason] = useState('');
    // const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (profile && Object.keys(profile).length > 0) {
            if (!profile.channel_code || !profile.area_code) {
                setAllowToggle(false);
                if (!profile.channel_code && !profile.area_code) {
                    setDisabledToggleReason('Toggle is disabled as area and channel details are missing');
                } else if (!profile.channel_code) {
                    setDisabledToggleReason('Toggle is disabled as channel detail is missing');
                } else if (!profile.area_code) {
                    setDisabledToggleReason('Toggle is disabled as area detail is missing');
                }
            } else {
                setAllowToggle(true);
                setDisabledToggleReason('');
            }
        }
    }, [profile]);

    /*const onToggleChange = (status = null) => {
        if (status === null) {
            if (toggleText === true) setShowModal(true);
            else props.onChange();
            props.onEmptyCart(false);
        } else if (status === true) {
            props.onChange();
            props.onEmptyCart(true);
            setShowModal(false);
        } else if (status === false) {
            setShowModal(false);
            props.onEmptyCart(false);
        }
    }*/

    return (
        <>
            {/* <CustomModal open={showModal} modalTitle={'Warning'} modalText={'On clicking yes, your form data will be lost. Do you want to proceed?'} proceedButtonName={'Yes'} cancelButtonName={'No'} closeModal={(status) => onToggleChange(status)} /> */}
            <div className='purchase-order-toggle'>
                <div><h3>Order All Products
                {allowToggle ?
                    <Switch aria-label="Toggle" onChange={() => props.onChange()} checked={toggleText} style={{marginLeft: "10px"}}/> :
                    <Switch aria-label="Toggle disabled" checked disabled />
                }
                <span>({toggleText ? 'Showing all products' : 'Showing products applicable to you'})</span></h3></div>
                <p className='toggle-error' style={{ color: 'red' }}>{disabledToggleReason}</p>
                {/* <p className='toggle-info'><span style={{ color: '#1890ff' }}><InfoCircleOutlined /></span> On switching from all products to applicable products, form data will be cleared.</p> */}
            </div>

        </>
    );
};

export default UniversalSearchToggle;