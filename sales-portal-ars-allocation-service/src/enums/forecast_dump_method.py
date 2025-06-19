from enum import Enum


class ForecastDumpMethod(str, Enum):
    """
    Enum representing different methods for dumping forecasts.
    """

    FORECAST_L3M_CONTRIBUTION = "FORECAST_L3M_CONTRIBUTION"
    L3M_SALES_AVG = "L3M_SALES_AVG"
    PREV_MONTH_ADJ = "PREV_MONTH_ADJ"
