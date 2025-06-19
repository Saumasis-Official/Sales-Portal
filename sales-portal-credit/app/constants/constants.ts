let isCreditSyncRunning = false;
let isBaseLimitUpdateRunning = false;
export const bearerAuth = '$2y$10$z97XkHhqGaz1tC9qOJXXeu9jxaKhcTh2ZPtOyggxIiZ5qCHYteA6i'; 
// export const CUSTOMER_GROUPS_FOR_BASE_LIMIT = ['14', '15', '16', '17', '18', '19', '21', '26', '43', '41', '46', '52', '69', '70', '28', '42', '64', '22', '68']; //Fetch MT CG from CL app setting 
export function getIsBaseLimitUpdateRunning(): boolean {
    return isBaseLimitUpdateRunning;
}

export function setIsBaseLimitUpdateRunning(value: boolean): void {
    isBaseLimitUpdateRunning = value;
}
export function getIsCreditSyncRunning(): boolean {
    return isCreditSyncRunning;
}

export function setIsCreditSyncRunning(value: boolean): void {
    isCreditSyncRunning = value;
}

export function getIsGTBaseLimitUpdateRunning(): boolean {
    return isBaseLimitUpdateRunning;
}
export function setIsGTBaseLimitUpdateRunning(value: boolean): void {
    isBaseLimitUpdateRunning = value;
}
export function getIsGTSyncRunning(): boolean {
    return isBaseLimitUpdateRunning;
}
export function setIsGTSyncRunning(value: boolean): void {
    isBaseLimitUpdateRunning = value;
}
//Start cron for GT
let isGTStartRunning = false;

export const getIsGTStartRunning = () => isGTStartRunning;
export const setIsGTStartRunning = (status: boolean) => {
    isGTStartRunning = status;
};
//End cron for GT
let isGTEndRunning = false;
export const getIsGTEndRunning= () => isBaseLimitUpdateRunning;
export const setIsGTEndRunning =(status: boolean)=> {
    isGTEndRunning = status;
}
export const GT_ACTION_TYPE = {
    BASE_LIMIT_UPLOAD: 'BASE_LIMIT_UPLOAD',
    BASE_LIMIT_REMOVAL: 'BASE_LIMIT_REMOVAL',
    ADDITIONAL_LIMIT_UPLOAD: 'ADDITIONAL_LIMIT_UPLOAD',
    ADDITIONAL_LIMIT_REMOVAL: 'ADDITIONAL_LIMIT_REMOVAL',
};

export const DEFAULT_EMAIL = {
     SYSTEM_EMAIL : 'orderportal.testing@tataconsumer.com'
}
