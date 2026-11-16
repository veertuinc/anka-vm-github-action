let prepare = require('./prepare');
let fs = require('fs');
const {loadActionsRuntime} = require('./runtime');

describe('prepare functions', () => {
  let core;
  beforeAll(async () => {
    ({core} = await loadActionsRuntime());
  });
  let options = "{ silent: true }"

  describe('uploadArtifacts', () => {
    test('file not found', async() => {
      fs.closeSync(fs.openSync('./test', 'w'));
      await expect(
        prepare.uploadArtifacts(
          "artifactName",
          ['test','test2','./test3'],
          "./"
        )
      ).rejects.toThrow(/Error: cannot find test2 on host in .\//);
      fs.unlinkSync('./test');
    }); // TEST
    test('folder not allowed', async() => {
      await expect(
        prepare.uploadArtifacts(
          "artifactName",
          ['testFolder','test2','./test3'],
          "./"
        )
      ).rejects.toThrow(/Error: unable to archive directories/);
    }); // TEST
  }); // DESCRIBE
  describe('deleteLockFile', () => {
    afterEach(() => {
      try{ fs.unlinkSync('/tmp/registry-pull-lock-10.15.6'); } catch(error) {}
      core.exportVariable(`${process.env['GITHUB_ACTION']}_hasPullLockFile`, false)
    });
    test('file exists', async() => {
      core.exportVariable(`${process.env['GITHUB_ACTION']}_hasPullLockFile`, true)
      fs.closeSync(fs.openSync('/tmp/registry-pull-lock-10.15.6', 'w'));
      await prepare.deleteLockFile("10.15.6")
      await expect(fs.existsSync("/tmp/registry-pull-lock-10.15.6")).toBe(false)
    }); // TEST
    test('no file, no problem', async() => {
      await prepare.deleteLockFile("10.15.6")
      await expect(fs.existsSync("/tmp/registry-pull-lock-10.15.6")).toBe(false)
    }); // TEST
  }); // DESCRIBE
});