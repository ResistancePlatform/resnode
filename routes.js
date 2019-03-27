const request = require('request-promise')
const validator = require('./validator.js')
const multisig = require('./multisig.js')
const RPC = require('./resistancerpc.js')()

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
      const localNodePublicKey = await rpc.getPublicKey(await rpc.getPublicAddress())

      res.send(JSON.stringify({
        'status': 200,
        'data': {}
      }))
    }
  })

  app.get('/api/trade', async function (req, res) {
  })

  app.post('/api/claim', async function (req, res) {
  })

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
      res.send(JSON.stringify({ 'status': '200', 'data': { 'address': address[0], 'redeemScript': address[1].toString('hex') } }))
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
