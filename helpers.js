function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
module.exports.sleep = sleep;

async function getVMLabel(ankaCustomVMLabel) {
  if (typeof(ankaCustomVMLabel) === "undefined" || ankaCustomVMLabel.length === 0) {
    return `github-actions-\${GITHUB_REPOSITORY}-\${GITHUB_RUN_NUMBER}-\${GITHUB_JOB}-\${GITHUB_ACTION}`
  } else {
    // Needs a random number to prevent collision (we use GITHUB_RUN_NUMBER and GITHUB_ACTION for this if user doesn't specify a label); might be removed in later versions
    return `${ankaCustomVMLabel}-${Math.floor(Math.random() * 9999) + 1}`
  }
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

async function turnStringIntoObject(hostCommandOptions,options) {
  if (options === undefined) {
    var options = {}
  }
  // Make sure the host-command-options the user sends in are valid
  if (typeof(hostCommandOptions) === 'object') { // When calling this function to add hostCommandOptions (like artifact uploading does), hostCommandOptions will become an object and need to be stringified again
    hostCommandOptions = JSON.stringify(hostCommandOptions)
  }
  if (hostCommandOptions && typeof(hostCommandOptions) === 'string') {
    try {
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
module.exports.turnStringIntoObject = turnStringIntoObject;
