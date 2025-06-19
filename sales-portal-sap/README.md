# SAP Integration Application #
```
A backend micro-service in NodeJS and Express web framework to provide REST APIs to interact with the SAP APIs of TCPL. These apis helps us to validate and place an order, reorder, fetch credit limit details of a distributor, fetch shipping and unloading points, sales order details, update mobile number and email id of distributors and perform various types of syncing activities like distributor master sync, product sync, sales hierarchy sync and sales orders sync.
```

# Application Execution

```
git clone https://git-codecommit.ap-south-1.amazonaws.com/v1/repos/sales-portal-sap
npm install
npm run dev
```

# Application configuration

```
Add following variables in .env file:

NODE_ENV='dev'
DATABASE_URL="postgres://=******:******@******:****/******"
PGSQL_HOST='localhost'
PGSQL_DATABASE_NAME='******'
PGSQL_USERNAME='******'
PGSQL_PASSWORD='******'
PGSQL_PORT='****'
SAP_SERVICE_PORT='3005'
SECRET_KEY='******'
SAP_CREATE_API="https://s4hanaqua.tataconsumer.com:1443/sap/opu/odata/SAP/ZSD_SALES_ORDER_CRT_SRV/SalesHeaderSet?sap-client=400&sap-language=EN"
SAP_VALIDATE_API="https://s4hanaqua.tataconsumer.com:1443/sap/opu/odata/SAP/ZSD_SALES_ORDER_SIMULATION_SRV/HeaderSet?sap-client=400&sap-language=EN"
SAP_AUTH_USERNAME='******'
SAP_AUTH_PASSWORD='******'
UPDATE_EMAIL_MOBILE='https://s4hanaqua.tataconsumer.com:1443/sap/opu/odata/SAP/ZSD_SALES_REORDER_SRV/Pull_SOSet'
SES_ACCESS_KEY_ID='******'
SES_REGION='eu-west-1'
SES_SECRET_ACCESS_KEY='******'
WAREHOUSE_DETAILS_FETCH_FAILED_MAILID='harshit.wadhwa@tothenew.com,rahul.upadhyay@tothenew.com'
SAP_WAREHOUSE_DETAILS_API='https://S4hanapocapi.tataconsumer.com:443/sap/opu/odata/SAP/ZSD_SHIPTO_UNLOAD_POINT_SRV/InputSet'
SAP_MATERIALS_API='https://S4hanapocapi.tataconsumer.com:443/sap/opu/odata/SAP/ZSD_PRODUCT_MASTER_SALES_PORT_SRV/ResultSet'
SAP_OPEN_SO_API='https://S4hanapocapi.tataconsumer.com:443/sap/opu/odata/SAP/ZSD_SO_LANDING_SRV/Sales_infoSet'
SAP_DISTRIBUTOR_API='https://S4hanapocapi.tataconsumer.com:443/sap/opu/odata/SAP/ZSD_DISTRIBUTOR_MASTER_SRV/ResultSet'
SAP_SO_DETAILS_API='https://S4hanapocapi.tataconsumer.com:443/sap/opu/odata/SAP/ZSD_SO_LANDING_SRV/Sales_order_information_dataSet'
SAP_SALES_ORDER_DELIVERY_API='https://s4hanapocapi.tataconsumer.com:443/sap/opu/odata/SAP/ZSD_SO_LANDING_SRV/Delivery_InofSet'
SAP_SALES_ORDER_INVOICE_API='https://s4hanapocapi.tataconsumer.com:443/sap/opu/odata/SAP/ZSD_SO_LANDING_SRV/Invoice_InfoSet'
SAP_SALES_HIERARCHY_API='https://api5.successfactors.eu/odata/v2/User'
SAP_SH_AUTH_USERNAME='******'
SAP_SH_AUTH_PASSWORD='******'
SAP_CREDIT_LIMIT_API='https://s4hanaqua.tataconsumer.com:1443/sap/opu/odata/SAP/ZSD_CREDIT_LIMIT_SRV/InputSet'
COGNITO_CLIENT_ID='******'
COGNITO_IDP_NAME='dev-pegasus-azurecognito-idp_'
SAP_UPDATE_EMAIL_MOBILE_API='https://S4hanapocapi.tataconsumer.com:443/sap/opu/odata/SAP/ZSD_UPDATE_DISTRIBUTOR_SRV/Updateset'
REPORT_PORTAL_ERROR_MAILIDS='*****@tataconsumer.com,******@gmail.com'
SAP_REORDER_API='https://S4hanapocapi.tataconsumer.com:443/sap/opu/odata/SAP/ZSD_SALES_REORDER_SRV/Pull_SOSet'
DISTRIBUTOR_INVENTORY_SYNC_AWS_ACCESS_KEY_ID='*********'
DISTRIBUTOR_INVENTORY_SYNC_AWS_SECRET_ACCESS_KEY='**********'
DISTRIBUTOR_INVENTORY_SYNC_AWS_REGION='ap-south-1'
DISTRIBUTOR_INVENTORY_SYNC_AWS_S3_BUCKET='tcpl-datalake-app'
DISTRIBUTOR_INVENTORY_SYNC_AWS_S3_FOLDER_PATH='FORECAST'
```

# Application NPM Script

```
"start": "cd dist &&  nodemon server.js",
"prestart": "tsc &&  cp -r app/global dist/app/",
"clean" : "rm -rf dist",
"copy" : " cp -r app/global dist/app/"
```

