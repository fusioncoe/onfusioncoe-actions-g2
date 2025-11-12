// ensure-repo-env-app-registration

import core from '@actions/core';
import { Octokit } from '@octokit/rest';
import { FsnxApiClient, SealSecretValue } from '../../lib/FsnxApiClient.js';

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

            const SetEnvSecretArgs = fsnxClient.Actions["upsert-environment-secret"].payload;
            core.info(JSON.stringify(SetEnvSecretArgs));  

            const currentSecretKeyId = SetEnvSecretArgs.secret_id;
            const expirationCheckDate = SetEnvSecretArgs.expiration_check_date;

            let currentSecret = GetSecrets.body.passwordCredentials.find(cred => cred.keyId === currentSecretKeyId);

            if (currentSecret == null || currentSecret === undefined || currentSecret.endDateTime < expirationCheckDate)
            {
                core.info("Creating new secret credential");

                const CreateSecret = await fsnxClient.ExecuteHttpAction("create-secret-credential", GetSecrets.body.id);

                const secret  = CreateSecret.body.secretText;
                core.setSecret(secret);
                core.info("New secret credential created:");
                core.info(JSON.stringify(CreateSecret.body));

                currentSecret = { 
                    ...Object.fromEntries(Object.entries(CreateSecret.body).filter(([key]) => key !== 'secretText')),               
                };
                
                core.info("Creating or updating GitHub Environment Secret");
                
                const octokit = new Octokit({
                        auth: await fsnxClient.GetAppAuthToken(),
                        baseUrl: fsnxClient.EventInput.client_payload.api_baseurl,
                        //userAgent: fsnxClient.EventInput.client_payload.api_userAgent,
                });

                const octoHeaders = {
                    'X-GitHub-Api-Version': '2022-11-28',
                    'user-agent': fsnxClient.EventInput.client_payload.api_userAgent
                };

                const pubKeyResponse = await octokit.rest.actions.getEnvironmentPublicKey({
                    owner: SetEnvSecretArgs.owner,
                    repo: SetEnvSecretArgs.repo,
                    environment_name: SetEnvSecretArgs.environment_name,
                    headers: {
                            ...octoHeaders
                            }
                });

                //core.info(JSON.stringify(pubKeyResponse));

                const repoSecret = await octokit.rest.actions.createOrUpdateEnvironmentSecret({
                    owner: SetEnvSecretArgs.owner,
                    repo: SetEnvSecretArgs.repo,
                    secret_name: SetEnvSecretArgs.secret_name,
                    environment_name: SetEnvSecretArgs.environment_name,
                    encrypted_value: await SealSecretValue(secret, pubKeyResponse.data.key),
                    key_id: pubKeyResponse.data.key_id,
                    headers: {...octoHeaders}
                });

                core.info("GitHub Environment Secret created or updated:");
                core.info(JSON.stringify(repoSecret));

            }
            else 
            {
                core.info("Existing secret credential is valid, reusing existing secret");
            }
            //const upsertEnvSecretResponse = await fsnxClient.CreateOrUpdateEnvironmentSecret(SetEnvSecretArgs);

            currentSecret = { 
                ...Object.fromEntries(Object.entries(currentSecret).filter(([key]) => key !== 'secretText' && key !== 'customKeyIdentifier' && key !== 'hint'   )),               
            };            

            core.info("Returning current secret credential details:");
            core.info(JSON.stringify(currentSecret));   
            fsnxClient.SubmitOutput (currentSecret)

    }); 
}