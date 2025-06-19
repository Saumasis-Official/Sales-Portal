from typing import List, Tuple


class Filters:

    def __init__(
        self
    ):
        self.kams: str = ""
        self.limit: int = 0
        self.offset: int = 0
        self.customer_codes:Tuple[int] = ()
        self.plant_codes:Tuple[int] = ()
        self.vendor_codes:Tuple[int] = ()
        self.psku:Tuple[int] = ()
        self.sku:Tuple[int] = ()
        self.site_codes:Tuple[str] = ()
        self.regions:Tuple[str] = ()
        self.article_ids:Tuple[str] = ()
        self.customer_name: str = ""

    def set_kams(self, kams: str):
        self.kams = kams

    def set_limit(self, limit: int):
        self.limit = limit

    def set_offset(self, offset: int):
        self.offset = offset

    def set_customer_codes(self, customer_codes: str):
        # convert csv value of customer_codes to tuple of int.
        self.customer_codes = tuple(map(int, customer_codes.split(','))) if customer_codes else None

    def set_plant_codes(self, plant_codes: str):
        self.plant_codes = tuple(map(str, plant_codes.split(','))) if plant_codes else None

    def set_vendor_codes(self, vendor_codes: str):
        self.vendor_codes = tuple(map(str, vendor_codes.split(','))) if vendor_codes else None

    def set_psku(self, psku: str):
        self.psku = tuple(map(str, psku.split(','))) if psku else None

    def set_sku(self, sku: str):
        self.sku = tuple(map(str, sku.split(','))) if sku else None

    def set_site_codes(self, site_codes: str):
        self.site_codes = tuple(site_codes.split(',')) if site_codes else None

    def set_regions(self, regions: str):
        self.regions = tuple(regions.split(',')) if regions else None

    def set_article_ids(self, article_ids: str):
        self.article_ids = tuple(article_ids.split(',')) if article_ids else None

    def set_customer_name(self, customer_name: str):
        self.customer_name = customer_name 
        
