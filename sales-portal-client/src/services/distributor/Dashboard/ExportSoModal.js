import React from 'react';
import { connect } from 'react-redux';
import { Modal } from 'antd';
import ExportSoIntoExcel from './ExportSoIntoExcel';
let ExportSoModalList = (props) => {
    const { visible, onCancel, soData } = props
    return (
        <>
            <Modal
                title='Download SO List'
                visible={visible}
                onCancel={onCancel}
                footer={null}
                wrapClassName="export-list-modal"
            >
                <p>Your file is ready for download. please click on the below button to download. </p>
                <ExportSoIntoExcel soData={soData} onCancel={onCancel} />
            </Modal>
        </>
    );
};

const mapStateToProps = (state, ownProps) => {
    return {};
};
const mapDispatchToProps = (dispatch, ownProps) => {
    return {};
};

const ExportSoModal = connect(
    mapStateToProps,
    mapDispatchToProps,
)(ExportSoModalList);

export default ExportSoModal;
