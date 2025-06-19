// import react from 'react'
import React, { useEffect, useState, useRef } from 'react';
import { connect } from 'react-redux';
import { Select, Option, Tooltip, notification, Checkbox, Row, Col } from 'antd';
import * as Action from '../../actions/adminAction';
import Auth from '../../../../util/middleware/auth';
import { browserHistory } from 'react-router';
import '../AppSettings1.css';
import { set } from 'lodash';


function MoqSettings(props) {

	const { app_setting_list, getAppSettingList, updateAppSetting, sso_user_details} = props

	const [settingData, setSettingData] = useState([]);
	const [settingUpdatedData, setSettingUpdatedData] = useState([]);
	const [isEditable, setIsEditable] = useState(false);
	const [isDisable, setIsDisable] = useState(true);
    const remarks = useRef({});

	const ssoRole = sso_user_details.data && sso_user_details.data.length && sso_user_details.data[0].roles;
	const isSupportAdmin = (ssoRole?.includes('SUPPORT'));

	const { Option } = Select;
	useEffect(() => {
		if (app_setting_list && app_setting_list.data){
            let settingList = [];
			for (let data of app_setting_list.data) {
				settingList.push({ ...data, disabled: true })
			}
			setSettingData(settingList);
        }
	}, [app_setting_list]);

    const notificationSender = (success, message, description) => {
        if (success) {
            notification.success({
                message: message,
                description: description,
                duration: 3,
                className: 'notification-green',
            });
        } else {
            notification.error({
                message: message,
                description: description,
                duration: 3,
                className: 'notification-error',
            })
        }
    }

	const editOrCancelSettingHandler = () => {
		document.documentElement.scrollTop = 0;
		if (isEditable) {
			let settingList = [];
			for (let data of app_setting_list.data) {
				settingList.push({ ...data, disabled: true })
			}
			setSettingData(settingList);
			setSettingUpdatedData([]);
		}
		setIsEditable(!isEditable);
		setIsDisable(true);
	}

	const changeSelectSettingHandler = (value, feature) => {
        if(remarks.current[feature].value.length > 4){
            setIsDisable(false);
        }else{
            setIsDisable(true);
        }
		settingData.map((data) => {
			if (data.key === feature) {
				data.value = value;
				data.disabled = false;
			}
		})
		setSettingData([...settingData]);
		let exists = false;
		settingUpdatedData.map((data) => {
			if (data.key === feature) {
				data.value = value;
				exists = true;
			}
			return "";
		});
		if (exists) {
			setSettingUpdatedData([...settingUpdatedData]);
		} else {
			setSettingUpdatedData(prev => {
				let arr = [...prev];
				arr.push({ key: feature, value });
				return arr;
			})
		}
	}

	const changeRemarksHandler = (event, feature) => {
		if (event.target.value.length >= 5) {
			setIsDisable(false)
			settingData.map((data) => {
				if (data.key === feature) {
					data.remarks = event.target.value;
				}
			})
			setSettingData([...settingData]);

			let remarkState = settingUpdatedData.map((item) => {
				if (item.key === feature) {
					item.remarks = event.target.value;
				}
				return item;
			})
			setSettingUpdatedData(remarkState);
		}else{
            setIsDisable(true);
        }

	}

	const saveSettingHandler = async () => {
		for (let datum of settingUpdatedData) {
			if (!datum.remarks) {
				return notificationSender(false, 'Error', `Please enter remarks for feature ${datum.key}`);
			} else if (datum.remarks.trim().length < 5) {
                notificationSender(false, 'Error', `Please enter minimum 5 characters in remarks to update the feature ${datum.key}`);
			}
		}

		try {
			const res = await updateAppSetting({ app_level_configuration: settingUpdatedData });
			if (res && res.data && res.data.success) {
				getAppSettingList();
				setSettingUpdatedData([]);
                notificationSender(true, 'Success', 'App settings updated successfully');
				setIsDisable(true);
				setIsEditable(false);
			} else {
                notificationSender(false, 'Error', (res && res.data && res.data.message) ? res.data.message : 'Some error ocurred while updating app settings');
			}
		} catch (error) {
            notificationSender(false, 'Error', 'Some error ocurred while updating app settings');
		}
	}


	const changeTextSettingHandler = (event, feature) => {
		if(remarks.current[feature].value.length > 4){
            setIsDisable(false);
        }else{
            setIsDisable(true);
        }
        let v = event.target.value.toString().toUpperCase();
		if((typeof +(v) == 'number') && v.length > 0){
			v = Math.abs(parseFloat(v).toFixed(2));
			v = v>100 ? parseInt(v/10)+'' : v+'';
		}
		setSettingData(prev => {
			prev = prev.map((data) => {
				if (data.key === feature) {
					data.value = v;
					data.disabled = false;
				}
				return {...data};
			});
			return prev;
		});
		let temp = settingUpdatedData.find((data) => data.key === feature);
		if(v.length > 0)
			if(temp == null){
				setSettingUpdatedData([...settingUpdatedData, {key: feature, value: v}]);
			}else{
				setSettingUpdatedData(prev => {
					prev = prev.map((data) => {
						if (data.key === feature) {
							data.value = v;
						}
						return {...data};
					});
					return prev;
				});
			}
	}

	return (
		<div className="admin-dashboard-wrapper-1">
			<div className="admin-dashboard-table">
				<div className='we-table'>
					{/* PDP Universal Switch */}
					<table>
						<thead>
							<tr>
								<th className='width30'>Feature</th>
								<th className='width20'>Value</th>
								<th className='width20'>Last updated by</th>
								<th className='width30'>Remarks</th>
							</tr>
						</thead>
						<tbody>
							{settingData && settingData.filter(data => data.key === 'MOQ_ENABLE' || data.key === 'MOQ_TOLERANCE').map((data, i) => {
								return (
									<tr key={i}>
										<td className='app-desc'>{data.key}<span>{data.description ? data.description : ''}</span></td>
										<td>
											<div className='value-col'>
                                            {isEditable ?
													(data.field_type === "SET" ?
														<Select
															className='user-role-select'
															value={data.value}
															onChange={(val) => changeSelectSettingHandler(val, data.key)}
															dropdownClassName="user-role-dropdown"
														>
															{data.allowed_values.map((value, index) => {
																return <Option key={index} value={value}>{value === 'TRUE'? 'YES': 'NO'}</Option>
															})}

														</Select> :
														<><input className='value-text-fld' 
                                                        type="number"
                                                        value={Math.abs(parseFloat(data.value))}
                                                        min={0.0}
														max={100.0}
                                                        step={0.1}
                                                        style={{backgroundColor:  '#f5f6f6' }}
                                                        onChange={(event) => changeTextSettingHandler(event, data.key)} />%</>
													) :
													(data.field_type === "SET" ?
                                                    <Tooltip placement="left" title={data.value}>{data.value === 'TRUE'? 'YES': 'NO'}</Tooltip> :
                                                    <Tooltip placement="left" title={data.value+'%'}>{(parseFloat(data.value)) ? Math.abs(parseFloat(data.value))+'': data.value}%</Tooltip>)
												}
											</div>
										</td>
										<td>{(data.first_name && data.last_name && data.user_id) ? `${data.first_name} ${data.last_name} (${data.user_id})` : data.updated_by}</td>
										<td className='remarks-value'>
											{!isEditable ? (
												(!data.remarks || data.remarks.trim().length === 0) ?
													'-' : <Tooltip placement="left" title={data.remarks}>{data.remarks}</Tooltip>
											) :
												<textarea ref={el => remarks.current[data.key] = el} placeholder='Please enter your remarks (minimum 10 characters)'
													onChange={(e) => changeRemarksHandler(e, data.key)} disabled={data.disabled} />

											}
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			</div>
			{!isSupportAdmin && <div className='btn-wrapper'>
				<button type='button' onClick={editOrCancelSettingHandler}>{isEditable ? 'Cancel' : 'Edit'}</button>
				<button type='button' onClick={saveSettingHandler} disabled={isDisable}>Save</button>
			</div>}
		</div>
	)
}

const mapStateToProps = (state) => {
	return {
		app_setting_list: state.admin.get('app_setting_list'),
		sso_user_details: state.admin.get('sso_user_details')
	}
}
const mapDispatchToProps = (dispatch) => {
	return {
		getAppSettingList: () =>
			dispatch(Action.getAppSettingList()),
		updateAppSetting: (data) =>
			dispatch(Action.updateAppSetting(data))
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(MoqSettings);