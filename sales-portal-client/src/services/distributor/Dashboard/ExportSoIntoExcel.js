import React from 'react';
import ReactExport from "react-data-export";
import Util from '../../../util/helper';

let ExportSoIntoExcel = (props) => {
    //Excel variable
    const ExcelFile = ReactExport.ExcelFile;
    const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
    const csvEmptyData = [
        {
            foo: "bar"
        }
    ];
    const { soData, onCancel } = props;
    const getDummySoData = (dummySO) => {
        return [{
            columns: [
                { title: "SO Details", style: { fill: { patternType: "solid", fgColor: { rgb: "1268b3" } }, font: { color: { rgb: "ffffff" } } } }
            ],
            data: csvEmptyData.map((record, index) => {
                return [
                    { value: record.foo }
                ];
            })
        },
        {
            ySteps: -1,
            columns: [
                { title: "SO Number" },
                { title: "SO Date" },
                { title: "Material" },
                { title: "Material Code" },
                { title: "Quantity" },
                { title: "Sales Unit" },
                { title: "Net Value in Rs." },
                { title: "Status" }
            ],
            data: dummySO.map((record, index) => {
                return [
                    { value: record.Sales_Order_Number },
                    { value: record.Created_On ? Util.formatDate(record.Created_On,'YYYYMMDD') : '' },
                    { value: record.Material_Description },
                    { value: record.Material_Number },
                    { value: record.Sales_Order_QTY },
                    { value: record.Sales_Unit },
                    { value: record.Net_value },
                    { value: record.Status }
                ];
            }),
        }]
    }
    const getDummyDeliveryData = (dummyDelivery) => {
        return [{
            ySteps: 2,

            columns: [
                { title: "Delivery Details", style: { fill: { patternType: "solid", fgColor: { rgb: "1268b3" } }, font: { color: { rgb: "ffffff" } } } }
            ],
            data: csvEmptyData.map((record, index) => {
                return [
                    { value: record.foo }
                ];
            })
        },
        {
            ySteps: -1,
            columns: [
                { title: "Delivery Number" },
                { title: "Delivery Date" },
                { title: "Material" },
                { title: "Material Code" },
                { title: "Quantity" },
                { title: "Batch Number" },
                { title: "Sales Unit" },
                { title: "Pack Type" },
                { title: "Status" }
            ],
            data: dummyDelivery.map((record, index) => {
                return [
                    { value: record.Delivery_Number },
                    { value: record.Creation_Date ? Util.formatDate(record.Creation_Date,'YYYYMMDD') : '' },
                    { value: record.Material_Description },
                    { value: record.Material },
                    { value: record.QTY },
                    { value: record.Batch },
                    { value: record.Units },
                    { value: record.Pack_Type },
                    { value: record.Status }
                ];
            }),
        }]
    }
    const getDummyInvoiceData = (dummyInvoice) => {
        return [{
            ySteps: 2,

            columns: [
                { title: "Invoice Details", style: { fill: { patternType: "solid", fgColor: { rgb: "1268b3" } }, font: { color: { rgb: "ffffff" } } } }
            ],
            data: csvEmptyData.map((record, index) => {
                return [
                    { value: record.foo }
                ];
            })
        },
        {
            ySteps: -1,
            columns: [
                { title: "Invoice Number" },
                { title: "Invoice Date" },
                { title: "Material" },
                { title: "Material Code" },
                { title: "Quantity" },
                { title: "Sales Unit" },
                { title: "Pack Type" },
                { title: "Amount in Rs." },
            ],
            data: dummyInvoice.map((record, index) => {
                return [
                    { value: record.Invoice_Number },
                    { value: record.Created_on ? Util.formatDate(record.Created_on,'YYYYMMDD') : '' },
                    { value: record.Invoice_Material_Description },
                    { value: record.Invoice_Material },
                    { value: record.Invoice_QTY },
                    { value: record.Invoice_Unit },
                    { value: record.Pack_Type },
                    { value: record.Invoice_item_value }
                ];
            }),
        }]
    }
    const getSoData = (obj) => {
        const { dummySO, dummyDelivery, dummyInvoice } = obj;
        let soData = [];
        if (dummySO.length) {
            soData.push(...getDummySoData(dummySO));
        }
        if (dummyDelivery.length) {
            soData.push(...getDummyDeliveryData(dummyDelivery));
        }
        if (dummyInvoice.length) {
            soData.push(...getDummyInvoiceData(dummyInvoice));
        }
        return soData;
    }
    const prepareExcelSheet = (obj) => {
        const { soNumber } = obj
        return {
            soNumber: soNumber,
            soData: getSoData(obj)
        }
    }
    const dataExcel = [];
    soData.map(item => {
        if (item.so.data.length > 0) {
            let soNumber = [...new Set(item.so.data.map(item => item.Sales_Order_Number))].pop();
            let dummySO = Object.values(item.so.data)
            let dummyDelivery = Object.values(item.delivery.data);
            let dummyInvoice = Object.values(item.invoice.data);
            dataExcel.push(prepareExcelSheet({ soNumber, dummySO, dummyDelivery, dummyInvoice }))
        }
    });
    return (
        <>
            <div className="btn-download">
                <ExcelFile filename={`Multiple_SO_Details_${new Date().getFullYear() + '_' + (new Date().getMonth() + 1) + '_' + new Date().getDate()}`} element={<button onClick={onCancel}>Click Here</button>}>
                    {dataExcel.map((data, index) => <ExcelSheet key={index} dataSet={data.soData} name={`SO-${data.soNumber}`}>
                    </ExcelSheet>)}
                </ExcelFile>
            </div>
        </>
    );
};


export default ExportSoIntoExcel;
