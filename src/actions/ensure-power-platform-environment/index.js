// ensure-power-platform-environment


import core from '@actions/core';
import {FsnxApiClient} from '../../lib/FsnxApiClient.js';

//const msal = require('@azure/msal-node');

(async () => {

    core.startGroup("ensure-power-platform-environment");

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

    core.info("currently running ensure-power-platform-environment")

    const fsnxClient = new FsnxApiClient(args);

    //core.info(JSON.stringify(fsnxClient.EventInput));

   await fsnxClient.OnStep("get-environment-details", async () => {

        // Process Actions    
        const response = await fsnxClient.ExecuteHttpAction("get-environment");

        const output = {...response.body};

        fsnxClient.SubmitOutput (output)

    }); 

   await fsnxClient.OnStep("get-dataverse-details", async () => {

        const output = {};

        // Process Actions    
        const orgResponse = await fsnxClient.ExecuteHttpAction("get-organization-id");
        if (orgResponse.ok)
        {
            core.info(`Found Dataverse Organization with ID: ${orgResponse.body.value[0].organizationid}`);
            output.Organization = orgResponse.body;
        }
        else
        {
            output.error = {
                code: orgResponse.status,
                message: orgResponse.body.error.message
            }
            await fsnxClient.SubmitOutput (output);  
            core.error(orgResponse.body.error.message);
            throw new Error(`Failed to retrieve Dataverse Organization ID: ${orgResponse.status} : ${orgResponse.body.error.message}`); 
        }

        const rootBuResponse = await fsnxClient.ExecuteHttpAction("get-root-business-unit");
        if (rootBuResponse.ok)
        {
            core.info(`Found Dataverse Root Business Unit with ID: ${rootBuResponse.body.value[0].businessunitid}`);
            output.RootBusinessUnit = rootBuResponse.body;
        }
        else
        {
            output.error = {
                code: rootBuResponse.status,
                message: rootBuResponse.body.error.message
            }   
            await fsnxClient.SubmitOutput (output);  
            core.error(rootBuResponse.body.error.message);
            throw new Error(`Failed to retrieve Dataverse Root Business Unit ID: ${rootBuResponse.status} : ${rootBuResponse.body.error.message}`); 
        }


        const SysAdminRoleResponse = await fsnxClient.ExecuteHttpAction("get-system-administrator-roleid");
        if (SysAdminRoleResponse.ok)
        {
            core.info(`Found Dataverse System Administrator Role with ID: ${SysAdminRoleResponse.body.value[0].roleid}`);
            output.SystemAdminRole = SysAdminRoleResponse.body;
        }
        else
        {
            output.error = {
                code: SysAdminRoleResponse.status,
                message: SysAdminRoleResponse.body.error.message
            }
            await fsnxClient.SubmitOutput (output);  
            core.error(SysAdminRoleResponse.body.error.message);
            throw new Error(`Failed to retrieve Dataverse System Administrator Role ID: ${SysAdminRoleResponse.status} : ${SysAdminRoleResponse.body.error.message}`); 
        }

        const SysCustomRoleResponse = await fsnxClient.ExecuteHttpAction("get-system-customizer-roleid");
        if (SysCustomRoleResponse.ok)
        {
            core.info(`Found Dataverse System Customizer Role with ID: ${SysCustomRoleResponse.body.value[0].roleid}`);
            output.SystemCustomizerRole = SysCustomRoleResponse.body;
        }
        else
        {
            output.error = {
                code: SysCustomRoleResponse.status,
                message: SysCustomRoleResponse.body.error.message
            }
            await fsnxClient.SubmitOutput (output);  
            core.error(SysCustomRoleResponse.body.error.message);
            throw new Error(`Failed to retrieve Dataverse System Customizer Role ID: ${SysCustomRoleResponse.status} : ${SysCustomRoleResponse.body.error.message}`); 
        }

        core.info(JSON.stringify(output));

        await fsnxClient.SubmitOutput (output)

    }); 


    await fsnxClient.OnStep("ensure-dataverse-connections", async () => {

        const output = {DataverseConnections: []};

        const environmentName = fsnxClient.Actions["ensure-dataverse-info"].payload.environment_name;
        // Process connections

        let i = 1;

        while (fsnxClient.Actions[`get-app-user-${i}`]) {

            const connectionOutput = {};

            output.DataverseConnections.push(connectionOutput);

            const currentSecretDetails = fsnxClient.Actions[`current-connection-secret-details-${i}`].payload;
            const currentSecretKeyId = currentSecretDetails.secret_id;
            const expirationCheckDate = currentSecretDetails.expiration_check_date;
            const appName = currentSecretDetails.app_name;

            connectionOutput.fusionex_managedconnectorconnectionid = currentSecretDetails.fusionex_managedconnectorconnectionid;
            connectionOutput.fusionex_azureappregistrationcredentialid = currentSecretDetails.fusionex_azureappregistrationcredentialid;

            core.info(`Processing Application User and Dataverse Connection for App ${appName} in Environment ${environmentName}`);

            let appUserId = null;

            const getAppUserResponse = await fsnxClient.ExecuteHttpAction(`get-app-user-${i}`);
            if (getAppUserResponse.ok){
                if (getAppUserResponse.body.value.length > 0)
                {
                    appUserId = getAppUserResponse.body.value[0].systemuserid;
                    core.info(`Found App User with ID: ${appUserId}`);
                }
            }else
            {
                output.error = {
                    code: getAppUserResponse.status,
                    message: getAppUserResponse.body.error.message
                }   
                await fsnxClient.SubmitOutput (output);
                core.error(getAppUserResponse.body.error.message);
                throw new Error(`Failed to retrieve App User ID: ${getAppUserResponse.status} : ${getAppUserResponse.body.error.message}`); 
            }

            // if app user not found, create it
            if (!appUserId)
            {
                const createAppUserResponse = await fsnxClient.ExecuteHttpAction(`create-app-user-${i}`);
                if (createAppUserResponse.ok)
                {
                    // AppUserID needs to be extracted from the OData-EntityId header returned from the create action
                    const entityIdHeader = createAppUserResponse.headers.get('OData-EntityId') || createAppUserResponse.headers.get('odata-entityid');
                    appUserId = entityIdHeader ? entityIdHeader.split('(')[1].split(')')[0] : null;
                    core.info(`Created App User with ID: ${appUserId}`);
                }
                else
                {
                    output.error = {
                        code: createAppUserResponse.status,
                        message: createAppUserResponse.body.error.message
                    }
                    await fsnxClient.SubmitOutput (output);
                    core.error(createAppUserResponse.body.error.message);
                    throw new Error(`Failed to create App User ID: ${createAppUserResponse.status} : ${createAppUserResponse.body.error.message}`);
                }
            }

            
            if (appUserId)
            {

                // Assign System Admin Role to App User    

                const assignRoleResponse = await fsnxClient.ExecuteHttpAction(`assign-system-admin-role-${i}`, appUserId);
                if (assignRoleResponse.ok)
                {
                    core.info(`Assigned System Admin Role to App User with ID: ${appUserId}`);
                }
                else
                {
                    output.error = {
                        code: assignRoleResponse.status,
                        message: assignRoleResponse.body.error.message
                    }
                    await fsnxClient.SubmitOutput (output);
                    core.error(assignRoleResponse.body.error.message);
                    throw new Error(`Failed to assign System Admin Role to App User ID: ${assignRoleResponse.status} : ${assignRoleResponse.body.error.message}`);
                }

                // Assign System Customizer Role to App User    

                const assignCustomRoleResponse = await fsnxClient.ExecuteHttpAction(`assign-system-customizer-role-${i}`, appUserId);
                if (assignCustomRoleResponse.ok)
                {
                    core.info(`Assigned System Customizer Role to App User with ID: ${appUserId}`);
                }
                else
                {
                    output.error = {
                        code: assignCustomRoleResponse.status,
                        message: assignCustomRoleResponse.body.error.message
                    }
                    await fsnxClient.SubmitOutput (output);
                    core.error(assignCustomRoleResponse.body.error.message);
                    throw new Error(`Failed to assign System Customizer Role to App User ID: ${assignCustomRoleResponse.status} : ${assignCustomRoleResponse.body.error.message}`);
                }
            }

            // Get Current Secret Status



            let currentSecret = null;

            const currentSecretsResponse = await fsnxClient.ExecuteHttpAction(`get-current-secrets-${i}`);
            if (currentSecretsResponse.ok)
            {
                const secrets = currentSecretsResponse.body.passwordCredentials || [];
                
                currentSecret = secrets.find(cred => cred.keyId === currentSecretKeyId);

                if (currentSecret)
                {
                    connectionOutput.credential = currentSecret;
                    core.info(`Current Secret for App ${appName} in Environment ${environmentName}: ${JSON.stringify(currentSecret)}`);
                }
                else
                {
                    core.info(`No Current Secret found for App ${appName} in Environment ${environmentName}`);
                }
            }
            else
            {
                output.error = {
                    code: currentSecretsResponse.status,
                    message: currentSecretsResponse.body.error.message
                }
                await fsnxClient.SubmitOutput (output);
                core.error(currentSecretsResponse.body.error.message);
                throw new Error(`Failed to get Current Secrets for App ${appName} : ${currentSecretsResponse.status} : ${currentSecretsResponse.body.error.message}`);
            }

            const connectionBodyProperties = fsnxClient.Actions[`create-update-connection-${i}`].payload.Content.Body.properties;
            const connectionTokenParams = connectionBodyProperties.connectionParametersSet.values;

            if (currentSecret == null || currentSecret === undefined || currentSecret.endDateTime < expirationCheckDate){
                core.info(`Creating new secret credential for App ${appName} in Environment ${environmentName}`);

                const createSecretResponse = await fsnxClient.ExecuteHttpAction(`create-secret-credential-${i}`);
                if (createSecretResponse.ok)
                {
                    
                    const secret  = createSecretResponse.body.secretText;
                    core.setSecret(secret);



                    connectionOutput.credential = { 
                        ...Object.fromEntries(Object.entries(createSecretResponse.body).filter(([key]) => key !== 'secretText')),
                    };
                    
                    connectionTokenParams["token:clientSecret"].value = secret;
                    core.info("New secret credential created:");
                    core.info(JSON.stringify(createSecretResponse.body));

                }else
                {
                    output.error = {
                        code: createSecretResponse.status,
                        message: createSecretResponse.body.error.message
                    }
                    await fsnxClient.SubmitOutput (output);
                    core.error(createSecretResponse.body.error.message);
                    throw new Error(`Failed to create Secret Credential for App ${appName} in Environment ${environmentName}: ${createSecretResponse.status} : ${createSecretResponse.body.error.message}`);
                }
            }
            else
            {
                delete connectionBodyProperties["connectionParametersSet"];
            }

            // Create or Update the Connection

            core.info(`Connection Token Parameters for App ${appName} in Environment ${environmentName}`)
            core.info(JSON.stringify(connectionTokenParams));

            const createUpdateConnectionResponse = await fsnxClient.ExecuteHttpAction(`create-update-connection-${i}`);
            if (createUpdateConnectionResponse.ok)
            {
                core.info(`Created or Updated Connection for App ${appName} in Environment ${environmentName}: ${createUpdateConnectionResponse.body.name}`);
                core.info(JSON.stringify(createUpdateConnectionResponse));

                connectionOutput.connection = createUpdateConnectionResponse.body;
            }
            else{
                output.error = {
                    code: createUpdateConnectionResponse.status,
                    message: createUpdateConnectionResponse.body.error.message
                };
                await fsnxClient.SubmitOutput (output);
                core.error(createUpdateConnectionResponse.body.error.message);
                throw new Error(`Failed to create or update Connection for App ${appName} in Environment ${environmentName}: ${createUpdateConnectionResponse.status} : ${createUpdateConnectionResponse.body.error.message}`);
            }



            i++;
        }

            // Finalize the output
            await fsnxClient.SubmitOutput(output);
        
    });



}

export
{
  executeAction,
}