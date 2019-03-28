const electrumclient = require('electrum-client')
const Client = electrumclient.Client

// Version control interface
const ElectrumProtocol = electrumclient.v1.ElectrumProtocol

const proc = async (ecl) => {
  const balance = await ecl.blockchain_address_getBalance('12c6DSiU4Rq3P4ZxziKxzrL5LmMBrzjrJX')
  console.log(balance)
  const unspent = await ecl.blockchain_address_listunspent('12c6DSiU4Rq3P4ZxziKxzrL5LmMBrzjrJX')
  console.log(unspent)

  const tx1 = await ecl.blockchain_transaction_get('f91d0a8a78462bc59398f2c5d7a84fcff491c26ba54c4833478b202796c8aafd')
  console.log(tx1)
}

const main = async () => {
  // Autogenerate client name
  const myname = [ElectrumProtocol.libname, ElectrumProtocol.hash].join('-')
  console.log(myname)

  // Initialize
  const ecl = new ElectrumProtocol(new Client(10059, 'electrum1.cipig.net', 'tcp'))

  // Wait a connection
  await ecl.client.connect()

  try {
    // Negotiation protocol
    const res = await ecl.server_version(myname)
    console.log(res)
  } catch (e) {
    // Negotiation error
    await ecl.client.close()
    console.log(e)
    return
  }

  try {
    await proc(ecl)
  } catch (e) {
    console.log(e)
  }
  await ecl.client.close()
}
main().catch(console.log)
