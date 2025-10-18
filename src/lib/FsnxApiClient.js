// FsnxApiClient.js

//const core = require('@actions/core');
//const msal = require('@azure/msal-node');
import * as msal from "@azure/msal-node";
import crypto from 'crypto';
import { Octokit } from '@octokit/rest';
//import * as https from 'https';
//import NodeRSA from "node-rsa";
//import nacl from 'tweetnacl';
//import { blake2b } from 'blakejs';

//import {sodium} from 'tweetsodium';

import libsodium from "libsodium-wrappers";
import {HttpsProxyAgent} from 'https-proxy-agent';
import {HttpProxyAgent} from 'http-proxy-agent';
import fetch from 'node-fetch';


import fs from 'fs';

//const fetch = require('node-fetch');

//const core = require('@actions/core');
import core from '@actions/core';
//const { buffer } = require('stream/consumers');

//const ScopeAuthMap = new Map();


export class FsnxApiClient{
    constructor({authority, client_id, client_secret, tenant_id, cloud, output_private_key, event_path}) {
        this.authority = authority;
        this.client_id = client_id;
        this.client_secret = client_secret;
        this.tenant_id = tenant_id;
        this.cloud = cloud;
        this.output_private_key = output_private_key;
        this.event_path = event_path;
    }

    #ScopeAuthMap = new Map();

    #eventInput;
    get EventInput() {
        //return this.#eventInput ??= import(this.event_path) assert { type: 'json' };;
        return this.#eventInput ??= JSON.parse(fs.readFileSync(this.event_path, 'utf8'));
    }

    #actions;
    get Actions() {
        return this.#actions ??= this.DispatchPayload.actions;
    }

    #dispatchPayload;
    get DispatchPayload() {
        return this.#dispatchPayload ??= this.EventInput.client_payload.dispatch_payload;
    }

    #currentStep;
    get CurrentStep() {
        return this.#currentStep ??= this.DispatchPayload.current_step;
    }

    #api_auth;
    async GetAppAuthToken()
    {
        return this.#api_auth ??= await DecryptData(this.EventInput.client_payload.api_token_rsa, this.output_private_key);
    }

