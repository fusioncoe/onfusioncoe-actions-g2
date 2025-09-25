// root index.js

//const core = require('@actions/core');
const msal = require('@azure/msal-node');

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

module.exports = 
{
  GetAuthHeader,
  ExecuteHttpAction 
}