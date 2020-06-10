const artifact = require('@actions/artifact');
const helpers = require('./helpers')
const artifactClient = artifact.create();
const execute = require('./execute');
const fs = require('fs');

let lockFileDefault = "/tmp"

async function createLockFile(ankaTemplate,lockFileLocation,hostCommandOptions) {
  if (lockFileLocation.length === 0) {
    lockFileLocation = lockFileDefault
  }
  if (lockFileLocation && (typeof(lockFileLocation) !== 'string' || lockFileLocation[0] !== '/')) {
    throw new Error(`Must provide an absolute path (directory) where the lock file will be created, as a string`);
  }
  var lockFileFull = `${lockFileLocation}/registry-pull-lock-${ankaTemplate}`
  while (fs.existsSync(lockFileFull)) { /// Check if lock file exists and prevent running until it's gone
    await execute.nodeCommands(`echo \"Lock file ${lockFileFull} found... Another job on this node is pulling a tag for ${ankaTemplate} and pulling a second will potentially cause corruption. Sleeping for 20 seconds...\"`,hostCommandOptions,execute.STD)
    await helpers.sleep(20000);
  }
  try {
    fs.closeSync(fs.openSync(`${lockFileFull}`, 'w'));
  } catch (error) {
    throw new Error(`Unable to create ${lockFileFull}\n${error.stack}`)
  }
}
module.exports.createLockFile = createLockFile;

async function deleteLockFile(ankaTemplate,lockFileLocation) {
  if (typeof(lockFileLocation) === "undefined" || lockFileLocation.length === 0) {
    lockFileLocation = lockFileDefault
  }
  var lockFileFull = `${lockFileLocation}/registry-pull-lock-${ankaTemplate}`
  if (fs.existsSync(lockFileFull)) {
    try {
      fs.unlinkSync(`${lockFileFull}`)
    } catch (error) {
      throw new Error(`Unable to delete ${lockFileFull}\n${error.stack}`)
    }
  }
}
module.exports.deleteLockFile = deleteLockFile;

async function ankaRegistryPull(ankaTemplate,ankaTag,ankaRegistryPullOptions,hostCommandOptions,lockFileLocation,skipRegistryPull) {
  if (typeof(skipRegistryPull) === "undefined") {
    skipRegistryPull = false
  }
  if (skipRegistryPull !== "true") {
    try {
      await createLockFile(ankaTemplate,lockFileLocation,hostCommandOptions)
      var ankaTagOption = ""
      if (ankaTag.length > 0) { 
        ankaTagOption = `-t ${ankaTag}`
        console.log(`Preparing Anka VM (Template: ${ankaTemplate}, Tag: ${ankaTag})`);
      } else {
        console.log(`Preparing Anka VM (Template: ${ankaTemplate}, Tag: latest)`);
      }
      await execute.nodeCommands(`anka registry pull ${ankaRegistryPullOptions} ${ankaTemplate} ${ankaTagOption}`,hostCommandOptions,execute.STD)
    } catch(error) {
      deleteLockFile(ankaTemplate,lockFileLocation) // make sure to clean up the lock
      throw new Error(`Registry pull failed!\n${error.stack}`)
    }
  }
}
module.exports.ankaRegistryPull = ankaRegistryPull;

async function ankaClone(ankaTemplate,ankaVMLabel,hostCommandOptions,lockFileLocation) {
  try {
    await execute.nodeCommands(`anka clone ${ankaTemplate} ${ankaVMLabel}`,hostCommandOptions,execute.STD)
    await deleteLockFile(ankaTemplate,lockFileLocation) // make sure to clean up the lock
    await execute.nodeCommands(`anka list`,hostCommandOptions,execute.STD)
  } catch(error) {
    deleteLockFile(ankaTemplate,lockFileLocation) // make sure to clean up the lock
    throw new Error(`Clone failed!\n${error.stack}`)
  }
}
module.exports.ankaClone = ankaClone;

async function ankaStart(ankaVMLabel,ankaStartOptions,hostCommandOptions) {
  await execute.nodeCommands(`anka start ${ankaStartOptions} ${ankaVMLabel}`,hostCommandOptions,execute.STD)
}
module.exports.ankaStart = ankaStart;

async function uploadArtifacts(artifactArchiveFileName,filesToArtifact,artifactRootDirectory,hostCommandOptions) {
  if (typeof(artifactRootDirectory) === "undefined" || artifactRootDirectory.length === 0) {
    artifactRootDirectory = './'
  }
  if (filesToArtifact) {
    try {
      artifactArchiveFileName = await helpers.getArtifactArchiveName(artifactArchiveFileName)
      var artifactResult = await artifactClient.uploadArtifact(
        artifactArchiveFileName,
        filesToArtifact.split("\n"),
        artifactRootDirectory,
        { continueOnError: false }
      )
      await execute.nodeCommands(`echo \"Created and uploaded artifact ${artifactResult.artifactName} (${artifactResult.size} bytes)\nArchive contents: ${artifactResult.artifactItems}\"`,await helpers.turnStringIntoObject(hostCommandOptions,{ silent: true }),execute.STD)
    } catch (error) {
      throw new Error(`Failed artifact upload!\n${error.stack}`)
    }
  }
}
module.exports.uploadArtifacts = uploadArtifacts;