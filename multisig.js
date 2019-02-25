var bitcoin = require('bitgo-utxo-lib-res')
var NETWORKS = require('bitgo-utxo-lib-res/src/networks')
var bip65 = require('bip65')
var moment = require('moment')

var network = NETWORKS['res']
var hashType = bitcoin.Transaction.SIGHASH_ALL

function getRedeemScript(signers, locktime){
  var requiredSignatures = Math.floor(signers.length*0.75)
  var totalSignatures = signers.length
  var script = [
    bitcoin.opcodes.OP_IF,
    bitcoin.script.number.encode(locktime),
    bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
    bitcoin.opcodes.OP_DROP,
    signers[0],
    bitcoin.opcodes.OP_CHECKSIGVERIFY,
    bitcoin.script.number.encode(1),

    bitcoin.opcodes.OP_ELSE,
    bitcoin.script.number.encode(requiredSignatures),
    bitcoin.opcodes.OP_ENDIF,

    signers[1],
    signers[2],
    signers[0],
    bitcoin.script.number.encode(totalSignatures),
    bitcoin.opcodes.OP_CHECKMULTISIG
  ]
  
  return bitcoin.script.compile(script, network)
}

function createDepositAddress(signers, locktime){
 var redeemScript = getRedeemScript(signers, locktime)
 var scriptPubKey = bitcoin.script.scriptHash.output.encode(bitcoin.crypto.hash160(redeemScript))
 var address = bitcoin.address.fromOutputScript(scriptPubKey, network)
 return address
}

module.exports = {createDepositAddress}
