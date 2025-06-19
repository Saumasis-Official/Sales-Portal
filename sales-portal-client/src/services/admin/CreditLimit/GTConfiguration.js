import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { hasEditPermission, pages, features, hasViewPermission } from '../../../persona/distributorNav';
import { Select, notification, Modal, Form } from 'antd';
import '../Questionnaire/survey.css';
import './CreditLimit.css';
import * as Action from '../actions/adminAction';

const { Option } = Select;

const GTRequestorConfig = (props) => {
     const {
            getSalesApprover,
            add_GT_approvers,
            get_cluster,
            get_GT_approvers,
            get_gt_requestor,
            gt_requestor_details,
            add_gt_requestor,
        } = props;
        const [addForm] = Form.useForm();
        const [isSubmitting, setIsSubmitting] = useState(false);
        const [isReqSubmitting, setIsReqSubmitting] = useState(false);
        const [isGTModalVisible, setIsGTModalVisible] = useState(false);
        const [addRequestorModalVisible, setAddRequestorModalVisible] = useState(false);
        const [GtApproverData, setGtApproverData] = useState([]);
        const [GTClusterData, setGTClusterData] = useState([]);
        const [GTPrimaryApprovers, setGTPrimaryApprovers] = useState([]);
        const [GTSecondaryApprovers, setGTSecondaryApprovers] = useState([]);
        const [GTDraftData, setGTDraftData] = useState([]);
        const [GTEditedData, setGTEditedData] = useState({});
        const [isGTEditing, setIsGTEditing] = useState(false);
        const [gtRequestorData, setGtRequestorData] = useState([]);
        const [requestorEmails, setRequestorEmails] = useState([]);
        const [clusterCodes, setClusterCodes] = useState([]);
        
    
        useEffect(() => {
            const fetchApprovers = async () => {
                try {
                    const response = await getSalesApprover();
                    setGTPrimaryApprovers(response?.data?.GTFirst);
                    setGTSecondaryApprovers(response?.data?.GTSecond);
                } catch (error) {
                    console.error('Error fetching approvers:', error);
                }
            };
            fetchApprovers();
        }, []);
    
        useEffect(() => {
            fetchGTApprovers();
            fetchGTRequestor();
        }, []);
    
    
        const fetchGTApprovers = async () => {
            try {
                const response = await get_GT_approvers();
                if (response) {
                    const approverData = Array.isArray(response) ? response : [response];
    
                    const formattedData = approverData.map((item) => ({
                        id: item.id,
                        clustercode: item.cluster_code,
                        primaryapprover: item.primary_approver,
                        secondaryapprover: item.secondary_approver,
                        cluster_detail: typeof item.cluster_detail === 'string' ? JSON.parse(item.cluster_detail) : item.cluster_detail,
                        updated_by: item.updated_by,
                        updated_on: item.updated_on,
                    }));
    
                    setGtApproverData(formattedData);
                } else {
                    setGtApproverData([]);
                }
            } catch (error) {
                console.error('Error fetching GT approvers:', error);
                notification.error({
                    message: 'Error',
                    description: 'Failed to fetch GT approver data',
                    duration: 2,
                    className: 'notification-red',
                });
                setGtApproverData([]);
            }
        };
    
        const showGTModal = async () => {
            setIsGTModalVisible(true);
            try {
                const response = await get_cluster();
                if (response?.data) {
                    setGTClusterData(response?.data);
                } else {
                    notification.error({
                        message: 'Error',
                        description: 'Failed to fetch cluster data',
                        duration: 2,
                        className: 'notification-red',
                    });
                }
            } catch (error) {
                notification.error({
                    message: 'Error',
                    description: error.message || 'Failed to fetch cluster data',
                    duration: 2,
                    className: 'notification-red',
                });
            }
        };
    
        const handleGTModalCancel = () => {
            addForm.resetFields();
            setIsGTModalVisible(false);
        };
    
        const handleGTModalOk = async () => {
            if (isSubmitting) return; // To Prevent multiple submissions
            try {
                setIsSubmitting(true);
                const values = await addForm.validateFields();
                
                if (!values.cluster || !values.gt_primary || !values.gt_secondary) {
                    throw new Error('Please fill all required fields');
                }
                const selectedCluster = GTClusterData.find((cluster) => cluster.cluster_code === values.cluster);
                if (!selectedCluster) {
                    throw new Error('Selected cluster not found');
                }
                const payload = {
                    cluster: selectedCluster.cluster_code,
                    gt_primary: values.gt_primary,
                    gt_secondary: values.gt_secondary,
                    cluster_detail: JSON.stringify({
                        name: selectedCluster.name,
                        code: selectedCluster.cluster_code,
                        description: selectedCluster.description,
                    }),
                };
                const response = await add_GT_approvers({
                    queryParams: payload,
                });
                if (response?.data) {
                    notification.success({
                        message: 'Success',
                        description: 'GT Configuration added successfully',
                        duration: 2,
                        className: 'notification-green',
                    });
    
                    setIsGTModalVisible(false);
                    addForm.resetFields();
                    fetchGTApprovers();
                } else {
                    notification.error({
                        message: 'Error',
                        description: 'Failed to add GT configuration',
                        duration: 2,
                        className: 'notification-red',
                    });
                }
            } catch (error) {
                notification.error({
                    message: 'Error',
                    description: error.message || 'Some Validation missing for GT Config',
                    duration: 2,
                    className: 'notification-red',
                });
            } finally {
                // setIsLoading(false);
                setIsSubmitting(false);
            }
        };
    
        const handleGTInputChange = (index, field, value, item) => {
            const newGTDraftData = [...GTDraftData];
            newGTDraftData[index] = {
                ...newGTDraftData[index],
                [field]: value,
            };
            setGTDraftData(newGTDraftData);
    
            const clusterDetail = typeof item.cluster_detail === 'string' ? JSON.parse(item.cluster_detail) : item.cluster_detail;
    
            setGTEditedData((prev) => ({
                ...prev,
                [clusterDetail.code]: {
                    ...(prev[clusterDetail.code] || {}),
                    [field]: value,
                },
            }));
        };
    
        const handleGTEdit = () => {
            try {
                const initializedGTData = GtApproverData.map((item) => {
                    const clusterDetail = typeof item.cluster_detail === 'string' ? JSON.parse(item.cluster_detail) : item.cluster_detail;
    
                    return {
                        ...item,
                        cluster_detail: clusterDetail,
                        primaryapprover: item.primaryapprover || '',
                        secondaryapprover: item.secondaryapprover || '',
                    };
                });
                setGTDraftData(initializedGTData);
                setIsGTEditing(true);
            } catch (error) {
                console.error('Error in handleGTEdit:', error);
                notification.error({
                    message: 'Error',
                    description: 'Failed to initialize edit mode',
                    duration: 2,
                    className: 'notification-red',
                });
            }
        };
    
        const handleGTCancel = () => {
            setGTDraftData([]);
            setGTEditedData({});
            setIsGTEditing(false);
        };
    
        const handleGTSave = async () => {
            try {
                const apiPayload = Object.entries(GTEditedData).map(([code, changes]) => {
                    const currentItem = GtApproverData.find((item) => {
                        const detail = typeof item.cluster_detail === 'string' ? JSON.parse(item.cluster_detail) : item.cluster_detail;
                        return detail.code === code;
                    });
                    return {
                        clustercode: code,
                        primaryapprover: changes.primaryapprover || currentItem.primaryapprover,
                        secondaryapprover: changes.secondaryapprover || currentItem.secondaryapprover,
                        cluster_detail: currentItem.cluster_detail,
                    };
                });
                if (apiPayload.length === 0) {
                    throw new Error('No changes to save');
                }
    
                const response = await add_GT_approvers({
                    queryParams: apiPayload,
                });
                if (response?.data) {
                    notification.success({
                        message: 'Success',
                        description: 'GT Approver details updated successfully',
                        duration: 2,
                        className: 'notification-green',
                    });
                    await fetchGTApprovers(); // Refresh the data
                } else {
                    throw new Error('Failed to update GT approvers');
                }
            } catch (error) {
                notification.error({
                    message: 'Error',
                    description: error.message || 'Failed to save changes',
                    duration: 2,
                    className: 'notification-red',
                });
            } finally {
                setGTDraftData([]);
                setGTEditedData({});
                setIsGTEditing(false);
            }
        };

        // Requestor Config
        const fetchGTRequestor = async () => {
            try {
                const response = await get_gt_requestor();
                if (response) {
                    const requestorData = response?.data;
                    setGtRequestorData(requestorData);
                } else {
                    setGtRequestorData([]);
                }
            } catch (error) {
                console.error('Error fetching GT requestor:', error);
                notification.error({
                    message: 'Error',
                    description: 'Failed to fetch GT requestor data',
                    duration: 2,
                    className: 'notification-red',
                });
                setGtRequestorData([]);
            }
        };

        const showGTRequestorModal = async () => {
           setAddRequestorModalVisible(true);
            try {
                const response = await gt_requestor_details()  
                if (response?.data) { 
                    setClusterCodes(response.data.clusters);
                    const formattedEmails = response?.data?.emails.map(({ email }) => ({
                        emails: email
                    }));
                    setRequestorEmails(formattedEmails);
                
                } else {
                    notification.error({
                        message: 'Error',
                        description: 'Failed to fetch cluster data',
                        duration: 2,
                        className: 'notification-red',
                    });
                }
            } catch (error) {
                notification.error({
                    message: 'Error',
                    description: error.message || 'Failed to fetch cluster data',
                    duration: 2,
                    className: 'notification-red',
                });
            }
        };
        const handleGTRequestorModalCancel = () => {
            addForm.resetFields();
            setAddRequestorModalVisible(false);
        };
        const handleGTRequestorModalOk = async () => {
            if (isReqSubmitting) return; 
            try {
                setIsReqSubmitting(true);
                const values = await addForm.validateFields();
                
                if (!values.cluster || !values.email) {
                    throw new Error('Please fill all required fields');
                }
               
                const selectedCluster = clusterCodes.find((cluster) => cluster.cluster_code === values.cluster);
               
                if (!selectedCluster) {
                    throw new Error('Selected cluster not found');
                }
                // Check if combination already exists
                const combinationExists = gtRequestorData.some(item =>

                    item.cluster_code.includes(selectedCluster.cluster_code) &&
                    item.email === values.email
                );

                if (combinationExists) {
                    throw new Error('This cluster and email combination already exists');
                }

                const payload = {
                    cluster: [selectedCluster.cluster_code],
                    email: values.email,
                };
                const response = await add_gt_requestor({
                    queryParams: payload,
                });
                if (response?.data) {
                    notification.success({
                        message: 'Success',
                        description: 'GT Requestor Configuration added successfully',
                        duration: 2,
                        className: 'notification-green',
                    });
    
                    setAddRequestorModalVisible(false);
                    addForm.resetFields();
                    fetchGTRequestor();
                } else {
                    notification.error({
                        message: 'Error',
                        description: 'Failed to add GT requestor configuration',
                        duration: 2,
                        className: 'notification-red',
                    });
                }
            } catch (error) {
                notification.error({
                    message: 'Error',
                    description: error.message || 'Some Validation missing for GT Requestor Config',
                    duration: 2,
                    className: 'notification-red',
                });
            } finally {
                setIsReqSubmitting(false);
            }
        };


    return (
        <div>
        {/* GT Config */}
        <>
            {hasViewPermission(pages.CREDIT_LIMIT, features.VIEW_GT_CONFIG) && (
                <h2 className="card-row-col mt-ecom-settings" style={{ marginBottom: '-30px', marginTop: '30px' }}>
                    GT APPROVER CONFIGURATION
                </h2>
            )}
            {hasEditPermission(pages.CREDIT_LIMIT, features.EDIT_GT_CONFIG) && (
                <div className="button-container">
                    {!isGTEditing && (
                        <>
                            <button className="cl-edit-button" onClick={handleGTEdit}>
                                Edit
                            </button>
                            <button className="cl-add-button" onClick={showGTModal}>
                                Add
                            </button>
                        </>
                    )}
                    {isGTEditing && (
                        <>
                            <button className="cl-cancel-button" onClick={handleGTCancel}>
                                Cancel
                            </button>
                            <button className="cl-save-button" onClick={handleGTSave}>
                                Save
                            </button>
                        </>
                    )}
                </div>
            )}
        </>

        {hasViewPermission(pages.CREDIT_LIMIT, features.VIEW_GT_CONFIG) && (
            <div className="admin-dashboard-table ">
                <br />
                <table>
                    <thead>
                        <tr>
                            <th className="sub-head">Serial No.</th>
                            <th className="sub-head">Cluster Code</th>
                            <th className="sub-head">Cluster Head (1st Approver)</th>
                            <th className="sub-head">General Trade Finance (2nd Approver)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(() => {
                            const dataToShow = isGTEditing ? GTDraftData : GtApproverData;

                            if (!Array.isArray(dataToShow) || dataToShow.length === 0) {
                                return (
                                    <tr>
                                        <td colSpan="5" className="sub-head" style={{ textAlign: 'center' }}>
                                            No data available
                                        </td>
                                    </tr>
                                );
                            }

                            return dataToShow.map((item, index) => {
                                return (
                                    <tr key={index}>
                                        <td className="sub-head">{index + 1}</td>
                                        <td className="sub-head">{item.clustercode}</td>
                                         <td className="sub-head">
                                            {isGTEditing ? (
                                                <Select
                                                    style={{ width: '200px' }}
                                                    showSearch
                                                    value={item.primaryapprover}
                                                    placeholder="Select primary approver"
                                                    optionFilterProp="children"
                                                    filterOption={(input, option) => option?.children?.toLowerCase().includes(input.toLowerCase())}
                                                    onChange={(value) => handleGTInputChange(index, 'primaryapprover', value, item)}>
                                                    {GTPrimaryApprovers?.map((approver) => (
                                                        <Option key={approver.email} value={approver.email}>
                                                            {approver.email}
                                                        </Option>
                                                    ))}
                                                </Select>
                                            ) : (
                                                item.primaryapprover || '-'
                                            )}
                                        </td>
                                        <td className="sub-head">
                                            {isGTEditing ? (
                                                <Select
                                                    style={{ width: '200px' }}
                                                    showSearch
                                                    value={item.secondaryapprover}
                                                    placeholder="Select secondary approver"
                                                    optionFilterProp="children"
                                                    filterOption={(input, option) => option?.children?.toLowerCase().includes(input.toLowerCase())}
                                                    onChange={(value) => handleGTInputChange(index, 'secondaryapprover', value, item)}>
                                                    {GTSecondaryApprovers?.map((approver) => (
                                                        <Option key={approver.email} value={approver.email}>
                                                            {approver.email}
                                                        </Option>
                                                    ))}
                                                </Select>
                                            ) : (
                                                item.secondaryapprover || '-'
                                            )}
                                        </td>
                                    </tr>
                                );
                            });
                        })()}
                    </tbody>
                </table>
            </div>
        )}

        <Modal
            title="Add New Approver"
            visible={isGTModalVisible}
            onOk={handleGTModalOk}
            onCancel={handleGTModalCancel}
            afterClose={() => {
                addForm.resetFields();
                setIsSubmitting(false);
            }}
            width={800}
            confirmLoading={isSubmitting}
            okButtonProps={{ disabled: isSubmitting }}>
            <Form form={addForm} layout="vertical">
                <Form.Item name="cluster" label="Cluster Code" rules={[{ required: true, message: 'Please select cluster!' }]}>
                    <Select placeholder="Select cluster" showSearch>
                        {GTClusterData?.map((c) => (
                            <Option key={c.cluster_code} value={c.cluster_code}>
                                {c.cluster_code}
                            </Option>
                        )) || []}
                    </Select>
                </Form.Item>
                <Form.Item name="gt_primary" label="Cluster Head (1st Approver)" rules={[{ required: true, message: 'Please select email!' }]}>
                    <Select placeholder="Select Email as 1st Approver" showSearch>
                        {GTPrimaryApprovers.map((approver) => (
                            <Option key={approver.email} value={approver.email}>
                                {approver.email}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item name="gt_secondary" label="General Trade Finance (2nd Approver)" rules={[{ required: true, message: 'Please select email!' }]}>
                    <Select placeholder="Select Email as 2nd Approver" showSearch>
                        {GTSecondaryApprovers.map((approver) => (
                            <Option key={approver.email} value={approver.email}>
                                {approver.email}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
            </Form>
        </Modal>

        {/* GT REQUESTOR CONFIG */}
        <>
            {hasViewPermission(pages.CREDIT_LIMIT, features.VIEW_GT_CONFIG) && (
                <h2 className="card-row-col mt-ecom-settings" style={{ marginBottom: '-30px', marginTop: '30px' }}>
                    GT REQUESTOR CONFIGURATION
                </h2>
            )}
            {hasEditPermission(pages.CREDIT_LIMIT, features.EDIT_GT_CONFIG) && (
                <div className="button-container">
                    { (
                        <><button className="cl-add-button" onClick={showGTRequestorModal}>
                                Add
                            </button>
                        </>
                    )}
                </div>
            )}
        </>
        {hasViewPermission(pages.CREDIT_LIMIT, features.VIEW_GT_CONFIG) && (
            <div className="admin-dashboard-table ">
                <br />
                <table>
                    <thead>
                        <tr>
                            <th className="sub-head">Serial No.</th>
                            <th className="sub-head">Cluster Code </th>
                            <th className="sub-head">User Name</th>
                            <th className="sub-head">Email</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(() => {
                            const dataToShow = gtRequestorData ;    //isGTEditing ? GTDraftData : GtApproverData;

                            if (!Array.isArray(dataToShow) || dataToShow.length === 0) {
                                return (
                                    <tr>
                                        <td colSpan="5" className="sub-head" style={{ textAlign: 'center' }}>
                                            No data available
                                        </td>
                                    </tr>
                                );
                            }

                            return dataToShow.map((item, index) => {
                                return (
                                    <tr key={index}>
                                        <td className="sub-head">{index + 1}</td>
                                        <td className="sub-head">{item.cluster_code || '-'}</td>
                                        <td className="sub-head">{item.full_name || '-'}</td>
                                        <td className="sub-head">{item.email || '-'}</td>
                                    </tr>
                                );
                            });
                        })()}
                    </tbody>
                </table>
            </div>
        )}

        <Modal
            title="Add New Requestor"
            visible={addRequestorModalVisible}
             onOk={handleGTRequestorModalOk}
             onCancel={handleGTRequestorModalCancel}
            afterClose={() => {
                addForm.resetFields();
                setIsReqSubmitting(false);
            }}
            width={800}
            confirmLoading={isReqSubmitting}
            okButtonProps={{ disabled: isReqSubmitting }}>
            <Form form={addForm} layout="vertical">
                <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Please select email!' }]}>
                    <Select placeholder="Select Email" showSearch>
                        {requestorEmails?.map((re) => (
                            <Option key={re.emails} value={re.emails}>
                                {re.emails} 
                            </Option>
                        )) || []}
                    </Select>
                </Form.Item>
                <Form.Item name="cluster" label="Cluster Code" rules={[{ required: true, message: 'Please select cluster!' }]}>
                    <Select placeholder="Select cluster code " showSearch>
                    {clusterCodes?.map((cluster) => (
                            <Option key={cluster.cluster_code} value={cluster.cluster_code}>
                                {cluster.cluster_code} 
                            </Option>
                        )) || []}
                    </Select>
                </Form.Item>

              
            </Form>
        </Modal>    
    </div>
    );
};

const mapStateToProps = () => {
    return {};
};
const mapDispatchToProps = (dispatch) => {
    return {
        getSalesApprover: () => dispatch(Action.salesApprover()),
        add_GT_approvers: (data) => dispatch(Action.add_GT_approvers(data)),
        get_cluster: () => dispatch(Action.get_cluster()),
        get_GT_approvers: () => dispatch(Action.get_GT_approvers()),
        get_gt_requestor: () => dispatch(Action.get_gt_requestor()),
        gt_requestor_details: () => dispatch(Action.gt_requestor_details()),
        add_gt_requestor: (data) => dispatch(Action.add_gt_requestor(data)),
    };
};
export default connect(mapStateToProps, mapDispatchToProps)(GTRequestorConfig);