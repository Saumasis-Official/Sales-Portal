import React from 'react'
import { EyeOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import Util from '../../../util/helper/index';
import Loader from '../../../components/Loader';

function SalesHeirarchyTable(props) {
    return (
        <div>
            <div className="admin-dashboard-table">
                <Loader>
                    <table>
                        <thead>
                            <tr>
                                <th className="width3">
                                    {
                                        props.data && props.data.length > 0 &&
                                        <input id={'checkbox-header'} onChange={(e) => { props.selectAll(e) }} type="checkbox" />
                                    }
                                </th>
                                <th className="width10">SH Code</th>
                                <th className="width8" style={{ textAlign: "center" }}>Request Date</th>
                                <th className="width15" style={{ textAlign: "center" }}>Distributor Name</th>
                                <th className="width12" style={{ textAlign: "center" }}>Request Type</th>
                                <th className="width8" style={{ textAlign: "center" }}>Response Date</th>
                                <th className='action-title width5' >Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {props.data && props.data?.map((item, i) => {
                                const itemExisting = props.checkExisting(item);
                                return (
                                    <tr key={i} style={{ backgroundColor: item.status === 'PENDING' ? 'rgb(242, 216, 168)' : item.status === 'APPROVED' ? '#adefc0' : 'rgb(225 95 95 / 63%)' }}>
                                        <td >
                                            <label htmlFor={i}>
                                                <input id={i} type="checkbox" checked={itemExisting} onChange={(event) => props.exportExcelHandler(event, item)} />
                                                <span className="checkmark-box"></span>
                                            </label>
                                        </td>
                                        <td className="width10">{item.sh_number}</td>
                                        <td className="width8" style={{ textAlign: "center" }}>{item.created_on
                                            ? <>{Util.formatDate(item.created_on)},{Util.formatTime(item.created_on)}</>
                                            : '-'}</td>
                                        <td className="width15" style={{ textAlign: "center" }}>{item.db_name} ({item.distributor_code})</td>
                                        <td className="width12" style={{ textAlign: "center" }}>{item.type == "ADD" ? "Distributor is not showing" : item.type == "REMOVE" ? "Distributor does not belongs to TSE" : ""}</td>
                                        <td className="width8" style={{ textAlign: "center" }}>{item.updated_by ? <>{Util.formatDate(item.updated_on)},{Util.formatTime(item.updated_on)}</> : '-'}</td>
                                        <td className='admin-ations'>
                                            <div className='action-btns'>
                                                <i className='info-icon' onClick={(e) => props.showModalTseDetails(item, e)}>
                                                    <Tooltip placement="bottom" title="View"><EyeOutlined /></Tooltip></i>
                                            </div>
                                        </td>
                                    </tr>
                                )

                            })}
                            {props.data.length === 0 &&
                                <tr style={{ textAlign: 'center' }}>
                                    <td colSpan="8">No request available</td>
                                </tr>}
                        </tbody>
                    </table>
                </Loader>
            </div>
        </div>
    )
}

export default SalesHeirarchyTable
