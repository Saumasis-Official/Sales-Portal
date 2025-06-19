from datetime import datetime, timedelta
from typing import List, Optional

import pandas as pd

from src.dto.pdp_dto import (
    OrderDate,
    PDPWindows,
    PDPDayWise,
    PDPOrderWindowDTO,
    PDPOrderWindowRegionDTO,
    PDPConfig,
    PDPDayConfig,
)


class PDPHelper:

    def pdp_frequency_counter(self, pdp: str, applicable_days: List = None) -> int:
        days = (
            ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]
            if applicable_days is None
            else applicable_days
        )
        return len([day for day in days if day in pdp])

    def nearest_pdp_day(self, pdp: str) -> str:
        days = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]
        today = datetime.now()
        today_week_day = today.weekday()
        # Concatenate the list with itself to make it circular
        circular_days = days[today_week_day:] + days[:today_week_day]

        for day in circular_days:
            if day in pdp:
                return day

    def day_wise_pdp_window(self, region_pdp_settings):
        """
        This function is to find the days for which PDP order window will end today
        This only works for weekly PDP
        For fortnightly PDP, we need to check the fortnightly PDP day at individual DB level
        """
        days = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]
        today = datetime.now()
        region_order_windows = {}

        for region_id in region_pdp_settings.keys():
            days_window_ending_today = []
            days_window_ending_today_exception = []
            pdp_we_general = {}
            pdp_we_exception = {}
            pdp_setting: PDPWindows = region_pdp_settings[region_id]
            for day in days:
                order_date: OrderDate = self.check_order_allowed_we_pdp(
                    day,
                    today,
                    8,
                    pdp_setting,
                )
                pdp_we_general[day] = PDPOrderWindowDTO(
                    order_start=order_date.order_start_date,
                    order_end=order_date.order_end_date,
                )
                if order_date.order_end_date.date() == today.date():
                    days_window_ending_today.append(day)

                order_date_for_exception: OrderDate = self.check_order_allowed_we_pdp(
                    day,
                    today,
                    pdp_setting.pdp_weekly.THRESHOLD_FREQUENCY,
                    pdp_setting,
                )
                pdp_we_exception[day] = PDPOrderWindowDTO(
                    order_start=order_date_for_exception.order_start_date,
                    order_end=order_date_for_exception.order_end_date,
                )
                if order_date_for_exception.order_end_date.date() == today.date():
                    days_window_ending_today_exception.append(day)

            region_order_windows[region_id] = PDPOrderWindowRegionDTO(
                pdp_we_general=pdp_we_general,
                days_with_window_ending_today=days_window_ending_today,
                threshold_frequency=pdp_setting.pdp_weekly.THRESHOLD_FREQUENCY,
                pdp_we_exception=pdp_we_exception,
                days_with_window_ending_today_exception=days_window_ending_today_exception,
            )

        return region_order_windows

    def division_wise_order_window_fortnightly(self, div_pdp, pdp_window: PDPConfig):
        """
        Description: This functions will accept the DIVISION x PDP combination and the pdp_windows settings
            - Output will be a dist of applicable divisions with their respective order start and end window
        """
        today = datetime.now()
        div_order_windows = {}
        for div in div_pdp.keys():
            pdp = div_pdp[div]["pdp"]
            pdp_type = pdp[:2]
            pdp_days = pdp[2:]
            reference_date = div_pdp[div].get("reference_date")
            res: OrderDate = self.check_pdp_day(pdp, pdp_window, reference_date)
            if (
                getattr(res, "order_end_date")
                and getattr(res, "order_end_date").date() == today.date()
            ):
                order_window = PDPOrderWindowDTO(
                    order_start=getattr(res, "order_start_date"),
                    order_end=getattr(res, "order_end_date"),
                )
                div_order_windows[div] = order_window
        return div_order_windows

    def check_pdp_day(
        self,
        pdp_day: str,
        pdp_config: PDPConfig,
        reference_date: Optional[str] = None,
        today=datetime.now(),
    ) -> OrderDate:
        # TODO: NEED TO THOROUGHLY TEST PDP LOGIC, WHETHER IT IS ABLE TO PICK UP DATE WHERE ORDER WINDOW IS ENDING TODAY
        # Check if any parameter is missing then return null
        if not pdp_day:
            return OrderDate(allowed_to_order=False)

        pdp_type = pdp_day[:2]
        pdp_day = pdp_day[2:]

        # Check if pdpType is valid and pdpDays are present
        if (pdp_type not in ["WE", "FN"]) or not pdp_day:
            return OrderDate(allowed_to_order=False)

        all_upcoming_order_dates: List[OrderDate] = []
        all_allowed_order_dates: List[OrderDate] = []
        days = {"SU": 0, "MO": 1, "TU": 2, "WE": 3, "TH": 4, "FR": 5, "SA": 6}
        pdp_frequency = self.pdp_frequency_counter(pdp_day)
        for day in days.keys():
            if day in pdp_day:
                if pdp_type == "WE":
                    result: OrderDate = self.check_order_allowed_we_pdp(
                        day, today, pdp_frequency, pdp_config
                    )
                else:
                    result: OrderDate = self.check_order_allowed_fn_pdp(
                        day, reference_date, today, pdp_frequency, pdp_config
                    )
                if getattr(result, "allowed_to_order"):
                    all_allowed_order_dates.append(result)
                else:
                    all_upcoming_order_dates.append(result)

        if all_allowed_order_dates:
            earliest_order_dates = min(
                all_allowed_order_dates, key=lambda x: getattr(x, "order_start_date")
            )
            return earliest_order_dates
            # return OrderDate(
            #     allowed_to_order=getattr(earliest_order_dates, "allowed_to_order"),
            #     order_start_date=getattr(earliest_order_dates, "order_start_date"),
            #     order_end_date=getattr(earliest_order_dates, "order_end_date"),
            #     order_start_time=getattr(
            #         earliest_order_dates, "order_start_date"
            #     ).strftime("%I:%M %p"),
            #     order_end_time=getattr(earliest_order_dates, "order_end_date").strftime(
            #         "%I:%M %p"
            #     ),
            #     pdp_date=getattr(earliest_order_dates, "pdp_date"),
            # )

            #     {
            #     "allowed_to_order": earliest_order_dates["allowed_to_order"],
            #     "order_start_date": earliest_order_dates["order_start_date"],
            #     "order_end_date": earliest_order_dates["order_end_date"],
            #     "order_start_time": earliest_order_dates["order_start_date"].strftime(
            #         "%I:%M %p"
            #     ),
            #     "order_end_time": earliest_order_dates["order_end_date"].strftime(
            #         "%I:%M %p"
            #     ),
            #     "pdp_date": earliest_order_dates["pdp_date"],
            # }

        if all_upcoming_order_dates:
            earliest_order_dates = min(
                all_upcoming_order_dates, key=lambda x: getattr(x, "order_start_date")
            )
            return earliest_order_dates
            # return OrderDate(
            #     allowed_to_order=getattr(earliest_order_dates, "allowed_to_order"),
            #     order_start_date=getattr(earliest_order_dates, "order_start_date"),
            #     order_end_date=getattr(earliest_order_dates, "order_end_date"),
            #     order_start_time=getattr(
            #         earliest_order_dates, "order_start_date"
            #     ).strftime("%I:%M %p"),
            #     order_end_time=getattr(earliest_order_dates, "order_end_date").strftime(
            #         "%I:%M %p"
            #     ),
            #     pdp_date=getattr(earliest_order_dates, "pdp_date"),
            # )

            #     {
            #     "allowed_to_order": earliest_order_dates["allowed_to_order"],
            #     "order_start_date": earliest_order_dates["order_start_date"],
            #     "order_end_date": earliest_order_dates["order_end_date"],
            #     "order_start_time": earliest_order_dates["order_start_date"].strftime(
            #         "%I:%M %p"
            #     ),
            #     "order_end_time": earliest_order_dates["order_end_date"].strftime(
            #         "%I:%M %p"
            #     ),
            #     "pdp_date": earliest_order_dates["pdp_date"],
            #     "errorMessage": (
            #         f"PDP: {pdp_type}{pdp_day}, Reference Date : {reference_date}"
            #         if reference_date and pdp_type == "FN"
            #         else f"PDP: {pdp_type}{pdp_day}"
            #     ),
            # }

        return OrderDate(allowed_to_order=False)

    def check_order_allowed_we_pdp(
        self, day: str, today: datetime, pdp_frequency: int, pdp_config: PDPWindows
    ) -> OrderDate:
        pdp_day_config: PDPDayWise = getattr(pdp_config.pdp_weekly, day)
        order_window = pdp_day_config.order_window
        order_placement_end_time = pdp_day_config.order_placement_end_time
        order_window_exception = pdp_day_config.order_window_exception
        order_placement_end_time_exception = (
            pdp_day_config.order_placement_end_time_exception
        )

        if pdp_frequency <= pdp_config.pdp_weekly.THRESHOLD_FREQUENCY:
            order_window = order_window_exception or order_window
            order_placement_end_time = (
                order_placement_end_time_exception or order_placement_end_time
            )

        order_window_hour = int(order_window.split(":")[0])
        order_window_minutes = int(order_window.split(":")[1])
        order_placement_end_time_hour = int(order_placement_end_time.split(":")[0])
        order_placement_end_time_minutes = int(order_placement_end_time.split(":")[1])

        days = {"SU": 0, "MO": 1, "TU": 2, "WE": 3, "TH": 4, "FR": 5, "SA": 6}

        python_weekday = today.weekday()
        # Adjusts Monday (0) to Sunday (6) to match JavaScript's convention 0 (Sunday) to 6 (Saturday)
        js_day = (python_weekday + 1) % 7
        today_week_day = js_day
        pdp_week_day = days[day]

        if (pdp_week_day - today_week_day) < 0 or (
            (pdp_week_day - today_week_day) == 0
            and order_placement_end_time_hour < today.hour
        ):
            upcoming_pdp_day = (pdp_week_day - today_week_day) + 7
        else:
            upcoming_pdp_day = pdp_week_day - today_week_day

        order_start_date = today
        order_end_date = today
        pdp_date = today

        def calculate_order_end_date(upcoming_pdp_day):
            nonlocal order_end_date, pdp_date
            order_end_date += timedelta(days=upcoming_pdp_day)
            order_end_date = order_end_date.replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            pdp_date = order_end_date
            order_end_date += timedelta(
                hours=order_placement_end_time_hour,
                minutes=order_placement_end_time_minutes,
            )

        calculate_order_end_date(upcoming_pdp_day)

        if order_end_date <= today:
            addition_days = (
                8 if upcoming_pdp_day == 0 and order_placement_end_time_hour < 0 else 7
            )
            calculate_order_end_date(upcoming_pdp_day + addition_days)

        order_start_date = order_end_date - timedelta(
            hours=order_window_hour, minutes=order_window_minutes
        )

        order_start_time = order_start_date.strftime("%I:%M %p")
        order_end_time = order_end_date.strftime("%I:%M %p")

        allowed_to_order = order_start_date <= today <= order_end_date

        return OrderDate(
            allowed_to_order=allowed_to_order,
            order_start_date=order_start_date,
            order_end_date=order_end_date,
            order_start_time=order_start_time,
            order_end_time=order_end_time,
            pdp_date=pdp_date,
        )

    def check_order_allowed_fn_pdp(
        self, day, reference_date, today, pdp_frequency, pdp_config: PDPConfig
    ):
        """
        Check if order is allowed based on PDP configuration.
        """
        if not day:
            return OrderDate(allowed_to_order=False)
        if not reference_date or reference_date == "00000000":
            return OrderDate(allowed_to_order=False)

        order_start_date = today
        order_end_date = today
        pdp_date = today
        today_week_day = today.weekday()

        pdp_fortnightly: PDPDayConfig = getattr(pdp_config.pdp_fortnightly, day)
        order_window = pdp_fortnightly.order_window
        order_placement_end_time = pdp_fortnightly.order_placement_end_time
        order_window_exception = pdp_fortnightly.order_window_exception
        order_placement_end_time_exception = (
            pdp_fortnightly.order_placement_end_time_exception
        )

        if pdp_frequency <= pdp_config.pdp_fortnightly.THRESHOLD_FREQUENCY:
            order_window = order_window_exception or order_window
            order_placement_end_time = (
                order_placement_end_time_exception or order_placement_end_time
            )

        order_window_hour, order_window_minutes = map(int, order_window.split(":"))
        order_placement_end_time_hour, order_placement_end_time_minutes = map(
            int, order_placement_end_time.split(":")
        )

        ref_date = datetime.strptime(reference_date, "%Y%m%d")
        today_week_number = pd.Timestamp(today).week
        upcoming_pdp_date = ref_date
        upcoming_pdp_date_week_number = pd.Timestamp(upcoming_pdp_date).week

        def calculate_order_end_date(upcoming_pdp_date):
            nonlocal order_end_date, pdp_date
            order_end_date = upcoming_pdp_date.replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            pdp_date = order_end_date
            order_end_date += timedelta(
                hours=order_placement_end_time_hour,
                minutes=order_placement_end_time_minutes,
            )

        while (
            upcoming_pdp_date.year < today.year
            or (
                upcoming_pdp_date.year == today.year
                and upcoming_pdp_date_week_number < today_week_number
            )
            or (
                upcoming_pdp_date.year == today.year
                and upcoming_pdp_date_week_number == today_week_number
                and upcoming_pdp_date.weekday() < today_week_day
            )
            or (
                upcoming_pdp_date.year == today.year
                and upcoming_pdp_date_week_number == today_week_number
                and upcoming_pdp_date.weekday() >= today_week_day
                and order_end_date < today
            )
        ):
            upcoming_pdp_date += timedelta(days=14)
            upcoming_pdp_date_week_number = pd.Timestamp(upcoming_pdp_date).week
            calculate_order_end_date(upcoming_pdp_date)

        order_start_date = order_end_date - timedelta(
            hours=order_window_hour, minutes=order_window_minutes
        )

        order_start_time = order_start_date.strftime("%I:%M %p")
        order_end_time = order_end_date.strftime("%I:%M %p")

        allowed_to_order = order_start_date <= today <= order_end_date

        return OrderDate(
            allowed_to_order=allowed_to_order,
            order_start_date=order_start_date,
            order_end_date=order_end_date,
            order_start_time=order_start_time,
            order_end_time=order_end_time,
            pdp_date=pdp_date,
        )
