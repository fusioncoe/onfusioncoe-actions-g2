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

    core.info(JSON.stringify(fsnxClient.EventInput));

    const upsertSecGrpAction = fsnxClient.Actions["group-patch-upsert"];

    core.info(`Adding or updating security group "${upsertSecGrpAction.payload.Content.Body.displayName}"`)
    const upsertresponse = await fsnxClient.ExecuteHttpAction("group-patch-upsert");

    if (upsertresponse.ok) 
    {

        let secObj = upsertresponse.body;


        if (secObj == null )
        {

            core.info("Security group already exists.  Retrieving Object Id");

            const getResponse = await fsnxClient.ExecuteHttpAction("group-get-by-uniquename-check");

            if (getResponse.ok) {
                secObj = getResponse.body;
            }
            else
            {
                
            }
        }

        core.info(JSON.stringify(secObj))

        core.setOutput('object_id',secObj?.id);

        // Test Output Functionality

        fsnxClient.SubmitOutput (secObj)

    }
    else
    {
        // TODO:  Throw Exception

    }   


};

test();






