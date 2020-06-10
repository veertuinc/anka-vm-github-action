let prepare = require('./prepare');
let fs = require('fs')

describe('prepare functions', () => {
  // let options = "{ silent: true }"
  describe('uploadArtifacts', () => {
    test('file not found', async() => {
      fs.closeSync(fs.openSync('./test', 'w'));
      await expect(
        prepare.uploadArtifacts(
          "artifacto",
          `test\ntest2\n./test3`
        )
      ).rejects.toThrowError(/Error: File test2 does not exist/);
      fs.unlinkSync('./test');
    }); // TEST
  }); // DESCRIBE
  describe('deleteLockFile', () => {
    afterEach(() => {
      try{ fs.unlinkSync('/tmp/registry-pull-lock-10.15.4'); } catch(error) {}
    });
    test('file exists', async() => {
      fs.closeSync(fs.openSync('/tmp/registry-pull-lock-10.15.4', 'w'));
      await prepare.deleteLockFile("10.15.4")
      await expect(fs.existsSync("/tmp/registry-pull-lock-10.15.4")).toBe(false)
    }); // TEST
    test('no file, no problem', async() => {
      await prepare.deleteLockFile("10.15.4")
      await expect(fs.existsSync("/tmp/registry-pull-lock-10.15.4")).toBe(false)
    }); // TEST
  }); // DESCRIBE
});