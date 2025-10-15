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


}

export
{
  executeAction,
}