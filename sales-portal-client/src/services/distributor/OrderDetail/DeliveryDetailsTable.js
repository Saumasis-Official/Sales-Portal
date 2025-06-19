import React, { useState, Fragment } from 'react';
import { connect } from 'react-redux';
import './OrderDetailsTable.css';
import { InfoCircleFilled, QuestionOutlined } from '@ant-design/icons';
import { Tooltip, Popover, Modal, Select, notification } from 'antd';
import * as Action from '../action'
import { useEffect } from 'react';
import * as Actions from '../actions/serviceDeliveryAction';
import * as MaintenanceActions from '../../admin/actions/adminAction';
import { sd_request } from '../../../config/constant';
import appLevelConfig from '../../../config';
import Loader from '../../../components/Loader';
import LocalAuth from '../../../util/middleware/auth'
const appConfig = appLevelConfig.app_level_configuration;

let DeliveryDetailsTable = props => {
    const { fetchServiceLevelCategory, addSDR, getCfaData, addSDRAdmin, getMaintenanceRequests, getCfaDataAdmin, app_level_configuration,sendRORValue,
        headerData, distributorId, so_number, delivery_no, rorData, po_number
    } = props
    const browserHistory = props.history;
    const [inputApprovedVal, setInputApprovedVal] = useState('')
    const { Option } = Select;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [SDRequestsFeaturesFlag, setSDRequestsFeaturesFlag] = useState(true);
    const [allCFADetails, setAllCFADetails] = useState();
    var adminRole = LocalAuth.getAdminRole();
    const showModal = (i) => {
        const item = tableItems[i];
        const cfa = allCFADetails?.find(cfa =>
            cfa.depot_code == item.Depot_Code
            && cfa.division == item.Division
            && cfa.distribution_channel == item.Distribution_Channel
            && cfa.sales_org == item.Sales_Org
        )
        setCfaDetails(cfa);
        setIndex(i)
        setIsModalOpen(true);
    };
    useEffect(() => {
        getMaintenanceRequests();
    }, []);

    //Status if "Partially completed then redirect the Hyperlink to ROR Details Tab"
    const handleClick = () => {
         sendRORValue('ror_details');
    }


    useEffect(() => {
        if (app_level_configuration && app_level_configuration.length) {
            for (let config of app_level_configuration) {
                if (!config) continue;
                if (
                    config.key === appConfig.service_delivery_requests.key &&
                    config.value === appConfig.service_delivery_requests.disable_value
                ) {
                    setSDRequestsFeaturesFlag(false);
                }
            }
        }
    }, [app_level_configuration]);


    const handleCancel = () => {
        setInputApprovedVal("")
        setSelectValue()
        setSubmitControl(true)
        setIsModalOpen(false);
        setIsSuccessModalOpen(false);
    };
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [sdNumber, setSdNumber] = useState('failed to generate')
    const [submitControl, setSubmitControl] = useState(true)
    const showSuccessModal = async () => {
        let res;
        if (cfaDetails.contact_person == undefined) {
            notification.error({
                message: 'CFA error',
                description: 'No  CFA available for this SD_Request',
                duration: 5,
                className: 'notification-error',
            });
            setIsModalOpen(false);
        }
        else {
            if (props.role == false) {
                res = await addSDR({
                    distributor_id: props.distributorCode,
                    so_number: props.so_number,
                    req_reason_id: selectValue,
                    sd_req_comments: inputApprovedVal,
                    material_code: tableItems[index].code,
                    material_description: tableItems[index].material,
                    plant_code: tableItems[index].Depot_Code
                    , cfa_name: cfaDetails.contact_person
                    , cfa_email: cfaDetails.email,
                    cfa_contact: cfaDetails.contact_number
                })

            } else {
                res = await addSDRAdmin({
                    distributor_id: props.distributorCode,
                    req_reason_id: selectValue,
                    so_number: props.so_number,
                    sd_req_comments: inputApprovedVal,
                    material_code: tableItems[index].code,
                    material_description: tableItems[index].material,
                    plant_code:  tableItems[index].Depot_Code
                    , cfa_name: cfaDetails.contact_person
                    , cfa_email: cfaDetails.email,
                    cfa_contact: cfaDetails.contact_number
                }
                )

            }
            if (res) {
                setSdNumber(res.data.sd_number)
            }
            setIsSuccessModalOpen(true);
            setIsModalOpen(false);
        }

    }
    const content = (
        <div>
            <div>1 Kg = 0.001 Tons</div>
            <div>1 Ltr = 0.0001 Tons</div>
        </div>
    );
    const [selectValue, setSelectValue] = useState()
    const [cfaDetails, setCfaDetails] = useState([{}])
    const [serviceRequestCategory, setServiceRequestCategory] = useState([{}])
    const [index, setIndex] = useState(0);
    useEffect(async () => {
        let cfa_data;
        const response = await fetchServiceLevelCategory(sd_request)

        if (response && response.data && response.data.data) {
            if (response.data.data.length > 0) {
                setServiceRequestCategory(response.data.data)
            }
        }
        if (!(props.role == null) && props.role == false) {
            cfa_data = await getCfaData()
        } else if (props.role == true) {
            cfa_data = await getCfaDataAdmin()
        }
        if (cfa_data && props.salesDetails) {
            if (cfa_data.data.rows.length > 0) {
                setAllCFADetails(cfa_data.data.rows);
            }
        }
    }, [])


    const { tableItems, type } = props;
    return (
        <div>
            <div className="sales-order-table purchase-order-table">
                <Loader>
                    <table>
                        <thead className="sales-orders-th">
                            <tr>
                                <th className="material-header" style={{ width: '25%' }}>Material</th>
                                <th className="material-header-code" style={{ width: '18%' }}>Material Code</th>
                                {(po_number?.includes("AOS") || po_number?.includes("AOR")) &&
                                    <th className="quantity-header" style={{ width: '10%' }}>Suggested Quantity</th>
                                }
                                <th style={{ width: '10%' }}>Confirmed Quantity</th>

                                {(type && type == 'delivery') && <th>Batch Number</th>}
                                <th style={{ width: '10%' }}>Sales Unit</th>
                                {props.visible == false ? <th style={{ width: '15%' }} className='width15'>Quantity in Tonnage
                                    <Popover content={content} placement="bottom" className="th-info-icon">
                                        <InfoCircleFilled />
                                    </Popover>
                                </th> : <th style={{ width: '15%' }} >Quantity in Tonnage
                                    <Popover content={content} placement="bottom" className="th-info-icon">
                                        <InfoCircleFilled />
                                    </Popover>
                                </th>}
                                {(type && type !== 'so_details') && <th>Pack Type</th>}
                                {(type && type === 'invoice') && <th>Amount ( <span style={{color:"white",fontSize:"large"}}>&#8377;</span> )</th>}

                                {(type && type === 'so_details') && <th style={{ width: '10%' }}>Net Value  ( <span style={{color:"white",fontSize:"large"}}>&#8377;</span> )</th>}
                                {(type && (type === 'so_details' || type === 'delivery')) && <th style={{ width: '10%' }}>Status</th>}
                                {props.visible && SDRequestsFeaturesFlag &&
                                    <th style={{ width: '5%' }}>Action</th>
                                }
                            </tr>
                        </thead>
                        <tbody>

                            {tableItems && tableItems.length > 0 && tableItems.map((input, i) => {
                                return (
                                    <Fragment key={`items-list-${i}`}>
                                        <tr>
                                            <td className="material-desc-row">{input.material}</td>
                                            <td>{input.code}</td>
                                            {(po_number?.includes("AOS") || po_number?.includes("AOR")) &&
                                                <td>{input.original_suggested_quantity || 0}</td>
                                            }
                                            <td className="quantity-row">{parseFloat(input.quantity)}</td>

                                            {(type && type == 'delivery') && <td>{input.batch !== "" ? input.batch : '-'}</td>}
                                            <td>{input.sales_unit !== "" ? input.sales_unit : '-'}</td>
                                            <td>{input.Quantity_ton === undefined ? '-' : parseFloat(input.Quantity_ton?.split(' TO')).toFixed(2)}</td>
                                            {(type && type !== 'so_details') && <td>{input.pack_type !== "" ? input.pack_type : '-'}</td>}
                                            {(type && type === 'invoice') && <td>{input.tentative !== "" ? input.tentative : '-'}</td>}
                                            {(type && type === 'so_details') && <td>{input.net_value ? input.net_value : '-'}</td>}

                                            {(type && (type === 'so_details' || type === 'delivery')) && 
                                            <td>
                                                {rorData && rorData.length>0 ?
                                                    <a onClick={() => handleClick()}>{input.status ? input.status : ''}</a>
                                                    : input.status ? input.status : ''
                                                }   
                                            </td>} 
                                            {props.visible && SDRequestsFeaturesFlag && <td className='admin-ations'>
                                                <div className='action-btns'>
                                                    <button className="info-icon border-0 bg-transparent"
                                                        onClick={() => { showModal(i) }}>
                                                        <Tooltip placement="bottom"
                                                            title="Connect with service delivery" ><QuestionOutlined /></Tooltip>
                                                    </button>
                                                </div>
                                            </td>}
                                        </tr>

                                    </Fragment>
                                );
                            })}

                        </tbody>
                    </table>
                </Loader>
            </div>
            <Modal title="Connect with service delivery" style={{ top: 20 }}
                visible={!!isModalOpen}
                onCancel={handleCancel} footer={null}
                wrapClassName='comment-modal'>
                <form>
                    <div className="basic-details">
                        <div className="form-wrapper">
                            <label>Distributor Name :</label>
                            <label>{props.distributorName} ({props.distributorCode})</label>
                        </div>
                        <div className="form-wrapper">
                            <label>SO Number :</label>
                            <label>{props.so_number}</label>
                        </div>

                        <div className="form-wrapper">
                            <label>Material :</label>
                            {tableItems.length > 0 ? <label>{tableItems[index].material}</label> : <label>-</label>}

                        </div>
                        <div className="form-wrapper">
                            <label>Plant Code :</label>
                            {tableItems.length > 0? <label>{tableItems[index].Depot_Code} </label> : <label>-</label>}
                       
                          </div>

                        {cfaDetails?.email != undefined && <> <div className="form-wrapper" >
                            <label>CFA Email ID :</label>
                            <label id="cfa_email">{cfaDetails.email} </label>
                        </div>
                            <div className="form-wrapper" >
                                <label>CFA Contact Person :</label>
                                <label id="cfa_name">{cfaDetails.contact_person} </label>
                            </div>
                            <div className="form-wrapper mb-0" >
                                <label>CFA Contact No. :</label>
                                <label id="cfa_contact_number">{cfaDetails.contact_number} </label>
                            </div></>}
                    </div>
                    <div className="comment-fld">
                        <label>Please Select Reason</label>
                        <div>

                            <Select placeholder="Select reason" value={selectValue} id='reasonselector' onChange={((e) => {
                                setSelectValue(e)
                                setSubmitControl(false)
                            })}>
                                {serviceRequestCategory.map((service_category, keyvalue) => {
                                    return (<Option value={service_category.id} key={keyvalue} >{service_category.label}</Option>)
                                })}
                            </Select>
                        </div>
                    </div>
                    <br />
                    <div className="comment-fld">
                        <label>Comments</label>
                        <div>
                            <textarea
                                id="comment"
                                name="comment"
                                value={inputApprovedVal}
                                onChange={e => setInputApprovedVal(e.target.value)}
                                placeholder="Enter comments here"
                                maxLength={255}
                            />
                        </div>
                    </div>
                    <div className="comment-btn">
                        <button type="button" className="sbmt-btn" disabled={adminRole.includes('SUPER_ADMIN') || adminRole.includes('SUPPORT') || !inputApprovedVal || submitControl} onClick={showSuccessModal}>
                            Submit
                        </button>
                    </div>
                </form>
            </Modal>
            <Modal title="Submitted successfully"
                visible={!!isSuccessModalOpen}
                onCancel={handleCancel} footer={null}
                wrapClassName='comment-modal'>

                <div className="basic-details">

                    <h4> <span style={{ color: 'green' }}>{sdNumber}</span> has been successfully submitted.</h4>
                    <label>Request Summary</label>
                    <div className="alert-success-info">
                        <div className="form-wrapper">
                            <label>Material :</label>
                            {tableItems.length > 0 ? <label>{tableItems[index].material}</label> : <label>-</label>}
                        </div>
                        <div className="form-wrapper">
                            <label>SO Number :</label>
                            <span>{props.so_number}</span>
                        </div>
                        <div className="form-wrapper">
                            <label>Distributor Name :</label>
                            <span>{props.distributorName} ({props.distributorCode})</span>
                        </div>
                        <div className="form-wrapper mb-0">
                            <label>Service Delivery Number :</label>
                            <span>{sdNumber}</span>
                        </div>
                    </div>
                    <div className="comment-btn">
                        <button type="button" className="sbmt-btn" onClick={handleCancel}>
                            Close
                        </button>
                    </div>
                </div>

            </Modal>
        </div>
    )

}
const mapStateToProps = (state, ownProps) => {
    return {
        app_level_configuration: state.auth.get('app_level_configuration',)
    }
}
const mapDispatchToProps = (dispatch, ownProps) => {
    return {
        getCfaDataAdmin: () =>
            dispatch(Action.getCfaDataAdmin()),
        getCfaData: () =>
            dispatch(Action.getCfaData()),
        addSDRAdmin: (data) =>
            dispatch(Actions.addSDRAdmin(data)),
        addSDR: (data) =>
            dispatch(Actions.addSDR(data)),
        fetchServiceLevelCategory: (data) =>
            dispatch(Action.fetchServiceLevelCategory(data)),
        getMaintenanceRequests: () =>
            dispatch(MaintenanceActions.getMaintenanceRequests()),
    }
}

const ConnectDeliveryDetailsTable = connect(
    mapStateToProps,
    mapDispatchToProps
)(DeliveryDetailsTable)

export default ConnectDeliveryDetailsTable;
