const core = require('@actions/core');
const artifact = require('@actions/artifact');
const helpers = require('./helpers')
const artifactClient = artifact.create();
const execute = require('./execute');
const fs = require('fs');

let lockFileDefault = "/tmp"

async function createLockFile(ankaVmTemplateName,lockFileLocation,hostCommandOptions) {
  if (lockFileLocation.length === 0) {
    lockFileLocation = lockFileDefault
  }
  if (lockFileLocation && (typeof(lockFileLocation) !== 'string' || lockFileLocation[0] !== '/')) {
    throw new Error(`must provide an absolute path (directory) where the lock file will be created, as a string`);
  }
  var lockFileFull = `${lockFileLocation}/registry-pull-lock-${ankaVmTemplateName}`
  while (fs.existsSync(lockFileFull)) { /// Check if lock file exists and prevent running until it's gone
    await execute.hostCommands(`echo \"Lock file ${lockFileFull} found... Another job on this node is pulling a tag for ${ankaVmTemplateName} and pulling a second will potentially cause corruption. Sleeping for 20 seconds...\"`,hostCommandOptions,execute.STD)
    await helpers.sleep(20000);
  }
  try {
    fs.closeSync(fs.openSync(`${lockFileFull}`, 'w'));
    console.log(`Created ${lockFileFull}!`)
    core.exportVariable(`${process.env['GITHUB_ACTION']}_hasPullLockFile`, true); // Prevent failures from cleaning up the lock file when it was never created by this run
  } catch (error) {
    throw new Error(`unable to create ${lockFileFull}\n${error.stack}`)
  }
}
module.exports.createLockFile = createLockFile;

async function deleteLockFile(ankaVmTemplateName,lockFileLocation) {
  if (typeof(lockFileLocation) === "undefined" || lockFileLocation.length === 0) {
    lockFileLocation = lockFileDefault
  }
  var lockFileFull = `${lockFileLocation}/registry-pull-lock-${ankaVmTemplateName}`
  if (process.env[`${process.env['GITHUB_ACTION']}_hasPullLockFile`] === 'true') { // Prevent failures from cleaning up the lock file when it was never created by this run
    if (fs.existsSync(lockFileFull)) {
      try {
        fs.unlinkSync(`${lockFileFull}`)
        console.log(`Deleted ${lockFileFull}!`)
        core.exportVariable(`${process.env['GITHUB_ACTION']}_hasPullLockFile`, false);
      } catch (error) {
        throw new Error(`unable to delete ${lockFileFull}\n${error.stack}`)
      }
    }
  }
}
module.exports.deleteLockFile = deleteLockFile;

async function ankaRegistryPull(ankaVmTemplateName,ankaVmTagName,ankaRegistryPullOptions,hostCommandOptions,lockFileLocation,skipRegistryPull) {
  if (typeof(skipRegistryPull) === "undefined") {
    skipRegistryPull = false
  }
  if (skipRegistryPull !== "true") {
    try {
      await createLockFile(ankaVmTemplateName,lockFileLocation,hostCommandOptions)
      var ankaVmTagNameOption = ""
      if (ankaVmTagName.length > 0) { 
        ankaVmTagNameOption = `-t ${ankaVmTagName}`
        console.log(`Preparing Anka VM (Template: ${ankaVmTemplateName}, Tag: ${ankaVmTagName})`);
      } else {
        console.log(`Preparing Anka VM (Template: ${ankaVmTemplateName}, Tag: latest)`);
      }
      await execute.hostCommands(`anka registry pull ${ankaRegistryPullOptions} ${ankaVmTemplateName} ${ankaVmTagNameOption}`,hostCommandOptions,execute.STD)
    } catch(error) {
      deleteLockFile(ankaVmTemplateName,lockFileLocation) // make sure to clean up the lock
      throw new Error(`registry pull failed:\n${error.stack}`)
    }
  }
}
module.exports.ankaRegistryPull = ankaRegistryPull;

