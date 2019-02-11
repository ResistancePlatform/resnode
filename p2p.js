const crypto = require('crypto')
const Swarm = require('discovery-swarm')
const defaults = require('dat-swarm-defaults')
const getPort = require('get-port')
const readline = require('readline')
const hex2ascii = require('hex2ascii')
const moment = require('moment')
const RpcClient = require('./resistancerpc.js')


var rpc = new RpcClient()

const peers = {}
// Counter for connections, used for identify connections
let connSeq = 0
var myId = ""

/**
 * Here we will save our TCP peer connections
 * using the peer id as key: { peer_id: TCP_Connection }
 */

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
      peers[id].conn.write(message)
    }
  } catch (err) {
      console.log(err)
  }
}

setInterval(async function() {
  // method to be executed;
  var registration = await getRegistration()
  var message = JSON.stringify({method: "register", message: registration.message, signature: registration.signature})
  sendAll(message)
}, 5000);

function send(message, conn){
  try {
    conn.write(message)
  } catch (err) {
  }
}

async function validSignature(address, signature, message){
  try {
    return await rpc.verifyMessage(address, signature, message)
  } catch (err) {
    console.log(err)
  }
}

async function getRegistration() {
  var registration = {}
  var resAddress = await rpc.getPublicAddress()
  var resPublicKey = await rpc.getPublicKey(resAddress)
  var data = {address: resAddress, publickey: resPublicKey.pubkey, timestamp:moment().valueOf()}
  var signature = await rpc.signMessage(resAddress, JSON.stringify(data))
  registration.message = data
  registration.signature = signature
  return registration
}

async function handleRegistration(req, conn){
  var message = req.message
  var signature = req.signature

  if(!message){
    send(JSON.stringify({method: 'response', message: 'Error: Missing Parameter message'}, conn))
    return
  }
  if(!signature){
    send(JSON.stringify({method: 'response', message: 'Error: Missing Parameter signature'}, conn))
    return
  }
  if(!await validSignature(req.message.address, req.signature, JSON.stringify(req.message))){
    send(JSON.stringify({method: 'response', message: 'Error: Invalid Signature'}), conn)
    return
  }
  send(JSON.stringify({method: 'response', message: 'Registration Successful'}), conn)
  return

}

async function apiHandler(req, conn, info){
  var peerId = info.id.toString()
  try{
    req = JSON.parse(req)
  } catch (error) {
    console.log(error)
    return
  }

  const seq = connSeq

  switch(req.method){
    case "response":
      console.log(req)
      break
    case "register":
     handleRegistration(req, conn)
     break
    default:
     send(JSON.stringify({method: 'response', message: 'Error: Invalid value for parameter method'}), conn)
  }
  return
}

/** 
 * Default DNS and DHT servers
 * This servers are used for peer discovery and establishing connection
 */
;(async () => {

try {
// Peer Identity, a random hash for identify your peer
  var resAddress = await rpc.getPublicAddress()
  myId = resAddress//Buffer.from(resAddress, "utf-8") //crypto.randomBytes(32)
  console.log(resAddress)
} catch (e) {
  console.log(e)
}

const config = defaults({
  // peer-id
  id: myId,
})

/**
 * discovery-swarm library establishes a TCP p2p connection and uses
 * discovery-channel library for peer discovery
 */
const sw = Swarm(config)


   // var registration = await getRegistration()
   // var message = JSON.stringify({method: "register", message: registration.message, signature: registration.signature})
    //console.log(message)
    //console.log(registration)
    //console.log(await validSignature(registration.message.address, registration.signature, JSON.stringify(registration.message)))
    //send(message, conn)

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

    const peerId = info.id
    const seq = connSeq
    log(`Connected  to peer: ${peerId}`)

    // Keep alive TCP connection with peer
    if (info.initiator) {
      try {
        conn.setKeepAlive(true, 600)
      } catch (exception) {
        //log('exception', exception)
      }
    }
    conn.on('data', async (data) => {
      // Here we handle incomming messages
      //console.log("PEER ID: " + getPubKey(peerId)) //getPubKey(hex2ascii(peerId)[0]))
      //decrypt(data.toString(),getSharedSecret(getPubKey(hex2ascii(peerId)),getPrivateKey()))
      try{
	await apiHandler(data.toString(), conn, info)
	//send(JSON.stringify({method: 'response', message: 'Error'}), conn)
        /*log(
          'Received Message from peer ' + peerId,
          '----encrypted--->' + data.toString()
          //'----decrypted---> ' + decrypt(data.toString(),getSharedSecret(getPubKey(hex2ascii(peerId)),getPrivateKey()))
        )*/
      } catch (err) {
        console.log(err)
        console.log("Received a bad or corrupt message.")
      }
    })

    conn.on('close', () => {
      // Here we handle peer disconnection
      log(`Connection closed, peer id: ${peerId}`)
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
    connSeq++

  })

  // Read user message from command line
  //askUser()  

})()
