// root index.js

const core = require('@actions/core');
const msal = require('@azure/msal-node');


(async () => {

    const authority = core.getInput("authority");
    const tenant_id = core.getInput("tenant_id");
    const client_secret = core.getInput("client_secret");
    const client_id = core.getInput("client_id");
    const scope = core.getInput("scope");  
    
    await executeAction(authority, client_id,client_secret,tenant_id, scope);

})().
catch (error => {
   core.setFailed(error.message);
});

export default async function executeAction (authority, client_id, client_secret, tenant_id, scope)
{

    const tenantAuthority = new URL(tenant_id, authority)

    const msalConfig  = {
        auth: {
            clientId: client_id,
            authority: tenantAuthority.toString(),
            clientSecret: client_secret,
        },
    };

    const tokenRequest = {
        scopes: [scope],
    };

    const cca = new msal.ConfidentialClientApplication(msalConfig);
    
    const acquireTokenResult = await cca.acquireTokenByClientCredential(tokenRequest)

    const bearer = `bearer ${acquireTokenResult.accessToken}`;  

    core.setOutput('authorization_header', bearer);   

}