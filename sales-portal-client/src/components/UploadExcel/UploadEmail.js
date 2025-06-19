import React, { useEffect, useState } from 'react'
import { Alert, Modal } from 'antd';
import { CloudUploadOutlined } from '@ant-design/icons'
import { connect } from 'react-redux';
import * as AdminActions from '../../services/admin/actions/adminAction';

function UploadEmail(props) {
    const { setJsonData, sendData, setIsModalOpen, isModalOpen, setUploadedFile, uploadedFile, resetUploadedFile, informationMessage = null } = props
    const [fileName, setFileName] = useState('');

    useEffect(() => {
        setFileName(uploadedFile?.name)
    }, [uploadedFile]);

    useEffect(() => {
    }, [informationMessage]);

    function closeModal() {
        setFileName('')
        resetUploadedFile()
        setIsModalOpen(false)
    }

    const onChange = (e) => {
    }

    const handleOk = () => {
        setFileName('');
        sendData();
    }

    return (
        <React.Fragment>
            <Modal title="Upload File" visible={isModalOpen} onOk={handleOk} onCancel={closeModal} className="excel-upload-modal" >
                <div className='Upload-div forecast-upload-modal'>
                    <label htmlFor="fileInput">
                        <CloudUploadOutlined className='mdm-upload-icon' style={{ content: 'sasd', opacity: '50%' }} />
                    </label>
                    <input id="fileInput" type="file" accept='.xlsx' onChange={onChange} />
                    <p>{fileName}</p>
                </div>
                <br />
                <Alert
                    message={
                        <span style={{ paddingLeft: "30px" }}>
                            <b>Informational Notes</b>
                        </span>}
                    description={
                        <ul style={{ paddingLeft: "20px" }}>
                        </ul>
                    }
                    type="info"
                    showIcon
                />
            </Modal>
        </React.Fragment>
    )
}

const mapStateToProps = (state) => {
    return {

    }
};

const mapDispatchToProps = dispatch => {
    return {
    }
};

export default connect(mapStateToProps, mapDispatchToProps)(UploadEmail);
