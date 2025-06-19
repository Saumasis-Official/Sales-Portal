import React, { useState, useEffect } from 'react';
import { Modal, Select, Checkbox, Radio, Space, Row, Col, DatePicker, Alert } from 'antd';
import { connect } from 'react-redux';
import './PdpRequestModal.css'
import { EditTwoTone, CloseCircleFilled } from '@ant-design/icons';
import * as Dist_Action from '../../distributor/action';
import _ from 'lodash';
import dayjs from 'dayjs';
import { allDivisionsArr } from '../../../config/constant';
import { pages, features, hasRaisePermission, hasRespondPermission } from '../../../persona/requests.js';

let PdpRequestModal = (props) => {
    const { getWarehouseDetailsOnDistChannel, dbList, onCancel, visible, onSubmit, getDepoCode } = props
    const [selectedDb, setSelectedDb] = useState('Select a distributor')
    const [sales_details, setSalesDetails] = useState([])
    const [updatedDetails, setUpdatedDetails] = useState([])
    const [previousValue, setPreviousValue] = useState({})
    const [comment, setComment] = useState('')
    const [isSetPDPModalVisible, setIsSetPDPModalVisible] = useState(false);
    const [selectedPdpType, setSelectedPdpType] = useState();
    const [selectedPdpDays, setSelectedPdpDays] = useState([]);
    const [selectedRefDate, setSelectedRefDate] = useState()
    const [selectedRefDateString, setSelectedRefDateString] = useState('00000000')
    const [editingIndex, setEditingIndex] = useState();
    const [plantCodeDeatils, setPlantCodeDetails] = useState()
    const [flag,setFlag]=useState();
    const [nonEditable,SetnonEditable]=useState([]);
    const handleCancel = () => {
        setSalesDetails([])
        setSelectedDb('Select a distributor')
        setUpdatedDetails([])
        setComment('')
        onCancel();
        setFlag([])
    }
    const handleDBCodeChange = async (value, label) => {
        setSelectedDb(value)
        const distributionChannel = 10
        const divisionArr = allDivisionsArr
        const response = await getWarehouseDetailsOnDistChannel(value.split('_')[0], distributionChannel, divisionArr)
        const res = response?.shipping_point?.filter(list => list.partner_code == value.split('_')[0])
        setSalesDetails(_.sortBy(res[0].distribution_details, ['Distribution_channel_Code', 'Division_Code']));
    }
    const handleEdit = async (e, i) => {
        setPreviousValue({
            pdp_day: sales_details[i]['PDP_Day'],
            ref_date: sales_details[i]['Reference_date']
        })
        setIsSetPDPModalVisible(true)
        setEditingIndex(i);
    }

    useEffect(()=>{
        let depot_code = [];
        let divZoneSales =[];
 
    sales_details.forEach(element=>{
    divZoneSales.push({division:element.Division_Code,distributionChannel:element.Distribution_channel_Code
        ,sales_org:element.Sales_Org_Code})
        depot_code.push(element.Plant)

        })
        if (hasRespondPermission(pages.PDP_REQUESTS)) {
            initCallToApi(divZoneSales, [...new Set(depot_code)]);
        }
    }
        , [sales_details])


    const initCallToApi = async (divZoneSales, depot_code) => {

        let response = await getDepoCode({ divZoneSales, depot_code })
        if (response?.status === 200) {
            setPlantCodeDetails(response?.data)
            pdpCheckMapping(response?.data)
        }


    }
    const pdpCheckMapping = (data) => {
        let nonEditable = []
        let flag = []
        sales_details.forEach((item, i) => {
            let datas = data?.find(items => item.Division_Code == items.division && items.depot_code == item.Plant)
            if (datas === undefined) {
                flag.push(item)
                nonEditable.push(false)
            }
            else {
                nonEditable.push(true)
            }
        })
        setFlag(flag)
        SetnonEditable(nonEditable)
    }

    const hideSetPDPModal = () => {
        setSelectedPdpType();
        setSelectedPdpDays([]);
        setSelectedRefDate();
        setSelectedRefDateString('00000000')
        setIsSetPDPModalVisible(false);
        setFlag([])

    }

    const onPdpTypeChange = (e) => {
        setSelectedPdpType(e.target.value);
        setSelectedPdpDays([]);
        setSelectedRefDate();
        setSelectedRefDateString('00000000');
    }

    const onPdpDayChange = (selectedDays) => {
        const daysArr = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
        let checkedDays = [];
        daysArr.forEach(day => {
            if (selectedDays.includes(day)) {
                checkedDays.push(day);
            }
        })
        setSelectedPdpDays(checkedDays);
    }

    const onReferenceDateChange = (date, dateString) => {
        setSelectedRefDateString(dateString.replaceAll("-", ""));
        setSelectedPdpDays((date) ? [date?._d.toString().trim().substring(0, 2).toUpperCase()] : []);
        setSelectedRefDate(date);
    }

    const onSavePdp = () => {
        let pdp_updated = selectedPdpType + selectedPdpDays.toString().replaceAll(",", "");
        sales_details[editingIndex]['PDP_Day'] = pdp_updated
        sales_details[editingIndex]['Reference_date'] = selectedRefDateString
        setUpdatedDetails(prev => [...prev, {
            sales_org: sales_details[editingIndex]['Sales_Org_Code'],
            division: sales_details[editingIndex]['Division_Code'],
            distribution_channel: sales_details[editingIndex]['Distribution_channel_Code'],
            plant_code: sales_details[editingIndex]['Plant'],
            pdp_current: previousValue['pdp_day'],
            pdp_requested: pdp_updated,
            ref_date_current: previousValue['ref_date'].length !== 8 ? "00000000" : previousValue['ref_date'],
            ref_date_requested: selectedRefDateString
        }])

        hideSetPDPModal();
    }

    const submitPdpUpdateRequest = () => {
        const pdpUpdateRequestPayload = {
            comment: comment,
            dbCode: selectedDb.split('_')[0],
            name: selectedDb.split('_')[1],
            pdp_data: [...updatedDetails]
        }
        onSubmit(pdpUpdateRequestPayload);
        handleCancel();
    }

    const disabledDate = (current) => {
        // Can not select days after today
        return current && current > dayjs().endOf('day');
    };



    return (
        <>
            <Modal title="Pdp Update Request" centered visible={visible} onCancel={handleCancel} wrapClassName='comment-modal' className='PdpRequestModal' width={950} footer={null} ste>

                <div className="comment-fld">
                    <label htmlFor="distributor">Distributors:</label>
                    <Select style={{ width: "100%" }}
                        showSearch
                        optionFilterProp="children"
                        options={dbList?.map(c => ({ value: c.profile_id + '_' + c.name, label: c.name + " " + c.profile_id, dbName: c.name }))}
                        filterOption={(input, option) =>
                            (option?.label.toUpperCase() ?? '').includes(input.toUpperCase())
                        }
                        value={selectedDb}
                        defaultValue={selectedDb}
                        onChange={(value, label) => handleDBCodeChange(value, label)}
                    />
                </div>
                {sales_details.length > 0 && <div className='table-container table-pdp'>
                    <table className="styled-table-pdp">
                        <thead>
                            <tr>
                                <th className="pdptableheader" style={{ width: "16%" }}>SalesOrg</th>
                                <th className="pdptableheader" style={{ width: "16%" }}>Distributon Channel</th>
                                <th className="pdptableheader" style={{ width: "16%" }}>Division</th>
                                <th className="pdptableheader" style={{ width: "16%" }}>Plant Code</th>
                                <th className="pdptableheader" style={{ width: "21%" }}>PDP</th>
                                <th className="pdptableheader" style={{ width: "15%" }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sales_details == '' || sales_details?.length < 0 || sales_details == undefined ? "" : sales_details?.map((details, i) => {
                                return (<tr key={i}>
                                    <td><input type="text" className='inputbox-pdp' id='salesorg_inputbox' value={details?.Sales_Org_Code} disabled={true} /></td>
                                    <td><input type="text" className='inputbox-pdp' id='distribution_channel_inputbox' value={details?.Distribution_channel_Code} disabled={true} /></td>
                                    <td><input type="text" className='inputbox-pdp' id='division_inputbox' value={details?.Division_Code} disabled={true} /></td>
                                    <td><input type="text" className='inputbox-pdp' id='plant_name_inputbox' value={details?.Plant} disabled={true} /></td>
                                    <td><input type="text" className='inputbox-pdp' id='pdp_inputbox' value={details?.PDP_Day} disabled={true} /></td>

                                    {nonEditable[i] ?
                                        <td style={{ textAlign: "center" }}>
                                            <button id={"editbutton" + i} className="pdpButtons2" onClick={(e) => handleEdit(e, i)}>
                                                <EditTwoTone />
                                            </button>
                                        </td>
                                        :
                                        <>
                                            {hasRespondPermission(pages.PDP_REQUESTS) ?
                                                <td style={{ textAlign: "center" }}>
                                                    <EditTwoTone twoToneColor="#a9a9a9" />
                                                </td>
                                                :
                                                <td style={{ textAlign: "center" }}>
                                                    <button id={"editbutton" + i} className="pdpButtons2" onClick={(e) => handleEdit(e, i)}>
                                                        <EditTwoTone />
                                                    </button>
                                                </td>}
                                        </>
                                    }

                                </tr>)
                            })}
                        </tbody>
                    </table>
                </div>}
                <div className="comment-fld">
                    <label>Reason</label>
                    <div>
                        <textarea
                            id="comment" value={comment} onChange={(e) => setComment(e.target.value)}
                            name="comment"
                            placeholder="Enter comment"
                            style={{ height: "50px" }}
                        />
                    </div>
                </div>

                <div>
                    {
                        hasRespondPermission(pages.PDP_REQUESTS) ?  flag?.length>0?
                                <div>
                                    <p style={{ color: 'red' }}>{`*Division is not mapped to plant code. Kindly contact support for assistance`}</p>
                                </div>
                            
                        :'':''}
                          
                </div>

                <div className="modal-btns">
                    <button type="button" disabled={updatedDetails.length === 0 || comment.length < 5} hidden={!hasRaisePermission(pages.PDP_REQUESTS)} className="sbmt-btn" onClick={submitPdpUpdateRequest}>
                        Submit
                    </button>
                </div>


            </Modal>
            <Modal title="Set PDP" centered visible={isSetPDPModalVisible} onCancel={hideSetPDPModal} wrapClassName='comment-modal' className='setPDPModal' width={500} bodyStyle={{ height: "auto" }} footer={null}>

                <div className='set-pdp-table'>
                    <table className="styled-table-pdp">
                        <thead>
                            <tr>
                                <th className="pdptableheader" style={{ width: "30%" }}>Order Type</th>
                                <th className="pdptableheader" style={{ width: "30%" }}>PDP Day</th>
                                <th className="pdptableheader" style={{ width: "40%", display: selectedPdpType === 'FN' ? "" : "none" }}>Reference Date</th>

                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className='orderType'>
                                    <Radio.Group onChange={onPdpTypeChange} value={selectedPdpType}>
                                        <Space direction="vertical">
                                            <Radio value='WE'>Weekly</Radio>
                                            <Radio value='FN'>Fortnightly</Radio>
                                        </Space>
                                    </Radio.Group>
                                </td>
                                <td className="pdpDay">
                                    <Checkbox.Group style={{ width: '100%', }} onChange={onPdpDayChange} disabled={selectedPdpType === 'WE' ? false : true} value={selectedPdpDays}>
                                        <Row>
                                            <Col span={24}>
                                                <Checkbox value="MO">Monday</Checkbox>
                                            </Col>
                                            <Col span={24}>
                                                <Checkbox value="TU">Tuesday</Checkbox>
                                            </Col>
                                            <Col span={24}>
                                                <Checkbox value="WE">Wednesday</Checkbox>
                                            </Col>
                                            <Col span={24}>
                                                <Checkbox value="TH">Thursday</Checkbox>
                                            </Col>
                                            <Col span={24}>
                                                <Checkbox value="FR">Friday</Checkbox>
                                            </Col>
                                            <Col span={24}>
                                                <Checkbox value="SA">Saturday</Checkbox>
                                            </Col>
                                            <Col span={24}>
                                                <Checkbox value="SU">Sunday</Checkbox>
                                            </Col>
                                        </Row>
                                    </Checkbox.Group>
                                </td>
                                <td className="referenceDate" style={{ display: selectedPdpType === 'FN' ? "" : "none", textAlign: "center" }}>
                                    <DatePicker onChange={onReferenceDateChange} value={selectedRefDate} disabledDate={disabledDate} autofoucus style={{ width: "100%", border: "2px solid #1268b3" }} />
                                    <Alert
                                        message="Kindly select reference date."
                                        description=""
                                        type="info"
                                        showIcon
                                        closable
                                        style={{ width: "100%", marginTop: "5px" }}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="comment-btn">
                    <button type="button" className="sbmt-btn" disabled={!(selectedPdpType && selectedPdpDays.length > 0)} onClick={onSavePdp}>
                        Save
                    </button>

                </div>


            </Modal>
        </>
    )
}
const mapStateToProps = (state) => {

    return {

    }
}
const mapDispatchToProps = (dispatch) => {
    return {
        getWarehouseDetailsOnDistChannel: (distributorId, distributionChannel, divisionArr) =>
            dispatch(Dist_Action.getWarehouseDetailsOnDistChannel(distributorId, distributionChannel, divisionArr)),
        getDepoCode: (data) => dispatch(Dist_Action.getDepoCodeMaping(data))
    }
}
const PdpModal = connect(
    mapStateToProps,
    mapDispatchToProps
)(PdpRequestModal)
export default PdpModal;
