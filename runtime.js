let coreModule;
let execModule;
let ioModule;
let artifactClient;

async function loadActionsRuntime() {
  if (!coreModule) {
    coreModule = await import(/* webpackMode: "eager" */ '@actions/core');
    execModule = await import(/* webpackMode: "eager" */ '@actions/exec');
    ioModule = await import(/* webpackMode: "eager" */ '@actions/io');
    const artifactModule = await import(/* webpackMode: "eager" */ '@actions/artifact');
    artifactClient = new artifactModule.DefaultArtifactClient();
  }
  return {
    core: coreModule,
    exec: execModule,
    io: ioModule,
    artifactClient
  };
}

module.exports.loadActionsRuntime = loadActionsRuntime;
