// ensure-entraid-app-registration - Test Script

const core = require('@actions/core');
const msal = require('@azure/msal-node');
const fs = require('fs');

const path = require('path');

const {FsnxApiClient} = require('../src/lib/FsnxApiClient.js');
const inputs = require('../.testinput/authenticate-cicd-serviceprincipal.json');


const privateKeyPath = path.resolve(`${__dirname}\\..\\.testinput\\acctorg-private-key.pem`)

console.log(privateKeyPath);

const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');

const event_path = path.resolve(`${__dirname}\\..\\.testinput\\ensure-entraid-app-registration.json`);

const args = 
{
    ...inputs,
    event_path: event_path,
    output_private_key: privateKeyPem
}

const test = async () => {

    core.info("currently running ensure-entraid-app-registration test");

    const fsnxClient = new FsnxApiClient(args);    

    
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

            core.info(JSON.stringify(upsertResponse));

            const getResponse = await fsnxClient.ExecuteHttpAction("appreg-sp-get-by-appid-check");
    
            const regex = /([A-Z0-9]{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{12})/;
     
            const oAuth2Action = fsnxClient.Actions["appreg-sp-get-OAuth2PermissionGrants"];
    
            core.info(JSON.stringify(getResponse));

            core.info(`ResponseBodyId: ${getResponse.body.id}`);

            let reqUri = oAuth2Action.payload.RequestUri.replace(regex, getResponse.body.id);

            core.info(`Original RequestUri: ${oAuth2Action.payload.RequestUri}`);
            core.info(`Replaced RequestUri: ${reqUri}`);

            oAuth2Action.payload.RequestUri = reqUri;
    
            core.info(`RequestUri: ${oAuth2Action.payload.RequestUri}`);
    
            const getOAuth2Response = await fsnxClient.ExecuteHttpAction("appreg-sp-get-OAuth2PermissionGrants");
    
            const output = {ServicePrincipal:getResponse.body,
                            OAuth2PermissionGrants: getOAuth2Response.body
            };
    
            fsnxClient.SubmitOutput (output)
    
        });    
    
};

test();






