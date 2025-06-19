/** 
 * Define the action contant 
*/
export const IS_LOADING = 'IS_LOADING';
export const IS_SPINNING = 'IS_SPINNING';
export const FORECAST_LOADING = 'FORECAST_LOADING';

export const isLoading = (data) => {
    return {
        type: IS_LOADING,
        payload: data
    };
    
}

export const isSpinning = (data) => {
    return {
        type: IS_SPINNING,
        payload: data
    };
}

export const isForecastLoading = (data) => {
    return {
        type: FORECAST_LOADING,
        payload: data
    };
}