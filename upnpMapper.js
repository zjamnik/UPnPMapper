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

async function main() {
    await loadConfig();
    console.log(config.instancesPath);
    
}

main();