export const allDivisions = '10,12,13,14,17,18,21,22,99,98';
export const bearerAuth = '$2y$10$z97XkHhqGaz1tC9qOJXXeu9jxaKhcTh2ZPtOyggxIiZ5qCHYteA6i';
export const CUSTOMER_GROUPS_FOR_ORDERING = ['10', '11', '14', '16', '20', '31', '35', '48', '50', '51', '62', '63', '15', '17', '44', '52', '99', '69', '70', '18', '64', '22','73'];
export const SALES_ORG = ['1010', '5010', '6010'];
let isDistributorSyncRunning = false;

export function getIsDistributorSyncRunning(): boolean {
    return isDistributorSyncRunning;
}

export function setIsDistributorSyncRunning(value: boolean): void {
    isDistributorSyncRunning = value;
}

export const VALID_PDP_REGEX = /^(WE|FN)((SU|MO|TU|WE|TH|FR|SA)+)$/;
