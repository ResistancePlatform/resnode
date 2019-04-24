const { LocalStorage } = require('node-localstorage')
const request = require('request-promise')
const validator = require('./validator.js')
const multisig = require('./multisig.js')
const RPC = require('./resistancerpc.js')
const { callElectrumClient } = require('./electrum.js')

const tradeStorage = new LocalStorage('./config/trade')
const rpc = new RPC()

function getTopRatedNodes(nodes) {
  return nodes.filter(node => node.fqdn && node.taddr && node.pubkey)
}

module.exports = function (app) {
  app.get('/health', async function (req, res) {
    res.send(JSON.stringify({ status: `OK` }))
  })

  app.get('/p2p', async function (req, res) {
    res.send(`Sent the message`)
  })

  app.post('/api/trade', async function (req, res) {
    const errors = validator.validate('postTrade', req)

    if (errors) {
      res.status(400).json(errors)
    } else {
      const { scriptPubKey: localNodePublicKey } = await rpc.getPublicKey(await rpc.getPublicAddress())

      // Looking for the public key in deposit transaction

      const {
        depositTxid,
        tradeTxid,
        tradeCurrency
      } = req.body

      const depositTransaction = rpc.getRawTransactionVerbose(depositTxid)
      const isDepositSignedByMe = depositTransaction.vout.find(item => item.scriptPubKey.hex === localNodePublicKey)

      // TODO: Check two confirmations

      if (!isDepositSignedByMe) {
        return res.status(400).json({
          errorCode: `TRADE_INVALID_SIGNATURE`,
          error: `Deposit transaction is not signed by me.`
        })
      }

      // Checking if trade txid exists in the blockchain
      const tx = await callElectrumClient(tradeCurrency, async client => {
        return client.blockchain_transaction_get(tradeTxid)
      })

      if (tx.error) {
        return res.status(400).json({
          errorCode: `TRADE_NOT_FOUND`,
          error: `Trade transaction not found on ${tradeCurrency} blockchain.`
        })
      }

      // Add the details of that transaction (timestamp and txid) to a local database
      tradeStorage[tradeTxid] = new Date().toISOString()

      res.send(JSON.stringify({
        status: 200,
        data: {}
      }))
    }
  })

  app.get('/api/trade', async function (req, res) {
    const timestamp = tradeStorage[req.body.tradeTxid]
    if (!timestamp) {
      return res.status(404).json({
        errorCode: `TRADE_MISSING_TRANSACTION`,
        error: `Specified trade not found on the blockchain, or the deposit transaction is missing.`
      })
    }
    return res.status(200).json({ timestamp })
  })

  app.post('/api/claim', async function (req, res) {
    const {
      depositTxid,
      tradeTxid,
      tradeCurrency
    } = req.body

    // Checking if trade txid exists in the blockchain
    const tx = await callElectrumClient(tradeCurrency, async client => {
      return client.blockchain_transaction_get(tradeTxid)
    })

    if (!tx.error) {
      return res.status(400).json({
        errorCode: `CLAIM_TRADE_EXISTS`,
        error: `The trade transaction is found on the blockchain.`
      })
    }

    // Looking for 10+ masternodes signatures
  })

  // This method is called after the client has successfully deposited their funds into the Resistance smart contract.
  // This method will verify that the smart contract funds are indeed in the address, and that the smart contract
  // contains the public keys of the top rated masternodes. This is to prevent a user from submitting funds to a smart
  // contract with masternodes that are all owned by that user.
  app.post('/api/verifyDeposit', async function (req, res) {
    var errors = validator.validate('verifyDeposit', req)
    if (errors) {
      res.status(400).json(errors)
    }
  })

  // This method is responsible for generatng the smart contract and address for the client to then use to deposit the funds.
  // It is not responsible for adding the smart contract details to the database because the client may not have deposited the
  // funds yet.
  // Once the user deposits the funds into the smart contract, they must call the 'verifyDeposit' endpoint with the address and hex smart
  // contract of their deposit transactions.
  app.post('/api/deposit', async function (req, res) {
    var errors = validator.validate('deposit', req)
    if (errors) {
      res.status(400).json(errors)
    } else {
      var response = await request('https://resnodetracker.tk/api/nodes')
      var pubkeys = []

      pubkeys.push(req.body.pubkey)
      var topNodes = getTopRatedNodes(JSON.parse(response))
      for (var i = 0; i < topNodes.length; i++) {
        pubkeys.push(topNodes[i].pubkey)
      }
      console.log(req.body.locktime)
      var address = multisig.createDepositAddress(pubkeys, req.body.locktime)
      res.send(JSON.stringify({
        status: 200,
        data: {
          address: address[0],
          redeemScript: address[1].toString('hex')
        }
      }))
    }
  })

  app.post('/api/verifyScript', async function (req, res) {
    var errors = validator.validate('verifyScript', req)

    if (errors) {
      res.status(400).json(errors)
    } else {
      var address = req.body.address
      var script = req.body.script
      var compiledAddress = multisig.scriptToAddress(Buffer.from(script, 'hex'))

      if (compiledAddress && address && compiledAddress === address) {
        res.send(JSON.stringify({ 'status': '200', 'data': { 'valid': true } }))
      } else {
        res.send(JSON.stringify({ 'status': '200', 'data': { 'valid': false } }))
      }
    }
  })
}
