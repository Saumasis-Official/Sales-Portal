import React, { useEffect, useRef, useState } from 'react'
import { Modal } from 'antd';
import '../../../style/admin/Dashboard.css';
import './BrandVariantsModal.css'
import { EditTwoTone, CheckCircleTwoTone, CloseCircleTwoTone } from '@ant-design/icons';

const BrandVariantsModal = (props) => {
    const { isModalVisible, closeModal, userRole, data } = props;
    const month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const [canEdit, setCanEdit] = useState(false);
    const [originalTableData, setOriginalTableData] = useState([]);
    const [tableData, setTableData] = useState([]);
    const [m0Diff, setM0Diff] = useState();
    const [mTotal, setMTotal] = useState([0.0, 0.0, 0.0, 0.0]);

    useEffect(() => {
        setTableData(data?.tableData);
        setOriginalTableData(data?.tableData);
        setMTotal(prev => {
            prev[0] = data?.tableData?.reduce((a, v) => a = a + parseFloat(v.qty_m0), 0).toFixed(2);
            prev[1] = data?.tableData?.reduce((a, v) => a = a + parseFloat(v.qty_m1), 0).toFixed(2);
            prev[2] = data?.tableData?.reduce((a, v) => a = a + parseFloat(v.qty_m2), 0).toFixed(2);
            prev[3] = data?.tableData?.reduce((a, v) => a = a + parseFloat(v.qty_m3), 0).toFixed(2);
            return [...prev];
        })

    }, [])

    useEffect(() => {
        setM0Diff((tableData?.reduce((a, v) => a = a + parseFloat(v.qty_m0), 0) - mTotal[0]).toFixed(2))
    }, [tableData])

    const handleEdit = (e) => {
        setCanEdit(true);
    }

    const handleSave = (e) => {
        setCanEdit(false);
    }

    const handleCancel = (e) => {
        setCanEdit(false);
        setTableData(originalTableData);
    }

    const handleChange = (e, i) => {
        setTableData(prev => {
            prev[i].qty_m0 = e.target.value;
            return [...prev];
        });
    }
   

    return (
        <>
            <Modal
                wrapClassName='comment-modal'
                className='BrandVariatsModal'
                title={'Forecast for ' + data.dbName + ' (' + data.dbCode + ')'}
                visible={!!isModalVisible}
                onCancel={closeModal}
                width={700}
                footer={null}>
                {data && data !== 'undefined' && tableData.length > 0 && <div className='table-container brand-variants-container'>
                    <table className="table-brand-variants">
                        <thead>
                            <tr>
                                <th className="brand-variants-header width10" >SKU</th>
                                <th className="brand-variants-header width20" >Variant Name</th>
                                <th className="brand-variants-header width30">
                                    <span>Sales Number</span>
                                    <tr>
                                        <th className='width10'>{month[new Date().getMonth() - 2 < 0 ? 12 - Number(new Date().getMonth() - 2) : new Date().getMonth() - 2]}</th>
                                        <th className='width10'>{month[new Date().getMonth() - 1 < 0 ? 12 - Number(new Date().getMonth() - 1) : new Date().getMonth() - 1]}</th>
                                        <th className='width10'>{month[new Date().getMonth()]}</th>
                                    </tr>
                                </th>
                                <th className="brand-variants-header width20" >
                                    <span className='width8' style={{ display: canEdit ? 'none' : 'inline-block' }}><button className="bvm-btn" onClick={(e) => handleEdit(e)}><EditTwoTone /></button></span>
                                    <span className='width8' style={{ textAlign: 'center',display: canEdit ? 'inline-flex' : 'none' }}>
                                        <button className="bvm-btn" onClick={(e) => handleSave(e)}><CheckCircleTwoTone /></button>
                                        <button className="bvm-btn" onClick={(e) => handleCancel(e)}><CloseCircleTwoTone /></button>
                                    </span>
                                    {/* <span className='width8' style={{display : canEdit ? 'inline-block': 'none'}}></span> */}
                                    <br />
                                    <span> Forecast for {month[new Date().getMonth() + 1 > 11 ? Number(new Date().getMonth() + 1) - 12 : new Date().getMonth() + 1]}</span>
                                </th>
                                {/* <th className="brand-variants-header width10" >Actions</th> */}
                            </tr>
                        </thead>
                        <tbody>
                            {tableData?.length > 0 && tableData.map((item, index) => {
                                return (
                                    <tr key={index}>
                                        <td className='brand-variants-body width10'>{item.SKU}</td>
                                        <td className='brand-variants-body width20'>{item.SKU_Name}</td>
                                        <td className='brand-variants-body width30'>

                                            <td className='width10'>{item.qty_m3}</td>
                                            <td className='width10'>{item.qty_m2}</td>
                                            <td className='width10'>{item.qty_m1}</td>

                                        </td>

                                        <td className='brand-variants-body width20' id={'current-forecast-' + index} ><input type="number" value={item.qty_m0} onChange={(e) => handleChange(e, index)} disabled={!canEdit} /></td>
                                        {/* <td className='brand-variants-body width10'><button id={"editbutton" + index} className="pdpButtons2" onClick={(e) => handleEdit(e, index)}><EditTwoTone /></button></td> */}
                                    </tr>
                                )
                            })}
                            <tr>
                                <td className='total width10'>Total</td>
                                <td className='total width20'></td>
                                <td className='total width30'>

                                    <td className='width10'
                                    // style={{width: '77.27px'}}
                                    >{mTotal[3]}</td>
                                    <td className='width10'
                                    // style={{width: '77.27px'}}
                                    >{mTotal[2]}</td>
                                    <td className='width10'
                                    // style={{width: '77.27px'}}
                                    >{mTotal[1]}</td>

                                </td>

                                <td className='total width20'>{[mTotal[0]]} ({m0Diff})</td>
                                {/* <td className='total width10'></td> */}
                            </tr>
                        </tbody>
                    </table>
                </div>}

            </Modal>
        </>
    )
}

export default BrandVariantsModal;