/**
 * SOPE- 952: PDP Window, every section of the PDP window should be editable by the admin separately.
 * updatedSettingData object has been created to store updated data for each section.
 * Similarly isEditable and isDisable object is used for manage each sections.
 */
import React, { useEffect, useState, useRef } from 'react';
import { connect } from 'react-redux';
import { Select, Tooltip, notification, Checkbox, Row, Col } from 'antd';
import * as Action from '../../actions/adminAction';
import Auth from '../../../../util/middleware/auth';
import '../AppSettings1.css';
import { hasViewPermission, pages } from '../../../../persona/distributorHeader';
import Tabs from "../../../../components/Tabs/Tabs";
import _ from "lodash";
import CommentModal from '../../../../components/CommentModal/CommentModal';
import SelectBox from '../../../../components/Selectbox';
import Util from '../../../../util/helper';
import Loader from '../../../../components/Loader/index';

const tabsOptions = [
	{ label: 'Global Windows', value: 'global', default: true },
	{ label: 'Exceptional Windows', value: 'exceptional' },
];

function getDaysArray() {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // Months are zero-based, so we add 1
    const daysInMonth = new Date(year, month, 0).getDate(); // Get the number of days in the current month

    let arr = Array.from({ length: daysInMonth }, (_, i) => i + 1);
	arr = arr.map(i => i.toString());
	return arr;
}
const date = new Date();
const year = date.getFullYear();
const month = date.getMonth() + 1; // Months are zero-based, so we add 1
const daysInMonth = new Date(year, month, 0).getDate(); // Get the number of days in the current month

