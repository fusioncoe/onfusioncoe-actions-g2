// ensure-security-group

//const {getInput} = require('@actions/core');
//const {startGroup} = require('@actions/core');
//const {endGroup} = require('@actions/core');
//const {setFailed} = require('@actions/core');
//const {info} = require('@actions/core');
const core = require('@actions/core');


const {FsnxApiClient} = require('../../lib/FsnxApiClient.js');


//const msal = require('@azure/msal-node');


(async () => {

    core.startGroup("ensure-security-group");

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

    // const authority = getInput("authority");
    // const tenant_id = getInput("tenant_id");
    // const client_secret = getInput("client_secret");
    // const client_id = getInput("client_id");
    // const cloud = getInput("cloud");  
    // const output_private_key = getInput("output_private_key"); 
    // const event_path = getInput("event_path");     
    
    await executeAction(args);

    core.endGroup();    

})().
catch (error => {
    core.endGroup();  
    core.setFailed(error.message);
});

async function executeAction (args)
{
    core.info("currently running ensure-security-group");

    const fsnxClient = new FsnxApiClient(args);


    await fsnxClient.OnStep("upsert-security-group", async () => {

         //core.info(JSON.stringify(fsnxClient.EventInput));

        const upsertSecGrpAction = fsnxClient.Actions["group-patch-upsert"];

        core.info(`Adding or updating security group "${upsertSecGrpAction.payload.Content.Body.displayName}"`)
         // Process Actions    
        const upsertResponse = await fsnxClient.ExecuteHttpAction("group-patch-upsert");

        const getResponse = await fsnxClient.ExecuteHttpAction("group-get-by-uniquename-check");

        const output = {...getResponse.body};

        fsnxClient.SubmitOutput (output)

    });       

    await fsnxClient.OnStep("delete-security-group", async () => {

 
        const deleteResult = await fsnxClient.ExecuteHttpAction("delete-by-unique-name");

        core.info(JSON.stringify(deleteResult));

        const output = {
            ...deleteResult.body
        };

        fsnxClient.SubmitOutput (output)

    });      

    await fsnxClient.OnStep("restore-security-group", async () => {

 
        // Returns just a count.
        const countDeleted = await fsnxClient.ExecuteHttpAction("get-deleted-by-uniquename-count");

        core.info(`Count of deleted app registrations: ${countDeleted.body}`);

        let output = null;

        if (Number(countDeleted.body) > 0)
        {
            const restoreResult = await fsnxClient.ExecuteHttpAction("restore-deleted-security-group");     
            output = {...restoreResult.body};     
        }

        fsnxClient.SubmitOutput (output)

    });   


}

module.exports = 
{
  executeAction,
}