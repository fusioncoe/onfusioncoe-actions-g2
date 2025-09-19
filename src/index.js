const core = require('@actions/core');
const github = require('@actions/github');


(async () => {

    const formData = new FormData();
    formData.append("client_id", client_id);
    formData.append("client_secret", client_secret);
    formData.append("scope", scope);
    formData.append("grant_type", "client_credentials");


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

    const bearer = `bearer ${authResponse.access_token}`;  
    
    core.setOutput('authorization_header', bearer);    

    const payload = JSON.stringify(github.context.payload, null, 2);
    core.info(`Event payload: ${payload}`);

}).
catch (error => {
   core.setFailed(error.message);
});