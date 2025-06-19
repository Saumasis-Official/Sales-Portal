# Auth Application #
```
A backend micro-service in NodeJS and Express web framework to provide REST APIs to validate distributor and different types of admin and also maintain migration scripts.

```

# Application Execution

```
git clone https://git-codecommit.ap-south-1.amazonaws.com/v1/repos/sales-portal-auth
npm install
npm run dev
```

# Application configuration

```
Add following variables in .env file:

DATABASE_URL="postgres://******:******@******:****/******"
PGSQL_HOST='******'
PGSQL_DATABASE_NAME='******'
PGSQL_USERNAME='******'
PGSQL_PASSWORD='******'
PGSQL_PORT='****'
AUTH_SERVICE_PORT=3001
NODE_ENV='dev'
FE='localhost:3000'
SECRET_KEY='******'
MMX_API_URL='https://api.tatacommunications.com/mmx/v1/messaging/sms'
MMX_USER='******'
MMX_PASSWORD='******'
SECRET_KEY='******'
SES_ACCESS_KEY_ID='******'
SES_REGION='eu-west-1'
SES_SECRET_ACCESS_KEY='******'
COGNITO_CLIENT_ID='******'
COGNITO_IDP_NAME='dev-pegasus-azurecognito-idp_'
API_BASE_PATH='http://localhost:3005'
RETRY_OTP_COUNT_LIMIT='3'
RETRY_OTP_INTERVAL_LIMIT='30'
INVALID_OTP_COUNT_LIMIT='3'
INVALID_OTP_INTERVAL_LIMIT='30'
```

# Application NPM Script

```
"start": "cd dist &&  nodemon server.js",
"prestart": "tsc && cp -r uploads dist/ && cp -r app/global dist/app/",
"clean" : "rm -rf dist",
"copy" : "cp -r uploads dist/ && cp -r app/global dist/app/"
```
