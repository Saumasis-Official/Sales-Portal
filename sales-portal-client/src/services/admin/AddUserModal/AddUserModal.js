import React, { useEffect, useState } from 'react';
import { Modal, notification, Select, Input, AutoComplete } from 'antd';
import './AddUserModal.css';
import * as Action from '../actions/adminAction';
import { connect } from 'react-redux';
import { roles } from '../../../persona/roles';
import { pages, hasViewPermission, hasEditPermission } from '../../../persona/distributorHeader';
import _ from 'lodash';

let AddUserModal = (props) => {
    const { zones, visible, mdmCustomersList ,shopifyCustomersList} = props;

    const [emailId, setEmailId] = useState('');
    const [role, setRole] = useState([])
    const [name, setName] = useState('')
    const [emailList, setEmailList] = useState([]);
    const [originalEmailList, setOriginalEmailList] = useState([]);
    const [searchText, setSearchText] = useState('')
    const userRoles = Object.values(roles)?.map(r => ({ label: r.replace(/_/g, ' '), value: r }));
    const [zone, setZone] = useState();
    const [mdmCustomer, setMdmCustomer] = useState();
    const [shopifyUser, setShopifyUser] = useState();
    const rolesWithZoneMapping = [roles.OPERATIONS];
    const rolesWithMdmCustomerMapping = [roles.KAMS];
    const rolesWithShopifyUser = [roles.SHOPIFY_UK,roles.SHOPIFY_OBSERVER,roles.SHOPIFY_SUPPORT];

    const originalResponse = React.useRef([]);

    useEffect(() => {
        if (!hasViewPermission(pages.USER_MANAGEMENT))
            onCancelHandler();
    }, [])

    useEffect(() => {
        if (_.isEmpty(_.intersection(role, rolesWithZoneMapping)) && zone)
            setZone(undefined);
        if (_.isEmpty(_.intersection(role, rolesWithMdmCustomerMapping)) && mdmCustomer)
            setMdmCustomer(undefined);
        if (_.isEmpty(_.intersection(role, rolesWithShopifyUser)) && shopifyUser)
            setShopifyUser(undefined);
    },[role])

    const restoreDefault = () => {
        setEmailId('');
        setRole([]);
        setSearchText('');
        setEmailList([]);
        setZone([]);
        setName('');
    }

    const onCancelHandler = () => {

        restoreDefault();
        props.onCancel();
    }

    const addUserHandler = (event) => {
        event.preventDefault();

        let updatedData = {}

        if (emailId !== '' && role.length>0 ) {

            if (!emailId.toLowerCase().endsWith('tataconsumer.com')) {
                props.responseHandler("Not Permitted", "Can not add user without tataconsumer email", 'FAILURE')
            }
            else {
                let selectedCode =[];
                if (!_.isEmpty(_.intersection(rolesWithZoneMapping, role)))
                    selectedCode.push(zone?.toString());
                if (!_.isEmpty(_.intersection(rolesWithMdmCustomerMapping, role)))
                    selectedCode.push(mdmCustomer?.toString());
                else if (!_.isEmpty(_.intersection(rolesWithShopifyUser, role)))
                    selectedCode.push(shopifyUser?.toString());
                updatedData = { name, email: emailId, role, code: selectedCode.join(',') };

                restoreDefault();
                props.onAddUserDetails(updatedData)
            }

        }


    }

    const emailChangeHandler = async (value) => {
        value = value + '';
        setEmailId(value);
        setEmailList([]);
        if (value.length >= 3) {
            if (searchText !== '' && value.startsWith(searchText)) {
                let el = [...originalEmailList].filter(u => u.value.toLowerCase().startsWith(value.toLowerCase()));
                setEmailList([...el]);
                const user = originalResponse.current.find(u => u.email === value);
                user && setName(user.name);
            }
            else {
                setSearchText(value);
                setName('');
                let response = await props.getAzureADUserData(value);
                if (response.success && response.data.length > 0) {
                    let el = [...response.data].map(u => { return { value: u.email } });
                    originalResponse.current = response.data;
                    setEmailList(el);
                    setOriginalEmailList(el);
                    setName(response.data[0].name);
                }
            }
        } else {
            setSearchText('');
        }

    };

    const roleChangeHandler = (value) => {
        setRole(value);
    };

    const zoneChangeHandler = (value) => {
        setZone(value);
    }

    const mdmCustomerChangeHandler = (value) => {
        setMdmCustomer(value)
    }
    const shopifyUserChangeHandler = (value) => {
        setShopifyUser(value)
    }

    return (
        <>
            <Modal title="Add New User" visible={props.visible} onCancel={onCancelHandler} footer={null} wrapClassName='details-modal' maskClosable={false}>

                <form onSubmit={addUserHandler}>
                    <div className="form-wraps">
                        <label>Email Address</label>
                        <AutoComplete
                            options={emailList}
                            placeholder="Enter email id here"
                            value={emailId}
                            onChange={(value) => emailChangeHandler(value)}
                            filterOption={(inputValue, option) =>
                                option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                            }
                        />



                    </div>
                    <div className="form-wraps">
                        <label>User Role</label>
                        <Select
                            mode='multiple'
                            value={role}
                            onChange={(value) => roleChangeHandler(value)}
                            options={userRoles.map(({ label, value }) => ({ label, value }))}
                        />
                    </div>
                    {!_.isEmpty(_.intersection(rolesWithZoneMapping,role)) && <div className="form-wraps">
                        <label>User Zones</label>
                        <Select
                            mode='multiple'
                            size='large'
                            value={zone}
                            onChange={(value) => zoneChangeHandler(value)}
                            options={zones?.sort().map((value) => ({ label: value, value }))}
                        />
                    </div>}
                    {!_.isEmpty(_.intersection(rolesWithMdmCustomerMapping, role)) && <div className="form-wraps">
                        <label>Customers</label>
                        <Select
                            mode='multiple'
                            size='large'
                            value={mdmCustomer}
                            onChange={(value) => mdmCustomerChangeHandler(value)}
                            options={mdmCustomersList?.sort().map((value) => ({ label: value.customer_name, value: value.customer_name }))}
                        />
                    </div>}
                    {!_.isEmpty(_.intersection(rolesWithShopifyUser, role)) && <div className="form-wraps">
                        <labels>Sales Org</labels>
                        <Select
                            mode='multiple'
                            size='large'
                            value={shopifyUser}
                            onChange={(value) => shopifyUserChangeHandler(value)}
                            options={shopifyCustomersList?.sort().map((value) => ({ label: value.sales_org, value:value.sales_org }))}
                        />
                        </div>

                    }

                    <div className="form-buttons">
                        <button className="cancel-btns" type='button' onClick={onCancelHandler}> Cancel </button>
                        <button type="submit" className="submit-btns" disabled={(emailId.length < 20 || role.length===0 || !hasEditPermission(pages.USER_MANAGEMENT))} > Submit </button>
                    </div>
                </form>

            </Modal>
        </>
    )
}

const mapDispatchToProps = (dispatch) => {
    return {
        getAzureADUserData: (search_text) => dispatch(Action.getAzureADUserData(search_text))
    }
}

const NewUserModal = connect(
    null,
    mapDispatchToProps
)(AddUserModal)

export default NewUserModal;
