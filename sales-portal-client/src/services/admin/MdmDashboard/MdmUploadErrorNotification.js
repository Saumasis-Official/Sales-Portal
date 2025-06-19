import React, { useState } from 'react';
import { Modal, Alert,Button } from 'antd';
import './MdmUploadErrorNotification.css';
import * as XLSX from 'xlsx';

const MdmUploadErrorNotification = (props) => {
    const { data, message, visible, handleErrorCancel } = props
    const downloadExcel = () => {
        const headers = [
            "PSKU", "SKU", "Customer Code", "Customer Name","Plant Code",
            "Article Code", "Site Code",
            "Vendor Code"
        ];

        const tableData = data.map(item => ({
            "PSKU": item?.psku ? item?.psku : "-",
            "SKU": item?.sku ? item?.sku : "-",
            "Customer Code": item?.customer_code ? item?.customer_code : "-",
            "Customer Name": item?.customer_name ? item?.customer_name : "-",
            "Plant Code": item?.plant_code ? item?.plant_code : "-",
            "Article Code": item?.article_id ? item?.article_id : "-",
            "Site Code": item?.site_code ? item?.site_code : "-",
            "Vendor Code": item?.vendor_code ? item?.vendor_code : "-",   
        }));

        const worksheet = XLSX.utils.json_to_sheet(tableData, { header: headers });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Errors");
        XLSX.writeFile(workbook, "Upload Errors.xlsx");
    };
    return (
        <div>
            <Modal
                title={message}
                visible={visible}
                onCancel={handleErrorCancel}
                footer={null}
                wrapClassName='comment-lists mdm-list'
                className='mdm-modal'
                width={1200}
            >
                <div className='admin-dashboard-table Mtecom-TableHeader'>
                <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th className="mdm-header" >PSKU</th>
                            <th className="mdm-header" >SKU</th>
                            <th className="mdm-header" >Customer Code</th>
                            <th className="mdm-header" >Customer Name</th>
                            <th className="mdm-header" >Plant Code</th>
                            <th className="mdm-header" >Article Code</th>
                            <th className="mdm-header" >Site Code</th>
                            <th className="mdm-header">Vendor Code</th>
                            
                            
                        </tr>
                    </thead>
                    <tbody style={{ textAlign: 'center' }}>
                            { data && data?.length > 0
                                && (data?.map((item, index) => {
                                    return (
                                  <tr>  
                                <td>{item?.psku ? item?.psku : "-"}</td>
                                <td>{item?.sku ? item?.sku : "-"}</td>
                                <td>{item?.customer_code ? item?.customer_code : "-"}</td>
                                <td>{item?.customer_name ? item?.customer_name : "-" }</td>
                                <td>{item?.plant_code ? item?.plant_code : "-"}</td>
                                <td>{item?.article_id ? item?.article_id : "-"}</td>
                                <td>{item?.site_code ? item?.site_code : "-"}</td>
                                <td>{item?.vendor_code ? item?.vendor_code : "-" }</td>
                                
                                
                            </tr>
                            )
                            }))}
                        </tbody>
                </table> 
                </div>
                </div>
                {data && data?.length && (
                    <div className="mdm-button-container">
                        <Button type="primary" onClick={downloadExcel} className="modal-button">
                            Download Excel
                        </Button>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default MdmUploadErrorNotification;