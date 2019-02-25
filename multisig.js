var bitcoin = require('bitgo-utxo-lib-res')
var NETWORKS = require('bitgo-utxo-lib-res/src/networks')
var bip65 = require('bip65')
var moment = require('moment')

var network = NETWORKS['res']
var hashType = bitcoin.Transaction.SIGHASH_ALL

function getRedeemScript(signers, locktime){
  var requiredSignatures = Math.floor(signers.length*0.75)
  var totalSignatures = signers.length
  console.log("Required Signatures: " + requiredSignatures)
  console.log("Total Signatures: " + totalSignatures)
  var script = [
    bitcoin.opcodes.OP_IF,
    bitcoin.script.number.encode(locktime),
    bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
    bitcoin.opcodes.OP_DROP,
    Buffer.from(signers[0], 'hex'),
    bitcoin.opcodes.OP_CHECKSIGVERIFY,
    bitcoin.script.number.encode(1),

    bitcoin.opcodes.OP_ELSE,
    bitcoin.script.number.encode(requiredSignatures),
    bitcoin.opcodes.OP_ENDIF,

    Buffer.from(signers[1], 'hex'),
    Buffer.from(signers[2], 'hex'),
    Buffer.from(signers[0], 'hex'),
    bitcoin.script.number.encode(totalSignatures),
    bitcoin.opcodes.OP_CHECKMULTISIG
  ]
  console.log(script)
  return bitcoin.script.compile(script, network)
}

function createDepositAddress(signers, locktime){
 var redeemScript = getRedeemScript(signers, locktime)
 var scriptPubKey = bitcoin.script.scriptHash.output.encode(bitcoin.crypto.hash160(redeemScript))
 var address = bitcoin.address.fromOutputScript(scriptPubKey, network)
 console.log(redeemScript)
 return [address,redeemScript]
}

module.exports = {createDepositAddress}
