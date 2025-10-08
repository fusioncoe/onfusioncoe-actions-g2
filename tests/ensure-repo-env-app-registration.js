// ensure-repo-env-app-registration - Test Script

const core = require('@actions/core');
const msal = require('@azure/msal-node');
const fs = require('fs');

const path = require('path');

const {FsnxApiClient} = require('../src/lib/FsnxApiClient.js');
const inputs = require('../.testinput/authenticate-cicd-serviceprincipal.json');


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

 

};

test();






