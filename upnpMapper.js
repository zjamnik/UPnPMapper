const fs = require('node:fs/promises');
const path = require('path');
const exec = require("child_process").execSync;

var config = null;

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


function run(command, consoleOutput = false) {
    let convertOutput = exec(command, function (error, stdout, stderr) {
        if (error) {
            if (consoleOutput) {
                console.log(`error: ${error.message}`);
            }
            return;
        }
        if (stderr) {
            if (consoleOutput) {
                console.log(`stderr: ${stderr}`);
            }
            return;
        }
        if (consoleOutput) {
            console.log(`stdout: ${stdout}`);
        }
    });

    return convertOutput.toString();
}

async function main() {
    await loadConfig();

    const instancesJSON = await readFile(config.instancesPath);
    let instancesPorts = "";
    const upnpPortList = run('upnpc -l');
    // console.log(upnpPortList);


    for (const instance of JSON.parse(instancesJSON)) {
        if (instance.DeploymentArgs['GenericModule.App.Ports'] != undefined) {
            // 0 - TCP; 1 = UDP; 2 - Both
            for (const instancePort of JSON.parse(instance.DeploymentArgs['GenericModule.App.Ports'])) {
                let Name = `AMP ${instance.FriendlyName} ${instancePort.Name}`;
                let Number = instancePort.Port;
                instancesPorts += `${Name}\n`;

                if (!upnpPortList.includes(Name)) {
                    switch (instancePort.Protocol) {
                        case 0:
                            try {
                                run(`upnpc -e "${Name}" -a ${config.ip} ${Number} ${Number} TCP`);
                                console.log(`Port added: "${Name}" ${Number} TCP`);
                            } catch {
                                console.log(`Port failed: "${Name}" ${Number} TCP`);
                            }
                            break;

                        case 1:
                            try {
                                run(`upnpc -e "${Name}" -a ${config.ip} ${Number} ${Number} UDP`);
                                console.log(`Port added: "${Name}" ${Number} UDP`);
                            } catch {
                                console.log(`Port failed: "${Name}" ${Number} UDP`);
                            }
                            break;

                        case 2:
                            try {
                                run(`upnpc -e "${Name}" -a ${config.ip} ${Number} ${Number} TCP`);
                                console.log(`Port added: "${Name}" ${Number} TCP`);
                            } catch {
                                console.log(`Port failed: "${Name}" ${Number} TCP`);
                            }
                            try {
                                run(`upnpc -e "${Name}" -a ${config.ip} ${Number} ${Number} UDP`);
                                console.log(`Port added: "${Name}" ${Number} UDP`);
                            } catch {
                                console.log(`Port failed: "${Name}" ${Number} UDP`);
                            }
                            break;

                        default:
                            break;
                    }
                }
            }
        }
    }

    // Delete all AMP
    // for (const portMap of upnpPortList.split('\n')) {
    //     if (portMap.includes("AMP")) {
    //         let found = portMap.match(/ *\d+ +(\w+) +(\d+).*/);
    //         run(`upnpc -d ${found[2]} ${found[1]}`);
    //     }
    // }
    
    for (const portMap of upnpPortList.split('\n')) {
        if (portMap.includes("AMP") && !instancesPorts.includes(portMap.split("'")[1])) {
            let found = portMap.match(/ *\d+ +(\w+) +(\d+).*/);
            console.log(`Remove ${found[2]} ${found[1]}`);
            run(`upnpc -d ${found[2]} ${found[1]}`);
        }
    }
}

main();