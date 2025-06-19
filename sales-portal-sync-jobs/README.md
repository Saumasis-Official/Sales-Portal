# SAP Integration Application #
```
A backend micro-service in NodeJS and Express web framework to provide REST APIs to interact with the SYNC APIs of TCPL. These apis helps us to perform syncing activities like ROR sync.
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
SYNC_SERVICE_PORT='3010'
SECRET_KEY='******'
SAP_AUTH_USERNAME='******'
SAP_AUTH_PASSWORD='******'
UPDATE_EMAIL_MOBILE='https://s4hanaqua.tataconsumer.com:1443/sap/opu/odata/SAP/ZSD_SALES_REORDER_SRV/Pull_SOSet'
SES_ACCESS_KEY_ID='******'
SES_REGION='eu-west-1'
SES_SECRET_ACCESS_KEY='******'
SAP_OPEN_SO_API='https://S4hanapocapi.tataconsumer.com:443/sap/opu/odata/SAP/ZSD_SO_LANDING_SRV/Sales_infoSet'
SAP_DISTRIBUTOR_API='https://S4hanapocapi.tataconsumer.com:443/sap/opu/odata/SAP/ZSD_DISTRIBUTOR_MASTER_SRV/ResultSet'
SAP_SO_DETAILS_API='https://S4hanapocapi.tataconsumer.com:443/sap/opu/odata/SAP/ZSD_SO_LANDING_SRV/Sales_order_information_dataSet'

```

# Application NPM Script

```
"start": "cd dist &&  nodemon server.js",
"prestart": "tsc &&  cp -r app/global dist/app/",
"clean" : "rm -rf dist",
"copy" : " cp -r app/global dist/app/"
```

