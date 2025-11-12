import core from '@actions/core';
import inputs from './.testinput/authenticate-cicd-serviceprincipal.json' assert { type: 'json' };
import * as msal from '@azure/msal-node';

const tenant_id = inputs.tenant_id;
const client_id = inputs.client_id;
const client_secret = inputs.client_secret;
const scope = inputs.scope;

const msalConfig  = {
    auth: {
        clientId: client_id,
        authority: `https://login.microsoftonline.com/${tenant_id}`,
        clientSecret: client_secret,
    },
};

const tokenRequest = {
    scopes: [scope],
};

(async () => {

const cca = new msal.ConfidentialClientApplication(msalConfig);

const token = await cca.acquireTokenByClientCredential(tokenRequest)

console.warn(token);
const bearer = `bearer ${token}`;  

})();

    

    
    
  





