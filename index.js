const core = require('@actions/core');
const io = require('@actions/io');
const helpers = require('./helpers')
const prepare = require('./prepare');
const execute = require('./execute');

// Envs accessible to post/cleanup
const hostCommandOptions = core.getInput('host-command-options');
const ankaCustomVMLabel = core.getInput('anka-custom-vm-label');
const ankaVmTemplateName = core.getInput('anka-vm-template-name');
const lockFileLocation = core.getInput('lock-file-location');

async function run() {
  try {
    const ankaVmTagName = core.getInput('anka-vm-tag-name');
    const ankaVMLabel = await helpers.getVMLabel(ankaCustomVMLabel)

    const ankaVmCommands = core.getInput('vm-commands');
    const hostPreCommands = core.getInput('host-pre-commands');
    const hostPostCommands = core.getInput('host-post-commands');

    const ankaStartOptions = core.getInput('anka-start-options');
    var ankaRunOptions = core.getInput('anka-run-options');
    if (typeof(ankaRunOptions) === "undefined" || ankaRunOptions.length === 0) {
      ankaRunOptions = "--wait-network --wait-time"
    }
    const ankaRegistryPullOptions = core.getInput('anka-registry-pull-options');
    
    var ankaCpDisabled = false
    var ankaCpDisabledInput = core.getInput('anka-cp-disable');
    try { // Ensure anka cp is disabled if the command doesn't exist
      await execute.hostCommands(`anka cp --help &>/dev/null`,await helpers.mergeOptions(hostCommandOptions,{silent: true}),execute.STD)
      if (ankaCpDisabledInput) {
        ankaCpDisabled = true
      }
    } catch (error) {
      console.log(`NOTICE: anka cp command not found (Anka versions <= 2.2.3); using legacy mount method`);
      ankaCpDisabled = true
    }
    if (!ankaCpDisabled) {
      ankaRunOptions = ankaRunOptions + " --no-volume"
    }
    const ankaCpHostPaths = core.getInput('anka-cp-host-paths');
    var ankaCpDestinationDirectory = './'
    var ankaCpDestinationDirectoryInput = core.getInput('anka-cp-destination-directory');
    if (ankaCpDestinationDirectoryInput) {
      if (ankaCpDestinationDirectoryInput.slice(-1) != "/") {
        throw new Error (`anka-cp-destination-directory must end in a /`)
      }
      ankaCpDestinationDirectory = ankaCpDestinationDirectoryInput
    }
    
    var artifactHostPaths = core.getInput('artifact-files');
    if (artifactHostPaths) {
      artifactHostPaths = artifactHostPaths.split("\n")
    }
    const artifactArchiveFileName = core.getInput('artifact-archive-file-name');
    var artifactsDirectoryOnHost = './'
    var artifactsDirectoryOnHostInput = core.getInput('artifacts-directory-on-host');
    if (artifactsDirectoryOnHostInput) {
      if (artifactsDirectoryOnHostInput.slice(-1) != "/") {
        throw new Error (`artifacts-directory-on-host must end in a /`)
      }
      artifactsDirectoryOnHost = artifactsDirectoryOnHostInput
    }

    const skipRegistryPull = core.getInput('skip-registry-pull');

    const ankaVirtCLIPath = await io.which('anka', true)

    console.log(`Anka Virtualization CLI found at: ${ankaVirtCLIPath}`);
    if (ankaVmTemplateName.length === 0) {
      throw new Error('anka-vm-template-name is required in your workflow definition!'); 
    }
    // Execution =========
    if (hostPreCommands) {
      await execute.hostCommands(hostPreCommands,hostCommandOptions,execute.STD)
    }
    /// Prepare VM
    //// Pull from Registry
    await prepare.ankaRegistryPull(ankaVmTemplateName,ankaVmTagName,ankaRegistryPullOptions,hostCommandOptions,lockFileLocation,skipRegistryPull);
    /// Don't start the VM if the user didn't provide any commands
    if (ankaVmCommands !== "" && typeof(ankaVmCommands) !== "undefined") {
      //// Clone from template
      await prepare.ankaClone(ankaVmTemplateName,ankaVMLabel,hostCommandOptions,lockFileLocation);
      //// Start the VM
      await prepare.ankaStart(ankaVMLabel,ankaStartOptions,hostCommandOptions);
      //// Copy in user specified paths
      if (!ankaCpDisabled) {
        await prepare.ankaCpIn(ankaVMLabel,ankaCpHostPaths,ankaCpDestinationDirectory,ankaRunOptions,hostCommandOptions);
      }
      /// Run commands inside VM
      await execute.ankaRun(ankaVMLabel,ankaRunOptions,ankaVmCommands,hostCommandOptions);
      if (hostPostCommands) {
        await execute.hostCommands(hostPostCommands,hostCommandOptions,execute.STD);
      }
      if (artifactHostPaths) { // No artifacts, no problem!
        // Copy out the files for archiving
        if (!ankaCpDisabled) {
          await prepare.ankaCpOut(ankaVMLabel,artifactHostPaths,artifactsDirectoryOnHost,hostCommandOptions);
        }
        await prepare.uploadArtifacts(artifactArchiveFileName,artifactHostPaths,artifactsDirectoryOnHost,hostCommandOptions)
      }
    } // 
    core.setOutput('std', execute.STD);
    /// Cleanup
    helpers.cleanup(ankaCustomVMLabel,hostCommandOptions,ankaVmTemplateName,lockFileLocation)
  } catch (error) {
    core.setFailed(`${error.stack}`);
  }
}

// We use GITHUB_ACTION in the ENV to prevent other steps from using isPost when they didn't really fail.
if (process.env[`${process.env['GITHUB_ACTION']}_isPost`] === 'true') {
  helpers.cleanup(ankaCustomVMLabel,hostCommandOptions,ankaVmTemplateName,lockFileLocation)
} else {
  core.exportVariable(`${process.env['GITHUB_ACTION']}_isPost`, true);
  run()
}
