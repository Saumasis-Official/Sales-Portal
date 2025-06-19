import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import LocalAuth from '../../../util/middleware/auth';
import Auth from '../../../util/middleware/auth';
import PoDetailsTable from './PoDetailsTable';
import RDDDetailsTable from './RDDDetailsTable';
import * as Actions from '../../admin/actions/adminAction';
import { Spinner } from '../../../components';
import Util from '../../../util/helper/index';
import '../../distributor/PODetails/PoDetails.css';
import { Link } from 'react-router-dom';
import Collapse from 'antd/lib/collapse';
import { Popover } from 'antd';
import 'antd/dist/antd.css';
import './PoData.css';
import { Row, Col, notification } from 'antd';
import { CheckOutlined, UpCircleOutlined, DownCircleOutlined, CloseOutlined, DownloadOutlined } from '@ant-design/icons';
import { NO_DATA_SYMBOL } from '../../../constants';
import { hasEditPermission, hasViewPermission, pages } from '../../../persona/mdm';
import { saveAs } from 'file-saver';
import { MT_ECOM_CUSTOMER } from '../../../config/constant';
import { Button, Dropdown, Menu } from 'antd';
let POData = (props) => {
    let po_data;
    let type;
    po_data = window.localStorage.getItem('po_data');
    po_data = JSON.parse(po_data);
    type = po_data.type;
    const { poItemList, RDDItemList, customerWorkflowData, retrigger } = props;
    let role = Auth.getRole();
    const PO_NUMBER = po_data?.po_number || '';
    const SITE_CODE = po_data?.site_code || '';
    let SO_NUMBER = po_data?.so_number || '';
    const PO_DATE = po_data?.po_created_date || '';
    const SO_DATE = po_data?.so_created_date || '';
    const [poData, setPoData] = useState([]);
    const [RDDData, setRDDData] = useState([]);
    const [offset, setOffset] = useState(0);
    const [limit, setLimit] = useState(10);
    const [customerWorkflow, setCustomerWorkflow] = useState();
    const [isRetrigger, setIsRetrigger] = useState(false);
    const [appliedFilters, setAppliedFilters] = useState([]);
    const [filterKey, setFilterKey] = useState(Date.now());
    const adminAccessToken = LocalAuth.getAdminAccessToken();

    const getData = async () => {
        if (adminAccessToken) {
            let itemPayload = {
                offset: offset,
                limit: limit,
                po_number: po_data?.po_number,
                po_id: po_data?.id,
                type: type,
                invoice_number: po_data?.invoice_number,
            };
            if (appliedFilters.length > 0) {
                itemPayload.status = statusMapping[appliedFilters[0]] || appliedFilters[0];
            } else {
                delete itemPayload.status;
            }

            // Avoid calling customerWorkflowData and poItemList if offset > 0
            if (offset === 0) {
                const customer_workflow = await customerWorkflowData(po_data?.customer, 0);
                setCustomerWorkflow(customer_workflow?.body?.customerData[0]);
            }

            if (type === 'RDDData') {
                const data = await RDDItemList(limit, offset, po_data?.po_number);
                setRDDData(data?.body);
            }
            const data = await poItemList(itemPayload);
            setPoData(data?.body);
        }
    };

    const retriggerSo = async () => {
        if (adminAccessToken) {
            setIsRetrigger(true);
            const data = await retrigger({ 'PO NUMBER': PO_NUMBER, customer: po_data?.customer, site_code: SITE_CODE });

            getData();
            if (data?.body?.status_code === 200 || data?.body?.message === 'Sales order created successfully') {
                SO_NUMBER = data?.body?.so_number || '';
                po_data.so_number = SO_NUMBER;
                window.localStorage.setItem('po_data', JSON.stringify(po_data));
                notification.success({
                    message: 'Success',
                    description: data?.body?.body?.DATA || data?.body?.message,
                    duration: 4,
                    className: 'notification-success',
                });
            } else {
                notification.error({
                    message: 'Error',
                    description: data?.body?.error || 'Something went wrong',
                    duration: 5,
                    className: 'notification-red',
                });
                setIsRetrigger(false);
            }
        }
    };
    const downloadPOCopy = async () => {
        if (adminAccessToken) {
            const data = await props.downloadPO(PO_NUMBER);

            if (data?.data?.status_code === 200) {
                const blob = new Blob([data?.data?.data?.data], { type: 'application/' + data?.data?.data?.type });
                saveAs(blob, `PO_${PO_NUMBER}.${data?.data?.data?.type}`);

                notification.success({
                    message: 'Success',
                    description: data?.data?.message,
                    duration: 4,
                    className: 'notification-success',
                });
            } else {
                notification.error({
                    message: 'Error',
                    description: data?.data?.message || 'Something went wrong',
                    duration: 5,
                    className: 'notification-red',
                });
            }
        }
    };
    const downloadPODetails = async () => {
        if (adminAccessToken) {
            const data = await props.downloadPODetails(PO_NUMBER);

            if (data?.data?.status_code === 200) {
                const blob = new Blob([data?.data?.data?.data], { type: 'application/' + data?.data?.data?.type });
                saveAs(blob, `PO_${PO_NUMBER}.${data?.data?.data?.type}`);

                notification.success({
                    message: 'Success',
                    description: data?.data?.message,
                    duration: 4,
                    className: 'notification-success',
                });
            } else {
                notification.error({
                    message: 'Error',
                    description: data?.data?.message || 'Something went wrong',
                    duration: 5,
                    className: 'notification-red',
                });
            }
        }
    };
    const downloadSOReqRes = async () => {
        if (adminAccessToken) {
            const data = await props.downloadSOReqRes(PO_NUMBER);
            if (data?.data?.status_code === 200) {
                console.log(data?.data?.data?.data);
                const blob = new Blob([data?.data?.data?.data], { type: 'application/' + data?.data?.data?.type  });
                saveAs(blob, `SO_Request_Response_${PO_NUMBER}.${data?.data?.data?.type}`);
                notification.success({
                    message: 'Success',
                    description: data?.data?.message,
                    duration: 4,
                    className: 'notification-success',
                });
            } else {
                notification.error({
                    message: 'Error',
                    description: data?.data?.message || 'Something went wrong',
                    duration: 5,
                    className: 'notification-red',
                });
            }
        }
    };
    useEffect(async () => {
        getData();
    }, [offset, limit, appliedFilters]);
    const [isPanelCollapsed, setIsPanelCollapsed] = useState(true);
    const togglePanel = () => {
        setIsPanelCollapsed(!isPanelCollapsed);
    };

    const statusMapping = {
        'PO Validation': 'Validation Failed',
        'PO Acknowledgement': 'Acknowledgement Failed',
        'Article Lookup': 'Article Failed',
        'ToT Check': 'ToT Failed',
        'SO Creation': 'SO Failed',
        'MRP Check-1': 'MRP Failed',
        'Base Price Check': 'Base Price Failed',
        'Caselot Check': 'Caselot Failed',
        'MRP Check-2': 'MRP 2 Failed',
    };

    const filterDataByStatus = async (title) => {
        if (title === 'Invoicing' || title === 'ASN') {
            return;
        }
        const status = statusMapping[title] || title;
        let itemPayload = {
            offset: offset,
            limit: limit,
            po_number: po_data?.po_number,
            po_id: po_data?.id,
            type: po_data?.type,
            invoice_number: po_data?.invoice_number,
            status: status,
        };
        const response = await poItemList(itemPayload);
        setPoData(response?.body);
        setAppliedFilters([title]);
        setFilterKey(Date.now());
    };

    const removeFilter = () => {
        setAppliedFilters([]);
        setFilterKey(Date.now());
    };

    if (!poData || !poData.log_data) {
        return null;
    }
    const renderPoLabels = (item, customerWorkflow) => {
        if (
            (item.title == 'PO Validation' && customerWorkflow.po_format) ||
            (item.title == 'PO Acknowledgement' && customerWorkflow.acknowledgement) ||
            (item.title == 'Article Lookup' && customerWorkflow.article) ||
            (item.title == 'ToT Check' && customerWorkflow.tot) ||
            (item.title == 'MRP Check-1' && customerWorkflow.mrp_1) ||
            (item.title == 'Base Price Check' && customerWorkflow.base_price) ||
            (item.title == 'Caselot Check' && customerWorkflow.caselot) ||
            item.title == 'SO Creation' ||
            (item.title == 'Invoicing' && customerWorkflow.invoice) ||
            (item.title == 'MRP Check-2' && customerWorkflow.mrp_2) ||
            (item.title == 'ASN' && customerWorkflow.asn)
        ) {
            return (
                <div className="po-labels">
                    <h3>{item.title}</h3>
                    <div>{item.date && !isNaN(new Date(item.date).getTime()) ? `${Util.formatDate(item.date)} (${Util.formatTime(item.date)})` : NO_DATA_SYMBOL}</div>
                    <div>{item.request_count ? `${item.request_count} Time(s) Evaluated` : NO_DATA_SYMBOL}</div>
                </div>
            );
        } else {
            return null;
        }
    };
    const content = (item) => {
        if (item.title === 'Invoicing') {
            return (
                <div className="invoice-card">
                    {item.invoice_data.map((invoice, index) => (
                        <div key={index} className="invoice-details">
                            <div className="invoice-info">
                                <div className="invoice-id">Invoice ID : {invoice.invoice_number}</div>
                                <div className="invoice-date">
                                    Invoice Date :{' '}
                                    {invoice.invoice_date && !isNaN(new Date(invoice.invoice_date).getTime()) ? Util.formatDate(invoice.invoice_date) : NO_DATA_SYMBOL}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            );
        } else {
            return null;
        }
    };
    const getMenu = () => {

        return (
            <Menu>
            {/* Download PO Option */}
            {hasViewPermission(pages.DOWNLOAD) && MT_ECOM_CUSTOMER.includes(po_data?.customer) && (
                <Menu.Item onClick={downloadPOCopy}>
                <span>
                    Download PO
                    <DownloadOutlined style={{marginLeft: '8px'}}/>
                </span>
                </Menu.Item>
            )}

            {/* Download Details Option */}
            {hasViewPermission(pages.DOWNLOAD_PO_DETAILS) && (
                <Menu.Item onClick={downloadPODetails}>
                <span>
                    Download Details
                    <DownloadOutlined style={{marginLeft: '8px'}}/>
                </span>
                </Menu.Item>
            )}

            {/* SO Request Response Option */}
            {hasViewPermission(pages.DOWNLOAD_SO_REQ_RES) && (
                <Menu.Item onClick={downloadSOReqRes}>
                <span>
                    SO Request Response
                    <DownloadOutlined style={{marginLeft: '8px'}}/>
                </span>
                </Menu.Item>
            )}
            </Menu>
        );
        };

    const invoicesContent = poData?.log_data.map((item, index) => <div key={index}>{content(item)}</div>);

    return (
        <>
            <section className="main-content po-details-page padding-bottom-main-content">
                <div className="mt-po-details-head">
                    <div className="po-details-col-data">
                        <div className="po-details-mtecom">
                            <ul>
                                <li>
                                    <span>PO Number</span> {PO_NUMBER ? PO_NUMBER : NO_DATA_SYMBOL}
                                </li>
                                <li className="field-attr-mt">
                                    <span>PO Date</span> <span>{PO_DATE && !isNaN(new Date(PO_DATE).getTime()) ? Util.formatDate(new Date(PO_DATE)) : NO_DATA_SYMBOL}</span>
                                </li>
                            </ul>

                            <ul>
                                <li>
                                    <span>Site Code</span> <span>{SITE_CODE ? SITE_CODE : NO_DATA_SYMBOL}</span>
                                </li>
                            </ul>
                            <ul>
                                <li>
                                    <span>SO Number</span> <span>{SO_NUMBER ? SO_NUMBER : NO_DATA_SYMBOL}</span>
                                </li>
                                <li className="field-attr-mt">
                                    <span>SO Date</span> {SO_DATE && !isNaN(new Date(SO_DATE).getTime()) ? Util.formatDate(new Date(SO_DATE)) : NO_DATA_SYMBOL}
                                </li>
                            </ul>
                            {hasViewPermission(pages.RETRIGGER) && !SO_NUMBER && (
                                <div className="sync-button">
                                    <button
                                        type="submit"
                                        className={!hasEditPermission(pages.RETRIGGER) ? 'disabled-blue-btn' : 'blue-button'}
                                        onClick={retriggerSo}
                                        disabled={SO_NUMBER || isRetrigger}>
                                        <>
                                            Retrigger
                                            <img className="retrigger-icon" src="/assets/images/refresh-icon.svg" alt="" />
                                        </>
                                    </button>
                                </div>
                            )}
                            <Dropdown overlay={getMenu(props)} trigger={['hover']}>
                                <Button className="blue-button">
                                Download
                                    <DownloadOutlined style={{marginLeft: '8px',fontSize: '18px'}}/>
                                </Button>
                            </Dropdown>
                        </div>
                    </div>

                    <Link to="/admin/mt-ecom-dashboard">
                        <img src="/assets/images/cross-icon.svg" alt="cancel" className="back-button" />
                    </Link>
                </div>
                <Collapse bordered className="poDataCollapse" ghost accordion onChange={() => togglePanel()}>
                    <Collapse.Panel
                        key="1"
                        showArrow={false}
                        forceRender={false}
                        header={
                            <div className="po-custom-header">
                                <span>PO Data</span>
                                <span>
                                    <Popover placement="right" color="white" content={<div style={{ maxWidth: '100px', maxHeight: '30px' }}>PO Details</div>}>
                                        {isPanelCollapsed ? <DownCircleOutlined /> : <UpCircleOutlined />}
                                    </Popover>
                                </span>
                            </div>
                        }>
                        <Row className="po-data">
                            {poData &&
                                poData?.log_data?.length > 0 &&
                                poData?.log_data.map(
                                    (item, index) =>
                                        customerWorkflow &&
                                        customerWorkflow[item.workflow_name] && (
                                            <Col
                                                key={index}
                                                md={{ span: 8 }}
                                                lg={{ span: 8 }}
                                                xl={{ span: item.title === 'Caselot' ? 4 : 5 }}
                                                xxl={{ span: 4 }}
                                                xs={{ span: 24 }}
                                                sm={{ span: 12 }}
                                                className="po-row-collapse">
                                                <div className="displayFlex-status-div">
                                                    {item.status === 'success' ? (
                                                        <CheckOutlined className="tickIcon-greenColor-styles iconColorStyles" />
                                                    ) : item.status === 'failed' ? (
                                                        <CloseOutlined className="cancelIcon-redColor-styles iconColorStyles" onClick={() => filterDataByStatus(item.title)} />
                                                    ) : item.status === 'failedSuccess' ? (
                                                        <CheckOutlined className="tickIcon-yellowColor-styles iconColorStyles" />
                                                    ) : (
                                                        <CheckOutlined className="tickIcon-greyColor-styles iconColorStyles" />
                                                    )}

                                                    {item.title === 'Invoicing' && item.request_count > 0 && customerWorkflow.invoice ? (
                                                        <Popover content={invoicesContent} trigger="hover">
                                                            <div className="po-labels">
                                                                <h3>{item.title}</h3>
                                                                <p>
                                                                    {item.request_count} {'Invoice(s) Generated'}
                                                                </p>
                                                            </div>
                                                        </Popover>
                                                    ) : (
                                                        renderPoLabels(item, customerWorkflow)
                                                    )}
                                                </div>
                                            </Col>
                                        ),
                                )}
                        </Row>
                    </Collapse.Panel>
                </Collapse>

                {/* Applied Filters Section */}
                {appliedFilters.length > 0 && (
                    <div className="applied-filters">
                        {appliedFilters.map((filter) => (
                            <div key={filter} className="filter-applied">
                                <span>{filter}</span>
                                <span className="remove-filter" onClick={() => removeFilter(filter)}>
                                    x
                                </span>
                            </div>
                        ))}
                    </div>
                )}
                <Spinner>
                    <div>
                        {type === 'RDDData' ? (
                            <RDDDetailsTable rddItems={RDDData} role={role} visible={false} updatedLimit={setLimit} updatedOffset={setOffset} />
                        ) : (
                            <PoDetailsTable tableItems={poData} role={role} visible={false} updatedLimit={setLimit} updatedOffset={setOffset} filterKey={filterKey} />
                        )}
                    </div>
                </Spinner>
            </section>
        </>
    );
};

const mapStateToProps = () => {
    return {};
};
const mapDispatchToProps = (dispatch) => {
    return {
        poItemList: (data) => dispatch(Actions.poItemList(data)),
        RDDItemList: (limit, offset, po_number) => dispatch(Actions.RDDItemList(limit, offset, po_number)),
        customerWorkflowData: (customer_name, user_id) => dispatch(Actions.customerWorkflowData(customer_name, user_id)),
        retrigger: (data) => dispatch(Actions.retrigger(data)),
        downloadPO: (data) => dispatch(Actions.downloadPO(data)),
        downloadPODetails: (data) => dispatch(Actions.downloadPODetails(data)),
        downloadSOReqRes: (data) => dispatch(Actions.downloadSOReqRes(data)),
    };
};

const ConnectPOData = connect(mapStateToProps, mapDispatchToProps)(POData);

export default ConnectPOData;
