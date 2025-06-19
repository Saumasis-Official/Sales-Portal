import React, { useEffect, useState, useRef } from 'react';
import { Select, notification, Switch, Button } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons';
import { connect } from 'react-redux';
import debounce from 'lodash.debounce';
import ForecastSummary from './ForecastSummary';
import ForecastConfiguration from './ForecastConfiguration';
import Panigantion from '../../../components/Panigantion';
import * as AdminActions from '../actions/adminAction';
import '../../../style/admin/Dashboard.css';
import './ForecastDashboard.css';
import Util from '../../../util/helper/index.js';
import ExportForecastSummaryDataToExcel from './ExportForecastSummaryDataToExcel';
import StockNormAudit from './StockNormAudit';
import StockNormDefault from './StockNormDefault';
import { pages, hasEditPermission, hasViewPermission, features } from '../../../persona/forecast';
import { customerGroupList } from '../../../constants';
import * as AuthAction from '../../auth/action.js';
import config from '../../../config/index.js';
import UploadExcel from '../../../components/UploadExcel/UploadExcel.js';
import ForecastUploadErrorNotification from './ForecastUploadErrorNotification.js';
import Tabs from '../../../components/Tabs/Tabs.js';
import CascadeCheckbox from '../../../components/CascadeCheckbox/CascadeCheckbox.js';
import _ from 'lodash';
import { roles } from '../../../persona/roles.js';
import SoqNorm from './SoqNorm.js';
import ExportStockNorm from './ExportStockNorm.js';
import StockNormUploadErrorNotification from './StockNormUploadErrorNotification.js';
import auth from '../../../util/middleware/auth.js';
const appConfig = config.app_level_configuration;

const informationMessage = [
    'Please upload a valid .xlsx file only.',
    'Please upload a file in the same format as it was downloaded from the "Download" button in "Forecast Summary" page.',
    'Please maintain mandatory columns : DB_Code, PSKU, Adjusted_Forecast_BUOM',
    'No other columns except "Adjusted_Forecast_BUOM" can be updated.',
    '"Adjusted_Forecast_BUOM" column cannot be updated blank, empty or negative.',
    'The "Adjusted_Forecast_BUOM" column must not contain numbers with more than 2 decimal places; values exceeding 2 decimal places will be rounded to 2 decimal places.',
];

const adminInformationMessage = [
    'Please upload a valid .xlsx/.xlsb file only.',
    '"Adjusted Forecast" column cannot be updated blank, empty or negative.',
    'Please maintain mandatory columns : DB_Code, PSKU, Adjusted_Forecast_BUOM',
    '"Adjusted_Forecast_BUOM" column cannot be updated blank, empty or negative.',
    'The "Adjusted_Forecast_BUOM" column must not contain numbers with more than 2 decimal places; values exceeding 2 decimal places will be rounded to 2 decimal places.',
];

const stockNormUploadInformationMessage = [
    'Please upload a valid .xlsx file only.',
    'Please upload a file in the same format as it was downloaded from the "Download" button in "Stock Norm" page.',
    'No other columns except "Stock Norm(Days)" can be updated.',
    'Adjusted stock norm can not have decimal values. It will be rounded off to the nearest whole number.',
    'Adjusted stock norm to be within range of 0 to 30 days.',
];

const classLevelStockNormUploadInformationMessage = [
    'Please upload a valid .xlsx file only.',
    'Mandatory columns: Distributor Code, A, B, C',
    'Adjusted stock norm can not have decimal values. It will be rounded off to the nearest whole number.',
    'Adjusted stock norm to be within range of 0 to 30 days.',
    'Values cannot be updated blank, empty or negative.',
];

const tabsOptions = [
    { label: 'Forecast Summary', value: 'SUMMARY', title: 'Forecast Summary', persona_page: 'FORECAST_DASHBOARD' },
    { label: 'Forecast Configuration', value: 'CONFIGURATION', title: 'Forecast Configuration', persona_page: 'FORECAST_DASHBOARD' },
    { label: 'Stock Norm', value: 'STOCK_NORM', title: 'Stock Norm', persona_page: 'STOCK_NORM' },
    { label: 'SOQ Norm', value: 'SOQ_NORM', title: 'Suggested Order Quantity Norm', persona_page: 'STOCK_NORM' },
];

