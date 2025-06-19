import React, { useRef, useState } from 'react';
import { Modal, Select, notification } from 'antd';
import { connect } from 'react-redux';
import * as Action from '../../distributor/actions/dashboardAction'
import * as AdminAction from '../actions/adminAction'
import './PlantCodeModel.css'
import { EditTwoTone } from '@ant-design/icons';
import { CheckCircleTwoTone } from '@ant-design/icons';
import { CloseCircleTwoTone } from '@ant-design/icons'
import Util from '../../../util/helper/index';
import { useEffect } from 'react';
import LocalAuth from '../../../util/middleware/auth';
import * as Dist_Action from '../../distributor/action';
import _ from 'lodash';
import { allDivisionsArr } from '../../../config/constant';
import { pages, features, hasRaisePermission, hasRespondPermission, hasViewPermission } from '../../../persona/requests.js';

let PlantCodeModel = (props) => {
    var adminRole = LocalAuth.getAdminRole();
    const { getRegionDetails, updatePlantCodeMapping, setSuccess, getWarehouseDetailsOnDistChannel, tseCode, getCfaDataAdmin, handleUpdateRequest,acceptRequestByLogisticOfficer, getDepoCode } = props
    const [selectedDb, setSelectedDb] = useState('Select a distributor')
    const [sales_details, setSalesDetails] = useState([])
    const [saveButton, setSaveButton] = useState(true)
    const [updatedDetails, setUpdatedDetails] = useState([])
    const [previousValue, setPreviousValue] = useState({})
    const [comments, setComments] = useState('')
    const [dbName, setdbName] = useState('')
    const [submitButton, setSubmitButton] = useState(true)
    const [commentFlag, setCommentFlag] = useState(true)
    const [directDistributor, setDirectDistributor] = useState('')
    const [selectedSubDb, setSelectedSubDb] = useState('Select a ship to point')
    const [subDdList, setSubDbList] = useState([])
    const [depotDetails, setDepotDetails] = useState([])
    const [zone, setZone] = useState()
    const [zonePlants, setZonePlants] = useState([])
    const [optionsList, setOptionsList] = useState([]);
    const [plantCodeDetails, setPlantCodeDetails] = useState()
    const [flag,setFlag]=useState(false);
    const [flagIndex,SetflagIndex]=useState();
    const salesData =useRef(null);
    useEffect(() => {
        async function  depotDetails() {
            const cfa_depot = await getCfaDataAdmin('');
            const zonePlantsData = [
                ...new Map(
                    cfa_depot?.data?.rows?.map((obj) => [obj['depot_code'], obj])
                ).values(),
    
              ];
            setDepotDetails(zonePlantsData);
        }
        depotDetails();  
    }, [])

    useEffect(()=>{
        let depot_code = [];
        let divZoneSales =[];
        zonePlants.forEach((item)=>{
    depot_code.push(item.depot_code)
    })
    sales_details.forEach(element=>{
    divZoneSales.push({division:element.Division_Code,distributionChannel:element.Distribution_channel_Code
        ,sales_org:element.Sales_Org_Code})
        depot_code.push(element.Plant)

        })
        if (hasRespondPermission(pages.PLANT_REQUEST)) {
            initCallToApi(divZoneSales, [...new Set(depot_code)]);
        }
       
        SetflagIndex(new Array(sales_details.length).fill(false))

    }

        , [selectedDb&&selectedSubDb])




    const initCallToApi = async (divZoneSales, depot_code) => {


       let response= await getDepoCode({divZoneSales,depot_code})
       if(response?.status===200) setPlantCodeDetails(response?.data)
    }

    const filterDistributor = () => {
        if (tseCode !== null && tseCode !== "" && tseCode !== undefined && adminRole.includes('TSE')) {
            const tseCodeArr = tseCode?.split(',');
            let filteredOptions = props.distributor_list?.filter((item) => { return tseCodeArr.includes(item.tse_code) })?.map((i) => {
                return i;
            })
            filteredOptions &&   setOptionsList([...filteredOptions]);
        }
        else {
            let filteredOptions = props.distributor_list?.map((i) => {
                return i;
            })
            filteredOptions &&     setOptionsList([...filteredOptions]);
        }
    }
    const handleCancel = () => {
        setCommentFlag(true)
        setSalesDetails([])
        setSelectedDb('Select a distributor')
        setUpdatedDetails([])
        setComments('')
        props.onCancel();
        setSubmitButton(true)
        setSaveButton(true)
        setSelectedSubDb('Select a ship to point')
        SetflagIndex()
    }
    const handleDBCodeChangeForSubD = async (value, label) => {
        setSelectedSubDb(value)
        const zonePlants = depotDetails.filter(d => d.zone.toUpperCase().replace(" ", "-") == zone.toUpperCase());
        const sortedZonePlants = _.sortBy(zonePlants, ['depot_code']);
        setZonePlants(sortedZonePlants);
        if (value) {
            setdbName(label.dbName)
            const response = subDdList.filter(list => list.partner_code == value)
            const sortedSalesOrg = _.sortBy(response[0].distribution_details, ['Distribution_channel_Code', 'Division_Code']);
            salesData.current =JSON.stringify(sortedSalesOrg)
            setSalesDetails(sortedSalesOrg);
        }
    }
    const handleDBCodeChange = async (value, label) => {
        const zone = await getRegionDetails(value)
        setZone(zone.group5.replace(" ", "-"))
        setSelectedDb(value)
        setDirectDistributor(value)
        const divisionArr = allDivisionsArr;
        const responseDistChannel10 = await getWarehouseDetailsOnDistChannel(value, 10, divisionArr);
        const responseDistChannel40 = await getWarehouseDetailsOnDistChannel(value, 40, divisionArr);
        responseDistChannel40?.shipping_point[0]?.distribution_details?.forEach((item) => {
            responseDistChannel10?.shipping_point[0]?.distribution_details?.push(item);
        });
        setSubDbList(responseDistChannel10.shipping_point);
        setSelectedSubDb('Select a ship to point');
        setSalesDetails([]);
    }
    const handleEdit = async (e, i) => {
        setPreviousValue({
            distribution_channel: sales_details[i]['Distribution_channel_Code'],
            division: sales_details[i]['Division_Code'],
            plant_name: sales_details[i]['Plant'],
            sales_org: sales_details[i]['Sales_Org_Code']
        })
        Util.enablEditButton(i)
    
    }
    const handleCancelEdit = async (i) => {
        sales_details[i].Sales_Org_Code = previousValue.sales_org
        sales_details[i].Distribution_channel_Code = previousValue.distribution_channel
        sales_details[i].Division_Code = previousValue.division
        sales_details[i].Plant = previousValue.plant_name
        Util.hideSaveButton(i)
        setSaveButton(true)
         SetflagIndex(flagIndex?.map((item,indexFlag)=>indexFlag===i?false:item))
       
    }
    const handleSave = async (i, salesorg_inputbox, distribution_channel_inputbox, division_inputbox, plant_name_inputbox) => {
        setSubmitButton(false)
       let sales_org = document.getElementById(salesorg_inputbox).value
       let distribution_channel = document.getElementById(distribution_channel_inputbox).value
       let division = document.getElementById(division_inputbox).value
       let plant_name = document.getElementById(plant_name_inputbox).value
    //    let previous_sales_details = `${previousValue.distribution_channel}/${previousValue.division}/${previousValue.plant_name}`
       let json_previous_sales_data = JSON.parse(salesData.current)
       let previous_sales_data = json_previous_sales_data[i] 
     
       if(previous_sales_data.Distribution_channel_Code===distribution_channel&&previous_sales_data.Division_Code===division&&previous_sales_data.Plant===plant_name){
        setSaveButton(true);
        notification.error({
            message: `${plant_name} already mapped to division ${division}`,
            description: "nothing new to change",
            duration: 5,
            className: 'notification-error',
        });
      
       }
       else {
       let previous_sales_details = `${previous_sales_data.Distribution_channel_Code}/${previous_sales_data.Division_Code}/${previous_sales_data.Plant}`

       let index = updatedDetails?.findIndex(details=>details.sales_org===sales_org && details.distribution_channel=== distribution_channel && details.division=== division)
       if(index>=0){
        let newDetails = {
                sales_org: updatedDetails[index].sales_org,
                distribution_channel: updatedDetails[index].distribution_channel,
                division: updatedDetails[index].division,
                plant_name: plant_name,
                previous_sales_details: previous_sales_details
       
    }
       updatedDetails.splice(index,1,newDetails)
}
        else {
            updatedDetails.push({
            sales_org: sales_org,
            distribution_channel: distribution_channel,
            division: division,
            plant_name: plant_name,
            previous_sales_details: previous_sales_details
        })
}
     
         Util.hideSaveButton(i)
         SetflagIndex(flagIndex?.map((item,indexFlag)=>indexFlag===i?false:item))
       }
    }
        const handlecomment = (e) => {
        setComments(e.target.value); 
        if (e.target.value?.length >= 5)
            setCommentFlag(false);
    }
    const onchangehandler = (e, i, parameter) => {
        setSaveButton(false)
        sales_details[i][parameter] = e.target.value
        let item =sales_details[i]
        setSalesDetails([...sales_details])

 

    }

  

    const handlePlantUpdateRequest = async () => {
        if (adminRole.includes('LOGISTIC_OFFICER')) {
            acceptRequestByLogisticOfficer(updatedDetails, selectedDb, dbName, comments)
            setComments(true)
            setCommentFlag(true)
            handleCancel()
        }
        else if (adminRole.includes('ZONAL_OFFICER')) {
            acceptRequestByLogisticOfficer(updatedDetails, selectedDb, dbName, comments)
            setComments(true)
            setCommentFlag(true)
            handleCancel()
        }

        else {
            const response = await updatePlantCodeMapping({ data: updatedDetails, dbCode: selectedDb, name: dbName, comment: comments })
            if (response) {
                if (response.success == true) {

                    props.setSuccess(true)
                    notification.success({
                        message: 'Successful',
                        description: "Plant code update request send successfully",
                        duration: 5,
                        className: 'notification-green',
                    });
                }
                else {
                    notification.error({
                        message: response.message,
                        description: "Request can't send for a moment try after sometime",
                        duration: 5,
                        className: 'notification-error',
                    });
                }
            }
            setComments(true)
            setCommentFlag(true)
            handleCancel()
        }
        // SetflagMessage(false)
    }
    const isDisabled = (Plant,Division_Code,Distribution_channel_Code,Sales_Org_Code) => {
        return adminRole.includes('LOGISTIC_OFFICER') || adminRole.includes('ZONAL_OFFICER') ? plantCodeDetails?.find(item=>item.depot_code==Plant&&item.division==Division_Code&&item.distribution_channel==Distribution_channel_Code&&item.sales_org==Sales_Org_Code)===undefined?true:false:false
    }

    const flagMessage = (i) => {

        let item = sales_details[i]
        item = {
            ...item,
            option: zonePlants?.filter((c) => c.depot_code != item.Plant).map(item=>item.depot_code).concat(item.Plant)
        }
        const isRole = (adminRole.includes('LOGISTIC_OFFICER') || adminRole.includes('ZONAL_OFFICER'))
        for(let option of item.option){
            let datas = plantCodeDetails?.find(items => item.Division_Code == items.division && option==items.depot_code && items.distribution_channel == item.Distribution_channel_Code && items.sales_org == item.Sales_Org_Code)
            if (isRole && !datas) {
                setSubmitButton(true);
                SetflagIndex(flagIndex?.map((item, indexFlag) => indexFlag === i ? true : item))
                setFlag(true)
            }
        }
     
    }

    return (
        <>
            <Modal title="Plant Code Request" visible={props.visible} onCancel={handleCancel} wrapClassName='comment-modal' className='PlantCodeModel' width={650} footer={null} ste>
                <div> <label htmlFor="distributor">Distributors:</label><br />
                    <Select style={{ width: "100%" }}
                        showSearch
                        onClick={filterDistributor}
                        optionFilterProp="children"
                        options={optionsList?.map(c => ({ value: c.profile_id, label: c.name + " " + c.profile_id, dbName: c.name }))}
                        filterOption={(input, option) =>
                            (option?.label.toUpperCase() ?? '').includes(input.toUpperCase())
                        }
                        value={selectedDb}
                        defaultValue={selectedDb}
                        onChange={(value, label) => handleDBCodeChange(value, label)}
                    />
                    <br /><br />
                    <label htmlFor="sub-distributor">Ship To:</label><br />
                    <Select style={{ width: "100%" }}
                        showSearch
                        optionFilterProp="children"
                        options={subDdList?.map(c => ({ value: c.partner_code, label: c.partner_name + " " + c.partner_code, dbName: c.partner_name }))}
                        filterOption={(input, option) =>
                            (option?.label.toUpperCase() ?? '').includes(input.toUpperCase())
                        }
                        value={selectedSubDb}
                        defaultValue={selectedSubDb}
                        onChange={(value, label) => handleDBCodeChangeForSubD(value, label)}
                    />
                    <br /><br /></div>
                <div>
                    <div className='table-container'>
                        <table className="styled-table" id="table">
                            <thead>
                                <tr>
                                    <th className="plantcodetableheaderforsalesorg font-size">SalesOrg</th>
                                    <th className="plantcodetableheader font-size">DistributorChannel</th>
                                    <th className="plantcodetableheader font-size">Division</th>
                                    <th className="plantcodetableheader font-size">Plant Code</th>
                                    <th className="plantcodetableheaderforaction font-size">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales_details == '' || sales_details?.length < 0 || sales_details == undefined ? "" : sales_details.map((details, i) => {
                                    return (<tr key={i}>
                                        <td><input type="text" className='inputbox' id={'salesorg_inputbox' + i} value={details.Sales_Org_Code} onChange={(e) => onchangehandler(e, i, 'Sales_Org_Code')} disabled={true} /></td>
                                        <td><input type="text" className='inputbox' id={'distribution_channel_inputbox' + i} value={details.Distribution_channel_Code} onChange={(e) => onchangehandler(e, i, 'Distribution_channel_Code')} disabled={true} /></td>
                                        <td><input type="text" className='inputbox' id={'division_inputbox' + i} value={details.Division_Code} onChange={(e) => onchangehandler(e, i, 'Division_Code')} disabled={true} /></td>

                                        <td >
                                        <div onClick={()=>flagMessage(i)}> 
                                            <select
                                                className={`selecttag`}
                                                id={'plant_name_inputbox' + i}
                                                onChange={(e) =>
                                                    onchangehandler(e, i, 'Plant')
                                                }
                                               
                                                disabled={true}

                                            >
                                           
                                                <option value={details.Plant} 
                                                
                                                >
                                                    {details.Plant}
                                                </option>
                                                {zonePlants?.map((c) =>
                                                    c.depot_code != details.Plant ? (
                                                        isDisabled(c.depot_code, details.Division_Code, details.Distribution_channel_Code, details.Sales_Org_Code) ? (<option className='flagStyle' disabled={true}  value={c.depot_code} >
                                                            {`${c.depot_code}*`}
                                                        </option>) : (
                                                            <option
                                                                value={c.depot_code}
                                                            >
                                                                {`${c.depot_code}`}
                                                            </option>
                                                        )

                                                    ) : (
                                                        ''
                                                    ))}

                                            </select>
                                             </div>
                                        </td>
                                    

                                        <td>
                                            <button id={'actionbutton1' + i} className="plantCodeButtons1" disabled={saveButton} onClick={() => handleSave(i, 'salesorg_inputbox' + i, 'distribution_channel_inputbox' + i, 'division_inputbox' + i, 'plant_name_inputbox' + i)}><CheckCircleTwoTone /></button>
                                            <button id={"editbutton" + i} className="plantCodeButtons2" onClick={(e) => handleEdit(e, i)}><EditTwoTone /></button>
                                            <button id={'actionbutton2' + i} className="plantCodeButtons3" onClick={() => handleCancelEdit(i)}><CloseCircleTwoTone /></button>


                                        </td>
                                        </tr>)
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="comment-fld">
                        <label>Reason</label>
                        <div>
                            <textarea
                                id="comment" value={comments} onChange={handlecomment}
                                name="comment"
                                placeholder="Enter comment"
                                style={{ height: "50px" }}
                            />
                        </div>
                    </div>
                    <div>
                    </div>
                    
                    <div>
                    {
                        hasRespondPermission(pages.PDP_REQUESTS) ? flagIndex?.some(item=>item===true)? (
                                <div>
                                    <p style={{ color: 'red' }}>{`*Distributor is not mapped to plant code. Kindly contact support for assistance`}</p>
                                </div>
                        ) : '' : ''
}
                          
                </div>


                    <div className="comment-btn">
                      
                     
                        <button type="button" disabled={submitButton || commentFlag } hidden={!hasRaisePermission(pages.PLANT_REQUEST)} className="sbmt-btn" onClick={handlePlantUpdateRequest}>
                            Submit
                        </button>

                    </div>
                </div>
            </Modal>
        </>
    )
}
const mapStateToProps = (state, ownProps) => {

    return {
        region_details: state.dashboard.get('region_details')
    }
}
const mapDispatchToProps = (dispatch, ownProps) => {
    return {
        getRegionDetails: (id) => dispatch(Action.getRegionDetails(id)),
        updatePlantCodeMapping: (data) => dispatch(AdminAction.updatePlantCodeMapping(data)),
        getWarehouseDetailsOnDistChannel: (distributorId, distributionChannel, divisionArr) =>
            dispatch(Dist_Action.getWarehouseDetailsOnDistChannel(distributorId, distributionChannel, divisionArr)),
        getCfaDataAdmin: (type) => dispatch(Dist_Action.getCfaDataAdmin(type)),
        getDepoCode: (data) => dispatch(Dist_Action.getDepoCodeMaping(data))
    }
}
const PlantModel = connect(
    mapStateToProps,
    mapDispatchToProps
)(PlantCodeModel)
export default PlantModel;
