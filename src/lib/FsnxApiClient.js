// FsnxApiClient.js

//const core = require('@actions/core');
const msal = require('@azure/msal-node');
const crypto = require('crypto');

const core = require('@actions/core');
//const { buffer } = require('stream/consumers');

//const ScopeAuthMap = new Map();


class FsnxApiClient{
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
        return this.#eventInput ??= require(this.event_path);
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

    async ExecuteHttpAction (actionName)
    {
                const action = this.Actions[actionName];
                if (!action) throw new Error(`Action not found: ${actionName}`);

                core.info(`ExecuteHttpAction: ${actionName}`);

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

                const response = await fetch(action.payload.RequestUri, 
                {
                    credentials: "include",
                    method: a_payload.Method,
                    headers: {...a_payload?.Content?.Headers ?? {}, ...a_payload?.Headers ?? {}, ...auth},
                    ...reqBody
                });

                //console.log(response);

                const responseBody = {};
                if (response.body != null)
                {
                    responseBody.body = await response.json();
                    //console.log(responseJson);
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
                fusionex_accountorganizationid: this.EventInput.client_payload.fusionex_accountorganizationid,
                step: this.CurrentStep,
                output: {...output}
            }

            const outputBodyJson ={ body: JSON.stringify(outputBodyObject)}
            const outputSha = await GenerateSHA(outputBodyJson.body);

            //core.info(`encrypting data ${outputSha}`);

            const rsaSha = await EncryptData(outputSha, this.output_private_key );

            const outputReqHeaders = {"Content-Type": "application/json",
                    "fusionex-output-sha": outputSha,
                    "fusionex-auth-rsa-sha": rsaSha,
                    "fusionex-accountorganizationid": this.EventInput.client_payload.fusionex_accountorganizationid }

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



module.exports = 
{
  FsnxApiClient,
  GenerateSHA,
  EncryptData,
}