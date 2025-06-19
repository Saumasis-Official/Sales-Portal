import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import Loader from '../../../components/Loader';
import Panigantion from '../../../components/Panigantion';
import '../Questionnaire/survey.css';
import '../../distributor/OrderDetail/OrderDetailsTable.css';
import './Mtecom.css';
import Util from '../../../util/helper/index';

const PoDetailsTable = props => {
    const { tableItems, updatedLimit, updatedOffset, filterKey } = props;

    const [limit, setLimit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [pageNo, setPageNo] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        updatedLimit(limit);
        updatedOffset(offset);
    }, [limit, offset]);

    useEffect(() => {
        setLimit(10);  
        setOffset(0); 
        setPageNo(1);  
    }, [filterKey]); 

    const onChangePage = (page, itemsPerPage) => {
      setLimit(itemsPerPage)
      setOffset((page - 1) * limit)
      setPageNo(page)
    }
    
    return (
            <>
            <div className='admin-dashboard-table po-details-table Mtecom-TableHeader'>
            <Loader>
            <div className = 'fixed-table-header'>
            <table>
                    <thead>
                        <tr>
                            <th className="sub-header width15" style={{ width: '8%' }}>Line Item ID</th>
                            <th className="sub-header width15" style={{ width: '8%' }}>EAN</th>
                            <th className="sub-header width15" style={{ width: '10%' }}>Customer Product ID</th>
                            <th className="sub-header width15" style={{ width: '15%' }}>Customer Product Description</th>
                            <th className="sub-header width15" style={{ width: '10%' }}>PSKU</th>
                            <th className="sub-header width15" style={{ width: '10%' }}>PSKU Description</th>
                            <th className="sub-header width15" style={{ width: '10%' }}>Child SKU</th>
                            <th className="sub-header width25" style={{ width: '10%' }}>Child SKU Description</th>
                            <th className="sub-header width15" style={{ width: '10%' }}>Status</th>
                            <th className="sub-header width20" style={{ width: '30%' }}>Message</th>
                            <th className="sub-header width20" style={{ width: '100%' }}>SAP Error</th>
                            <th className="sub-header width15" style={{ width: '8%' }}>PO Qty</th>
                            <th className="sub-header width15" style={{ width: '8%' }}>PO UOM</th>
                            <th className="sub-header width15" style={{ width: '8%' }}>SO Qty (CV)</th>
                            <th className="sub-header width15" style={{ width: '8%' }}>Allocated Qty (CV)</th>
                            <th className="sub-header width15" style={{ width: '8%' }}>ROR Qty (CV)</th>
                            <th className="sub-header width15" style={{ width: '8%' }}>Remaining Qty (Pieces)</th> 
                            <th className="sub-header width15" style={{ width: '8%' }}>PO ToT (%)</th>
                            <th className="sub-header width15" style={{ width: '8%' }}>SAP ToT (%)</th>
                            <th className="sub-header width15" style={{ width: '8%' }}>MRP (₹)</th>
                            <th className="sub-header width15" style={{ width: '8%' }}>SAP MRP (₹)</th>
                            <th className="sub-header width15" style={{ width: '15%' }}>Switch Over SKU</th>
                            <th className="sub-header width15" style={{ width: '8%' }}>Caselot</th> 
                            <th className="sub-header width15" style={{ width: '8%' }}>SAP Caselot</th> 
                            <th className="sub-header width15" style={{ width: '8%' }}>Base Price(₹)</th> 
                            <th className="sub-header width15" style={{ width: '8%' }}>SAP Base price (₹)</th> 
                            <th className="sub-header width15" style={{ width: '8%' }}>Landing Price(₹)</th>
                            <th className="sub-header width15" style={{ width: '8%' }}>SAP Landing Price(₹)</th>
                            <th className="sub-header width15" style={{ width: '15%' }}>Invoice Number</th>
                            <th className="sub-header width15" style={{ width: '8%' }}>Invoice Date</th>
                            <th className="sub-header width15" style={{ width: '8%' }}>Invoice Qty</th>
                            <th className="sub-header width15" style={{ width: '8%' }}>Invoice MRP(₹)</th>
                            <th className="sub-header width15" style={{ width: '8%' }}>Invoice Base Price(₹)</th>
                            <th className="sub-header width15" style={{ width: '8%' }}>Invoice UOM</th>
                          
                        </tr>
                    </thead>
                    <tbody style={{ textAlign: 'center' }}>
                            { tableItems && tableItems?.item_data?.length > 0
                                && (tableItems?.item_data?.map((data, index) => {
                                    const isFailed = data?.status &&data.status.includes("Failed");
                                    return (
                            <tr key={index} className={isFailed ? 'red' : ''} >   
                                <td>{data?.item_number ? data?.item_number : "-"}</td>
                                <td>{data?.ean ? data?.ean : "-"}</td>
                                <td>{data?.customer_product_id ? data?.customer_product_id : "-"}</td>
                                <td>{data?.po_item_description ? data?.po_item_description : "-"}</td>
                                <td>{data?.psku_code ? data?.psku_code : "-"}</td>
                                <td>{data?.psku_description ? data?.psku_description : "-"}</td>
                                <td>{data?.system_sku_code ? data?.system_sku_code : "-"}</td>
                                <td>{data?.system_sku_description ? data?.system_sku_description : "-"}</td>
                                <td>{data?.status ? data?.status : "-"}</td>
                                <td>{data?.message ? data?.message : "-" }</td>
                                <td>{data?.ror_description ? data?.ror_description : "-" }</td>
                                <td>{data?.target_qty }</td>
                                <td>{data?.uom ? data?.uom : "-" }</td>
                                <td>{data?.so_qty || data?.so_qty == 0 ? data?.so_qty : "-" }</td>
                                <td>{data?.allocated_qty ?? 0}</td>
                                <td>{data?.so_qty - data?.allocated_qty}</td>
                                <td>{data?.remaining_caselot ? data?.remaining_caselot : "-" }</td>
                                <td>{data?.tot || data?.tot == 0 ? data?.tot : "-"}</td>
                                <td>{data?.sap_tot || data?.sap_tot == 0 ? data?.sap_tot : "-"}</td>
                                <td>{data?.mrp || data?.mrp == 0 ? data?.mrp : "-"}</td>
                                <td>{data?.updated_mrp || data?.updated_mrp == 0 ? data?.updated_mrp : "-"}</td>
                                <td>{data?.switchover_sku ? data?.switchover_sku : "-"}</td>
                                <td>{data?.caselot || data?.caselot == 0 ? data?.caselot : "-" }</td>
                                <td>{data?.updated_caselot || data?.updated_caselot == 0 ? data?.updated_caselot : "-" }</td> 
                                <td>{data?.base_price || data?.base_price == 0 ? data?.base_price : "-" }</td>
                                <td>{data?.updated_base_price  || data?.updated_base_price == 0 ? data?.updated_base_price : "-" }</td>
                                <td>{data?.landing_price ? data?.landing_price : "-" }</td>
                                <td>{data?.updated_landing_price || data?.updated_landing_price == 0 ? data?.updated_landing_price : "-" }</td>
                                <td>{data?.invoice_number ? data?.invoice_number : "-" }</td>
                                <td>{data?.invoice_date && !isNaN(new Date(data?.invoice_date).getTime()) ? Util.formatDate(new Date(data?.invoice_date)) : "-"}</td>
                                <td>{data?.delivery_quantity || data?.delivery_quantity == 0 ? data?.delivery_quantity : data?.invoice_quantity  ? data?.invoice_quantity : '-' }</td>
                                <td>{data?.invoice_mrp || data?.invoice_mrp == 0 ? data?.invoice_mrp : "-" }</td> 
                                <td>{data?.invoice_base_price || data?.invoice_base_price == 0 ? data?.invoice_base_price : "-" }</td> 
                                <td>{data?.invoice_uom ? data?.invoice_uom : "-" }</td> 
                            </tr>
                            )
                            }))}
                        </tbody>
                </table> 
                </div>
            </Loader>
            {!(tableItems?.item_data?.length > 0) && (<div className='NoDataDiv'>
          <b> No data available.</b>
        </div>)}
        </div>
        <Panigantion
                data={tableItems?.item_data ? tableItems?.item_data : []}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
                itemsCount={tableItems.total_count}
                setModifiedData={onChangePage}
                pageNo={pageNo}
            />
            </>
    )

}
const mapStateToProps = () => {
    return {}
}
const mapDispatchToProps = () => {
    return {}
}

const ConnectPODetailsTable = connect(
    mapStateToProps,
    mapDispatchToProps
)(PoDetailsTable)

export default ConnectPODetailsTable;
