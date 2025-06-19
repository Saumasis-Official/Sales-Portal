import React from 'react';
import { Modal, Alert, Typography } from 'antd';
import { WarningOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

function AccountMasterErrorModal(props) {
    const { message, data, visible, isMT } = props;
    
    return (
        <Modal
            title={
                <div className='cl-ac-title'>
                    <WarningOutlined style={{ fontSize: '24px', marginRight: '10px' }} />
                    <Title level={4} style={{ margin: 0 }}>{message}</Title>
                </div>
            }
            visible={visible}
            onCancel={props.onCancel}
            footer={null}
            width={600}
            wrapClassName="validation-error-modal"
        >
            
            <Alert
                message='The following errors were found while validating file:'
                description={isMT && (
                    <label>
                        <b className="mandatory-mark">*</b>The Updated Base limit should be a number with up to 10 digits and should not start with zero.
                    </label>
                )}
                type="error"
                style={{ marginBottom: '20px' }}
            />
            
            <div className="validation-errors-container" >
                <ol style={{ paddingLeft: '0px' }}>
                    {data.map((error, index) => (
                        <li key={index}
                            className='cl-am-modal'
                        >
                            <Text type="danger">
                             {error}
                            </Text>
                        </li>
                    ))}
                </ol>
            </div>
        </Modal>
    );
}

export default AccountMasterErrorModal;