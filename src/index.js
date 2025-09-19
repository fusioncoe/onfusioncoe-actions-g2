const core = require('@actions/core');
const github = require('@actions/github');


(async () => {


    const tenant_id = core.getInput("tenant_id");
    const client_secret = core.getInput("client_secret");
    const client_id = core.getInput("client_id");
    const scope = core.getInput("scope");            

    const formData = new FormData();
    formData.append("client_id", client_id);
    formData.append("client_secret", client_secret);
    formData.append("scope", core.getInput("scope"));
    formData.append("grant_type", scope);

    if (client_secret == null || client_secret.length() == 0){
         throw new Error(
            `Invalid Client Secret`,
        );       
    }

    const fetchUrl = `https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/token`;

    const response = await fetch(fetchUrl, {
        method: "POST",
        body: formData,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
        },
    });
    
    if (!response.ok) {
        throw new Error(
            `Error Authenticating! status: ${response.status} : ${response.statusText} : ${fetchUrl}`,
        );
    }    

    const bearer = `bearer ${response.access_token}`;  
    
    core.setOutput('authorization_header', bearer);    

    const payload = JSON.stringify(github.context.payload, null, 2);
    core.info(`Event payload: ${payload}`);

})().
catch (error => {
   core.setFailed(error.message);
});