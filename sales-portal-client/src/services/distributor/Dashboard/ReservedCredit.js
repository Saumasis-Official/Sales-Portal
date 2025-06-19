import React, { useState } from "react";
import { Modal, Alert } from "antd";
import { features, hasFeaturePermission, pages } from "../../../persona/distributorNav";
import Util from "../../../util/helper";

function ReservedCredit(props) {
    const { visible, onReservedCreditCancel, onReservedCreditSubmit, availableCredit, getRole } = props;
    const [inputValue, setInputValue] = useState(0);
    const [error, setError] = useState(null);
    function handleCreditChange(e) {
        let value = e.target.value;
        value = Math.round(value)
        value = Util.removeLeadingZeros(value);
        setInputValue(value);
        if (+value <= 0 || +value > +availableCredit) {
            setError("Reserve credit can not be more than available credit or 0");
        } else {
            setError(null);
        }
    }

    function handleCancel() {
        setInputValue(null)
        onReservedCreditCancel();
    }

    function handleOk() {
        onReservedCreditSubmit(inputValue);
    }
    return (
        <Modal
            visible={visible}
            onCancel={handleCancel}
            onOk={handleOk}
            okText="Submit"
            title="Reserve Credit"
            okButtonProps={{
                disabled: !(hasFeaturePermission(pages.DASHBOARD, features.EDIT_RESERVED_CREDIT) && inputValue) || error,
            }}
        >
            <div>
                Please reserve credit for Capital Foods. The entered amount should be less than the available credit
                {availableCredit && <span><b> (₹ {availableCredit})</b></span>}.
            </div>
            <br />
            <div>
                <label htmlFor="credit-inp" className="credit-inp-label">Reserve Amount (₹) </label>
                <input
                    id="credit-inp"
                    className="credit-inp-fld"
                    type="number"
                    onChange={handleCreditChange}
                    value={inputValue}
                    autoFocus
                />
                {error && <div className="error-message">{error}</div>}
            </div>
            <br />
            <Alert
                message={
                    <span style={{ paddingLeft: "30px" }}>
                        <b>Informational Notes</b>
                    </span>}
                description={
                    <ul style={{ paddingLeft: "20px" }}>
                        <li><b className='mandatory-mark'>*</b> Credit reserved cannot be greater than the available credit.</li>
                        <li><b className='mandatory-mark'>*</b> It will take 30mins to reflect the credited amount in order portal.</li>
                    </ul>
                }
                type="info"
                showIcon
            />
        </Modal>
    );
}

export default ReservedCredit;