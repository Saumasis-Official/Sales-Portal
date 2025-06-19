from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class OrderDate(BaseModel):
    allowed_to_order: bool
    order_start_date: Optional[datetime] = None
    order_end_date: Optional[datetime] = None
    order_start_time: Optional[str] = None
    order_end_time: Optional[str] = None
    error_message: Optional[str] = None
    pdp_date: Optional[datetime] = None

class PDPRestriction(BaseModel):
    key: str
    enable_value: str
    disable_value: str
    value: bool


class DBLevelPDPRestrictions(BaseModel):
    value: bool


class PDPDayConfig(BaseModel):
    key1: str
    key2: str
    order_window: Optional[str] = None
    order_placement_end_time: Optional[str] = None
    order_window_exception: Optional[str] = None
    order_placement_end_time_exception: Optional[str] = None


class PDPDayWise(BaseModel):
    THRESHOLD_FREQUENCY: int
    MO: PDPDayConfig
    TU: PDPDayConfig
    WE: PDPDayConfig
    TH: PDPDayConfig
    FR: PDPDayConfig
    SA: PDPDayConfig
    SU: PDPDayConfig


class PDPConfig(BaseModel):
    pdp_restriction: bool = False
    db_level_pdp_restrictions: bool = False
    pdp_weekly: PDPDayWise
    pdp_fortnightly: PDPDayWise


class PDPOrderWindowDTO(BaseModel):
    order_start: datetime
    order_end: datetime

class PDPOrderWindowWeekly(BaseModel):
    MO: PDPOrderWindowDTO
    TU: PDPOrderWindowDTO
    WE: PDPOrderWindowDTO
    TH: PDPOrderWindowDTO
    FR: PDPOrderWindowDTO
    SA: PDPOrderWindowDTO
    SU: PDPOrderWindowDTO


class PDPOrderWindowRegionDTO(BaseModel):
    pdp_we_general: PDPOrderWindowWeekly
    days_with_window_ending_today: List
    threshold_frequency: int
    pdp_we_exception: PDPOrderWindowWeekly
    days_with_window_ending_today_exception: List


class PDPWindows:
    pdp_config: PDPConfig = None

    def __init__(self) -> None:
        self.pdp_config = PDPConfig(
            pdp_restriction=False,
            db_level_pdp_restrictions=False,
            pdp_weekly=PDPDayWise(
                THRESHOLD_FREQUENCY=-1,
                MO=PDPDayConfig(
                    key1="order_window_mo", key2="order_placement_end_time_mo"
                ),
                TU=PDPDayConfig(
                    key1="order_window_tu",
                    key2="order_placement_end_time_tu",
                ),
                WE=PDPDayConfig(
                    key1="order_window_we",
                    key2="order_placement_end_time_we",
                ),
                TH=PDPDayConfig(
                    key1="order_window_th",
                    key2="order_placement_end_time_th",
                ),
                FR=PDPDayConfig(
                    key1="order_window_fr",
                    key2="order_placement_end_time_fr",
                ),
                SA=PDPDayConfig(
                    key1="order_window_sa",
                    key2="order_placement_end_time_sa",
                ),
                SU=PDPDayConfig(
                    key1="order_window_su",
                    key2="order_placement_end_time_su",
                ),
            ),
            pdp_fortnightly=PDPDayWise(
                THRESHOLD_FREQUENCY=-1,
                MO=PDPDayConfig(
                    key1="order_window_mo",
                    key2="order_placement_end_time_mo",
                ),
                TU=PDPDayConfig(
                    key1="order_window_tu",
                    key2="order_placement_end_time_tu",
                ),
                WE=PDPDayConfig(
                    key1="order_window_we",
                    key2="order_placement_end_time_we",
                ),
                TH=PDPDayConfig(
                    key1="order_window_th",
                    key2="order_placement_end_time_th",
                ),
                FR=PDPDayConfig(
                    key1="order_window_fr",
                    key2="order_placement_end_time_fr",
                ),
                SA=PDPDayConfig(
                    key1="order_window_sa",
                    key2="order_placement_end_time_sa",
                ),
                SU=PDPDayConfig(
                    key1="order_window_su",
                    key2="order_placement_end_time_su",
                ),
            ),
        )

    def setPdpWindowSettings(self, pdp_windows):
        if pdp_windows:
            for window in pdp_windows:
                config = (
                    self.pdp_config.pdp_weekly
                    if window["pdp_type"] == "WE"
                    else self.pdp_config.pdp_fortnightly
                )
                if int(window["threshold_frequency"]) == -1:
                    for day in config.__fields__:
                        if day != "THRESHOLD_FREQUENCY":
                            day_config = getattr(config, day)
                            setattr(
                                day_config,
                                "order_window",
                                window[getattr(day_config, "key1")],
                            )
                            setattr(
                                day_config,
                                "order_placement_end_time",
                                window[getattr(day_config, "key2")],
                            )
                else:
                    config.THRESHOLD_FREQUENCY = int(window["threshold_frequency"])
                    for day in config.__fields__:
                        if day != "THRESHOLD_FREQUENCY":
                            day_config = getattr(config, day)
                            setattr(
                                day_config,
                                "order_window_exception",
                                window[getattr(day_config, "key1")],
                            )
                            setattr(
                                day_config,
                                "order_placement_end_time_exception",
                                window[getattr(day_config, "key2")],
                            )
