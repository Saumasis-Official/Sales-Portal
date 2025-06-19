## TCPL distributor order management application

The platform should be able to serve as a single, unified portal for TCPL distributor order management.

#### Contribution Guidelines

You can find details about how to get started and other related information below.

**_Git_**

We follow [Semantic Commits](https://gist.github.com/joshbuchea/6f47e86d2510bce28f8e7f42ae84c716). So every message should follow the commit style mentioned in commitlint.config.js file.

When working on a new task, Please follow the set branch name strategy

`<feature|chore|fix|docs>_<feature_name>_<Tracker_Ticket_No>`

an example would be

`<fix_swimlane_#12765345>`

**_PR Guidelines_**

When working on a feature or chore or fix, always make sure to create the branch of dev, unless it's a special case such as an hotfix.

When you open a new pull request, please give descriptive comments on what work was done and some steps on how to test for other developers.

Make sure that there are no test cases that fail.

Before merging a PR, make sure that you hit `Squash & Merge` into develop. We'd like to keep a clean trail of our commit log in develop as this is used to prepare release notes for every release.

Make sure to add `[Finishes (#ticketNo)]` within the commit message before merging the PR as this would help in closing the ticket.

Feel free to add a Co-authored-by commit author if two or more people work on a feature.

**_GitFlow_**

We follow a standard gitflow.

`prod` - Points to what is in production
`uat` - Points to what is in UAT
`dev` - Points to the latest in development
`feature|bugs|chores` branches to work on features, bugs and chores
`hotfix` - To address a hotfix within master/uat. This fix needs to be updated onto dev as well (You can commit to dev and cherry pick to master/uat)

### Environment variables

REACT_APP_STAGE
REACT_APP_GA_ID
REACT_APP_CACHE_VERSION
REACT_APP_BASE_URL= 'https://devapi-pegasus.tataconsumer.com'
REACT_APP_CLIENT_ID
REACT_APP_POOL_ID
REACT_APP_DOMAIN
REACT_APP_COGNITO_IDP_NAME
REACT_APP_RECAPTCHA_KEY
REACT_APP_REDIRECT_SIGN_IN=http://localhost:3000/admin/dashboard
REACT_APP_REDIRECT_SIGN_OUT=http://localhost:3000 

Reach your tech lead or infra team to get the required values
#### Build Steps

**_CI/CD_**

To be updated
# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
