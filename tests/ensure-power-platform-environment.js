// ensure-power-platform-environment - Test Script

import fs from 'fs';
import core from '@actions/core';
import path from 'path';

//import HttpsProxyAgent from 'https-proxy-agent';

import { FsnxApiClient, delay } from '../src/lib/FsnxApiClient.js';

import inputs from '../.testinput/authenticate-cicd-serviceprincipal.json' assert { type: 'json' };

// Import required utilities
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { json } from 'stream/consumers';
import url from 'url';

const fiddlerProxy = 'http://127.0.0.1:8888';


// const setFiddlerProxy = () => {
//     var proxyUrl = url.format(fiddlerProxyOptions);

// };

// Use this only for debugging as it introduces a security issue.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

// Convert import.meta.url to a file path
const __filename = fileURLToPath(import.meta.url);

// Get the directory name from the file path
const __dirname = dirname(__filename);

const privateKeyPath = path.resolve(`${__dirname}\\..\\.testinput\\acctorg-private-key.pem`)

console.log(privateKeyPath);

const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');

const event_path = path.resolve(`${__dirname}\\..\\.testinput\\ensure-power-platform-environment.json`);

const args = 
{
    ...inputs,
    event_path: event_path,
    output_private_key: privateKeyPem
}

const test = async () => {

    core.info("currently running ensure-power-platform-environment test");

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
            let executeConnCreateUpdate = false;

            output.DataverseConnections.push(connectionOutput);

            const currentSecretDetails = fsnxClient.Actions[`current-connection-secret-details-${i}`].payload;
            const currentSecretKeyId = currentSecretDetails.secret_id;
            const expirationCheckDate = currentSecretDetails.expiration_check_date;
            const appName = currentSecretDetails.app_name;

            connectionOutput.fusionex_managedconnectorconnectionid = currentSecretDetails.fusionex_managedconnectorconnectionid;
            connectionOutput.fusionex_azureappregistrationcredentialid = currentSecretDetails.fusionex_azureappregistrationcredentialid;

            core.info(`Processing Application User and Dataverse Connection for App ${appName} in Environment ${environmentName}`);

            let appUserId = null;

            const getAppUserResponse = await fsnxClient.ExecuteHttpActionV2({actionName: `get-app-user-${i}`});
            if (getAppUserResponse.ok){
                if (getAppUserResponse.body.value.length > 0)
                {
                    appUserId = getAppUserResponse.body.value[0].systemuserid;
                    core.info(`Found App User with ID: ${appUserId}`);
                }
            }
            else
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

            // Try Get Current App Dataverse Connection

            const tryExistingConnectionResponse = await fsnxClient.ExecuteHttpActionV2({actionName: `try-existing-connection-${i}`});
            if (tryExistingConnectionResponse.ok)
            {
                console.log(`Existing connection found`);
                connectionOutput.connection = tryExistingConnectionResponse.body;
            }
            else if (tryExistingConnectionResponse.status === 404)
            {
                executeConnCreateUpdate = true;
                console.log(`No existing connection found, will create a new one.`);
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
                    executeConnCreateUpdate = true;
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

            const connectionBody = fsnxClient.Actions[`create-update-connection-${i}`].payload.Content.Body;
            const connectionBodyProperties = connectionBody.properties;
            const connectionTokenParams = connectionBodyProperties.connectionParametersSet.values;

            if (currentSecret == null || currentSecret === undefined || currentSecret.endDateTime < expirationCheckDate){
                
                executeConnCreateUpdate = true;
                
                core.info(`Creating new secret credential for App ${appName} in Environment ${environmentName}`);

                const createSecretResponse = await fsnxClient.ExecuteHttpAction(`create-secret-credential-${i}`);
                if (createSecretResponse.ok)
                {
                    
                    const secret  = createSecretResponse.body.secretText;
                    const secretKeyId = createSecretResponse.body.keyId;
                    // cannot log secret value because it needs to be used to create/update the connection.
                    //core.setSecret(secret);

                    connectionOutput.credential = { 
                        ...Object.fromEntries(Object.entries(createSecretResponse.body).filter(([key]) => key !== 'secretText')),
                    };
                    
                    connectionTokenParams["token:clientSecret"].value = secret;
                    core.info("New secret credential created:");
                    core.info(JSON.stringify(connectionOutput.credential));

                    

                }
                else
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

            //core.info(`Connection body for App ${appName} in Environment ${environmentName}`)
            //core.info(JSON.stringify(connectionBody));            

            if (executeConnCreateUpdate){
                core.info(`Creating or Updating Connection for App ${appName} in Environment ${environmentName}`);
                const createUpdateConnectionResponse = await fsnxClient.ExecuteHttpActionV2({actionName: `create-update-connection-${i}`});
                if (createUpdateConnectionResponse.ok)
                {
                    core.info(`Created or Updated Connection for App ${appName} in Environment ${environmentName}: ${createUpdateConnectionResponse.body.name}`);
                    core.info(JSON.stringify(createUpdateConnectionResponse));
                    connectionOutput.connection = createUpdateConnectionResponse.body;
                }
                else{
                    output.error = {
                        code: createUpdateConnectionResponse.status,
                        message: createUpdateConnectionResponse.body.message
                    };
                    await fsnxClient.SubmitOutput (output);
                    core.error(createUpdateConnectionResponse.body.message);
                    throw new Error(`Failed to create or update Connection for App ${appName} in Environment ${environmentName}: ${createUpdateConnectionResponse.status} : ${createUpdateConnectionResponse.body.message}`);
                }
            }

            // get-connection-permissions

            const permissionUpdate = fsnxClient.Actions[`update-connection-permissions-${i}`].payload.Content.Body;

            const getConnectionPermissionsResponse = await fsnxClient.ExecuteHttpAction(`get-connection-permissions-${i}`);
            if (getConnectionPermissionsResponse.ok)
            {   

               // console.log(JSON.stringify(getConnectionPermissionsResponse.body));

                    core.info(`Retrieved Current Connection Permissions for App ${appName} in Environment ${environmentName}: ${JSON.stringify(getConnectionPermissionsResponse.body)}`);
                    const currentPermissions = getConnectionPermissionsResponse.body;

                    // Delete existing permissions that are not in the desired set
                    currentPermissions.value.forEach((value,index,array) =>{
                        if (value.properties.roleName !== "Owner" &&
                            !permissionUpdate.put.filter(item => item.properties.principal.id === value.properties.principal.id).length > 0 )
                        {
                            core.info(`Removing Permission for Principal ${value.properties.principal.id}`);
                            if (permissionUpdate.delete == null)
                            {
                                permissionUpdate.delete = [];
                            }
                            permissionUpdate.delete.push({
                                id: value.id,
                            });
                        }
                    });

            }
            else
            {
                console.log(JSON.stringify(getConnectionPermissionsResponse));
                output.error = {
                    code: getConnectionPermissionsResponse.status,
                    message: getConnectionPermissionsResponse.body.message
                };
                await fsnxClient.SubmitOutput (output);
                core.error(getConnectionPermissionsResponse.body.message);
                throw new Error(`Failed to get Connection Permissions for App ${appName} in Environment ${environmentName}: ${getConnectionPermissionsResponse.status} : ${getConnectionPermissionsResponse.body.message}`);
            }   

            // Update Connection Permissions

            const updateConnectionPermissionsResponse = await fsnxClient.ExecuteHttpAction(`update-connection-permissions-${i}`);
            console.log(JSON.stringify(updateConnectionPermissionsResponse));
            if (updateConnectionPermissionsResponse.ok)
            {
                core.info(`Updated Connection Permissions for App ${appName} in Environment ${environmentName}`);
                connectionOutput.connectionPermissions = updateConnectionPermissionsResponse.body;
            }
            else
            {
                output.error = {
                    code: updateConnectionPermissionsResponse.status,
                    message: updateConnectionPermissionsResponse.body.message
                };
                await fsnxClient.SubmitOutput(output);
                core.error(updateConnectionPermissionsResponse.body.message);
                throw new Error(`Failed to update Connection Permissions for App ${appName} in Environment ${environmentName}: ${updateConnectionPermissionsResponse.status} : ${updateConnectionPermissionsResponse.body.message}`);
            }

            if (executeConnCreateUpdate)
            {
                // Rerunning create if token status is not ready
                let tokenStatus = connectionOutput.connection.properties.statuses.find(status => status.target === "token");
                let retryCount = 0;
                const maxRetries = 10;
                const retryDelayMs = 10000; // 10 seconds

                while (tokenStatus && tokenStatus.status == "Error" && retryCount < maxRetries)
                {
                    core.info(`Token status is Error.  This is expected as it takes time for the new secret to propagate. Retrying create connection attempt ${retryCount + 1} of ${maxRetries} after ${retryDelayMs / 1000} seconds.`);
                    await delay(retryDelayMs);
                    const retryCreateUpdateConnectionResponse = await fsnxClient.ExecuteHttpAction(`create-update-connection-${i}`);
                    if (retryCreateUpdateConnectionResponse.ok) {
                        connectionOutput.connection = retryCreateUpdateConnectionResponse.body;
                        tokenStatus = connectionOutput.connection.properties.statuses.find(status => status.target === "token");
                    } else {
                        core.error(`Failed to retry create/update connection: ${retryCreateUpdateConnectionResponse.status} : ${retryCreateUpdateConnectionResponse.body.message}`);
                        break;
                    }
                    retryCount++;
                }

        }

            i++;
        }

            // Finalize the output
            await fsnxClient.SubmitOutput(output);
        
    });


}




test();






