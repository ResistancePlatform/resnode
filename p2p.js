const crypto = require('crypto')
const Swarm = require('discovery-swarm')
const defaults = require('dat-swarm-defaults')
const getPort = require('get-port')
const readline = require('readline')
const hex2ascii = require('hex2ascii')
const moment = require('moment')
const RpcClient = require('./resistancerpc.js')

/*if(!process.env.resPrivateKey){
  console.log("You need to set the resPrivateKey env variable")
  process.exit()
}

if(!process.env.resAddress){
  console.log("You need to set the resAddress env variable")
  process.exit()
}*/


/**
 * Here we will save our TCP peer connections
 * using the peer id as key: { peer_id: TCP_Connection }
 */
var rpc = new RpcClient()
const peers = {}
// Counter for connections, used for identify connections
let connSeq = 0
var myId = ""

/*;(async () => {
    try {
      // Peer Identity, a random hash for identify your peer
      console.log("starting")
      var resAddress = await rpc.getPublicAddress()
      myId = Buffer.from(resAddress, "utf-8") //crypto.randomBytes(32)
      console.log('Your identity: ' + myId)
      console.log(await register(resAddress, await rpc.getPublicKey(resAddress)))
    } catch (e) {
        console.log(e)
    }
})();*/

//process.exit(0)

// reference to redline interface
let rl
/**
 * Function for safely call console.log with readline interface active
 */
function log () {
  if (rl) {
    rl.clearLine()    
    rl.close()
    rl = undefined
  }
  for (let i = 0, len = arguments.length; i < len; i++) {
    console.log(arguments[i])
  }
  //askUser()
}

function getPubKey(resAddress){
  var registry = {'rpASwRhtkdxE7xKXrccNjwRCufMkQznDaYK':'02100fc2cdb0818ee535ca508f3d316d519cd4cb64eef45a8a57e878d004ffd397','rpLi4fC8Lq88KMf22VCHefV4zqw1XTharah':'03d7ff1f3753fcf3e3f05839d456cfac2e270158771882420ddd23851b3b380aca'}
  return registry[resAddress]
}

/*function getPrivateKey(){
  return await rpc.getPrivKey(resAddress)
}*/

function getSharedSecret(theirPubKey, myPrivKey){
  var wif = require('wif')
  var crypto = require('crypto');

  var obj = wif.decode(myPrivKey)

  var pubB = new Buffer.from(theirPubKey, 'hex');

  var ecdhA = crypto.createECDH('secp256k1');
  ecdhA.generateKeys('hex', 'compressed');
  ecdhA.setPrivateKey(obj.privateKey.toString("hex"), 'hex');

  var secret = ecdhA.computeSecret(pubB, 'hex').toString('hex');
  return secret
}

//let key = new Buffer.from(secret, 'hex')

function encrypt(text, secret){
  const IV_LENGTH = 16; // For AES, this is always 16
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv('aes-256-cbc', new Buffer.from(secret, 'hex'), iv);
  let encrypted = cipher.update(text);

  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text, secret){
  const IV_LENGTH = 16; // For AES, this is always 16
  let textParts = text.split(':');
  let iv = new Buffer.from(textParts.shift(), 'hex');
  let encryptedText = new Buffer.from(textParts.join(':'), 'hex');
  let decipher = crypto.createDecipheriv('aes-256-cbc', new Buffer.from(secret, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);

  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
}

function sendAll(message){
  try{
    for (let id in peers){
      peer[id].conn.write(message)
    }
  } catch (err) {
      console.log(err)
  }
}

function send(message, conn){
  try {
    conn.write(message)
  } catch (err) {
  }
}

async function validSignature(address, signature, message){
  try {
    return await rpc.verifyMessage()
  } catch (err) {
    console.log(err)
  }
}

async function getRegistration() {
  var registration = {}
  var resAddress = await rpc.getPublicAddress()
  var resPublicKey = await rpc.getPublicKey(resAddress)
  var data = JSON.stringify({address: resAddress, publickey: resPublicKey.pubkey, timestamp:moment().valueOf()})
  var signature = await rpc.signMessage(resAddress, data)
  registration.message = data
  registration.signature = signature
  return registration
}

/*
* Function to get text input from user and send it to other peers
* Like a chat :)
*/
/*const askUser = async () => {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.question('Send message: ', message => {
    // Broadcast to peers
    try {
      var theirPubKey = getPubKey(message.split(":")[0])
      var text = message.split(":")[1]
      message = encrypt(text, getSharedSecret(theirPubKey,getPrivateKey()))
      for (let id in peers) {
        peers[id].conn.write(message)
      }
      rl.close()
      rl = undefined
      askUser()
    } catch (err) {
      console.log(err)
      console.log("There was an error sending your message. Please make sure everything is set properly")
      rl.close()
      rl = undefined
      askUser()
    }
  });
}*/

/** 
 * Default DNS and DHT servers
 * This servers are used for peer discovery and establishing connection
 */
const config = defaults({
  // peer-id
  id: myId,
})

/**
 * discovery-swarm library establishes a TCP p2p connection and uses
 * discovery-channel library for peer discovery
 */
const sw = Swarm(config)


;(async () => {

  // Choose a random unused port for listening TCP peer connections
  const port = await 12345 //getPort()

  sw.listen(port)
  console.log('Listening to port: ' + port)

  /**
   * The channel we are connecting to.
   * Peers should discover other peers in this channel
   */
  sw.join('resistance-channel')

  sw.on('connection', async (conn, info) => {
    // Connection id
    const seq = connSeq

    const peerId = info.id.toString('hex')
    log(`Connected #${seq} to peer: ${hex2ascii(peerId)}`)

    // Keep alive TCP connection with peer
    if (info.initiator) {
      try {
        conn.setKeepAlive(true, 600)
      } catch (exception) {
        log('exception', exception)
      }
    }
    var registration = await getRegistration()
    var message = JSON.stringify({message: registration.message, signature: registration.signature})
    send(message, conn)
    conn.on('data', data => {
      // Here we handle incomming messages
      console.log("PEER ID: " + getPubKey(peerId)) //getPubKey(hex2ascii(peerId)[0]))
      //decrypt(data.toString(),getSharedSecret(getPubKey(hex2ascii(peerId)),getPrivateKey()))
      try{
        log(
          'Received Message from peer ' + peerId,
          '----encrypted--->' + data.toString()
          //'----decrypted---> ' + decrypt(data.toString(),getSharedSecret(getPubKey(hex2ascii(peerId)),getPrivateKey()))
        )
      } catch (err) {
        console.log(err)
        console.log("Received a bad or corrupt message.")
      }
    })

    conn.on('close', () => {
      // Here we handle peer disconnection
      log(`Connection ${seq} closed, peer id: ${peerId}`)
      // If the closing connection is the last connection with the peer, removes the peer
      if (peers[peerId].seq === seq) {
        delete peers[peerId]
      }
    })

    // Save the connection
    if (!peers[peerId]) {
      peers[peerId] = {}
    }
    peers[peerId].conn = conn
    peers[peerId].seq = seq
    //peers[peerId].key = getPubKey(hex2ascii(peerId))
    connSeq++

  })

  // Read user message from command line
  //askUser()  

})()
