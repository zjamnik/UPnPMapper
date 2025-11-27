const fs = require('node:fs/promises');
const path = require('path');
const execute = require("child_process").execSync;

var config = null;
const leaseTime = 3600;

function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function cleanPath(pathToClean) {
    let regex = /[<>:"|\?\*]/g;
    let cleanPath = path.normalize(pathToClean);

    let isAbsolute = path.isAbsolute(cleanPath);
    cleanPath = cleanPath.replace(regex, '');
    if (/^win/i.test(process.platform) && isAbsolute) {
        cleanPath = `${cleanPath.slice(0, 1)}:${cleanPath.slice(1)}`;
    }

    return cleanPath;
}

async function mkDir(dirPath) {
    try {
        await fs.access(cleanPath(dirPath));
    }
    catch (err) {
        await fs.mkdir(cleanPath(dirPath), { recursive: true });
    }
    await fs.access(cleanPath(dirPath));
}

async function writeFile(dir, file, data) {
    let cleanDir = cleanPath(dir);
    let cleanFile = cleanPath(file);

    await mkDir(dir);

    return fs.writeFile(`${cleanDir}/${cleanFile}`, data);
}

async function readFile(file, { format = 'utf8' } = {}) {
    return fs.readFile(cleanPath(file), format);
}

async function loadConfig({ configPath = __dirname, configName = 'config.json' } = {}) {
    let configDefault = {
        "instancesPath": "",
        "ip": ""
    };

    try {
        config = JSON.parse(await readFile(cleanPath(`${configPath}/${configName}`)));
    }
    catch (err) {
        config = clone(configDefault);
    }

    await saveConfig();
    await saveConfig({ configName: `${configName}.bak` });
}


async function saveConfig({ configPath = __dirname, configName = 'config.json' } = {}) {
    await writeFile(cleanPath(configPath), cleanPath(configName), JSON.stringify(config, null, 4));
}


function execute() {
    command = "ls";

    let convertOutput = exec(command, function (error, stdout, stderr) {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });

    return convertOutput.toString();
}

function mapPorts(instancesJSON) {
    portList = [];

    instances = JSON.parse(instancesJSON);
    for (const instance of instances) {
        if (instance.DeploymentArgs['GenericModule.App.Ports'] != undefined) {

            instancePorts = JSON.parse(instance.DeploymentArgs['GenericModule.App.Ports']);

            // 0 - TCP; 1 = UDP; 2 - Both
            for (const instancePort of instancePorts) {

                let Name = `${instance.FriendlyName} ${instancePort.Name}`;
                let Number = instancePort.Port;
                switch (instancePort.Protocol) {
                    case 0:
                        execute(`upnpc -e "${Name}" -a ${ip} ${Number} ${Number} TCP ${leaseTime}`);
                        break;

                    case 1:
                        execute(`upnpc -e "${Name}" -a ${ip} ${Number} ${Number} UDP ${leaseTime}`);
                        break;

                    case 2:
                        execute(`upnpc -e "${Name}" -a ${ip} ${Number} ${Number} TCP ${leaseTime}`);
                        execute(`upnpc -e "${Name}" -a ${ip} ${Number} ${Number} UDP ${leaseTime}`);
                        break;

                    default:
                        break;
                }
            }
        }
    }
}

async function main() {
    await loadConfig();

    mapPorts(await readFile(config.instancesPath));
}

main();