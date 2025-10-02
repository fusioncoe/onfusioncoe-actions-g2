// ensure-entraid-tenant


const core = require('@actions/core');
//const msal = require('@azure/msal-node');

(async () => {

    startGroup("ensure-entraid-tenant");

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

export default async function executeAction (args)
{

    info("currently running ensure-entraid-tenant")

}