import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { connect } from 'react-redux';
import * as AdminAction from '../actions/adminAction';
import * as DashAction from '../../distributor/actions/dashboardAction';
import Util from '../../../util/helper';
import Auth from '../../../util/middleware/auth';
import { notification, Popover, Collapse } from 'antd';
import { InfoCircleFilled, CaretRightOutlined } from '@ant-design/icons';
import Loader from '../../../components/Loader';
import { hasRespondPermission, pages } from '../../../persona/requests';
import { isUndefined } from 'lodash';
import { RUPEE_SYMBOL } from '../../../constants';
import appLevelConfiguration from '../../../config';
import RejectModal from './RejectModal';

const RushOrderDetails = (props) => {
    const {
        history,
        getPODetails,
        po_details,
        getRegionDetails,
        distributor_profile,
        app_level_configuration,
        fetchOrderRequest,
        getAppSettingList,
        getRushOrderApprovalCount,
        pdp_windows,
        getPDPWindows,
        updateRushOrderRequest2,
    } = props;
    //   const role = Auth.getRole();
    //   const email = Auth.getUserEmail()?.toLowerCase();
    const email = Auth.getSSOUserEmail()?.toLowerCase();
    const { po_num, dist_id } = useParams();
    const po_number = Util.decryptData(po_num.replaceAll('*', '/').replaceAll('-', '+'));
    const distributor_id = Util.decryptData(dist_id.replaceAll('*', '/').replaceAll('-', '+'));
    const location = useLocation();
    const appConfig = appLevelConfiguration.app_level_configuration;

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const current_month = monthNames[new Date().getMonth()];

    const contents = (
        <div>
            <div>
                Please contact regional <br />
                CFA for any corrections
            </div>
        </div>
    );

    const getOrDefault = (map, key, defaultValue) => {
        return map.has(key) ? map.get(key) : defaultValue;
    };

    const [asm, setAsm] = useState([]);
    const [tse, setTse] = useState([]);
    const [activePdp, setActivePdp] = useState([]);
    const [inactivePdp, setInactivePdp] = useState([]);
    const [tableData, setTableData] = useState([]);
    const [salesUnit, setSalesUnit] = useState('');
    const [soData, setSoData] = useState(null);
    const [refresh, setRefresh] = useState(false);
    const [rejectModalVisible, setRejectModalVisible] = useState(false);

    const [requestStatus, setRequestStatus] = useState('EXPIRED');
    const [shipTo, setShipTo] = useState(null);
    const [unloading, setUnloading] = useState(null);
    const [orderRequestData, setOrderRequestData] = useState(null);
    const [isRushOrderResponseEnabled, setIsRushOrderResponseEnabled] = useState(false);
    const [roApprovers, setRoApprovers] = useState([]);
    const [isResponseDisabled, setIsResponseDisabled] = useState(false);
    const [disabledMessage, setDisabledMessage] = useState('');

    const totalApprovals = useRef(0);
    const expiryHours = useRef(24);
    const approvalCount = useRef(0);
    const expiryHours2 = useRef(24);

    useEffect(() => {
        async function fetchOrderRequestData(po) {
            const response = await fetchOrderRequest(po);
            if (response.success) {
                setOrderRequestData(response.data);
            } else {
                notificationSender(false, 'Error', 'Failed to fetch order request data.');
            }
        }
        if (po_number && distributor_id) {
            getPODetails(po_number, distributor_id);
            getRegionDetails(distributor_id);
            //   if(orderRequestData == null)
            fetchOrderRequestData(po_number);
        }
    }, [getPODetails, getRegionDetails, po_number, distributor_id, refresh, fetchOrderRequest]);

    useEffect(() => {
        pdp_windows?.forEach((window) => {
            const config = window.pdp_type === 'WE' ? appConfig.pdp_weekly : appConfig.pdp_fortnightly;
            if (+window.threshold_frequency === -1) {
                for (let day of Object.keys(config)) {
                    Object.assign(config[day], {
                        orderWindow: window[config[day].key1],
                        orderPlacementEndTime: window[config[day].key2],
                    });
                }
            } else {
                Object.assign(config, {
                    THRESHOLD_FREQUENCY: +window.threshold_frequency,
                });
                for (let day of Object.keys(config)) {
                    Object.assign(config[day], {
                        orderWindowException: window[config[day].key1],
                        orderPlacementEndTimeException: window[config[day].key2],
                    });
                }
            }
        });
        if (app_level_configuration?.length && distributor_profile) {
            const pdp = Util.getPdpDetails(distributor_profile, app_level_configuration);
            const active_pdp = pdp.activeArr.map((o) => {
                return {
                    pdp: o?.pdp_day,
                    plant: o?.plant_name,
                    div: `${o?.division_description}/${o?.division}`,
                };
            });
            const inactive_pdp = pdp.inactiveArr.map((o) => {
                return {
                    pdp: o?.pdp_day,
                    plant: o?.plant_name,
                    div: `${o?.division_description}/${o?.division}`,
                };
            });
            setActivePdp(active_pdp);
            setInactivePdp(inactive_pdp);
        } else {
            getAppSettingList();
        }
    }, [app_level_configuration, distributor_profile, pdp_windows]);

    useEffect(() => {
        if (orderRequestData) {
            setRequestStatus(orderRequestData.status);
        }
    }, [orderRequestData]);

    useEffect(() => {
        // async function fetchApprovalCount() {
        //   const res = await getRushOrderApprovalCount();
        //   if (res.success) {
        //     approvalCount.current = res.data;
        //   } else {
        //     notificationSender(
        //       false,
        //       'Error',
        //       'Failed to fetch rush order approval count',
        //     );
        //   }
        // }
        // fetchApprovalCount();
    }, [getRushOrderApprovalCount, refresh]);

    useEffect(() => {
        if (app_level_configuration?.length) {
            const keys = ['RO_EXPIRY_WINDOW', 'RO_APPROVALS', 'ENABLE_RO_RESPONSE', 'RO_APPROVERS', 'RO_EXPIRY_WINDOW_2'];
            const keysMap = new Map();
            app_level_configuration
                .filter((item) => keys.includes(item.key))
                .forEach((item) => {
                    keysMap.set(item.key, item.value);
                });

            // totalApprovals.current = parseInt(getOrDefault(keysMap,'RO_APPROVALS',0));
            expiryHours.current = parseInt(getOrDefault(keysMap, 'RO_EXPIRY_WINDOW', 24));
            expiryHours2.current = parseInt(getOrDefault(keysMap, 'RO_EXPIRY_WINDOW_2', 24));
            setIsRushOrderResponseEnabled(getOrDefault(keysMap, 'ENABLE_RO_RESPONSE', 'NO') === 'YES');
            setRoApprovers(
                getOrDefault(keysMap, 'RO_APPROVERS', '')
                    ?.split(',')
                    .filter((o) => o.trim().length > 8)
                    .map((o) => o.trim().toLowerCase()),
            );
        } else {
            getAppSettingList();
        }
    }, [app_level_configuration]);

    useEffect(() => {
        const email_index = roApprovers.indexOf(email);
        let can_respond = isRushOrderResponseEnabled;
        if (!can_respond) {
            setDisabledMessage('Rush Order Approval/Rejection is disabled by Admin.');
            setIsResponseDisabled(true);
            return;
        }
        can_respond = requestStatus === 'PENDING' && hasRespondPermission(pages.RO_REQUESTS) && email_index >= 0;
        if (!can_respond) {
            setDisabledMessage('You are not authorized to approve/reject this request');
            setIsResponseDisabled(true);
            return;
        }
        can_respond = can_respond && !orderRequestData.responded_by_email?.find((e) => e.toLowerCase() === email);
        if (!can_respond) {
            setDisabledMessage('You have already responded to this request');
            setIsResponseDisabled(true);
            return;
        }
        setDisabledMessage('');
        setIsResponseDisabled(false);
    }, [roApprovers, orderRequestData, requestStatus]);
    useEffect(() => {
        const pos = po_details[0] || {};
        // setPoDetails(pos);
        if (pos?.Itemset) {
            let sales_unit = '';
            if (pos.SO_VALUE && requestStatus === 'APPROVED') {
                const so_data = {
                    so_number: pos.SO_NUMBER,
                    so_value: pos.SO_VALUE,
                    so_date: pos.SO_DATE,
                };
                setSoData(so_data);
            } else {
                setSoData(null);
            }

            if (pos?.partnerset.length) {
                const ship_to = pos.partnerset.filter((o) => o.PARTN_ROLE === 'WE')[0];
                const unloading = pos.partnerset.filter((o) => o.PARTN_ROLE === 'Y1')[0];

                setShipTo({
                    name: ship_to.PARTN_NAME,
                    code: ship_to.PARTN_NUMB,
                });
                if (isUndefined(unloading))
                    setUnloading({
                        name: ship_to.PARTN_NAME,
                        code: ship_to.PARTN_NUMB,
                    });
                else
                    setUnloading({
                        name: unloading.PARTN_NAME,
                        code: unloading.PARTN_NUMB,
                    });
            } else {
                setShipTo(null);
                setUnloading(null);
            }

            const table_data = pos.Itemset.map((item) => {
                sales_unit = item.SALES_UNIT;
                return {
                    material: item.DESCRIPTION,
                    material_code: item.MATERIAL,
                    qty: item.REQ_QTY,
                    ton: item.Quantity_Ton.split(' ')[0],
                    distribution_channel: item.DISTR_CHAN,
                    division: item.DIVISION,
                    sales_org: +item.SALES_ORG,
                    open_order: item.open_order,
                    stock_in_hand: item.stock_in_hand,
                    stock_in_transit: item.stock_in_transit,
                };
            });
            setSalesUnit(sales_unit);
            setTableData(table_data);
        }
    }, [po_details]);

    useEffect(() => {
        if (distributor_profile) {
            getPDPWindows(distributor_profile.group5_id);
            const ASM = distributor_profile?.asm?.map((o) => `${o.first_name ? o.first_name : 'NA'} ${o.last_name ? o.last_name : ''} (${o.code ? o.code : 'NA'})`);
            const TSE = distributor_profile?.tse?.map((o) => `${o.first_name ? o.first_name : 'NA'} ${o.last_name ? o.last_name : ''} (${o.code ? o.code : 'NA'})`);
            setAsm(ASM ? ASM : ['NA']);
            setTse(TSE ? TSE : ['NA']);
        }
    }, [distributor_profile]);

    const notificationSender = (success, message, description) => {
        if (success) {
            notification.success({
                message: message,
                description: description,
                duration: 6,
                className: 'notification-green',
            });
        } else {
            notification.error({
                message: message,
                description: description,
                duration: 6,
                className: 'notification-error',
            });
        }
    };

    async function canRespond() {
        if (!isRushOrderResponseEnabled) {
            notificationSender(false, 'Error', 'Rush Order Approval/Rejection is disabled by Admin.');
            return false;
        }
        if (!orderRequestData?.requested_on) {
            notificationSender(false, 'Error', 'Cannot fetch order request date. Try again after some time.');
            return false;
        }
        if (orderRequestData.status === 'APPROVED') {
            notificationSender(false, 'Error', 'Request already approved');
            return false;
        }
        if (orderRequestData.status === 'REJECTED') {
            notificationSender(false, 'Error', 'Request already rejected');
            return false;
        }
        const email_index = roApprovers.indexOf(email);
        if (email_index < 0) {
            notificationSender(false, 'Error', 'You are not authorized to approve/reject this request');
            return false;
        }

        if (orderRequestData.responded_by_email?.find((e) => e.toLowerCase() === email)) {
            notificationSender(false, 'Error', 'You have already responded to this request');
            return false;
        }
        return true;
    }

    const handleApprove = async () => {
        history.replace({ pathname: location.pathname });
        const canRespondFlag = await canRespond();
        if (!canRespondFlag) return;
        if (totalApprovals.current === 0 || approvalCount.current < totalApprovals.current) {
            const approvePayload = {
                po_number,
                distributor_id,
                action: 'APPROVE',
            };
            setIsResponseDisabled(true);
            const approve_response = await updateRushOrderRequest2(approvePayload);
            setIsResponseDisabled(false);
            if (approve_response.success) {
                notificationSender(true, 'Success', 'Request approved successfully');
                setRefresh(!refresh);
            } else {
                notificationSender(false, 'Error', approve_response.message);
            }
        } else {
            notificationSender(false, 'Error', 'You have reached the maximum limit of approvals for the month of ' + current_month);
        }
    };

    const handleReject = async () => {
        history.replace({ pathname: location.pathname });
        const canRespondFlag = await canRespond();
        if (!canRespondFlag) return;
        setRejectModalVisible(true);
    };

    const handleRejectConfirm = async (rejectComments) => {
        const rejectPayload = {
            po_number,
            distributor_id,
            action: 'REJECT',
            ...(rejectComments && { reject_comments: rejectComments }),
        };
        setIsResponseDisabled(true);
        const reject_response = await updateRushOrderRequest2(rejectPayload);
        setIsResponseDisabled(false);
        setRejectModalVisible(false);

        if (reject_response.success) {
            notificationSender(true, 'Success', 'Request rejected successfully');
            setRefresh(!refresh);
            setRequestStatus('REJECTED');
        } else {
            notificationSender(false, 'Error', reject_response?.message);
        }
    };

    const handleRejectCancel = () => {
        setRejectModalVisible(false);
    };

    useEffect(() => {
        if (po_number && distributor_id && orderRequestData) {
            if (location && location.state) {
                const { action } = location.state;
                if (action === 'approve' && roApprovers.length) {
                    handleApprove();
                } else if (action === 'reject' && roApprovers.length) {
                    handleReject();
                }
            }
        }
    }, [requestStatus, location?.state, roApprovers, orderRequestData]);

    return (
        <>
            <div className="admin-dashboard-wrapper">
                <div className="admin-dashboard-block">
                    <div className="distributor_info">
                        <div className="row1">
                            <div className="col1">Name: {distributor_profile?.name}</div>
                            <div className="col2">Area: {distributor_profile?.region}</div>
                        </div>
                        <div className="row2">
                            <div className="col1">
                                ASM:{' '}
                                {asm?.map((item, index) => {
                                    return (
                                        <span key={index} style={{ margin: '0px 5px' }}>
                                            {item}
                                        </span>
                                    );
                                })}
                            </div>
                            <div className="col2">
                                TSE:{' '}
                                {tse?.map((item, index) => {
                                    return (
                                        <span key={index} style={{ margin: '0px 5px' }}>
                                            {item}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="row3">
                            <div className="col1">Ship To: {shipTo ? `${shipTo.name} (${shipTo.code})` : '-'}</div>
                            <div className="col2">Unloading: {unloading ? `${unloading.name} (${unloading.code})` : '-'}</div>
                        </div>
                        <div className="row4">
                            <div className="col1">PO Number: {po_number}</div>
                            <div className="col2">
                                Status:
                                <span
                                    className={
                                        requestStatus === 'APPROVED'
                                            ? 'status-approved'
                                            : requestStatus === 'REJECTED'
                                              ? 'status-rejected'
                                              : requestStatus === 'PENDING'
                                                ? 'status-pending'
                                                : 'status-expired'
                                    }>
                                    {requestStatus}
                                </span>
                            </div>
                        </div>
                        {requestStatus === 'REJECTED' && (
                            <div className="row5">
                                <div className="col1">
                                    Reject Comment: {
                                        orderRequestData.response_comment && orderRequestData.response_comment.length > 20 ? (
                                            <Popover 
                                                content={orderRequestData.response_comment}
                                                placement="bottom"
                                                trigger="hover"
                                                overlayInnerStyle={{ maxWidth: '300px', wordBreak: 'break-word' }}
                                            >
                                                <span>{orderRequestData.response_comment.substring(0, 20)}...</span>
                                            </Popover>
                                        ) : orderRequestData.response_comment
                                    }
                                </div>
                            </div>
                        )}

                        {soData && requestStatus === 'APPROVED' && (
                            <div className="row5">
                                <div className="col1">SO Number: {soData.so_number}</div>
                                <div className="col2">Net Value: {requestStatus === 'APPROVED' ? `${RUPEE_SYMBOL} ${soData.so_value}` : `${soData.so_value}`}</div>
                                <div className="col3">Order Date: {soData?.so_date ? `${Util.formatDate(soData.so_date)} , ${Util.formatTime(soData.so_date)}` : 'NA'}</div>
                            </div>
                        )}

                        {/* active PDP */}
                        <table className="pdp-tbl">
                            <thead>
                                <tr>
                                    <th style={{ width: '27%' }}>PDP Day (Active)</th>
                                    <th style={{ width: '32%' }}>
                                        Plant Code!
                                        <Popover content={contents} placement="bottom" trigger="hover" className="th-info-icon">
                                            <InfoCircleFilled />
                                        </Popover>
                                    </th>
                                    <th>Division</th>
                                </tr>
                            </thead>
                        </table>
                        <Collapse bordered={false} expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />} className="collapse-pdp-tbl">
                            <Collapse.Panel>
                                <table className="pdp-tbl">
                                    <tbody>
                                        {activePdp?.map((item) => (
                                            <tr key={item.div}>
                                                <td style={{ width: '27%' }}>{item.pdp === undefined ? 'N/A' : item.pdp}</td>
                                                <td style={{ width: '32%' }}>{item.plant === undefined ? 'N/A' : item.plant}</td>
                                                <td>{item.div === undefined ? 'N/A' : item.div}</td>
                                            </tr>
                                        ))}
                                        {activePdp.length === 0 && (
                                            <tr key="0">
                                                <td style={{ width: '27%' }}>N/A</td>
                                                <td style={{ width: '32%' }}>N/A</td>
                                                <td>N/A</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </Collapse.Panel>
                        </Collapse>

                        {/* upcoming PDP */}
                        <table className="pdp-tbl">
                            <thead>
                                <tr>
                                    <th style={{ width: '27%' }}>PDP Day (Upcoming)</th>
                                    <th style={{ width: '32%' }}>
                                        Plant Code!
                                        <Popover content={contents} placement="bottom" trigger="hover" className="th-info-icon">
                                            <InfoCircleFilled />
                                        </Popover>
                                    </th>
                                    <th>Division</th>
                                </tr>
                            </thead>
                        </table>
                        <Collapse bordered={false} expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />} className="collapse-pdp-tbl">
                            <Collapse.Panel>
                                <table className="pdp-tbl">
                                    <tbody>
                                        {inactivePdp?.map((item) => (
                                            <tr key={item.div}>
                                                <td style={{ width: '27%' }}>{item.pdp === undefined ? 'N/A' : item.pdp}</td>
                                                <td style={{ width: '32%' }}>{item.plant === undefined ? 'N/A' : item.plant}</td>
                                                <td>{item.div === undefined ? 'N/A' : item.div}</td>
                                            </tr>
                                        ))}
                                        {inactivePdp.length === 0 && (
                                            <tr key="0">
                                                <td style={{ width: '27%' }}>N/A</td>
                                                <td style={{ width: '32%' }}>N/A</td>
                                                <td>N/A</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </Collapse.Panel>
                        </Collapse>
                    </div>

                    {requestStatus === 'PENDING' && (
                        <Loader>
                            <div className="order-btns">
                                <div className="dis-message">{disabledMessage}</div>
                                <button className="approve-btn" disabled={isResponseDisabled} onClick={handleApprove}>
                                    Approve
                                </button>
                                <button className="reject-btn" disabled={isResponseDisabled} onClick={handleReject}>
                                    Reject
                                </button>
                            </div>
                        </Loader>
                    )}
                    <div className="admin-dashboard-table">
                        <Loader>
                            <table>
                                <thead>
                                    <tr>
                                        <th className="width25" style={{ textAlign: 'center' }}>
                                            Material
                                        </th>
                                        <th className="width15" style={{ textAlign: 'center' }}>
                                            Material Code
                                        </th>
                                        <th className="width15" style={{ textAlign: 'center' }}>
                                            Quantity (in {salesUnit !== '' ? salesUnit : 'CV'})
                                        </th>
                                        <th className="width15" style={{ textAlign: 'center' }}>
                                            Quantity (in tonnes)
                                        </th>
                                        <th className="width10" style={{ textAlign: 'center' }}>
                                            SIH
                                        </th>
                                        <th className="width10" style={{ textAlign: 'center' }}>
                                            SIT
                                        </th>
                                        <th className="width10" style={{ textAlign: 'center' }}>
                                            OO
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableData.map((item, index) => (
                                        <tr key={index}>
                                            <td className="width25">{item.material}</td>
                                            <td className="width15" style={{ textAlign: 'center' }}>
                                                {item.material_code}
                                            </td>
                                            <td className="width15" style={{ textAlign: 'center' }}>
                                                {item.qty}
                                            </td>
                                            <td className="width15" style={{ textAlign: 'center' }}>
                                                {item.ton}
                                            </td>
                                            <td className="width10" style={{ textAlign: 'center' }}>
                                                {item.stock_in_hand === '' ? '-' : item.stock_in_hand}
                                            </td>
                                            <td className="width10" style={{ textAlign: 'center' }}>
                                                {item.stock_in_transit === '' ? '-' : item.stock_in_transit}
                                            </td>
                                            <td className="width10" style={{ textAlign: 'center' }}>
                                                {item.open_order === '' ? '-' : item.open_order}
                                            </td>
                                        </tr>
                                    ))}
                                    {tableData.length === 0 && (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: 'center' }}>
                                                No data found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </Loader>
                    </div>
                </div>
            </div>
            <RejectModal visible={rejectModalVisible} onCancel={handleRejectCancel} onConfirm={handleRejectConfirm} />
        </>
    );
};

const mapStateToProps = (state) => {
    return {
        po_details: state.dashboard.get('po_details'),
        distributor_profile: state.dashboard.get('region_details'),
        app_level_configuration: state.auth.get('app_level_configuration'),
        pdp_windows: state.auth.get('pdp_windows'),
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        getPODetails: (po_number, distributor_id) => dispatch(DashAction.getPODetails(po_number, distributor_id)),
        getRegionDetails: (distributor_id) => dispatch(DashAction.getRegionDetails(distributor_id)),
        fetchOrderRequest: (po_number) => dispatch(AdminAction.fetchOrderRequest(po_number)),
        getAppSettingList: () => dispatch(AdminAction.getAppSettingList()),
        getRushOrderApprovalCount: () => dispatch(AdminAction.getRushOrderApprovalCount()),
        getPDPWindows: (regionId) => dispatch(AdminAction.getPDPWindow(regionId)),
        updateRushOrderRequest2: (data) => dispatch(AdminAction.updateRushOrderRequest2(data)),
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(RushOrderDetails);