async function ankaClone(ankaVmTemplateName,ankaVMLabel,hostCommandOptions,lockFileLocation) {
  try {
    await execute.hostCommands(`anka clone ${ankaVmTemplateName} ${ankaVMLabel}`,hostCommandOptions,execute.STD)
    core.exportVariable(`${process.env['GITHUB_ACTION']}_cloneCreated`, true);
    await deleteLockFile(ankaVmTemplateName,lockFileLocation) // make sure to clean up the lock
    await execute.hostCommands(`anka list`,hostCommandOptions,execute.STD)
  } catch(error) {
    deleteLockFile(ankaVmTemplateName,lockFileLocation) // make sure to clean up the lock
    throw new Error(`clone failed:\n${error.stack}`)
  }
}
module.exports.ankaClone = ankaClone;

async function ankaStart(ankaVMLabel,ankaStartOptions,hostCommandOptions) {
  await execute.hostCommands(`anka start ${ankaStartOptions} ${ankaVMLabel}`,hostCommandOptions,execute.STD)
}
module.exports.ankaStart = ankaStart;

async function ankaCpIn(ankaVmTemplateName,ankaCpHostPaths,ankaCpDestinationDirectory,ankaRunOptions,hostCommandOptions) {
  if (ankaCpHostPaths) {
    try {
      // Bring each path (file or folder) into the VM
      ankaCpHostPaths = ankaCpHostPaths.split("\n")
      await execute.ankaRun(ankaVmTemplateName,ankaRunOptions,`mkdir -p ${ankaCpDestinationDirectory}`,hostCommandOptions) // ensure destination directory exists on VM
      var pathsCount;
      for (pathsCount = 0; pathsCount < ankaCpHostPaths.length; pathsCount++) {
        await execute.ankaCp("in",ankaCpHostPaths[pathsCount],ankaVmTemplateName,ankaCpDestinationDirectory,hostCommandOptions)
      }
    } catch (error) {
      throw new Error(`prepare.AnkaCpIn failed:\n${error.stack}`);
    }
  } else { // If anka cp exists and user doesn't specify anything, just upload everything from CWD
    await execute.ankaCp("in","./",ankaVmTemplateName,ankaCpDestinationDirectory,hostCommandOptions)
  }
  return true
}
module.exports.ankaCpIn = ankaCpIn;

async function ankaCpOut(ankaVmTemplateName,artifactHostPaths,artifactsDirectoryOnHost,hostCommandOptions) {
  try {
    var filesCount;
    for (filesCount = 0; filesCount < artifactHostPaths.length; filesCount++) {
      await execute.ankaCp("out",artifactHostPaths[filesCount],ankaVmTemplateName,artifactsDirectoryOnHost,hostCommandOptions)
    }
  } catch (error) {
    throw new Error(`prepare.AnkaCpOut failed:\n${error.stack}`); 
  }
  return true
}
module.exports.ankaCpOut = ankaCpOut;

async function uploadArtifacts(artifactArchiveFileName,artifactHostPaths,artifactsDirectoryOnHost,hostCommandOptions) {
  if (artifactHostPaths) {
    try {
      // Upload the artifacts
      artifactArchiveFileName = await helpers.getArtifactArchiveName(artifactArchiveFileName)
      // Sanitize paths so we can archive and upload them
      var artifactHostFiles = [];
      var filesCount;
      for (filesCount = 0; filesCount < artifactHostPaths.length; filesCount++) {
        var file = helpers.obtainLastPathSection(artifactHostPaths[filesCount])
        if (fs.existsSync(file)) {
          if (fs.lstatSync(file).isDirectory()) {
            throw new Error(`unable to archive directories; archive either on the VM or the host before upload`)
          }
        } else {
          throw new Error(`cannot find ${file} on host in ${artifactsDirectoryOnHost}`)
        }
        artifactHostFiles.push(file)
      }
      var artifactResult = await artifactClient.uploadArtifact(
        artifactArchiveFileName,
        artifactHostFiles,
        artifactsDirectoryOnHost,
        { continueOnError: false }
      )
      await execute.hostCommands(`echo \"Created and uploaded artifact ${artifactResult.artifactName} (${artifactResult.size} bytes)\nArchive contents: ${artifactResult.artifactItems}\"`,hostCommandOptions,execute.STD)
    } catch (error) {
      throw new Error(`failed artifact upload!\n${error.stack}`)
    }
  }
}
module.exports.uploadArtifacts = uploadArtifacts;