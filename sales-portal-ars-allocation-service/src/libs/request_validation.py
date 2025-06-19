from typing import Optional, List, Dict

from pydantic import BaseModel, Field, model_validator

from src.enums.allocation_sales_type import AllocationSalesType
from src.enums.forecast_dump_method import ForecastDumpMethod


class PhasingRequest(BaseModel):
    area_id: str = Field(..., description="The area id")
    customer_group: str = Field(..., description="The customer group")


class AllocationRequest(BaseModel):
    area_id: str = Field(..., description="The area id")
    months: Optional[int] = Field(3, description="The number of months")
    forecast_month: Optional[str] = None
    allocation_by_prev_month_saliency: Optional[bool] = False
    remove_deleted_customers: Optional[bool] = False
    m_1: Optional[float] = 33.34
    m_2: Optional[float] = 33.33
    m_3: Optional[float] = 33.33


class SyncRequest(BaseModel):
    sync_type: Optional[str] = None
    area_codes: Optional[str] = None
    customer_groups: Optional[str] = None
    execute_post_program_apis: Optional[bool] = True
    forecast_month: Optional[str] = None
    remove_deleted_customers: Optional[bool] = False
    forecast_dump_method: Optional[ForecastDumpMethod] = None
    sales_type: Optional[AllocationSalesType] = AllocationSalesType.SECONDARY_SALES

    @model_validator(mode="after")
    def check_forecast_dump_method(self):
        if self.sync_type is None and self.forecast_dump_method is None:
            raise ValueError(
                'forecast_dump_method cannot be None when sync_type contains "sales_allocation"'
            )
        elif (
            self.sync_type is not None
            and "sales_allocation" in self.sync_type
            and self.forecast_dump_method is None
        ):
            raise ValueError(
                "forecast_dump_method cannot be None when sync_type is None"
            )
        return self


class SyncRequestBody(BaseModel):
    sales_months: List[str] = Field(
        ..., description="List of sales months in YYYY-MM format"
    )
    weightages: Optional[Dict] = None
    db_codes: Optional[List[str]] = None

    @model_validator(mode="after")
    def validate_sales_months(self):
        sales_months = self.sales_months
        if not sales_months or len(sales_months) != 2:
            raise ValueError(
                "sales_months must contain exactly two months in YYYY-MM format"
            )
        return self


class AutoClosureSync(BaseModel):
    gt: Optional[bool] = False
    mt_ecom: Optional[bool] = False


class PostProgramApi(BaseModel):
    forecast_month: Optional[str] = None
    stock_norm_sync: Optional[bool] = True
    forecast_total_sync: Optional[bool] = True
    forecast_allocation_sync: Optional[bool] = True


class UniformForecastPhasing(BaseModel):
    w1: float
    w2: float
    w3: float
    w4: float
    fn12: float
    fn34: float
    applicableMonth: str


class SoClosureStatus(BaseModel):
    so_list: List[str] = Field(..., description="List of sales orders numbers")
