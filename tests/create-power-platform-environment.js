// create-power-platform-environment - Test Script

import fs from 'fs';
import core from '@actions/core';
import path from 'path';

import { FsnxApiClient } from '../src/lib/FsnxApiClient.js';

import inputs from '../.testinput/authenticate-cicd-serviceprincipal.json' assert { type: 'json' };

// Import required utilities
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { get } from 'http';

// Convert import.meta.url to a file path
const __filename = fileURLToPath(import.meta.url);

// Get the directory name from the file path
const __dirname = dirname(__filename);

const privateKeyPath = path.resolve(`${__dirname}\\..\\.testinput\\acctorg-private-key.pem`)

console.log(privateKeyPath);

const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');

const event_path = path.resolve(`${__dirname}\\..\\.testinput\\create-power-platform-environment.json`);

const args = 
{
    ...inputs,
    event_path: event_path,
    output_private_key: privateKeyPem
}

const test = async () => {

    core.info("currently running create-power-platform-environment test");

    const fsnxClient = new FsnxApiClient(args);   
    
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
            else
            {
                core.info(`Environment domain name "${validateEnvBody.domainName}" is available.`);
                environment.Properties.LinkedEnvironmentMetadata.DomainName = validateEnvBody.domainName;
            }
        } while (validateEnvResponse.status == 409 && checkCount < 10);

        core.info (`Get Maker User ObjectId for: ${fsnxClient.Actions["get-maker-objectid-by-upn"].payload.Content.Body.userPrincipalName}`);
        if (fsnxClient.Actions["get-maker-objectid-by-upn"])
        {
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
                    message: getMakerResponse.statusText
                };
                await fsnxClient.SubmitOutput (output);  
                core.error(getMakerResponse.statusText);
                throw new Error(`Failed to get maker user objectId: ${getMakerResponse.statusText}`);
            }
        }
 
        console.log(fsnxClient.Actions["create-environment"]);


        await fsnxClient.SubmitOutput (output);  



    });


 

};

test();






