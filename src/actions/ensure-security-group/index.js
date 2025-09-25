// ensure-security-group

const {getInput} = require('@actions/core');
const {startGroup} = require('@actions/core');
const {endGroup} = require('@actions/core');
const {setFailed} = require('@actions/core');
const {info} = require('@actions/core');
const core = require('@actions/core');

const FsnxApiClient = require('../../lib/FsnxApiClient.js');

//const msal = require('@azure/msal-node');


(async () => {

    startGroup("ensure-security-group");

    const authority = getInput("authority");
    const tenant_id = getInput("tenant_id");
    const client_secret = getInput("client_secret");
    const client_id = getInput("client_id");
    const cloud = getInput("cloud");  
    const eventPath = getInput("event_path");     
    
    await executeAction(authority, client_id,client_secret,tenant_id, cloud, eventPath);

    endGroup();    

})().
catch (error => {
    endGroup();  
    setFailed(error.message);
});

export default async function executeAction (authority, client_id, client_secret, tenant_id, cloud, eventPath)
{
    info("currently running ensure-security-group")

    const eventInput = require(eventPath);

    const actions = eventInput.client_payload.dispatch_payload.actions;

    // process action 1, upsert

    const upsertSecGrpAction = actions[0];

    info(`Adding or updating security group "${upsertSecGrpAction.payload.Content.Body.displayName}"`)
    const upsertresponse = await FsnxApiClient.ExecuteHttpAction(upsertSecGrpAction, authority,client_id,client_secret,tenant_id)

    const getSecGrpAction = actions[1];
    
    const getResponse = await FsnxApiClient.ExecuteHttpAction(getSecGrpAction, authority,client_id,client_secret,tenant_id)

    if (getResponse.ok) {
    core.setOutput(object_id,getResponse.body.id);
    }
    else
    {
        // throw some errors here.
    }

}