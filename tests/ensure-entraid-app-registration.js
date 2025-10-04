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

    
    await fsnxClient.OnStep("delete-app-registration", async () => {

 



        const output = {
        };

        fsnxClient.SubmitOutput (output)

    });    


    await fsnxClient.OnStep("restore-app-registration", async () => {

 



        const output = {
        };

        fsnxClient.SubmitOutput (output)

    });     
    
};

test();






