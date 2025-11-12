// ensure-security-group

const core = require('@actions/core');
const msal = require('@azure/msal-node');


(async () => {

    core.startGroup("ensure-security-group");

    const authority = core.getInput("authority");
    const tenant_id = core.getInput("tenant_id");
    const client_secret = core.getInput("client_secret");
    const client_id = core.getInput("client_id");
    const cloud = core.getInput("cloud");  
    
    await executeAction(authority, client_id,client_secret,tenant_id, cloud);

    core.endGroup();    

})().
catch (error => {
    core.endGroup();  
    core.setFailed(error.message);
});

export default async function executeAction (authority, client_id, client_secret, tenant_id, cloud)
{

    core.info("currently running ensure-security-group")


}