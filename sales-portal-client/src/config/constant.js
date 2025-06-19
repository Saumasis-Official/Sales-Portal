//import images
const WAVE_IMAGE = '../assets/images/Layer 2.png';
export const FOR_BETTER_SVG = '../assets/images/For better.svg';
export const TATA_CONSUMER_SVG = '../assets/images/Tata consumer.svg';
export const SALES_ORDER_SVG = '../assets/images/SO.svg';
export const DELETE_ICON_SVG = '../assets/images/deleteIcon.svg';
export const ADD_ICON_SVG = '../assets/images/add icon.svg';
export const BASE_URL = 'http://localhost:3001/api/v1';
export const SUCCESS_SVG = '../assets/images/success.svg';
export const HOME_PATH_SVG = '../assets/images/home-path.svg';

// constant
export const INITIALMINUTES = 2;
export const INITIALSECONDS = 45;
export const SYNC_PROGRESS_TEXT = `Sync is in progress, it may take some time. Please don't click back or refresh button`;
export const PARTNER_MISMATCH_CATEGORY = 'Unloading Point is incorrect in PO/SO/Invoice';
export const PARTNER_MISMATCH_REMARK = 'Update the Unloading point for the following SO';

export const DEFAULT_MESSAGES = {
    LOGIN: {
        ERROR: 'Technical issue',
    },
    VERIFY_OTP: {
        ERROR: 'Technical issue',
    },
    SEND_OTP: {
        SUCCESS: 'OTP successfully sent',
        ERROR: 'Technical issue', //todo
    },
    RESET_PASSWORD: {
        SUCCESS: 'Password changed successfully',
        MATCH_ERROR: 'Set password and confirm password do not match',
        ERROR: 'Technical issue', //todo
    },
    CHANGE_PASSWORD: {
        SUCCESS: 'Password changed successfully!',
        MATCH_ERROR: 'New password and confirm password do not match',
        ERROR: 'Error occurred',
        INVALID: 'Invalid Password',
        SAME_PASSWORD: 'You have entered the same current and new password. Please enter a different password',
        ALPHANUMERIC_ERROR: 'Password must be atleast 6 alphanumeric characters',
        ENTER_CUR_PASSWORD: 'Please enter current password.',
        ENTER_NEW_PASSWORD: 'Please enter new password.',
    },
};

export const status = [
    {
        value: 'OPEN',

        label: 'ON',
    },

    {
        value: 'CLOSE',

        label: 'OFF',
    },
];
export const ActiveInActiveStatus = [
    {
        Status: 'ACTIVE',
    },
    {
        Status: 'INACTIVE',
    },
];
export const ArticleCodeStatus = [
    {
        'Article Code': 'NONE',
    },
    {
        'Article Code': 'MISSING',
    },
    {
        'Article Code': 'AVAILABLE',
    },
];
export const ArticleDescription = [
    {
        'Article Description': 'NONE',
    },
    {
        'Article Description': 'MISSING',
    },
    {
        'Article Description': 'AVAILABLE',
    },
];

export const sd_request = 'SD_REQUEST';
export default WAVE_IMAGE;
export const allDivisionsArr = [10, 12, 13, 14, 17, 18, 21, 22, 99];
export const FAILED_ATTEMPT_TIME_LIMIT_MINUTE = 15;
export const MAX_FAILED_ATTEMPT_COUNT = 5;
export const MT_ECOM_MULTI_GRN = 'Multi GRN';
export const MT_ECOM_SINGLE_GRN = 'Single GRN';
export const MT_ECOM_CUSTOMER_WORKFLOW = [
    { value: 'po_format', label: 'PO FORMAT' },
    { value: 'acknowledgement', label: 'Acknowledgement' },
    { value: 'article', label: 'ARTICLE' },
    { value: 'tot', label: 'TOT Margin' },
    { value: 'base_price', label: 'BASE PRICE' },
    { value: 'mrp_1', label: 'MRP-1' },
    { value: 'caselot', label: 'CASELOT' },
    { value: 'invoice', label: 'INVOICE' },
    { value: 'mrp_2', label: 'MRP-2' },
    { value: 'asn', label: 'ASN' },
];
export const MT_ECOM_CUSTOMER = ['Grofers', 'ARIPL', 'BigBasket', 'Swiggy', 'Zepto','Reliance'];
export const RELIANCE_HEADER_DATA = [
    'Parent SKU Code',
    'Child SKU Code',
    'Store ID',
    'Customer Code',
    'Reliance Article ID',
    'RRL Article Description',
    'ParentSKUDescription',
    'SystemSKUDescription',
    'Plant Code',
    'VendorCode',
    'Vendor Name',
    'Division',
    'Region',
];
export const ECOM_HEADER_DATA = [
    'PSKU',
    'PSKU Description',
    'SKU',
    'SKU Description',
    'Customer Code',
    'Customer Name',
    'Plant Code',
    'Article ID',
    'Article Description',
    'Site Code',
    'Vendor Code',
    'Division',
    'Region',
    'Priority',
];

export const CUSTOMER_GROUPS = {
    MODERN_TRADE: '14',
    E_COMMERCE: '16',
};

export const FULL_ALLOCATION = 'FULL ALLOCATION';
export const SAP_ORDER_PROCESS_DELAY = 5;

export const MT_ECOM_GROUPS = ['14', '16', '18', '19', '21', '26', '28', '41', '42', '43', '46', '68'];
export const CFA_CHANNELS = ['MT', 'GT'];
export const GT_ACTION_TYPE = {
    BASE_LIMIT_UPLOAD: 'BASE_LIMIT_UPLOAD',
    BASE_LIMIT_REMOVAL: 'BASE_LIMIT_REMOVAL',
    ADDITIONAL_LIMIT_UPLOAD: 'ADDITIONAL_LIMIT_UPLOAD',
    ADDITIONAL_LIMIT_REMOVAL: 'ADDITIONAL_LIMIT_REMOVAL',
}
