const exec = require('@actions/exec'); // EXEC IS NOT A BASH INTERPRETER: https://github.com/actions/toolkit/issues/461
const helpers = require('./helpers')
const fs = require('fs');

let STD = ''

async function hostCommands(commands,hostCommandOptions,existingSTD) {
  if (typeof(existingSTD) !== "undefined") { // Reset 
    if (existingSTD.length !== 0) {
      STD = existingSTD
    }
  } else {
    STD = ''
  }
  var options = await helpers.mergeOptions(hostCommandOptions,{
    listeners: { // Populate STDOUT AND STDERR
      stdout: (data) => {
        STD += data.toString();
      },
      stderr: (data) => {
        STD += data.toString();
      }
    }
  })
  // Ensure the options.cwd exists
  if (options.cwd) {
    try {
      await exec.exec('bash', ['-c', `cd -P ${options.cwd} || exit 10`],{silent: true});
    } catch(error) {
      throw new Error(`exec.exec failed: cannot find ${options.cwd}`)
    }
  }
  // Execute
  try {
    await exec.exec('bash', ['-c', commands], options);
  } catch(error) {
    throw new Error(`exec.exec failed:\n${helpers.lastFourLines(STD)}\n${error.stack}`)
  }
  // Return STD outputs
  exports.STD = STD;
  exports.finalHostCommandOptions = options; // used in tests
  return true
}
module.exports.hostCommands = hostCommands;

async function ankaRun(ankaVMLabel,ankaRunOptions,ankaVmCommands,hostCommandOptions) {
  // So we can use bash -s + HEREDOC, we need to add proper newlines to commands
  await hostCommands(`anka run ${ankaRunOptions} ${ankaVMLabel} bash -c \"${ankaVmCommands}\"`,hostCommandOptions,STD)
}
module.exports.ankaRun = ankaRun;

async function ankaCp(direction,location,ankaVmTemplateName,destinationDirectory,hostCommandOptions) {
  try {
    if (direction === "in") {
      if (fs.existsSync(location)) {
        if (fs.lstatSync(location).isSymbolicLink()) {
          await hostCommands(`anka cp -fRH ${location}/ ${ankaVmTemplateName}:${destinationDirectory}${helpers.obtainLastPathSection(`${location}`)}`,hostCommandOptions,STD)
        } else if (
          (fs.lstatSync(location).isDirectory()) ||
          (fs.lstatSync(location).isFile())
        ) {
          await hostCommands(`anka cp -fa ${location} ${ankaVmTemplateName}:${destinationDirectory}`,hostCommandOptions,STD)
        } else {
          throw new Error(`could not determine if "${location}" is a file, folder, symlink`)
        }
      } else {
        throw new Error(`"${location}" does not exist`)
      }
    } else { // out
      await hostCommands(`anka cp -fa ${ankaVmTemplateName}:${location} ${destinationDirectory}`,hostCommandOptions,STD)
    }
  } catch (error) {
    throw new Error(`ankaCp failed:\n${error.stack}`); 
  }
  return true
}
module.exports.ankaCp = ankaCp;