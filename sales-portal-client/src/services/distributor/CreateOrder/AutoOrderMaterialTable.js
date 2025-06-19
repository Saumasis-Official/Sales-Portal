import React, { useEffect, useState, useRef, useMemo } from 'react';
import { connect } from 'react-redux';
import { notification, Select, Popover, Tooltip } from 'antd';
import * as Action from '../action';
import * as AdminAction from '../../admin/actions/adminAction';
import * as DashboardAction from '../../distributor/actions/dashboardAction';
import Auth from '../../../util/middleware/auth';
import Util from '../../../util/helper/index';
import useWindowDimensions from '../../../hooks/useWindowDimensions';
import 'antd/dist/antd.css';
import { InfoCircleFilled,  DownCircleOutlined, UpCircleOutlined } from '@ant-design/icons';
import './CreateOrder.css';
import Loader from '../../../components/Loader';
import Collapsible from 'react-collapsible';

const { Option } = Select;
const AutoOrderMaterialTable = props => {
    const browserHistory = props.history;
    const {
        tableItems,
        createOrderData,
        universalProductType,
        distributorProfile,
        getRegionDetails,
        distributorId,
        getMaintenanceRequests,
        tolerance = {},
        originalRecommendation,
        getStockData,
        validateCounter,
        moqArr,
        isOrderReady,
        isRegular,
        submitErrors,
        getPskuToleranceExclusions,
        fetchDistributorPskuTolerance,
        orderType,
    } = props;

    const { width } = useWindowDimensions();

    let access_token = Auth.getAccessToken();
    let admin_access_token = Auth.getAdminAccessToken();
    let role = Auth.getRole();
    const error_plant_row_style = { backgroundColor: '#f09898' };
    const success_plant_row_style = { backgroundColor: '#b2f3c2' };

    if ((!role && !access_token) || (role && !admin_access_token)) {
        browserHistory?.push('/');
    }

    const stateItems = useMemo(() => {
        return createOrderData.get("items");
    }, [createOrderData]);

    const [firstHit, setFirstHit] = useState(true);
    const [windowSize, setWindowSize] = useState({
        width: undefined,
        height: undefined,
    });
    const [selectedPSKU, setSelectedPSKU] = useState('');
    const [selectedIndex, setSelectedIndex] = useState({ key: "0000", index: 0 });
    const [sortDirectionAsc, setSortDirectionAsc] = useState(true);
    const [tableDataObject, setTableDataObject] = useState({});
    const [tableDataObjectKeys, setTableDataObjectKeys] = useState([]);
    const [moqCheckObject, setMoqCheckObject] = useState({});
    const [pskusWithoutTolerance, setPskusWithoutTolerance] = useState([]);
    const [distributorPskuTolerance, setDistributorPskuTolerance] = useState({});
    const firstRender = useRef(false);
    const itemsWithToleranceError = useRef(new Set());
    let originalRecommendationMap = originalRecommendation.reduce((accumulator, current) => {
        accumulator[current.code] = current;
        return accumulator;
    }, {});
    const divideArrayByProperty = (array, property) => {
        const groupedObjects = {};
        
        array.forEach(obj => {
            const key = obj[property] || obj['depot_code']; // Use 'Plant' if present, otherwise use 'depot_code'
            // If the key exists and the object is not already present in another group
            if (key && !Object.values(groupedObjects).some(group => group.some(o => o === obj))) {
                if (!groupedObjects[key]) {
                    groupedObjects[key] = [];
                }
                groupedObjects[key].push(obj);
            }
        });
        
        return groupedObjects;
    }

    useEffect(() => {
        getMaintenanceRequests();
        function handleResize() {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }
        window.addEventListener("resize", handleResize);
        handleResize();
        setFirstHit(true);
        firstRender.current = true;

        async function fetchPskuToleranceExclusions() {
            const response = await getPskuToleranceExclusions();
            if (response.success) {
                setPskusWithoutTolerance(response.data.filter(item => !item.deleted).map(item => item.psku));
            }
        }

        async function fetchDistributorMaterialTolerance() {
            const payload = { distributor_code: distributorId };
            fetchDistributorPskuTolerance(payload)
                .then(res => {
                    const temp = {};
                    if (res?.success && res?.data?.length) {
                        res?.data?.forEach(i => {
                            temp[i.material_code] = { max: i.max, min: i.min };
                        })
                        setDistributorPskuTolerance(temp);
                        props.distributorUpdateCreateOrderFormField({ field: 'distributor_psku_tolerance', value: res?.data })
                    }
                }).catch(error => { })
        }
        fetchPskuToleranceExclusions();
        fetchDistributorMaterialTolerance();

        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        let tableRowObject = [{ materials: [], code: "", quantity: "", depot_code: "0000", description: "", sales_unit: "", pak_code: "", pak_type: "", buom: "", tentative: "", disabled: "", selectedValue: "", item_number: "", error: "", class: "", item_type: "", StockQuantity: "", sales_org: "", distribution_channel: "", division: "", Plant: "", PDP_Day: "", Reference_date: "", ton: "", stock_in_hand: "", stock_in_transit: "", open_order: "" }];
        let state_items = createOrderData.get("items");
        if (state_items?.length && state_items[0].code !== '') {
            tableRowObject = JSON.parse(JSON.stringify(state_items));
        }
        else if (tableItems?.length && tableItems[0].code !== '') {
            tableRowObject = JSON.parse(JSON.stringify(tableItems));
        }
        async function handleInputList(arr) {
            if (Array.isArray(arr) && arr.length && arr[0].code !== '') {
                let psku_arr = arr.map(o => o.code);
                let docType = 'ZOR';
                let sd = await getStockData({ dbCode: distributorId, psku: psku_arr, docType });
                if (sd.success) {
                    arr.forEach(r => {
                        let data = { ...sd.data.find(t => r.code === t.sku) }
                        r['stock_in_transit'] = data['stock_in_transit'];
                        r['stock_in_hand'] = data['stock_in_hand']
                        r['open_order'] = data['open_order'];
                    });
                }
            }
            return arr;
        }

        async function handleStockDepot() {
           if (tableRowObject.length && tableRowObject[0]?.code !== '' && distributorProfile?.distributor_sales_details?.length) {
                let ti = tableRowObject.map(o => {
                    let plant = distributorProfile?.distributor_sales_details
                        .filter((item) => (item.distribution_channel === o['distribution_channel'] && item.division === o['division']))
                        .map((item) => item.plant_name);
                    o['depot_code'] = plant && plant.length > 0 ? plant[0] : '0000';
                    return { ...o };
                });
                ti = await handleInputList(JSON.parse(JSON.stringify(ti)));
                ti= removeDuplicatesByKey(ti, 'code');
                let plants = divideArrayByProperty(ti, 'Plant');
                
                setTableDataObject({ ...plants });
                setTableDataObjectKeys(Object.keys(plants));
                props.distributorUpdateCreateOrderFormField({ field: 'items', value: ti });
            }
            else {
                setTableDataObject({ '0000': JSON.parse(JSON.stringify(tableRowObject)) });
                setTableDataObjectKeys(['0000']);
            }
        }
        handleStockDepot();
    }, [validateCounter, tableItems]);

    useEffect(() => {
        setMoqCheckObject({ ...moqArr });
    }, [moqArr]);

    useEffect(() => {
        async function handleInputList() {
            if (selectedPSKU.length > 0) {
                let line_item = tableDataObject[selectedIndex['key']][selectedIndex['index']];
                if (line_item && line_item?.code === selectedPSKU) {
                    let psku_arr = [];
                    psku_arr.push(selectedPSKU)
                    let docType = 'ZOR';
                    let sd = await getStockData({ dbCode: distributorId, psku: psku_arr, docType });
                    if (sd.success) {
                        line_item['stock_in_transit'] = sd.data[0]['stock_in_transit'];
                        line_item['stock_in_hand'] = sd.data[0]['stock_in_hand'];
                        line_item['open_order'] = sd.data[0]['open_order'];
                        let obj = { ...tableDataObject };
                        obj[selectedIndex['key']][selectedIndex['index']] = line_item;
                        setTableDataObject({ ...obj });
                    }
                }

            }
        }
        handleInputList();
    }, [selectedIndex, selectedPSKU])


    useEffect(() => {
        if (!distributorProfile || !Object.keys(distributorProfile).length) {
            getRegionDetails(distributorId);
        }
    }, [distributorProfile]);

    /** Function to display error messages while transaction */
    let errorHandler = (message, description, duration = 8) => {
        setTimeout(() => {
            notification.error({
                message,
                description,
                duration,
                className: 'notification-error'
            });
        }, 50)
    }
    /** Function to sort the selected items */
    const sortItems = list => {
        list.map((item, i) => (
            list[i]['item_number'] = String(((i + 1) * 10).toString()).padStart(6, '0')
        ))
        return list;
    }

    const removeDuplicatesByKey = (array, key) => {
        return array.reduce((accumulator, currentValue) => {
            // Check if there is already an object in the accumulator array with the same key value
            const existingObject = accumulator.find(obj => obj[key] === currentValue[key]);
            
            // If not found, add the current object to the accumulator array
            if (!existingObject) {
                accumulator.push(currentValue);
            }
            
            return accumulator;
        }, []);
    }

    // handle select change
    const handleSelectChange = (m, i, key) => {
        if (!m?.code) return;
        setSelectedIndex(prev => {
            prev['key'] = key;
            prev['index'] = i;
            return prev;
        });
        setSelectedPSKU(m['code']);
        document.getElementById("vldbtn").disabled = itemsWithToleranceError.current?.size !== 0;
        if (document.getElementById("sbtbtn")) document.getElementById("sbtbtn").disabled = true;
        let plants = { ...tableDataObject };
        const list = [...tableDataObject[key]];
        const oldCode = tableDataObject[key]['code'];
        list[i]['code'] = m['code'];
        list[i]['description'] = m['description'];
        list[i]['sales_unit'] = m['sales_unit'];
        list[i]['pak_code'] = m['pak_code'];
        list[i]['pak_type'] = m['pak_type'];
        list[i]['sales_org'] = m['sales_org'];
        list[i]['distribution_channel'] = m['distribution_channel'];
        list[i]['division'] = m['division'];
        list[i]['StockQuantity'] = Math.floor(parseFloat(m['StockQuantity'])).toFixed(3);
        list[i]['quantity'] = '';
        list[i]['buom'] = '';
        list[i]['ton'] = '';
        list[i]['Plant'] = m['Plant'];
        list[i]['PDP_Day'] = m['PDP_Day'];
        list[i]['Reference_date'] = m['Reference_date'];
        list[i]['tentative'] = '';
        list[i][''] = '';
        list[i]['disabled'] = true;
        list[i]['selectedValue'] = m['code'];
        list[i]['showPromo'] = false;
        list[i]['showHideArrow'] = false;
        list[i]['stock_in_hand'] = m['stock_in_hand'];
        list[i]['stock_in_transit'] = m['stock_in_transit'];
        list[i]['open_order'] = m['open_order'];
        list[i]['depot_code'] = '0000';
        if (distributorProfile && distributorProfile.area_code && distributorProfile.channel_code && m.appl_area_channel && m.appl_area_channel.some(obj => (obj.area === distributorProfile.area_code) && (obj.channel === distributorProfile.channel_code))) {
            list[i]['item_type'] = 'dist_specific';
        } else {
            list[i]['item_type'] = 'universal';
        }
        let tempArr = [];
        for (let k in plants) {
            if (k === key)
                tempArr = [...tempArr, ...list];
            else
                tempArr = [...tempArr, ...plants[k]];
        }

        const matList = removeDuplicatesByKey(sortItems(tempArr), 'code');
        const mappedInputList = matList.map(item => item.selectedValue)
            .filter(item => item);
        matList.forEach(item => {
            item.materials.forEach(mat => {
                mappedInputList.forEach(ele => {
                    if (mat.code === ele) {
                        mat.isDisabled = true;
                    }
                });
                if (mat.code === oldCode) {
                    mat.isDisabled = false;
                }
            });
        });
        plants = divideArrayByProperty(matList, 'Plant');
        
        setTableDataObject({ ...plants });
        props.distributorUpdateCreateOrderFormField({ field: 'items', value: matList });
        props.onListChange(matList);
    };

    // handle input change
    const handleInputChange = (e, i, code, key) => {

        document.getElementById("vldbtn").disabled = itemsWithToleranceError.current?.size !== 0;
        if (document.getElementById("sbtbtn")) document.getElementById("sbtbtn").disabled = true;
        const { name, value } = e.target;
        const obj = { ...tableDataObject };
        let val = value.toString().toUpperCase();
        val = (typeof +val === 'number' && val.length > 0) ? (Math.abs(parseInt(val))).toString() : value;
        obj[key][i][name] = val;
        let tempArr = [];
        for (let k in obj) {
            tempArr = [...tempArr, ...obj[k]];
        }
        setTableDataObject({ ...obj });
        props.distributorUpdateCreateOrderFormField({ field: 'items', value: JSON.parse(JSON.stringify(tempArr)) });
        props.onOrderChange();
        props.onDifferenceChange();
    };
    // handle click event of the Remove button
    const handleRemoveClick = (index, code) => {
        setFirstHit(false);
        document.getElementById("vldbtn").disabled = itemsWithToleranceError.current?.size !== 0;
        if (document.getElementById("sbtbtn")) document.getElementById("sbtbtn").disabled = true;
        let arr = [];
        for (let k in tableDataObject) {
            arr = [...arr, ...tableDataObject[k]];
        }
        const list = arr.filter(item => item.code !== code);
        const matList = removeDuplicatesByKey(sortItems(list), 'code');
        const mappedInputList = matList.map(item => item.selectedValue)
            .filter(item => item);
        matList.forEach(item => {
            item.materials.forEach(mat => {
                mappedInputList.forEach(ele => {
                    if (mat.code === ele) {
                        mat.isDisabled = true;
                    }
                });
                if (mat.code === code) {
                    mat.isDisabled = false;
                }
            });
        });
        let plants = divideArrayByProperty(matList, 'Plant');
        
        setTableDataObject({ ...plants });
        setTableDataObjectKeys(Object.keys(plants));
        props.distributorUpdateCreateOrderFormField({ field: 'items', value: matList });
        props.onOrderChange(0);
        props.onDifferenceChange(0);
        window.localStorage.setItem("TCPL_SAP_formData", JSON.stringify(JSON.parse(window.localStorage.getItem("TCPL_SAP_formData")).filter((item) => item.code !== code)));
        props.onListChange(matList);
    };
    // handle click event of the Add button
    const handleAddClick = () => {
        document.getElementById("vldbtn").disabled = itemsWithToleranceError.current?.size !== 0;
        const table_object = { materials: [], code: "", quantity: "", depot_code: "0000", description: "", sales_unit: "", pak_code: "", pak_type: "", buom: "", tentative: "", disabled: "", selectedValue: "", item_number: "", error: "", class: "", item_type: "", StockQuantity: "", sales_org: "", distribution_channel: "", division: "", Plant: "", PDP_Day: "", Reference_date: "", ton: "", stock_in_hand: "", stock_in_transit: "", open_order: "" };
        let new_item = [table_object];
        if (document.getElementById("sbtbtn")) document.getElementById("sbtbtn").disabled = true;
        if (!(Object.keys(tableDataObject).length > 0)) {
            const temp = tableDataObject;
            setTableDataObject(Object.assign(temp, { '0000': new_item }));
            if (!tableDataObjectKeys?.includes('0000')) {
                let temp = tableDataObjectKeys ?? [];
                temp.push("0000")
                setTableDataObjectKeys([...temp]);
            }
            return;
        }
        setFirstHit(false);
        let tempArr = [];
        for (let k in tableDataObject) {
            tempArr = [...tempArr, ...tableDataObject[k]];
        }
        const list_check = Util.checkItemList(tempArr, '', '', '', 'ADD_TABLE_ROW');
        if (list_check.itmFlag === false && (firstRender.current)) {
            errorHandler(
                'Error Occurred!',
                list_check.errormessage,
                2
            )
        }
        else {
            let tempArr = [];

            if (('0000' in tableDataObject) && tableDataObject['0000'].length > 0) {
                new_item = [...tableDataObject['0000']];
                let itm = new_item[new_item.length - 1];
                if (itm !== null && itm !== undefined && itm.code !== '') {
                    let arr = [];
                    for (let k in tableDataObject) {
                        arr = [...arr, ...tableDataObject[k]];
                    }
                    let list = arr.filter(item => item.code !== itm.code && item.code !== '');
                    let plant = distributorProfile?.distributor_sales_details
                        .filter((item) => (item.distribution_channel === itm['distribution_channel'] && item.division === itm['division']))
                        .map((item) => item.plant_name);
                    itm['depot_code'] = plant && plant.length > 0 ? plant[0] : '0000';
                    list = [...list, itm, table_object];
                    list = removeDuplicatesByKey(sortItems(list), 'code');
                    let plants = divideArrayByProperty(list, 'Plant');
                   
                    setTableDataObject({ ...plants });
                    setTableDataObjectKeys(Object.keys(plants));
                }
            }
            else {
                let obj = { ...tableDataObject };
                obj['0000'] = [table_object];
                tempArr = [];
                for (let k in obj) {
                    tempArr = [...tempArr, ...obj[k]];
                }
                tempArr = removeDuplicatesByKey(sortItems(tempArr), 'code');
                obj = divideArrayByProperty(tempArr, 'Plant');
                
                setTableDataObject({ ...obj });
                if (!tableDataObjectKeys.includes('0000'))
                    setTableDataObjectKeys(prev => { prev.push('0000'); return prev; });
            }
            props.distributorUpdateCreateOrderFormField({ field: 'items', value: tempArr });
        }
        props.onOrderChange(0);
        props.onDifferenceChange(0);
        if (stateItems && stateItems.length > 0) {
            window.localStorage.setItem("TCPL_SAP_formData", JSON.stringify(stateItems));
        }
    }

    // material search using decounce
    const keywordsearch = debounce(
        async (keyword, i, key) => {
            if (keyword && keyword !== '' && keyword !== 'undefined' && keyword != null) {
                const {is_nourishco} = distributorProfile;
                const response = await Action.getMaterialsCodes(keyword, universalProductType, distributorId, false,is_nourishco);
                if (response.status === 200) {
                    let { data = [] } = response.data;
                    data = data.filter((v, i, a) => a.findIndex(t => t.code === v.code) === i);
                    data?.forEach(item => { 
                        if (orderType === "AutoOrder" && originalRecommendationMap.hasOwnProperty(item.code)) {
                            // SOPE-5057: If item is part of original recommendation, then user should not be able to add that item manually
                            item.isPresentInOriginalRecommendation = true;
                        }
                    })
                    const obj = { ...tableDataObject };
                    let tempArr = [];
                    let arr = [];
                    for (let k in obj) {
                        arr = [...arr, ...obj[k]];
                    }
                    const mappedInputList = arr.map(item => item.selectedValue)
                        .filter(item => item);
                    obj[key][i]['materials'] = data;
                    for (let k in obj) {
                        obj[k].forEach(item => {
                            mappedInputList.forEach(ele => {
                                item.materials.forEach(mat => {
                                    if (mat.code === ele) {
                                        mat.isDisabled = true;
                                    } /*else {
                                        mat.isDisabled = false;
                                    }*/
                                });
                            });
                        });
                        tempArr = [...tempArr, ...obj[k]];
                    }

                    setTableDataObject({ ...obj });
                    props.distributorUpdateCreateOrderFormField({ field: 'items', value: tempArr });
                }
            }
        }
    );

    // debounce function defination
    function debounce(func, timeout = 500) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => { func.apply(this, args); }, timeout);
        };

    }

    const sortQuantity = () => {
        const sortAsc = !sortDirectionAsc;
        setSortDirectionAsc(sortAsc);
        let tempArr = [];
        let obj = { ...tableDataObject };
        for (let key in obj) {
            obj[key] = obj[key].sort((a, b) => {
                let comparison = 0;
                const prev = Number(a['quantity']);
                const cur = Number(b['quantity']);
                if (prev < cur)
                    comparison = -1;
                else if (prev > cur)
                    comparison = 1;
                if (sortAsc)
                    return comparison;
                return comparison * -1;
            });
            tempArr = [...tempArr, ...obj[key]];
        }
        setTableDataObject({ ...obj });
    }
    const validateTolerance = (e, index, item) => {
        /**
         * If for some area/customer group combination, the tolerance is not defined, then no tolerance check will occur.
         * if material quantity is 0, then considering it as 1 and then checking the tolerance [since x% of 0 = 0]
         * If pskuClass is undefined, then by default considering it as class 'A'
         * 
         * (DEPRICATED)https://tataconsumer.atlassian.net/browse/SOPE-1272: Div.-14 Salt SKU's to override stock norm tolerance
         * (DEPRICATED)https://tataconsumer.atlassian.net/browse/SOPE-1523: Quantity Norm: no quantity change allowed. Hence tolerance to be considered as 0% for PSKU class "Q"
         * https://tataconsumer.atlassian.net/browse/SOPE-2112: Tolerance exemption: No tolerance to be applied for certain PSKUs
         * https://tataconsumer.atlassian.net/browse/SOPE-2259: SOQ Norm & Quantity Norm: min tolerance to be 0% and no max tolerance
         * https://tataconsumer.atlassian.net/browse/SOPE-2788: Tolerance at DB x PSKU level
         */
        if (isRegular) return;
        const { value } = e.target;
        const { pskuClass = 'A' } = item;
        let upperTolerance = null;
        let lowerTolerance = 0;

        if (distributorPskuTolerance[item.code]) {
            upperTolerance = Number(distributorPskuTolerance[item.code].max);
            lowerTolerance = Number(distributorPskuTolerance[item.code].min);
        } else if (pskuClass !== "Q" && !item.soq_norm_qty) {
            upperTolerance = Number(tolerance[`${pskuClass}_max`]);
            lowerTolerance = Number(tolerance[`${pskuClass}_min`]);
        }
        const reference_qty = Number(item.original_quantity) === 0 ? 1 : Number(item.original_quantity);

        const maxValue = upperTolerance ? Math.ceil((100 + upperTolerance) / 100 * reference_qty) : null;
        const minValue = Math.ceil((100 + lowerTolerance) / 100 * reference_qty);

        if (value === '') {
            item['class'] = "red-border";
            item['toleranceError'] = `Quantity can not be empty`;
            document.getElementById("vldbtn").disabled = true;
            itemsWithToleranceError.current.add(item.code);
        }
        else if (pskusWithoutTolerance.includes(item?.code)) {
            itemsWithToleranceError.current?.delete(item.code);
            item['class'] = "";
            item['toleranceError'] = "";
            //disable = false, when itemWithToleranceError set is empty
            document.getElementById("vldbtn").disabled = itemsWithToleranceError.current?.size !== 0;
        }
        else if (maxValue == null && +value < minValue) {
            item['class'] = "red-border";
            item['toleranceError'] = `Quantity can not be less than ${minValue}CV`;
            setTableDataObject({ ...tableDataObject });
            document.getElementById("vldbtn").disabled = true;
            itemsWithToleranceError.current.add(item.code);
        }
        else if (maxValue && (Number(value) > maxValue || Number(value) < minValue)) {
            item['class'] = "red-border";
            item['toleranceError'] = `Quantity out of threshold of ${minValue}CV - ${maxValue}CV`;
            setTableDataObject({ ...tableDataObject });
            document.getElementById("vldbtn").disabled = true;
            itemsWithToleranceError.current.add(item.code);
        } else {
            itemsWithToleranceError.current?.delete(item.code);
            item['class'] = "";
            item['toleranceError'] = "";
            //disable = false, when itemWithToleranceError set is empty
            document.getElementById("vldbtn").disabled = itemsWithToleranceError.current?.size !== 0;
        }
    }

    /**
     * Scenario: User updates quantity of an item with tolerance error and directly tries to click on the Validate button
     * (NOTE: onBlur event is not triggered for the updated quantity, hence Validate button will show disabled, 
     * now if the user clicks on the disabled Validate button then only onBlur event will be triggered and the tolerance check will happen automatically)
     * Hence we call this function to check if the updated quantity is within tolerance or not.
     */
    const validateToleranceAllItems = () => {
        if(isRegular) return;
        const tableItems = Object.values(tableDataObject).flat();
        itemsWithToleranceError.current?.forEach(errorItemCode => {
            const errorItem = tableItems.find(item => item.code === errorItemCode);
            (errorItem) && validateTolerance({ target: { value: errorItem.quantity } }, 0, errorItem);
        });
    }

    return (
        <div onMouseLeave={validateToleranceAllItems}>
            <div className="n-card-h">
                {!isRegular && (width > 767 ?
                    <span className='formula'>[Quantity = Stock Norm - Stock In Hand - Stock In Transit - Open Order]</span>
                    : <>
                        <Popover content={'Quantity = Stock Norm - Stock In Hand - Stock In Transit - Open Order'} title="Formula" trigger="click" className="th-info-icon">
                            <InfoCircleFilled />
                        </Popover>
                    </>)}
                <button
                    type="submit"
                    className="addmore-button"
                    onClick={handleAddClick}
                >
                    <img src="/assets/images/add-order.svg" alt="Add New Item" />
                </button>
            </div>
            {width > 767 ?
                <>
                    <div className="sales-order-table new-sales-order-table ao-sales-order-table">
                        <Loader>
                            <div className='tablewrap'>
                                <table>
                                    <thead style={{ textAlign: 'center' }}>
                                        <tr>
                                            <th>Material Description</th> {/*className="material-header" */}
                                            <th className="material-header-code">Material Code</th>
                                            <th><Tooltip title="Stock In Hand" placement='bottom'>SIH</Tooltip></th>
                                            <th><Tooltip title="Stock In Transit" placement='bottom'>SIT</Tooltip> </th>
                                            <th><Tooltip title="Open Orders" placement='bottom'>OO</Tooltip></th>
                                            {!isRegular && <th>Suggested Qty</th>}
                                            <th onClick={sortQuantity}>Quantity
                                                <img
                                                    src="/assets/images/sorting_icon.svg"
                                                    alt=""
                                                /></th>
                                            <th>Sales Unit</th>
                                            <th>Tentative Amount( <span style={{color:"white",fontSize:"large"}}>&#8377;</span> )</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tableDataObjectKeys?.map((key, index) => {
                                            let data = tableDataObject[key]?.map((x, i) => {
                                                return (
                                                    <React.Fragment key={`items-list-${i}`}>
                                                        <tr className="material-table-row" id={`row-${i}`} style={(moqCheckObject[key] && !moqCheckObject[key].success && isOrderReady) ? { borderLeft: '3px solid #f09898', borderRight: '3px solid #f09898' } : (moqCheckObject[key] && moqCheckObject[key].success && isOrderReady) ? { borderLeft: '3px solid #b2f3c2', borderRight: '3px solid #b2f3c2' } : {}}>
                                                            <td className="material-box2">
                                                                <div className="material-table-data">
                                                                    <div className="material-box-wrap2">
                                                                        {(x.isAutoOrderRecommended || key !== '0000') && <span className='width-default'>{x.description}</span>}

                                                                        {!(x.isAutoOrderRecommended || key !== '0000') &&
                                                                            <Select className="width-default"
                                                                                showSearch
                                                                                placeholder="Type Material Name.."
                                                                                value={x.selectedValue}
                                                                                onChange={(val) => {
                                                                                    var value = x.materials.length && x.materials.find(obj => obj.code === val)
                                                                                    handleSelectChange(value, i, key);
                                                                                }}
                                                                                autoFocus={!firstHit}
                                                                                onSearch={(val) => keywordsearch(val, i, key)}
                                                                                filterOption={false}
                                                                                showAction={["click"]}
                                                                                showArrow={false}
                                                                                notFoundContent={false}
                                                                                listHeight={150}
                                                                            >
                                                                                {
                                                                                    x.materials && x.materials.length > 0 && x.materials.map((item, index) => {
                                                                                        return (
                                                                                            <Option className='drop-down'
                                                                                                value={item.code}
                                                                                                key={index}
                                                                                                disabled={item.isDisabled || item.isPresentInOriginalRecommendation}
                                                                                            >
                                                                                                <p className='desc'>{`${item.description}`}</p>
                                                                                            </Option>
                                                                                        )
                                                                                    })
                                                                                }
                                                                            </Select>
                                                                        }

                                                                    </div>

                                                                </div>
                                                            </td>
                                                            <td className={"center-align padded"}>{x.code !== "" ? x.code : '-'}</td>
                                                            <td className={"center-align padded"}>{(x.stock_in_hand != null && x.stock_in_hand != undefined && x.stock_in_hand !== "") ? Math.ceil(Number(x.stock_in_hand)) : '-'}</td>
                                                            <td className={"center-align padded"}>{(x.stock_in_transit != null && x.stock_in_transit != undefined && x.stock_in_transit !== "") ? Math.ceil(Number(x.stock_in_transit)) : '-'}</td>
                                                            <td className={"center-align padded"}>{(x.open_order != null && x.open_order != undefined && x.open_order !== "") ? Math.ceil(Number(x.open_order)) : '-'}</td>
                                                            {!isRegular && <td className={"center-align padded"}>{x.original_quantity}</td>}
                                                            <td className="quantity-box">
                                                                <div className="quantity-box-wrap">
                                                                    <input
                                                                        name="quantity"
                                                                        type="number"
                                                                        min={0}
                                                                        step={1}
                                                                        placeholder=""
                                                                        value={parseInt(x.quantity)}
                                                                        onWheel={e => e.currentTarget.blur()}
                                                                        onChange={e => { validateTolerance(e, i, x); handleInputChange(e, i, x.code, key);  }}
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className={"center-align padded"}>{x.sales_unit !== "" ? x.sales_unit : '-'}</td>
                                                            <td className={"center-align padded"}>{x.tentative !== "" ? x.tentative : '-'}</td>
                                                            <td className="delete padded">
                                                                <span><img src="/assets/images/delete.svg" onClick={() => handleRemoveClick(i, x.code)} alt="delete material"
                                                                    hidden={x.isAutoOrderRecommended && !x.error && !x.pdperror} /></span>
                                                            </td>
                                                        </tr>
                                                        <tr style={{ backgroundColor: 'inherit', borderBottomColor: '1px solid #f71515' }}>
                                                            <td colSpan="10"> {x.error != "" &&
                                                                <div className={x.class}>
                                                                    <span className="error-message">Material does not qualify for this distributor or MRP not available.</span>
                                                                </div>}
                                                                {x.error != "" &&
                                                                    (<div className={x.class}>
                                                                        <span className="error-message">{x.error}</span>
                                                                    </div>)}
                                                                {x.pdperror != "" &&
                                                                    (
                                                                        <div className={x.class}>
                                                                            <span className="error-message">{x.pdperror}</span>
                                                                        </div>)}
                                                                {x.toleranceError != "" &&
                                                                    (
                                                                        <div className={x.class}>
                                                                            <span className="error-message">{x.toleranceError}</span>
                                                                        </div>)}
                                                            </td>
                                                        </tr>
                                                    </React.Fragment>
                                                );
                                            });
                                            if (data?.length){
                                                let row;
                                                if(moqCheckObject[key] && !moqCheckObject[key].success && isOrderReady)
                                                    row = (<React.Fragment key={index}>
                                                        <tr className="plant-row-spacing"><td colSpan={10}></td></tr>
                                                        <tr id='plant-row' style={{ borderLeft: '3px solid #f09898', borderRight: '3px solid #f09898' }}>
                                                            <td colSpan={2} style={error_plant_row_style}>Plant Code: {key === '0000' ? '-' : key}</td>
                                                            <td colSpan={4} style={{ textAlign: 'right', ...error_plant_row_style }}>Total Qty.(in tonnes): {moqCheckObject[key]?.qty ? moqCheckObject[key].qty : '-'}</td>
                                                            <td colSpan={4} style={error_plant_row_style}>{`MOQ(in tonnes):  ${moqCheckObject[key]?.moq}`}</td>
                                                        </tr>
                                                    </React.Fragment>)
                                                else if(moqCheckObject[key] && moqCheckObject[key].success && isOrderReady) 
                                                    row = (<React.Fragment key={index}>
                                                        <tr className="plant-row-spacing"><td colSpan={10}></td></tr>
                                                        <tr id='plant-row' style={{ borderLeft: '3px solid #b2f3c2', borderRight: '3px solid #b2f3c2' }}>
                                                            <td colSpan={2} style={success_plant_row_style}>Plant Code: {key === '0000' ? '-' : key}</td>
                                                            <td colSpan={4} style={{ textAlign: 'right', ...success_plant_row_style }}>Total Qty.(in tonnes): {moqCheckObject[key]?.qty ? moqCheckObject[key].qty : '-'}</td>
                                                            <td colSpan={4} style={success_plant_row_style}>{`MOQ(in tonnes):  ${moqCheckObject[key]?.moq}`}</td>
                                                        </tr>
                                                    </React.Fragment>)
                                                else 
                                                    row = (<React.Fragment key={index}>
                                                        <tr className="plant-row-spacing"><td colSpan={10}></td></tr>
                                                        <tr id='plant-row'>
                                                            <td colSpan={2}>Plant Code: {key === '0000' ? '-' : key}</td>
                                                            <td colSpan={8} style={{ textAlign:'left' }}>Total Qty.(in tonnes): {moqCheckObject[key]?.qty ? moqCheckObject[key].qty : '-'}</td>
                                                        </tr>
                                                    </React.Fragment>)
                                                data.push(row);
                                            }
                                                
                                            return data;
                                        })}

                                    </tbody>
                                </table>
                                {(Object.keys(submitErrors).length > 0) &&
                                    <div className="submit-errors">
                                        {Object.keys(submitErrors).map((error_key, index) => {
                                            let value = submitErrors[error_key];
                                            if (value?.length > 0) {
                                                const child = value.slice(1).map((error, ind) => {
                                                    return (<div key={ind} style={{ marginLeft: "15px" }}>{error}</div>);
                                                })

                                                return (<Collapsible
                                                    trigger={value.length > 1 ? [value[0], <DownCircleOutlined style={{ color: "#a70505", float: "right" }} />] : [value[0]]}
                                                    triggerWhenOpen={value.length > 1 ? [value[0], <UpCircleOutlined style={{ color: "#a70505", float: "right" }} />] : [value[0]]}
                                                    triggerDisabled={value.length <= 1}
                                                    className='collapsible-header'
                                                    triggerOpenedClassName='collapsible-header'>
                                                    {child}
                                                </Collapsible>)
                                            } else {
                                                return null;
                                            }
                                        })}


                                    </div>
                                }
                            </div>
                        </Loader>
                    </div>
                    
                </> :
                <div className='mobile-card-block'>
                    {tableDataObjectKeys?.map((key, index) => {
                        let data = tableDataObject[key]?.map((x, i) => {
                            return (
                                <div className='mobile-card-item' key={`items-list-${i}`}
                                    style={(isOrderReady) ? ((moqCheckObject[key] && moqCheckObject[key].success) ? { boxShadow: '0 0 8px rgba(74, 247, 100, 0.90)' } : { boxShadow: '0 0 10px rgba(247, 74, 74, 0.90)' }) : {}}>
                                    <div className='mobile-card-row'>
                                        <div className='mobile-card-col-full'>
                                            <div className='mobile-material-control'>
                                                <h3>Material Description
                                                </h3>
                                                <Select
                                                    showSearch
                                                    placeholder="Type material name.."
                                                    value={x.selectedValue}
                                                    onChange={(val) => {
                                                        var value = x.materials.length && x.materials.find(obj => obj.code === val)
                                                        handleSelectChange(value, i, key);
                                                    }}
                                                    autoFocus={!firstHit}
                                                    onSearch={(val) => keywordsearch(val, i, key)}
                                                    filterOption={false}
                                                    showAction={[ "click"]}
                                                    showArrow={false}
                                                    notFoundContent={false}
                                                    listHeight={150}
                                                >
                                                    {
                                                        x.materials && x.materials.length > 0 && x.materials.map((item, index) => {
                                                            return (
                                                                <Option
                                                                    value={item.code}
                                                                    key={index}
                                                                    disabled={item.isDisabled || item.isPresentInOriginalRecommendation}
                                                                >
                                                                    {`${item.description}`}
                                                                </Option>
                                                            )
                                                        })
                                                    }
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className='mobile-card-row'>
                                        <div className='mobile-card-col-half'>
                                            <div className='mobile-material-control'>
                                                <h3>Material Code</h3>
                                                <p>{x.code !== "" ? x.code : '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className='mobile-card-row'>
                                        {!isRegular && <div className='mobile-card-col-half'>
                                            <div className='mobile-material-control'>
                                                <h3>Suggested Qty</h3>
                                                <p>{x.original_quantity ? x.original_quantity : "-"}</p>
                                            </div>
                                        </div>}
                                        <div className='mobile-card-col-half'>
                                            <div className='mobile-material-control'>
                                                <h3>Quantity</h3>
                                                <input
                                                    name="quantity"
                                                    type="number"
                                                    min={0}
                                                    step={1}
                                                    placeholder=""
                                                    value={parseInt(x.quantity)}
                                                    onWheel={e => e.currentTarget.blur()}
                                                    onChange={e => { validateTolerance(e, i, x); handleInputChange(e, i, x.code, key);  }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className='mobile-card-row'>
                                        <div className='mobile-card-col-half'>
                                            <div className='mobile-material-control'>
                                                <h3>Sales Unit</h3>
                                                <p>{x.sales_unit !== "" ? x.sales_unit : '-'}</p>
                                            </div>
                                        </div>
                                        <div className='mobile-card-col-half'>
                                            <div className='mobile-material-control'>
                                                <h3>Stock In Hand</h3>
                                                <p>{(x.stock_in_hand != null && x.stock_in_hand != undefined && x.stock_in_hand !== "") ? Math.ceil(Number(x.stock_in_hand)) : '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className='mobile-card-row'>
                                        <div className='mobile-card-col-half'>
                                            <div className='mobile-material-control'>
                                                <h3>Stock In Transit</h3>
                                                <p>{(x.stock_in_transit != null && x.stock_in_transit != undefined && x.stock_in_transit !== "") ? Math.ceil(Number(x.stock_in_transit)) : '-'}</p>
                                            </div>
                                        </div>
                                        <div className='mobile-card-col-half'>
                                            {/* <div className='mobile-material-control'>
                                        <h3>Quantity in Tonnage
                                            <Popover content={content} placement="left" trigger="click"
                                                className="th-info-icon">
                                                <InfoCircleFilled />
                                            </Popover>
                                        </h3>
                                        <p>{x.ton !== "" ? parseFloat(x.ton.split(' TO')).toFixed(2) + ' TO' : '-'}</p>
                                    </div> */}
                                            <div className='mobile-material-control'>
                                                <h3>Open Order</h3>
                                                <p>{(x.open_order != null && x.open_order != undefined && x.open_order !== "") ? Math.ceil(Number(x.open_order)) : '-'}</p>
                                            </div>
                                        </div>
                                        <div className='mobile-card-col-half'>
                                            <div className='mobile-material-control'>
                                                <h3>Tentative Amount in Rs</h3>
                                                <p>{x.tentative !== "" ? x.tentative : '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className='mobile-card-row'>
                                        <div className='mobile-card-col-full'>
                                            <div className='mobile-material-delete'>
                                                <span onClick={() => handleRemoveClick(i, x.code)} hidden={x.isAutoOrderRecommended && !x.error && !x.pdperror} >Remove</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className='mobile-card-error' style={{ backgroundColor: 'inherit', borderBottomColor: '1px solid #f71515' }}>
                                        {x.error != "" &&
                                            <div className={x.class}>
                                                <span className="error-message">Material does not qualify for this distributor or MRP not available.</span>
                                            </div>}
                                        {x.error != "" &&
                                            (<div className={x.class}>
                                                <span className="error-message">{x.error}</span>
                                            </div>)}
                                        {x.pdperror != "" &&
                                            (
                                                <div className={x.class}>
                                                    <span className="error-message">{x.pdperror}</span>
                                                </div>)}
                                        {x.toleranceError != "" &&
                                            (
                                                <div className={x.class}>
                                                    <span className="error-message">{x.toleranceError}</span>
                                                </div>)}
                                    </div>
                                </div>
                            );
                        });
                        if (data?.length)
                            data.push(
                                <div className='mobile-card-item' id='plant-box'
                                    style={(isOrderReady) ? ((moqCheckObject[key] && moqCheckObject[key].success) ? { backgroundColor: '#b2f3c2' } : { backgroundColor: '#f09898' }) : {}}>
                                    <div className='mobile-card-row'>
                                        <div className='mobile-card-col-half-1'>
                                            <div className='mobile-material-control'>
                                                Plant Code : {key === '0000' ? '-' : key}
                                            </div>
                                        </div>
                                        <div className='mobile-card-col-half-1'>
                                            <div className='mobile-material-control'>
                                                Total Qty. (in tons): {moqCheckObject[key]?.qty ? moqCheckObject[key].qty : '-'}
                                            </div>
                                        </div>
                                        {(isOrderReady && moqCheckObject[key]) && <div className='mobile-card-col-full-1'>
                                            <div className='mobile-material-control'>
                                                MOQ (in tons): {moqCheckObject[key]?.moq}
                                            </div>
                                        </div>}
                                    </div>
                                </div>)
                        return data;
                    })}
                      <div className="mobile-add-more">
                        <button
                            type="submit"
                            className="addmore-button"
                            onClick={handleAddClick}
                        >
                            Add More
                        </button>
                    </div> 
                    
                </div>
            }
        </div >
    )

}
const mapStateToProps = (state) => {
    return {
        createOrderData: state.distributor.get('create_order'),
        distributorProfile: state.dashboard.get('region_details'),
    }
}
const mapDispatchToProps = (dispatch) => {
    return {
        getMaintenanceRequests: () =>
            dispatch(AdminAction.getMaintenanceRequests()),
        distributorUpdateCreateOrderFormField: (data) =>
            dispatch(Action.distributorUpdateCreateOrderFormField(data)),
        distributorValidateCreateOrderForm: (status) =>
            dispatch(Action.distributorValidateCreateOrderForm(status)),
        distributorResetCreateOrderFormFields: () =>
            dispatch(Action.distributorResetCreateOrderFormFields()),
        distributorResetCreateOrderCompleteFormFields: () =>
            dispatch(Action.distributorResetCreateOrderCompleteFormFields()),
        distributorResetCreateOrderFormFieldsForLiqToggle: () =>
            dispatch(Action.distributorResetCreateOrderFormFieldsForLiqToggle()),
        getRegionDetails: (distributorId) => dispatch(DashboardAction.getRegionDetails(distributorId)),
        getMaterialsBOMData: (data) => dispatch(DashboardAction.getMaterialsBOMData(data)),
        getStockData: (data) => dispatch(AdminAction.getStockData(data)),
        getPskuToleranceExclusions: () => dispatch(AdminAction.getPskuToleranceExclusions()),
        fetchDistributorPskuTolerance: (payload) => dispatch(AdminAction.fetchDistributorPskuTolerance(payload)),
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(AutoOrderMaterialTable)
