const fs = require('node:fs/promises');
const path = require('path');
const exec = require("child_process").execSync;

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

function getPorts(instancesJSON) {
    portList = [];

    instances = JSON.parse(instancesJSON);
    for (const instance of instances) {
        if (instance.DeploymentArgs['GenericModule.App.Ports'] != undefined) {

            instancePorts = JSON.parse(instance.DeploymentArgs['GenericModule.App.Ports']);

            // 0 - TCP; 1 = UDP; 2 - Both
            for (const instancePort of instancePorts) {
                switch (instancePort.Protocol) {
                    case 0:
                        portList.push({
                            Name: `${instance.FriendlyName} ${instancePort.Name}`,
                            Protocol: "TCP",
                            Number: instancePort.Port
                        });
                        break;

                    case 1:
                        portList.push({
                            Name: `${instance.FriendlyName} ${instancePort.Name}`,
                            Protocol: "UDP",
                            Number: instancePort.Port
                        });
                        break;

                    case 2:
                        portList.push({
                            Name: `${instance.FriendlyName} ${instancePort.Name}`,
                            Protocol: "TCP",
                            Number: instancePort.Port
                        });

                        portList.push({
                            Name: `${instance.FriendlyName} ${instancePort.Name}`,
                            Protocol: "UDP",
                            Number: instancePort.Port
                        });
                        break;

                    default:
                        break;
                }
            }
        }
    }

    return portList;
}

function getUPnPPorts(){
    let convertOutput = exec(`upnpc -l`, function (error, stdout, stderr) {
        if (error) {
            log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            log(`stderr: ${stderr}`);
            return;
        }
        log(`stdout: ${stdout}`);
    });

    log(convertOutput.toString());

    return `upnpc: miniupnpc library test client, version 2.2.8.
 (c) 2005-2024 Thomas Bernard.
More information at https://miniupnp.tuxfamily.org/ or http://miniupnp.free.fr/

List of UPNP devices found on the network :
 desc: http://192.168.0.10:80/description.xml
 st: urn:schemas-upnp-org:device:basic:1

 desc: http://192.168.0.10:80/description.xml
 st: uuid:2f402f80-da50-11e1-9b23-001788a03071

 desc: http://192.168.0.10:80/description.xml
 st: upnp:rootdevice

 desc: http://192.168.0.1:1900/rootDesc.xml
 st: urn:schemas-upnp-org:device:InternetGatewayDevice:1

Found valid IGD : http://192.168.0.1:1900/ctl/IPConn
Local LAN ip address : 192.168.0.107
Connection Type : IP_Routed
Status : Connected, uptime=572779s, LastConnectionError : ERROR_NONE
  Time started : Thu Nov 20 23:02:36 2025
MaxBitRateDown : 8388608 bps (8.3 Mbps)   MaxBitRateUp 4194304 bps (4.1 Mbps)
ExternalIPAddress = 78.9.235.162
 i protocol exPort->inAddr:inPort description remoteHost leaseTime
 0 TCP 11342->192.168.0.69:32400 'Plex Media Server' '' 380785
 1 TCP 41341->192.168.0.150:63077 'qBittorrent/5.1.4' '' 0
 2 UDP 47097->192.168.0.150:63077 'qBittorrent/5.1.4' '' 0
 3 TCP 11343->192.168.0.150:32400 'Plex Media Server' '' 454675
 4 TCP 11344->192.168.0.69:32400 'Plex Media Server' '' 454708
 5 TCP 11345->192.168.0.150:32400 'Plex Media Server' '' 454764
 6 TCP 11346->192.168.0.69:32400 'Plex Media Server' '' 454769
 7 TCP 11347->192.168.0.150:32400 'Plex Media Server' '' 455502
 8 TCP 49808->192.168.0.150:63077 'qBittorrent/5.1.4' '' 0
 9 UDP 44219->192.168.0.150:63077 'qBittorrent/5.1.4' '' 0
10 TCP 11348->192.168.0.69:32400 'Plex Media Server' '' 458461
11 TCP 47632->192.168.0.150:63077 'qBittorrent/5.1.4' '' 0
12 UDP 43787->192.168.0.150:63077 'qBittorrent/5.1.4' '' 0
13 TCP 11349->192.168.0.150:32400 'Plex Media Server' '' 459603
14 TCP 11350->192.168.0.69:32400 'Plex Media Server' '' 459617
15 TCP 43654->192.168.0.150:63077 'qBittorrent/5.1.4' '' 0
16 UDP 45931->192.168.0.150:63077 'qBittorrent/5.1.4' '' 0
17 TCP 11353->192.168.0.150:32400 'Plex Media Server' '' 496311
18 TCP 44341->192.168.0.150:63077 'qBittorrent/5.1.4' '' 0
19 UDP 46373->192.168.0.150:63077 'qBittorrent/5.1.4' '' 0
20 TCP 11354->192.168.0.69:32400 'Plex Media Server' '' 496317
21 TCP 30000->192.168.0.107:30000 'Empyrion' '' 0
22 UDP 30000->192.168.0.107:30000 'Empyrion' '' 0
23 UDP 30001->192.168.0.107:30001 'Empyrion' '' 0
24 UDP 30002->192.168.0.107:30002 'Empyrion' '' 0
25 UDP 30003->192.168.0.107:30003 'Empyrion' '' 0
26 TCP 30001->192.168.0.107:30001 'Empyrion' '' 0
27 TCP 30002->192.168.0.107:30002 'Empyrion' '' 0
28 TCP 41655->192.168.0.150:63077 'qBittorrent/5.1.4' '' 0
29 UDP 46348->192.168.0.150:63077 'qBittorrent/5.1.4' '' 0
30 TCP 11355->192.168.0.150:32400 'NAT-PMP 11355 tcp' '' 18608
31 TCP 11356->192.168.0.69:32400 'Plex Media Server' '' 537039
32 TCP 11357->192.168.0.150:32400 'Plex Media Server' '' 537058
33 TCP 11358->192.168.0.69:32400 'Plex Media Server' '' 537065
34 UDP 41642->192.168.0.110:41641 'NAT-PMP 41642 udp' '' 5043
35 UDP 41641->192.168.0.69:41641 'NAT-PMP 41641 udp' '' 5288
36 UDP 22437->192.168.0.69:22437 'Parsec' '' 1434
37 UDP 22438->192.168.0.69:22438 'Parsec' '' 1434
38 UDP 22439->192.168.0.69:22439 'Parsec' '' 1434
39 UDP 22440->192.168.0.69:22440 'Parsec' '' 1434
40 UDP 31437->192.168.0.69:31437 'Parsec' '' 1445
41 TCP 11361->192.168.0.20:11361 'NAT-PMP 11361 tcp' '' 3158
42 UDP 11361->192.168.0.20:11361 'NAT-PMP 11361 udp' '' 3158
43 TCP 63077->192.168.0.69:63077 'NAT-PMP 63077 tcp' '' 3361
44 UDP 63077->192.168.0.69:63077 'NAT-PMP 63077 udp' '' 3361
45 TCP 36439->192.168.0.69:36439 'NAT-PMP 36439 tcp' '' 3504
46 UDP 36439->192.168.0.69:36439 'NAT-PMP 36439 udp' '' 3503
47 TCP 30003->192.168.0.107:30003 'Empyrion' '' 69`
}

async function main() {
    await loadConfig();

    portList = getPorts(await readFile(config.instancesPath));
    console.log(portList);
    
    upnpPorts = getUPnPPorts()
}

main();