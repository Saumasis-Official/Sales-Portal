import React, { useEffect, useState } from 'react';
import { Modal, Radio, Select, notification } from 'antd';
import Util from '../../../util/helper/index';
import './cfadepo.css';
import LocalAuth from '../../../util/middleware/auth'
import { pages, hasEditPermission } from '../../../persona/distributorHeader';
import _ from "lodash";
import { allDivisionsArr } from "../../../config/constant";


const { Option } = Select;

function CfaDepotModal(props) {
    const {
        datas: cfaData,
        onHide,
        visible,
        onUpdate,
        isUpdate,
        updateMultiple: isMultiUpdate,
        view: isView,
        region,
        cfaDatas,
        areaDetails,
    } = props;

    const distributionChannels = [10, 40];
    const division = allDivisionsArr;
    const [data, setData] = useState([]);
    const [isValid, setIsValid] = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [selectedOption, setSelectedOption] = useState('zone')
    const [isAdd, setIsAdd] = useState(false);
    const [zoneOptions, setZoneOptions] = useState([]);
    const adminRole = LocalAuth.getAdminRole();
    useEffect(() => {
        setData(cfaData);
    }, [cfaData]);

    useEffect(() => {
        const mappedZones = _.uniq(cfaDatas?.map(item => item.region_id) ?? []);
        const zoneSet = new Set();
        areaDetails?.forEach(obj => {
            if (mappedZones.includes(obj.region_id))
                zoneSet.add(obj.region);
        })
        setZoneOptions([...zoneSet]);
    }, [cfaDatas, areaDetails]);

    useEffect(() => {
        setIsAdd((!isUpdate && !isMultiUpdate && !isView))
    }, [isUpdate, isMultiUpdate, isView])

    const handleCancel = () => {
        onHide();
    };

    const changeHandler = (prop, event) => {
        let { value } = event.target;
        if (prop.includes("email")) {
            value = value.split(' ').join('');
        }
        if (prop.includes('contact_number')) {
            if (value.length > 10 || value.length < 10)
                setIsValid({ ...isValid, contact_number: false })
            else setIsValid({ ...isValid, contact_number: true })
        }
        setData({ ...data, [prop]: value });
    };
    const selectHandler = (prop, value) => {
        setData({ ...data, [prop]: value });
    };
    const selectHandlerMultiple = (value) => {
        const prop = selectedOption;
        setData({ ...data, [prop]: value });
    };

    const handleRadioChange = (e) => {
        setData({ ...data, zone: [], depot_code: [] });
        setSelectedOption(e.target.value)
    }
    const validateEmailChanger = (str, e) => {
        const { value } = e.target;
        const regex = /^([a-zA-Z0-9._%+-]+@tataconsumer\.com)(,([a-zA-Z0-9._%+-]+@tataconsumer\.com))*$/;

        // const valid = Util.validateEmail(value.split(' ').join(''));
        let validate = false;
        if (value === "" || value.includes('@tataconsumer.com')) {
            validate = true;
        }
        validate = regex.test(value);
        setIsValid({ ...isValid,[str]: validate});
        if (!validate) {
            const formattedstr = `invalid email in  ${str}`;
            Util.notificationSender("Error", formattedstr, false);
            setErrorMessage(formattedstr);
        }
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        const valid = validatePayload();
        valid && onUpdate(data);
    };

    const validatePayload = () => {
        let valid = true;
        if (isAdd) {
            const mandatoryFields = ['zone', 'depot_code', 'sales_org', 'distribution_channel', 'email', 'logistic_email', 'zone_manager_email', 'cluster_manager_email', 'remarks'];
            mandatoryFields.forEach(field => {
                if (!data[field] || data[field] === 0) {
                    valid = false;
                }
            });
        } else if (isMultiUpdate) {
            if (!data['zone'] && !data['depot_code']) {
                valid = false;
            }
        }

        if (Object.keys(isValid).length > 0) {
            const validResult = Object.keys(isValid).some(item => isValid[item] === false);
            if (validResult) {
                Util.notificationSender("Error", "Invalid Data in ", false);
                return false;
            }
        }

        !valid && Util.notificationSender("Error", "Please fill all mandatory fields", false);
        return valid;
    }

    function mandatoryMarker() {
        return <span className="mandatory-mark"><b>*</b></span>
    }
    return (
        <Modal
            title="CFA Depot Mapping"
            visible={visible}
            className='cfa-depot-modal'
            onCancel={handleCancel}
            width={'60%'}
            footer={null}>
            <form>
                <div className="basic-details basic-cfa-details">
                    {isMultiUpdate &&
                        <div id='zone-depot-code' className={isUpdate ? 'basic-details form-wrapper' : 'basic-details form-wrap'}>
                            <div>Conditions:</div>
                            <br />
                            <Radio.Group className='condition-radio-group' onChange={handleRadioChange} value={selectedOption}>
                                <Radio value="zone">Zone {mandatoryMarker()}</Radio>
                                <Radio value="depot_code">Depot code {mandatoryMarker()}</Radio>
                            </Radio.Group>

                            <Select
                                mode="multiple"
                                allowClear
                                className="basic-details"
                                showSearch
                                placeholder="Select a region"
                                value={selectedOption === 'zone' ? data?.zone : data?.depot_code}
                                onChange={(value) => selectHandlerMultiple(value)}
                            >
                                {selectedOption === 'zone' &&
                                    zoneOptions?.sort()?.map((data) => {
                                        return <Option key={data} value={data}>{data}</Option>;
                                    }
                                    )}
                                {selectedOption === 'depot_code' && [...new Set(cfaDatas?.map(data => data.depot_code).sort())].map((data, i) => {
                                    return <Option key={i} value={data}>{data}</Option>;
                                })}
                            </Select>
                        </div>
                    }
                    {(isUpdate || isAdd || isView) &&
                        <>
                            <div id='zone' className={isUpdate ? 'basic-details form-wrapper' : 'basic-details form-wrap'}>
                                <label>Zone
                                    {(isAdd || isUpdate) && mandatoryMarker()}
                                </label>
                                {isUpdate ? (
                                    <span>{data?.zone}</span>
                                ) : (
                                    <Select
                                        className="basic-details"
                                        showSearch
                                        value={data?.zone}
                                        onChange={(value) => selectHandler('zone', value)}
                                        placeholder="region"
                                        getPopupContainer={() => document.getElementById('zone')}
                                    >
                                        {region?.sort().map((data) => {
                                            return <Option key={data} value={data}>{data}</Option>;
                                        })}
                                    </Select>
                                )}
                            </div>
                            <div id='depot-code' className={isUpdate ? 'basic-details form-wrapper' : 'basic-details form-wrap'}>
                                <label>Depot Code
                                    {(isAdd || isUpdate) && mandatoryMarker()}
                                </label>
                                {isUpdate ? (
                                    <span>{data?.depot_code}</span>
                                ) : (
                                    <input
                                        type="number"
                                        value={data?.depot_code}
                                        onWheel={(e) => e.currentTarget.blur()}
                                        onChange={(e) => changeHandler('depot_code', e)}
                                        placeholder={'Please enter depot code'}
                                        className="form-control"
                                    />
                                )}
                            </div>
                        </>
                    }
                    <div id='division' className={isUpdate ? 'basic-details form-wrapper' : 'basic-details form-wrap'}>
                        <label>Division
                            {(isAdd || isUpdate) && mandatoryMarker()}
                        </label>
                        {isUpdate ? (
                            <span>{data?.division}</span>
                        ) : (
                            <Select
                                mode="multiple"
                                allowClear
                                style={{
                                    width: '100%',
                                }}
                                value={data?.division === 0 ? [] : data?.division}
                                onChange={(value) => selectHandler('division', value)}
                                placeholder="Please select"
                                getPopupContainer={() => document.getElementById('division')}
                            >
                                {division?.map((data) => {
                                    return <Option key={data} value={data}>{data}</Option>;
                                })}
                            </Select>
                        )}
                    </div>

                    {/* Line Separator */}
                    {isMultiUpdate &&
                        <>
                            <br />
                            <div className='line-separator'></div>
                            <br />
                            <div className='line-separator-div-head'>Update Values:</div>
                            <div className='line-separator-div-comment'>(Enter only in those fields for which value to be updated)</div>
                            <br />
                        </>}
                    {/* ================================================================================================================== */}

                    {/* Sales Org */}
                    {!isMultiUpdate &&
                        <div className={isUpdate ? 'basic-details form-wrapper' : 'basic-details form-wrap'}>
                            <label>Sales Org
                                {(isAdd || isUpdate) && mandatoryMarker()}
                            </label>
                            {isUpdate ? (
                                <span>{data?.sales_org}</span>
                            ) : (
                                <input
                                    type="number"
                                    value={data?.sales_org}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    onChange={(e) => changeHandler('sales_org', e)}
                                    placeholder={'Please enter sales org'}
                                    className="form-control"
                                />
                            )}
                        </div>}

                    {/* Dist channel */}
                    {!isMultiUpdate &&
                        <div id='dist-ch' className={isUpdate ? 'basic-details form-wrapper' : 'basic-details form-wrap'}>
                            <label>Distribution Channel
                                {(isAdd || isUpdate) && mandatoryMarker()}
                            </label>
                            {isUpdate ? (
                                <span>{data?.distribution_channel}</span>
                            ) : (
                                <Select
                                    showSearch
                                    value={data?.distribution_channel}
                                    onChange={(value) =>
                                        selectHandler('distribution_channel', value)
                                    }
                                    placeholder="region"
                                    getPopupContainer={() => document.getElementById('dist-ch')}
                                >
                                    {distributionChannels?.map((data) => {
                                        return <Option key={data} value={data}>{data}</Option>;
                                    })}
                                </Select>
                            )}
                        </div>}

                    {/* Location */}
                    <div className={isView ? 'form-wrapper' : 'form-wrap'}>
                        <label>Location {(isAdd || isUpdate) && mandatoryMarker()} </label>
                        {isView ? (
                            <span>{data?.location}</span>
                        ) : (
                            <input
                                type="text"
                                value={data?.location}
                                onChange={(e) => changeHandler('location', e)}
                                placeholder={'Please enter location'}
                                className="form-control"
                            />
                        )}
                    </div>

                    {/* Email Address */}
                    <div className={isView ? 'form-wrapper' : 'form-wrap'}>
                        <label>Email Address
                            {(isAdd || isUpdate) && mandatoryMarker()}
                        </label>
                        {isView ? (
                            <span>{data?.email}</span>
                        ) : (
                            <input
                                type="email"
                                value={data?.email}
                                onChange={(e) => {
                                    changeHandler('email', e);
                                }}
                                onBlur={(e) => validateEmailChanger('email', e)}
                                placeholder={'Please enter email Id'}
                                className="form-control"
                            />
                        )}
                    </div>

                    {/* Name */}
                    <div className={isView ? 'form-wrapper' : 'form-wrap'}>
                        <label>Name {(isAdd || isUpdate) && mandatoryMarker()}</label>
                        {isView ? (
                            <span>{data?.name}</span>
                        ) : (
                            <input
                                type="name"
                                value={data?.name}
                                onChange={(e) => changeHandler('name', e)}
                                placeholder={'Please enter name'}
                                className="form-control"
                            />
                        )}
                    </div>

                    {/* Address */}
                    <div className={isView ? 'form-wrapper' : 'form-wrap'}>
                        <label>Address {(isAdd || isUpdate) && mandatoryMarker()}</label>
                        {isView ? (
                            <span>{data?.address}</span>
                        ) : (
                            <textarea
                                type="text"
                                value={data?.address}
                                onChange={(e) => changeHandler('address', e)}
                                placeholder={'Please enter Address'}
                                className="form-control address"
                            />
                        )}
                    </div>

                    {/* Contact Person */}
                    <div className={isView ? 'form-wrapper' : 'form-wrap'}>
                        <label>Contact Person {(isAdd || isUpdate) && mandatoryMarker()}</label>
                        {isView ? (
                            <span>{data?.contact_person}</span>
                        ) : (
                            <input
                                type="text"
                                value={data?.contact_person}
                                onChange={(e) => changeHandler('contact_person', e)}
                                placeholder={'Please enter contact person'}
                                className="form-control"
                            />
                        )}
                    </div>

                    {/* Contact Number */}
                    <div className={isView ? 'form-wrapper' : 'form-wrap'}>
                        <label>Contact Number {(isAdd || isUpdate) && mandatoryMarker()}</label>
                        {isView ? (
                            <span>{data?.contact_number}</span>
                        ) : (
                            <input
                                type="number"
                                value={data?.contact_number}
                                onChange={(e) => changeHandler('contact_number', e)}
                                placeholder={'Please enter contact number'}
                                className="form-control"
                            />
                        )}
                    </div>

                    {/* Logistics Email */}
                    <div className={isView ? 'form-wrapper' : 'form-wrap'}>
                        <label>Logistics Email
                            {(isAdd || isUpdate) && mandatoryMarker()}
                        </label>
                        {isView ? (
                            <span>{data?.logistic_email}</span>
                        ) : (
                            <input
                                type="email"
                                value={data?.logistic_email}
                                onChange={(e) => changeHandler('logistic_email', e)}
                                onBlur={(e) =>
                                    validateEmailChanger('logistic_email', e)
                                }
                                placeholder={'Please enter logistic email'}
                                className="form-control"
                            />
                        )}
                    </div>

                    {/* Zonal Email */}
                    <div className={isView ? 'form-wrapper' : 'form-wrap'}>
                        <label>Zone Manager Email
                            {(isAdd || isUpdate) && mandatoryMarker()}
                        </label>
                        {isView ? (
                            <span>{data?.zone_manager_email}</span>
                        ) : (
                            <input
                                type="email"
                                value={data?.zone_manager_email}
                                onChange={(e) => changeHandler('zone_manager_email', e)}
                                onBlur={(e) =>
                                    validateEmailChanger('zone_manager_email', e)
                                }
                                placeholder={'Please enter zone manager email'}
                                className="form-control"
                            />
                        )}
                    </div>

                    {/* Cluster Email */}
                    <div className={isView ? 'form-wrapper' : 'form-wrap'}>
                        <label>Cluster Manager Email
                            {(isAdd || isUpdate) && mandatoryMarker()}
                        </label>
                        {isView ? (
                            <span>{data?.cluster_manager_email}</span>
                        ) : (
                            <input
                                type="email"
                                value={data?.cluster_manager_email}
                                onChange={(e) =>
                                    changeHandler('cluster_manager_email', e)
                                }
                                onBlur={(e) =>
                                    validateEmailChanger('cluster_manager_email', e)
                                }
                                placeholder={'Please enter cluster manager email'}
                                className="form-control"
                            />
                        )}
                    </div>

                    {/* Remarks */}
                    <div className={isView ? 'form-wrapper' : 'form-wrap'}>
                        <label>Remarks
                            {(isAdd || isUpdate || isMultiUpdate) && mandatoryMarker()}
                        </label>
                        {isView ? (
                            <span>{data?.remarks}</span>
                        ) : (
                            <input
                                type="text"
                                value={data?.remarks}
                                onChange={(e) => changeHandler('remarks', e)}
                                placeholder={'Please enter remarks'}
                                className="form-control"
                            />
                        )}
                    </div>

                    {/* Status */}
                    {isUpdate &&
                        <div className="form-wrapper">
                            <label>Status</label>
                            {isView ? (
                                <span>{data?.is_deleted ? 'INACTIVE' : 'ACTIVE'}</span>
                            ) : (
                                <span className='cfa-status-select' id='del-select'>
                                    <Select
                                        style={{ width: '205px', marginTop: 15 }}
                                        value={data?.is_deleted}
                                        getPopupContainer={() => document.getElementById('del-select')}
                                        onChange={(value) =>
                                            selectHandler('is_deleted', value)
                                        }
                                    >
                                        <Option value={false}>ACTIVE</Option>
                                        <Option value={true}>INACTIVE</Option>
                                    </Select>
                                </span>
                            )}
                        </div>}

                    {/* Submit Button */}
                    {!isView && hasEditPermission(pages.CFA_DEPOT_MAPPING) &&
                        <button
                            disabled={(Object.keys(isValid).length>0 && Object.keys(isValid).some(item=>isValid[item]===false)) || data?.remarks?.length <= 0}
                            className="submit-btn"
                            onClick={(e) => handleSubmit(e)}>
                            {(isUpdate || isMultiUpdate) ? 'Update' : 'Add'}
                        </button>}
                </div>

            </form>
        </Modal>
    );
}

export default CfaDepotModal;