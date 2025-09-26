// ensure-security-group

//const {getInput} = require('@actions/core');
//const {startGroup} = require('@actions/core');
//const {endGroup} = require('@actions/core');
//const {setFailed} = require('@actions/core');
//const {info} = require('@actions/core');
const core = require('@actions/core');


const FsnxApiClient = require('../../lib/FsnxApiClient.js');
//const { json } = require('stream/consumers');

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
    core.info("currently running ensure-security-group test");

    // core.info(JSON.stringify(args))

    //const json = convert.xml2json(xml, { compact: true, spaces: 4 });

    // core.info(`Event info path is ${args.event_path}`);    

    const eventInput = require(args.event_path);

    // core.info("Event input has been collected");    

    const actions = eventInput.client_payload.dispatch_payload.actions;

    // process action 1, upsert

    // core.info("Processing Actions");      

    const upsertSecGrpAction = actions[0];

    core.info(`Adding or updating security group "${upsertSecGrpAction.payload.Content.Body.displayName}"`)
    const upsertresponse = await FsnxApiClient.ExecuteHttpAction(upsertSecGrpAction, args.authority,args.client_id,args.client_secret,args.tenant_id)

    if (upsertresponse.ok) 
    {

        let secObj = upsertresponse.body;


        if (secObj == null )
        {

            const getSecGrpAction = actions[1];
    
            const getResponse = await FsnxApiClient.ExecuteHttpAction(getSecGrpAction, args.authority,args.client_id,args.client_secret,args.tenant_id);

            if (getResponse.ok) {
                secObj = getResponse.body;
            }
            else
            {
                
            }
        }

        core.info(JSON.stringify(secObj))

        core.setOutput('object_id',secObj?.id);

        // Test Output Functionality

        FsnxApiClient.SubmitOutput (secObj, eventInput.client_payload, args.output_private_key)

    }
    else
    {
        // TODO:  Throw Exception

    }

}

module.exports = 
{
  executeAction,
}