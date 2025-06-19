import React, { useEffect } from 'react';
import { WarningOutlined } from '@ant-design/icons';

export default function CustomModal(props) {
    const { open, modalTitle, modalText, proceedButtonName, cancelButtonName } = props;

    const openModal = () => {
        let modal = document.getElementById("customModal");
        if (modal) modal.style.display = "block";
    }

    const closeModal = (status) => {
        let modal = document.getElementById("customModal");
        if (modal) {
            modal.style.display = "none";
            props.closeModal(status);
        }
    };

    useEffect(() => {
        if (open) openModal();
    }, [open]);

    return (
        <div id="customModal" className="modal">
            <div className="modal-content">
                <span className="close" onClick={() => closeModal(false)}>&times;</span>
                <div className="confirmation-text">
                    {modalTitle === 'Warning' ? <span style={{ color: '#ff8519' }}><WarningOutlined /> {modalTitle}</span> : modalTitle}
                </div>
                <div className="confirmation-message-text">
                    {modalText}
                </div>
                <div className="button-container">
                    <button
                        className="confirmation-button"
                        onClick={() => closeModal(false)}
                    >
                        {cancelButtonName}
                    </button>
                    <button
                        className="confirmation-button proceed-btn"
                        onClick={() => closeModal(true)}
                    >
                        {proceedButtonName}
                    </button>
                </div>
            </div>
        </div>
    );
}
