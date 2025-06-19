import React, { useEffect, useState, useRef } from 'react';
import { connect } from 'react-redux';
import { notification, Select, Popover, Tooltip, Button } from 'antd';
import * as Action from '../action';
import * as AdminAction from '../../admin/actions/adminAction';
import * as DashboardAction from '../actions/dashboardAction';
import Auth from '../../../util/middleware/auth';
import Util from '../../../util/helper/index';
import useWindowDimensions from '../../../hooks/useWindowDimensions';
import 'antd/dist/antd.css';
import MaterialDropdownList from './MaterialBreakdown';
import * as AuthAction from '../../auth/action';
import appLevelConfig from '../../../config';
import { InfoCircleFilled, DownCircleOutlined, UpCircleOutlined } from '@ant-design/icons';
// import { Popover } from 'antd';
import './CreateOrder.css';
import _ from 'lodash';
import Loader from '../../../components/Loader';
import Collapsible from 'react-collapsible';
import moment from 'moment';
import { DatePicker, Space } from 'antd';
const appConfig = appLevelConfig.app_level_configuration;

const { Option } = Select;

let BulkOrderMaterialTable = (props) => {
    const browserHistory = props.history;
    const { width } = useWindowDimensions();

    let access_token = Auth.getAccessToken();
    let admin_access_token = Auth.getAdminAccessToken();
    let role = Auth.getRole();

    if ((!role && !access_token) || (role && !admin_access_token)) {
        browserHistory.push('/');
    }

    const {
        app_level_configuration,
        tableItems,
        liqMaterialsList,
        liqCounter,
        createOrderData,
        isFromReorder = false,
        universalProductType,
        distributorProfile,
        getMaterialsBOMData,
        distributorId,
        isLiquidationOrder,
        isSelfLiftingOrder,
        getMaintenanceRequests,
        isAutoOrder = false,
        getStockData,
        isSaltOnlyOrder,
        isRushOrder,
        isBulkOrder,
        distributor_sales_details,
        bulkMOQ,
        distributor_profile,
        getSapHoliday,
        validateBulk,
        setValidateBulk,
        totalQuantityTonnage,
        submitErrors,
    } = props;

    const [firstHit, setFirstHit] = useState(true);
    const [materialPromoData, setMaterialPromoData] = useState([]);
    const [bomExplodeFeatureFlag, setBomExplodeFeatureFlag] = useState(false);

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [windowSize, setWindowSize] = useState({
        width: undefined,
        height: undefined,
    });

    const [selectedPSKU, setSelectedPSKU] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [stockDataSuccess, setStockDataSuccess] = useState(false);

    const [isSaltOrder, setIsSaltOrder] = useState(false);
    const [plantName, setPlantName] = useState();
    const [ton, setTon] = useState();
    const [activePDPDay, setActivePDPDay] = useState();
    const [holiday, setHoliday] = useState();

    useEffect(() => {
        getMaintenanceRequests();
        setStockDataSuccess(false);
    }, []);

    const handleCancel = () => {
        setIsModalVisible(false);
    };

    const getUpcomingPDP = async (distributorId) => {
        const get_pdp_day = {
            SU: 0,
            MO: 1,
            TU: 2,
            WE: 3,
            TH: 4,
            FR: 5,
            SA: 6,
        };
        let payload = {
            state_name: distributor_profile?.region,
        };

        let PlantName = distributor_sales_details.find((item) => item.division === 14 && item.distribution_channel == 10);
        setPlantName(PlantName.plant_name);

        const holidayData = await getSapHoliday(payload);
        const filtered_holidays = holidayData?.data?.filter((item) => item.plant === PlantName.plant_name) || [];

        if (app_level_configuration?.length && distributor_profile) {
            const pdp = distributor_profile.distributor_sales_details;

            let pdp_Day = pdp?.find((item) => item.division === 14 && item.distribution_channel === 10);

            pdp_Day = pdp_Day?.pdp_day;

            let pdp_chunk;

            if (pdp_Day != null) {
                if (pdp_Day != null && pdp_Day.startsWith('WE')) {
                    pdp_chunk = pdp_Day.split('WE');
                } else {
                    pdp_chunk = pdp_Day.split('FN');
                }
                let pdp_days_array = [];
                for (let chunk of pdp_chunk) {
                    let pdp_day = chunk.split('');

                    pdp_day.forEach((item, i, arr) => {
                        let pdp_pair = [];
                        if (!pdp_pair.includes(item + arr[i + 1])) {
                            if (get_pdp_day.hasOwnProperty(item + arr[i + 1])) {
                                pdp_pair.push(item + arr[i + 1]);
                                pdp_days_array.push(pdp_pair);
                            }
                        }
                    });
                }

                let pdp_in_days = [];
                const today = new Date();

                pdp_days_array.forEach((item) => {
                    item.forEach((day, i, arr) => {
                        let pdp_date = Util.checkOrderAllowed_WE_PDP(day, today);
                        pdp_in_days.push(pdp_date.pdpDate);
                    });
                });

                let holiday_dates = filtered_holidays.map(
                    (item) => new Date(item.holiday_date?.split('-')[2], item.holiday_date?.split('-')[1] - 1, item.holiday_date?.split('-')[0]),
                );
                setHoliday(holiday_dates);
                let pdpNotInHolidays = pdp_in_days.filter((item) => {
                    let i = holiday_dates?.find((holiday) => item.getTime() == holiday.getTime());
                    const status = !i ? true : false;
                    return status;
                });

                //  TODO: SCENARIO TO BE HANDLED: Suppose all the pdp days are holidays, then we need to recalculate the upcoming pdp days for the next week.
                if (pdpNotInHolidays.length > 0) {
                    const earliestOrderDates = pdpNotInHolidays?.reduce((prev, curr) => (prev < curr ? prev : curr));
                    setActivePDPDay(earliestOrderDates);
                } else {
                    const earliestOrderDates = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
                    setActivePDPDay(earliestOrderDates);
                }
            } else {
                let today = new Date();
                setActivePDPDay(today);
            }
        }
    };

    //Window size effect
    useEffect(() => {
        function handleResize() {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }
        window.addEventListener('resize', handleResize);
        handleResize();

        getUpcomingPDP();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    //initial state values
    let tableObject = {
        materials: [],
        code: '',
        quantity: '',
        quantity_in_ton: '',
        description: '',
        sales_unit: '',
        pak_code: '',
        pak_type: '',
        buom: '',
        tentative: '',
        disabled: '',
        selectedValue: '',
        item_number: '',
        error: '',
        class: '',
        item_type: '',
        StockQuantity: '',
        sales_org: '',
        distribution_channel: '',
        division: '',
        Plant: '',
        PDP_Day: '',
        Reference_date: '',
        ton: '',
        stock_in_hand: '',
        stock_in_transit: '',
        open_order: '',
        isSubItem: false,
        sub_quantity: 0,
        ReqDeliveryDate: '',
        PoType: 'BO',
        summation: false,
        bulk_quantity_check: false,
        errors: '',
    };

    let tableRowObject = [
        {
            materials: [],
            code: '',
            quantity: '',
            quantity_in_ton: '',
            description: '',
            sales_unit: '',
            pak_code: '',
            pak_type: '',
            buom: '',
            tentative: '',
            disabled: '',
            selectedValue: '',
            item_number: '',
            error: '',
            class: '',
            item_type: '',
            StockQuantity: '',
            sales_org: '',
            distribution_channel: '',
            division: '',
            Plant: '',
            PDP_Day: '',
            Reference_date: '',
            ton: '',
            stock_in_hand: '',
            stock_in_transit: '',
            open_order: '',
            isSubItem: false,
            sub_quantity: 0,
            ReqDeliveryDate: '',
            PoType: 'BO',
            summation: false,
            bulk_quantity_check: false,
            errors: '',
        },
    ];

    const cachedData = window.localStorage.getItem('TCPL_SAP_formData') ? window.localStorage.getItem('TCPL_SAP_formData') : [];

    let stateItemsFromLocal;
    try {
        stateItemsFromLocal = JSON.parse(cachedData);
    } catch (err) {
        stateItemsFromLocal = null;
    }

    // const reorderCachedData = window.localStorage.getItem("TCPL_SAP_reorderData") ? window.localStorage.getItem("TCPL_SAP_reorderData") : [];

    // let reorderStateItemsFromLocal;
    // try {
    //     reorderStateItemsFromLocal = JSON.parse(reorderCachedData);
    // } catch (err) {
    //     reorderStateItemsFromLocal = null;
    // }

    // if (stateItems && stateItems.length && stateItems[0].code !== '' && !stateItemsFromLocal) {
    //     tableRowObject = stateItems;
    // }
    // else if (tableItems && stateItemsFromLocal && !stateItemsFromLocal.length && !isFromReorder) {
    //     tableRowObject = tableItems;
    // }
    // else if (stateItemsFromLocal && stateItemsFromLocal.length > 0 && !isFromReorder) {
    //     tableRowObject = stateItemsFromLocal;
    // }
    // else if (isFromReorder) {
    //     if (tableItems && reorderStateItemsFromLocal && !reorderStateItemsFromLocal.length) {
    //         tableRowObject = tableItems;
    //     }
    //     else if (reorderStateItemsFromLocal && reorderStateItemsFromLocal.length > 0) {
    //         tableRowObject = reorderStateItemsFromLocal;
    //     }
    // }

    // Allocation of intial state variable to values
    const [inputList, setInputList] = useState([...tableRowObject]);

    /** Function to display error messages while transaction */
    let errorHandler = (message, description, duration = 8) => {
        setTimeout(() => {
            notification.error({
                message,
                description,
                duration,
                className: 'notification-error',
            });
        }, 50);
    };
    var first = true;
    useEffect(() => {
        if (!isFromReorder) {
            if (!isLiquidationOrder || isLiquidationOrder) {
                setInputList([tableObject]);
                props.onListChange([]);
                props.onOrderChange(0);
                props.onDifferenceChange(0);
                if (liqCounter > 0) {
                    liqMaterialsList.forEach((item) => {
                        if (item.isDisabled) {
                            item.isDisabled = false;
                        }
                    });
                }
                props.distributorResetCreateOrderFormFieldsForLiqToggle();
            }
        }
    }, [props.isLiquidationOrder]);

    useEffect(() => {
        if (isSelfLiftingOrder) {
            props.distributorResetCreateOrderFormFieldsForLiqToggle();
        }
    }, [isSelfLiftingOrder]);

    useEffect(() => {
        if (!isSelfLiftingOrder || isSelfLiftingOrder) {
            setInputList([tableObject]);
            props.onListChange();
            props.onOrderChange(0);
            props.onDifferenceChange(0);
        }
    }, [isSelfLiftingOrder]);

    useEffect(() => {
        async function handleInputList() {
            if (selectedPSKU.length > 0) {
                let psku_arr = [];
                psku_arr.push(selectedPSKU);
                let docType = isLiquidationOrder ? 'ZLIQ' : 'ZOR';
                setStockDataSuccess(false);
                let sd = await getStockData({
                    dbCode: distributorId,
                    psku: psku_arr,
                    docType,
                });
                if (sd?.success) {
                    setInputList((prev) => {
                        let a = [...prev];
                        a[selectedIndex]['stock_in_transit'] = sd?.data[0]['stock_in_transit'];
                        a[selectedIndex]['stock_in_hand'] = sd?.data[0]['stock_in_hand'];
                        a[selectedIndex]['open_order'] = sd?.data[0]['open_order'];
                        return [...a];
                    });
                }
            }
        }
        handleInputList();
    }, [selectedIndex, selectedPSKU]);

    useEffect(() => {
        async function handleInputList() {
            if (isAutoOrder && inputList.length && inputList[0].code !== '') {
                let psku_arr = inputList.map((o) => o.code);
                let docType = 'ZOR';
                let sd = await getStockData({
                    dbCode: distributorId,
                    psku: psku_arr,
                    docType,
                });
                if (sd.success) {
                    setInputList((prev) => {
                        prev = prev.map((r) => {
                            let data = { ...sd.data.find((t) => r.code === t.sku) };
                            r['stock_in_transit'] = data['stock_in_transit'];
                            r['stock_in_hand'] = data['stock_in_hand'];
                            r['open_order'] = data['open_order'];
                            return r;
                        });
                        return prev;
                    });
                    setStockDataSuccess(true);
                }
            }
        }
        handleInputList();
    }, [inputList && inputList.length, isAutoOrder]);

    /** Function to sort the selected items */
    const sortItems = (list) => {
        list.map((item, i) => (list[i]['item_number'] = String(((i + 1) * 10).toString()).padStart(6, '0')));
        return list;
    };

    // handle select change
    const handleSelectChange = (m, i) => {
        if (!m || !m.code) return;
        setSelectedIndex(i);
        setSelectedPSKU(m['code']);

        if (document.getElementById('vldbtn') != null) document.getElementById('vldbtn').disabled = false;
        if (document.getElementById('sbtbtn') != null) document.getElementById('sbtbtn').disabled = true;
        const list = [...inputList];
        const oldCode = list[i]['code'];
        list[i]['code'] = m['code'];
        list[i]['description'] = m['description'];
        list[i]['sales_unit'] = m['sales_unit'];
        list[i]['pak_code'] = m['pak_code'];
        list[i]['pak_type'] = m['pak_type'];
        list[i]['sales_org'] = m['sales_org'];
        list[i]['distribution_channel'] = m['distribution_channel'];
        list[i]['division'] = m['division'];
        list[i]['StockQuantity'] = Math.floor(parseFloat(m['StockQuantity'])).toFixed(3);
        list[i]['quantity_in_ton'] = '';
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
        list[i]['ReqDeliveryDate'] = activePDPDay && activePDPDay;
        if (
            distributorProfile &&
            distributorProfile.area_code &&
            distributorProfile.channel_code &&
            m.appl_area_channel &&
            m.appl_area_channel.some((obj) => obj.area === distributorProfile.area_code && obj.channel === distributorProfile.channel_code)
        ) {
            list[i]['item_type'] = 'dist_specific';
        } else {
            list[i]['item_type'] = 'universal';
        }
        list.push({
            ...list[i],
            isSubItem: true,
            sub_quantity: 0,
            ReqDeliveryDate: activePDPDay && activePDPDay,
        });

        const matList = sortItems(list);

        const mappedInputList = matList.map((item) => item.selectedValue).filter((item) => item);

        matList.forEach((item) => {
            item.materials.forEach((mat) => {
                mappedInputList.forEach((ele) => {
                    if (mat.code === ele) {
                        mat.isDisabled = true;
                    }
                });
                if (mat.code === oldCode) {
                    mat.isDisabled = false;
                }
            });
        });

        groupBy(matList, ({ code }) => code);

        props.distributorUpdateCreateOrderFormField({
            field: 'items',
            value: matList,
        });
        props.onListChange(matList);

        first = false;
    };

    useEffect(() => {
        if (validateBulk && inputList.length > 0 && inputList[0].code != '') {
            let result = dateMerger(inputList);
            let newList = result;
            let subItem;

            subItem = inputList.filter((item) => !item.isSubItem);

            let mergelist = [...subItem, ...newList];

            groupBy(mergelist, ({ code }) => code);
        }
        setValidateBulk(false);
    }, [validateBulk]);

    useEffect(() => {
        try {
            if (cachedData && JSON.parse(cachedData).length > 0) {
                handleAddClick();
            }
        } catch (error) {
            // todo
        }

        // if (isFromReorder && reorderStateItemsFromLocal.length > 0) {
        //     props.distributorUpdateCreateOrderFormField({ field: 'items', value: reorderStateItemsFromLocal });
        // }

        setFirstHit(true);
    }, []);

    useEffect(() => {
        //this use effect is used to check for errors in imput list that should prevent validation
        let canValidate = true;
        const quantityMap = inputList
            .filter((item) => !item.isSubItem && item.code)
            .reduce((acc, item) => {
                acc[item.code] = { quantity: 0, sub_quantity: 0 };
                return acc;
            }, {});

        inputList
            .filter((item) => item.code)
            .forEach((item) => {
                if (item.isSubItem) {
                    quantityMap[item.code].sub_quantity += +item?.quantity_in_ton || 0;
                } else {
                    quantityMap[item.code].quantity = +item?.quantity_in_ton || 0;
                }
            });

        inputList.forEach((item) => {
            if (!item.quantity_in_ton || item.quantity_in_ton === '0' || !item.code) {
                canValidate = false;
                return;
            }
            if (item.errors) {
                canValidate = false;
                return;
            }
            if (quantityMap[item.code].quantity !== quantityMap[item.code].sub_quantity) {
                canValidate = false;
                return;
            }
        });
        if (!canValidate) {
            if (document.getElementById('vldbtn') != null) document.getElementById('vldbtn').disabled = true;
            if (document.getElementById('sbtbtn') != null) document.getElementById('sbtbtn').disabled = true;
        } else {
            if (document.getElementById('vldbtn') != null) document.getElementById('vldbtn').disabled = false;
            // if (document.getElementById('sbtbtn') != null) document.getElementById('sbtbtn').disabled = false;
        }
    }, [inputList]);

    const formatValue = (event, i) => {
        groupBy(inputList, ({ code }) => code);

        let { value, name } = event.target;

        let list = inputList[i];
        let materialList = list.materials;
        let convertedQunatity = list.quantity_in_ton;
        let conversionFactor = materialList.find((items) => items.code != null && list.code === items.code)?.ton_to_cv;

        if (conversionFactor != null) {
            list.quantity = String(Math.ceil(+convertedQunatity * +conversionFactor));
        } else {
            list.errors = 'Conversion factor not available';
        }
        list[name] = String(Math.ceil(+value));
    };

    const validateError = (value, index, code) => {
        let initialQuantity = inputList.filter((item) => item.code === code && !item.isSubItem)[0]?.quantity_in_ton;
        let subItemQuantity = inputList.map((item, i) => (item.code === code && item.isSubItem && i !== index ? +item.quantity_in_ton : 0)).reduce((a, b) => a + b);
        let total_sum = +subItemQuantity + +value;
        let list = [...inputList];
        if (initialQuantity == total_sum) {
            list.forEach((item, i) => {
                if (item.code === code && item.isSubItem) {
                    list[i].summation = true;
                }
            });
            let checkBulkMOQ = total_sum < bulkMOQ;
            if (checkBulkMOQ) {
                list.forEach((item, i) => {
                    if (item.code === code && item.isSubItem) {
                        list[i].errors = `quantity must be greater than ${bulkMOQ} ton `;
                        list[i].bulk_quantity_check = false;
                    }
                });
                if (document.getElementById('vldbtn') != null) document.getElementById('vldbtn').disabled = true;
                if (document.getElementById('sbtbtn') != null) document.getElementById('sbtbtn').disabled = true;
            } else {
                list.forEach((item, i) => {
                    if (item.code === code && item.isSubItem) {
                        list[i].errors = '';
                        list[i].bulk_quantity_check = true;
                    }
                });

                if (document.getElementById('vldbtn') != null) document.getElementById('vldbtn').disabled = false;

                if (document.getElementById('sbtbtn') != null) document.getElementById('sbtbtn').disabled = true;
            }
        } else {
            list.forEach((item, i) => {
                if (item.code === code && item.isSubItem) {
                    list[i].summation = false;
                }
            });

            list[index]['errors'] = `quantity must be Equal to  ${initialQuantity}`;

            if (document.getElementById('vldbtn') != null) document.getElementById('vldbtn').disabled = true;
            if (document.getElementById('sbtbtn') != null) document.getElementById('sbtbtn').disabled = true;
        }
        setInputList(list);
        props.distributorUpdateCreateOrderFormField({
            field: 'items',
            value: list,
        });
    };

    // handle input change
    const handleInputChange = (e, i, code) => {
        if (document.getElementById('vldbtn') != null) document.getElementById('vldbtn').disabled = false;
        if (document.getElementById('sbtbtn') != null) document.getElementById('sbtbtn').disabled = true;
        const { name } = e.target;

        if (!inputList[i].isSubItem) {
            inputList.forEach((item, i, array) => {
                if (item.code === code && item.isSubItem) {
                    array[i].quantity_in_ton = '0';
                }
            });
        }
        // const value = String(e.target.value.length > 1 && !inputList[i].isSubItem ? formatValue(e.target.value) : e.target.value);
        const value = e.target.value;
        let list = [...inputList];
        if (!inputList[i].isSubItem) inputList[i].errors = '';
        else {
            inputList[i].isSubItem && validateError(value, i, code);
        }

        list[i][name] = value;
        setInputList(list);
        props.distributorUpdateCreateOrderFormField({
            field: 'items',
            value: list,
        });
        props.onOrderChange();
        props.onDifferenceChange();
        if (bomExplodeFeatureFlag && !role) {
            getMaterialsBOMData({
                materialCode: code,
                quantity_in_ton: value === 0 || value === '' ? 0 : value,
            })
                .then((res) => {
                    let responseData = res?.data?.data;
                    let promoData = [];

                    if (materialPromoData.length > 0) {
                        const promoCodeExist = materialPromoData.some((mat) => mat.code === code);
                        if (promoCodeExist) {
                            if (value === 0) {
                                const val = materialPromoData.map((obj) => {
                                    return obj.code !== code;
                                });
                                inputList.map((objVal) => {
                                    if (objVal.code === code) {
                                        objVal.showHideArrow = false;
                                    }
                                });
                                setMaterialPromoData(val);
                            } else {
                                materialPromoData.find((v) => v.code === code).Promo_quantity = responseData.length > 0 ? responseData[0].Promo_quantity : '';
                                inputList.map((objVal) => {
                                    if (objVal.code === code) {
                                        objVal.showHideArrow = true;
                                    }
                                });
                                setInputList(inputList);
                                setMaterialPromoData(materialPromoData);
                            }
                        } else {
                            promoData = responseData.map((obj) => ({
                                ...obj,
                                code,
                            }));
                            inputList.map((objVal) => {
                                if (objVal.code === code) {
                                    objVal.showHideArrow = false;
                                }
                            });
                            setInputList(inputList);
                            setMaterialPromoData([...materialPromoData, ...promoData]);
                        }
                    } else {
                        if (responseData.length > 0) {
                            promoData = responseData.map((obj) => ({
                                ...obj,
                                code,
                            }));
                            inputList.map((objVal) => {
                                if (objVal.code === code) {
                                    objVal.showHideArrow = true;
                                }
                            });
                            setInputList(inputList);
                            setMaterialPromoData([...materialPromoData, ...promoData]);
                        }
                    }
                })
                .catch(() => {});
        }
    };

    // handle click event of the Remove button
    const handleRemoveClick = (index, code) => {
        validateError(0, index, code);
        const isSubitem = inputList[index].isSubItem;
        if (isSubitem) {
            const isDeleteAble = inputList.filter((item) => item.code === code).length > 2;

            if (!isDeleteAble) {
                setTimeout(() => {
                    notification.error({
                        message: 'Error',
                        description: `line item  ${index + 1}  cannot be deleted `,
                        className: 'notification-error',
                    });
                }, 50);
                return;
            }

            setFirstHit(false);
            if (document.getElementById('vldbtn') != null) document.getElementById('vldbtn').disabled = false;
            if (document.getElementById('sbtbtn')) document.getElementById('sbtbtn').disabled = true;
            const list = [...inputList];
            list.splice(index, 1);
            let matList = sortItems(list);
            const mappedInputList = matList.map((item) => item.selectedValue).filter((item) => item);

            let updatedMaterialPromoData = materialPromoData.filter((obj) => {
                return obj.code != code;
            });

            matList.forEach((item) => {
                item.materials.forEach((mat) => {
                    mappedInputList.forEach((ele) => {
                        if (mat.code === ele) {
                            mat.isDisabled = true;
                        }
                    });
                    if (mat.code === code) {
                        mat.isDisabled = false;
                    }
                });
            });
            setInputList(matList);
            setMaterialPromoData(updatedMaterialPromoData);
            props.distributorUpdateCreateOrderFormField({
                field: 'items',
                value: matList,
            });
            props.onOrderChange(0);
            props.onDifferenceChange(0);
            // window.localStorage.setItem("TCPL_SAP_formData", JSON.stringify(JSON.parse(window.localStorage.getItem("TCPL_SAP_formData")).filter((item) => item.code !== code)));
            // window.localStorage.setItem("TCPL_SAP_reorderData", JSON.stringify(JSON.parse(window.localStorage.getItem("TCPL_SAP_reorderData")).filter((item) => item.code !== code)));
            props.onListChange(matList);
        } else {
            setFirstHit(false);
            if (document.getElementById('vldbtn') != null) document.getElementById('vldbtn').disabled = false;
            if (document.getElementById('sbtbtn')) document.getElementById('sbtbtn').disabled = true;
            let list = [...inputList];
            list = list.filter((item) => item.code !== code);
            let matList = sortItems(list);
            const mappedInputList = matList.map((item) => item.selectedValue).filter((item) => item);

            let updatedMaterialPromoData = materialPromoData.filter((obj) => {
                return obj.code != code;
            });

            matList.forEach((item) => {
                item.materials.forEach((mat) => {
                    mappedInputList.forEach((ele) => {
                        if (mat.code === ele) {
                            mat.isDisabled = true;
                        }
                    });
                    if (mat.code === code) {
                        mat.isDisabled = false;
                    }
                });
            });
            setInputList(matList);
            setMaterialPromoData(updatedMaterialPromoData);
            props.distributorUpdateCreateOrderFormField({
                field: 'items',
                value: matList,
            });
            props.onOrderChange(0);
            props.onDifferenceChange(0);
            // window.localStorage.setItem("TCPL_SAP_formData", JSON.stringify(JSON.parse(window.localStorage.getItem("TCPL_SAP_formData")).filter((item) => item.code !== code)));
            // window.localStorage.setItem("TCPL_SAP_reorderData", JSON.stringify(JSON.parse(window.localStorage.getItem("TCPL_SAP_reorderData")).filter((item) => item.code !== code)));
            props.onListChange(matList);
        }
    };

    // handle click event of the Remove button
    const handleShowHidPromo = (type, code) => {
        inputList.map((obj, index) => {
            if (obj.code === code && type === 'show') {
                obj.showPromo = true;
            } else if (obj.code === code && type === 'hide') {
                obj.showPromo = false;
            }
        });
        setInputList(inputList);
        setIsModalVisible(true);
    };

    const firstRender = useRef(false);

    /* This useEffect, which only runs once, and never again.  */
    useEffect(() => {
        firstRender.current = true;
    }, []);

    // handle click event of the Add button
    const handleAddClick = () => {
        if (document.getElementById('vldbtn') != null) document.getElementById('vldbtn').disabled = false;
        if (document.getElementById('sbtbtn')) {
            document.getElementById('sbtbtn').disabled = true;
        }
        let list = [...inputList];
        groupBy(list, ({ code }) => code);

        // if (!(inputList.length > 0) && JSON.parse(window.localStorage.getItem("TCPL_SAP_formData"))) {

        //     setInputList(JSON.parse(window.localStorage.getItem("TCPL_SAP_formData")));
        // }
        // if (isFromReorder && !(inputList.length > 0) && JSON.parse(window.localStorage.getItem("TCPL_SAP_reorderData"))) {

        //     setInputList(JSON.parse(window.localStorage.getItem("TCPL_SAP_reorderData")));
        // }
        setFirstHit(false);
        if (Util.checkItemList(inputList).itmFlag === false && firstRender.current) {
            errorHandler('Error Occurred!', Util.checkItemList(inputList).errormessage, 2);
        } else {
            tableObject.ReqDeliveryDate = activePDPDay && activePDPDay;
            const list = [...inputList, tableObject];
            const matList = sortItems(list);
            groupBy(matList, ({ code }) => code);

            let total = 0;
            matList.forEach((item, i) => {
                if (!item.isSubItem) {
                    total += +item.quantity_in_ton;
                }
            });
            setTon(total);
            props.distributorUpdateCreateOrderFormField({
                field: 'items',
                value: matList,
            });
        }
        props.onOrderChange(0);
        props.onDifferenceChange(0);
        // if (stateItems && stateItems.length > 0) {
        //     if (isFromReorder) {
        //         window.localStorage.setItem("TCPL_SAP_reorderData", JSON.stringify(stateItems));
        //     } else {
        //         window.localStorage.setItem("TCPL_SAP_formData", JSON.stringify(stateItems));

        //     }
        // }
    };

    // material search using decounce
    const keywordsearch = debounce(async (keyword, i) => {
        if (isBulkOrder) {
            if (keyword && keyword !== '' && keyword !== 'undefined' && keyword != null) {
                const response = await Action.getMaterialsCodes(keyword, universalProductType, distributorId, isSelfLiftingOrder);
                if (response.status === 200) {
                    let { data = [] } = response.data;
                    data = data.filter((v, i, a) => a.findIndex((t) => t.code === v.code) === i);
                    let list = [...inputList];
                    list[i]['materials'] = data;

                    const mappedInputList = inputList.map((item) => item.selectedValue).filter((item) => item);
                    list.forEach((item) => {
                        mappedInputList.forEach((ele) => {
                            item.materials.forEach((mat) => {
                                if (mat.code === ele) {
                                    mat.isDisabled = true;
                                }
                            });
                        });
                    });
                    setInputList(list);
                    props.distributorUpdateCreateOrderFormField({
                        field: 'items',
                        value: list,
                    });
                }
            }
        }
    });

    // debounce function defination
    function debounce(func, timeout = 500) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                func.apply(this, args);
            }, timeout);
        };
    }

    useEffect(() => {
        if (app_level_configuration && app_level_configuration.length) {
            for (let config of app_level_configuration) {
                if (!config) continue;
                if (config.key === appConfig.bom_explode.key && config.value === appConfig.bom_explode.inactive_value) {
                    setBomExplodeFeatureFlag(false);
                }
            }
        } else {
            props.fetchAppLevelConfiguration();
        }
    }, [app_level_configuration]);

    useEffect(() => {
        if (tableItems && !isFromReorder && !stockDataSuccess) {
            setInputList(tableItems);
            props.distributorUpdateCreateOrderFormField({
                field: 'items',
                value: tableItems,
            });
        }
    }, [tableItems]);

    useEffect(() => {
        /**To empty the  existing data in the table on change of order type*/
        if (!isAutoOrder) {
            setInputList([tableObject]);
            props.distributorUpdateCreateOrderFormField({
                field: 'items',
                value: [],
            });
        }
    }, [isAutoOrder, isSelfLiftingOrder, isLiquidationOrder, isRushOrder]);

    useEffect(() => {
        setIsSaltOrder(isSaltOnlyOrder);
    }, [isSaltOnlyOrder]);

    function filterSaltProducts(materials) {
        if (isSaltOrder) {
            const filteredMaterials = materials?.map((material) => {
                if (material.division !== 14) material.isDisabled = true;
                return material;
            });
            return filteredMaterials ?? [];
        }
        return materials;
    }

    const dateMerger = (list) => {
        let objectHistory = {};
        let listItem = [...list];
        listItem = listItem.filter((item) => item.isSubItem);
        let errorHas = '';
        listItem.forEach((item) => {
            if (!errorHas.length) errorHas = item.error;
            if (objectHistory.hasOwnProperty(item.ReqDeliveryDate + item.code)) {
                let newData = objectHistory[item.ReqDeliveryDate + item.code];
                let data = [];
                if (newData != null) {
                    let total_ton = '';

                    if (newData[0]?.ton.includes('TO') && item?.ton.includes('TO')) {
                        total_ton = String(+newData[0]?.ton?.replaceAll('TO', '') + +item?.ton?.replaceAll('TO', ''));
                    } else if (!newData[0]?.ton.includes('TO') && item?.ton.includes('TO')) {
                        total_ton = String(+newData[0]?.ton + +item?.ton?.replaceAll('TO', ''));
                    } else {
                        total_ton = String(+newData[0]?.ton + +item?.ton);
                    }
                    data.push({
                        ...item,
                        quantity_in_ton: String(+newData[0].quantity_in_ton + +item.quantity_in_ton),
                        quantity: String(+newData[0].quantity + +item.quantity),
                        ton: total_ton,
                        tentative: String(+newData[0].tentative + +item.tentative),
                        error: errorHas,
                    });
                    objectHistory[item.ReqDeliveryDate + item.code] = data;
                }
            } else {
                objectHistory[item.ReqDeliveryDate + item.code] = [item];
            }
        });

        let newList = [];
        for (let item in objectHistory) {
            objectHistory[item].forEach((item) => {
                newList.push({
                    ...item,
                    ton: item.ton + ' ' + 'TO',
                    error: item.error,
                });
            });
        }
        return newList;
    };

    const groupBy = (list, keyGetter) => {
        let newInputList = [];

        const map = new Map();
        list.forEach((item) => {
            const key = keyGetter(item);
            const collection = map.get(key);
            if (!collection) {
                map.set(key, [item]);
            } else {
                collection.push(item);
            }
        });
        for (let [key, value] of map) {
            Array.isArray(value) ? value.map((item) => newInputList.push(item)) : newInputList.push(value);
        }
        sortItems(newInputList);
        setInputList(newInputList);
        props.distributorUpdateCreateOrderFormField({
            field: 'items',
            value: newInputList,
        });
    };

    const addSubItem = (e, index, code) => {
        if (document.getElementById('vldbtn') != null) document.getElementById('vldbtn').disabled = false;
        if (document.getElementById('sbtbtn') != null) document.getElementById('sbtbtn').disabled = true;

        if (code === '') {
            setTimeout(() => {
                notification.error({
                    message: 'Error',
                    description: `line item  ${index + 1}  cannot be empty `,
                    className: 'notification-error',
                });
            }, 50);
            return;
        }

        const list = [...inputList];
        list.push({
            ...list[index],
            isSubItem: true,
            sub_quantity: 0,
            quantity_in_ton: 0,
        });
        groupBy(list, ({ code }) => code);
    };
    const subItemDateChange = (index, code, date, dateString) => {
        //    if(document.getElementById("vldbtn")!=null) document.getElementById("vldbtn").disabled = true;
        //    if(document.getElementById("sbtbtn")!=null) document.getElementById("sbtbtn").disabled = false;

        let list = [...inputList];
        list[index].ReqDeliveryDate = date?._d;
        groupBy(list, ({ code }) => code);
        props.distributorUpdateCreateOrderFormField({
            field: 'items',
            value: list,
        });
    };

    const disabledDate = (current) => {
        return current && (holiday?.some((date) => moment(date).isSame(current.format('YYYY-MM-DD'))) || current.isSameOrBefore(moment(), 'day'));
    };

    return (
        <div>
            <div className="n-card-h">
                {width > 767 ? (
                    <span hidden={!isSaltOrder} className="important-notification">
                        [IMPORTANT: Orders restricted to salt products only.]
                    </span>
                ) : (
                    <>
                        <Popover content={'IMPORTANT: Orders restricted to salt products only.'} title="Formula" trigger="click" className="th-info-icon">
                            <InfoCircleFilled />
                        </Popover>
                    </>
                )}
                <button type="submit" className="addmore-button" onFocus={handleAddClick}>
                    <img src="/assets/images/add-order.svg" alt="Add New Item" />
                </button>
            </div>
            {width > 767 ? (
                <>
                    <div className="sales-order-table new-sales-order-table">
                        <Loader>
                            <div className="tablewrap">
                                <table>
                                    <thead style={{ textAlign: 'center' }}>
                                        <tr>
                                            <th>Order Material</th> {/*className="material-header" */}
                                            <th className="material-header-code">Material Code</th>
                                            <th>
                                                <Tooltip title="Stock In Hand" placement="bottom">
                                                    SIH
                                                </Tooltip>
                                            </th>
                                            <th>
                                                <Tooltip title="Stock In Transit" placement="bottom">
                                                    SIT
                                                </Tooltip>{' '}
                                            </th>
                                            <th>
                                                <Tooltip title="Open Orders" placement="bottom">
                                                    OO
                                                </Tooltip>
                                            </th>
                                            <th>
                                                <Tooltip title="Open Orders" placement="bottom">
                                                    Suggested Qty
                                                </Tooltip>
                                            </th>
                                            <th>
                                                <Tooltip title="Open Orders" placement="bottom">
                                                    Date
                                                </Tooltip>
                                            </th>
                                            <th>
                                                <Tooltip title="Open Orders" placement="bottom">
                                                    Sales Unit
                                                </Tooltip>
                                            </th>
                                            <th>
                                                <Tooltip title="Open Orders" placement="bottom">
                                                    Tentative Amount
                                                </Tooltip>
                                            </th>
                                            <th>
                                                <Tooltip title="Open Orders" placement="bottom">
                                                    Action
                                                </Tooltip>
                                            </th>
                                            {/* <th>Quantity in Tonnage
                                        <Popover content={content} placement="bottom" className="th-info-icon">
                                            <InfoCircleFilled />
                                        </Popover>
                                    </th> */}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {inputList.map((x, i) => {
                                            return (
                                                <React.Fragment key={`items-list-${i}`}>
                                                    {/*  dividing each parent row with other */}

                                                    <tr className="tr-divide">
                                                        {!x.isSubItem && (
                                                            <td colSpan={15}>
                                                                <div className="divide-tr">
                                                                    <span></span>
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>

                                                    <tr class={`${!x.isSubItem ? 'tr-color' : ''}`}>
                                                        <td className="material-box2">
                                                            <div className="material-table-data" style={{ height: '40px' }}>
                                                                <div className={`material-box-wrap2 ${x.isSubItem ? 'ml15' : ''} `}>
                                                                    {isBulkOrder && (
                                                                        <Select
                                                                            className="width-liqudation"
                                                                            showSearch
                                                                            placeholder="Type Bulk Order Material Name.."
                                                                            value={x.selectedValue}
                                                                            onChange={(val) => {
                                                                                var value = x.materials.length && x.materials.find((obj) => obj.code === val);
                                                                                handleSelectChange(value, i);
                                                                            }}
                                                                            autoFocus={!firstHit}
                                                                            onSearch={(val) => keywordsearch(val, i)}
                                                                            filterOption={false}
                                                                            showAction={['click']}
                                                                            disabled={x.isSubItem || x.description !== ''}
                                                                            showArrow={false}
                                                                            notFoundContent={false}
                                                                            listHeight={150}>
                                                                            {filterSaltProducts(x.materials)?.map((item, index) => {
                                                                                return (
                                                                                    <Option className="drop-down" value={item.code} key={index} disabled={item.isDisabled}>
                                                                                        <p className="desc">{`${item.description}`}</p>
                                                                                    </Option>
                                                                                );
                                                                            })}
                                                                        </Select>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className={'center-align padded'}>{x.code !== '' ? x.code : '-'}</td>
                                                        {isLiquidationOrder && <td>{x.StockQuantity ? x.StockQuantity : '-'}</td>}
                                                        <td className={'center-align padded'}>
                                                            {x.stock_in_hand != null && x.stock_in_hand != undefined && x.stock_in_hand !== ''
                                                                ? Math.ceil(Number(x.stock_in_hand))
                                                                : '-'}
                                                        </td>
                                                        <td className={'center-align padded'}>
                                                            {x.stock_in_transit != null && x.stock_in_transit != undefined && x.stock_in_transit !== ''
                                                                ? Math.ceil(Number(x.stock_in_transit))
                                                                : '-'}
                                                        </td>
                                                        <td className={'center-align padded'}>
                                                            {x.open_order != null && x.open_order != undefined && x.open_order !== '' ? Math.ceil(Number(x.open_order)) : '-'}
                                                        </td>
                                                        {isAutoOrder && <td className={'center-align padded'}>{x.original_quantity}</td>}
                                                        <td className="quantity-box">
                                                            <div className="quantity-box-wrap">
                                                                <input
                                                                    name="quantity_in_ton"
                                                                    type="number"
                                                                    placeholder=""
                                                                    value={x.quantity_in_ton}
                                                                    onWheel={(e) => e.currentTarget.blur()}
                                                                    onBlur={(e) => formatValue(e, i)}
                                                                    onChange={(e) => handleInputChange(e, i, x.code)}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className={'center-align padded'}>
                                                            <Space direction="vertical">
                                                                <DatePicker
                                                                    //    defaultValue={upcomingPDPDay && moment(upcomingPDPDay[0]?.orderStartDate)}
                                                                    defaultValue={x.ReqDeliveryDate === '' && activePDPDay}
                                                                    value={x.ReqDeliveryDate !== '' && moment(x.ReqDeliveryDate)}
                                                                    disabled={!x.isSubItem}
                                                                    disabledDate={disabledDate}
                                                                    onChange={(date, dateString) => subItemDateChange(i, x.code, date, dateString)}
                                                                    allowClear={false}
                                                                    format={'DD-MM-YYYY'}
                                                                />
                                                            </Space>
                                                        </td>
                                                        <td className={'center-align padded'}>TO</td>
                                                        <td className={'center-align padded'}>{x.tentative !== '' ? x.tentative : '-'}</td>
                                                        <td className="delete padded">
                                                            {/* onClick={(e) => addSubItem(e, i, x.code)} */}

                                                            <div>
                                                                <span>
                                                                    {' '}
                                                                    <img
                                                                        src="/assets/images/add-plus.svg"
                                                                        onClick={(e) => addSubItem(e, i, x.code)}
                                                                        alt="add material"
                                                                        hidden={x.isSubItem}
                                                                        style={{ border: '4px' }}
                                                                    />
                                                                </span>

                                                                <span>
                                                                    <img
                                                                        src="/assets/images/delete.svg"
                                                                        onClick={() => handleRemoveClick(i, x.code)}
                                                                        alt="delete material"
                                                                        hidden={x.isAutoOrderRecommended && !x.error && !x.pdperror}
                                                                    />
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {/* For Error Message  */}
                                                    <tr
                                                        style={{
                                                            borderBottomColor: '1px solid #f71515',
                                                        }}
                                                        className="error-class bg-remove">
                                                        <td colSpan="15" className="error-message">
                                                            {' '}
                                                            {x.error != '' && (
                                                                <div className={x.class}>
                                                                    <span className="error-message">Material does not qualify for this distributor or MRP not available.</span>
                                                                </div>
                                                            )}
                                                            {x.error != '' && (
                                                                <div className={x.class}>
                                                                    <span className="error-message">{x.error}</span>
                                                                </div>
                                                            )}
                                                            {x.errors != '' && (
                                                                <div className={x.class}>
                                                                    <span className="error-message">{x.errors}</span>
                                                                </div>
                                                            )}
                                                            {x.pdperror != '' && (
                                                                <div className={x.class}>
                                                                    <span className="error-message">{x.pdperror}</span>
                                                                </div>
                                                            )}
                                                            {x.toleranceError != '' && (
                                                                <div className={x.class}>
                                                                    <span className="error-message">{x.toleranceError}</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                <div
                                    className={`bulkorder-ribbon-css ${totalQuantityTonnage && totalQuantityTonnage < bulkMOQ ? 'bulkorder-ribbon-color2' : 'bulkorder-ribbon-color'}`}
                                    id={`${totalQuantityTonnage && totalQuantityTonnage > bulkMOQ && 'bulkorder-ribbon-color-success'}`}>
                                    <span>Plant Code: {plantName}</span>
                                    <span>MOQ/RDD (in tonnes): {bulkMOQ}</span>
                                    <span>Total Qty.(in tonnes): {totalQuantityTonnage && totalQuantityTonnage.toFixed(2)}</span>
                                </div>
                                {Object.keys(submitErrors).length > 0 && (
                                    <div className="submit-errors">
                                        {Object.keys(submitErrors).map((error_key, index) => {
                                            let value = submitErrors[error_key];
                                            if (value?.length > 0) {
                                                const child = value.slice(1).map((error, ind) => {
                                                    return (
                                                        <div key={ind} style={{ marginLeft: '15px' }}>
                                                            {error}
                                                        </div>
                                                    );
                                                });

                                                return (
                                                    <Collapsible
                                                        trigger={
                                                            value.length > 1
                                                                ? [
                                                                      value[0],
                                                                      <DownCircleOutlined
                                                                          style={{
                                                                              color: '#a70505',
                                                                              float: 'right',
                                                                          }}
                                                                      />,
                                                                  ]
                                                                : [value[0]]
                                                        }
                                                        triggerWhenOpen={
                                                            value.length > 1
                                                                ? [
                                                                      value[0],
                                                                      <UpCircleOutlined
                                                                          style={{
                                                                              color: '#a70505',
                                                                              float: 'right',
                                                                          }}
                                                                      />,
                                                                  ]
                                                                : [value[0]]
                                                        }
                                                        triggerDisabled={value.length <= 1}
                                                        className="collapsible-header"
                                                        triggerOpenedClassName="collapsible-header">
                                                        {child}
                                                    </Collapsible>
                                                );
                                            } else {
                                                return null;
                                            }
                                        })}
                                    </div>
                                )}
                            </div>
                        </Loader>
                    </div>
                    <div className="add-order-wrap mob-add-order">
                        <span>
                            <button
                                type="submit"
                                id="addMoreItem"
                                className="addmore-button"
                                onClick={handleAddClick}
                                // onFocus={handleAddClick}
                            >
                                <img src="/assets/images/add-order.svg" alt="Add New Item" />
                            </button>
                        </span>
                    </div>{' '}
                </>
            ) : (
                <div className="mobile-card-block">
                    {inputList.map((x, i) => {
                        return (
                            <div className="mobile-card-item" key={`items-list-${i}`}>
                                <div className="mobile-card-row">
                                    <div className="mobile-card-col-full">
                                        <div className="mobile-material-control">
                                            <h3>
                                                Material Description
                                                <div className="material-promo-btn">
                                                    {bomExplodeFeatureFlag && x.showHideArrow && (
                                                        <div onClick={() => handleShowHidPromo('show', x.code)}>
                                                            <span>View Promo</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </h3>
                                            <Select
                                                showSearch
                                                placeholder="Type material name.."
                                                value={x.selectedValue}
                                                onChange={(val) => {
                                                    var value = x.materials.length && x.materials.find((obj) => obj.code === val);
                                                    handleSelectChange(value, i);
                                                }}
                                                autoFocus={!firstHit}
                                                onSearch={(val) => keywordsearch(val, i)}
                                                filterOption={false}
                                                showAction={['focus', 'click']}
                                                showArrow={false}
                                                notFoundContent={false}
                                                listHeight={150}
                                                disabled={x.isSubItem || x.description !== ''}>
                                                {filterSaltProducts(x.materials)?.map((item, index) => {
                                                    return (
                                                        <Option value={item.code} key={index} disabled={item.isDisabled}>
                                                            {`${item.description}`}
                                                        </Option>
                                                    );
                                                })}
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                                <div className="mobile-card-row">
                                    <div className="mobile-card-col-half">
                                        <div className="mobile-material-control">
                                            <h3>Material Code</h3>
                                            <p>{x.code !== '' ? x.code : '-'}</p>
                                        </div>
                                    </div>
                                    <div className="mobile-card-col-half" hidden={!isLiquidationOrder}>
                                        <div className="mobile-material-control">
                                            <h3>Stock Quantity</h3>
                                            <p>{x.StockQuantity ? x.StockQuantity : '-'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mobile-card-row">
                                    <div className="mobile-card-col-half">
                                        <div className="mobile-material-control">
                                            <h3>Suggested Qty</h3>
                                            <p>{x.original_quantity ? x.original_quantity : '-'}</p>
                                        </div>
                                    </div>
                                    <div className="mobile-card-col-half">
                                        <div className="mobile-material-control">
                                            <h3>Quantity</h3>
                                            <input
                                                name="quantity_in_ton"
                                                type="number"
                                                placeholder=""
                                                value={x.quantity_in_ton}
                                                onWheel={(e) => e.currentTarget.blur()}
                                                onBlur={(e) => formatValue(e, i)}
                                                onChange={(e) => handleInputChange(e, i, x.code)}
                                            />
                                        </div>
                                    </div>
                                    <div className="mobile-card-col-half">
                                        <div className="mobile-material-control">
                                            <Space direction="vertical">
                                                <DatePicker
                                                    //    defaultValue={upcomingPDPDay && moment(upcomingPDPDay[0]?.orderStartDate)}
                                                    defaultValue={x.ReqDeliveryDate === '' && activePDPDay}
                                                    value={x.ReqDeliveryDate !== '' && moment(x.ReqDeliveryDate)}
                                                    disabled={!x.isSubItem}
                                                    disabledDate={disabledDate}
                                                    onChange={(date, dateString) => subItemDateChange(i, x.code, date, dateString)}
                                                    allowClear={false}
                                                    format={'DD-MM-YYYY'}
                                                />
                                            </Space>
                                        </div>
                                    </div>
                                </div>
                                <div className="mobile-card-row">
                                    <div className="mobile-card-col-half">
                                        <div className="mobile-material-control">
                                            <h3>Sales Unit</h3>
                                            <p>TO</p>
                                        </div>
                                    </div>
                                    <div className="mobile-card-col-half">
                                        <div className="mobile-material-control">
                                            <h3>Stock In Hand</h3>
                                            <p>{x.stock_in_hand != null && x.stock_in_hand != undefined && x.stock_in_hand !== '' ? Math.ceil(Number(x.stock_in_hand)) : '-'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mobile-card-row">
                                    <div className="mobile-card-col-half">
                                        <div className="mobile-material-control">
                                            <h3>Stock In Transit</h3>
                                            <p>
                                                {x.stock_in_transit != null && x.stock_in_transit != undefined && x.stock_in_transit !== ''
                                                    ? Math.ceil(Number(x.stock_in_transit))
                                                    : '-'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mobile-card-col-half">
                                        {/* <div className='mobile-material-control'>
                                            <h3>Quantity in Tonnage
                                                <Popover content={content} placement="left" trigger="click"
                                                    className="th-info-icon">
                                                    <InfoCircleFilled />
                                                </Popover>
                                            </h3>
                                            <p>{x.ton !== "" ? parseFloat(x.ton.split(' TO')).toFixed(2) + ' TO' : '-'}</p>
                                        </div> */}
                                        <div className="mobile-material-control">
                                            <h3>Open Order</h3>
                                            <p>{x.open_order != null && x.open_order != undefined && x.open_order !== '' ? Math.ceil(Number(x.open_order)) : '-'}</p>
                                        </div>
                                    </div>
                                    <div className="mobile-card-col-half">
                                        <div className="mobile-material-control">
                                            <h3>Tentative Amount in Rs</h3>
                                            <p>{x.tentative !== '' ? x.tentative : '-'}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="mobile-card-col-half">
                                            <span>
                                                {' '}
                                                <img
                                                    src="/assets/images/add-plus.svg"
                                                    onClick={(e) => addSubItem(e, i, x.code)}
                                                    alt="add material"
                                                    hidden={x.isSubItem}
                                                    style={{ border: '4px' }}
                                                />
                                            </span>

                                            <span>
                                                <img
                                                    src="/assets/images/delete.svg"
                                                    onClick={() => handleRemoveClick(i, x.code)}
                                                    alt="delete material"
                                                    hidden={x.isAutoOrderRecommended && !x.error && !x.pdperror}
                                                />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mobile-card-row">
                                    <div className="mobile-card-col-full">
                                        <div className="mobile-material-delete">
                                            <span onClick={() => handleRemoveClick(i, x.code)} hidden={x.isAutoOrderRecommended && !x.error && !x.pdperror}>
                                                Remove
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className="mobile-card-error"
                                    style={{
                                        backgroundColor: 'inherit',
                                        borderBottomColor: '1px solid #f71515',
                                    }}>
                                    {x.error != '' && (
                                        <div className={x.class}>
                                            <span className="error-message">Material does not qualify for this distributor or MRP not available.</span>
                                        </div>
                                    )}
                                    {x.error != '' && (
                                        <div className={x.class}>
                                            <span className="error-message">{x.error}</span>
                                        </div>
                                    )}
                                    {x.errors != '' && (
                                        <div className={x.class}>
                                            <span className="error-message">{x.errors}</span>
                                        </div>
                                    )}
                                    {x.pdperror != '' && (
                                        <div className={x.class}>
                                            <span className="error-message">{x.pdperror}</span>
                                        </div>
                                    )}
                                </div>
                                {bomExplodeFeatureFlag && x.showPromo && (
                                    <div className="bom-material-promo">
                                        {materialPromoData.length > 0 &&
                                            materialPromoData.map((promoData, index) => {
                                                return (
                                                    promoData.code === x.code && (
                                                        <MaterialDropdownList
                                                            code={promoData.code}
                                                            key={index}
                                                            type={promoData.Promo_pack_type}
                                                            promoName={promoData.Promo_description}
                                                            promoCode={promoData.Promo_Material}
                                                            promoQuantity={promoData.Promo_quantity}
                                                            promoUnits={promoData.Promo_Units}
                                                            visible={isModalVisible}
                                                            onCancel={handleCancel}
                                                            windowSize={windowSize.width}
                                                        />
                                                    )
                                                );
                                            })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <div
                        className={`bulkorder-ribbon-css ${totalQuantityTonnage && totalQuantityTonnage < bulkMOQ ? 'bulkorder-ribbon-color2' : 'bulkorder-ribbon-color'}`}
                        id={totalQuantityTonnage && totalQuantityTonnage > bulkMOQ ? 'bulkorder-ribbon-color-success' : ''}>
                        <span>
                            <strong>Plant Code:</strong>
                            <span>{plantName}</span>
                        </span>
                        <span>
                            <strong>MOQ/RDD (in tonnes):</strong>
                            <span>{bulkMOQ}</span>
                        </span>
                        <span>
                            <strong>Total Qty.(in tonnes):</strong>
                            <span>{totalQuantityTonnage && totalQuantityTonnage.toFixed(2)}</span>
                        </span>
                    </div>
                    <div className="mobile-add-more">
                        <button type="submit" className="addmore-button" onClick={handleAddClick}>
                            Add More
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
const mapStateToProps = (state) => {
    return {
        createOrderData: state.distributor.get('create_order'),
        distributor_profile: state.dashboard.get('region_details'),
        app_level_configuration: state.auth.get('app_level_configuration'),
        region_details: state.dashboard.get('region_details'),
    };
};
const mapDispatchToProps = (dispatch) => {
    return {
        getMaintenanceRequests: () => dispatch(AdminAction.getMaintenanceRequests()),
        distributorUpdateCreateOrderFormField: (data) => dispatch(Action.distributorUpdateCreateOrderFormField(data)),
        distributorValidateCreateOrderForm: (status) => dispatch(Action.distributorValidateCreateOrderForm(status)),
        distributorResetCreateOrderFormFields: () => dispatch(Action.distributorResetCreateOrderFormFields()),
        distributorResetCreateOrderCompleteFormFields: () => dispatch(Action.distributorResetCreateOrderCompleteFormFields()),
        distributorResetCreateOrderFormFieldsForLiqToggle: () => dispatch(Action.distributorResetCreateOrderFormFieldsForLiqToggle()),
        getMaterialsBOMData: (data) => dispatch(DashboardAction.getMaterialsBOMData(data)),
        fetchAppLevelConfiguration: () => dispatch(AuthAction.fetchAppLevelSettings()),
        getStockData: (data) => dispatch(AdminAction.getStockData(data)),
        getDistMoq: (data) => dispatch(AdminAction.getBODistMoq(data)),
        getSapHoliday: (data) => dispatch(AdminAction.getSAPHoliday(data)),
    };
};

const ConnectBulkOrderMaterialTable = connect(mapStateToProps, mapDispatchToProps)(BulkOrderMaterialTable);

export default ConnectBulkOrderMaterialTable;