    #octokit;
    async Octokit() {
        
        return  this.#octokit ??= new Octokit({
                    auth: await this.GetAppAuthToken(),
                    baseUrl: this.EventInput.client_payload.api_baseurl,
                    userAgent: this.EventInput.client_payload.api_userAgent,
        });
    }

    async OnStep(stepName,  callback) {

        if (this.CurrentStep == stepName)
        {
            core.info(`OnStep: ${stepName}`);
            await callback();
        } 
        else
        {
            core.info(`Skipping step: ${stepName}, current step is: ${this.CurrentStep}`);
        }

    }

    async GetAuthHeader (auth_scopes)
    {
        const scopeKey = auth_scopes.join(" ");
        
        //console.log (`scopekey: ${scopeKey}`)

        if (!this.#ScopeAuthMap.has(scopeKey)) 
        {

            //console.log (`ScopeAuthMap does not have scopekey: ${scopeKey}`)

            const tenantAuthority = new URL(this.tenant_id, this.authority)

                const msalConfig  = {
                    auth: {
                        clientId: this.client_id,
                        authority: tenantAuthority.toString(),
                        clientSecret: this.client_secret,
                    },
                };

                const tokenRequest = {
                    scopes: auth_scopes
                };

                const cca = new msal.ConfidentialClientApplication(msalConfig);

                const acquireTokenResult = await cca.acquireTokenByClientCredential(tokenRequest)

                const bearerToken = `bearer ${acquireTokenResult.accessToken}`;

            // console.log(bearerToken);

                this.#ScopeAuthMap.set(scopeKey, bearerToken);                 
        }
        else
        {
            // console.log (`ScopeAuthMap already has scopekey: ${scopeKey}`)
        }

        return this.#ScopeAuthMap.get(scopeKey);

    }

    async ExecuteHttpAction (actionName, resourceId, throwIfNotOk = false)
    {
           return this.ExecuteHttpActionV2 ({actionName, resourceId, throwIfNotOk});
    }

    async ExecuteHttpActionV2 ({actionName, resourceId, throwIfNotOk = false, debug = false, proxy} = {})
    {
                const action = this.Actions[actionName];
                if (!action) throw new Error(`Action not found: ${actionName}`);

                core.info(`ExecuteHttpAction: ${actionName}`);

                let reqUri = action.payload.RequestUri;
                if (resourceId)
                {
                    core.info(`${actionName} : Replacing empty resource ID in ${reqUri} to ${resourceId}`);                    
                    reqUri = reqUri.replace(/00000000-0000-0000-0000-000000000000/g, resourceId);
                }

                let a_payload = action.payload;

                let authHeader = await this.GetAuthHeader(action.auth_scopes);

                //console.log(authHeader);
                //console.log(action.type);

                let auth = {Authorization: authHeader};
                
                var reqBody = {}
                if (a_payload?.Content?.Body != null){
                    reqBody.body = JSON.stringify(a_payload.Content.Body);
                }
                
                //console.log(reqBody);

                // remove fusionex-dispatch-action from payload headers if present
                const payloadHeaders = {...a_payload?.Content?.Headers ?? {}, ...a_payload?.Headers ?? {}};
                if (payloadHeaders['fusionex-dispatch-action']) {
                    delete payloadHeaders['fusionex-dispatch-action'];
                }

                // Create a custom headers object that excludes automatic headers
                const customHeaders = {
                    ...payloadHeaders,
                    ...auth
                };

                const requestOptions = {
                    method: a_payload.Method,
                    headers: customHeaders,
                    ...reqBody,
                    //compress: false // Prevents Accept-Encoding from being automatically added
                };

                // Add proxy agent if specified
                if (proxy) {
                    const targetUrl = new URL(reqUri);
                    if (targetUrl.protocol === 'https:') {
                        requestOptions.agent = new HttpsProxyAgent(proxy);
                    } else {
                        requestOptions.agent = new HttpProxyAgent(proxy);
                    }
                    
                    if (debug) {
                        core.info(`Using proxy: ${proxy}`);
                        core.info(`Using node-fetch with ${targetUrl.protocol === 'https:' ? 'HTTPS' : 'HTTP'} proxy agent`);
                    }
                }

                if (debug) {
                    core.info(`Request URI: ${reqUri}`);
                    core.info(`Request Method: ${a_payload.Method}`);
                    core.info(`Request Headers: ${JSON.stringify(requestOptions.headers)}`);
                    core.info(`Request Body: ${reqBody.body ?? "No Body"}`);
                    core.info(`Using proxy: ${proxy ? 'Yes' : 'No'}`);
                }

                // Make the HTTP request using node-fetch
                const response = await fetch(reqUri, requestOptions);

                // node-fetch response handling
                const responseBody = {};
                
                // Read response body
                const responseText = await response.text();
                
                // Try to parse as JSON, fallback to text if not valid JSON
                if (responseText) {
                    try {
                        responseBody.body = JSON.parse(responseText);
                    } catch (ex) {
                        responseBody.body = responseText;
                    }
                }
                
                // Check if Not OK as well. Check if response is not ok and throw an error
                if (throwIfNotOk && !response.ok) {
                    const errorMessage = `HTTP ${response.status} ${response.statusText} for ${actionName} at ${reqUri}`;
                    const errorDetails = responseBody.body ? `: ${JSON.stringify(responseBody.body)}` : '';
                    throw new Error(errorMessage + errorDetails);
                }
                
                return {
                            status: response.status,
                            statusText: response.statusText,
                            headers: response.headers,
                            ok: response.ok,
                            ...responseBody
                        }

    }    

    async  SubmitOutput (output)
    {
            const outUrl = this.EventInput.client_payload.dispatch_output_url;

            const outputBodyObject =
            {
                dispatch_job_id: this.EventInput.client_payload.dispatch_job_id,
                step: this.CurrentStep,
                output: {...output}
            }

           

            const outputBodyJson ={ body: JSON.stringify(outputBodyObject)}
            const outputSha = await GenerateSHA(outputBodyJson.body);

            //core.info(`encrypting data ${outputSha}`);

            const rsaSha = await EncryptData(outputSha, this.output_private_key );

            const outputReqHeaders = {"Content-Type": "application/json",
                    "fusionex-output-sha": outputSha,
                    "fusionex-auth-rsa-sha": rsaSha}

            if (this.EventInput.client_payload.fusionex_accountorganizationid != null){
                outputBodyObject["fusionex_accountorganizationid"] = this.EventInput.client_payload.fusionex_accountorganizationid;
                outputReqHeaders["fusionex-accountorganizationid"] = this.EventInput.client_payload.fusionex_accountorganizationid;
            }

            if (this.EventInput.client_payload.fusionex_gitrepositoryid != null){
                outputBodyObject["fusionex_gitrepositoryid"] = this.EventInput.client_payload.fusionex_gitrepositoryid;
                outputReqHeaders["fusionex-gitrepositoryid"] = this.EventInput.client_payload.fusionex_gitrepositoryid;
            }                     

            //core.info (JSON.stringify(outputReqHeaders))

            //core.info(`processing fetch: ${outUrl}`);        

            const outputResponse = await fetch(outUrl, 
            {
            method: "POST",
            headers: { ...outputReqHeaders },
            ...outputBodyJson
            });

            //core.info("processing fetch");          
            //core.info(JSON.stringify(outputResponse))

    }

    async CreateOrUpdateRepoSecret({plainText, repo,secret_name,}) 
        {

            core.info(`Creating or updating secret ${secret_name} in repo ${repo}`)

            // Get Public Key
            const pubKeyResponse = await this.Octokit.actions.getRepoPublicKey({
                repo: repo,
            });

            core.info(JSON.stringify(pubKeyResponse));

            const repoSecret = await this.Octokit.actions.createOrUpdateRepoSecret({
                //owner: this.EventInput.repository.owner.login,
                repo: repo,
                secret_name: secret_name,
                encrypted_value: await SealSecretValue(plainText, pubKeyResponse.data.key),
                key_id: pubKeyResponse.data.key_id,
            });

            return repoSecret;
        }

    async CreateOrUpdateEnvironmentSecret({plainText, repo, environment_name, secret_name,}) 
        {
            core.info(`Creating or updating secret ${secret_name} in environment ${environment_name} of repo ${repo}`)

            // Get Public Key
            const pubKeyResponse = await this.Octokit().rest.actions.getRepoPublicKey({
                repo: repo,
            });

            core.info(JSON.stringify(pubKeyResponse));

            const repoSecret = await this.Octokit().rest.actions.createOrUpdateEnvironmentSecret({
                //owner: this.EventInput.repository.owner.login,
                repo: repo,
                secret_name: secret_name,
                environment_name: environment_name,
                encrypted_value: await SealSecretValue(plainText, pubKeyResponse.data.key),
                key_id: pubKeyResponse.data.key_id,
            });

            return repoSecret;
    }
}

