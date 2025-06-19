import React, { useState, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import { Select, notification } from 'antd';
import debounce from 'lodash.debounce';
import * as Action from '../actions/adminAction';
import Auth from '../../../util/middleware/auth';
import Panigantion from '../../../components/Panigantion';
import '../../../style/admin/Dashboard.css';
import './UserManagement.css';
import AddUserModal from '../AddUserModal/AddUserModal';
import Loader from '../../../components/Loader';
import { roles } from '../../../persona/roles';
import { pages, hasViewPermission, hasEditPermission } from '../../../persona/distributorHeader';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { pegasus } from '../../../persona/pegasus';
import Util from '../../../util/helper';
import auth from '../../../util/middleware/auth';

let AdminUserManagement = props => {
    const browserHistory = props.history;
    const { tse_user_list, getTSEUserList, updateTSEUserSetting, sso_user_details, getSSODetails, dashboard_filter_categories, dashboardFilterCategories, getAllMdmCustomers,getAllShopifyCustomers} = props;

    const userRoles = Object.values(roles)?.map(r => ({ label: r.replace(/_/g, ' '), value: r }));
    const userStatus = [{ label: 'All Users', value: 'all' }, { label: 'Active Users', value: 'enabled' }, { label: 'Inactive Users', value: 'disabled' }, { label: 'Deleted Users', value: 'deleted' }].concat(userRoles);

    const { Option } = Select;
    const [userList, setUserList] = useState([]);
    const [pageNo, setPageNo] = useState(1);
    const [originalUserValue, setOriginalUserValue] = useState([]);
    const [isRowEdit, setIsRowEdit] = useState(-1);
    const [offset, setOffset] = useState(0)
    const [dataChange, setDataChange] = useState(0);
    const [limit, setLimit] = useState(10)
    const [search, setSearch] = useState('')
    const [showSearch, setShowSearch] = useState('')
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [zones, setZones] = useState();
    const [mdmCustomersList, setMdmCustomersList] = useState([]);
    const [shopifyCustomersList, setShopifyCustomersList] = useState([]);

    const [isAddUserModalVisible, setIsAddUserModalVisible] = useState(false);

    const [roleStatusSearch, setRoleStatusSearch] = useState('all');
    const [isNonProd, setIsNonProd] = useState(false);

    const ssoRole = sso_user_details?.data?.length && sso_user_details.data[0].roles;
    const debouncedSave = useRef(debounce(nextValue => setSearch(nextValue), 500)).current;
    const rolesWithZoneMapping = [roles.OPERATIONS];
    const rolesWithMdmCustomerMapping = [roles.KAMS];
    const rolesWithShopifyUser = [roles.SHOPIFY_UK,roles.SHOPIFY_OBSERVER,roles.SHOPIFY_SUPPORT];

    useEffect(() => {
        if (props.location.state === 'resetSearch') {
            setShowSearch('')
            debouncedSave('')
        }
    }, [props.location.state])

    useEffect(() => {
        setUserList(tse_user_list?.data?.rows)
        setOriginalUserValue(_.cloneDeep(tse_user_list?.data?.rows));
    }, [tse_user_list.data && tse_user_list.data.rows])

    useEffect(() => {
        if (roleStatusSearch === 'all') getTSEUserList({ offset, limit, search })
        else if (roleStatusSearch === 'enabled' || roleStatusSearch === 'disabled') getTSEUserList({ offset, limit, search, status: roleStatusSearch });
        else if (Object.values(roles).includes(roleStatusSearch)) getTSEUserList({ offset, limit, search, role: roleStatusSearch })
        else if (roleStatusSearch === 'deleted') getTSEUserList({ offset, limit, search, deleted: true });
    }, [offset, limit, search, roleStatusSearch, dataChange])

    useEffect(() => {
        let isArrayEqual = function (x, y) {
            return _(x).differenceWith(y, _.isEqual).isEmpty();
        };
        let result = isArrayEqual(
            userList,
            originalUserValue
        );
        if (result) {
            setIsRowEdit(-1);
        }
    }, [userList]);

    useEffect(() => {
        if (!sso_user_details || !Object.keys(sso_user_details).length) {
            const adminAccessDetails = Auth.getAdminAccessDetails();
            let sso_detail = {};
            if (adminAccessDetails && Object.keys(JSON.parse(adminAccessDetails)).length > 0) {
                sso_detail = JSON.parse(adminAccessDetails);
            }
            const emailId = sso_detail?.username?.replace(process.env.REACT_APP_COGNITO_IDP_NAME, '');
            emailId && getSSODetails(emailId, props.history);
        }
    }, [sso_user_details]);

    useEffect(() => {
        if (ssoRole && !hasViewPermission(pages.USER_MANAGEMENT)) {
            browserHistory.push("/admin/dashboard");
        }
    }, [ssoRole]);

    useEffect(() => {
        if (dashboard_filter_categories?.response?.area_details) {
            const region = new Set();
            dashboard_filter_categories?.response?.area_details.forEach((obj) => {
                const value = obj['region'];
                region.add(value);
            });
            setZones([...region]);
        } else {
            dashboardFilterCategories();
        }
    }, [dashboard_filter_categories]);

    useEffect(() => {
        getAllMdmCustomersList();
        getAllShopifyCustomersList();
        const pageUrl = window.location.href.toLowerCase();
        if(pageUrl.includes('localhost') || pageUrl.includes('dev-pegasus') || pageUrl.includes('uat-pegasus')) {
            setIsNonProd(true);
        }
    }, []);

    async function getAllMdmCustomersList() {
        const mdmCustomers = await getAllMdmCustomers();
        if (mdmCustomers?.success)
            setMdmCustomersList(mdmCustomers.data);
    }

    async function getAllShopifyCustomersList() {
        let payload={
            status: "",
            role : auth.getAdminRole(),
            id : localStorage.getItem('user_id')
        }
        const shopifyCustomers = await getAllShopifyCustomers(payload);
        if (shopifyCustomers?.success)
            setShopifyCustomersList(shopifyCustomers?.data?.data);
    }

    let responseHandler = (message, description, type) => {
        setTimeout(() => {
            if (type === 'SUCCESS')
                notification.success({
                    message: message,
                    description: description,
                    duration: 3,
                    className: 'notification-green'
                });
            else
                notification.error({
                    message: message,
                    description: description,
                    duration: 3,
                    className: 'notification-error error-scroll'
                });

        }, 50)
    };

    const selectChangeHandler = (value, index, id, prop) => {    
        if (isRowEdit === -1 || isRowEdit === index) {
            userList?.forEach((data, i) => {
                if (data.user_id === id) {
                    data[prop] = prop === 'code' ? value.toString() : value;
                }
            })
            setUserList([...userList]);
            setIsRowEdit(index);
        } else {
            responseHandler('Error', 'Please save the changes first', 'FAILURE')
        }
    }

    const statusChangeHandler = (value) => {
        if (value !== '') {
            setOffset(0)
            setLimit(itemsPerPage);
            setRoleStatusSearch(value);
            setPageNo(1);
            setShowSearch('');
            setSearch('');
        }
    }

    const loginCheckboxHandler = (index, loginValue, id) => {
        if (isRowEdit === -1 || isRowEdit === index) {
            userList?.forEach((data) => {
                if (data.user_id === id) {
                    if (loginValue === "ACTIVE") {
                        data.status = "INACTIVE";
                    }
                    else {
                        data.status = "ACTIVE";
                    }
                }
            })
            setUserList([...userList]);
            setIsRowEdit(index);
        } else {
            responseHandler('Error', 'Please save the changes first', 'FAILURE');
        }
    }

    const softDeleteCheckboxHandler = (index, isDeleted, id) => {
        if (isRowEdit === -1 || isRowEdit === index) {
            userList?.forEach((data) => {
                if (data.user_id === id) {
                    if (isDeleted) {
                        data.deleted = false;
                    }
                    else {
                        data.deleted = true;
                    }
                }
            })
            setUserList([...userList]);
            setIsRowEdit(index);
        } else {
            responseHandler('Error', 'Please save the changes first', 'FAILURE');
        }
    }

    const onSaveHandler = async (data) => {
        const { userId, roles, status, deleted, code, email } = data;
        if (!validateRole(roles)) {
            return;
        }
        await updateTSEUserSetting({ user_id: userId, role: roles, enableLogin: status, isDeleted: deleted, code , email });
        responseHandler('Success', 'Updated Successfully !', 'SUCCESS');
        setOffset(0);
        setDataChange(prev => prev + 1);
        setOriginalUserValue((_.cloneDeep(tse_user_list.data && tse_user_list.data.rows)));
        setIsRowEdit(-1);
    }
    const onChangePage = (page, itemsPerPage) => {
        setLimit(itemsPerPage)
        setOffset((page - 1) * limit)
        setPageNo(page);
    }

    const onSearch = (e) => {
        const { value } = e.target
        debouncedSave(value);
        setShowSearch(value)
        setOffset(0)
        setLimit(itemsPerPage)
        setPageNo(1);
    }

    const addUserModal = () => {
        setIsAddUserModalVisible(true);
    }

    const handleAddUserModalCancel = () => {
        setIsAddUserModalVisible(false);
    };

    const addUserDetails = async (data) => {
        if (data.role && !validateRole(data.role)) {
            return;
        }
        handleAddUserModalCancel();
        let response = await props.addSSOUser(data);
        if (response.success)
            responseHandler('SSO User added', response.message, 'SUCCESS')
        else
            responseHandler('Failed to add SSO User', response.message, 'FAILURE')
    }

    const validateRole = (role) => {
        const blockingRoles = [roles.SUPER_ADMIN];
        if (_.intersection(role, blockingRoles).length > 0 && role.length > 1) {
            responseHandler('Failed to add SSO User', `Can not add more roles while having the roles : ${blockingRoles.join(', ')}`, 'FAILURE');
            return false
        }
        return !Object.keys(pegasus).some(team => {
            if (_.intersection(role, pegasus[team]).length > 1) {
                responseHandler('Failed to add SSO User', `Can not add multiple roles from ${team} team`, 'FAILURE');
                return true;
            }
        })
    }

    return (
        <div className="admin-dashboard-wrapper">
            <div className="admin-dashboard-block">
                <div className="admin-dashboard-head">
                    <h2>User Management</h2>
                    <div className="admin-dashboard-search">
                        <input value={showSearch} onChange={(e) => { onSearch(e) }} type="text" className="search-fld" placeholder="Search by Username, Email, Contact, Code" />
                    </div>
                    <Select
                        className='user-role-select'
                        defaultValue={'all'}
                        onChange={(value) => statusChangeHandler(value)}
                        dropdownClassName="user-role-dropdown">
                        {userStatus.map(({ label, value }, i) => {
                            return <Option key={i} value={value}>{label}</Option>
                        })}
                    </Select>
                    {ssoRole && hasViewPermission(pages.USER_MANAGEMENT) && <button
                        type="submit" onClick={addUserModal}
                        className="add-button"
                    >
                        Add User <img src="/assets/images/plus-icon.svg" alt="" />
                    </button>}
                    <Link to="/admin/persona">
                        <img src="/assets/images/user-management.svg" alt="" style={{ width: '40px' }} /> <em>Persona</em></Link>
                </div>
                <div className="admin-dashboard-table">
                    <Loader>
                        <table>
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Email Address</th>
                                    <th>Code</th>
                                    <th>Contact Number</th>
                                    <th>User Role</th>
                                    <th>Login</th>
                                    <th>Deleted</th>
                                    {hasEditPermission(pages.USER_MANAGEMENT) && <th>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {userList && userList.length > 0 && userList.map((data, i) => {
                                    return (
                                        <tr key={i} style={(data.manager_id && data.manager_id === 'PORTAL_MANAGED') ? { backgroundColor: "#BDFCFF" } : {}}>
                                            <td>{data.user_name}</td>
                                            {/* Email can only be changed in non-prod env. This is done for ease of development. This is not a business requirement. */}
                                            <td>{hasEditPermission(pages.USER_MANAGEMENT) && isNonProd ?
                                            <input className='user-email-text' type="text" value={data.email} onChange={(e) => selectChangeHandler(e.target.value, i, data.user_id, 'email')} />
                                            :
                                            <>{data.email ? data.email : '-'}</>
                                            }</td>
                                            {/* https://tataconsumer.atlassian.net/browse/SOPE-52*/}
                                            <td>{
                                                (!_.isEmpty(_.intersection(data.roles, [...rolesWithZoneMapping, ...rolesWithMdmCustomerMapping, ...rolesWithShopifyUser]))) && hasEditPermission(pages.USER_MANAGEMENT) ?
                                                    <Select
                                                        mode="multiple"
                                                        className='user-role-select'
                                                        defaultValue={data.code !== '' ? data.code?.split(',') : undefined}
                                                        onChange={(e) => selectChangeHandler(e, i, data.user_id, 'code')}
                                                        dropdownClassName="user-role-dropdown"
                                                        disabled={(isRowEdit !== i && isRowEdit !== -1) ? true : false}
                                                        options={
                                                            !_.isEmpty(_.intersection(rolesWithZoneMapping, data.roles)) ? 
                                                            zones?.sort().map((value) => ({ label: value, value })) :
                                                            !_.isEmpty(_.intersection(rolesWithMdmCustomerMapping, data.roles)) ? 
                                                            mdmCustomersList?.sort().map((value) => ({ label: value.customer_name, value: value.customer_name })) :
                                                            shopifyCustomersList?.sort().map((value) => ({ label: value.sales_org, value: value.sales_org }))
                                                    
                                                        }
                                                    />
                                                    :
                                                    data.code ? data.code : '-'
                                            }</td>
                                            {/* https://tataconsumer.atlassian.net/browse/SOPE-52*/}
                                            <td>{data.mobile_number ? data.mobile_number : '-'}</td>
                                            <td id="role-select">
                                                {!hasEditPermission(pages.USER_MANAGEMENT) ?
                                                    userRoles.filter(role => data.roles?.includes(role.value)).map(role => role.label).join(',') :
                                                    <Select
                                                        className='user-role-select'
                                                        mode='multiple'
                                                        value={data.roles}
                                                        onChange={(e) => e.length>0 && selectChangeHandler(e, i, data.user_id,'roles')}
                                                        dropdownClassName="user-role-dropdown"
                                                        getPopupContainer={() => document.getElementById('role-select')}
                                                        disabled={(isRowEdit !== i && isRowEdit !== -1) ? true : false}>
                                                        {userRoles.map(({ label, value }, i) => {
                                                            return <Option key={i} value={value}>{label}</Option>
                                                        })}
                                                    </Select>
                                                }
                                            </td>
                                            <td>
                                                <label for={`enable-login-${i}`}>
                                                    <input
                                                        id={`enable-login-${i}`}
                                                        type="checkbox"
                                                        checked={data.status === "ACTIVE"}
                                                        onChange={() => loginCheckboxHandler(i, data.status, data.user_id)}
                                                        disabled={(isRowEdit !== i && isRowEdit !== -1) || !hasEditPermission(pages.USER_MANAGEMENT)}
                                                    />
                                                    <span className="checkmark-box"></span>
                                                </label>
                                            </td>
                                            <td>
                                                <label for={`soft-delete-${i}`}>
                                                    <input
                                                        id={`soft-delete-${i}`}
                                                        type="checkbox"
                                                        checked={data.deleted}
                                                        onChange={() => softDeleteCheckboxHandler(i, data.deleted, data.user_id)}
                                                        disabled={(isRowEdit !== i && isRowEdit !== -1) || !hasEditPermission(pages.USER_MANAGEMENT)}
                                                    />
                                                    <span className="checkmark-box"></span>
                                                </label>
                                            </td>
                                           
                                            {hasEditPermission(pages.USER_MANAGEMENT) &&
                                                <td className='admin-ations'>
                                                    {isRowEdit !== i &&
                                                        <button type="button" disabled>Save</button>}
                                                    {isRowEdit === i &&
                                                        <button type="button" onClick={
                                                            () => onSaveHandler({ userId: data.user_id, roles: data.roles, status: data.status, deleted: data.deleted, code: data.code, email: data.email })
                                                        }>Save</button>}
                                                </td>
                                            }
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </Loader>
                </div>
                <Panigantion
                    data={userList ? userList : []}
                    itemsPerPage={itemsPerPage}
                    setItemsPerPage={setItemsPerPage}
                    itemsCount={tse_user_list && tse_user_list.data && tse_user_list.data.totalCount}
                    setModifiedData={onChangePage}
                    pageNo={pageNo}
                />
            </div>
            <AddUserModal
                visible={!!isAddUserModalVisible}
                onCancel={handleAddUserModalCancel}
                onAddUserDetails={addUserDetails}
                responseHandler={responseHandler}
                ssoRole={ssoRole}
                zones={zones}
                mdmCustomersList={mdmCustomersList}
                shopifyCustomersList={shopifyCustomersList}
            />
        </div>
    )
};

AdminUserManagement.propTypes = {
    tse_user_list: PropTypes.object,
    getTSEUserList: PropTypes.func,
    updateTSEUserSetting: PropTypes.func,
    sso_user_details: PropTypes.object,
    getSSODetails: PropTypes.func,
    dashboard_filter_categories: PropTypes.object,
    dashboardFilterCategories: PropTypes.func,
    getAllMdmCustomers: PropTypes.func,
    getAllShopifyCustomers: PropTypes.func
}

const mapStateToProps = (state) => {
    return {
        tse_user_list: state.admin.get('tse_user_list'),
        sso_user_details: state.admin.get('sso_user_details'),
        dashboard_filter_categories: state.admin.get('dashboard_filter_categories'),
    }
}
const mapDispatchToProps = (dispatch) => {
    return {
        getTSEUserList: ({ offset, limit, search, status, role, deleted }) =>
            dispatch(Action.getTSEUserList({ offset, limit, search, status, role, deleted })),
        updateTSEUserSetting: (data) =>
            dispatch(Action.updateTSEUserSetting(data)),
        getSSODetails: (emailId, history) =>
            dispatch(Action.getSSODetails(emailId, history)),
        addSSOUser: (data) => dispatch(Action.addSSOUser(data)),
        dashboardFilterCategories: () => dispatch(Action.dashboardFilterCategories()),
        getAllMdmCustomers: () => dispatch(Action.getAllMdmCustomers()),
        getAllShopifyCustomers: (payload) => dispatch(Action.getAllShopifyCustomers(payload))
    }
}

const UserManagement = connect(
    mapStateToProps,
    mapDispatchToProps
)(AdminUserManagement)

export default UserManagement