const ForecastDashboard = (props) => {
    const {
        getAreaCodes,
        downloadForecastSummary,
        getAdjustmentTimeline,
        adjustment_timeline,
        getForecastSummary,
        submitForecast,
        last_forecast_date,
        updateQuantityNorm,
        isForecastLoading,
        app_level_configuration,
        fetchAppLevelConfiguration,
        uploadedFile,
        uploadExcel,
        resetUploadFileData,
        uploadStockNorm,
        downloadStockNorm,
    } = props;

    const role = auth.getAdminRole();
    //-----------------------------------------------------=====useState====-------------------------------------------------------

    const [tabName, setTabName] = useState('SUMMARY');
    const [areaCodes, setAreaCodes] = useState([]);
    const [selectedArea, setSelectedArea] = useState('');
    const [forecastData, setForecastData] = useState([]);
    const [forecastDataCount, setForecastDataCount] = useState(0);
    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState('');
    const [offset, setOffset] = useState(0);
    const [limit, setLimit] = useState(10);
    const [pageNo, setPageNo] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [exportedList, setExportedList] = useState([]);
    const [customerGroup, setCustomerGroup] = useState('31');
    const [quantityNormMode, setQuantityNormMode] = useState(false);
    const [quantityNormValues, setQuantityNormValues] = useState({});
    const [quantityNormGlobalSwitch, setQuantityNormGlobalSwitch] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [uploadErrorsModalVisible, setUploadErrorsModalVisible] = useState(false);
    const [uploadErrors, setUploadErrors] = useState([]);
    const [uploadErrorsMessage, setUploadErrorsMessage] = useState('');
    const [zoneAreaOptions, setZoneAreaOptions] = useState([]);
    const [arsEnabledDBMode, setArsEnabledDBMode] = useState(true);
    const [stockNormDistributorFilter, setStockNormDistributorFilter] = useState([]);
    const [isDbFilterPopUpOpen, setIsDbFilterPopUpOpen] = useState(false);
    const [downloadArea, setDownloadArea] = useState('');
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [stockNormDownloadData, setStockNormDownloadData] = useState([]);
    const [isSNUploadModalOpen, setIsSNUploadModalOpen] = useState(false);
    const [stockNormDownloadLoading, setStockNormDownloadLoading] = useState(false);
    const [stockNormUploadErrorModalVisible, setStockNormUploadErrorModalVisible] = useState(false);
    const [cgEditTimeline, setCgEditTimeline] = useState({});
    const [forecastEndMonth, setForecastEndMonth] = useState(null);
    const [forecastDelta, setForecastDelta] = useState(3);
    const [enableClassLevelStockNormUpload, setEnableClassLevelStockNormUpload] = useState(false);
    const [overwriteStockNorm, setOverwriteStockNorm] = useState(false);

    //---------------------------------------------------=====useRef====------------------------------------------------

    const selectedDbForStockNormFilter = useRef([]);
    const debouncedSearch = useRef(debounce((nextValue) => setSearch(nextValue), 500)).current;

    //--------------------------------=====useEffect====-------------------------------

    useEffect(() => {
        const tab = tabsOptions.filter((t) => hasViewPermission(t.persona_page));
        setTabName(tab[0].value);
    }, []);

    useEffect(() => {
        getAdjustmentTimeline();
        getAreaCodes().then((response) => {
            if (response?.data?.success) {
                setAreaCodes(response?.data?.data?.sort((a, b) => (a.code.toUpperCase() >= b.code.toUpperCase() ? 1 : -1)));
                if (response?.data?.data?.length > 0) {
                    if (props?.location?.state?.areaCode != null && props?.location?.state?.areaCode != undefined) setSelectedArea(props?.location?.state?.areaCode?.current);
                    else setSelectedArea(response?.data?.data?.[0]['code']);
                }
            } else {
                notificationSender('Technical Error', 'Could not fetch area codes', false);
            }
        });
    }, []);

    useEffect(() => {
        if (app_level_configuration && app_level_configuration.length) {
            for (let config of app_level_configuration) {
                if (!config) continue;
                if (config.key === appConfig.enable_quantity_norm.key && config.value === appConfig.enable_quantity_norm.enable_value) {
                    setQuantityNormGlobalSwitch(true);
                }
            }
        } else {
            fetchAppLevelConfiguration();
        }
    }, [app_level_configuration]);

    useEffect(() => {
        if (selectedArea !== null && selectedArea != undefined && tabName === 'SUMMARY' && !isForecastLoading) {
            setExportedList([]);
            getForecastSummaryData();
        }
    }, [selectedArea, search, limit, offset, quantityNormMode, tabName]);

    useEffect(() => {
        setCgEditTimeline(adjustment_timeline);
    }, [adjustment_timeline]);

    //--------------------------------=====API Calls=====------------------------------
    async function getDownloadData() {
        const isRegionForecast = role.includes(roles.SHOPPER_MARKETING) || role.includes(roles.SUPER_ADMIN) || role.includes(roles.RSM);
        setDownloadLoading(true);
        notificationSender('Forecast Download', 'Fetching forecast file(s) data...', true);
        const data = isRegionForecast ? await downloadForecastSummary() : await downloadForecastSummary(selectedArea);
        setDownloadLoading(false);

        if (data && data.success) {
            if (isRegionForecast) {
                const s3ResponseData = data.data || {};
                const regions = Object.keys(s3ResponseData) || [];
                let index = 0;

                function downloadForecastFiles() {
                    if (index < regions.length) {
                        const s3Data = s3ResponseData[regions[index]] || {};
                        const donwnloadUrl = s3Data['downloadUrl'];
                        window.location.href = donwnloadUrl;
                        index++;
                        setTimeout(downloadForecastFiles, 15000);
                    }
                }
                downloadForecastFiles();
                notificationSender('Forecast Download', 'Your file(s) are getting downloaded.', true);
            } else {
                const forecast_data = data.data || {};
                const areas = Object.keys(forecast_data) || [];
                if (areas.length === 0) {
                    notificationSender('Download Error', 'No data found for download', false);
                    return;
                }
                const area = areas[0];
                setExportedList(forecast_data[area]);
                setDownloadArea(area);
                notificationSender('Forecast Download', 'Your file(s) are getting downloaded.', true);
            }
        } else {
            notificationSender('Download Error', 'Failed to download Forecast summary.', false);
        }
    }

    async function getForecastSummaryData() {
        if (selectedArea) {
            let forecast_summary = await getForecastSummary({ areaCode: selectedArea, search, limit, offset }, quantityNormMode);
            setForecastData(forecast_summary?.data?.rows);
            setForecastDataCount(forecast_summary?.data?.totalCount);
            setForecastDelta(forecast_summary?.data?.delta ?? 3);
            setForecastEndMonth(forecast_summary?.data?.endMonth);
        }
    }

    const submitButtonHandler = async () => {
        const res = await submitForecast({ areaCode: selectedArea });
        if (res?.success) {
            notificationSender('Submit Success', res?.message, true);
        } else {
            notificationSender('Submit Failure', `Cannot submit forecast data for area ${selectedArea}`, false);
        }
    };

    async function saveQuantityNorm() {
        let quantity_norm = [];
        Object.keys(quantityNormValues)?.forEach((i) => {
            quantity_norm.push({
                psku: i,
                value: +quantityNormValues[i],
            });
        });
        const payload = {
            area_code: selectedArea,
            quantity_norm,
        };
        const res = await updateQuantityNorm(payload);
        if (res?.success) {
            notificationSender('Quantity Norm Updated', res?.message, true);
        } else {
            notificationSender('Quantity Norm Update Failed', res?.message, false);
        }
        getForecastSummaryData();
    }

    async function uploadData() {
        setIsModalOpen(false);
        const data = new FormData();
        data.append('file', uploadedFile);
        if (!uploadedFile?.name) {
            Util.notificationSender('Error', 'Please upload a file', false);
            return;
        }
        const acceptedFileTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel.sheet.binary.macroEnabled.12'];
        if (!acceptedFileTypes.includes(uploadedFile.type)) {
            Util.notificationSender('Error', 'Please upload an excel file', false);
            return;
        }
        const response = await uploadExcel(data);

        if (!response?.status) {
            if (response?.data && Object.keys(response.data).length == 0) {
                Util.notificationSender('Error', 'Failed to Upload File', false);
            } else {
                setUploadErrorsModalVisible(true);
                setUploadErrors(response?.data);
                setUploadErrorsMessage(response?.message);
            }
        } else {
            if (hasEditPermission(pages.FORECAST_DASHBOARD, 'ADMIN_FORECAST_UPLOAD')) {
                notification.success({
                    message: response?.message,
                    description: <b>Changes might take 15 minutes to reflect</b>,
                    duration: 5,
                });
            } else Util.notificationSender('Success', response?.message, true);
        }
        resetUploadFileData();
    }

    async function uploadStockNormData() {
        setIsSNUploadModalOpen(false);
        const data = new FormData();
        data.append('file', uploadedFile);
        if (!uploadedFile?.name) {
            Util.notificationSender('Error', 'Please upload a file', false);
            return;
        }
        const acceptedFileTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (!acceptedFileTypes.includes(uploadedFile.type)) {
            Util.notificationSender('Error', 'Please upload an excel file', false);
            return;
        }
        try {
            const response = await uploadStockNorm(data, enableClassLevelStockNormUpload, overwriteStockNorm);

            if (!response?.status) {
                setStockNormUploadErrorModalVisible(true);
                setUploadErrors(response?.data);
                setUploadErrorsMessage(response?.message);
            } else {
                Util.notificationSender('Success', response?.message, true);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            Util.notificationSender('Error', 'Error encountered while uploading file', false);
        }

        resetUploadFileData();
    }

    const getDownloadStockNorm = () => {
        const payload = {};
        payload.ars_db = arsEnabledDBMode;
        payload.distId = stockNormDistributorFilter;
        payload.customer_group = customerGroup;
        setStockNormDownloadLoading(true);
        downloadStockNorm(payload)
            .then((res) => {
                if (res?.success) {
                    const response = res?.data;
                    const regions = Object.keys(response) || [];
                    let index = 0;
                    function downloadStockNormFiles() {
                        if (index < regions.length) {
                            const data = response[regions[index]];
                            const downloadUrl = data?.downloadUrl;
                            window.location.href = downloadUrl;
                            index++;
                            setTimeout(downloadStockNormFiles, 15000);
                        }
                    }
                    downloadStockNormFiles();
                    notificationSender('Stock Norm Download', 'Your file(s) are getting downloaded.', true);
                }
            })
            .catch((err) => {
                console.error('Error downloading file:', err);
                Util.notificationSender('Error', 'Failed to download Stock Norm data', false);
            })
            .finally(() => {
                setStockNormDownloadLoading(false);
            });
    };

    //--------------------------------======Helpers=====--------------------------------------

    const notificationSender = (message, description, success) => {
        if (success) {
            notification.success({
                message: message,
                description: description,
                duration: 5,
                className: 'notification-success',
            });
        } else {
            notification.error({
                message: message,
                description: description,
                duration: 5,
                className: 'notification-error',
            });
        }
    };

    //--------------------------------=====Event Handlers=====---------------------------------

    const tabFunction = (value) => {
        setPageNo(1);
        setQuantityNormMode(false);
        setLimit(itemsPerPage);
        setOffset(0);
        setTabName(value);
        setStockNormDistributorFilter([]);
    };

    const onAreaChangeHandler = (value) => {
        setSelectedArea(value);
        setSearch('');
        setShowSearch('');
        setExportedList([]);
    };

    const onSearch = (e) => {
        const { value } = e.target;
        debouncedSearch(value);
        setShowSearch(value);
        setOffset(0);
        setPageNo(1);
    };

    const resetPage = () => {
        debouncedSearch('');
        setShowSearch('');
        setOffset(0);
    };

    const onChangePage = (page, itemsPerPage) => {
        setLimit(itemsPerPage);
        setOffset((page - 1) * limit);
        setPageNo(page);
    };

    const onCustomerGroupChangeHandler = (value) => {
        setCustomerGroup(value);
        setStockNormDistributorFilter([]);
    };

    function onChangeQuantityNorms(data) {
        setPageNo(1);
        setLimit(itemsPerPage);
        setOffset(0);
        setQuantityNormMode(data);
    }

    function handleSNFilters(data) {
        const zoneAreaMap = {};
        const areaDistributorMap = {};
        const options = [];
        data?.forEach((item) => {
            if (zoneAreaMap[item.region]) {
                zoneAreaMap[item.region].add(item.area_code);
            } else {
                zoneAreaMap[item.region] = new Set([item.area_code]);
            }

            if (areaDistributorMap[item.area_code]) {
                areaDistributorMap[item.area_code].add(`${item.distributor_name}#${item.dist_id}`);
            } else {
                areaDistributorMap[item.area_code] = new Set([`${item.distributor_name}#${item.dist_id}`]);
            }
        });

        Object.keys(zoneAreaMap).forEach((zone) => {
            const areaCodes = Array.from(zoneAreaMap[zone]);
            options.push({
                label: zone,
                value: zone,
                children: areaCodes.map((area) => ({
                    label: area,
                    value: area,
                    children: Array.from(areaDistributorMap[area])?.map((distributor) => ({
                        label: `${distributor.split('#')[0]}(${distributor.split('#')[1]})`,
                        value: distributor.split('#')[1],
                    })),
                })),
            });
        });
        setZoneAreaOptions(options);
    }

    function onChangeZoneAreaHandler(value) {
        selectedDbForStockNormFilter.current = value;
        if (!isDbFilterPopUpOpen) {
            handleClose(false);
        }
    }

    function handleClose(isOpen) {
        setIsDbFilterPopUpOpen(isOpen);
        if (!isOpen) {
            if (selectedDbForStockNormFilter.current != stockNormDistributorFilter.length) {
                setStockNormDistributorFilter(selectedDbForStockNormFilter.current);
            } else {
                let isChanged = false;
                const tempSelectedDb = _.cloneDeep(selectedDbForStockNormFilter.current);
                for (let db of tempSelectedDb) {
                    if (!stockNormDistributorFilter.includes(db)) {
                        isChanged = true;
                    }
                }
                if (isChanged) setStockNormDistributorFilter(tempSelectedDb);
            }
        }
    }

    function onChangeArsEnableDBMode(data) {
        setArsEnabledDBMode(data);
        setStockNormDistributorFilter([]);
    }

    const onDownloadCancel = () => {
        if (role.includes(roles.ASM)) {
            // this is only for ASM because, ASM download one file. And we call this function every time we hit the pseudo-button in ExportForecastSummaryDataToExcel.js
            setDownloadLoading(false);
            setExportedList([]);
            setDownloadArea('');
        }
    };

    const onStockNormDataClear = () => {
        setStockNormDownloadData([]);
    };

    const resetErrorMessages = () => {
        setUploadErrors({});
        setUploadErrorsMessage('');
    };

    return (
        <div className="admin-dashboard-wrapper">
            <div className="admin-dashboard-block">
                <div className="forecast-dashboard-head">
                    <div className="page-title">
                        <h2>{tabsOptions?.find((t) => t.value === tabName)?.title}</h2>
                    </div>
                    <div className="header-tools">
                        {tabName === 'SUMMARY' && (
                            <div className="dashboard-search">
                                <input
                                    type="text"
                                    className="search-fld"
                                    placeholder="Search by- PSKU Code/ PSKU name/ brand variant/ regional brand"
                                    value={showSearch}
                                    onChange={(e) => {
                                        onSearch(e);
                                    }}
                                />
                                <div onClick={resetPage} className="close-search">
                                    <CloseCircleOutlined />
                                </div>
                            </div>
                        )}
                        {!['STOCK_NORM', 'SOQ_NORM'].includes(tabName) && (
                            <div className="area-filter">
                                <Select
                                    showSearch
                                    className="width120px"
                                    style={{ fontSize: '13px' }}
                                    placeholder={selectedArea}
                                    optionFilterProp="children"
                                    onChange={onAreaChangeHandler}
                                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                    options={areaCodes?.map((item) => {
                                        return { value: item.code, label: item.code };
                                    })}
                                />
                            </div>
                        )}

                        {tabName === 'STOCK_NORM' && (
                            <>
                                <div className="dashboard-search">
                                    <CascadeCheckbox
                                        options={zoneAreaOptions}
                                        outputType={'LEAF_NODES'}
                                        multiple={true}
                                        onChange={onChangeZoneAreaHandler}
                                        width={'100%'}
                                        placeholder="Select Regions, Areas and Distributors"
                                        handleClose={handleClose}
                                    />
                                </div>

                                <div className="area-filter">
                                    <Select
                                        style={{ fontSize: '13px', width: '150px' }}
                                        defaultValue={customerGroup}
                                        optionFilterProp="children"
                                        onChange={onCustomerGroupChangeHandler}
                                        options={customerGroupList}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    <div className="summary-header-options-container">
                        <Tabs value={tabName} tabs={tabsOptions.filter((t) => hasViewPermission(t.persona_page))} onChangeSelection={tabFunction} />

                        {hasViewPermission(pages.QUANTITY_NORM) && tabName === 'SUMMARY' && (
                            <div className="comment-btn vertical-center">
                                <label hidden={!quantityNormGlobalSwitch}>
                                    <span className="quantity-norm-label">Quantity Norm</span>
                                    <Switch checked={quantityNormMode} onChange={onChangeQuantityNorms} />
                                </label>
                            </div>
                        )}
                        {quantityNormMode && (
                            <div className="comment-btn" style={{ paddingTop: '12px' }}>
                                {tabName === 'SUMMARY' && (
                                    <button
                                        type="button"
                                        className="sbmt-btn"
                                        onClick={saveQuantityNorm}
                                        hidden={!Object.keys(cgEditTimeline).some((cg) => cgEditTimeline[cg]?.editEnable) || !hasEditPermission(pages.QUANTITY_NORM)}>
                                        Save
                                    </button>
                                )}
                            </div>
                        )}
                        {!quantityNormMode && (
                            <>
                                <div className="comment-btn" style={{ paddingTop: '12px' }}>
                                    {tabName === 'SUMMARY' && (
                                        <>
                                            {hasEditPermission(pages.FORECAST_DASHBOARD) && Object.keys(cgEditTimeline).some((cg) => cgEditTimeline[cg]?.editEnable) && (
                                                <>
                                                    <Button type="primary" className="btn-upload forecast-upload" loading={false} onClick={() => setIsModalOpen(!isModalOpen)}>
                                                        Upload
                                                    </Button>
                                                    <UploadExcel
                                                        id="forecast-upload"
                                                        isModalOpen={isModalOpen}
                                                        setIsModalOpen={setIsModalOpen}
                                                        sendData={uploadData}
                                                        informationMessage={
                                                            hasEditPermission(pages.FORECAST_DASHBOARD, 'ADMIN_FORECAST_UPLOAD') ? adminInformationMessage : informationMessage
                                                        }
                                                    />
                                                </>
                                            )}
                                            <div>
                                                {exportedList != null && exportedList.length > 0 && (
                                                    <ExportForecastSummaryDataToExcel
                                                        fData={exportedList}
                                                        onCancel={onDownloadCancel}
                                                        lastForecastDate={last_forecast_date}
                                                        areaCode={downloadArea}
                                                        endMonth={forecastEndMonth}
                                                        forecastDelta={forecastDelta}
                                                    />
                                                )}
                                                <Button
                                                    button
                                                    className="btn-upload"
                                                    type="button"
                                                    style={{ marginRight: '10px', width: 'auto' }}
                                                    loading={downloadLoading}
                                                    onClick={getDownloadData}>
                                                    Download
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                    {tabName === 'SUMMARY' && hasEditPermission(pages.FORECAST_DASHBOARD, features.EDIT_SUBMIT) && (
                                        <button
                                            type="button"
                                            className="sbmt-btn"
                                            onClick={submitButtonHandler}
                                            hidden={!Object.keys(cgEditTimeline).some((cg) => cgEditTimeline[cg]?.editEnable)}>
                                            Submit
                                        </button>
                                    )}
                                    {tabName === 'STOCK_NORM' && (
                                        <div className="comment-btn">
                                            <label>
                                                <span className="quantity-norm-label">ARS Enabled DBs</span>
                                                <Switch checked={arsEnabledDBMode} onChange={onChangeArsEnableDBMode} />
                                            </label>
                                        </div>
                                    )}
                                </div>
                                {tabName === 'STOCK_NORM' && (
                                    <div className="stock-norm-upload-download">
                                        {hasEditPermission(pages.STOCK_NORM) && (
                                            <>
                                                <Button className="btn-upload" type="button" onClick={() => setIsSNUploadModalOpen(!isSNUploadModalOpen)}>
                                                    Upload
                                                </Button>
                                                <UploadExcel
                                                    id="stock-norm-upload"
                                                    isModalOpen={isSNUploadModalOpen}
                                                    setIsModalOpen={setIsSNUploadModalOpen}
                                                    sendData={uploadStockNormData}
                                                    informationMessage={
                                                        enableClassLevelStockNormUpload ? classLevelStockNormUploadInformationMessage : stockNormUploadInformationMessage
                                                    }
                                                    customSection={
                                                        <div
                                                            style={{
                                                                display: 'grid',
                                                                gridTemplateColumns: 'max-content max-content',
                                                                gap: '16px',
                                                                alignItems: 'center',
                                                            }}>
                                                            <span className="quantity-norm-label">Upload Class Level Stock Norm</span>
                                                            <Switch checked={enableClassLevelStockNormUpload} onChange={setEnableClassLevelStockNormUpload} />
                                                            {enableClassLevelStockNormUpload && (
                                                                <>
                                                                    <span className="quantity-norm-label">Overwrite Existing Values</span>
                                                                    <Switch checked={overwriteStockNorm} onChange={setOverwriteStockNorm} />
                                                                </>
                                                            )}
                                                        </div>
                                                    }
                                                />
                                            </>
                                        )}
                                        {stockNormDownloadData.length > 0 && (
                                            <ExportStockNorm stockNorm={stockNormDownloadData} customerGroup={customerGroup} clearData={onStockNormDataClear} />
                                        )}
                                        <Button
                                            className="btn-upload"
                                            type="button"
                                            style={{ marginRight: '10px', width: 'auto' }}
                                            onClick={getDownloadStockNorm}
                                            loading={stockNormDownloadLoading}>
                                            Download
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
                <div className="forecast-dashboard-body">
                    {tabName === 'SUMMARY' && (
                        <>
                            <ForecastSummary
                                data={forecastData}
                                areaCode={selectedArea}
                                history={props.history}
                                quantityNormMode={quantityNormMode}
                                onChangeQuantityNorms={setQuantityNormValues}
                                timelineEditEnable={Object.keys(cgEditTimeline).map((cg) => cgEditTimeline[cg].editEnable && hasEditPermission(pages.FORECAST_DASHBOARD))}
                                forecastDelta={forecastDelta}
                                forecastEndMonth={forecastEndMonth}
                            />
                            <Panigantion
                                data={forecastData ? forecastData : []}
                                itemsPerPage={itemsPerPage}
                                setItemsPerPage={setItemsPerPage}
                                itemsCount={forecastDataCount}
                                setModifiedData={onChangePage}
                                pageNo={pageNo}
                            />
                        </>
                    )}
                    {tabName === 'CONFIGURATION' && (
                        <ForecastConfiguration
                            areaCode={selectedArea}
                            editEnable={Object.keys(cgEditTimeline).reduce((acc, item) => {
                                acc[`${item}#${cgEditTimeline[item].desc}`] = cgEditTimeline[item].editEnable && hasEditPermission(pages.FORECAST_DASHBOARD);
                                return acc;
                            }, {})}
                        />
                    )}
                    {tabName === 'STOCK_NORM' && (
                        <>
                            <StockNormAudit
                                customerGroup={customerGroup}
                                filterDistributors={stockNormDistributorFilter}
                                arsEnabledDBMode={arsEnabledDBMode}
                                timelineEditEnable={cgEditTimeline}
                                listForSNFilter={handleSNFilters}
                            />
                            {hasViewPermission(pages.STOCK_NORM_DEFAULT) && (
                                <>
                                    <h3>Default Stock Norm</h3>
                                    <StockNormDefault customerGroup={customerGroup} />
                                </>
                            )}
                        </>
                    )}
                    {tabName === 'SOQ_NORM' && <SoqNorm />}
                </div>
                {uploadErrorsMessage && uploadErrorsModalVisible && (
                    <ForecastUploadErrorNotification
                        visible={uploadErrorsModalVisible}
                        data={uploadErrors}
                        message={uploadErrorsMessage}
                        handleErrorCancel={() => {
                            setUploadErrorsModalVisible(false);
                            resetErrorMessages();
                        }}
                    />
                )}
                {uploadErrorsMessage && stockNormUploadErrorModalVisible && (
                    <StockNormUploadErrorNotification
                        visible={stockNormUploadErrorModalVisible}
                        data={uploadErrors}
                        message={uploadErrorsMessage}
                        handleErrorCancel={() => {
                            setStockNormUploadErrorModalVisible(false);
                            resetErrorMessages();
                        }}
                    />
                )}
            </div>
        </div>
    );
};

const mapStateToProps = (state) => {
    return {
        last_forecast_date: state.admin.get('last_forecast_date'),
        adjustment_timeline: state.admin.get('adjustment_timeline'),
        isForecastLoading: state.loader.isForecastLoading,
        app_level_configuration: state.auth.get('app_level_configuration'),
        uploadedFile: state.admin.get('uploaded_file'),
    };
};
const mapDispatchToProps = (dispatch) => {
    return {
        getAreaCodes: () => dispatch(AdminActions.getArsAreaCodes()),
        getRegionalBrands: (data) => dispatch(AdminActions.getRegionalBrands(data)),
        getForecastSummary: (data, mode) => dispatch(AdminActions.getForecastSummary(data, mode)),
        submitForecast: (data) => dispatch(AdminActions.submitForecast(data)),
        getAdjustmentTimeline: () => dispatch(AdminActions.getAdjustmentTimeline()),
        downloadForecastSummary: (data) => dispatch(AdminActions.downloadForecastSummary(data)),
        updateQuantityNorm: (data) => dispatch(AdminActions.updateQuantityNorm(data)),
        fetchAppLevelConfiguration: () => dispatch(AuthAction.fetchAppLevelSettings()),
        uploadExcel: (data) => dispatch(AdminActions.forecastUpload(data)),
        resetUploadFileData: () => dispatch(AdminActions.resetUploadFileData()),
        getStockNormAudit: (customerGroup, data) => dispatch(AdminActions.getStockNormAudit(customerGroup, data)),
        uploadStockNorm: (data, isClassLevel, toOverwrite) => dispatch(AdminActions.uploadStockNorm(data, isClassLevel, toOverwrite)),
        downloadStockNorm: (data) => dispatch(AdminActions.downloadStockNorm(data)),
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(ForecastDashboard);
