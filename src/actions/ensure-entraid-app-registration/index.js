// ensure-entraid-app-registration


const core = require('@actions/core');
const {FsnxApiClient} = require('../../lib/FsnxApiClient.js');

//const msal = require('@azure/msal-node');

(async () => {

    core.startGroup("ensure-entraid-app-registration");

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

    core.info("currently running ensure-entraid-app-registration")

    const fsnxClient = new FsnxApiClient(args);

    //core.info(JSON.stringify(fsnxClient.EventInput));

    await fsnxClient.OnStep("upsert-app-registration", async () => {

        // Process Actions    
        const upsertResponse = await fsnxClient.ExecuteHttpAction("appreg-patch-upsert");

        const getResponse = await fsnxClient.ExecuteHttpAction("appreg-get-by-uniquename-check");

        const output = {...getResponse.body};

        fsnxClient.SubmitOutput (output)

    });

    await fsnxClient.OnStep("upsert-app-service-principal", async () => {

        // Process Actions    
        const upsertResponse = await fsnxClient.ExecuteHttpAction("appreg-sp-upsertwithappid");

        const getResponse = await fsnxClient.ExecuteHttpAction("appreg-sp-get-by-appid-check");

        const regex = /([A-Z0-9]{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{12})/;
 
        const oAuth2Action = fsnxClient.Actions["appreg-sp-get-OAuth2PermissionGrants"];

        let reqUri = oAuth2Action.payload.RequestUri.replace(regex, getResponse.body.id);
        oAuth2Action.payload.RequestUri = reqUri;

        core.info(`RequestUri: ${oAuth2Action.payload.RequestUri}`);

        const getOAuth2Response = await fsnxClient.ExecuteHttpAction("appreg-sp-get-OAuth2PermissionGrants");

        const output = {ServicePrincipal:getResponse.body,
                        OAuth2PermissionGrants: getOAuth2Response.body
        };

        fsnxClient.SubmitOutput (output)

    });    
    
    await fsnxClient.OnStep("grant-oauth2-permissions", async () => {

        // Process Each OAth2PermissionGrant Action
        
        let i = 1;
        do
        {
            let action = fsnxClient.Actions[`oauth2-grant-action-${i}`];
            if (action) 
            {
                await fsnxClient.ExecuteHttpAction(`oauth2-grant-action-${i}`);
                i++;
            }
            else break;
        } while (fsnxClient.Actions[`oauth2-grant-action-${i}`]);

        // get OAUth2PermissionGrants
        const getOAuth2Response = await fsnxClient.ExecuteHttpAction("appreg-sp-get-OAuth2PermissionGrants");

        const output = {... getOAuth2Response.body
        };

        fsnxClient.SubmitOutput (output)

    });        
    
    await fsnxClient.OnStep("delete-app-registration", async () => {

 
        const deleteResult = await fsnxClient.ExecuteHttpAction("appreg-delete-by-uniquename");

        core.info(JSON.stringify(deleteResult));

        const output = {
            ...deleteResult.body
        };

        fsnxClient.SubmitOutput (output)

    });      

    await fsnxClient.OnStep("restore-app-registration", async () => {

 
        // Returns just a count.
        const countDeleted = await fsnxClient.ExecuteHttpAction("get-deleted-by-uniquename-count");

        core.info(`Count of deleted app registrations: ${countDeleted.body}`);

        let output = null;

        if (Number(countDeleted.body) > 0)
        {
            const restoreResult = await fsnxClient.ExecuteHttpAction("restore-deleted-app-registration");     
            output = {...restoreResult.body};     
        }

        fsnxClient.SubmitOutput (output)

    });       

}

module.exports = 
{
  executeAction,
}