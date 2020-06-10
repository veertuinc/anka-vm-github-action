const core = require('@actions/core');
const io = require('@actions/io');
const helpers = require('./helpers')
const prepare = require('./prepare');
const execute = require('./execute');

// most @actions toolkit packages have async methods
async function run() {

  const ankaTemplate = core.getInput('anka-template');
  const ankaTag = core.getInput('anka-tag');

  const ankaCustomVMLabel = core.getInput('anka-custom-vm-label');
  const ankaVMLabel = await helpers.getVMLabel(ankaCustomVMLabel)

  const ankaCommands = core.getInput('commands');
  const hostPreCommands = core.getInput('host-pre-commands');
  const hostPostCommands = core.getInput('host-post-commands');

  const ankaStartOptions = core.getInput('anka-start-options');
  const ankaRunOptions = core.getInput('anka-run-options');
  const ankaRegistryPullOptions = core.getInput('anka-registry-pull-options');
  const hostCommandOptions = core.getInput('host-command-options');

  const filesToArtifact = core.getInput('artifact-files');
  const artifactArchiveFileName = core.getInput('artifact-archive-file-name');
  const artifactRootDirectory = core.getInput('artifacts-root-directory');

  const skipRegistryPull = core.getInput('skip-registry-pull');
  const lockFileLocation = core.getInput('lock-file-location');
  
  try {

    const ankaVirtCLIPath = await io.which('anka', true)
    console.log(`Anka Virtualization CLI found at: ${ankaVirtCLIPath}`);
    if (ankaTemplate.length === 0) {
      throw new Error('anka-template is required in your workflow definition!'); 
    }
    // Execution =========
    if (hostPreCommands) {
      await execute.nodeCommands(hostPreCommands,hostCommandOptions,execute.STD)
    }
    /// Prepare VM
    //// Pull from Registry
    await prepare.ankaRegistryPull(ankaTemplate,ankaTag,ankaRegistryPullOptions,hostCommandOptions,lockFileLocation,skipRegistryPull);
    //// Clone from template
    await prepare.ankaClone(ankaTemplate,ankaVMLabel,hostCommandOptions,lockFileLocation);
    //// Start the VM
    await prepare.ankaStart(ankaVMLabel,ankaStartOptions,hostCommandOptions);
    /// Run commands inside VM
    console.log(`Running commands inside of Anka VM (with ${ankaRunOptions})\n======================\n${ankaCommands}\n======================`)
    await execute.ankaRun(ankaVMLabel,ankaRunOptions,ankaCommands,hostCommandOptions);
    if (hostPostCommands) {
      await execute.nodeCommands(hostPostCommands,hostCommandOptions,execute.STD);
    }
    if (filesToArtifact) { // No artifacts, no problem!
      await prepare.uploadArtifacts(artifactArchiveFileName,filesToArtifact,artifactRootDirectory,hostCommandOptions)
    }
    core.setOutput('std', execute.STD);
    /// Cleanup
    await execute.nodeCommands(`anka delete --yes ${ankaVMLabel}`,await helpers.turnStringIntoObject(hostCommandOptions,{ silent: true }),execute.STD);
  } catch (error) {
    core.setFailed(error.stack);
    console.log(`Cleaning up ${ankaVMLabel} if it exists...`)
    await execute.nodeCommands(`anka delete --yes ${ankaVMLabel}`,await helpers.turnStringIntoObject(hostCommandOptions,{ silent: true }),execute.STD)
    await prepare.deleteLockFile(ankaTemplate,lockFileLocation) // make sure to clean up the lock
  }
}

run()
