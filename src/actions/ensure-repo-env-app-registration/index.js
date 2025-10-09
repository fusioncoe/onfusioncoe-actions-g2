// ensure-repo-env-app-registration

import core from '@actions/core';
import {FsnxApiClient} from '../../lib/FsnxApiClient.js';

//const msal = require('@azure/msal-node');

(async () => {

    core.startGroup("ensure-repo-env-app-registration");

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

export async function executeAction (args)
{

    core.info("currently running ensure-repo-env-app-registration")

    const fsnxClient = new FsnxApiClient(args);

         await fsnxClient.OnStep("create-or-update-secret", async () => {

        // Process Actions    
            const GetSecrets = await fsnxClient.ExecuteHttpAction("get-current-secrets");

            const CreateSecret = await fsnxClient.ExecuteHttpAction("create-secret-credential");

            const SetEnvSecretArgs = fsnxClient.Actions["upsert-environment-secret"].payload;

            core.info(JSON.stringify(SetEnvSecretArgs));

            SetEnvSecretArgs.plainText = CreateSecret.body.secretText;

            const octokit = new Octokit({
                    auth: await fsnxClient.GetAppAuthToken(),
                    baseUrl: fsnxClient.EventInput.client_payload.api_baseurl,
                    userAgent: fsnxClient.EventInput.client_payload.api_userAgent,
            });

            const pubKeyResponse = await octokit.rest.actions.getEnvironmentPublicKey({
                owner: SetEnvSecretArgs.owner,
                repo: SetEnvSecretArgs.repo,
                environment_name: SetEnvSecretArgs.environment_name,
                headers: {
                        'X-GitHub-Api-Version': '2022-11-28'
                    }
            });

            core.info(JSON.stringify(pubKeyResponse));

            const repoSecret = await octokit.rest.actions.createOrUpdateEnvironmentSecret({
                owner: SetEnvSecretArgs.owner,
                repo: SetEnvSecretArgs.repo,
                secret_name: SetEnvSecretArgs.secret_name,
                environment_name: SetEnvSecretArgs.environment_name,
                encrypted_value: await SealSecretValue(SetEnvSecretArgs.plainText, pubKeyResponse.data.key),
                key_id: pubKeyResponse.data.key_id,
                                headers: {
                        'X-GitHub-Api-Version': '2022-11-28'
                    }
            });            



            //const upsertEnvSecretResponse = await fsnxClient.CreateOrUpdateEnvironmentSecret(SetEnvSecretArgs);

            const output = { 
                ...Object.fromEntries(Object.entries(CreateSecret.body).filter(([key]) => key !== 'secretText')),               
            };

            fsnxClient.SubmitOutput (output)

    }); 
}

// export {
//   executeAction,
// }