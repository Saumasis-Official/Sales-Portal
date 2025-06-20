"""
Constants declared here.
"""

EMAIL_LIST = ["kiran.hebballi@tataconsumer.com", "mayukh.maity@tataconsumer.com"]
CUSTOMER_GROUPS_FOR_ARS = ["10", "11", "31", "48", "52", "62", "63", "69", "70"]
SUB_CHANNEL_FOR_ARS = ["GTDB", "GTSS", "SSDB", "PCDB","PCSS", "MTST"]
ESSENTIAL_DATALAKE_TABLES = {
    "STOCK_IN_HAND": [
        "PRD_SALES_DM_DB.SALES_DM_BR.CLOSING_STOCKS_HIST_STAGING",
        "PRD_SAPS4_DB.SAPS4_CORE.PRODUCTMASTER_PSKU",
    ],
    "STOCK_IN_TRANSIT": ["PRD_SALES_DM_DB.SALES_DM_CORE.STOCK_IN_TRANSIT"],
    "OPEN_ORDER": ["PRD_SALES_DM_DB.SALES_DM_CORE.OPEN_ORDDER_ARS"],
    "FORECAST": [
        "PRD_SALES_DM_DB.SALES_DM_BR.PRIMARY_SALES_FACT_TCPL_IND",
        "PRD_SALES_DM_DB.SALES_DM_BR.CUSTOMER_HIERARCHY_TCPL_IND",
        "PRD_SAPS4_DB.SAPS4_CORE.CUSTOMERMASTER",
        "PRD_SAPS4_DB.SAPS4_CORE.PRODUCT",
    ],
}
ORDER_TYPE_PREFIX = {
    "NORMAL": ["DBO"],
    "LIQUIDATION": ["LIQ"],
    "ARS": ["AOR", "AOS"],
    "RUSH": ["RO"],
    "BULK": ["BO"],
    "SELF_LIFTING": ["SFL"],
    "CALL_CENTER": ["CCO"],
    "SAP_REG": ["DBO", "LIQ", "AOR", "AOS", "RO", "BO", "SFL", "CCO"],
    "SAP_LIQ": ["DBO", "LIQ", "AOR", "AOS", "RO", "BO", "SFL", "CCO"],
}

SAP_DIRECT_ORDER_TYPES = ["SAP_REG", "SAP_LIQ"]

