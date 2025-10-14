// ensure-business-application-platform


import core from '@actions/core';
import {FsnxApiClient} from '../../lib/FsnxApiClient.js';

//const msal = require('@azure/msal-node');

(async () => {

    core.startGroup("ensure-business-application-platform");

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

    core.info("currently running ensure-business-application-platform")

    const fsnxClient = new FsnxApiClient(args);

    //core.info(JSON.stringify(fsnxClient.EventInput));

   await fsnxClient.OnStep("<<STEP_NAME>>", async () => {

        // Process Actions    
        const response = await fsnxClient.ExecuteHttpAction("<<ACTION_NAME>>");

        const output = {...response.body};

        fsnxClient.SubmitOutput (output)

    });

}

export
{
  executeAction,
}