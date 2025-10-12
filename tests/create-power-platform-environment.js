// create-power-platform-environment - Test Script

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

const event_path = path.resolve(`${__dirname}\\..\\.testinput\\create-power-platform-environment.json`);

const args = 
{
    ...inputs,
    event_path: event_path,
    output_private_key: privateKeyPem
}

const test = async () => {

    core.info("currently running create-power-platform-environment test");

 

};

test();