const thresholdFrequencyOptions = [
	{ label: '1', value: '1' },
	{ label: '2', value: '2' },
	{ label: '3', value: '3' },
	{ label: '4', value: '4' },
]
function PdpWindow(props) {
	const browserHistory = props.history;
	const { app_setting_list, getAppSettingList, updateAppSetting, sso_user_details, getSSODetails, getMaintenanceRequests, getCustomerGroupDetails, customer_group_list, dashboardFilterCategories, getPDPWindows, pdp_windows, upsertPDPWindow, deletePDPException, getPDPUnlockWindow, updatePDPUnlockWindow } = props

	const [settingData, setSettingData] = useState([]);
	const updatedSettingData = useRef({
		PDP: [],
		WE_PDP: {},
		FN_PDP: {},
		PDP_UPDATE: [],
		PDP_UNLOCK_WINDOW_CGS: []
	});
	const [isEditable, setIsEditable] = useState({
		PDP: false,
		WE_PDP: false,
		FN_PDP: false,
		PDP_UPDATE: false,
		PDP_UNLOCK_WINDOW: false,
		PDP_UNLOCK_WINDOW_CGS: false
	});
	const [isDisable, setIsDisable] = useState({
		PDP: true,
		WE_PDP: true,
		FN_PDP: true,
		PDP_UPDATE: true,
		PDP_UNLOCK_WINDOW: true,
		PDP_UNLOCK_WINDOW_CGS: true
	});
	const [weekDaySettings, setWeekDaySettings] = useState([]);
	const [customerGroupList, setCustomerGroupList] = useState([]);
	const [selectedCustomerGroups, setSelectedCustomerGroups] = useState([]);
	const [originalSelectedCustomerGroups, setOriginalSelectedCustomerGroups] = useState([]);
	const [tabName, setTabName] = useState('global');
	const [regionOptions, setRegionOptions] = useState([]);
	const [selectedRegionId, setSelectedRegionId] = useState('');
	const [selectedFrequency, setSelectedFrequency] = useState(null);
	const [remarksModalOpen, setRemarksModalOpen] = useState(false);
	const [eventIdentifier, setEventIdentifier] = useState("");
	const [isAddExceptionPDP, setIsAddExceptionPDP] = useState(false);
	const [pdpUnlockWindow, setPdpUnlockWindow] = useState([]);
	const [startDateAll, setStartDateAll] = useState('');
	const [endDateAll, setEndDateAll] = useState('');
	const [remarksAll, setRemarksAll] = useState('');
	const [checkAll , setCheckAll] = useState(false);
	const [updatedPdpUnlockWindow, setUpdatedPdpUnlockWindow] = useState([]);

	const [pdpUnlockCgs, setPdpUnlockCgs] = useState([]);
	const [selectedPdpUnlockCgs, setSelectedPdpUnlockCgs] = useState([]);
	const [originalSelectedPdpUnlockCgs, setOriginalSelectedPdpUnlockCgs] = useState([]);

	const ssoRole = sso_user_details?.data?.length && sso_user_details.data[0].roles;
	const isSupportAdmin = (ssoRole?.includes('SUPPORT'));

	const weekDays = [
		{
			key: 'MO',
			index: 1,
			value: 'MONDAY',
			orderWindow: 'order_window_mo',
			orderPlacementEndTime: "order_placement_end_time_mo",
			startDayWE: "",
			startTimeWE: "",
			endDayWE: "",
			endTimeWE: "",
			startDayFN: "",
			startTimeFN: "",
			endDayFN: "",
			endTimeFN: "",
			threshold_frequency: null,
			orderWindowHoursWE: null,
			orderPlacementEndTimeHoursWE: null,
			orderWindowHoursFN: null,
			orderPlacementEndTimeHoursFN: null
		},
		{
			key: 'TU',
			index: 2,
			value: 'TUESDAY',
			orderWindow: 'order_window_tu',
			orderPlacementEndTime: "order_placement_end_time_tu",
			startDayWE: "",
			startTimeWE: "",
			endDayWE: "",
			endTimeWE: "",
			startDayFN: "",
			startTimeFN: "",
			endDayFN: "",
			endTimeFN: "",
			threshold_frequency: null,
			orderWindowHoursWE: null,
			orderPlacementEndTimeHoursWE: null,
			orderWindowHoursFN: null,
			orderPlacementEndTimeHoursFN: null,
		},
		{
			key: 'WE',
			index: 3,
			value: 'WEDNESDAY',
			orderWindow: 'order_window_we',
			orderPlacementEndTime: "order_placement_end_time_we",
			startDayWE: "",
			startTimeWE: "",
			endDayWE: "",
			endTimeWE: "",
			startDayFN: "",
			startTimeFN: "",
			endDayFN: "",
			endTimeFN: "",
			threshold_frequency: null,
			orderWindowHoursWE: null,
			orderPlacementEndTimeHoursWE: null,
			orderWindowHoursFN: null,
			orderPlacementEndTimeHoursFN: null,
		},
		{
			key: 'TH',
			index: 4,
			value: 'THURSDAY',
			orderWindow: 'order_window_th',
			orderPlacementEndTime: "order_placement_end_time_th",
			startDayWE: "",
			startTimeWE: "",
			endDayWE: "",
			endTimeWE: "",
			startDayFN: "",
			startTimeFN: "",
			endDayFN: "",
			endTimeFN: "",
			threshold_frequency: null,
			orderWindowHoursWE: null,
			orderPlacementEndTimeHoursWE: null,
			orderWindowHoursFN: null,
			orderPlacementEndTimeHoursFN: null,
		},
		{
			key: 'FR',
			index: 5,
			value: 'FRIDAY',
			orderWindow: 'order_window_fr',
			orderPlacementEndTime: "order_placement_end_time_fr",
			startDayWE: "",
			startTimeWE: "",
			endDayWE: "",
			endTimeWE: "",
			startDayFN: "",
			startTimeFN: "",
			endDayFN: "",
			endTimeFN: "",
			threshold_frequency: null,
			orderWindowHoursWE: null,
			orderPlacementEndTimeHoursWE: null,
			orderWindowHoursFN: null,
			orderPlacementEndTimeHoursFN: null,
		},
		{
			key: 'SA',
			index: 6,
			value: 'SATURDAY',
			orderWindow: 'order_window_sa',
			orderPlacementEndTime: "order_placement_end_time_sa",
			startDayWE: "",
			startTimeWE: "",
			endDayWE: "",
			endTimeWE: "",
			startDayFN: "",
			startTimeFN: "",
			endDayFN: "",
			endTimeFN: "",
			threshold_frequency: null,
			orderWindowHoursWE: null,
			orderPlacementEndTimeHoursWE: null,
			orderWindowHoursFN: null,
			orderPlacementEndTimeHoursFN: null,
		},
		{
			key: 'SU',
			index: 0,
			value: 'SUNDAY',
			orderWindow: 'order_window_su',
			orderPlacementEndTime: "order_placement_end_time_su",
			startDayWE: "",
			startTimeWE: "",
			endDayWE: "",
			endTimeWE: "",
			startDayFN: "",
			startTimeFN: "",
			endDayFN: "",
			endTimeFN: "",
			threshold_frequency: null,
			orderWindowHoursWE: null,
			orderPlacementEndTimeHoursWE: null,
			orderWindowHoursFN: null,
			orderPlacementEndTimeHoursFN: null,
		}
	];

	const { Option } = Select;


	useEffect(() => {
		if (app_setting_list?.data) {
			const previouslyUpdatedData = (Object.values(updatedSettingData.current))?.flat();
			let settingList = [];
			/**
			 * check if data is present in previouslyUpdatedData
			 * then update data with the updated data value, remarks and disabled = false
			 * finally push this modified data object to settingList 
			 */
			for (let data of app_setting_list.data) {
				const updatedData = previouslyUpdatedData.find((item) => item.key === data.key);
				if (updatedData) {
					settingList.push({ ...data, value: updatedData.value, remarks: updatedData.remarks, disabled: false })
				} else {
					settingList.push({ ...data, disabled: true })
				}
			}
			setSettingData(settingList);
		}
	}, [app_setting_list])

	function fetchPDPUnlockWindow() {
		getPDPUnlockWindow().then(res => {
			if (res?.success) {
				const data = (structuredClone(res.data)).map(item => {
					item['checked'] = false;
					item['isRemarksDisabled'] = true;
					return item;
				});
				setUpdatedPdpUnlockWindow(data);
				setPdpUnlockWindow(res.data);
				
			}
		})
	}
	useEffect(() => {
		getAppSettingList();
		getMaintenanceRequests();
		getCustomerGroupDetails();
		getRegions();
		
		fetchPDPUnlockWindow();
	}, []);

	useEffect(() => {
		if (customer_group_list?.data) {
			const sortedList = [...customer_group_list.data].sort((a, b) => Number(a.name) - Number(b.name));
			setCustomerGroupList(sortedList);
			const selected_cgs = customer_group_list.data.filter(o => o.pdp_update_enabled).map(o => o.name);
			setSelectedCustomerGroups(selected_cgs);
			setOriginalSelectedCustomerGroups(selected_cgs);

			// these variables are used to store the data for the PDP Unlock Window
			setPdpUnlockCgs(structuredClone(sortedList));
			const pdp_unlock_selected_cgs = sortedList.filter(o => o.pdp_unlock_enabled).map(o => o.name);
			setSelectedPdpUnlockCgs(pdp_unlock_selected_cgs);
			setOriginalSelectedPdpUnlockCgs(structuredClone(pdp_unlock_selected_cgs));
		}
	}, [customer_group_list])

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
		if (ssoRole && !hasViewPermission(pages.APP_SETTINGS)) {
			browserHistory.push("/admin/dashboard");
		}
	}, [ssoRole]);

	useEffect(() => {
		//on change of tab, reset the editable and disable state and 
		const key = "WE_PDP";
		setIsEditable({ ...isEditable, [key]: false });
		setIsDisable({ ...isDisable, [key]: true });
		setWeekDaySettings([...weekDays]);
		selectedRegionId && getPDPWindows(selectedRegionId);
		updatedSettingData.current[key] = {};
		setSelectedFrequency(null);
		setIsAddExceptionPDP(false);
	}, [tabName]);

	useEffect(() => {
		//refresh of data on change of selected region

		selectedRegionId && getPDPWindows(selectedRegionId);
		isEditable.WE_PDP = false;
		isDisable.WE_PDP = true;
		updatedSettingData.current.WE_PDP = {};
	}, [selectedRegionId]);

	useEffect(() => {
		populatePDPWindowTableData();
	}, [pdp_windows]);

	useEffect(() => {
		isAddExceptionPDP && populatePDPWindowTableData();
	}, [isAddExceptionPDP]);

	useEffect(() => {
		const updatedData = (updatedPdpUnlockWindow).map(item => {
			if(item.checked)
				item['start_date'] = startDateAll;
			return item;
		});
		setUpdatedPdpUnlockWindow(updatedData);
	} , [startDateAll]);

	useEffect(() => {
		const updatedData = (updatedPdpUnlockWindow).map(item => {
			if(item.checked)
				item['end_date'] = endDateAll;
			return item;
		});
		setUpdatedPdpUnlockWindow(updatedData);
	} , [endDateAll]);

	useEffect(() => {
		const updatedData = (updatedPdpUnlockWindow).map(item => {
			if(item.checked)
				item['comments'] = remarksAll;
			return item;
		});
		setUpdatedPdpUnlockWindow(updatedData);
	} , [remarksAll]);

	useEffect(() => {
		let isPdpSaveDisabled = false;
		let isEdited = false;
		for(let i = 0; i < updatedPdpUnlockWindow.length; i++){
			if(!updatedPdpUnlockWindow[i].isRemarksDisabled){
				isEdited = true;
				if(!updatedPdpUnlockWindow[i].start_date || !updatedPdpUnlockWindow[i].end_date ||  !updatedPdpUnlockWindow[i]?.comments || updatedPdpUnlockWindow[i].comments.length < 5){
					isPdpSaveDisabled = true;
					break;
				}
				
			}
		}
		if(isEdited){
			isDisable.PDP_UNLOCK_WINDOW = isPdpSaveDisabled;
			setIsDisable({...isDisable});
		}
		
	}, [updatedPdpUnlockWindow]);

	function populatePDPWindowTableData() {
		for (let day of weekDays) {
			convertHoursToDayTime(day.orderWindow, day.orderPlacementEndTime, day.key, "WE");
			convertHoursToDayTime(day.orderWindow, day.orderPlacementEndTime, day.key, "FN");
		}
		setWeekDaySettings(_.cloneDeep(weekDays));
	}

	function getRegions() {
		dashboardFilterCategories().then(res => {
			const region = new Set();
			res?.response?.area_details?.forEach((area) => {
				region.add(`${area.region}#${area.region_id}`);
			});
			const options = Array.from(region)?.sort().map((item) => ({ label: item.split('#')[0], value: item.split('#')[1] }));
			setRegionOptions(options);
			setSelectedRegionId(options[0]?.value);
		}).catch(error => { });
	};

	
	const editOrCancelSettingHandler = (key) => {
		if (isEditable[key]) {
			if(key === 'PDP_UNLOCK_WINDOW'){
				setCheckAll(false); 
				setStartDateAll('');
				setEndDateAll('');
				setRemarksAll('');
				const data = (structuredClone(pdpUnlockWindow)).map(item => {
					item['checked'] = false;
					item['isRemarksDisabled'] = true;
					return item;
				});
				setUpdatedPdpUnlockWindow(data);
			}
			else{
				let settingList = [];
				for (let data of app_setting_list.data) {
					settingList.push({ ...data, disabled: true })
				}
				setSettingData(settingList);
				Object.assign(updatedSettingData.current, { [key]: [] })
				//onCancel the whole of the weekDay should refresh and set to database value
				getAppSettingList();

				const updatedData = updatedSettingData.current.PDP_UPDATE?.find((item) => item.key === 'PDP_REQUEST_CGS_ENABLE');
				const selected_cgs = updatedData ? updatedData.value.split(',') : originalSelectedCustomerGroups;
				setSelectedCustomerGroups([...selected_cgs]);

				const updated_data = updatedSettingData.current.PDP_UNLOCK_WINDOW_CGS?.find((item) => item.key === 'PDP_UNLOCK_WINDOW_CGS');
				const selectedCgs = updated_data ? updated_data.value.split(',') : originalSelectedPdpUnlockCgs;
				setSelectedPdpUnlockCgs([...selectedCgs]);
			}
		}
		setIsEditable({ ...isEditable, [key]: !isEditable[key] });
		setIsDisable({ ...isDisable, [key]: true });
	}

	const changeSelectSettingHandler = (value, feature, key) => {
		setIsDisable({ ...isDisable, [key]: false });
		settingData.forEach((data) => {
			if (data.key === feature) {
				data.value = value;
				data.disabled = false;
			}
		})
		setSettingData([...settingData]);
		const tempArr = updatedSettingData.current[key];
		const index = tempArr.findIndex((data) => data.key === feature);
		if (index >= 0) {
			tempArr[index].value = value;
		} else {
			tempArr.push({ key: feature, value });
		}
		Object.assign(updatedSettingData.current, { [key]: tempArr });
	}

	const changeRemarksHandler = (event, feature, key) => {
		if (event.target.value.length >= 5) {
			setIsDisable({ ...isDisable, [key]: false });
			settingData.forEach((data) => {
				if (data.key === feature) {
					data.remarks = event.target.value;
				}
			})
			setSettingData([...settingData]);

			let tempArr = updatedSettingData.current[key].map((item) => {
				if (item.key === feature) {
					item.remarks = event.target.value;
				}
				return item;
			})
			Object.assign(updatedSettingData.current, { [key]: tempArr });
		}

	}

	const pdpUnlockWindowRemarksHandler = (event, key) => {
		const value = event.target.value || '';
		if(key === 'all'){
			setRemarksAll(value);
		}
		else{
			const tempArr = updatedPdpUnlockWindow.map((item) => {
				if (item.group5_id === key) {
					item.comments = value;
				}
				return item;
			})
			setUpdatedPdpUnlockWindow(tempArr);
		}
	}

	const saveSettingHandler = async (key) => {
		for (let datum of updatedSettingData.current[key]) {
			if (!datum.remarks) {
				return notification.error({
					message: 'Error',
					description: `Please enter remarks for feature ${datum.key}`,
					duration: 5,
					className: 'notification-error',
				});
			} else if (datum.remarks.trim().length < 5) {
				return notification.error({
					message: 'Error',
					description: `Please enter minimum 5 characters in remarks to update the feature ${datum.key}`,
					duration: 5,
					className: 'notification-error',
				});
			}
		}

		try {
			const res = await updateAppSetting({ app_level_configuration: updatedSettingData.current[key] });
			if (res?.data?.success) {
				getAppSettingList();
				getCustomerGroupDetails();
				updatedSettingData.current = { ...updatedSettingData.current, [key]: [] };
				notification.success({
					message: 'Success',
					description: 'App settings updated successfully',
					duration: 2,
					className: 'notification-green',
				});
				setIsDisable({ ...isDisable, [key]: true });
				setIsEditable({ ...isEditable, [key]: false });
			} else {
				setSelectedCustomerGroups([...originalSelectedCustomerGroups]);
				setSelectedPdpUnlockCgs([...originalSelectedPdpUnlockCgs]);
				notification.error({
					message: 'Error Occurred',
					description: res?.data?.message ? res.data.message : 'Some error ocurred while updating app settings',
					duration: 5,
					className: 'notification-error',
				});
			}
		} catch (error) {
			notification.error({
				message: 'Technical Error',
				description: 'Some error ocurred while updating app settings',
				duration: 5,
				className: 'notification-error',
			});
		}
	}

	const savePDPUnlockWindow = async () => {
		const updatedData = [];
		const l = pdpUnlockWindow.length;
		for (let i = 0; i < l; i++) {
			if (!updatedPdpUnlockWindow[i].isRemarksDisabled) {
				const payload = {
					"region_id": pdpUnlockWindow[i].group5_id,
					"start_date": +(updatedPdpUnlockWindow[i].start_date),
					"end_date": +(updatedPdpUnlockWindow[i].end_date),
					"comments": updatedPdpUnlockWindow[i].comments
				}
				updatedData.push(payload);
			}
		}
		const res = await updatePDPUnlockWindow({ data: updatedData });
		setCheckAll(false);
		if(res.success){
			Util.notificationSender("Success",res.message,true);
		}else{
			Util.notificationSender("Error",res.message,false);
		}
		fetchPDPUnlockWindow();
		setIsDisable({ ...isDisable, 'PDP_UNLOCK_WINDOW': true });
		setIsEditable({ ...isEditable, 'PDP_UNLOCK_WINDOW': false });
	}

	const changeTextSettingHandler = (event, feature, key) => {
		const intKeys = ['PDP_UNLOCK_WINDOW'];
		const wholeNumKeys = ['PDP_UNLOCK_WINDOW'];
		let v='';
        if (intKeys.includes(feature)) {
            v = event.target.value.toString().toUpperCase();
            if(wholeNumKeys.includes(feature)){
                v = isNaN(parseInt(v)) ? '' : Math.abs(parseInt(v)) + '';
            }else{
                v = isNaN(parseInt(v)) ? '' : parseInt(v) + '';
            }    
        }
        else {
            // v = formatValue(event.target.value);// need to review why this was used
            v = event.target.value.toUpperCase();
        }
		setIsDisable({ ...isDisable, [key]: false });
		// const value = event.target.value.toUpperCase();
		const value = v;
		settingData.forEach((data) => {
			if (data.key === feature) {
				const original_data = app_setting_list.data?.find((item) => item.key === feature) || {};
				data.value = value;
				if(!Object.keys(original_data).length || value.toString() !== original_data.value){
					if(!intKeys.includes(feature) || value)
						data.disabled = false;
					else
						data.disabled = true;
				}else{
					data.disabled = true;
				}
			}
		})
		setSettingData([...settingData]);
		const tempArr = updatedSettingData.current[key];
		const index = tempArr.findIndex((data) => data.key === feature);
		if (index >= 0) {
			tempArr[index].value = value;
		} else {
			tempArr.push({ key: feature, value });
		}
		Object.assign(updatedSettingData.current, { [key]: tempArr });
	}


	const onCustomerGroupChange = (selectedGroups) => {
		let checkedGroups = [];
		customerGroupList.forEach(group => {
			if (selectedGroups.includes(group.name)) {
				checkedGroups.push(group.name);
			}
		})
		setSelectedCustomerGroups(checkedGroups);
		const index = updatedSettingData.current.PDP_UPDATE.findIndex((data) => data.key === 'PDP_REQUEST_CGS_ENABLE');
		if (index >= 0) {
			updatedSettingData.current.PDP_UPDATE[index].value = checkedGroups.toString();
		} else {
			updatedSettingData.current.PDP_UPDATE.push({ key: 'PDP_REQUEST_CGS_ENABLE', value: checkedGroups.toString() });
		}

	}

	const onPDPUnlockCgChange = (selectedGroups) => {
		let checkedGroups = [];
		pdpUnlockCgs.forEach(group => {
			if (selectedGroups.includes(group.name)) {
				checkedGroups.push(group.name);
			}
		})
		setSelectedPdpUnlockCgs(checkedGroups);
		const index = updatedSettingData.current.PDP_UNLOCK_WINDOW_CGS.findIndex((data) => data.key === 'PDP_UNLOCK_WINDOW_CGS');
		if (index >= 0) {
			updatedSettingData.current.PDP_UNLOCK_WINDOW_CGS[index].value = checkedGroups.toString();
		} else {
			updatedSettingData.current.PDP_UNLOCK_WINDOW_CGS.push({ key: 'PDP_UNLOCK_WINDOW_CGS', value: checkedGroups.toString() });
		}

	}

	const isApplicableKey = (data) => {
		const applicableKeys = ['ENABLE_PDP_RESTRICTION','PDP_UNLOCK_WINDOW'];
		return applicableKeys.includes(data?.key);
	}

	const getPDPValue = (pdpType, key) => {
		const result = pdp_windows?.find(p => {
			const isMatchingPdpType = p.pdp_type === pdpType;
			const isGlobalTabWithDefaultThreshold = tabName === "global" && p.threshold_frequency === "-1";
			const isExceptionalNotDefined = tabName === "exceptional" && isAddExceptionPDP; //if exceptional is not defined then while add general settings to be auto-populated
			const isExceptionalTabWithNonDefaultThreshold = tabName === "exceptional" && p.threshold_frequency !== "-1";

			return isMatchingPdpType && (isGlobalTabWithDefaultThreshold || isExceptionalNotDefined || pdpType === "FN" || isExceptionalTabWithNonDefaultThreshold);
		});

		return result?.[key] ?? null;
	}

	const getUpdatedPDPValue = (pdpType, key) => {
		const refKey = {
			WE: "WE_PDP",
			FN: "FN_PDP"
		}
		const result = updatedSettingData.current[refKey[pdpType]][key];
		return result ?? null;
	}

	const convertHoursToDayTime = (orderWindowKey, orderPlacementEndTimeKey, pdpDay, pdpType) => {
		/**
		 * we need to check if any data is present in updatedSettingData by the key, then consider that value else consider value from getPDPValue
		 */
		const orderWindow = getUpdatedPDPValue(pdpType, orderWindowKey) ?? getPDPValue(pdpType, orderWindowKey);
		const orderPlacementEndTime = getUpdatedPDPValue(pdpType, orderPlacementEndTimeKey) ?? getPDPValue(pdpType, orderPlacementEndTimeKey);

		const orderWindowHour = Number(orderWindow?.split(':')[0]) | 0;
		const orderWindowMin = Number(orderWindow?.split(':')[1]) | 0;
		const orderPlacementEndTimeHour = Number(orderPlacementEndTime?.split(':')[0]) | 0;
		const orderPlacementEndTimeMin = ((orderPlacementEndTime?.charAt(0) === '-') ? Number('-' + orderPlacementEndTime?.split(':')[1]) : Number(orderPlacementEndTime?.split(':')[1])) | 0;

		let now = new Date();
		const day = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
		const dayName = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
		const pdpDayIndex = day.indexOf(pdpDay);
		while (Number(now.getDay()) !== pdpDayIndex) {
			now.setDate(now.getDate() + 1);
		}
		now.setHours(0);
		now.setMinutes(0);
		now.setMilliseconds(0);

		now.setHours(now.getHours() + orderPlacementEndTimeHour);
		now.setMinutes(now.getMinutes() + orderPlacementEndTimeMin);

		const endTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
		const endDay = dayName[Number(now.getDay())];

		now.setHours(now.getHours() - orderWindowHour);
		now.setMinutes(now.getMinutes() - orderWindowMin);
		const startDay = dayName[Number(now.getDay())];
		const startTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

		const weekObject = weekDays.filter(item => item.key === pdpDay)[0];
		if (pdpType === "WE") {
			const freq = isAddExceptionPDP ? null : getPDPValue(pdpType, 'threshold_frequency')
			Object.assign(weekObject,
				{
					idWE: isAddExceptionPDP ? null : getPDPValue(pdpType, 'id'),
					startDayWE: startDay,
					startTimeWE: startTime,
					endDayWE: endDay,
					endTimeWE: endTime,
					orderWindowHoursWE: orderWindow,
					orderPlacementEndTimeHoursWE: orderPlacementEndTime,
					threshold_frequency: freq
				}
			)
			setSelectedFrequency(freq);
		} else {
			Object.assign(weekObject,
				{
					idFN: getPDPValue(pdpType, 'id'),
					startDayFN: startDay,
					startTimeFN: startTime,
					endDayFN: endDay,
					endTimeFN: endTime,
					orderWindowHoursFN: orderWindow,
					orderPlacementEndTimeHoursFN: orderPlacementEndTime
				}
			)
		}
		// setWeekDaySettings([...weekDays]);
		return { startDay: startDay, startTime: startTime, endDay: endDay, endTime: endTime };
	}
	const convertDayTimeToHours = (orderStartDay, orderStartTime, orderEndDay, orderEndTime, pdpDay) => {
		const daysArr = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
		const daysKeyArr = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
		let dayCount = 1;

		if (!orderStartDay || !orderStartTime || !orderEndDay || !orderEndTime) {
			return "";
		}

		let i = daysArr.indexOf(orderStartDay);
		while (daysArr[i] !== orderEndDay) {
			dayCount++;
			i = (i + 1 === 7) ? 0 : i + 1;
		}
		function strToMins(t) {
			const s = t.split(":");
			return Number(s[0]) * 60 + Number(s[1]);
		}

		function minsToStr(t) {
			let str = Math.trunc(Math.abs(t) / 60) + ':' + ('00' + Math.abs(t) % 60).slice(-2);
			str = (t < 0) ? `-${str}` : str;
			return str;
		}
		let totalHours = `${dayCount * 24}:00`;
		const orderWindow = minsToStr(strToMins(totalHours) - strToMins(orderStartTime) - (strToMins("24:00") - strToMins(orderEndTime)));
		let orderPlacementEndTime = "";
		if (daysKeyArr.indexOf(pdpDay) === daysArr.indexOf(orderEndDay)) {
			orderPlacementEndTime = orderEndTime;
		} else {
			dayCount = 0;
			i = daysKeyArr.indexOf(pdpDay);
			while (daysArr[i] !== orderEndDay) {
				dayCount++;
				i = (i - 1 === -1) ? 6 : i - 1;
			}
			totalHours = `${(--dayCount) * 24}:00`;
			orderPlacementEndTime = minsToStr((strToMins("24:00") - strToMins(orderEndTime) + strToMins(totalHours)) * -1);
		}
		return { orderWindow: orderWindow, orderPlacementEndTime: orderPlacementEndTime };
	}

	const onChangePDPWindow = (optionValue, pdpType, pdpDay, changedProperty) => {
		if (changedProperty.includes('Time')) {
			optionValue = optionValue.target.value;
		}
		const day = weekDaySettings.find(item => item.key === pdpDay);
		day[changedProperty] = optionValue;
		let id = null;
		if (pdpType === "WE") {
			const windowCalc = convertDayTimeToHours(day.startDayWE, day.startTimeWE, day.endDayWE, day.endTimeWE, pdpDay);
			isDisable.WE_PDP = false;
			day["orderWindowHoursWE"] = windowCalc.orderWindow;
			day["orderPlacementEndTimeHoursWE"] = windowCalc.orderPlacementEndTime;
			id = day.idWE;
			const payload = {
				id,
				[day.orderWindow]: windowCalc.orderWindow,
				[day.orderPlacementEndTime]: windowCalc.orderPlacementEndTime,
			}
			updatedSettingData.current["WE_PDP"] = { ...updatedSettingData.current["WE_PDP"], ...payload };
		} else {
			isDisable.FN_PDP = false;
			const windowCalc = convertDayTimeToHours(day.startDayFN, day.startTimeFN, day.endDayFN, day.endTimeFN, pdpDay);
			day["orderWindowHoursFN"] = windowCalc.orderWindow;
			day["orderPlacementEndTimeHoursFN"] = windowCalc.orderPlacementEndTime;
			id = day.idFN;
			const payload = {
				id,
				[day.orderWindow]: windowCalc.orderWindow,
				[day.orderPlacementEndTime]: windowCalc.orderPlacementEndTime,
			}
			updatedSettingData.current["FN_PDP"] = { ...updatedSettingData.current["FN_PDP"], ...payload };
		};
		setWeekDaySettings(_.cloneDeep(weekDaySettings))
	};

	function savePDPWindows(eventIdentification, remarks) {
		setEventIdentifier("");
		setRemarksModalOpen(false);
		if (eventIdentification.includes("WE_PDP#DELETE")) {
			return deletePDPWindow(eventIdentification, remarks);
		}

		if (isAddExceptionPDP && eventIdentification === "WE_PDP") {
			if (selectedFrequency === null) {
				return notification.error({
					message: 'Error',
					description: `Please select threshold frequency`,
					duration: 5,
					className: 'notification-error',
				});
			}
			//on add of new exception window, we need to send all the days data, make id = null
			weekDaySettings?.map((day) => {
				Object.assign(updatedSettingData.current[eventIdentification], {
					[`${day['orderPlacementEndTime']}`]: day.orderPlacementEndTimeHoursWE,
					[`${day['orderWindow']}`]: day.orderWindowHoursWE
				})
			});
			updatedSettingData.current[eventIdentification]['zone_id'] = +selectedRegionId;
			updatedSettingData.current[eventIdentification]['id'] = null;
		}
		updatedSettingData.current[eventIdentification]['threshold_frequency'] = +selectedFrequency;
		updatedSettingData.current[eventIdentification]["remarks"] = remarks;
		upsertPDPWindow({ data: updatedSettingData.current[eventIdentification] })
			.then(res => {
				if (res.success) {
					getPDPWindows(selectedRegionId);
					notification.success({
						message: 'Success',
						description: res.message ? res.message : 'PDP window updated successfully',
						duration: 2,
						className: 'notification-green',
					});
					setIsDisable({ ...isDisable, [eventIdentification]: true });
					setIsEditable({ ...isEditable, [eventIdentification]: false });
				} else {
					notification.error({
						message: 'Error Occurred',
						description: res?.message ? res.message : 'Some error ocurred while updating PDP window',
						duration: 5,
						className: 'notification-error',
					});
				}
			}).catch(err => {
				notification.error({
					message: 'Technical Error',
					description: 'Some error ocurred while updating PDP window',
					duration: 5,
					className: 'notification-error',
				});
			}).finally(() => {
				updatedSettingData.current = { ...updatedSettingData.current, [eventIdentification]: {} };
				setIsAddExceptionPDP(false)
			});
	};

	function deletePDPWindow(eventIdentification, remarks) {
		const [pdpType, del, id] = eventIdentification.split('#');
		deletePDPException({ data: { id, remarks } })
			.then(res => {
				if (res.success) {
					getPDPWindows(selectedRegionId);
					notification.success({
						message: 'Success',
						description: res.message ? res.message : 'PDP window updated successfully',
						duration: 2,
						className: 'notification-green',
					});
					setIsDisable({ ...isDisable, [pdpType]: true });
					setIsEditable({ ...isEditable, [pdpType]: false });
				} else {
					notification.error({
						message: 'Error Occurred',
						description: res?.message ? res.message : 'Some error ocurred while updating PDP window',
						duration: 5,
						className: 'notification-error',
					});
				}
			}).catch(error => {
				notification.error({
					message: 'Technical Error',
					description: 'Some error ocurred while deleting PDP window',
					duration: 5,
					className: 'notification-error',
				});
			})
		return null;
	};

	function handleRemarksModal(pdpType) {
		setEventIdentifier(pdpType);
		setRemarksModalOpen(true);
	}

	function handleRemarksModalClose() {
		setEventIdentifier(null);
		setRemarksModalOpen(false);
	}

	
	const onPDPWindowSelect = (e,key) => {
		const checked = e.target.checked;
		if(key === 'all'){
			setCheckAll(checked);
			const data = updatedPdpUnlockWindow.map(pdp => {
				pdp.checked = checked;
				if(checked){
					pdp.start_date = startDateAll;
					pdp.end_date = endDateAll;
					pdp.comments = remarksAll;
				}
				pdp.isRemarksDisabled = false;
				return pdp;
			})
			setUpdatedPdpUnlockWindow(data);
		}else{
			const data = updatedPdpUnlockWindow.map(pdp => {
				if(pdp.group5_id === key){
					pdp.checked = checked;
					if(checked){
						pdp.start_date = startDateAll;
						pdp.end_date = endDateAll;
						pdp.comments = remarksAll;
					}
					pdp.isRemarksDisabled = false;
				}
				return pdp;
			})
			setUpdatedPdpUnlockWindow(data);
		}
	};

	const onPDPWindowChange = (e, key, type) => {
		const value = e.target.value || '';
		let v = '';
		if(value){
			let intValue = Math.abs(parseInt(value)) || 1;
			if(intValue > daysInMonth)
				v = daysInMonth.toString();
			else
				v = intValue.toString();
		}
		
		if(key === 'all'){
			if(type === 'start')
				setStartDateAll(v);
			else
				setEndDateAll(v);
		}
		else{
			const updatedWindow = updatedPdpUnlockWindow.map(pdp => {
				if (pdp.group5_id === key) {
					if (type === 'start')
						pdp.start_date = v;
					else
						pdp.end_date = v;
					pdp.isRemarksDisabled = false;
				}
				return pdp;
			})
			setUpdatedPdpUnlockWindow(updatedWindow);
		}
	};
	return (
		<div className="admin-dashboard-wrapper-1">
			<div className="admin-dashboard-table">
				<div className='we-table'>
					{/* PDP Universal Switch */}
					<table>
						<thead>
							<tr>
								<th>Feature</th>
								<th>Value</th>
								<th>Last updated by</th>
								<th>Remarks</th>
							</tr>
						</thead>
						<tbody>
							{settingData?.filter(data => isApplicableKey(data)).map((data, i) => {
								return (
									<tr key={data.key}>
										<td className='app-desc'>{data.key}<span>{data.description ? data.description : ''}</span></td>
										<td>
											<div className='value-col'>
												{isEditable.PDP ?
													<>{data.field_type === "SET" ?
														<Select
															className='user-role-select'
															value={data.value}
															onChange={(val) => changeSelectSettingHandler(val, data.key, 'PDP')}
															dropdownClassName="user-role-dropdown"
														>
															{data.allowed_values.map((value) => {
																return <Option key={value} value={value}>{value}</Option>
															})}
														</Select>
														:
														<input className='value-text-fld' type="text" value={data.value} onChange={(event) => changeTextSettingHandler(event, data.key, 'PDP')} />
													}</>
													:
													<Tooltip placement="left" title={data.value}>{data.value}</Tooltip>
												}
											</div>
										</td>
										<td>{(data.first_name && data.last_name && data.user_id) ? `${data.first_name} ${data.last_name} (${data.user_id})` : data.updated_by}</td>
										<td className='remarks-value'>
											{!isEditable.PDP ? (
												<>{(!data.remarks || data.remarks.trim().length === 0) ?
													'-' : <Tooltip placement="left" title={data.remarks}>{data.remarks}</Tooltip>}</>
											) :
												<textarea placeholder='Please enter your remarks (minimum 5 characters)'
													onChange={(e) => changeRemarksHandler(e, data.key, 'PDP')} disabled={!!(data.disabled || isDisable.PDP)} />

											}
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
					{!isSupportAdmin && <div className='btn-wrapper'>
						<button type='button' onClick={() => editOrCancelSettingHandler('PDP')}>{isEditable.PDP ? 'Cancel' : 'Edit'}</button>
						<button type='button' onClick={() => saveSettingHandler('PDP')} disabled={isDisable.PDP}>Save</button>
					</div>}
				</div>
				<div className='we-table'>
					<Row>
						<Col span={12}>
							<Tabs tabs={tabsOptions} onChangeSelection={setTabName} />
						</Col>
						{tabName === "exceptional" &&
							<>
								<Col span={6}>
									<SelectBox classes={'width120px'} options={regionOptions} value={selectedRegionId} onChange={setSelectedRegionId} label={"Region"} allowClear={false} />
								</Col>
								<Col span={6} className='threshold-section'>
									{isEditable.WE_PDP ?
										<SelectBox  classes={'width120px'} options={thresholdFrequencyOptions} value={selectedFrequency} onChange={setSelectedFrequency} label={"Frequency"} mandatory showSearch={false} />
										:
										<div className='threshold-info'>
											<b>
											{weekDaySettings[0]?.threshold_frequency ? `Frequency : <= ${weekDaySettings[0]?.threshold_frequency} days per week` : null}
											</b>
										</div>
									}
								</Col>

							</>}
					</Row>

					{/* PDP window settings */}
					<Loader>
						<table>
							<thead>
								<tr>
									<th width='25%'>Weekly PDP</th>
									<th width='25%'>Start Day & Time</th>
									<th width='25%'>End Day & Time</th>
									<th width='25%'>
										<Tooltip placement='bottom' title="To set the PDP order placement window time (in hours) for weekly case. For eg. 44 hours = (2 days - 4 hours) window">
											Order Window
										</Tooltip>
									</th>
								</tr>
							</thead>
							<tbody>
								{(weekDaySettings[0]?.idWE || isAddExceptionPDP) && weekDaySettings?.map(data => {
									return (
										<tr key={data.key}>
											<td>{data.value}</td>
											<td>
												<div className='value-col' style={{ display: 'flex' }}>
													{isEditable.WE_PDP ?
														<>
															<div className='day-select'>
																<Select id={`WE-${data.key}`} value={data.startDayWE} onChange={(val) => onChangePDPWindow(val, 'WE', data.key, "startDayWE")} style={{ width: '110px' }}>
																	{weekDays?.map(day => {
																		return <Option key={day.key} value={day.value}><p className='day-option'>{day.value}</p></Option>
																	})}
																</Select>
															</div>
															<div className='time-select'>
																<input type="time"
																	value={data.startTimeWE}
																	onChange={(val) => onChangePDPWindow(val, 'WE', data.key, "startTimeWE")}
																/>
															</div>
														</>
														:
														<>
															{data.startDayWE}, {data.startTimeWE}Hrs
														</>
													}
												</div>
											</td>
											<td>
												<div className='value-col' style={{ display: 'flex' }}>
													{isEditable.WE_PDP ?
														<>
															<div className='day-select'>
																<Select value={data.endDayWE} onChange={(val) => onChangePDPWindow(val, 'WE', data.key, "endDayWE")} style={{ width: '110px' }}>
																	{weekDays?.map(day => {
																		return <Option key={day.index} value={day.value}><p className='day-option'>{day.value}</p></Option>
																	})}
																</Select>
															</div>
															<div className='time-select'>
																<input type="time"
																	value={data.endTimeWE}
																	onChange={(value) => onChangePDPWindow(value, 'WE', data.key, "endTimeWE")}
																/>
															</div>
														</>
														:
														<>
															{data.endDayWE}, {data.endTimeWE} Hrs
														</>
													}
												</div>
											</td>
											<td>{data.orderWindowHoursWE} Hrs</td>
										</tr>
									)
								})}
								{(!weekDaySettings[0]?.idWE && !isAddExceptionPDP) &&
									<tr>
										<td colSpan={4}>No exception defined</td>
									</tr>
								}
							</tbody>
						</table>

						<Row>
							<Col span={16} className='audit-trail'>
								{getPDPValue("WE", "updated_by") &&
									<>
										<span>Last updated by: {(getPDPValue("WE", "first_name") && getPDPValue("WE", "last_name") && getPDPValue("WE", "user_id")) ?
											`${getPDPValue("WE", "first_name")} ${getPDPValue("WE", "last_name")} (${getPDPValue("WE", "user_id")})` : getPDPValue("WE", "updated_by")}</span>
										<span>{` on ${Util.formatDate(getPDPValue("WE", "updated_on"))} ${Util.formatTime(getPDPValue("WE", "updated_on"))}`}</span>
									</>
								}
								<br />
								{
									getPDPValue("WE", "remarks") &&
									<span>Remarks: {getPDPValue("WE", "remarks")}</span>
								}
							</Col>
							{!isSupportAdmin &&
								<Col span={8} className='btn-wrapper'>
									{(tabName === "exceptional" && weekDaySettings[0]?.threshold_frequency && !isEditable.WE_PDP) &&
										<button type='button' id="del-exp" onClick={() => handleRemarksModal(`WE_PDP#DELETE#${getPDPValue("WE", "id")}`)} className='danger'>Delete</button>
									}
									<button type='button' onClick={() => { editOrCancelSettingHandler('WE_PDP'); setIsAddExceptionPDP(!isEditable.WE_PDP && !weekDaySettings[0].idWE); }}>{isEditable.WE_PDP ? 'Cancel' : !weekDaySettings[0]?.idWE ? 'Add' : 'Edit'}</button>
									<button type='button' onClick={() => handleRemarksModal("WE_PDP")} disabled={isDisable.WE_PDP}>Save</button>
								</Col>

							}
						</Row>
					</Loader>
				</div>
				<div className='fn-table'>
					<Loader>
						<table>
							<thead>
								<tr>
									<th width='25%'>Fortnightly PDP</th>
									<th width='25%'>Start Day & Time</th>
									<th width='25%'>End Day & Time</th>
									<th width='25%'>
										<Tooltip placement='bottom' title="To set the PDP order placement window time (in hours) for weekly case. For eg. 44 hours = (2 days - 4 hours) window">
											Order Window
										</Tooltip>
									</th>
								</tr>
							</thead>
							<tbody>
								{weekDaySettings.map(data => {
									return (
										<tr key={data.key}>
											<td>{data.value}</td>
											<td>
												<div className='value-col' style={{ display: 'flex' }}>
													{isEditable.FN_PDP ?
														<>
															<div className='day-select'>
																<Select id={`FN-${data.key}`} value={data.startDayFN} onChange={(val) => onChangePDPWindow(val, 'FN', data.key, "startDayFN")} style={{ width: '110px' }}>
																	{weekDays?.map(day => {
																		return <Option key={day.key} value={day.value}><p className='day-option'>{day.value}</p></Option>
																	})}
																</Select>
															</div>
															<div className='time-select'>
																<input type="time"
																	value={data.startTimeFN}
																	onChange={(val) => onChangePDPWindow(val, 'FN', data.key, "startTimeFN")}
																/>
															</div>
														</>
														:
														<>
															{data.startDayFN}, {data.startTimeFN} Hrs
														</>
													}
												</div>
											</td>
											<td>
												<div className='value-col' style={{ display: 'flex' }}>
													{isEditable.FN_PDP ?
														<>
															<div className='day-select'>
																<Select value={data.endDayFN} onChange={(val) => onChangePDPWindow(val, 'FN', data.key, "endDayFN")} style={{ width: '110px' }}>
																	{weekDays?.map(day => {
																		return <Option key={day.index} value={day.value}><p className='day-option'>{day.value}</p></Option>
																	})}
																</Select>
															</div>
															<div className='time-select'>
																<input type="time"
																	value={data.endTimeFN}
																	onChange={(value) => onChangePDPWindow(value, 'FN', data.key, "endTimeFN")}
																/>
															</div>
														</>
														:
														<>
															{data.endDayFN}, {data.endTimeFN} Hrs
														</>
													}
												</div>
											</td>
											<td>
												{data.orderWindowHoursFN} Hrs
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
						<Row>
							<Col span={16} className='audit-trail'>
								{getPDPValue("FN", "updated_by") &&
									<>
										<span>Last updated by: {(getPDPValue("FN", "first_name") && getPDPValue("FN", "last_name") && getPDPValue("FN", "user_id")) ?
											`${getPDPValue("FN", "first_name")} ${getPDPValue("FN", "last_name")} (${getPDPValue("FN", "user_id")})` : getPDPValue("FN", "updated_by")}</span>
										<span>{` on ${Util.formatDate(getPDPValue("FN", "updated_on"))} ${Util.formatTime(getPDPValue("FN", "updated_on"))}`}</span>
									</>
								}
								<br />
								{getPDPValue("FN", "remarks") &&
									<span>Remarks: {getPDPValue("FN", "remarks")}</span>
								}
							</Col>
							{!isSupportAdmin &&
								<Col span={8} className='btn-wrapper'>
									<button type='button' onClick={() => editOrCancelSettingHandler('FN_PDP')}>{isEditable.FN_PDP ? 'Cancel' : 'Edit'}</button>
									<button type='button' onClick={() => handleRemarksModal('FN_PDP')} disabled={isDisable.FN_PDP}>Save</button>
								</Col>
							}
						</Row>
					</Loader>
				</div>
			</div>
			{/* Pdp Update Request Enable for Customer Groups */}
			<div className="cgTableBlock">
				<table>
					<thead>
						<tr>
							<th className='width20'>Feature</th>
							<th className='width50' style={{ textAlign: 'center' }}>Customer Groups Enabled</th>
							<th className='width10'>Last updated by</th>
							<th className='width20' style={{ textAlign: 'center' }}>Remarks</th>
						</tr>
					</thead>
					<tbody>
						{settingData?.filter(data => data.key === 'PDP_REQUEST_CGS_ENABLE').map((data, i) => {
							return (
								<tr key={data.key}>
									<td className='app-desc width20'>{data.key}<span>{data.description ? data.description : ''}</span></td>
									<td className='cg-checkboxes width50'>

										<Checkbox.Group onChange={onCustomerGroupChange} disabled={!isEditable.PDP_UPDATE} value={selectedCustomerGroups}>
											<Row style={{ height: 'auto' }} >
												{customerGroupList.map((data, i) => (

													<Col span={12} style={{ marginTop: '5px' }} key={data.name}>

														<Checkbox key={data.description} value={data.name}>{data.name} - {data.description}</Checkbox>

													</Col>

												))}
											</Row>
										</Checkbox.Group>

									</td>
									<td className='width10'>{(data.first_name && data.last_name && data.user_id) ? `${data.first_name} ${data.last_name} (${data.user_id})` : data.updated_by}</td>
									<td className='remarks-value width20' style={{ textAlign: 'center' }}>
										{!isEditable.PDP_UPDATE ? (
											<>{(!data.remarks || data.remarks.trim().length === 0) ?
												'-' : <Tooltip placement="left" title={data.remarks}>{data.remarks}</Tooltip>}</>
										) :
											<textarea rows={5} placeholder='Please enter your remarks (minimum 5 characters)'
												onChange={(e) => changeRemarksHandler(e, data.key, 'PDP_UPDATE')} disabled={selectedCustomerGroups.length === originalSelectedCustomerGroups.length && isDisable.PDP_UPDATE} />

										}
									</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			</div>
			{!isSupportAdmin && <div className='btn-wrapper'>
				<button type='button' onClick={() => editOrCancelSettingHandler('PDP_UPDATE')}>{isEditable.PDP_UPDATE ? 'Cancel' : 'Edit'}</button>
				<button type='button' onClick={() => saveSettingHandler('PDP_UPDATE')} disabled={isDisable.PDP_UPDATE}>Save</button>
			</div>}

			{/* Pdp Unlock Window at Region Level */}
			<div className="cgTableBlock">
				<h2 className="card-row-col">PDP Unlock Window</h2>
				<table>
					<thead>
						<tr>
							<th className='width15'>
								<input type="checkbox"
									id="pdp-window-select-all"
									checked={checkAll}
									// defaultChecked
									style={{ marginRight: '5px', cursor: isEditable.PDP_UNLOCK_WINDOW ? 'pointer' : '' }}
									disabled={!isEditable.PDP_UNLOCK_WINDOW}
									onChange={(event) => onPDPWindowSelect(event,'all')}
								/>
								Region
							</th>
							<th className='width15'>
								{isEditable.PDP_UNLOCK_WINDOW 
									? <>
										<span>Start Day</span>
										<input className='value-text-fld' 
											type="text"
											value={startDateAll ? Math.abs(parseInt(startDateAll)) : startDateAll}
											pattern="[0-9]{2}"
											style={{backgroundColor:  '#f5f6f6', width: '50px', marginLeft: '5px' }}
											onChange={(event) => onPDPWindowChange(event, "all", "start")} 
										/>
									</>
									: <span>Start Day</span>}
							</th>
							<th className='width20'>
								{isEditable.PDP_UNLOCK_WINDOW 
									? <>
										<span>End Day</span>
										<input className='value-text-fld' 
											type="text"
											value={endDateAll ? Math.abs(parseInt(endDateAll)) : endDateAll}
											pattern="[0-9]{2}"
											style={{backgroundColor:  '#f5f6f6', width: '50px', marginLeft: '5px' }}
											onChange={(event) => onPDPWindowChange(event, "all", "end")} 
										/>
									 </>
									: <span>End Day</span>}
							</th>
							<th className='width20'>Last updated by</th>
							<th className='width30' style={{ textAlign: 'center' }}>
								{isEditable.PDP_UNLOCK_WINDOW 
									? <div
										style={{
											display: 'flex',
											justifyContent: 'center',
											alignItems: 'center'
										}}
									>
										<span>Remarks</span>
										<textarea 
											rows={2} 
											style={{marginLeft: '5px', color: 'black'}}
											placeholder='Please enter your remarks (minimum 5 characters)'
											maxLength={100}
											value={remarksAll}
											onChange={(e) => pdpUnlockWindowRemarksHandler(e, 'all')} 
										 />

									</div>
									: <span>Remarks</span>
								}
							</th>
						</tr>
					</thead>
					<tbody>
						{
							updatedPdpUnlockWindow.map((data, i) => {
								return (
									<tr key={data.id}>
										<td className='app-desc width20'>
											<div style={{display: 'flex', alignItems: 'center', justifyContent: 'start'}}>
												<input type="checkbox"
													id={`pdp-window-select-${data.group5_id}`}
													// defaultChecked
													checked={data.checked}
													style={{ display: 'block', marginRight: '5px', cursor: isEditable.PDP_UNLOCK_WINDOW ? 'pointer' : '' }}
													disabled={!isEditable.PDP_UNLOCK_WINDOW}
													onChange={(event) => onPDPWindowSelect(event,data.group5_id)}
												/>
												<span>{data.region_name}</span>
											</div>
										</td>
										<td className='width15'>
											{isEditable.PDP_UNLOCK_WINDOW 
												? <>
												<input className='value-text-fld' 
													index={`start-${data.group5_id}`}
													type="text"
													value={data.start_date ? Math.abs(parseInt(data.start_date)) : data.start_date}
													pattern="[0-9]{2}"
													style={{backgroundColor:  '#f5f6f6', width: '100px' }}
													onChange={(event) => onPDPWindowChange(event, data.group5_id, "start")} 
												/>
												</>
												: data.start_date}
										</td>
										<td className='width15'>
											{isEditable.PDP_UNLOCK_WINDOW 
												? <>
													<input className='value-text-fld'
														index={`end-${data.group5_id}`}
														type="text"
														value={data.end_date ? Math.abs(parseInt(data.end_date)) : data.end_date}
														pattern="[0-9]{2}"
														style={{backgroundColor:  '#f5f6f6', width: '100px' }}
														onChange={(event) => onPDPWindowChange(event, data.group5_id, "end")}
													/>
												</>
												: data.end_date}
										</td>
										<td className='width20'>{(data.updated_by?.trim().length) ? data.updated_by : 'SYSTEM_SET'}</td>
										<td className='remarks-value width30' style={{ textAlign: 'center' }}>
											{!isEditable.PDP_UNLOCK_WINDOW ? (
												<>{(!data.comments?.trim()) ?
													'-' : <Tooltip placement="left" title={data.comments}>{data.comments}</Tooltip>}</>
											) :
											
												<textarea rows={3} 
													placeholder='Please enter your remarks (minimum 5 characters)'
													maxLength={100}
													value={data.comments}
													onChange={(e) => pdpUnlockWindowRemarksHandler(e,data.group5_id)} 
													disabled={data.isRemarksDisabled} 
												/>

											}
										</td>
									</tr>
								)
							})
						}
						
					</tbody>
				</table>
			</div>
			{!isSupportAdmin && <div className='btn-wrapper'>
				<button type='button' onClick={() => editOrCancelSettingHandler('PDP_UNLOCK_WINDOW')}>{isEditable.PDP_UNLOCK_WINDOW ? 'Cancel' : 'Edit'}</button>
				<button type='button' onClick={() => savePDPUnlockWindow()} disabled={isDisable.PDP_UNLOCK_WINDOW}>Save</button>
			</div>}

			{/* Auto Unlock Pdp window will be applicable for selected Customer Groups */}
			<div className="cgTableBlock">
				<table>
					<thead>
						<tr>
							<th className='width20'>Feature</th>
							<th className='width50' style={{ textAlign: 'center' }}>Customer Groups Enabled</th>
							<th className='width10'>Last updated by</th>
							<th className='width20' style={{ textAlign: 'center' }}>Remarks</th>
						</tr>
					</thead>
					<tbody>
						{settingData?.filter(data => data.key === 'PDP_UNLOCK_WINDOW_CGS').map((data, i) => {
							return (
								<tr key={data.key}>
									<td className='app-desc width20'>{data.key}<span>{data.description ? data.description : ''}</span></td>
									<td className='cg-checkboxes width50'>
										<Checkbox.Group onChange={onPDPUnlockCgChange} disabled={!isEditable.PDP_UNLOCK_WINDOW_CGS} value={selectedPdpUnlockCgs}>
											<Row style={{ height: 'auto' }} >
												{pdpUnlockCgs.map((data, i) => (
													<Col span={12} style={{ marginTop: '5px' }} key={data.name}>
														<Checkbox key={data.description} value={data.name}>{data.name} - {data.description}</Checkbox>
													</Col>
												))}
											</Row>
										</Checkbox.Group>
									</td>
									<td className='width10'>{(data.first_name && data.last_name && data.user_id) ? `${data.first_name} ${data.last_name} (${data.user_id})` : data.updated_by}</td>
									<td className='remarks-value width20' style={{ textAlign: 'center' }}>
										{!isEditable.PDP_UNLOCK_WINDOW_CGS ? (
											<>{(!data.remarks || data.remarks.trim().length === 0) ?
												'-' : <Tooltip placement="left" title={data.remarks}>{data.remarks}</Tooltip>}</>
										) :
											<textarea rows={5} placeholder='Please enter your remarks (minimum 5 characters)'
												onChange={(e) => changeRemarksHandler(e, data.key, 'PDP_UNLOCK_WINDOW_CGS')} disabled={selectedPdpUnlockCgs.length === originalSelectedPdpUnlockCgs.length && isDisable.PDP_UNLOCK_WINDOW_CGS} />

										}
									</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			</div>
			{!isSupportAdmin && <div className='btn-wrapper'>
				<button type='button' onClick={() => editOrCancelSettingHandler('PDP_UNLOCK_WINDOW_CGS')}>{isEditable.PDP_UNLOCK_WINDOW_CGS ? 'Cancel' : 'Edit'}</button>
				<button type='button' onClick={() => saveSettingHandler('PDP_UNLOCK_WINDOW_CGS')} disabled={isDisable.PDP_UNLOCK_WINDOW_CGS}>Save</button>
			</div>}


			{remarksModalOpen && <CommentModal
				open={remarksModalOpen}
				eventIdentifier={eventIdentifier}
				title='Remarks'
				placeholder="Please enter your remarks (minimum 5 characters) to update the feature"
				okButtonText={eventIdentifier.includes("DELETE") ? "Delete" : "Save"}
				cancelButtonText="Cancel"
				onOk={savePDPWindows}
				onCancel={handleRemarksModalClose}
			/>}
		</div>
	)
}

const mapStateToProps = (state) => {
	return {
		app_setting_list: state.admin.get('app_setting_list'),
		pdp_windows: state.auth.get('pdp_windows'),
		sso_user_details: state.admin.get('sso_user_details'),
		customer_group_list: state.admin.get('customer_group_list'),
	}
}
const mapDispatchToProps = (dispatch) => {
	return {
		getMaintenanceRequests: () =>
			dispatch(Action.getMaintenanceRequests()),
		getAppSettingList: () =>
			dispatch(Action.getAppSettingList()),
		updateAppSetting: (data) =>
			dispatch(Action.updateAppSetting(data)),
		getSSODetails: (emailId, history) =>
			dispatch(Action.getSSODetails(emailId, history)),
		getCustomerGroupDetails: () => dispatch(Action.getCustomerGroupDetails()),
		dashboardFilterCategories: () => dispatch(Action.dashboardFilterCategories()),
		getPDPWindows: (regionId) => dispatch(Action.getPDPWindow(regionId)),
		upsertPDPWindow: (data) => dispatch(Action.upsertPDPWindow(data)),
		deletePDPException: (data) => dispatch(Action.deletePDPException(data)),
		getPDPUnlockWindow: () => dispatch(Action.getPDPUnlockWindow()),
		updatePDPUnlockWindow: (data) => dispatch(Action.updatePDPUnlockWindow(data)),
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(PdpWindow);