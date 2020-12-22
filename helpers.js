const core = require('@actions/core');
const execute = require('./execute');
const prepare = require('./prepare');

function obtainLastPathSection(path) {
  var pathArray = path.split("/");
  var lastIndex = pathArray.length - 1;
  return pathArray[lastIndex];
};
module.exports.obtainLastPathSection = obtainLastPathSection;

function lastFourLines(multiLineString) {
  var multiLineStringArr = multiLineString.split("\n")
  for(var cnt=0;cnt<multiLineStringArr.length;cnt++){ // indent
    if (`${multiLineStringArr[cnt].trim()}` !== "") {
      multiLineStringArr[cnt] = `STDOUT: ${multiLineStringArr[cnt]}`
    }
  }
  var lastFourLines = multiLineStringArr.slice(multiLineStringArr.length - 4)
  return `${lastFourLines.join("\n").trim()}`
}
module.exports.lastFourLines = lastFourLines;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
module.exports.sleep = sleep;

async function getVMLabel(ankaCustomVMLabel) {
  if (process.env[`${process.env['GITHUB_ACTION']}_vmLabel`] !== undefined) { // return the existing VM's label
    return process.env[`${process.env['GITHUB_ACTION']}_vmLabel`]
  }
  if (typeof(ankaCustomVMLabel) === "undefined" || ankaCustomVMLabel.length === 0) {
    var vmLabel = `github-actions-${process.env['GITHUB_REPOSITORY']}-${process.env['GITHUB_RUN_NUMBER']}-${process.env['GITHUB_JOB']}-${process.env['GITHUB_ACTION']}`
  } else {
    // Needs a random number to prevent collision (we use GITHUB_RUN_NUMBER and GITHUB_ACTION for this if user doesn't specify a label); might be removed in later versions
    var vmLabel = `${ankaCustomVMLabel}-${Math.floor(Math.random() * 9999) + 1}`
  }
  core.exportVariable(`${process.env['GITHUB_ACTION']}_vmLabel`, vmLabel);
  return vmLabel
}
module.exports.getVMLabel = getVMLabel;

async function getArtifactArchiveName(artifactArchiveFileName) {
  if (typeof(artifactArchiveFileName) === "undefined" || artifactArchiveFileName.length === 0) {
    return `artifact`
  } else {
    return artifactArchiveFileName
  }
}
module.exports.getArtifactArchiveName = getArtifactArchiveName;

async function mergeOptions(hostCommandOptions,options) {
  if (options === undefined) {
    var options = {}
  }
  // Make sure the host-command-options the user sends in are valid
  if (typeof(hostCommandOptions) === 'object') { // When calling this function to add hostCommandOptions (like artifact uploading does), hostCommandOptions will become an object and need to be stringified again
    hostCommandOptions = JSON.stringify(hostCommandOptions)
  }
  if (hostCommandOptions && typeof(hostCommandOptions) === 'string') {
    try { // turn string into object
      var userHostCommandOptions = JSON.parse(hostCommandOptions.replace(/(\w+:)|(\w+ :)/g, function(s) {
        return '"' + s.substring(0, s.length-1) + '":';
      }));
      for (var key of Object.keys(userHostCommandOptions)) {
        options[`${key}`] = userHostCommandOptions[key]
      }
    } catch(error) {
      throw new Error(`host-command-options must be a js object (do not use single quotes to wrap values!) or JSON ({ "cwd": "./pathOnHostToRunAnkaCommands" }) inside of a string!\nSupported options: https://github.com/actions/toolkit/blob/master/packages/exec/src/interfaces.ts\n${error.stack}`); 
    }
  }
  return options
}
module.exports.mergeOptions = mergeOptions;

async function cleanup(ankaCustomVMLabel,hostCommandOptions,ankaVmTemplateName,lockFileLocation) {
  try {
    if (process.env[`${process.env['GITHUB_ACTION']}_isCreated`] === 'true') { // Prevent the delete if the VM was never created
      await execute.hostCommands(`anka delete --yes ${await getVMLabel(ankaCustomVMLabel)}`,await mergeOptions(hostCommandOptions,{ silent: false }),execute.STD)
      core.exportVariable(`${process.env['GITHUB_ACTION']}_isCreated`, false);
    }
    await prepare.deleteLockFile(ankaVmTemplateName,lockFileLocation)
  } catch (error) {
    throw new Error(`cleanup failed:\n${error.stack}`); 
  }
}
module.exports.cleanup = cleanup;