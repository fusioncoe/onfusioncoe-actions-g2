// ensure-security-group

const {getInput} = require('@actions/core');
const {startGroup} = require('@actions/core');
const {endGroup} = require('@actions/core');
const {setFailed} = require('@actions/core');
const {info} = require('@actions/core');
//const core = require('@actions/core');
//const msal = require('@azure/msal-node');


(async () => {

    startGroup("ensure-security-group");

    const authority = getInput("authority");
    const tenant_id = getInput("tenant_id");
    const client_secret = getInput("client_secret");
    const client_id = getInput("client_id");
    const cloud = getInput("cloud");  
    
    await executeAction(authority, client_id,client_secret,tenant_id, cloud);

    endGroup();    

})().
catch (error => {
    endGroup();  
    setFailed(error.message);
});

export default async function executeAction (authority, client_id, client_secret, tenant_id, cloud)
{
    info("currently running ensure-security-group")
}