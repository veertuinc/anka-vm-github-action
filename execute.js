const exec = require('@actions/exec'); // EXEC IS NOT A BASH INTERPRETER: https://github.com/actions/toolkit/issues/461
const helpers = require('./helpers')

let STD = ''

async function nodeCommands(commands,hostCommandOptions,existingSTD) {
  if (typeof(existingSTD) !== "undefined") { // Reset 
    if (existingSTD.length !== 0) {
      STD = existingSTD
    }
  } else {
    STD = ''
  }
  var options = await helpers.turnStringIntoObject(hostCommandOptions,{
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
      throw new Error(`cannot find ${options.cwd}`)
    }
  }
  // Execute
  try {
    await exec.exec('bash', ['-c', commands], options);
  } catch(error) {
    throw new Error(`nodeCommands exec.exec\n${error.stack}`)
  }
  // Return STD outputs
  exports.STD = STD;
  exports.finalHostCommandOptions = options; // used in tests
}
module.exports.nodeCommands = nodeCommands;

async function ankaRun(ankaVMLabel,ankaRunOptions,ankaCommands,hostCommandOptions) {
  if (typeof(ankaRunOptions) === "undefined" || ankaRunOptions.length === 0) {
    ankaRunOptions = "--wait-network --wait-time"
  }
  await nodeCommands(`anka run ${ankaRunOptions} ${ankaVMLabel} bash -c \"${ankaCommands}\"`,hostCommandOptions,STD)
}
module.exports.ankaRun = ankaRun;