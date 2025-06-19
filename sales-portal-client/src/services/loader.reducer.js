import { FORECAST_LOADING, IS_LOADING, IS_SPINNING } from '../constants/actionsConstants';

const initialState = {
    isLoading: false,
    isSpinning: false,
    isForecastLoading: false
};

export default (state = initialState, action) => {
    switch (action.type) {
        case IS_LOADING:
            return { ...state, isLoading: action.payload };
        case IS_SPINNING:
            return { ...state, isSpinning: action.payload };
        case FORECAST_LOADING:
            return { ...state, isForecastLoading: action.payload };
        default:
            return state;
    }
}