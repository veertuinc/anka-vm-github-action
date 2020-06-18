const core = require('@actions/core');
const io = require('@actions/io');
const helpers = require('./helpers')
const prepare = require('./prepare');
const execute = require('./execute');

// Envs accessible to post/cleanup
const hostCommandOptions = core.getInput('host-command-options');
const ankaCustomVMLabel = core.getInput('anka-custom-vm-label');
const ankaTemplate = core.getInput('anka-template');
const lockFileLocation = core.getInput('lock-file-location');

async function run() {
  try {
    const ankaTag = core.getInput('anka-tag');
    const ankaVMLabel = await helpers.getVMLabel(ankaCustomVMLabel)

    const ankaCommands = core.getInput('commands');
    const hostPreCommands = core.getInput('host-pre-commands');
    const hostPostCommands = core.getInput('host-post-commands');

    const ankaStartOptions = core.getInput('anka-start-options');
    const ankaRunOptions = core.getInput('anka-run-options');
    const ankaRegistryPullOptions = core.getInput('anka-registry-pull-options');

    const filesToArtifact = core.getInput('artifact-files');
    const artifactArchiveFileName = core.getInput('artifact-archive-file-name');
    const artifactRootDirectory = core.getInput('artifacts-root-directory');

    const skipRegistryPull = core.getInput('skip-registry-pull');

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
    console.log(`Running commands inside of Anka VM ==============\nAnka run options: ${ankaRunOptions}\n${ankaCommands}\n==============\n`)
    await execute.ankaRun(ankaVMLabel,ankaRunOptions,ankaCommands,hostCommandOptions);
    if (hostPostCommands) {
      await execute.nodeCommands(hostPostCommands,hostCommandOptions,execute.STD);
    }
    if (filesToArtifact) { // No artifacts, no problem!
      await prepare.uploadArtifacts(artifactArchiveFileName,filesToArtifact,artifactRootDirectory,hostCommandOptions)
    }
    core.setOutput('std', execute.STD);
    /// Cleanup
    helpers.cleanup(ankaCustomVMLabel,hostCommandOptions,ankaTemplate,lockFileLocation)
  } catch (error) {
    core.setFailed(`${error.stack}`);
  }
}

// We use GITHUB_ACTION in the ENV to prevent other steps from using isPost when they didn't really fail.
if (process.env[`${process.env['GITHUB_ACTION']}_isPost`] === 'true') {
  helpers.cleanup(ankaCustomVMLabel,hostCommandOptions,ankaTemplate,lockFileLocation)
} else {
  core.exportVariable(`${process.env['GITHUB_ACTION']}_isPost`, true);
  run()
}
