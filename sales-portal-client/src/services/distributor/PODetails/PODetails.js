import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import ReactExport from "react-data-export";
import jwt from 'jsonwebtoken';
import Auth from '../../../util/middleware/auth';
import OrderDetailsTable from '../OrderDetail/DeliveryDetailsTable';
import * as Action from '../actions/dashboardAction';
import { Spinner } from '../../../components';
import Util from '../../../util/helper/index';
import './PoDetails.css';
import { authenticatedUsersOnly } from '../../../util/middleware/index';

let PODetails = (props) => {
  const browserHistory = props.history;
  //Excel variable
  const ExcelFile = ReactExport.ExcelFile;
  const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
  const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;
  if (props.location.pathname.split('/')[1] === 'distributor') {
    authenticatedUsersOnly(props.location.pathname, props.history);
  }

  const { delivery_no, invoice_no, so_number, so_date, po_number, po_date, distributorId } = props.location.state
  let access_token = Auth.getAccessToken();
  let admin_access_token = Auth.getAdminAccessToken();

  let role = Auth.getRole()
  let login_id = '';

  if (access_token || admin_access_token) {
    if (role) {
      login_id = distributorId
    } else {
      login_id = jwt.decode(access_token).login_id;
    }
  } else {
    browserHistory.push('/');
  }

  const {
    loading,
    materials,
    po_details,
    region_details,
    warehouses,
  } = props;
  const { market } = region_details;
  const [itemSet, setItemSet] = useState([]);
  const [PO_DATE, setPO_DATE] = useState(po_date || '');
  const [PO_NUMBER, setPO_NUMBER] = useState(po_number || '');
  const [shippingData, setShippingData] = useState({});
  const [unloadingData, setUnloadingData] = useState({});
  const [soNumber, setSoNumber] = useState(so_number || '');
  const [soDate, setSoDate] = useState(so_date || '');
  const [totalQuantityTonnage, setTotalQuantityTonnage] = useState(0);
  const [rdd, setRdd] = useState('');
  const [poDetails, setPoDetails] = useState({});

  useEffect(() => {
    if (po_details && po_details?.length && materials.length) {
      const pos = po_details?.find((item) => item.SO_NUMBER === so_number) || po_details[0];
      setPoDetails(pos);
      const { Itemset, partnerset, PURCH_DATE, PURCH_NO } = pos;
      let items = [];
      setPO_NUMBER(PURCH_NO);
      setPO_DATE(PURCH_DATE);
      setRdd(Itemset[0]?.RDD || '');
      if (PURCH_NO.includes('DBO') || PURCH_NO.includes('AOR') || PURCH_NO.includes('RO') || PURCH_NO.includes('AOS') || PURCH_NO.includes('CCO')) {
        items = Itemset.map((item) => {
          return materials
            .map((element) => {
              if (item.MATERIAL === element.code) {
                const obj = {
                  material: item.DESCRIPTION || element.description,
                  code: item.MATERIAL,
                  quantity: item.REQ_QTY,
                  sales_unit: item.SALES_UNIT || element.sales_unit,
                  pack_type: item.PACK_TYPE || element.pak_type,
                  buom: item.BUOM,
                  tentative: item.TENTATIVE,
                  Quantity_ton: item.Quantity_Ton,
                  stock_in_hand: (item?.stock_in_hand && item.stock_in_hand !== '') ? item.stock_in_hand : '-',
                  stock_in_transit: (item?.stock_in_transit && item.stock_in_transit !== '') ? item.stock_in_transit : '-',
                  open_order: (item?.open_order && item.open_order !== '') ? item.open_order : '-',
                };
                if (PURCH_NO.includes('AOR') || PURCH_NO.includes('AOS')) {
                  obj.original_suggested_quantity = item.original_quantity ?? 0;
                }
                return obj;
              }
            })
            .filter((i) => i);
        }).flat();
        setItemSet(items);

        let totalQuantity = 0;
        let tonn = [];
        if(items.length > 0){
          items?.forEach(element => {
            if(element.hasOwnProperty('Quantity_ton') && (element.Quantity_ton !== null && element.Quantity_ton !== undefined && element.Quantity_ton !== '') ){
              tonn = element.Quantity_ton.split(" ");
              totalQuantity += Number(tonn[0]);
            }
          });
        }
        setTotalQuantityTonnage(totalQuantity);
      }
      else if (PURCH_NO.includes('LIQ')) {
        items = Itemset.map((item) => {
          return {
            material: item.DESCRIPTION,
            code: item.MATERIAL,
            quantity: item.REQ_QTY,
            sales_unit: item.SALES_UNIT,
            pack_type: item.PACK_TYPE,
            buom: item.BUOM,
            tentative: item.TENTATIVE,
            Quantity_ton: item.Quantity_Ton,
            stock_in_hand: (item?.stock_in_hand && item.stock_in_hand !== '') ? item.stock_in_hand : '-',
            stock_in_transit: (item?.stock_in_transit && item.stock_in_transit !== '') ? item.stock_in_transit : '-',
            open_order: (item?.open_order && item.open_order !== '') ? item.open_order : '-',
          };
        }).flat()
        setItemSet(items);

        let totalQuantity = 0;
        let tonn = [];
        if (items.length > 0) {
          items?.forEach(element => {
            if (element.hasOwnProperty('Quantity_ton') && (element.Quantity_ton !== null && element.Quantity_ton !== undefined && element.Quantity_ton !== '')) {
              tonn = element.Quantity_ton.split(" ");
              totalQuantity += Number(tonn[0]);
            }
          });
        }
        setTotalQuantityTonnage(totalQuantity);

      } else if (PURCH_NO.includes('SFL')) {
        items = Itemset.map((item) => {
          return {
            material: item.DESCRIPTION,
            code: item.MATERIAL,
            quantity: item.REQ_QTY,
            sales_unit: item.SALES_UNIT,
            pack_type: item.PACK_TYPE,
            buom: item.BUOM,
            tentative: item.TENTATIVE,
            Quantity_ton: item.Quantity_Ton,
            stock_in_hand: (item?.stock_in_hand && item.stock_in_hand !== '') ? item.stock_in_hand : '-',
            stock_in_transit: (item?.stock_in_transit && item.stock_in_transit !== '') ? item.stock_in_transit : '-',
            open_order: (item?.open_order && item.open_order !== '') ? item.open_order : '-',
          };
        }).flat()
        setItemSet(items);

        let totalQuantity = 0;
        let tonn = [];
        if (items.length > 0) {
          items?.forEach(element => {
            if (element.hasOwnProperty('Quantity_ton') && (element.Quantity_ton !== null && element.Quantity_ton !== undefined && element.Quantity_ton !== '')) {
              tonn = element.Quantity_ton.split(" ");
              totalQuantity += Number(tonn[0]);
            }
          });
        }
        setTotalQuantityTonnage(totalQuantity);

      }
      else if (PURCH_NO.includes('BO')) {
       
        let objectHistory = {}
        Itemset.forEach(item => {
         if (objectHistory.hasOwnProperty(item.RDD + " " + item.MATERIAL)) {
            let newData = objectHistory[item.RDD + " " + item.MATERIAL]
            let data = [];
          
            if (newData != null) {
                data.push({
                ...item,
                Quantity_Ton: String(+newData[0].Quantity_Ton.replaceAll('TO', '') + +item.Quantity_Ton.replaceAll('TO', '')),
                BUOM: String(+newData[0].BUOM.replaceAll('KG', '') + +item.BUOM.replaceAll('KG', '')),
                TENTATIVE: String(+newData[0].TENTATIVE + +item.TENTATIVE),
                TARGET_QTY: String(+newData[0].TARGET_QTY + +item.TARGET_QTY),
                REQ_QTY: String(+newData[0].REQ_QTY + +item.REQ_QTY),


              })
              objectHistory[item.RDD + " " + item.MATERIAL] = data;
            }
          }
          else {
            objectHistory[item.RDD + " " + item.MATERIAL] = [item];
          }
           })
       
        let newList = []
        for (let item in objectHistory) {
          let total_qunatity_ton = 0;
          objectHistory[item].forEach(item => {
            newList.push({
              material: item.DESCRIPTION,
              code: item.MATERIAL,
              quantity: item.REQ_QTY,
              sales_unit: item.SALES_UNIT,
              pack_type: item.PACK_TYPE,
              buom: item.BUOM + " " + 'KG',
              tentative: item.TENTATIVE,
              Quantity_ton: item.Quantity_Ton + " " + 'TO',
              stock_in_hand: (item?.stock_in_hand && item.stock_in_hand !== '') ? item.stock_in_hand : '-',
              stock_in_transit: (item?.stock_in_transit && item.stock_in_transit !== '') ? item.stock_in_transit : '-',
              open_order: (item?.open_order && item.open_order !== '') ? item.open_order : '-'

            })

            total_qunatity_ton += Number(item.Quantity_Ton.split('TO')[0]);
            setTotalQuantityTonnage(Number(total_qunatity_ton));
          })

        }
        setItemSet(newList);
      }

      let points = {};

      partnerset.forEach((item) => {
        if (!item.PARTN_NAME) {
          if (item.PARTN_ROLE === 'WE' || item.PARTN_ROLE === 'SH') {
            points['shipping_point'] = item.PARTN_NUMB;
          } else if (item.PARTN_ROLE === 'Y1') {
            points['unloading_point'] = item.PARTN_NUMB;
          }
        } else {
          if (item.PARTN_ROLE === 'WE' || item.PARTN_ROLE === 'SH') {
            setShippingData({
              PARTN_ROLE: 'shipping_point',
              PARTN_CODE: item.PARTN_NUMB,
              PARTN_NAME: item.PARTN_NAME,
            });
          } else if (item.PARTN_ROLE === 'Y1') {
            setUnloadingData({
              PARTN_ROLE: 'unloading_point',
              PARTN_CODE: item.PARTN_NUMB,
              PARTN_NAME: item.PARTN_NAME,
            });
          }
        }
      });

      if (points['shipping_point'] && warehouses['shipping_point']) {
        warehouses['shipping_point'].forEach((i) => {
          if (i.partner_code === points['shipping_point']) {
            setShippingData({
              PARTN_ROLE: 'shipping_point',
              PARTN_CODE: i.partner_code,
              PARTN_NAME: i.partner_name,
            });
          }
        });
      }

      if (points['unloading_point'] && warehouses['unloading_point']) {
        warehouses['unloading_point'].forEach((i) => {
          if (i.partner_code === points['unloading_point']) {
            setUnloadingData({
              PARTN_ROLE: 'unloading_point',
              PARTN_CODE: i.partner_code,
              PARTN_NAME: i.partner_name,
            });
          }
        });
      }
    }
    return () => {
      setShippingData({});
      setUnloadingData({});
    };
  }, [po_details?.length, materials, warehouses]);

  useEffect(() => {
    if (login_id && login_id !== '') {
      if ((warehouses &&
        Object.keys(warehouses).length === 0) ||
        (warehouses.shipping_point.length === 0 && warehouses.unloading_point.length === 0)
      ) {
        props.getWarehouseDetails(login_id);
      }
      if (materials.length === 0) {
        const {is_nourishco} = region_details;
        props.getAllMaterials(login_id,is_nourishco);
      }
      if (!Array.isArray(po_details) || po_details?.length === 0){
        props.getPODetails(po_number, login_id);
      }
    }
  },[] );

  const onClickCrossButton = (e) => {
    e.preventDefault();
    if (distributorId) {
      browserHistory.push({ pathname: "/admin/distributor", state: { distributorId } });
    } else {
      browserHistory.push('/distributor/dashboard');
    }
  };

  const soDetailHandler = (delivery_no, invoice_no, so_number, so_date, po_number, po_date,shippingData) => {
    let pathUrl = ''
    if (distributorId) {
      pathUrl = '/admin/sales-order'
    } else {
      pathUrl = '/distributor/sales-order'
    }
    browserHistory.push({
      pathname: pathUrl, state: {
        shippingData:shippingData,
        delivery_no: delivery_no,
        invoice_no: invoice_no,
        so_number: so_number,
        so_date: so_date,
        rdd: rdd,
        po_number: po_number,
        po_date: po_date,
        market: market,
        distributorId
      }
    })
  };

  return (
    <>
      <section className="main-content po-details-page">
        <div className="po-details-head">
          <div className="po-details-col-1">
            <div className="po-details">
              <ul>
                <li>PO Number</li>
                <li className="field-val">
                  {PO_NUMBER ? PO_NUMBER : '-'}
                </li>
                <li className="field-attr">
                  <span className="date">PO Date</span>{' '}
                  {PO_DATE ? Util.formatDate(PO_DATE,'DD.MM.YYYY') : '-'}
                </li>
              </ul>
            </div>
          </div>

          <div className="po-details-col-1">
            <div className="po-details">
              <ul>
                <li>SO Number</li>
                <li className="field-val">
                  {soNumber ? <a onClick={() => soDetailHandler(delivery_no, invoice_no, so_number, so_date, po_number, po_date,shippingData)}>
                    {soNumber}</a> : '-'
                  }

                </li>
                <li className="field-attr">
                  <span className="date">SO Date</span>{' '}
                  {soDate ? Util.formatDate(soDate) : '-'}
                </li>
                {rdd && <li className="field-attr">
                  <span className="date">RDD</span>{' '}
                  {Util.formatDate(rdd,'DD.MM.YYYY')} 
                </li>}
              </ul>
            </div>
          </div>

          <div className="po-details-col-2">
            <div className="po-details">
              <ul>
                <li>Ship To</li>
                <li className="field-val">
                  {shippingData.PARTN_NAME}
                </li>
                <li className="field-attr">
                  <span>Ship to customer Code</span>{' '}
                  {shippingData.PARTN_CODE}
                </li>
                <li className="field-attr">
                  <span>Market</span> {market}
                </li>
              </ul>
            </div>
          </div>

          <div className="po-details-col-2">
            <div className="po-details">
              <ul>
                <li>Unloading Point</li>
                <li className="field-val">
                  {unloadingData.PARTN_NAME
                    ? unloadingData.PARTN_NAME
                    : shippingData.PARTN_NAME
                  }
                </li>
                <li className="field-attr">
                  <span>
                    Unloading Point code
                  </span>{' '}
                  {unloadingData.PARTN_CODE
                    ? unloadingData.PARTN_CODE
                    : shippingData.PARTN_CODE}
                </li>
              </ul>
            </div>
          </div>

          <img
            src="/assets/images/cross-icon.svg"
            alt="cancel"
            className="back-button"
            onClick={(e) => onClickCrossButton(e)}
          />
        </div>

        <Spinner loading={loading}>
          <div className="sales-order-block new-sales-order-block">
            {itemSet.length ? (
              <OrderDetailsTable
                po_number = {PO_NUMBER}
                so_number={so_number}
                distributorName={region_details.name}
                distributorCode={region_details.id}
                salesDetails={1408}
                role={role}
                visible={false}
                tableItems={itemSet ? itemSet : []}
              />
            ) : (
              ''
            )}

          </div>
        </Spinner>
        {itemSet && itemSet.length > 0 &&
          <div className="po-details-download-btn">
            <ExcelFile filename={`PO_Details_${new Date().getFullYear() + '_' + (new Date().getMonth() + 1) + '_' + new Date().getDate()}`} element={<button>Download Data</button>}>
              <ExcelSheet data={itemSet} name={`${po_number}`}>
                <ExcelColumn label="Material" value="material" />
                <ExcelColumn label="Material Code" value="code" />
                <ExcelColumn label="Quantity" value="quantity" />
                <ExcelColumn label="Sales Unit" value="sales_unit" />
                <ExcelColumn label="Stock in Hand" value="stock_in_hand" />
                <ExcelColumn label="Stock In Transit" value="stock_in_transit" />
                <ExcelColumn label="Open Order" value="open_order" />
              </ExcelSheet>
            </ExcelFile>
          </div>
        }
      </section>
      <div className="amount-footer">
        <div className="amount-footer-text">
          TOTAL QUANTITY
        </div>
        <div className="amount-value">
          <span className="amount">
            {totalQuantityTonnage > 0 ? `${totalQuantityTonnage.toFixed(2)} TONN` : '-'}
          </span>
        </div>
        <div className="amount-footer-text">
          TENTATIVE ORDER VALUE
        </div>
        <div className="amount-value">                  
                {poDetails.OrderAmount > 0 ? 
                (<span className="amount">  
                <span style={{fontWeight: "bold" }}> &#8377;    </span>    
                {poDetails.OrderAmount}      
                </span>) : 
               <span className="amount">-</span>}     
                </div>
      </div>
    </>
  );
};

const mapStateToProps = (state, ownProps) => {
  return {
    loading: state.dashboard.get('loading'),
    materials: state.dashboard.get('materials'),
    order_list: state.dashboard.get('order_list'),
    po_details: state.dashboard.get('po_details'),
    region_details: state.dashboard.get('region_details'),
    warehouses: state.dashboard.get('warehouses'),
  };
};
const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    listSODetails: (soNumber, login_id) =>
      dispatch(Action.listSODetails(soNumber, login_id)),
    getWarehouseDetails: (login_id) =>
      dispatch(Action.getWarehouseDetails(login_id)),
    getPODetails: (po_number, login_id) =>
      dispatch(Action.getPODetails(po_number, login_id)),
    getAllMaterials: (login_id,isNourishCo) => dispatch(Action.getAllMaterials(login_id,isNourishCo)),
  };
};

const ConnectPODetails = connect(
  mapStateToProps,
  mapDispatchToProps,
)(PODetails);

export default ConnectPODetails;
