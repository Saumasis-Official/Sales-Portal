import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import Util from '../../../util/helper/index';
import './OrderSummary.css';
import * as AdminAction from '../../admin/actions/adminAction';
import { FULL_ALLOCATION } from '../../../config/constant';
import moment from 'moment';

const OrderTrackingWorkFlowStages = {
    OrderPlaced: 'Order Placed',
    OrderAllocated: 'Order Allocated',
    DeliveryOrderCreated: 'Delivery Order Created',
    InvoiceCreated: 'Invoice Created',
    EwayBillDetails: 'Eway Bill Details',
};

let OrderSummary = (props) => {
    const { distributorId, so_number, sendRORValue, getDistributorUpcomingPDP, po_details, deliveryData, invoiceData, soDetails } = props;

    const [pdpData, setPDPData] = useState('');
    const [tableData, setTableData] = useState([]);
    const [Tat, setTat] = useState('');
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
    const [reqRdd, setreqRdd] = useState('');
    const [soDate, setSoDate] = useState('');

    const filteredPoDetails = po_details?.length ? po_details.filter((so) => so.SO_NUMBER === so_number) : [];

    const soDetail = filteredPoDetails?.length > 0 ? filteredPoDetails[0] : null;

    useEffect(() => {
        const fetchPDPData = async () => {
            if (soDetail && soDetail?.SO_DATE) {
                const pdpdataa = await getDistributorUpcomingPDP(
                    distributorId,
                    soDetail.SO_DATE,
                    soDetail.DELIVERY_DATE_TIME ? soDetail.DELIVERY_DATE_TIME.map((deliverydate) => Util.convertDateTime(deliverydate)) : [],
                );
                if (pdpdataa) {
                    setPDPData(pdpdataa.data);
                }
            }
        };

        fetchPDPData();
    }, []);

    useEffect(() => {
        /* SOPE-4948
            Case 1: If Rdd is present. 
                    RDD(Req_Delv_Date) + TAT               
            Case 2: If Rdd is not present. 
                    (SO Date +1) + TAT
        */

        setTat(soDetail?.TAT || 0);
        setreqRdd(soDetail?.Req_Delv_Date ? Util.formatRDDDate(soDetail?.Req_Delv_Date) : '');
        setSoDate(soDetail?.SO_DATE || '');
        if (reqRdd) {
            const [day, month, year] = reqRdd.split('.').map(Number);
            const rddDate = new Date(year, month - 1, day);
            rddDate.setDate(rddDate.getDate() + Tat);
            const formattedExpDate = Util.formatDate(rddDate, 'DD-MMM-YYYY');
            setExpectedDeliveryDate(formattedExpDate);
        } else if (!reqRdd && soDate) {
            const date = new Date(soDate);
            date.setDate(date.getDate() + 1 + Tat);
            const formattedExpDate = Util.formatDate(date, 'DD-MMM-YYYY');
            setExpectedDeliveryDate(formattedExpDate);
        }
    }, [Tat, expectedDeliveryDate, reqRdd]);

    useEffect(() => {
        const data = calculateTableData();
        setTableData(data);
    }, [deliveryData, invoiceData, soDetails, pdpData, po_details]);

    const formattedDayAndDate = Util.formatDayAndDate(pdpData.upcomingSOPDPDate);

    const totalSoDetailQuantities = Util.calculateTotalQuantity(soDetails, 'quantity', 'sales_order_number');

    const totalDeliveryQuantities = Util.calculateTotalQuantity(deliveryData, 'quantity', 'delivery');

    const totalInvoiceQuantities = Util.calculateTotalQuantity(invoiceData, 'quantity', 'invoice');

    const handleClick = () => {
        sendRORValue('ror_details');
    };

    function getAllocationStatusAndColor() {
        if (soDetail?.rorItemset && soDetail?.rorItemset?.length > 0) {
            const fullyAllocationCount = soDetail?.rorItemset?.filter((item) => item.ror == FULL_ALLOCATION).length;
            if (soDetail.rorItemset.length === fullyAllocationCount) {
                return {
                    status: 'FULLY ALLOCATED',
                    color: 'rgb(84, 181, 11)',
                };
            } else if (fullyAllocationCount === 0) {
                return {
                    status: 'NOT ALLOCATED',
                    color: 'rgb(185 177 177)',
                };
            } else {
                return {
                    status: 'PARTIALLY ALLOCATED',
                    color: 'rgb(84, 181, 11)',
                };
            }
        }
        return {
            status: 'NOT ALLOCATED',
            color: 'rgb(185 177 177)',
        };
    }
    const allocationInfo = getAllocationStatusAndColor();

    const calculateTableData = () => {
        const result = [];

        const soDetailsObject = {
            workflowStage: OrderTrackingWorkFlowStages.OrderPlaced,
            color: 'rgb(84, 181, 11)',
            timestamp: Util.formatDateTimeFromResponse(soDetail?.SO_DATE),
            'SO NO': { value: soDetail?.SO_NUMBER ? soDetail?.SO_NUMBER : '-', weightage: 1.1 },
            'SO QTY': {
                value: totalSoDetailQuantities[soDetail?.SO_NUMBER] ? `${totalSoDetailQuantities[soDetail?.SO_NUMBER]} CV` : '-',
                weightage: 1.2,
            },
            'SO Value': {
                value: soDetail?.SO_VALUE ? `₹ ${soDetail?.SO_VALUE}` : '-',
                weightage: 1.3,
            },
            'SO Date': {
                value: soDate ? Util.formatDateTimeFromResponse(soDate) : '-',
                weightage: 1.4,
            },
            'Next PDP': {
                value: formattedDayAndDate ? formattedDayAndDate : '-',
                weightage: 2.1,
            },
            RDD: {
                value:
                    soDetail?.PO_NUMBER && soDetail?.PO_NUMBER.startsWith('BO')
                        ? Util.formatDate(soDetail?.REQ_DATE_H, 'DD.MM.YYYY')
                        : soDetail?.Req_Delv_Date
                          ? Util.convertDateTime(soDetail?.Req_Delv_Date).split(' ')[0]
                          : '-',
                weightage: 2.2,
            },
            'Expected delivery date': {
                value: expectedDeliveryDate ? expectedDeliveryDate : '-',
                weightage: 2.3,
            },
            'Exception Order Type': {
                value: soDetail?.PO_NUMBER.startsWith('BO') ? 'Bulk Order' : soDetail?.PO_NUMBER.startsWith('RO') ? 'Rush Order' : soDetail?.PDP === 'OFF' ? 'PDP Unlock' : 'None',
                weightage: 2.4,
            },
        };
        result.push(soDetailsObject);
        let allocationTime = moment(Util.formatDateTimeFromResponse(soDetail?.SO_DATE), 'DD/MM/YYYY HH:mm:ss.SSS');
        allocationTime.add(1, 'milliseconds');

        const orderAllocations = {
            workflowStage: OrderTrackingWorkFlowStages.OrderAllocated,
            color: allocationInfo.color,
            timestamp: allocationTime.format('DD/MM/YYYY HH:mm:ss.SSS'),
            Allocation: {
                value: (
                    <>
                        {soDetail && (
                            <>
                                <span>{'  ' + allocationInfo.status}</span> <br></br>
                            </>
                        )}
                        {soDetail && soDetail?.rorItemset && soDetail?.rorItemset.length > 0 && <a onClick={() => handleClick()}>Link to ROR</a>}
                    </>
                ),
                weightage: 1,
            },
        };
        result.push(orderAllocations);

        const doDetailsArr = soDetail?.DELIVERY_NO?.map((deliveryNumber, idx) => {
            const obj = {
                workflowStage: OrderTrackingWorkFlowStages.DeliveryOrderCreated,
                color: 'rgb(84, 181, 11)',
                timestamp: soDetail?.DELIVERY_DATE_TIME && Util.convertDateTime(soDetail?.DELIVERY_DATE_TIME[idx]),
                'Delivery No': { value: deliveryNumber, weightage: 1.1 },
                'DO Qty': {
                    value:
                        totalDeliveryQuantities[deliveryNumber] !== undefined && totalDeliveryQuantities[deliveryNumber] !== null
                            ? `${totalDeliveryQuantities[deliveryNumber]} CV`
                            : '-',
                    weightage: 1.2,
                },
                'DO Date': {
                    value: soDetail?.DELIVERY_DATE_TIME && soDetail?.DELIVERY_DATE_TIME[idx] ? Util.convertDateTime(soDetail?.DELIVERY_DATE_TIME[idx]) : '-',
                    weightage: 1.3,
                },
                'Next PDP': {
                    value: pdpData.upcomingDeliveryPDPDate ? Util.formatDayAndDate(pdpData.upcomingDeliveryPDPDate[idx]) : '-',
                    weightage: 2.1,
                },
                RDD: {
                    value:
                        soDetail?.PO_NUMBER && soDetail?.PO_NUMBER.startsWith('BO')
                            ? Util.formatDate(soDetail?.REQ_DATE_H, 'DD.MM.YYYY')
                            : soDetail?.Req_Delv_Date
                              ? Util.convertDateTime(soDetail?.Req_Delv_Date).split(' ')[0]
                              : '-',
                    weightage: 2.2,
                },
                'Expected delivery date': {
                    value:
                        soDetail?.PO_NUMBER && soDetail?.PO_NUMBER.startsWith('BO')
                            ? Util.formatDate(soDetail?.REQ_DATE_H, 'DD.MM.YYYY')
                            : soDetail?.Req_Delv_Date
                              ? Util.convertDateTime(soDetail?.Req_Delv_Date).split(' ')[0]
                              : '-',
                    weightage: 2.3,
                },
                'Exception Order Type': {
                    value: soDetail?.PO_NUMBER.startsWith('BO')
                        ? 'Bulk Order'
                        : soDetail?.PO_NUMBER.startsWith('RO')
                          ? 'Rush Order'
                          : soDetail?.PDP === 'OFF'
                            ? 'PDP Unlock'
                            : 'None',
                    weightage: 2.4,
                },
            };
            return obj;
        });
        if (doDetailsArr && doDetailsArr?.length > 0) {
            result.push(...doDetailsArr);
        }
        const invoiceDetailsArr = soDetail?.INVOICE_NO?.map((invoiceNumber, idx) => {
            const obj = {
                workflowStage: OrderTrackingWorkFlowStages.InvoiceCreated,
                color: 'rgb(84, 181, 11)',
                timestamp: soDetail?.INVOICE_DATE_TIME && Util.convertDateTime(soDetail?.INVOICE_DATE_TIME[idx]),
                'Invoice No': { value: invoiceNumber, weightage: 1.1 },
                'Invoice Qty': {
                    value:
                        totalInvoiceQuantities[invoiceNumber] !== undefined && totalInvoiceQuantities[invoiceNumber] !== null ? `${totalInvoiceQuantities[invoiceNumber]} CV` : '-',
                    weightage: 1.2,
                },
                'Invoice Date': {
                    value: soDetail?.INVOICE_DATE_TIME && soDetail?.INVOICE_DATE_TIME[idx] ? Util.convertDateTime(soDetail?.INVOICE_DATE_TIME[idx]) : '-',
                    weightage: 1.3,
                },
            };
            return obj;
        });

        if (invoiceDetailsArr && invoiceDetailsArr?.length > 0) {
            result.push(...invoiceDetailsArr);
        }

        const ewayBillDetails = soDetail?.EWAY_BILL_NUMBER?.map((ewayBillNumber, idx) => {
            const obj = {
                workflowStage: OrderTrackingWorkFlowStages.EwayBillDetails,
                color: 'rgb(84, 181, 11)',
                timestamp: soDetail?.EWAY_BILL_DATE_TIME && Util.convertDateTime(soDetail?.EWAY_BILL_DATE_TIME[idx]),
                'Eway Bill No': { value: ewayBillNumber, weightage: 1.1 },
                'Eway Bill Date': {
                    value: soDetail?.EWAY_BILL_DATE_TIME && soDetail?.EWAY_BILL_DATE_TIME[idx] ? Util.convertDateTime(soDetail?.EWAY_BILL_DATE_TIME[idx]) : '-',
                    weightage: 1.2,
                },
            };
            return obj;
        });
        if (ewayBillDetails && ewayBillDetails?.length > 0) {
            result.push(...ewayBillDetails);
        }

        const sortedData = result.sort((a, b) => {
            const dateA = moment(a.timestamp, 'DD/MM/YYYY HH:mm:ss');
            const dateB = moment(b.timestamp, 'DD/MM/YYYY HH:mm:ss');
            return dateA - dateB;
        });
        return sortedData;
    };

    return (
        <>
            <div className="flow-container">
                <div>
                    {tableData.map((data, index) => (
                        <>
                            <div style={{ display: 'flex' }}>
                                <div className="flex-container">
                                    <div className="circle" style={{ backgroundColor: data.color }}></div>
                                    {index !== tableData.length - 1 && <div className="vertical-line"></div>}
                                </div>
                                <div style={{ marginLeft: '10px' }}>
                                    <h3 style={{ marginBottom: '10px', marginTop: '-3px' }}>{data.workflowStage}</h3>
                                    <div className="index-block">
                                        {Object.keys(data)
                                            .filter((f) => !['workflowStage', 'timestamp', 'color'].includes(f))
                                            .sort((a, b) => {
                                                return data[a].weightage - data[b].weightage;
                                            })
                                            .map((key) => {
                                                return (
                                                    <>
                                                        <span style={{ marginRight: '10px' }}>
                                                            {data[key].weightage.toString().endsWith('.1') && data[key].weightage !== 1.1 && <div style={{ width: '100%' }}></div>}
                                                            <strong>{key}:</strong>
                                                            {'   '}
                                                            {data[key].value}
                                                        </span>
                                                    </>
                                                );
                                            })}
                                    </div>
                                </div>
                            </div>
                        </>
                    ))}
                </div>
            </div>
        </>
    );
};

const mapStateToProps = (state) => {
    return {
        po_details: state.dashboard.get('po_details'),
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        getDistributorUpcomingPDP: (data, soDate, deliveryDate) => dispatch(AdminAction.getUpcomingDistributorPDP(data, soDate, deliveryDate)),
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(OrderSummary);
