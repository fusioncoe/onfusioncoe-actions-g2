const core = require('@actions/core');
const msal = require('@azure/msal-node');
const fs = require('fs');

const path = require('path');

const {FsnxApiClient} = require('../src/lib/FsnxApiClient.js');
const inputs = require('../.testinput/authenticate-cicd-serviceprincipal.json');

const eventInput = require('../.testinput/ensure-security-group.json');

//const executeAction = require('../src/actions/ensure-security-group/index.js').executeAction;

const tenant_id = inputs.tenant_id;
const client_id = inputs.client_id;
const client_secret = inputs.client_secret;
const authority = inputs.authority;
const cloud = inputs.cloud;

// const crypto = require('crypto');

// // Generate RSA key pair
// const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
//   modulusLength: 2048, // Key size in bits
//   publicKeyEncoding: { type: 'spki', format: 'pem' },
//   privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
// });


    const privateKeyPath = path.resolve(`${__dirname}\\..\\.testinput\\acctorg-private-key.pem`)

    console.log(privateKeyPath);

    const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
   
    const event_path = path.resolve(`${__dirname}\\..\\.testinput\\ensure-security-group.json`);

    const args = 
    {
        ...inputs,
        event_path: event_path,
        output_private_key: privateKeyPem
    }

   // console.log("Args:");
   // console.log(args);


const test = async () => {

     core.info("currently running ensure-security-group test");

    const fsnxClient = new FsnxApiClient(args);

 
     await fsnxClient.OnStep("upsert-security-group", async () => {
 
          //core.info(JSON.stringify(fsnxClient.EventInput));
 
         const upsertSecGrpAction = fsnxClient.Actions["group-patch-upsert"];
 
         core.info(`Adding or updating security group "${upsertSecGrpAction.payload.Content.Body.displayName}"`)
          // Process Actions    
         const upsertResponse = await fsnxClient.ExecuteHttpAction("group-patch-upsert");
 
         const getResponse = await fsnxClient.ExecuteHttpAction("group-get-by-uniquename-check");
 
         const output = {...getResponse.body};
 
         fsnxClient.SubmitOutput (output)
 
     });       
 
     await fsnxClient.OnStep("delete-security-group", async () => {
 
  
         const deleteResult = await fsnxClient.ExecuteHttpAction("delete-group-by-objectid");
 
         core.info(JSON.stringify(deleteResult));
 
         const output = {
             ...deleteResult.body
         };
 
         fsnxClient.SubmitOutput (output)
 
     });      
 
     await fsnxClient.OnStep("restore-security-group", async () => {
 
  
         // Returns just a count.
         const countDeleted = await fsnxClient.ExecuteHttpAction("get-deleted-by-uniquename-count");
 
         core.info(`Count of deleted app registrations: ${countDeleted.body}`);
 
         let output = null;
 
         if (Number(countDeleted.body) > 0)
         {
             const restoreResult = await fsnxClient.ExecuteHttpAction("restore-deleted-security-group");     
             output = {...restoreResult.body};     
         }
 
         fsnxClient.SubmitOutput (output)
 
     });    


};

test();






