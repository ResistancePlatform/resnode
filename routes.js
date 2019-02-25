const validator = require("./validator.js")
const request = require("request-promise")
const multisig = require("./multisig.js")

function getTopRatedNodes(nodes){
  return nodes.filter(node => node.fqdn && node.taddr && node.pubkey)
}

module.exports = function(app){
  app.get('/health', async function (req, res) {
  	res.send(JSON.stringify({status: "OK"}))
  })
  app.get('/p2p', async function(req, res) {
      res.send("Sent the message")
  })
  app.post('/api/deposit', async function(req, res) {
      var errors = validator.validate('deposit', req)
      if(errors){
        res.status(400).json(errors)
      } else {
	var response = await request('https://resnodetracker.tk/api/nodes')
	var pubkeys = []

	pubkeys.push(req.body.pubkey)
	var topNodes = getTopRatedNodes(JSON.parse(response))
	for (var i = 0; i < topNodes.length; i++){
	  pubkeys.push(topNodes[i].pubkey)
	}
	var address = multisig.createDepositAddress(pubkey, req.body.locktime)
        res.send(JSON.stringify({"status":"success", "data":{"address":address}})) 
      }
  })
}
