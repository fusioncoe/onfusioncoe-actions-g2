// ensure-entraid-tenant - Test Script

const core = require('@actions/core');
const msal = require('@azure/msal-node');
const fs = require('fs');

const path = require('path');

const {FsnxApiClient} = require('../src/lib/FsnxApiClient.js');
const inputs = require('../.testinput/authenticate-cicd-serviceprincipal.json');

//const eventInput = require('../.testinput/ensure-entraid-tenant.json');

//const executeAction = require('../src/actions/ensure-security-group/index.js').executeAction;

//const tenant_id = inputs.tenant_id;
//const client_id = inputs.client_id;
//const client_secret = inputs.client_secret;
//const authority = inputs.authority;
//const cloud = inputs.cloud;

    const privateKeyPath = path.resolve(`${__dirname}\\..\\.testinput\\acctorg-private-key.pem`)

    console.log(privateKeyPath);

    const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
   
    const event_path = path.resolve(`${__dirname}\\..\\.testinput\\ensure-entraid-tenant.json`);

    const args = 
    {
        ...inputs,
        event_path: event_path,
        output_private_key: privateKeyPem
    }

const test = async () => {

    core.info("currently running ensure-entraid-tenant test");

 
     core.info("currently running ensure-entraid-tenant");
 
     const fsnxClient = new FsnxApiClient(args);

 
     core.info(JSON.stringify(fsnxClient.EventInput));
 
     await fsnxClient.OnStep("get-tenant-organization", async () => {
 
 
         // Process Actions    
         const getOrgResponse = await fsnxClient.ExecuteHttpAction("get-organization");
 
         const getSpResponse = await fsnxClient.ExecuteHttpAction("get-serviceprincipals");
 
         const output = 
         {
             organization: getOrgResponse.body,
             servicePrincipals: getSpResponse.body
         };
 
         fsnxClient.SubmitOutput (output)
 
     });
 

};

test();