async function SealSecretValue(plainText, publicKey)
{

    await libsodium.ready;
    //const sodium = libsodium    ;

        // // Implementation using tweetnacl (replicating tweetsodium functionality)
        // const key = Buffer.from(publicKey, 'base64');
        // const value = Buffer.from(plainText, 'utf8');
        
        // // Generate random keypair for sealing
        // const ephemeralKeyPair = nacl.box.keyPair();
        
        // // Create nonce using blake2b hash of the ephemeral public key
        // const nonce = blake2b(ephemeralKeyPair.publicKey, null, 24);
        
        // // Seal the message
        // const sealed = nacl.box(value, nonce, key, ephemeralKeyPair.secretKey);
        
        // // Concatenate ephemeral public key and sealed message
        // const result = new Uint8Array(ephemeralKeyPair.publicKey.length + sealed.length);
        // result.set(ephemeralKeyPair.publicKey);
        // result.set(sealed, ephemeralKeyPair.publicKey.length);
        
        // // Return base64 encoded result
        // return Buffer.from(result).toString('base64');

        // Convert the message and key to Uint8Array's (Buffer implements that interface)
        const messageBytes = Buffer.from(plainText);
        const keyBytes = Buffer.from(publicKey, 'base64');

        // Encrypt using LibSodium.
        const encryptedBytes = libsodium.crypto_box_seal(plainText, keyBytes);

        const encryptedString = Buffer.from(encryptedBytes).toString('base64');

        core.info(`Encrypted bytes: ${encryptedString}`);

        // Base64 the encrypted secret
        return encryptedString;
}

async function GenerateSHA(input) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

async function EncryptData(input, pemKey) {
    return crypto.privateEncrypt(
    {
        key: Buffer.from(pemKey),
        padding: crypto.constants.RSA_PKCS1_PADDING
        //oaepHash: "sha256",
    },
    // We convert the data string to a buffer using `Buffer.from`
    Buffer.from(input)
    ).toString("base64");
}

async function DecryptData(encryptedData, pemKey) {

  
    const decryptedText = crypto.privateDecrypt(
    {
        key: Buffer.from(pemKey),
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
    },
    // We convert the base64 string back to a buffer
    Buffer.from(encryptedData, "base64")
    ).toString("utf8");

    core.info(`Decrypted text: ${decryptedText}`);

    return decryptedText;

}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function ReplaceEmptyGuid (text, newGuid) {
    return text.replace(/00000000-0000-0000-0000-000000000000/g, newGuid);
}

export { SealSecretValue, GenerateSHA, EncryptData, DecryptData, ReplaceEmptyGuid, delay };

// module.exports = 
// {
//   FsnxApiClient,
//   GenerateSHA,
//   EncryptData,
// }