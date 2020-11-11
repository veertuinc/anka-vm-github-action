# Using the Anka VM GitHub Action

1. Install the [Anka Build Virtualization Software](https://github.com/veertuinc/getting-started#initial-setup) onto a macOS host machine. 
    - You'll also need an [Anka Template and Tag](https://ankadocs.veertu.com/docs/getting-started/creating-your-first-vm/#anka-build-license--cloud-understanding-vm-templates-tags-and-disk-usage) (you can use our [getting started repo's create-template script](https://github.com/veertuinc/getting-started#create-vm-templatebash))
2. Install and ensure you have registered a shared (org level; found under org settings/actions) _or_ project specific self-hosted runner (found under repo settings/actions) with GitHub. These runners need to be running on the host machines you run your Anka Virtualization CLI.
    > If you want ephemeral VMs to spin up for your CI/CD job, install the github actions runner inside of the node running the Anka Build Virtualization software. **For persistent VMs, install the runner inside of the VM and don't use this action.**
3. Include a `.github/workflows/{whatever}.yml` in your repo
4. Make sure to set your mapping key `uses:` to `veertuinc/anka-vm-github-action@vX.X.X`
5. There are a few required key/values you need to include under `with:`: `anka-vm-template-name` and `commands` (see the Inputs section for more information)

```yaml
name: My Project's CI/CD
on:
  push:
    branches: [ master ]
jobs:
  ios:
    runs-on: [self-hosted, macOS]
    steps:
      - uses: actions/checkout@v2
      - name: build
        id: build
        uses: veertuinc/anka-vm-github-action@v1.0.0
        with:
          anka-vm-template-name: "11.0.1"
          anka-vm-tag-name: "base:port-forward-22:xcode11-v1"
          anka-run-options: "--env"
          vm-commands: |
            echo \"Starting build process on \$(hostname)\"
            ./build.sh && \
            ./cleanup.sh
          anka-cp-host-paths: |
            ./
            /Users/nathanpierce/cache
          artifact-files: |
            log.txt
            build/binaryfile-v1
```

Using the above yaml, the Anka GitHub Action will:

1. Clone your project repo to the github action runner's working directory (on the host) (`uses: actions/checkout@v2`)
2. Pull the Template `11.0.1` and Tag `base:port-forward-22:xcode11-v1` from the Registry into the host
3. Prepare an Anka VM using that Template and Tag
4. Upload the entire host working directory (`./`) and a `/Users/nathanpierce/cache` from the user root on the host into the VM using `anka cp`
    > If you don't specify anything, `./` will always be uploaded
5. Execute the `vm-commands` inside of the VM (using `anka run`), ensuring Environment Variables (secrets, or anything else your CI/CD builds/tests need) on the host are passed in with `anka-run-options: "--env"`
6. Pull the `artifact-files` out of the VM using `anka cp` and then upload an artifact/archive with both `./log.txt` and `./build/binaryfile-v1` inside

## Transferring Host files into the VM

If you need to move files from the host into the VM, see the below points:

- **Anka Virtualization versions >= 2.3:** Starting in Anka 2.3, the automatic mounting of the current directory in the VM was removed. Instead, we now use `anka cp` to upload the cloned working directory contents in by default, or any of the files or folders you specify in `anka-cp-host-paths`.

- **Anka Virtualization versions <= 2.2.3:** When using the legacy mounting method, build and test time can be significantly impacted by the default host -> guest mount performance.
  - By default, `anka run` mounts the current working directory on the host into the VM. So, any commands that you run will have access to the cloned working directory files.
  - You can `cd` out of the mounted directory (`/private/var/tmp/ankafs.0`) inside of the VM and then do a git clone of your project's repo. This allows you to then move the files you want (using `vm-commands`) to upload as an artifact back into the mounted directory (`/private/var/tmp/ankafs.0`) so they are available on the host.

# Inputs

These are defined under the `with:` mapping key inside of your workflow yaml.

#### `anka-vm-template-name` (string) (required)
- **Name or UUID of your Anka VM Template**
#### `vm-commands` (multi-line string or regular string) (required)
- **Commands you wish to run inside of the Anka VM**
- You can use `vm-commands: |` for multi-line input, OR, you can just use a single line string `vm-commands: "echo 123"`
- You need to escape nested/inner double quotes `\"`: `vm-commands: "echo \"123\""`
- You need to escape any dollar signs `\$` so that it doesn't interpolate from the host side. Unless of course you wish to pass in something from the host into the VM.
- When interpolating, be sure to use the proper amount of escapes for the desired effect:
    ```bash
    \\\$(echo $HOME)
    \\\$(echo \$HOME)
    \\\$(echo \\\$HOME)
    ```
    will result in...
    ```bash
    $(echo /Users/nathanpierce) # HOST level env was interpolated
    $(echo /Users/anka)         # GUEST level env was interpolated
    $(echo $HOME)               # No interpolation
    ```
#### `anka-vm-tag-name` (string) (optional)
- **Name of Anka VM Template Tag**
- Defaults to latest tag
#### `anka-custom-vm-label` (string) (optional)
- **Label for the cloned VM that will execute your code**
- Defaults to `github-actions-${GITHUB_REPOSITORY}-${GITHUB_RUN_NUMBER}-${GITHUB_JOB}-${GITHUB_ACTION}`
- Your custom label will have a random number added to the end of it to prevent collisions when two VMs are running on the same node with the same label
#### `host-pre-commands` (string) (optional)
- **Commands you wish to run outside on the node (host) BEFORE preparation of and execution inside the VM**
- You need to escape double quotes `\"`
#### `host-post-commands` (string) (optional)
- **Commands you wish to run outside on the node (host) AFTER preparation of and execution inside the VM**
- You need to escape double quotes `\"`
#### `anka-start-options` (string) (optional)
- **Options set for the anka start execution**
#### `anka-run-options` (string) (optional)
- **Options set for anka run execution**
#### `anka-registry-pull-options` (string) (optional)
- **Options set for anka registry pull execution**
#### `host-command-options` (string; js object or JSON) (optional)
- **Options to use for github actions exec command**
- **DO NOT** use single quotes to wrap values! Example: `{ cwd: 'This Wont Work' }`
- Supported options: https://github.com/actions/toolkit/blob/master/packages/exec/src/interfaces.ts
#### `lock-file-location` (string) (optional)
- **Location where the pull/clone lock file exists**
- Defaults to "/tmp"
#### `artifact-files` (multi-line string) (optional)
- **Each file or folder path you wish to upload and include in the final artifact, newline separated**
- Symlinks and directories are not supported. You need to archive your directories in order to include them in the artifact.
- **Anka Virtualization versions <= 2.2.3:** Requires the default host <-> guest mounted volume so that the artifact creation/upload code, running on the host, can see the files you specify and are created inside of the VM.
#### `artifact-archive-file-name` (string) (optional)
- **Name of the artifact (archive) that contains all of the files specified in the `artifact-files` input.**
- Defaults to "artifact"
#### `artifacts-directory-on-host` (string) (optional)
- **An absolute or relative file path that denotes the root parent directory of the files being uploaded.**
- Defaults to "./"
#### `skip-registry-pull` (boolean) (optional)
- **Skip the registry pull; useful if you do not have a registry or it is down but the Template + Tag are already on the node.**
#### `anka-cp-disable` (boolean) (optional)
- **Disables the use anka cp command to move files from VM to host (a requirement to upload them as artifacts).**
- Only useful for Anka Virtualization versions >= 2.3
- Defaults to false
#### `anka-cp-host-paths` (multi-line string) (optional)
- **Each file you wish to upload from the host into the VM, newline separated.**
- You can use `./` in order to upload the entire current host directory contents into the VM
- If uploading a symlink to a directory into the VM, the contents of the linked directory will be copied into the VM with the same name as the symlink.
#### `anka-cp-destination-directory` (string) (optional)
- **Destination directory on VM you wish to upload the anka-cp-host-paths into.**
- Defaults to "./"
- We will create the destination directory in the VM if it does not exist

### Outputs

These are returned to your workflow.yaml so that subsequent steps can use them.

#### `std`
- The STDOUT and STDERR from the executed commands
- Includes artifact upload output

Usage:

```yaml
jobs:
  functional-tests-second-agent:
    runs-on: [self-hosted, macOS]
    needs: prep
    steps:
      - uses: actions/checkout@v2
      - name: sleep
        run: "sleep 20"
      - name: pull test 2
        id: pull-test-2
        uses: veertuinc/anka-vm-github-action@v1.0.0
        with:
          anka-vm-template-name: "11.0.1"
          anka-vm-tag-name: "base:port-forward-22"
          vm-commands: |
            env
            ls -laht ./
            ls -laht ../
            pwd
            echo \"HERE\" && \
            echo \"THERE HERE WHERE\"

      - name: Check for output
        run: |
          PULL_TEST_STD="${{ steps.pull-test-2.outputs.std }}"
          printf "pull test std ========================\n$PULL_TEST_STD"
          [[ ! -z "$(echo \\"$PULL_TEST_STD\\" | head -n 1)" ]] || exit 50
          [[ ! -z "$(echo \\"$PULL_TEST_STD\\" | grep 'Lock file /tmp/registry-pull-lock-10.15.6 found')" ]] || exit 51
          true
```


## Developing

### Prepare your environment

```bash
npm install
```

### Testing

There are two types of tests we perform:
1. Unit tests (testing functions)

    ```bash
    yarn test
    ```

2. Functional testing using a workflow yaml (not in this repo)

### Building

```bash 
npm run package
```

### TO-DO
- yaml lists: https://github.com/actions/toolkit/issues/184
- Figure out how to handle agent lost situations (steps just run indefinitely)
- Support multiple artifacts and files for those artifacts
- Better tests with mocks so we can avoid so much functional testing
