// ensure-entraid-tenant


const core = require('@actions/core');
const {FsnxApiClient} = require('../../lib/FsnxApiClient.js');

//const msal = require('@azure/msal-node');

(async () => {

    core.startGroup("ensure-entraid-tenant");

    const args = 
    {
    authority: core.getInput("authority"),
    tenant_id: core.getInput("tenant_id"),
    client_secret: core.getInput("client_secret"),
    client_id: core.getInput("client_id"),
    cloud: core.getInput("cloud"),  
    output_private_key: core.getInput("output_private_key"),
    event_path: core.getInput("event_path"),         

    }

    await executeAction(args);

    core.endGroup();    

})().
catch (error => {
    core.endGroup();  
    core.setFailed(error.message);
});

async function executeAction (args)
{

    core.info("currently running ensure-entraid-tenant");

    const fsnxClient = new FsnxApiClient(args);

    core.info(JSON.stringify(fsnxClient.EventInput));

    await fsnxClient.OnStep("get-tenant-organization", async () => {


        // Process Actions    
        const getOrgResponse = await fsnxClient.ExecuteHttpAction("get-organization");

        const getSpResponse = await fsnxClient.ExecuteHttpAction("serviceprincipal-list-by-appid");

        const output = 
        {
            organization: getOrgResponse.body,
            servicePrincipals: getSpResponse.body
        };

        fsnxClient.SubmitOutput (output)

    });


}

module.exports = 
{
  executeAction,
}