import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import ReactExport from "react-data-export";
import DetailsHeader from './DetailsHeader';
import DeliveryDetailsTable from './DeliveryDetailsTable';
import InvoiceDetailsTable from './InvoiceDetailsTable';
import RorTable from './RorTable';
import Auth from '../../../util/middleware/auth';
import jwt from 'jsonwebtoken';
import * as Action from '../actions/dashboardAction';
import DeliveriesTable from './DeliveriesTable';
import './OrderDetails.css';
import './SoDetails.css';
import * as Actions from '../../admin/actions/adminAction';
import { authenticatedUsersOnly } from '../../../util/middleware';
import OrderSummary from '../OrderSummary/OrderSummary';
let OrderDetail = props => {

    //Excel variable
    const ExcelFile = ReactExport.ExcelFile;
    const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
    const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;
    const browserHistory = props.history;
    //add region detail
    const { listSODetails, listSalesOrderDelivery, listInvoiceOrderDelivery, region_details } = props;
    const { so_number, delivery_no, invoice_no, distributorId } = props.location.state;

    let access_token = Auth.getAccessToken();
    let admin_access_token = Auth.getAdminAccessToken();
    let role = Auth.getRole();
    let login_id = '';
    if (props.location.pathname.split('/')[1] === 'distributor') {
        authenticatedUsersOnly(props.location.pathname, props.history);
    }

    if (access_token || admin_access_token) {
        if (role) {
            login_id = distributorId;
        } else {
            login_id = jwt.decode(access_token).login_id;
        }
    }
    const [tabShow, SetTabShow] = useState(true);
    const [soDetails, SetSODetails] = useState([]);
    const [deliveryData, SetDeliveryData] = useState([]);
    const [invoiceData, SetInvoiceData] = useState([]);
    const [rorData, SetRorData] = useState([]);
    const [totalNetValue, setTotalNetValue] = useState(0);
    const [headerDataValue, setHeaderDataValue] = useState(props.location.state)
    const { getMaintenanceRequests } = props
    const [totalQuantityTonnage, setTotalQuantityTonnage] = useState(0)
   

    const tabFunction = (value) => {
        SetTabShow(value)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(async () => {
        getMaintenanceRequests();
        await listSODetails(so_number, login_id).then((response) => {
            if (response && response.length > 0) {
                let output = response.map(input => ({
                    Depot_Code: input.Depot_Code,
                    Distribution_Channel: input.Distribution_Channel,
                    Division: input.Division,
                    Sales_Org: input.Sales_Org,
                    material: input.Material_Description,
                    code: input.Material_Number,
                    quantity: input.Sales_Order_QTY,
                    sales_unit: input.Sales_Unit,
                    net_value: input.Net_value,
                    status: input.Status,
                    sales_order_number: input.Sales_Order_Number,
                    sales_order_date: input.Created_On,
                    Quantity_ton: input.Quantity_Ton,
                }));

                SetSODetails(output.filter((item) => {
                    return (item.quantity !== 0 && item.quantity !== 0);
                }));
                if(response[0]?.rorItems && response[0]?.rorItems.length>0) SetRorData(response[0]?.rorItems)
                let totalQuantity = 0;
                let tonn = [];
                output?.forEach(element => {
                    tonn = element.Quantity_ton.split(" ");
                    totalQuantity += Number(tonn[0]);
                });
                setTotalQuantityTonnage(totalQuantity);

                let total = 0;
                output?.forEach(element => {
                    total += Number(element.net_value);

                });
                setTotalNetValue(total);
            }
        });
        listSalesOrderDelivery(delivery_no ? delivery_no : [], login_id).then((response) => {
            if (response && response.length > 0) {
                let output = response.map(input => ({
                    delivery: input.Delivery_Number,
                    delivery_date: input.Creation_Date,
                    material: input.Material_Description,
                    code: input.Material,
                    quantity: input.QTY,
                    sales_unit: input.Units,
                    pack_type: input.Pack_Type,
                    batch: input.Batch,
                    status: input.Status
                }));

                SetDeliveryData(output.filter((item) => {
                    return item.quantity !== 0;
                }));
            }
        });

        listInvoiceOrderDelivery(invoice_no ? invoice_no : [], login_id).then((response) => {
            if (response && response.length > 0) {
                let output = response.map(input => ({
                    invoice: input.Invoice_Number,
                    value: input.Invoice_Value,
                    material: input.Invoice_Material_Description,
                    code: input.Invoice_Material,
                    quantity: input.Invoice_QTY,
                    sales_unit: input.Invoice_Unit,
                    pack_type: input.Pack_Type,
                    buom: input.buom,
                    tentative: input.Invoice_item_value,
                    invoice_date: input.Created_on,
                    grn_code: input.Otp?.split("-")[1],
                    vehicle_arrival_date_time: input.Vehicle_Arrival_Date_Time,
                }));
                SetInvoiceData(output.filter((item) => {
                    return (item.quantity !== 0 && item.quantity !== 0);
                }));
            }
        });
        if (so_number && so_number !== 'NA') {
             tabFunction('orderSummary');
        }
        else {
            tabFunction('so_details');
         }

       
    }, []);

    const handleClick = (value) => {
        SetTabShow(value);
    }
    const invoiceExcelDate = (date) => {
        return `${date.slice(0, 4)}/${date.slice(4, 6)}/${date.slice(6, 8)}`;
    }
    return (
        <>
            <section className="order-details-wrapper">

                <DetailsHeader login_id={login_id} poDetails={props.location.state.po_number} distributorId={distributorId} headerData={props.location.state} history={props.history} />
                <div className="tabs">
                    {so_number && so_number!=='NA' && ( <button so_number className={`tablink ${tabShow === 'orderSummary'?'active':''} `} onClick={() => { tabFunction('orderSummary') }}> Order Summary</button>)}
                    <button className={`tablink ${tabShow === 'so_details' ? 'active' : ''}`} onClick={() => { tabFunction('so_details') }}>SO Details</button>
                    {delivery_no && delivery_no.length ? <button className={`tablink ${tabShow === 'delivery' ? 'active' : ''}`} onClick={() => { tabFunction('delivery') }}>Deliveries</button> : ''}
                    {invoice_no && invoice_no.length ? <button className={`tablink ${tabShow === 'invoices' ? 'active' : ''}`} onClick={() => { tabFunction('invoices') }}>Invoices</button> : ''}
                    {so_number && so_number.length  && soDetails.length>0 && rorData && rorData.length>0 ? <button className={`tablink ${tabShow === 'ror_details' ? 'active' : ''}`} onClick={() => { tabFunction('ror_details') }}>Reason of Rejection</button> : ''}
                </div>
                { so_number && so_number !== 'NA' && (
                    tabShow === 'orderSummary' ? <OrderSummary distributorId={login_id} so_number={so_number} totalQuantity={totalQuantityTonnage}  sendRORValue={handleClick}  deliveryData={deliveryData} invoiceData={invoiceData} soDetails={soDetails} /> : ''
                )}
                {
                    tabShow === 'so_details' ?
                        <DeliveryDetailsTable type={'so_details'} tableItems={soDetails} so_number={so_number} distributorName={region_details.name} distributorCode={region_details.id} role={role} salesDetails={soDetails[0]} visible={true} history={browserHistory} rorData={rorData} sendRORValue = {handleClick}/> :
                        ((tabShow === 'delivery' && delivery_no && delivery_no.length) ?
                            <DeliveriesTable type={'delivery'} distributorId={distributorId} tableItems={deliveryData} headerData={headerDataValue} delivery_no={delivery_no} invoice_no={invoice_no} history={browserHistory} /> :
                            (
                                (tabShow === 'invoices' && invoice_no && invoice_no.length) ?
                                    <InvoiceDetailsTable type={'invoice'} distributorId={distributorId} tableItems={invoiceData} headerData={headerDataValue} delivery_no={delivery_no} invoice_no={invoice_no} history={browserHistory} /> :
                                    ''
                       
                            )) 
                       }
                       {((tabShow === 'ror_details'  && rorData && rorData.length) ?
                                    <RorTable type={'ror_details'} distributorId={distributorId} tableItems={rorData} headerData={headerDataValue}  delivery_no={delivery_no} so_number={so_number} invoice_no={invoice_no} history={browserHistory}></RorTable> : '')}
                {tabShow!== 'orderSummary' && (<>
                {(soDetails && soDetails.length > 0 && deliveryData && deliveryData.length > 0 && invoiceData && invoiceData.length > 0 && rorData.length<0 ) ?
                    <div className="details-download-btn">
                        <ExcelFile filename={`SO_Details_${new Date().getFullYear() + '_' + (new Date().getMonth() + 1) + '_' + new Date().getDate()}`} element={<button>Download Data</button>}>
                            <ExcelSheet data={soDetails} name="SO Details">
                                <ExcelColumn label="SO Number" value="sales_order_number" />
                                <ExcelColumn label="SO Date" value={(col) => invoiceExcelDate(col.sales_order_date)} />
                                <ExcelColumn label="Material" value="material" />
                                <ExcelColumn label="Material Code" value="code" />
                                <ExcelColumn label="Quantity" value="quantity" />
                                <ExcelColumn label="Sales Unit" value="sales_unit" />
                                <ExcelColumn label="Net Value in Rs." value="net_value" />
                                <ExcelColumn label="Status" value="status" />
                            </ExcelSheet>
                            <ExcelSheet data={deliveryData} name="Delivery Details">
                                <ExcelColumn label="Delivery Number" value="delivery" />
                                <ExcelColumn label="Delivery Date" value={(col) => invoiceExcelDate(col.delivery_date)} />
                                <ExcelColumn label="Material" value="material" />
                                <ExcelColumn label="Material Code" value="code" />
                                <ExcelColumn label="Quantity" value="quantity" />
                                <ExcelColumn label="Batch Number" value="batch" />
                                <ExcelColumn label="Sales Unit" value="sales_unit" />
                                <ExcelColumn label="Pack Type" value="pack_type" />
                                <ExcelColumn label="Status" value="status" />
                            </ExcelSheet>
                            <ExcelSheet data={invoiceData} name="Invoice Details">
                                <ExcelColumn label="Invoice Number" value="invoice" />
                                <ExcelColumn label="Invoice Date" value={(col) => invoiceExcelDate(col.invoice_date)} />
                                <ExcelColumn label="Material" value="material" />
                                <ExcelColumn label="Material Code" value="code" />
                                <ExcelColumn label="Quantity" value="quantity" />
                                <ExcelColumn label="Sales Unit" value="sales_unit" />
                                <ExcelColumn label="Pack Type" value="pack_type" />
                                <ExcelColumn label="Amount in Rs." value="value" />
                            </ExcelSheet>
                        </ExcelFile>
                    </div> : (soDetails && soDetails.length > 0 && deliveryData && deliveryData.length > 0) ? <div className="details-download-btn">
                        <ExcelFile filename={`SO_Details_${new Date().getFullYear() + '_' + (new Date().getMonth() + 1) + '_' + new Date().getDate()}`} element={<button>Download Data</button>}>
                            <ExcelSheet data={soDetails} name="SO Details">
                                <ExcelColumn label="SO Number" value="sales_order_number" />
                                <ExcelColumn label="SO Date" value={(col) => invoiceExcelDate(col.sales_order_date)} />
                                <ExcelColumn label="Material" value="material" />
                                <ExcelColumn label="Material Code" value="code" />
                                <ExcelColumn label="Quantity" value="quantity" />
                                <ExcelColumn label="Sales Unit" value="sales_unit" />
                                <ExcelColumn label="Net Value in Rs." value="net_value" />
                                <ExcelColumn label="Status" value="status" />
                            </ExcelSheet>
                            <ExcelSheet data={deliveryData} name="Delivery Details">
                                <ExcelColumn label="Delivery Number" value="delivery" />
                                <ExcelColumn label="Delivery Date" value={(col) => invoiceExcelDate(col.delivery_date)} />
                                <ExcelColumn label="Material" value="material" />
                                <ExcelColumn label="Material Code" value="code" />
                                <ExcelColumn label="Quantity" value="quantity" />
                                <ExcelColumn label="Batch Number" value="batch" />
                                <ExcelColumn label="Sales Unit" value="sales_unit" />
                                <ExcelColumn label="Pack Type" value="pack_type" />
                                <ExcelColumn label="Status" value="status" />
                            </ExcelSheet>
                        </ExcelFile>
                    </div> : (soDetails && soDetails.length > 0 && !rorData && rorData.length<0) ? <div className="details-download-btn">
                        <ExcelFile filename={`SO_Details_${new Date().getFullYear() + '_' + (new Date().getMonth() + 1) + '_' + new Date().getDate()}`} element={<button>Download Data</button>}>
                            <ExcelSheet data={soDetails} name="SO Details">
                                <ExcelColumn label="SO Number" value="sales_order_number" />
                                <ExcelColumn label="SO Date" value={(col) => invoiceExcelDate(col.sales_order_date)} />
                                <ExcelColumn label="Material" value="material" />
                                <ExcelColumn label="Material Code" value="code" />
                                <ExcelColumn label="Quantity" value="quantity" />
                                <ExcelColumn label="Sales Unit" value="sales_unit" />
                                <ExcelColumn label="Net Value in Rs." value="net_value" />
                                <ExcelColumn label="Status" value="status" />
                            </ExcelSheet>
                        </ExcelFile>
                    </div> : ''
                }</>)}
            
            </section>
           (
            <div className="amount-footer">
                <div className="amount-footer-text">
                    TOTAL QUANTITY
                </div>
                <div className="amount-value">
                    <span className="amount">
                        {totalQuantityTonnage > 0 ? totalQuantityTonnage.toFixed(2) + ' TONN' : '-'}
                    </span>
                </div>
                <div className="amount-footer-text">
                    TOTAL NET VALUE 
                </div>
                <div className="amount-value">                  
                {totalNetValue > 0 ? 
                (<span className="amount">
                <span style={{ fontWeight: "bold" }}> &#8377;   </span>       
                {totalNetValue.toFixed(2)}     
                </span>) : 
               <span className="amount">-</span>}     
                </div>
            </div>)
        </>
    )
}

const mapStateToProps = (state, ownProps) => {
    return {
        po_details: state.dashboard.get('po_details'),
        region_details: state.dashboard.get('region_details'),
    }
}
const mapDispatchToProps = (dispatch, ownProps) => {
    return {
        getMaintenanceRequests: () =>
            dispatch(Actions.getMaintenanceRequests()),
        listSODetails: (soNumber, login_id) =>
            dispatch(Action.listSODetails(soNumber, login_id)),
        listSalesOrderDelivery: (deliveryNumber, login_id) =>
            dispatch(Action.listSalesOrderDelivery(deliveryNumber, login_id)),
        listInvoiceOrderDelivery: (invoiceNumber, login_id) =>
            dispatch(Action.listInvoiceOrderDelivery(invoiceNumber, login_id)),
    }

}

const ConnectOrderDetail = connect(
    mapStateToProps,
    mapDispatchToProps
)(OrderDetail)

export default ConnectOrderDetail;
