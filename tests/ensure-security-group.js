const core = require('@actions/core');
const msal = require('@azure/msal-node');

const FsnxApiClient = require('../src/lib/FsnxApiClient.js');

const inputs = require('../.testinput/authenticate-cicd-serviceprincipal.json');
const eventInput = require('../.testinput/ensure-security-group.json');

const tenant_id = inputs.tenant_id;
const client_id = inputs.client_id;
const client_secret = inputs.client_secret;
const authority = inputs.authority;

(async () => {

    const actions = eventInput.client_payload.dispatch_payload.actions;

    // process action 1, upsert

    const upsertSecGrpAction = actions[0];

    const upsertresponse = await FsnxApiClient.ExecuteHttpAction(upsertSecGrpAction, authority,client_id,client_secret,tenant_id)

    const getSecGrpAction = actions[1];
    
    const getResponse = await FsnxApiClient.ExecuteHttpAction(getSecGrpAction, authority,client_id,client_secret,tenant_id)

})();



