const core = require('@actions/core');
const github = require('@actions/github');


try {
   const name = core.getInput('name');
   core.info(`Hello, ${name}!`);
   const time = new Date().toISOString();
   core.setOutput('time', time);
   const payload = JSON.stringify(github.context.payload, null, 2);
   core.info(`Event payload: ${payload}`);
} catch (error) {
   core.setFailed(error.message);
}