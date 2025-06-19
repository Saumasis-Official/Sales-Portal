# Service for tcpl ordering system

# Order Application

```
A backend micro-service in NodeJS and Express web framework to provide REST APIs to fetch materials, purchase orders, their details and update material tags. It also maintains migration scripts for project database initialisation.

````

# Application Execution

```
git clone https://git-codecommit.ap-south-1.amazonaws.com/v1/repos/sales-portal-order
npm install
npm run dev

````

# Application configuration

```
Add following variables in .env file:

DATABASE_URL="postgres://******:******@******:****/******"
PGSQL_HOST='******'
PGSQL_DATABASE_NAME='******'
PGSQL_USERNAME='******'
PGSQL_PASSWORD='******'
PGSQL_PORT='****'
ORDER_SERVICE_PORT='3004'
SECRET_KEY='******'
SAP_AUTH_USERNAME='******'
SAP_AUTH_PASSWORD='******'
UPDATE_EMAIL_MOBILE='https://s4hanaqua.tataconsumer.com:1443/sap/opu/odata/SAP/ZSD_SALES_REORDER_SRV/Pull_SOSet'
OPEN_SO_API='http://localhost:3005/sap/api/v1/util/so-sync'
COGNITO_CLIENT_ID='******'
COGNITO_IDP_NAME='dev-pegasus-azurecognito-idp_'

````

# Application NPM Script

```
"start": "cd dist &&  nodemon server.js",
"prestart": "tsc && cp -r uploads dist/ && cp -r app/global dist/app/",
"clean" : "rm -rf dist",
"copy" : "cp -r uploads dist/ && cp -r app/global dist/app/"

````

