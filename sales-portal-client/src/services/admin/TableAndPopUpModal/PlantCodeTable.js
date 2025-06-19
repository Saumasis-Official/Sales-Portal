import React from 'react'
import { CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import Util from '../../../util/helper/index';
import './PlantCodeTable.css'
import {pages, hasRespondPermission } from '../../../persona/requests';

function PlantCodeTable(props) {
    return (
        <div>
            <div className="admin-dashboard-table">
                
                    <table>
                        <thead>
                            <tr>
                                <th className="width3">
                                    {
                                        props.data && props.data.length > 0 &&
                                        <input id={'checkbox-header'} onChange={(e) => { props.selectAll(e) }} type="checkbox" />
                                    }
                                </th>
                                <th className="width10">Plant Update No.</th>
                                <th className="width8" style={{textAlign: "center"}}>Request Date</th>
                                <th className="width15" style={{textAlign: "center"}}>Distributor Name</th>
                                <th className="width8" style={{textAlign: "center"}}>Current Plant Code</th>
                                <th className="width8" style={{textAlign: "center"}}>Response Date</th>
                                <th className='width3' style={{textAlign: "center"}}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {props.data && props.data?.map((item, i) => {
                                const itemExisting = props.checkExisting(item);
                                return (
                                    <tr key={i} style={{backgroundColor : item.status === 'PENDING' ? 'rgb(242, 216, 168)': item.status === 'APPROVED' ? '#adefc0': 'rgb(225 95 95 / 63%)'}}>
                                        <td >
                                            <label htmlFor={i}>
                                                <input id={i} type="checkbox" checked={itemExisting} onChange={(event) => props.exportExcelHandler(event, item)} />
                                                <span className="checkmark-box"></span>
                                            </label>
                                        </td>
                                        <td className="width10">{item.pc_number}</td>
                                        <td className="width8" style={{textAlign: "center"}}>{item.created_on
                                            ? <>{Util.formatDate(item.created_on)},{Util.formatTime(item.created_on)}</>
                                            : '-'}</td>
                                        <td className="width15" style={{textAlign: "center"}}>{item.distributor_name} ({item.distributor_code})</td>
                                        <td style={{textAlign: "center"}}>{item.status === 'APPROVED'? item.plant_code : item?.previous_salesdetails?.substring(item?.previous_salesdetails?.length -4)}</td>
                                        <td style={{textAlign: "center"}}> 
                                            {/* <span
                                                className={"badges " +
                                                    (item.status == 'PENDING' ? 'bg-pending' : '' ||
                                                        item.status == 'APPROVED' ? 'bg-approved' : '' ||
                                                            item.status == 'REJECTED' ? 'bg-rejected' : '')
                                                }
                                            >{item.status}</span> */}
                                            {item.update_on ? <>{Util.formatDate(item.update_on)},{Util.formatTime(item.update_on)}</> : '-'}
                                        </td>

                                        {!hasRespondPermission(pages.PLANT_REQUEST)? <td className='admin-ations'>
                                            <div className='action-btns'>
                                                <i className='info-icon' onClick={(e) => props.showModalTseDetails(item, e)}>
                                                    <Tooltip placement="bottom" title="View"><EyeOutlined /></Tooltip></i>
                                            </div>
                                        </td> : <td className='admin-ations'>

                                            {item.status == 'PENDING' ? <div className='action-btns'>
                                                <i className='info-icon'>
                                                    <Tooltip placement="bottom" title="Approve" onClick={() => { props.showModalAccept(item) }}><CheckCircleOutlined /></Tooltip></i>
                                                <i className='info-icon'>
                                                    <Tooltip placement="bottom" title="Reject" onClick={() => { props.showModalReject(item) }}><CloseCircleOutlined /></Tooltip></i>
                                            </div> : <div className='action-btns'>
                                                <i className='info-icon' onClick={(e) => props.showModalTseDetails(item, e)}>
                                                    <Tooltip placement="bottom" title="View"><EyeOutlined /></Tooltip></i>
                                            </div>}
                                        </td>}
                                    </tr>
                                )

                            })}
                            {props.data.length === 0 &&
                                <tr style={{ textAlign: 'center' }}>
                                    <td colSpan="8">No request available</td>
                                </tr>}
                        </tbody>
                    </table>
            </div>
        </div>
    )
}

export default PlantCodeTable
