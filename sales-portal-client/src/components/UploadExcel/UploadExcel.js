import React, { useEffect, useState } from 'react';
import { Alert, Modal } from 'antd';
import { connect } from 'react-redux';
import * as AdminActions from '../../services/admin/actions/adminAction';

import './UploadExcel.css';

const mdmUploadInformationMessage = ['Please upload a valid.xlsx file only.', 'Please upload a file in the same format as it was downloaded from the "Download" button.'];

function UploadExcel(props) {
    const { sendData, setIsModalOpen, isModalOpen, setUploadedFile, uploadedFile, resetUploadedFile, informationMessage = null, customSection = null } = props;
    const [fileName, setFileName] = useState('');
    const [info, setInfo] = useState(mdmUploadInformationMessage);

    useEffect(() => {
        setFileName(uploadedFile.name);
    }, [uploadedFile]);

    useEffect(() => {
        if (informationMessage) setInfo(informationMessage);
    }, [informationMessage]);

    function closeModal() {
        setFileName('');
        resetUploadedFile();
        setIsModalOpen(false);
    }

    const onChange = (e) => {
        //read excel and convert it into json as well as saving data into object
        //  Utils.readExcel(e, setJsonData, setFileName)
        const fileUploaded = e.target.files[0];
        setFileName(fileUploaded.name);
        setUploadedFile(fileUploaded);
        e.target.value = null; //to ensure onChange event will be called every time we select a file, even if it is same file.
    };

    const handleOk = () => {
        setFileName('');
        sendData();
    };

    return (
        <React.Fragment>
            <Modal title="Upload File" visible={isModalOpen} onOk={handleOk} onCancel={closeModal} className="excel-upload-modal">
                <div className="Upload-div forecast-upload-modal">
                    <p></p>
                    <label htmlFor="fileInput">
                        <img width="120px" className="forecast-upload-icon" src="/assets/images/cloud-upload.svg" alt="" />
                    </label>
                    <input id="fileInput" type="file" accept=".xlsx" onChange={onChange} />
                    <p>{fileName}</p>
                </div>
                <br />
                {customSection && customSection}
                <Alert
                    message={
                        <span style={{ paddingLeft: '30px' }}>
                            <b>Informational Notes</b>
                        </span>
                    }
                    description={
                        <ul style={{ paddingLeft: '20px' }}>
                            {info.map((item, index) => (
                                <li key={index}>
                                    <b className="mandatory-mark">*</b> {item}
                                </li>
                            ))}
                        </ul>
                    }
                    type="info"
                    showIcon
                />
            </Modal>
        </React.Fragment>
    );
}

const mapStateToProps = (state) => {
    return {
        uploadedFile: state.admin.get('uploaded_file'),
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        setUploadedFile: (data) => dispatch(AdminActions.uploadedFileData(data)),
        resetUploadedFile: () => dispatch(AdminActions.resetUploadFileData()),
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(UploadExcel);
