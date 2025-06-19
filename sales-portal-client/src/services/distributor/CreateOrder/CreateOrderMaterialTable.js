import React, { useEffect, useState, useRef } from 'react';
import { connect } from 'react-redux';
import { notification, Select, Popover, Tooltip } from 'antd';
import * as Action from '../action';
import * as AdminAction from '../../admin/actions/adminAction';
import * as DashboardAction from '../../distributor/actions/dashboardAction';
import Auth from '../../../util/middleware/auth';
import Util from '../../../util/helper/index';
import useWindowDimensions from '../../../hooks/useWindowDimensions';
import 'antd/dist/antd.css';
import MaterialDropdownList from './MaterialBreakdown';
import * as AuthAction from '../../auth/action';
import appLevelConfig from '../../../config';
import { InfoCircleFilled, DownCircleOutlined, UpCircleOutlined  } from '@ant-design/icons';
// import { Popover } from 'antd';
import './CreateOrder.css';
import _ from "lodash";
import Loader from '../../../components/Loader';
import Collapsible from 'react-collapsible';

const appConfig = appLevelConfig.app_level_configuration;

const { Option } = Select;



let CreateOrderMaterialTable = props => {
     const browserHistory = props.history; 
    // const content = (
    //     <div>
    //         <div>1 Kg = 0.001 Tons</div>
    //         <div>1 Ltr = 0.0001 Tons</div>
    //     </div>
    // );
    const { width } = useWindowDimensions();

    let access_token = Auth.getAccessToken();
    let admin_access_token = Auth.getAdminAccessToken();
    let role = Auth.getRole();

    if ((!role && !access_token) || (role && !admin_access_token)) {
        browserHistory?.push('/');
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
        getRegionDetails,
        getMaterialsBOMData,
        distributorId,
        isLiquidationOrder,
        isSelfLiftingOrder,
        getMaintenanceRequests,
        isAutoOrder = false,
        tolerance = {},
        originalRecommendation,
        getStockData,
        isSaltOnlyOrder,
        isRushOrder,
        submitErrors,
        rushOrderErrorMessage,
    } = props;

    const [/* materials */, setMaterials] = useState([]);
    const [firstHit, setFirstHit] = useState(true);
    const [isActive, setIsActive] = useState(-1);
    const [materialPromoData, setMaterialPromoData] = useState([]);
    const [bomExplodeFeatureFlag, setBomExplodeFeatureFlag] = useState(false);

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [windowSize, setWindowSize] = useState({
        width: undefined,
        height: undefined,
    });

    const [stockFetch, setStockFetch] = useState(false);
    const [selectedPSKU, setSelectedPSKU] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [stockDataSuccess, setStockDataSuccess] = useState(false);
    const [sortDirectionAsc, setSortDirectionAsc] = useState(true);
    const [isSaltOrder, setIsSaltOrder] = useState(false);

    useEffect(() => {
        getMaintenanceRequests();
        setStockDataSuccess(false);
    }, []);

    const handleCancel = () => {
        setIsModalVisible(false);
    };

    //Window size effect
    useEffect(() => {
        function handleResize() {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }
        window.addEventListener("resize", handleResize);
        handleResize();
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    //initial state values 
    let tableObject = { materials: [], code: "", quantity: "", description: "", sales_unit: "", pak_code: "", pak_type: "", buom: "", tentative: "", disabled: "", selectedValue: "", item_number: "", error: "", class: "", item_type: "", StockQuantity: "", sales_org: "", distribution_channel: "", division: "", Plant: "", PDP_Day: "", Reference_date: "", ton: "", stock_in_hand: "", stock_in_transit: "", open_order: "" };

    let tableRowObject = [{ materials: [], code: "", quantity: "", description: "", sales_unit: "", pak_code: "", pak_type: "", buom: "", tentative: "", disabled: "", selectedValue: "", item_number: "", error: "", class: "", item_type: "", StockQuantity: "", sales_org: "", distribution_channel: "", division: "", Plant: "", PDP_Day: "", Reference_date: "", ton: "", stock_in_hand: "", stock_in_transit: "", open_order: "" }];

    const cachedData = window.localStorage.getItem("TCPL_SAP_formData") ? window.localStorage.getItem("TCPL_SAP_formData") : [];

    let stateItemsFromLocal;
    try {
        stateItemsFromLocal = JSON.parse(cachedData);
    } catch (err) {
        stateItemsFromLocal = null;
    }

    const reorderCachedData = window.localStorage.getItem("TCPL_SAP_reorderData") ? window.localStorage.getItem("TCPL_SAP_reorderData") : [];

    let reorderStateItemsFromLocal;
    try {
        reorderStateItemsFromLocal = JSON.parse(reorderCachedData);
    } catch (err) {
        reorderStateItemsFromLocal = null;
    }

    const stateItems = createOrderData.get("items");

    if (stateItems && stateItems.length && stateItems[0].code !== '' && !stateItemsFromLocal) {
        tableRowObject = stateItems;
    }
    else if (tableItems && stateItemsFromLocal && !stateItemsFromLocal.length && !isFromReorder) {
        tableRowObject = tableItems;
    }
    else if (stateItemsFromLocal && stateItemsFromLocal.length > 0 && !isFromReorder) {
        tableRowObject = stateItemsFromLocal;
    }
    else if (isFromReorder) {
        if (tableItems && reorderStateItemsFromLocal && !reorderStateItemsFromLocal.length) {
            tableRowObject = tableItems;
        }
        else if (reorderStateItemsFromLocal && reorderStateItemsFromLocal.length > 0) {
            tableRowObject = reorderStateItemsFromLocal;
        }
    }

    // Allocation of intial state variable to values
    const [inputList, setInputList] = useState([...tableRowObject]);

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
    useEffect(() => {
        const items = createOrderData.get("items");
        if (items) {
            setInputList(prev => prev.map((item, index) => {
                if (items[index] && items[index].pdperror) {
                    item.pdperror = items[index].pdperror;
                }
                return item;
            }));
        }
    }, [createOrderData.get("items")]);
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
                            item.isDisabled = false
                        }
                    })
                }
                props.distributorResetCreateOrderFormFieldsForLiqToggle();
            }
        }
    }, [props.isLiquidationOrder])

    useEffect(() => {
        if (isSelfLiftingOrder) {
            props.distributorResetCreateOrderFormFieldsForLiqToggle();
        }
    }, [isSelfLiftingOrder])


    useEffect(() => {
        if (!isSelfLiftingOrder || isSelfLiftingOrder) {
            setInputList([tableObject]);
            props.onListChange();
            props.onOrderChange(0);
            props.onDifferenceChange(0);
        }
    }, [isSelfLiftingOrder])

    useEffect(() => {
        async function handleInputList() {
            if (selectedPSKU.length > 0) {
                let psku_arr = [];
                psku_arr.push(selectedPSKU)
                let docType = (isLiquidationOrder) ? 'ZLIQ' : 'ZOR';
                setStockDataSuccess(false);
                let sd = await getStockData({ dbCode: distributorId, psku: psku_arr, docType });
                if (sd.success) {
                    setInputList(prev => {
                        let a = [...prev];
                        a[selectedIndex]['stock_in_transit'] = sd.data[0]['stock_in_transit'];
                        a[selectedIndex]['stock_in_hand'] = sd.data[0]['stock_in_hand'];
                        a[selectedIndex]['open_order'] = sd.data[0]['open_order'];
                        return [...a];
                    })
                }
            }
        }
        handleInputList();
    }, [selectedIndex, selectedPSKU])

    useEffect(() => {
        async function handleInputList() {
            if (isAutoOrder && inputList.length && inputList[0].code !== '') {
                let psku_arr = inputList.map(o => o.code);
                let docType = 'ZOR';
                let sd = await getStockData({ dbCode: distributorId, psku: psku_arr, docType });
                if (sd.success) {
                    setInputList(prev => {
                        prev = prev.map(r => {
                            let data = { ...sd.data.find(t => r.code === t.sku) }
                            r['stock_in_transit'] = data['stock_in_transit'];
                            r['stock_in_hand'] = data['stock_in_hand']
                            r['open_order'] = data['open_order'];
                            return r;
                        });
                        return prev;
                    })
                    setStockDataSuccess(true);
                }
            }
        }
        handleInputList();
    }, [inputList && inputList.length, isAutoOrder])

    /** Function to sort the selected items */
    const sortItems = list => {
        list.map((item, i) => (
            list[i]['item_number'] = String(((i + 1) * 10).toString()).padStart(6, '0')
        ))
        return list;
    }

    // handle select change
    const handleSelectChange = (m, i) => {
        if (!m || !m.code) return;
        setSelectedIndex(i);
        setSelectedPSKU(m['code']);

        document.getElementById("vldbtn").disabled = false;
        if (document.getElementById("sbtbtn")) document.getElementById("sbtbtn").disabled = true;
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
        if (distributorProfile && distributorProfile.area_code && distributorProfile.channel_code && m.appl_area_channel && m.appl_area_channel.some(obj => (obj.area === distributorProfile.area_code) && (obj.channel === distributorProfile.channel_code))) {
            list[i]['item_type'] = 'dist_specific';
        } else {
            list[i]['item_type'] = 'universal';
        }

        const matList = sortItems(list);
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
        setInputList(matList);
        props.distributorUpdateCreateOrderFormField({ field: 'items', value: matList });
        props.onListChange(matList);

    };
    useEffect(() => {
        try {
            if (cachedData && JSON.parse(cachedData).length > 0) {
                handleAddClick();
            }
        } catch (error) {
            // todo
        }

        if (isFromReorder && reorderStateItemsFromLocal.length > 0) {
            props.distributorUpdateCreateOrderFormField({ field: 'items', value: reorderStateItemsFromLocal });
        }

        setFirstHit(true);
    }, []);

    // handle input change
    const handleInputChange = (e, i, code) => {

        document.getElementById("vldbtn").disabled = false;
        if (document.getElementById("sbtbtn")) document.getElementById("sbtbtn").disabled = true;
        const { name, value } = e.target;
        const list = [...inputList];
        list[i][name] = value;
        setInputList(list);
        props.distributorUpdateCreateOrderFormField({ field: 'items', value: list });
        props.onOrderChange();
        props.onDifferenceChange();
        if (bomExplodeFeatureFlag && !role) {
            getMaterialsBOMData({ materialCode: code, quantity: value === 0 || value === '' ? 0 : value }).then((res) => {
                let responseData = res?.data?.data
                let promoData = [];

                if (materialPromoData.length > 0) {

                    const promoCodeExist = materialPromoData.some(mat => mat.code === code);
                    if (promoCodeExist) {
                        if (value === 0) {
                            const val = materialPromoData.map((obj) => {
                                return obj.code !== code
                            })
                            inputList.map((objVal) => {
                                if (objVal.code === code) {
                                    objVal.showHideArrow = false
                                }
                            })
                            setMaterialPromoData(val)
                        } else {
                            materialPromoData.find(v => v.code === code).Promo_quantity = responseData.length > 0 ? responseData[0].Promo_quantity : '';
                            inputList.map((objVal) => {
                                if (objVal.code === code) {
                                    objVal.showHideArrow = true
                                }
                            })
                            setInputList(inputList);
                            setMaterialPromoData(materialPromoData)
                        }
                    } else {
                        promoData = responseData.map((obj) => ({
                            ...obj, code
                        }))
                        inputList.map((objVal) => {
                            if (objVal.code === code) {
                                objVal.showHideArrow = false
                            }
                        })
                        setInputList(inputList);
                        setMaterialPromoData([...materialPromoData, ...promoData])
                    }
                } else {
                    if (responseData.length > 0) {
                        promoData = responseData.map((obj) => ({
                            ...obj, code
                        }))
                        inputList.map((objVal) => {
                            if (objVal.code === code) {
                                objVal.showHideArrow = true
                            }
                        })
                        setInputList(inputList);
                        setMaterialPromoData([...materialPromoData, ...promoData])
                    }
                }
            }).catch(() => { });
        }
    };



    // handle click event of the Remove button
    const handleRemoveClick = (index, code) => {
        setFirstHit(false);
        document.getElementById("vldbtn").disabled = false;
        if (document.getElementById("sbtbtn")) document.getElementById("sbtbtn").disabled = true;
        const list = [...inputList];
        list.splice(index, 1);
        const matList = sortItems(list);
        const mappedInputList = matList.map(item => item.selectedValue)
            .filter(item => item);

        let updatedMaterialPromoData = materialPromoData.filter(obj => {
            return obj.code != code;
        })

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
        setInputList(matList);
        setMaterialPromoData(updatedMaterialPromoData)
        props.distributorUpdateCreateOrderFormField({ field: 'items', value: matList });
        props.onOrderChange(0);
        props.onDifferenceChange(0);
        window.localStorage.setItem("TCPL_SAP_formData", JSON.stringify(JSON.parse(window.localStorage.getItem("TCPL_SAP_formData")).filter((item) => item.code !== code)));
        window.localStorage.setItem("TCPL_SAP_reorderData", JSON.stringify(JSON.parse(window.localStorage.getItem("TCPL_SAP_reorderData")).filter((item) => item.code !== code)));
        props.onListChange(matList);
    };

    // handle click event of the Remove button
    const handleShowHidPromo = (type, code) => {
        inputList.map((obj, index) => {
            if (obj.code === code && type === 'show') {
                obj.showPromo = true
            } else if (obj.code === code && type === 'hide') {
                obj.showPromo = false
            }
        })
        setInputList(inputList);
        setIsModalVisible(true);
    }

    const firstRender = useRef(false);

    /* This useEffect, which only runs once, and never again.  */
    useEffect(() => {
        firstRender.current = true;
    }, []);

    // handle click event of the Add button
    const handleAddClick = () => {
        document.getElementById("vldbtn").disabled = false;
        if (document.getElementById("sbtbtn")) document.getElementById("sbtbtn").disabled = true;
        if (!(inputList.length > 0) && JSON.parse(window.localStorage.getItem("TCPL_SAP_formData"))) {
            setInputList(JSON.parse(window.localStorage.getItem("TCPL_SAP_formData")));
        }
        if (isFromReorder && !(inputList.length > 0) && JSON.parse(window.localStorage.getItem("TCPL_SAP_reorderData"))) {
            setInputList(JSON.parse(window.localStorage.getItem("TCPL_SAP_reorderData")));
        }
        setFirstHit(false);
        if (Util.checkItemList(inputList).itmFlag === false && (firstRender.current)) {
            errorHandler(
                'Error Occurred!',
                Util.checkItemList(inputList).errormessage,
                2
            )
        } else {
            setMaterials([]);
            const list = [...inputList, tableObject];
            const matList = sortItems(list);
            setInputList(matList);
            props.distributorUpdateCreateOrderFormField({ field: 'items', value: matList });
        }
        props.onOrderChange(0);
        props.onDifferenceChange(0);
        if (stateItems && stateItems.length > 0) {
            if (isFromReorder) {
                window.localStorage.setItem("TCPL_SAP_reorderData", JSON.stringify(stateItems));
            } else {
                window.localStorage.setItem("TCPL_SAP_formData", JSON.stringify(stateItems));

            }
        }
    }

    // material search using debounce
    const keywordsearch = debounce(
        async (keyword, i) => {
            if (isLiquidationOrder) {
                if (keyword && keyword !== '' && keyword !== 'undefined' && keyword != null) {
                    let data = liqMaterialsList && liqMaterialsList.length > 0 ? liqMaterialsList : [];
                    let filteredData = data.filter(item => (item.description.toUpperCase().includes(keyword.toUpperCase())));
                    const list = [...inputList];
                    list[i]['materials'] = filteredData;
                    const mappedInputList = inputList.map(item => item.selectedValue)
                        .filter(item => item);
                    list.forEach(item => {
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
                    setInputList(list);
                    props.distributorUpdateCreateOrderFormField({ field: 'items', value: list });
                }
            }
            else {
                if (keyword && keyword !== '' && keyword !== 'undefined' && keyword != null) {
                    const {is_nourishco} = distributorProfile;
                    const response = await Action.getMaterialsCodes(keyword, universalProductType, distributorId, isSelfLiftingOrder, is_nourishco);
                    if (response.status === 200) {
                        let { data = [] } = response.data;
                        data = data.filter((v, i, a) => a.findIndex(t => t.code === v.code) === i);
                        const list = [...inputList];
                        list[i]['materials'] = data;
                        //setMaterials(response.data);
                        const mappedInputList = inputList.map(item => item.selectedValue)
                            .filter(item => item);
                        list.forEach(item => {
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
                        setInputList(list);
                        props.distributorUpdateCreateOrderFormField({ field: 'items', value: list });
                    }
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

    const showMaterialDropdown = (index) => {
        if (isActive === index) {
            setIsActive(-1);
            setIsModalVisible(false)
        } else {
            setIsActive(index);
            setIsModalVisible(true)
        }
    }

    const sortQuantity = () => {
        const sortAsc = !sortDirectionAsc;
        setSortDirectionAsc(sortAsc);
        const sortedList = inputList.sort((a, b) => {
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
        setInputList(sortedList);
    }

    useEffect(() => {
        if (!distributorProfile || !Object.keys(distributorProfile).length) {
            getRegionDetails(distributorId);
        }
    }, [distributorProfile]);

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
            props.distributorUpdateCreateOrderFormField({ field: 'items', value: tableItems });
        }
    }, [tableItems]);
    const validateTolerance = (e, index, item) => {
        const { value } = e.target;
        //if material quantity is 0, then considering it as 1 and then checking the tolerance [since x% of 0 = 0]
        const reference_qty = Number(item.original_quantity) === 0 ? 1 : Number(item.original_quantity);
        const maxValue = Math.round((100 + Number(tolerance?.max)) / 100 * reference_qty);
        const minValue = Math.round((100 + Number(tolerance?.min)) / 100 * reference_qty);
        if (Number(value) > maxValue || Number(value) < minValue) {
            notification.error({
                message: 'Error',
                description: `${item.description}: Quantity out of threshold of ${minValue} - ${maxValue}CV`,
                duration: 5,
                className: 'notification-error',
            });
        }
    }

    useEffect(() => {
        /**To empty the  existing data in the table on change of order type*/
        if (!isAutoOrder) {
            setInputList([tableObject]);
            props.distributorUpdateCreateOrderFormField({ field: 'items', value: [] });
        }
    }, [isAutoOrder, isSelfLiftingOrder, isLiquidationOrder, isRushOrder]);

    useEffect(() => {
        setIsSaltOrder(isSaltOnlyOrder);
    }, [isSaltOnlyOrder]);

    function filterSaltProducts(materials) {
        if (isSaltOrder) {
            const filteredMaterials = materials?.map(material => {
                if (material.division !== 14)
                    material.isDisabled = true;
                return material;
            });
            return filteredMaterials ?? [];
        }
        return materials;
    }

    return (
        <div>
            {rushOrderErrorMessage 
            ?<div className="n-card-message">
                <span className='important-notification'
                    style={{marginLeft: '18px', fontSize: width > 767 ? '22px' : '18px'}}>
                    {rushOrderErrorMessage}
                </span>
            </div>
            :<div className="n-card-h">
                {width > 767 ?
                    <span hidden={!isSaltOrder} className='important-notification'>[IMPORTANT: Orders restricted to salt products only.]</span>
                    : <>
                     < Popover content={'IMPORTANT: Orders restricted to salt products only.'} title="Formula" trigger="click" className="th-info-icon">
                            <InfoCircleFilled />
                        </Popover>
                    </>}
                <button
                    type="submit"
                    className="addmore-button"
                    onFocus={handleAddClick} 
                >
                    <img src="/assets/images/add-order.svg" alt="Add New Item" />
                </button>
            </div>
            }
            
            {(rushOrderErrorMessage) 
              ? <></> 
              : width > 767 ? <>

                <div className="sales-order-table new-sales-order-table">

                    <Loader>

                        <div className='tablewrap'>
                            <table>
                                <thead style={{ textAlign: 'center' }}>
                                    <tr>
                                        <th>Material Description</th> {/*className="material-header" */}
                                        <th className="material-header-code">Material Code</th>
                                        {isLiquidationOrder && <th>Stock Quantity</th>}
                                        <th><Tooltip title="Stock In Hand" placement='bottom'>SIH</Tooltip></th>
                                        <th><Tooltip title="Stock In Transit" placement='bottom'>SIT</Tooltip> </th>
                                        <th><Tooltip title="Open Orders" placement='bottom'>OO</Tooltip></th>
                                        {isAutoOrder && <th>Suggested Qty</th>}
                                        {/* <th>Quantity in Tonnage
                                        <Popover content={content} placement="bottom" className="th-info-icon">
                                            <InfoCircleFilled />
                                        </Popover>
                                    </th> */}
                                        <th onClick={sortQuantity}>Quantity
                                            <img
                                                src="/assets/images/sorting_icon.svg"
                                                alt=""
                                            /></th>
                                        <th>Sales Unit</th>
                                        <th>Tentative Amount ( <span style={{color:"white",fontSize:"large"}}>&#8377;</span> )</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inputList.map((x, i) => {
                                        return (
                                            <React.Fragment key={`items-list-${i}`}>
                                                <tr className="material-table-row">
                                                    <td className="material-box2">
                                                        <div className="material-table-data" style={{ height: '55px' }}>
                                                            {
                                                                bomExplodeFeatureFlag && <div className="material-arrow" onClick={() => showMaterialDropdown(i)}>
                                                                    {
                                                                        x.showHideArrow ? <div onClick={() => handleShowHidPromo(x.showPromo === true ? 'hide' : 'show', x.code)} >
                                                                            <img src={`${x.showPromo === true ? "/assets/images/ionic-icon-arrow-up.svg" : "/assets/images/ionic-icon-arrow.svg"}`} alt="" />
                                                                        </div> : <div className='bom-disabled'><img src="/assets/images/ionic-icon-arrow.svg" alt='' /></div>
                                                                    }
                                                                </div>
                                                            }
                                                            <div className="material-box-wrap2">
                                                                {x.isAutoOrderRecommended && <span className='width-default'>{x.description}</span>}

                                                                {!isLiquidationOrder && !isSelfLiftingOrder && !x.isAutoOrderRecommended &&
                                                                    <Select className="width-default"
                                                                        showSearch
                                                                        placeholder="Type Material Name.."
                                                                        value={x.selectedValue}
                                                                        onChange={(val) => {
                                                                            var value = x.materials.length && x.materials.find(obj => obj.code === val)
                                                                            handleSelectChange(value, i);
                                                                        }}
                                                                        autoFocus={!firstHit}
                                                                        onSearch={(val) => keywordsearch(val, i)}
                                                                        filterOption={false}
                                                                        showAction={["click"]}
                                                                        showArrow={false}
                                                                        notFoundContent={false}
                                                                        listHeight={150}
                                                                    >
                                                                        {
                                                                            filterSaltProducts(x.materials)?.map((item, index) => {
                                                                                return (
                                                                                    <Option className='drop-down'
                                                                                        value={item.code}
                                                                                        key={index}
                                                                                        disabled={item.isDisabled}
                                                                                    >
                                                                                        <p className='desc'>{`${item.description}`}</p>
                                                                                    </Option>
                                                                                )
                                                                            })
                                                                        }
                                                                    </Select>
                                                                }
                                                                {isLiquidationOrder && !isSelfLiftingOrder &&
                                                                    <Select
                                                                        className="width-liqudation"
                                                                        showSearch
                                                                        placeholder="Type Liquidation Material Name.."
                                                                        value={x.selectedValue}
                                                                        onChange={(val) => {
                                                                            var value = x.materials.length && x.materials.find(obj => obj.code === val)
                                                                            handleSelectChange(value, i);
                                                                        }}
                                                                        autoFocus={!firstHit}
                                                                        onSearch={(val) => keywordsearch(val, i)}
                                                                        filterOption={false}
                                                                        showAction={["click"]}
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
                                                                                        disabled={item.isDisabled}
                                                                                    >
                                                                                        <p className='desc'>{`${item.description.toUpperCase()}`}</p>
                                                                                    </Option>
                                                                                )
                                                                            })
                                                                        }
                                                                    </Select>
                                                                }
                                                                {isSelfLiftingOrder && !isLiquidationOrder &&
                                                                    <Select
                                                                        className="width-liqudation"
                                                                        showSearch
                                                                        placeholder="Type Selflifting Material Name.."
                                                                        value={x.selectedValue}
                                                                        onChange={(val) => {
                                                                            var value = x.materials.length && x.materials.find(obj => obj.code === val)
                                                                            handleSelectChange(value, i);
                                                                        }}
                                                                        autoFocus={!firstHit}
                                                                        onSearch={(val) => keywordsearch(val, i)}
                                                                        filterOption={false}
                                                                        showAction={["click"]}
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
                                                                                        disabled={item.isDisabled}
                                                                                    >
                                                                                        <p className='desc'>{`${item.description.toUpperCase()}`}</p>
                                                                                    </Option>
                                                                                )
                                                                            })
                                                                        }
                                                                    </Select>
                                                                }
                                                            </div>
                                                            {
                                                                (x.showPromo && bomExplodeFeatureFlag) &&
                                                                <div className="material-dropdown-wrapper">

                                                                    {
                                                                        materialPromoData.length > 0 && materialPromoData.map((promoData, index) => {
                                                                            return (promoData.code === x.code &&

                                                                                < MaterialDropdownList
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
                                                                                />)
                                                                        }

                                                                        )}
                                                                </div>

                                                            }


                                                        </div>
                                                    </td>
                                                    <td className={"center-align padded"}>{x.code !== "" ? x.code : '-'}</td>
                                                    {isLiquidationOrder && <td className={"center-align padded"}>{x.StockQuantity ? x.StockQuantity : "-"}</td>}
                                                    <td className={"center-align padded"}>{(x.stock_in_hand != null && x.stock_in_hand != undefined && x.stock_in_hand !== "") ? Math.ceil(Number(x.stock_in_hand)) : '-'}</td>
                                                    <td className={"center-align padded"}>{(x.stock_in_transit != null && x.stock_in_transit != undefined && x.stock_in_transit !== "") ? Math.ceil(Number(x.stock_in_transit)) : '-'}</td>
                                                    <td className={"center-align padded"}>{(x.open_order != null && x.open_order != undefined && x.open_order !== "") ? Math.ceil(Number(x.open_order)) : '-'}</td>
                                                    {isAutoOrder && <td className={"center-align padded"}>{x.original_quantity}</td>}
                                                    <td className="quantity-box">
                                                        <div className="quantity-box-wrap">
                                                            <input
                                                                name="quantity"
                                                                type="number"
                                                                placeholder=""
                                                                value={x.quantity}
                                                                onWheel={e => e.currentTarget.blur()}
                                                                onBlur={e => validateTolerance(e, i, x)}
                                                                onChange={e => handleInputChange(e, i, x.code)}
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
                                                    <td colSpan="10" className='error-message'> {x.error != "" &&
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
                <div className="add-order-wrap mob-add-order">
                    <span>
                        <button
                            type="submit" id="addMoreItem"
                            className="addmore-button"
                            onClick={handleAddClick}
                        // onFocus={handleAddClick}
                        >
                            <img src="/assets/images/add-order.svg" alt="Add New Item" />
                        </button>
                    </span>
                </div> </> :
                <div className='mobile-card-block'>
                    {inputList.map((x, i) => {
                        return (
                            <div className='mobile-card-item' key={`items-list-${i}`}>
                                <div className='mobile-card-row'>
                                    <div className='mobile-card-col-full'>
                                        <div className='mobile-material-control'>
                                            <h3>Material Description
                                                <div className="material-promo-btn">
                                                    {
                                                        (bomExplodeFeatureFlag && x.showHideArrow) && <div onClick={() => handleShowHidPromo('show', x.code)} >
                                                            <span>View Promo</span>
                                                        </div>
                                                    }
                                                </div>
                                            </h3>
                                            <Select
                                                showSearch
                                                placeholder="Type material name.."
                                                value={x.selectedValue}
                                                onChange={(val) => {
                                                    var value = x.materials.length && x.materials.find(obj => obj.code === val)
                                                    handleSelectChange(value, i);
                                                }}
                                                autoFocus={!firstHit}
                                                onSearch={(val) => keywordsearch(val, i)}
                                                filterOption={false}
                                                showAction={["focus", "click"]}
                                                showArrow={false}
                                                notFoundContent={false}
                                                listHeight={150}
                                            >
                                                {
                                                    filterSaltProducts(x.materials)?.map((item, index) => {
                                                        return (
                                                            <Option
                                                                value={item.code}
                                                                key={index}
                                                                disabled={item.isDisabled}
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
                                    <div className='mobile-card-col-half' hidden={!isLiquidationOrder}>
                                        <div className='mobile-material-control'>
                                            <h3>Stock Quantity</h3>
                                            <p>{x.StockQuantity ? x.StockQuantity : "-"}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className='mobile-card-row'>
                                    <div className='mobile-card-col-half'>
                                        <div className='mobile-material-control'>
                                            <h3>Suggested Qty</h3>
                                            <p>{x.original_quantity ? x.original_quantity : "-"}</p>
                                        </div>
                                    </div>
                                    <div className='mobile-card-col-half'>
                                        <div className='mobile-material-control'>
                                            <h3>Quantity</h3>
                                            <input
                                                name="quantity"
                                                type="number"
                                                placeholder=""
                                                value={x.quantity}
                                                onWheel={e => e.currentTarget.blur()}
                                                onBlur={e => validateTolerance(e, i, x)}
                                                onChange={e => handleInputChange(e, i, x.code)}
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
                                </div>
                                {
                                    (bomExplodeFeatureFlag && x.showPromo) &&
                                    <div className="bom-material-promo">

                                        {
                                            materialPromoData.length > 0 && materialPromoData.map((promoData, index) => {
                                                return (promoData.code === x.code &&

                                                    < MaterialDropdownList
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
                                                    />)
                                            }

                                            )}
                                    </div>

                                }
                            </div>
                        )
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
        app_level_configuration: state.auth.get('app_level_configuration'),
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
        fetchAppLevelConfiguration: () => dispatch(AuthAction.fetchAppLevelSettings()),
        getStockData: (data) => dispatch(AdminAction.getStockData(data)),
    }
}

const ConnectCreateOrderMaterialTable = connect(
    mapStateToProps,
    mapDispatchToProps
)(CreateOrderMaterialTable)

export default ConnectCreateOrderMaterialTable;
