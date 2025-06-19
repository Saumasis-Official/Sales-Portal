//-----------------------------------------------------=====Props and Constants====--------------------------------------------
//-----------------------------------------------------=====useState====-------------------------------------------------------
//-----------------------------------------------------=====useRef====---------------------------------------------------------
//-----------------------------------------------------=====useEffect====------------------------------------------------------
//-----------------------------------------------------=====Event Handlers=====------------------------------------------------
//-----------------------------------------------------=====API Calls=====-----------------------------------------------------
// ----------------------------------------------------=====Helpers=====-------------------------------------------------------
// ----------------------------------------------------=====Renders=====-------------------------------------------------------

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { connect } from 'react-redux';
import { Button, Steps, message, Select, Spin, Radio, Space, Col, Row, Alert, Upload, Input, Checkbox, notification, Modal } from 'antd';
import { InfoCircleOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons';
import Util from '../../../../util/helper';
import * as AdminActions from "../../actions/adminAction";
import CascadeCheckbox from '../../../../components/CascadeCheckbox/CascadeCheckbox';
import { customerGroupList, NO_DATA_SYMBOL } from '../../../../constants/index';
import _, { debounce } from "lodash";
import '../../../../style/admin/Dashboard.css';
import './ToleranceExemption.css';
import '../../Forecast/StockNormAudit.css';
import { hasEditPermission,pages } from '../../../../persona/distributorHeader';
import Paginator from '../../../../components/Panigantion';
import HeaderSearchBox from '../../../../components/HeaderSearchBox/HeaderSearchBox';
import Loader from '../../../../components/Loader';

const { Step } = Steps

const informationMessageSalesDetails = [
    'Please upload a valid .xlsx or .csv file.',
    'The column "distributor_code" is required.',
    'If uploading an .xlsx file, it should contain sheet named either "Sales Details" or "Sheet1".'
];

const informationMessageProductDetails = [
    'Please upload a valid .xlsx or .csv file.',
    'The column "material_code" is required.',
    'If uploading an .xlsx file, it should contain sheet named either "Product Details" or "Sheet1".'
];

const DBPskuTolerance = (props) => {
    //-----------------------------------------------------=====Props and Constants====-------------------------------------------------------
    const {
        dashboardFilterCategories,
        getDistributorList,
        fetchProductHierarchyFilter,
        upsertDbPskuTolerance,
        fetchDistributorPskuTolerance,
        getSKUCodes,
        getMissingDBPskuCombination,
        fetchOriginalDistributorPskuTolerance,
        deleteDistributorPskuTolerance,
        isLoading,
        stockNormDbFilter,
    } = props;

    //-----------------------------------------------------=====useState====-------------------------------------------------------

    // states related to SalesDetailsSelection component
    const [salesSelectionType, setSalesSelectionType] = useState("tse");
    const [selectedTseCodes, setSelectedTseCodes] = useState([]);
    const [selectedDistributorCodes, setSelectedDistributorCodes] = useState([]);
    const [uploadedDistributorCodes, setUploadedDistributorCodes] = useState([]);
    const [zoneAreaOptions, setZoneAreaOptions] = useState([]);
    const [cascadeCheckboxValue, setCascadeCheckboxValue] = useState([]);
    const [customerGroups, setCustomerGroups] = useState([]);
    const [uploadedDistributorCodeFileList, setUploadedDistributorCodeFileList] = useState([]);
    const [mismatchedDB, setMismatchedDB] = useState([]);


    // states related to ProductDetailsSelection component
    const [productSelectionType, setProductSelectionType] = useState("product-hierarchy");
    const [selectedProductHierarchy, setSelectedProductHierarchy] = useState([]);
    const [uploadedMaterialCodes, setUploadedMaterialCodes] = useState([]);
    const [uploadedProductFileList, setUploadedProductFileList] = useState([]);
    const [materialCodesOptions, setMaterialCodesOptions] = useState([]);
    const [selectedMaterialCodes, setSelectedMaterialCodes] = useState([]);
    const [mismatchedMaterials, setMismatchedMaterials] = useState([]);

    // states related to ToleranceValuesSelection component
    const [maxTolerance, setMaxTolerance] = useState();
    const [minTolerance, setMinTolerance] = useState();

    // sates related to DBPskuTolerance component
    const [current, setCurrent] = useState(0);
    const [enableEdit, setEnableEdit] = useState(false);
    const [toleranceTableData, setToleranceTableData] = useState([]);
    const [selectedDistributor, setSelectedDistributor] = useState([]);
    const [enableDelete, setEnableDelete] = useState(false);
    const [originalTolerance, setOriginalTolerance] = useState([]);
    const [originalToleranceTotalRows, setOriginalToleranceTotalRows] = useState(0);

    //-----------------------------------------------------=====useRef====---------------------------------------------------------
    //-----------------------------------------------------=====useEffect====------------------------------------------------------
    useEffect(() => {
        getFilterCategories();
        fetchSkuCodes();
    }, []);

    useEffect(() => {
        if (selectedDistributor.length > 0) {
            fetchDistributorTolerance();
        } else {
            setToleranceTableData([]);
        }
    }, [selectedDistributor]);
    //-----------------------------------------------------=====Event Handlers=====-----------------------------------------------------

    const next = () => {
        setCurrent(current + 1);
    };
    const prev = () => {
        setCurrent(current - 1);
    };

    const handleEditClick = () => {
        if (enableEdit) { 
            refreshEditStates();
        }
        setEnableEdit(!enableEdit);
    }

    const handleDeleteClick = () => {
        setEnableDelete(!enableDelete)
    }

    const saveToleranceHandler = () => {
        try {
            const payload = {};
            if (salesSelectionType === "tse") {
                payload.tse_codes = selectedTseCodes;
                if (customerGroups.length > 0) {
                    payload.customer_groups = customerGroups;
                }
            } else if (salesSelectionType === "distributor") {
                payload.distributor_codes = selectedDistributorCodes.map(d => d.value);
            } else if (salesSelectionType === "distributor-excel") {
                payload.distributor_codes = uploadedDistributorCodes?.map(d => d?.toString());
                if (mismatchedDB.length > 0) {
                    Util.notificationSender("Error", "Some distributor codes are not found in the system.", false);
                    return;
                }
            }
            if (productSelectionType === "product-hierarchy") {
                payload.product_hierarchy = selectedProductHierarchy.map(p => p.value);
            } else if (productSelectionType === "psku") {
                payload.psku = selectedMaterialCodes;
            } else if (productSelectionType === "product-excel") {
                payload.psku = uploadedMaterialCodes?.map(d => d?.toString());
                if (mismatchedMaterials.length > 0) { 
                    Util.notificationSender("Error", "Some material codes are not found in the system.", false);
                    return;
                }
            }
            payload.max = maxTolerance;
            payload.min = minTolerance;
            const isValid = payloadValidation(payload);
            if (!isValid.valid) {
                Util.notificationSender("Error", isValid.message, false);
                return;
            }
            upsertDbPskuTolerance(payload)
                .then(res => {
                    if (!res?.success) {
                        Util.notificationSender("Error", "Failed to save tolerance", false)
                    } else {
                        Util.notificationSender("Success", "Tolerance saved successfully", true)
                        handleEditClick();
                    }
                })
                .catch(err => {
                    Util.notificationSender("Technical Error", "Failed to save tolerance", false)
                });
        } catch (error) {
            Util.notificationSender("Error", "Failed to process tolerance", false)
        }
    }

    //-----------------------------------------------------=====API Calls=====-----------------------------------------------------

    async function getFilterCategories() {
        try {
            const res = await dashboardFilterCategories(true);
            const filterResponse = res.response.area_details;
            mapZoneArea(filterResponse);
        } catch (err) {
            Util.notificationSender("Error", "Failed to fetch Region x Area x TSE mapping", false)
        }
    };

    async function fetchSkuCodes() {
        try {
            const res = await getSKUCodes();
            const skuCodes = res?.map(d => ({
                label: `${d.code} - ${d.description}`,
                value: d.code
            }));
            setMaterialCodesOptions(skuCodes);
        } catch (error) {
            console.log(error)
            Util.notificationSender("Error", "Failed to fetch SKU codes", false);
        }
    }

    async function fetchDistributorList(username) {
        return getDistributorList({ offset: 0, limit: 10, search: username })
            .then(res => res.map(r => ({ label: `${r.id} - ${r.name}`, value: r.id })));
    };

    async function fetchDistributorTolerance() {
        const selectedDistId = selectedDistributor.map(d => d.value);
        const payload = {
            distributor_code: selectedDistId[0],
            audit_details: true
        }
        fetchDistributorPskuTolerance(payload)
            .then(res => {
                console.log(res)
                if (res?.success) {
                    if (!res?.data?.length) {
                        Util.notificationSender("Info", "No data found for the distributor", true);
                    }
                    setToleranceTableData(res?.data);
                } else {
                    Util.notificationSender("Error", res?.message, false)
                }
            }).catch(err => {
                Util.notificationSender("Error", "Failed to fetch distributor tolerance", false);
            })
    };

    async function findDBPskuMismatch(data) {
        return getMissingDBPskuCombination(data)
            .then(res => {
                if (res?.success) {
                    if (res?.data) {
                        console.log(res);
                        // Util.notificationSender("Info", "Some distributor codes are not found in the database", true);
                        return res?.data;
                    }
                } else {
                    Util.notificationSender("Error", "Failed to validate record mismatch", false)
                    return false;
                }
            }).catch(err => {
                Util.notificationSender("Error", "Failed to find distributor codes", false);
                return false;
            })
    };

    const fetchOriginalTolerance = (data) => {
        return fetchOriginalDistributorPskuTolerance(data).then(res => {
            if (res?.data) {
                setOriginalTolerance(res.data);
                setOriginalToleranceTotalRows(res.data[0]?.total_count ??0)
            }
            else {
                setOriginalTolerance([]);
                setOriginalToleranceTotalRows(0)
                notification.error({
                    message: 'Failed to get tolerance',
                    duration: 5,
                    className: 'notification-error'
                })  
            } 
        }).catch(err => {
            setOriginalTolerance([]);
            setOriginalToleranceTotalRows(0)
            notification.error({
                description: 'Failed to get tolerance',
                duration: 5,
                className: 'notification-error'
            })
        })
    }

    // ----------------------------------------------------=====Helpers=====-------------------------------------------------------

    function mapZoneArea(data) {
        const zoneAreaMap = {};
        const tseAreaMap = {}
        const options = [];
        data?.forEach(item => {
            if (zoneAreaMap[item.region]) {
                zoneAreaMap[item.region].add(item.area_code);
            } else {
                zoneAreaMap[item.region] = new Set([item.area_code]);
            }
            if (!tseAreaMap[item.area_code]) {
                tseAreaMap[item.area_code] = new Set();
            }
            tseAreaMap[item.area_code].add(item.tse_code)
        });
        Object.keys(zoneAreaMap)?.sort().forEach(zone => {
            const zoneOptions = {
                label: zone,
                value: zone,
                children: Array.from(zoneAreaMap[zone])?.sort().map(area => ({
                    label: area,
                    value: area,
                }))
            }
            zoneOptions.children.forEach(area => {
                area.children = Array.from(tseAreaMap[area.value])?.sort().map(tse => ({ label: tse, value: tse }));
            })
            options.push(zoneOptions);

        });
        setZoneAreaOptions(options);
    };

    const refreshEditStates = () => {
        setCurrent(0);
        setSalesSelectionType("tse");
        setSelectedTseCodes([]);
        setSelectedDistributorCodes([]);
        setUploadedDistributorCodes([]);
        setCascadeCheckboxValue([]);
        setCustomerGroups([]);
        setUploadedDistributorCodeFileList([]);
        setProductSelectionType("product-hierarchy");
        setSelectedProductHierarchy([]);
        setUploadedMaterialCodes([]);
        setUploadedProductFileList([]);
        setMaxTolerance();
        setMinTolerance();
    };

    const payloadValidation = (data) => {
        const response = {
            valid: true,
            message: ""
        }
        if (!data.customer_groups?.length
            && !data.tse_codes?.length
            && !data.distributor_codes?.length
        ) {
            response.valid = false;
            response.message = "Sales details are missing";
        } else if (
            !data.product_hierarchy?.length
            && !data.psku?.length
        ) {
            response.valid = false;
            response.message = "Product details are missing";
        } else if (
            !data.max
            && !data.min
        ) {
            response.valid = false;
            response.message = "Tolerance values are missing";
        }
        return response;
    }

    // ----------------------------------------------------=====Renders=====-------------------------------------------------------

    const steps = [
        {
            title: 'Sales Details',
            content: <SalesDetailsSelection
                zoneAreaOptions={zoneAreaOptions}
                salesSelectionType={salesSelectionType}
                setSalesSelectionType={setSalesSelectionType}
                selectedTseCodes={selectedTseCodes}
                setSelectedTseCodes={setSelectedTseCodes}
                selectedDistributorCodes={selectedDistributorCodes}
                setSelectedDistributorCodes={setSelectedDistributorCodes}
                uploadedDistributorCodes={uploadedDistributorCodes}
                setUploadedDistributorCodes={setUploadedDistributorCodes}
                fetchDistributorList={fetchDistributorList}
                cascadeCheckboxValue={cascadeCheckboxValue}
                setCascadeCheckboxValue={setCascadeCheckboxValue}
                customerGroups={customerGroups}
                setCustomerGroups={setCustomerGroups}
                uploadedDistributorCodeFileList={uploadedDistributorCodeFileList}
                setUploadedDistributorCodeFileList={setUploadedDistributorCodeFileList}
                findDBPskuMismatch={findDBPskuMismatch}
                mismatchedDB={mismatchedDB}
                setMismatchedDB={setMismatchedDB}
            />,
        },
        {
            title: 'Product Details',
            content: <ProductDetailsSelection
                productSelectionType={productSelectionType}
                setProductSelectionType={setProductSelectionType}
                selectedProductHierarchy={selectedProductHierarchy}
                setSelectedProductHierarchy={setSelectedProductHierarchy}
                uploadedMaterialCodes={uploadedMaterialCodes}
                setUploadedMaterialCodes={setUploadedMaterialCodes}
                uploadedProductFileList={uploadedProductFileList}
                setUploadedProductFileList={setUploadedProductFileList}
                materialCodesOptions={materialCodesOptions}
                setMaterialCodesOptions={setMaterialCodesOptions}
                selectedMaterialCodes={selectedMaterialCodes}
                setSelectedMaterialCodes={setSelectedMaterialCodes}
                findDBPskuMismatch={findDBPskuMismatch}
                mismatchedMaterials={mismatchedMaterials}
                setMismatchedMaterials={setMismatchedMaterials}
            />,
        },
        {
            title: 'Tolerance Values',
            content: <ToleranceValuesSelection
                maxTolerance={maxTolerance}
                setMaxTolerance={setMaxTolerance}
                minTolerance={minTolerance}
                setMinTolerance={setMinTolerance}
            />,
        },
    ];

    return (
        <div style={{ padding: "20px" }}>
            <div className='comment-btn'>
                {!enableDelete && <Button
                    type='primary'
                    className='btn-upload'
                    onClick={handleEditClick}
                >
                    {enableEdit ? "Cancel" : "Edit"}
                </Button>}
                {(!enableEdit&&!enableDelete) && <Button
                    type='primary'
                    className='btn-upload'
                    onClick={handleDeleteClick}
                >
                    Delete
                </Button>}
            </div>
            {!(enableEdit || enableDelete) &&
                <>
                    <DebounceSelect
                        mode="multiple"
                        className='width600px'
                        value={selectedDistributor}
                        placeholder="Search distributors"
                        fetchOptions={fetchDistributorList}
                        onChange={(newValue) => {
                            setSelectedDistributor(newValue.length > 0 ? [newValue[newValue.length - 1]] : []);
                        }}
                    />
                    {toleranceTableData.length > 0 &&
                        <div className="admin-dashboard-table tolerance-exemption sn-table-container ">
                            <table >
                                <thead>
                                    <tr>
                                        <th>Material Code</th>
                                        <th>Material Description</th>
                                        <th>Max(%)</th>
                                        <th>Min(%)</th>
                                        <th>Last Updated By</th>
                                        <th>Last Updated On</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {toleranceTableData.map((item, index) => (
                                        <tr key={index}>
                                            <td>{item.material_code}</td>
                                            <td>{item.description}</td>
                                            <td>{item.max}</td>
                                            <td>{item.min}</td>
                                            <td>{(item.first_name && item.last_name && item.last_updated_by) ? `${item.first_name} ${item.last_name} (${item.last_updated_by})` : item.last_updated_by}</td>
                                            <td>{`${Util.formatDate(item.last_updated_on)} ${Util.formatTime(item.last_updated_on)}`}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    }
                </>
            }
            {enableEdit &&
                <>
                    <Steps
                        current={current}
                        className='mt20'>
                        {steps.map(item => (<Step title={item.title} key={item.title} />))}
                    </Steps>
                    <div className="tolerance-steps-content">{steps[current].content}</div>
                    <div className="tolerance-steps-action">
                        {current > 0 && (
                            <Button
                                style={{
                                    margin: '0 8px',
                                }}
                                onClick={prev}
                            >
                                Previous
                            </Button>
                        )}
                        {current < steps.length - 1 && (
                            <Button type="primary" onClick={next}>
                                Next
                            </Button>
                        )}
                        {current === steps.length - 1 && (
                            <Button type="primary" disabled={!hasEditPermission(pages.APP_SETTINGS,'EDIT')} onClick={saveToleranceHandler}>
                                Save
                            </Button>
                        )}
                    </div>
                </>
            }
            {enableDelete && <>
                <DeleteTolerance fetchOriginalTolerance={fetchOriginalTolerance} originalTolerance={originalTolerance} totalRowCount={originalToleranceTotalRows} handleCancel={handleDeleteClick} zoneAreaOptions={zoneAreaOptions} />
            </>

            }
        </div>
    );
};

function DebounceSelect({ fetchOptions, debounceTimeout = 800, ...props }) {
    const [fetching, setFetching] = useState(false);
    const [options, setOptions] = useState([]);
    const fetchRef = useRef(0);
    const debounceFetcher = useMemo(() => {
        const loadOptions = (value) => {
            fetchRef.current += 1;
            const fetchId = fetchRef.current;
            setOptions([]);
            setFetching(true);
            fetchOptions(value).then((newOptions) => {
                if (fetchId !== fetchRef.current) {
                    // for fetch callback order
                    return;
                }
                setOptions(newOptions);
                setFetching(false);
            });
        };
        return _.debounce(loadOptions, debounceTimeout);
    }, [fetchOptions, debounceTimeout]);
    return (
        <Select
            labelInValue
            filterOption={false}
            onSearch={debounceFetcher}
            notFoundContent={fetching ? <Spin size="small" /> : null}
            {...props}
            options={options}
            allowClear
        />
    );
}

function SalesDetailsSelection(props) {
    //-----------------------------------------------------=====Props and Constants====-------------------------------------------------------
    const {
        salesSelectionType,
        setSalesSelectionType,
        selectedTseCodes,
        setSelectedTseCodes,
        selectedDistributorCodes,
        setSelectedDistributorCodes,
        uploadedDistributorCodes,
        setUploadedDistributorCodes,
        zoneAreaOptions,
        fetchDistributorList,
        cascadeCheckboxValue,
        setCascadeCheckboxValue,
        customerGroups,
        setCustomerGroups,
        uploadedDistributorCodeFileList,
        setUploadedDistributorCodeFileList,
        findDBPskuMismatch,
        mismatchedDB,
        setMismatchedDB
    } = props;
    //-----------------------------------------------------=====useState====-------------------------------------------------------
    //-----------------------------------------------------=====useRef====---------------------------------------------------------
    //-----------------------------------------------------=====useEffect====------------------------------------------------------
    //-----------------------------------------------------=====Event Handlers=====-----------------------------------------------------
    function onChangeZoneAreaHandler(e) {
        setSelectedTseCodes(e);
    }
    function salesSelectionTypeHandler(e) {
        const { value } = e.target;
        setSalesSelectionType(value);
    }
    async function distributorCodeUploadHandler(file) {
        try {
            const convertedData = await Util.convertExcelToJson(file);
            let uploadedDB = [];
            if (convertedData && convertedData['Sales Details']?.length) {
                if (!convertedData['Sales Details'][0].distributor_code) { 
                    Util.notificationSender("Error", 'Failed to upload distributor codes. File must contain "distributor_code" column', false);
                    // setUploadedDistributorCodes([]);
                } else {
                    uploadedDB = [...new Set(convertedData['Sales Details'].map(d => d.distributor_code) ?? [])]
                }
            } else if (convertedData && convertedData['Sheet1']?.length) {
                if (!convertedData.Sheet1[0].distributor_code) {
                    Util.notificationSender("Error", 'Failed to upload distributor codes. File must contain "distributor_code" column', false);
                    // setUploadedDistributorCodes([]);
                } else {
                    uploadedDB = [...new Set(convertedData.Sheet1.map(d => d.distributor_code) ?? [])]
                }
            } else {
                Util.notificationSender("Error", 'Failed to upload distributor codes. File must contain "Sales Details" sheet and have values.', false);
                // setUploadedDistributorCodes([]);
            }
            setUploadedDistributorCodes(uploadedDB);
            if (uploadedDB?.length) {
                const data = uploadedDB.map(d => ({ distributor_code: d }));
                const validateDB = await findDBPskuMismatch(data);
                console.log(validateDB)
                if (validateDB?.missing_distributors?.length && validateDB?.missing_distributors[0] !== null) {
                    setMismatchedDB(validateDB.missing_distributors);
                } else {
                    setMismatchedDB([]);
                }
            } else {
                setMismatchedDB([]);
            }
        } catch (error) {
            Util.notificationSender("Error", `Failed to upload distributor codes,${error}`, false);
            setUploadedDistributorCodes([]);
        }
    };

    function distributorCodeUploadChangeHandler({ fileList }) {
        const latestFile = fileList[fileList.length - 1];
        if (latestFile)
            latestFile.status = 'done';
        // setUploadedDistributorCodeFileList(fileList?.map(f => ({ ...f, status: 'done' })));
        setUploadedDistributorCodeFileList([latestFile]);
    }
    //-----------------------------------------------------=====API Calls=====-----------------------------------------------------
    // ----------------------------------------------------=====Helpers=====-------------------------------------------------------
    // ----------------------------------------------------=====Renders=====-------------------------------------------------------
    return (
        <article>
            <Radio.Group
                onChange={salesSelectionTypeHandler}
                value={salesSelectionType}
            >
                <Space direction="vertical" >
                    <Radio value="tse">Select by Region /Area / TSE and Customer Group</Radio>
                    <Radio value="distributor">Select by Distributor Codes</Radio>
                    <Radio value="distributor-excel">Upload Distributor codes in Excel</Radio>
                </Space>
            </Radio.Group>
            <div>
                {salesSelectionType === "tse" &&
                    <>
                        <CascadeCheckbox
                            options={zoneAreaOptions}
                            multiple={true}
                            onChange={onChangeZoneAreaHandler}
                            originalComponentOutput={setCascadeCheckboxValue}
                            value={cascadeCheckboxValue}
                            width={'100%'}
                            outputType="LEAF_NODES"
                            placeholder='Select Regions / Areas / TSE'
                        />
                        <Select
                            mode='multiple'
                            className='width100'
                            placeholder='Select Customer Groups (Default all customer groups selected)'
                            defaultValue={customerGroups}
                            optionFilterProp="children"
                            onChange={setCustomerGroups}
                            options={customerGroupList}
                            allowClear
                        />
                    </>
                }
                {salesSelectionType === "distributor" &&
                    <DebounceSelect
                        mode="multiple"
                        className='width100'
                        value={selectedDistributorCodes}
                        placeholder="Search distributors"
                        fetchOptions={fetchDistributorList}
                        onChange={(newValue) => {
                            setSelectedDistributorCodes(newValue);
                        }}
                    />
                }
                {salesSelectionType === "distributor-excel" &&
                    <>
                        <Upload
                            accept=".xlsx,.csv"
                            fileList={uploadedDistributorCodeFileList}
                            beforeUpload={distributorCodeUploadHandler}
                            onChange={distributorCodeUploadChangeHandler}
                        >
                            <Button icon={<UploadOutlined />}>Click to Upload</Button>
                        </Upload>
                        <Alert
                            message={
                                <span style={{ paddingLeft: "30px" }}>
                                    <b>Informational Notes</b>
                                </span>}
                            description={
                                <ul style={{ paddingLeft: "20px" }}>
                                    {informationMessageSalesDetails.map((item, index) => <li key={index}><b className='mandatory-mark'>*</b> {item}</li>)}
                                </ul>
                            }
                        type="info"
                        showIcon
                    />
                    {
                        mismatchedDB.length > 0 &&
                        <Alert
                            message={
                                <span style={{ paddingLeft: "30px" }}>
                                    <b>Upload Error</b>
                                </span>}
                            description={
                                <ul style={{ paddingLeft: "20px" }}>
                                    <li>Following distributor codes not found:</li>
                                    {mismatchedDB.map((item, index) => <li key={index}><b className='mandatory-mark'>*</b> {item}</li>)}
                                </ul>
                            }
                            type="error"
                            showIcon
                        />
                    }
                    </>

                }
            </div>
        </article>
    );
};

function ProductDetailsStep(props) {
    //-----------------------------------------------------=====Props and Constants====-------------------------------------------------------
    const {
        productSelectionType,
        setProductSelectionType,
        selectedProductHierarchy,
        setSelectedProductHierarchy,
        fetchProductHierarchyFilter,
        uploadedMaterialCodes,
        setUploadedMaterialCodes,
        uploadedProductFileList,
        setUploadedProductFileList,
        selectedMaterialCodes,
        setSelectedMaterialCodes,
        materialCodesOptions,
        setMaterialCodesOptions,
        findDBPskuMismatch,
        mismatchedMaterials,
        setMismatchedMaterials
    } = props;
    //-----------------------------------------------------=====useState====-------------------------------------------------------
    //-----------------------------------------------------=====useRef====---------------------------------------------------------
    //-----------------------------------------------------=====useEffect====------------------------------------------------------
    //-----------------------------------------------------=====Event Handlers=====-----------------------------------------------------
    const productSelectionTypeHandler = (e) => {
        const { value } = e.target;
        setProductSelectionType(value);
    }

    const materialCodeUploadHandler = async (file) => {
        try {
            const convertedData = await Util.convertExcelToJson(file);
            let uploadedPsku = [];
            if (convertedData && convertedData['Product Details']?.length) {
                if (!convertedData['Product Details'][0].material_code) {
                    Util.notificationSender("Error", 'Failed to upload PSKU codes. File must contain "material_code" column', false);
                    // setUploadedMaterialCodes([]);
                    // return;
                } else {
                    uploadedPsku = [...new Set(convertedData['Product Details'].map(d => d.material_code) ?? [])]
                }
                // setUploadedMaterialCodes();
            } else if (convertedData && convertedData['Sheet1']?.length) {
                if (!convertedData.Sheet1[0].material_code) {
                    Util.notificationSender("Error", 'Failed to upload PSKU codes. File must contain "material_code" column', false);
                    // setUploadedMaterialCodes([]);
                    // return;
                } else {
                    uploadedPsku = [...new Set(convertedData.Sheet1.map(d => d.material_code) ?? [])];
                }
                // setUploadedMaterialCodes(uploadedPsku);
            } else {
                Util.notificationSender("Error", 'Failed to upload PSKU codes. File must contain "Product Details" sheet and have values.', false);
                // setUploadedMaterialCodes([]);
            }
            setUploadedMaterialCodes(uploadedPsku);
            if (uploadedPsku?.length) {
                const data = uploadedPsku.map(d => ({ material_code: d }));
                const validateDB = await findDBPskuMismatch(data);
                if (validateDB?.missing_materials?.length && validateDB?.missing_materials[0] !== null) {
                    setMismatchedMaterials(validateDB.missing_materials);
                } else {
                    setMismatchedMaterials([]);
                }
            }
        } catch (error) {
            console.error("Error in materialCodeUploadHandler", error);
            Util.notificationSender("Error", `Failed to upload PSKU codes`, false);
            setUploadedMaterialCodes([]);
        }
    };

    const materialCodeUploadChangeHandler = ({ fileList }) => {
        const latestFile = fileList[fileList.length - 1];
        if (latestFile)
            latestFile.status = 'done';
        // setUploadedProductFileList(fileList?.map(f => ({ ...f, status: 'done' })));
        setUploadedProductFileList([latestFile]);
    };

    //-----------------------------------------------------=====API Calls=====-----------------------------------------------------
    async function fetchProductHierarchyOptions(search) {
        const payload = {
            search
        };
        return fetchProductHierarchyFilter(payload)
            .then(res => {
                const temp = [];
                res?.data?.forEach(r => {
                    temp.push({
                        label: `${r.product_hierarchy_code} -${r.description}`,
                        value: r.product_hierarchy_code,
                    });
                    temp.push({
                        label: `${r.brand_variant} -${r.brand_variant_desc}`,
                        value: r.brand_variant
                    });
                    temp.push({
                        label: `${r.brand} -${r.brand_desc}`,
                        value: r.brand
                    });
                    temp.push({
                        label: `${r.global_brand} -${r.global_brand_desc}`,
                        value: r.global_brand
                    });
                    temp.push({
                        label: `${r.variant} -${r.variant_desc}`,
                        value: r.variant
                    });
                    temp.push({
                        label: `${r.product} -${r.product_desc}`,
                        value: r.product
                    });
                    temp.push({
                        label: `${r.category} -${r.category_desc}`,
                        value: r.category
                    });
                });
                // Remove duplicates and filter out empty values
                const uniqueOptions = _.uniqBy(temp, 'value').filter(f => f.value);

                // Calculate similarity score and sort options
                const sortedOptions = uniqueOptions.map(option => ({
                    ...option,
                    similarity: Util.calculateSimilarity(option.value, search)
                })).sort((a, b) => b.similarity - a.similarity);

                return sortedOptions;
            }).catch(err => {
                console.error(err)
                Util.notificationSender("Error", "Failed to fetch Product Hierarchy", false);
            });
    };
    // ----------------------------------------------------=====Renders=====-------------------------------------------------------
    return (
        <>
            <Radio.Group
                onChange={productSelectionTypeHandler}
                value={productSelectionType}
            >
                <Space direction='vertical'>
                    <Radio value="product-hierarchy">Select by Product-Hierarchy</Radio>
                    <Radio value="psku">Select by PSKU</Radio>
                    <Radio value="product-excel">Upload PSKU in Excel</Radio>
                </Space>
            </Radio.Group>
            <div>
                {productSelectionType === "product-hierarchy" &&
                    <DebounceSelect
                        mode="multiple"
                        className='width100'
                        value={selectedProductHierarchy}
                        placeholder="Search product hierarchy"
                        fetchOptions={fetchProductHierarchyOptions}
                        onChange={(newValue) => {
                            setSelectedProductHierarchy(newValue);
                        }}
                    />
                }
                {productSelectionType === 'psku' &&
                    <Select
                        mode='multiple'
                        className='width100'
                        placeholder='Select PSKU'
                        value={selectedMaterialCodes}
                        onChange={setSelectedMaterialCodes}
                        options={materialCodesOptions}
                        filterOption={(input, option) =>
                            option.label
                                .toLowerCase()
                                .includes(input.toLowerCase())
                        }
                        allowClear
                    />
                }
                {productSelectionType === "product-excel" &&
                    <>
                        <Upload
                            accept=".xlsx,.csv"
                            fileList={uploadedProductFileList}
                            beforeUpload={materialCodeUploadHandler}
                            onChange={materialCodeUploadChangeHandler}
                        >
                            <Button icon={<UploadOutlined />}>Click to Upload</Button>
                        </Upload>
                        <Alert
                            message={
                                <span style={{ paddingLeft: "30px" }}>
                                    <b>Informational Notes</b>
                                </span>}
                            description={
                                <ul style={{ paddingLeft: "20px" }}>
                                    {informationMessageProductDetails.map((item, index) => <li key={index}><b className='mandatory-mark'>*</b> {item}</li>)}
                                </ul>
                            }
                            type="info"
                        showIcon
                    />
                    {
                        mismatchedMaterials?.length > 0 &&
                        <Alert
                            message={
                                <span style={{ paddingLeft: "30px" }}>
                                    <b>Upload Error</b>
                                </span>}
                            description={
                                <ul style={{ paddingLeft: "20px" }}>
                                    <li>Following material codes not found:</li>
                                    {mismatchedMaterials.map((item, index) => <li key={index}><b className='mandatory-mark'>*</b> {item}</li>)}
                                </ul>
                            }
                            type="error"
                            showIcon
                        />
                    }
                    </>
                }
            </div>
        </>
    )
};

function ToleranceValuesSelection(props) {
    //-----------------------------------------------------=====Props and Constants====-------------------------------------------------------
    const {
        maxTolerance,
        setMaxTolerance,
        minTolerance,
        setMinTolerance
    } = props;
    //-----------------------------------------------------=====useState====-------------------------------------------------------
    //-----------------------------------------------------=====useRef====---------------------------------------------------------
    //-----------------------------------------------------=====useEffect====------------------------------------------------------
    //-----------------------------------------------------=====Event Handlers=====-----------------------------------------------------
    const maxToleranceHandler = (e) => {
        setMaxTolerance(e);
    };

    const minToleranceHandler = (e) => {
        setMinTolerance(e);
    };
    const validateInput = (type, value) => {
        const numericValue = value.replace(/[^0-9-]/g, '');

        if (type === 'max') {
            let maxValue = numericValue.replace(/[^0-9]/g, '');
            if (parseInt(maxValue, 10) > 9999) {
                maxValue = '9999';
            }
            return maxValue;
        } else if (type === 'min') {
            if (numericValue === '-') {
                return '-';
            } else if (numericValue === '--') {
                return '';
            } else if (
                numericValue.startsWith('-') &&
                numericValue.length > 1 &&
                !numericValue.startsWith('--')
            ) {
                let minValue = parseInt(numericValue, 10);
                if (minValue < -100) {
                    minValue = -100;
                }
                return minValue.toString();
            } else if (
                numericValue !== '' &&
                !numericValue.startsWith('-')
            ) {
                const temp = parseInt(numericValue, 10);
                return `${temp * -1}`;
            }
        }
        return numericValue;
    };
    //-----------------------------------------------------=====API Calls=====-----------------------------------------------------
    // ----------------------------------------------------=====Renders=====-------------------------------------------------------
    return (
        <>
            <Input
                value={maxTolerance}
                onChange={(e) => {
                    const validatedValue = validateInput(
                        'max',
                        e.target.value,
                    );
                    maxToleranceHandler(validatedValue);
                }}
                placeholder="Max Value"
                className="input-small"
            />
            <Input
                value={minTolerance}
                onChange={(e) => {
                    const validatedValue = validateInput(
                        'min',
                        e.target.value,
                    );
                    minToleranceHandler(validatedValue);
                }}
                placeholder="Min Value"
                className="input-small"
            />
        </>
    )
};

const DeleteDbPskuTolerance = (props) => {
    const { fetchOriginalTolerance, originalTolerance, totalRowCount, handleCancel, deleteDistributorPskuTolerance, isLoading, zoneAreaOptions, fetchProductHierarchyFilter, fetchOriginalDistributorPskuTolerance } = props;
    const [limit, setLimit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [selectedTolerance, setSelectedTolerance] = useState(new Set());
    const [pageNo, setPageNo] = useState(1);
    const [enableSearch, setEnableSearch] = useState({
        dbCode: false,
        cg: false,
        psku: false,
    })
    const [filter, setFilter] = useState({});
    const [selectedProductHierarchy, setSelectedProductHierarchy] = useState([]);
    const [toleranceDeleteAllChecked, setToleranceDeleteAllChecked] = useState(false);
    const [isRulesModalVisible, setIsRulesModalVisible] = useState(false)

    useEffect(() => {
        if(!toleranceDeleteAllChecked)
            setSelectedTolerance(new Set())
        fetchOriginalTolerance({ limit, offset, ...filter });
    }, [filter,limit, offset, pageNo])
    
    useEffect(() => {
        setToleranceDeleteAllChecked(false);
    }, [filter])
    
    useEffect(() => {
        setSelectedTolerance(new Set());
    },[toleranceDeleteAllChecked])

    const onChangePage = (page, itemsPerPage) => {
        const offset = (page - 1) * limit
        setOffset(offset);
        setPageNo(page);
    }

    function handleCheck(e, id){
        const checked = e.target.checked;
        if (checked) {
            setSelectedTolerance(new Set([...selectedTolerance, id]));
        }
        else {
            const tempSelectedTolerance = _.cloneDeep(selectedTolerance);
            tempSelectedTolerance.delete(id);
            setSelectedTolerance(tempSelectedTolerance);
        }
    }

    function closeSearch(propKey) {
        setEnableSearch({ ...enableSearch, [propKey]: false })
        const tempFilter = _.cloneDeep(filter);
        delete tempFilter[propKey];
        setFilter(tempFilter);
        setPageNo(1)
        setOffset(0)
    }

    function deleteHandler() {
        deleteDistributorPskuTolerance({ ids: [...selectedTolerance] }).then(res => {
            fetchOriginalTolerance({ limit, offset, ...filter })
            setToleranceDeleteAllChecked(false)
            setSelectedTolerance(new Set());
            notification.success({
                message: "Delete Successfully",
                duration:5
            })
        }).catch(err=> {
            notification.error({
                message: "Delete Unsuccessful",
                duration: 5,
                className:'error-notification'
            })
        })
    }

    function onFilterChange(e,propsKey) {
        const tempFilter = { ...filter, [propsKey]: e.target.value };
        setFilter(tempFilter);
        setPageNo(1)
        setOffset(0)
    }

    function onChangeZoneAreaHandler(data) {
        setPageNo(1)
        setOffset(0)
        setFilter({...filter,zoneArea:data})
    }

    async function fetchProductHierarchyOptions(search) {
        const payload = {
            search, 
            isPskuCode : true
        };
        return fetchProductHierarchyFilter(payload)
            .then(res => {
                const temp = [];
                res?.data?.forEach(r => {
                    temp.push({
                        label: `${r.product_hierarchy_code} -${r.description}`,
                        value: r.product_hierarchy_code,
                    });
                    temp.push({
                        label: `${r.brand_variant} -${r.brand_variant_desc}`,
                        value: r.brand_variant
                    });
                    temp.push({
                        label: `${r.brand} -${r.brand_desc}`,
                        value: r.brand
                    });
                    temp.push({
                        label: `${r.global_brand} -${r.global_brand_desc}`,
                        value: r.global_brand
                    });
                    temp.push({
                        label: `${r.variant} -${r.variant_desc}`,
                        value: r.variant
                    });
                    temp.push({
                        label: `${r.product} -${r.product_desc}`,
                        value: r.product
                    });
                    temp.push({
                        label: `${r.category} -${r.category_desc}`,
                        value: r.category
                    });
                    temp.push({
                        label:`${r.code} -${r.description}`,
                        value:r.code
                    })
                });
                // Remove duplicates and filter out empty values
                const uniqueOptions = _.uniqBy(temp, 'value').filter(f => f.value);

                // Calculate similarity score and sort options
                const sortedOptions = uniqueOptions.map(option => ({
                    ...option,
                    similarity: Util.calculateSimilarity(option.value, search)
                })).sort((a, b) => b.similarity - a.similarity);

                return sortedOptions;
            }).catch(err => {
                console.error(err)
                Util.notificationSender("Error", "Failed to fetch Product Hierarchy", false);
            });
    };

    async function handleToleranceDeleteAllCheck(event) {
        const checked = event.target.checked;
        setToleranceDeleteAllChecked(checked);
        if (checked) {
            const res = await fetchOriginalDistributorPskuTolerance({ limit: totalRowCount, offset: 0, ...filter })
            const ids = res?.data.map(item => item.id);
            setSelectedTolerance(new Set(ids ??[]));
        }
        else {
            setSelectedTolerance(new Set());
        }
    }
    
    const debouncedOnFilterChange = debounce(onFilterChange, 800);

    return (
        <>
            <Row gutter={16}>
                <Col span={10}>
                    <CascadeCheckbox
                        options={zoneAreaOptions}
                        multiple={true}
                        onChange={onChangeZoneAreaHandler}
                        width={'100%'}
                        outputType={"LEAF_NODES"}
                        placeholder='Select Zones, Areas or TSE' />
                </Col>
                <Col span={10}>
                    <DebounceSelect
                        mode="multiple"
                        className='width100'
                        value={selectedProductHierarchy}
                        placeholder="Search product hierarchy"
                        fetchOptions={fetchProductHierarchyOptions}
                        onChange={(newValue) => {
                            setPageNo(1)
                            setOffset(0)
                            setFilter({...filter,pskuHierarchy:newValue.map(item=>item.value)})
                            setSelectedProductHierarchy(newValue);
                        }}
                    />
                </Col>
            </Row>
            <Modal
                visible={isRulesModalVisible}
                footer={null}
                onCancel={e=>setIsRulesModalVisible(false)}
                title = "Tolerance Deletion Rules"
            >
                <div style={{listStyleType:'none' }}>
                    Selections have been categorized into TSE/CG and DB levels.
                    <br /> <br/>
                    <b>Sales hierarchy:</b>
                    <ul>
                        <li>Distributor Code : Highest priority.</li>
                        <li>TSE Code + CG Combination: Second priority.</li>
                        <li>TSE Code: Third priority</li>
                    </ul>
                    <b>Product hierarchy:</b>
                    <ul>
                        <li>PSKU Code: Highest priority.</li>
                        <li>7-Level Product Hierarchy: Secondary priority.</li>
                    </ul>
                </div>
            </Modal>
            <div className='sales-order-head' style={{marginTop:'10px'}} >
                <p style={{margin:0}}>Delete Tolerance Rules <InfoCircleOutlined onClick={e=>setIsRulesModalVisible(true)} style={{marginLeft:'10px'}}/> </p>
                <div className='comment-btn' style={{ gap: '10px' }}>
                    <Button
                        type='primary'
                        className='sbmt-btn'
                        onClick={handleCancel}
                    >
                        Cancel
                    </Button>
                    <Button
                        type='primary'
                        className='sbmt-btn'
                        onClick={deleteHandler}
                        disabled={!(selectedTolerance.size > 0 && hasEditPermission(pages.APP_SETTINGS))}
                    >
                        Delete
                    </Button>
                </div>
            </div>
            <div className="admin-dashboard-table tolerance-exemption sn-table-container ">
                <Loader>
                    <table >
                        <thead style={{ textAlign: 'center' }}>
                            <tr>
                                <th className='tolerance-delete-all-wrapper'>
                                    <label htmlFor={"tolerance-delete-all"}>
                                        <input
                                            type="checkbox"
                                            id={"tolerance-delete-all"}
                                            name="toleranceId"
                                            onChange={(event) => handleToleranceDeleteAllCheck(event)}
                                            checked={toleranceDeleteAllChecked}
                                        />
                                        <span className="checkmark-box"></span>
                                    </label>
                                </th>
                                {!enableSearch.dbCode ? <th>Dist Code <SearchOutlined onClick={() => { setEnableSearch({ ...enableSearch, dbCode: true }) }} /></th> : <th className='width10'><HeaderSearchBox placeholder="DB Code" onClose={closeSearch} searchedValue={filter['dbCode']} onFilterChange={debouncedOnFilterChange} propKey={'dbCode'} /></th>}
                                <th>TSE </th>
                                {!enableSearch.cg ? <th>CG <SearchOutlined onClick={() => { setEnableSearch({ ...enableSearch, cg: true }) }} /></th> : <th className='width5'><HeaderSearchBox placeholder="Customer Group" onClose={closeSearch} searchedValue={filter['cg']} onFilterChange={debouncedOnFilterChange} propKey={'cg'} /></th>}
                                {!enableSearch.psku ? <th>PSKU<SearchOutlined onClick={() => { setEnableSearch({ ...enableSearch, psku: true }) }} /></th> : <th className='width15'><HeaderSearchBox placeholder="PSKU" onClose={closeSearch} searchedValue={filter['psku']} onFilterChange={debouncedOnFilterChange} propKey={'psku'} /></th>}
                                <th>Hierarchy</th>
                                <th>PSKU/Hierarchy Desc</th>
                                <th>Max</th>
                                <th>Min</th>
                            </tr>
                        </thead>
                        <tbody style={{ textAlign: 'center' }}>
                            {originalTolerance.map((item, index) => <tr key={index}>
                                <td>
                                    <label htmlFor={item.id + "-tolerance"}>
                                        <input
                                            type="checkbox"
                                            id={item.id + "-tolerance"}
                                            name="toleranceId"
                                            onChange={(event) => handleCheck(event, item.id)}
                                            checked={selectedTolerance.has(item.id)}
                                        />
                                        <span className="checkmark-box"></span>
                                    </label>
                                </td>
                                <td>
                                    {item.distributor_code ?? NO_DATA_SYMBOL}
                                </td>
                                <td>
                                    {item.tse_code ?? NO_DATA_SYMBOL}
                                </td>
                                <td>
                                    {item.customer_group ?? NO_DATA_SYMBOL}
                                </td>
                                <td>
                                    {item.psku ?? NO_DATA_SYMBOL}
                                </td>
                                <td>
                                    {item.product_hierarchy ?? NO_DATA_SYMBOL}
                                </td>
                                <td>
                                    {item.product_hierarchy_desc ?? NO_DATA_SYMBOL}
                                </td>
                                <td>
                                    {item.max ?? NO_DATA_SYMBOL}
                                </td>
                                <td>
                                    {item.min ?? NO_DATA_SYMBOL}
                                </td>
                            </tr>
                            )}
                            {originalTolerance.length == 0 && <tr>
                                <td colSpan={10}>No Data Available</td>
                            </tr>
                            }
                        </tbody>
                    </table>
                </Loader>
            </div>
            <div className='paginator-wrapper' style={{display: isLoading?'none':'block'}}>
                <Paginator
                    itemsPerPage={limit}
                    setItemsPerPage={setLimit}
                    itemsCount={totalRowCount}
                    setModifiedData={onChangePage}
                    pageNo={pageNo}
                />
            </div>
        </>
    )
} 

const mapStateToProps = (state) => {
    return {
        isLoading : state.loader.isLoading
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        dashboardFilterCategories: (excludeDeleted) => dispatch(AdminActions.dashboardFilterCategories(excludeDeleted)),
        getDistributorList: ({ offset, limit, search, status, customer_group, state, region, areaCode, plantCode }) =>
            dispatch(AdminActions.getDistributorList({ offset, limit, search, status, customer_group, state, region, areaCode, plantCode })),
        fetchProductHierarchyFilter: (payload) => dispatch(AdminActions.fetchProductHierarchyFilter(payload)),
        upsertDbPskuTolerance: (payload) => dispatch(AdminActions.upsertDbPskuTolerance(payload)),
        fetchDistributorPskuTolerance: (payload) => dispatch(AdminActions.fetchDistributorPskuTolerance(payload)),
        getSKUCodes: () => dispatch(AdminActions.getSKUCodes()),
        getMissingDBPskuCombination: (data) => dispatch(AdminActions.getMissingDBPskuCombination(data)),
        fetchOriginalDistributorPskuTolerance: (data) => dispatch(AdminActions.fetchOriginalDistributorPskuTolerance(data)),
        deleteDistributorPskuTolerance: (ids) => dispatch(AdminActions.deleteDistributorPskuTolerance(ids)),
        stockNormDbFilter: (ao_enabled, cg, isNonStockNorm) => dispatch(AdminActions.stockNormDbFilter(ao_enabled, cg, isNonStockNorm))
    }
}

const ProductDetailsSelection = connect(mapStateToProps, mapDispatchToProps)(ProductDetailsStep);
const DeleteTolerance = connect(mapStateToProps, mapDispatchToProps)(DeleteDbPskuTolerance)

export default connect(mapStateToProps, mapDispatchToProps)(DBPskuTolerance);