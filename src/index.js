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
    
    const token = await cca.acquireTokenByClientCredential(tokenRequest)
    
    console.warn(token);
    const bearer = `bearer ${token}`;  

    core.setOutput('authorization_header', bearer);   

}