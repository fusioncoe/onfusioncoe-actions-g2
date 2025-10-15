// ensure-maker - Test Script

import fs from 'fs';
import core from '@actions/core';
import path from 'path';

import { FsnxApiClient } from '../src/lib/FsnxApiClient.js';

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

const event_path = path.resolve(`${__dirname}\\..\\.testinput\\ensure-maker.json`);

const args = 
{
    ...inputs,
    event_path: event_path,
    output_private_key: privateKeyPem
}

const test = async () => {

    core.info("currently running ensure-maker test");

    const fsnxClient = new FsnxApiClient(args);

    //core.info(JSON.stringify(fsnxClient.EventInput));

   await fsnxClient.OnStep("<<STEP_NAME>>", async () => {

        // Process Actions    
        const response = await fsnxClient.ExecuteHttpAction("<<ACTION_NAME>>");

        const output = {...response.body};

        fsnxClient.SubmitOutput (output)

    }); 

};

test();






