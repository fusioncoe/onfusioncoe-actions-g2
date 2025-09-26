const core = require('@actions/core');
const msal = require('@azure/msal-node');
const fs = require('fs');

const path = require('path');

const FsnxApiClient = require('../src/lib/FsnxApiClient.js');
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

    core.info(JSON.stringify(args))

    //const json = convert.xml2json(xml, { compact: true, spaces: 4 });

    core.info(`Event info path is ${args.event_path}`);    

    const eventInput = require(args.event_path);

    core.info("Event input has been collected");    

    const actions = eventInput.client_payload.dispatch_payload.actions;

    // process action 1, upsert

    core.info("Processing Actions");      

    const upsertSecGrpAction = actions[0];

    core.info(`Adding or updating security group "${upsertSecGrpAction.payload.Content.Body.displayName}"`)
    const upsertresponse = await FsnxApiClient.ExecuteHttpAction(upsertSecGrpAction, args.authority,args.client_id,args.client_secret,args.tenant_id)

    if (upsertresponse.ok) 
    {

        let secObj = upsertresponse.body;


        if (secObj == null )
        {

            const getSecGrpAction = actions[1];
    
            const getResponse = await FsnxApiClient.ExecuteHttpAction(getSecGrpAction, args.authority,args.client_id,args.client_secret,args.tenant_id);

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

        FsnxApiClient.SubmitOutput (secObj, eventInput.client_payload, args.output_private_key)

    }
    else
    {
        // TODO:  Throw Exception

    }

};

test();






