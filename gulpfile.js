
const gulp = require('gulp');
const {glob} = require('glob');
const esbuild = require('esbuild')
const fs = require('fs-extra')
const path = require('path');
const log = require('fancy-log');

const ignoreYaml = require("./ignoreYaml.json");

const outdir = path.resolve('./out');
const distdir = path.resolve('./dist');
const sourcedir = path.resolve('./src');

function defaultTask(cb) {
  // place code for your default task here
  cb();
}

async function build() {
    fs.emptyDirSync(distdir);

    glob.sync('**/action.yml', {
            cwd: __dirname
        })
    // ignore the toplevel action.yml that is needed for GH Marketplace
    .filter(actionYaml => path.dirname(actionYaml) !== '.')
    .filter((actionYaml) => !ignoreYaml.includes(path.dirname(actionYaml)))
    .map(actionYaml => path.basename(path.dirname(actionYaml)))
    .map((actionName, idx) => {
        const actionPath = path.join('actions', actionName);
        const actionDistDir = path.resolve(distdir, actionPath);
        log.info(`package action ${idx} "${actionName}" into ./dist folder (${actionDistDir})...`);
        esbuild.buildSync({
            bundle: true,
            entryPoints: [ path.resolve(sourcedir, actionPath, 'index.js') ],
            outfile: path.join(actionDistDir, 'index.js'),
            platform: 'node',
        });
    });
}
exports.default = defaultTask;
exports.build = build;