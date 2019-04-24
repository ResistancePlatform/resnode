const { supportedCurrencies } = require('./supported-currencies.js')
const electrumClientModule = require('electrum-client')
const { Client } = electrumClientModule

// Version control interface
const { ElectrumProtocol } = electrumClientModule //electrumClientModule.v1

/**
 * C
 *
 * @param {string} currency Currency code
 * @param {function} proc Async function, receives ElectrumProtocol instance
 */
async function callElectrumClient(currency, proc) {
  const coin = supportedCurrencies.find(item => item.coin === currency)

  if (!coin || !coin.electrumServers) {
    return null
  }

  const { electrumServers } = coin
  const electrumServer = electrumServers[electrumServers.length - 1]

  // Autogenerate client name
  const clientName = [ElectrumProtocol.libname, ElectrumProtocol.hash].join('-')

  // Initialize
  const proto = new ElectrumProtocol(new Client(electrumServer.port, electrumServer.host, 'tcp'))

  // Wait a connection
  await proto.client.connect()

  let result

  try {
    // Negotiation protocol
    result = await proto.server_version(clientName)
    console.log(result)
  } catch (e) {
    // Negotiation error
    await proto.client.close()
    console.log(e)
    return
  }

  try {
    await proc(proto)
  } catch (e) {
    console.log(e)
  }

  await proto.client.close()
  return result
}

/*
const proc = async (ecl) => {
  const balance = await ecl.blockchain_address_getBalance('12c6DSiU4Rq3P4ZxziKxzrL5LmMBrzjrJX')
  console.log(balance)
  const unspent = await ecl.blockchain_address_listunspent('12c6DSiU4Rq3P4ZxziKxzrL5LmMBrzjrJX')
  console.log(unspent)

  const tx1 = await ecl.blockchain_transaction_get('f91d0a8a78462bc59398f2c5d7a84fcff491c26ba54c4833478b202796c8aafd')
  console.log(tx1)
}
*/

module.exports = {
  callElectrumClient
}
