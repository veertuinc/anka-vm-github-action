let execute = require('./execute');
let fs = require('fs');

describe('execute functions', () => {
  
  let options = "{ silent: false }"
  describe('hostCommands', () => {
    test('basic', async() => {
      await execute.hostCommands("echo 123",options)
      await expect(`${execute.STD.trim()}`).toBe("123");
    });
    test('fail with bad command option', async() => {
      await expect(
        execute.hostCommands("java --version",options)
      ).rejects.toThrowError(/failed with exit code 1/)
    });
    test('fail with single quotes', async() => {
      await expect(
        execute.hostCommands("echo 123","{ cwd: './' }")
      ).rejects.toThrowError(/inside of a string/)
    });
    test('basic multi', async() => {
      await execute.hostCommands("echo 456",options)
      await execute.hostCommands("echo 789",options,execute.STD)
      await expect(`${execute.STD.trim()}`).toBe("456\n789");
    });
    test('basic newlines', async() => {
      await execute.hostCommands(`
      touch /tmp/test
      ls -laht ./
      ls -laht ../
      pwd
      echo "HERE" && \
      echo "THERE HERE WHERE"
      `,options)
      await expect(`${execute.STD}`).toMatch(`total `);
      await expect(`${execute.STD}`).toMatch(`HERE\nTHERE `);
    });
    test('only last four lines in error', async() => {
      await expect(execute.hostCommands(`
      touch /tmp/test
      ls -laht ./
      ls -laht ../
      pwd
      echo "HERE" && \
      echo "THERE HERE WHERE"
      exit 40
      `,options)).rejects.toThrowError(/STDOUT: \/Users\/nathanpierce\/anka-vm-github-action\nSTDOUT: HERE\nSTDOUT: THERE HERE WHERE/);
    });
    test('chained commands and redirection to file', async() => {
      await execute.hostCommands("hostname && echo \"test1\" && echo \"Test2\" > /tmp/test && cat /tmp/test",options)
      await expect(`${execute.STD}`).toMatch(`\ntest1\nTest2`);
    });
    test('chained commands and redirection to file', async() => {
      await execute.hostCommands("hostname && echo \"test1\" && echo \"Test2\" > /tmp/test && cat /tmp/test",options)
      await expect(`${execute.STD}`).toMatch(`\ntest1\nTest2`);
    });
    test('script execution with args', async() => {
      await execute.hostCommands("hostname && ./test.bash 1 2 3 4",options)
      await expect(`${execute.STD}`).toMatch(`\n1\n2\n3 4`);
    });
    describe('options', () => {
      test('silent (js object)', async() => {
        await execute.hostCommands("echo 123","{silent: false}",options)
        await expect(execute.finalHostCommandOptions.silent).toBe(false);
      });
      test('cwd does not exist (js object)', async() => {
        await expect(
          execute.hostCommands("echo 123","{silent: true, cwd: \"./doesnotexist\"}",options)
        ).rejects.toEqual(new Error('exec.exec failed: cannot find ./doesnotexist'))
      });
      test('cwd (js object)', async() => {
        await execute.hostCommands("ls","{cwd: \"./dist\"}")
        await expect(`${execute.STD.trim()}`).toBe("index.js");
      });
      test('json (json)', async() => {
        await execute.hostCommands("ls","{\"cwd\": \"./dist\"}")
        await expect(`${execute.STD.trim()}`).toBe("index.js");
      });
    });
  });

  describe('ankaCp', () => {
    describe('in', () => {
      describe('errors', () => {
        test('file does not exist', async() => {
          await expect(
            execute.ankaCp(
              "in",
              "testFile9",
              "ankaVmTemplateName",
              "./"
            )
          ).rejects.toThrowError(/\"testFile9\" does not exist/);
        }); // TEST
      }); // DESCRIBE errors
    }); // DESCRIBE in
  }); // DESCRIBE ankaCp
});