// FsnxApiClient.js

//const core = require('@actions/core');
const msal = require('@azure/msal-node');
const crypto = require('crypto');
//const { buffer } = require('stream/consumers');

const ScopeAuthMap = new Map();

async function GetAuthHeader (authority, client_id, client_secret, tenant_id, scope)
{

    const scopeKey = scope.join(" ");
    
    //console.log (`scopekey: ${scopeKey}`)

    if (!ScopeAuthMap.has(scopeKey)) 
    {

          //console.log (`ScopeAuthMap does not have scopekey: ${scopeKey}`)

           const tenantAuthority = new URL(tenant_id, authority)

            const msalConfig  = {
                auth: {
                    clientId: client_id,
                    authority: tenantAuthority.toString(),
                    clientSecret: client_secret,
                },
            };

            const tokenRequest = {
                scopes: scope,
            };

            const cca = new msal.ConfidentialClientApplication(msalConfig);

            const acquireTokenResult = await cca.acquireTokenByClientCredential(tokenRequest)

            const bearerToken = `bearer ${acquireTokenResult.accessToken}`;

           // console.log(bearerToken);

            ScopeAuthMap.set(scopeKey, bearerToken);                 

    }
    else
    {
        // console.log (`ScopeAuthMap already has scopekey: ${scopeKey}`)
    }

    return ScopeAuthMap.get(scopeKey);

}

async function ExecuteHttpAction (action, authority, client_id, client_secret, tenant_id)
{

            let a_payload = action.payload;

            let authHeader = await GetAuthHeader(authority,client_id,client_secret,tenant_id, action.auth_scopes);

            //console.log(authHeader);
            //console.log(action.type);

            let auth = {Authorization: authHeader};

            // if (payload.Content != null){
            //     headers['Content-Type'] = "application/json"
            // }

            // payload.Headers.forEach(h => {
            //     headers[h.Key] = h.Value
            // });

            
            // let reqBody =
            // {
            //    method: a_payload.Method,
            //    headers: {...a_payload?.Content?.Headers ?? {}, ...a_payload?.Headers ?? {}, ...auth},
            //  };


             
             var reqBody = {}
             if (a_payload?.Content?.Body != null){
                reqBody.body = JSON.stringify(a_payload.Content.Body);
             }
             
             //console.log(reqBody);

             response = await fetch(action.payload.RequestUri, 
             {
                credentials: "include",
                method: a_payload.Method,
                headers: {...a_payload?.Content?.Headers ?? {}, ...a_payload?.Headers ?? {}, ...auth},
                ...reqBody
             });

             //console.log(response);

             responseBody = {};
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

async function SubmitOutput (output, client_payload, private_key)
{
        const outUrl = client_payload.dispatch_output_url;

        const outputBodyObject =
        {
            dispatch_job_id: client_payload.dispatch_job_id,
            fusionex_accountorganizationid: client_payload.fusionex_accountorganizationid,
            output: {...output}
        }

        const outputBodyJson ={ body: JSON.stringify(outputBodyObject)}
        const outputSha = await GenerateSHA(outputBodyJson.body);

        //core.info(`encrypting data ${outputSha}`);

        const rsaSha = await EncryptData(outputSha, private_key );

        const outputReqHeaders = {"Content-Type": "application/json",
                  "fusionex-output-sha": outputSha,
                  "fusionex-auth-rsa-sha": rsaSha,
                  "fusionex-accountorganizationid": client_payload.fusionex_accountorganizationid }

        //core.info (JSON.stringify(outputReqHeaders))

        //core.info(`processing fetch: ${outUrl}`);        

        outputResponse = await fetch(outUrl, 
        {
        method: "POST",
        headers: { ...outputReqHeaders },
        ...outputBodyJson
        });

        //core.info("processing fetch");          
        //core.info(JSON.stringify(outputResponse))

}

module.exports = 
{
  GetAuthHeader,
  ExecuteHttpAction,
  GenerateSHA,
  EncryptData,
  SubmitOutput
}