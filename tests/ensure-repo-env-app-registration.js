// ensure-repo-env-app-registration - Test Script

//const core = require('@actions/core');
//const msal = require('@azure/msal-node');
//const fs = require('fs');

import fs from 'fs';
import core from '@actions/core';
import path from 'path';

import { Octokit } from '@octokit/rest';

//const path = require('path');


//const {FsnxApiClient} = require('../src/lib/FsnxApiClient.js');
import { FsnxApiClient } from '../src/lib/FsnxApiClient.js';


//const inputs = require('../.testinput/authenticate-cicd-serviceprincipal.json');
import inputs from '../.testinput/authenticate-cicd-serviceprincipal.json' assert { type: 'json' };

// Import required utilities
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Convert import.meta.url to a file path
const __filename = fileURLToPath(import.meta.url);

// Get the directory name from the file path
const __dirname = dirname(__filename);

const privateKeyPath = path.resolve(`${__dirname}\\..\\.testinput\\acctorg-private-key.pem`)

console.log(privateKeyPath);

const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');

const event_path = path.resolve(`${__dirname}\\..\\.testinput\\ensure-repo-env-app-registration.json`);

const args = 
{
    ...inputs,
    event_path: event_path,
    output_private_key: privateKeyPem
}

const test = async () => {

    core.info("currently running ensure-repo-env-app-registration test");

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

};

test();






