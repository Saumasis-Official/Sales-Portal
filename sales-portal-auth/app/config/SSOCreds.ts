// const credsConfig = {
//     // Requried. Tenent-specific endpoint is required.
//     identityMetadata: 'https://login.microsoftonline.com/229ac06f-e538-4b86-a066-6cda9feef9ed.onmicrosoft.com/v2.0/.well-known/openid-configuration',
//     // or 'https://login.microsoftonline.com/<your_tenant_guid>/v2.0/.well-known/openid-configuration'

//     // Required
//     clientID: 'edc81980-ed44-45a9-8707-8b5e305b7e5f',

//     // Required
//     validateIssuer: true,

//     // Required. 
//     // Set to true if you use `function(req, token, done)` as the verify callback.
//     // Set to false if you use `function(req, token)` as the verify callback.
//     passReqToCallback: false,

//     // Required to be true to use B2C
//     isB2C: true,

//     // Required to use B2C
//     policyName: 'B2C_1_TCPL_postmanClient',

//     // Optional, we use the issuer from metadata by default
//     issuer: null,

//     // Optional, default value is clientID
//     audience: null,

//     // Optional. Default value is false.
//     // Set to true if you accept access_token whose `aud` claim contains multiple values.
//     allowMultiAudiencesInToken: false,

//     // Optional. 'error', 'warn' or 'info'
//     loggingLevel: 'info',
// };

// export default credsConfig;