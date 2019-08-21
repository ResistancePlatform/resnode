const fs = require('fs')
let oshome = require('os').homedir()

oshome = process.env.RES_HOME || oshome

/* ****** get resistance.conf settings ****** */

exports.getResistanceConfig = () => {
  console.log('Retrieving resistance rpc config....')
  let lines
  try {
    const path1 = `${oshome}/.resistance/resistance.conf`
    const path2 = `${oshome}/resistancecash/.resistance/resistance.conf`
    const path3 = `${oshome}/AppData/Roaming/Resistance/resistance.conf`

    if (process.env.RESCONF) {
      lines = fs.readFileSync(process.env.RESCONF, 'utf8').split('\n')
    } else if (fs.existsSync(path1)) {
      lines = fs.readFileSync(path1, 'utf8').split('\n')
    } else if (fs.existsSync(path2)) {
      lines = fs.readFileSync(path2, 'utf8').split('\n')
    } else if (fs.existsSync(path3)) {
      lines = fs.readFileSync(path3, 'utf8').split('\n')
    }
  } catch (e) {
    console.log('ERROR finding or reading resistance.conf file. Make sure the resistance secure node is set up properly.')
    process.exit()
  }

  const resistancecfg = {}
  lines.pop()
  let testnet = false
  let found4 = false
  let found6 = false
  let foundMax = false
    
  lines.forEach((lineraw) => {
    const line = lineraw.trim()
    if (!line.startsWith('#')) {
      if (line.indexOf('rpc') === 0) {
        const idx = line.indexOf('=') // don't use split since user or pw could have =
        const key = line.substring(0, idx)
        const val = line.substring(idx + 1)
        resistancecfg[key] = val.trim()
      } else {
        if (line === 'testnet=1') testnet = true
        const data = line.split('=')
        if (data[0] === 'externalip') {
          const whichip = line.indexOf(':') !== -1 ? '6' : '4'
          // track if found in case of multiple.  use first.
          if (whichip === '4' && !found4) {
            resistancecfg.zip4 = data[1]
            found4 = true
          }
          if (whichip === '6' && !found6) {
            resistancecfg.zip6 = data[1]
            found6 = true
          }
        }
        if (data[0] === 'port') resistancecfg.port = data[1]
        if (data[0] === 'maxconnections') foundMax = true
	if (data[0] === 'rpcuser') resistancecfg.rpcuser = data[1]
	if (data[0] === 'rpcpassword') resistancecfg.password = data[1]
      }
    }
  })

  resistancecfg.rpchost = 'resistance-core';
  resistancecfg.testnet = testnet
  if (!resistancecfg.rpcport) {
    resistancecfg.rpcport = testnet ? '18232' : '8232'
  }

  // build url
  const url = `http://${resistancecfg.rpchost}:${resistancecfg.rpcport}`
  resistancecfg.url = url
  console.log(`Using ${url} to communicate with resistance-core`);
    
  if (foundMax) {
    console.log('Found maxconnections in resistance.conf.  Please remove.')
    process.exit()
  }
  if (!resistancecfg.zip4 && !resistancecfg.zip6) {
    console.log('External IP address (externalip=) not found in resistance.conf. At least one (IPv4 or IPv6) required for secure nodes. Both IPv4 and IPv6 required for super nodes.')
    console.log('If multiple, add the externalip= for each address on a separate line.')
    process.exit()
  }
  if (!resistancecfg.port) {
    console.log('Port not found in resistance.conf. Add \'port=8132\' for mainnet or \'port=18132\' for testnet')
    process.exit()
  }

  return resistancecfg
}
