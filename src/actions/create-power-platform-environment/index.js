// create-power-platform-environment


import core from '@actions/core';
import {FsnxApiClient} from '../../lib/FsnxApiClient.js';

//const msal = require('@azure/msal-node');

(async () => {

    core.startGroup("create-power-platform-environment");

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

    core.info("currently running create-power-platform-environment")

    const fsnxClient = new FsnxApiClient(args);

    //core.info(JSON.stringify(fsnxClient.EventInput));

    await fsnxClient.OnStep("create-power-platform-environment", async () => {
        
        const output = {};

        const validateEnvBody = 
            fsnxClient.Actions["validate-environment-details"].payload.Content.Body;

        const environment = fsnxClient.Actions["create-environment"].payload.Content.Body;

        let checkCount = 0;

        let validateEnvResponse = null;


        core.info(`Validating environment details for: ${validateEnvBody.domainName}`);
        do{

            checkCount++;

            core.info(`Checking environment domain name availability: ${validateEnvBody.domainName}`);
            validateEnvResponse = await fsnxClient.ExecuteHttpAction("validate-environment-details");
           if (validateEnvResponse.status == 409) 
            {
               validateEnvBody.domainName = `${validateEnvBody.domainName}${checkCount}`;
            }
            else if (!validateEnvResponse.ok){
                output.error = {
                    code: `${validateEnvResponse.status}`,
                    message: validateEnvResponse.body.error.message };
                await fsnxClient.SubmitOutput (output);  
                core.error(validateEnvResponse.body.error.message);
                throw new Error(`Failed to validate environment details: ${validateEnvResponse.status} : ${validateEnvResponse.body.error.message}`);
            }
            else
            {
                core.info(`Environment domain name "${validateEnvBody.domainName}" is available.`);
                environment.Properties.LinkedEnvironmentMetadata.DomainName = validateEnvBody.domainName;
            }
        } while (validateEnvResponse.status == 409 && checkCount < 30);

       
        if (fsnxClient.Actions["get-maker-objectid-by-upn"])
        {

            core.info (`Get Maker User ObjectId`);

            const getMakerResponse = await fsnxClient.ExecuteHttpAction("get-maker-objectid-by-upn");

            //console.log(getMakerResponse);

            output.maker = getMakerResponse.body;
            if (getMakerResponse.ok) 
            {
                output.maker = getMakerResponse.body;
                environment.Properties.UsedBy.Id = output.maker.id;
            }
            else {
                // submitting output with error message.
                output.error = {
                    code: `${getMakerResponse.status}`,
                    message: getMakerResponse.body.error.message
                };
                await fsnxClient.SubmitOutput (output);  
                core.error(getMakerResponse.body.error.message);
                throw new Error(`Failed to get maker user objectId: ${getMakerResponse.body.error.message}`);
            }
        }
 
        //console.log(fsnxClient.Actions["create-environment"].payload.Content.Body);

        core.info (`Creating environment: ${environment.Properties.DisplayName}`);
        const createEnvResponse = await fsnxClient.ExecuteHttpAction("create-environment");

        if (createEnvResponse.ok)
        {
            output.environmentName = createEnvResponse.headers.get("x-ms-target-environment-name");
            output.checkStatusUrl = createEnvResponse.headers.get("Location");
            //output.retryAfterSeconds = createEnvResponse.headers.get("Retry-After");
            core.info(`Environment creation started: ${output.environmentName}`);
            core.info(`Check status URL: ${output.checkStatusUrl}`);
            //core.info(`Retry after seconds: ${output.retryAfterSeconds}`);
            output.environment = environment;
        }
        else {
            // submitting output with error message.
            output.error = {
                code: `${createEnvResponse.status}`,
                message: createEnvResponse.body.error.message,
            };  
                await fsnxClient.SubmitOutput (output);  
                core.error(createEnvResponse.body.error.message);
                core.info (JSON.stringify(createEnvResponse));
                throw new Error(`Failed to create environment: ${createEnvResponse.status} : ${createEnvResponse.body.error.message}`);            
        }

        await fsnxClient.SubmitOutput (output);  

    });

    await fsnxClient.OnStep("monitor-create-power-platform-environment", async () => {


        const output = {};

        let checkStatusResponse = null;

        do
        {

            core.info(`Checking environment creation status: ${fsnxClient.Actions["monitor-create-environment"].payload.RequestUri}`);
            const checkStatusResponse = await fsnxClient.ExecuteHttpAction("monitor-create-environment");

            if (!checkStatusResponse.ok) {
                output.error = {
                    code: `${checkStatusResponse.status}`,
                    message: checkStatusResponse.statusText
                };  
                await fsnxClient.SubmitOutput (output); 
                core.error(`Failed to check environment creation status: ${checkStatusResponse.status} : ${checkStatusResponse.statusText}`);
                throw new Error(`Failed to check environment creation status: ${checkStatusResponse.status} : ${checkStatusResponse.statusText}`);
            }
            // the create process in complete when a the response body contains a literal string value of "null"
            if (checkStatusResponse.status == 200) {
                output.statusCode = checkStatusResponse.status;
                core.info(`Environment creation completed successfully.`);
                break;
            }

            console.log(checkStatusResponse);

        } while (checkStatusResponse.status == 202);

        await fsnxClient.SubmitOutput (output); 

    });


}

export
{
  executeAction
}