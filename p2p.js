const crypto = require('crypto')
const Swarm = require('discovery-swarm')
const defaults = require('dat-swarm-defaults')
const getPort = require('get-port')
const readline = require('readline')
const hex2ascii = require('hex2ascii')
const moment = require('moment')
const RpcClient = require('./resistancerpc.js')

class P2P {
  constructor(){
    this.rpc = new RpcClient()
    this.peers = {}
    this.connSeq = 0
  }

  async init(){
    try {
    // Peer Identity, a random hash for identify your peer
      this.resAddress = await this.rpc.getPublicAddress()
      //myId = resAddress//Buffer.from(resAddress, "utf-8") //crypto.randomBytes(32)
      console.log(this.resAddress)
    } catch (e) {
      console.log(e)
    }

    const config = defaults({
      // peer-id
      id: this.resAddress,
    })

    /**
     * discovery-swarm library establishes a TCP p2p connection and uses
     * discovery-channel library for peer discovery
     */
    const sw = Swarm(config)

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
      const seq = this.connSeq
      console.log(`Connected  to peer: ${peerId}`)

      // Keep alive TCP connection with peer
      if (info.initiator) {
        try {
          conn.setKeepAlive(true, 600)
        } catch (exception) {
        }
      }
      conn.on('data', async (data) => {
        // Here we handle incomming messages
        //console.log("PEER ID: " + getPubKey(peerId)) //getPubKey(hex2ascii(peerId)[0]))
        //decrypt(data.toString(),getSharedSecret(getPubKey(hex2ascii(peerId)),getPrivateKey()))
        try{
          await this.apiHandler(data.toString(), conn, info)
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
        console.log(`Connection closed, peer id: ${peerId}`)
        // If the closing connection is the last connection with the peer, removes the peer
        if (this.peers[peerId].seq === seq) {
          delete this.peers[peerId]
        }
      })

      // Save the connection
      
      if (!this.peers[peerId]) {
        this.peers[peerId] = {}
      }
      this.peers[peerId].conn = conn
      this.peers[peerId].seq = seq
      this.connSeq++

    })
  }

  static getSharedSecret(theirPubKey, myPrivKey){
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

  static encrypt(text, secret){
    const IV_LENGTH = 16; // For AES, this is always 16
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', new Buffer.from(secret, 'hex'), iv);
    let encrypted = cipher.update(text);

    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  static decrypt(text, secret){
    const IV_LENGTH = 16; // For AES, this is always 16
    let textParts = text.split(':');
    let iv = new Buffer.from(textParts.shift(), 'hex');
    let encryptedText = new Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', new Buffer.from(secret, 'hex'), iv);
    let decrypted = decipher.update(encryptedText);

    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  }

  sendAll(message){
    try{
      for (let id in this.peers){
        this.peers[id].conn.write(message)
      }
    } catch (err) {
        console.log(err)
    }
  }

  send(message, conn){
    try {
      conn.write(message)
    } catch (err) {
      console.log(err)
    }
  }
  async validSignature(address, signature, message){
    try {
      return await this.rpc.verifyMessage(address, signature, message)
    } catch (err) {
      console.log(err)
    }
  }

  async getRegistration() {
    var registration = {}
    var address = await this.rpc.getPublicAddress()
    var resPublicKey = await this.rpc.getPublicKey(address)
    var data = {address: address, publickey: resPublicKey.pubkey, timestamp:moment().valueOf()}
    var signature = await this.rpc.signMessage(this.resAddress, JSON.stringify(data))
    registration.message = data
    registration.signature = signature
    return registration
  }

  async handleRegistration(req, conn){
    var message = req.message
    var signature = req.signature

    if(!message){
      this.send(JSON.stringify({method: 'response', message: 'Error: Missing Parameter message'}, conn))
      return
    }
    if(!signature){
      this.send(JSON.stringify({method: 'response', message: 'Error: Missing Parameter signature'}, conn))
      return
    }
    if(!await validSignature(req.message.address, req.signature, JSON.stringify(req.message))){
      this.send(JSON.stringify({method: 'response', message: 'Error: Invalid Signature'}), conn)
      return
    }
    this.send(JSON.stringify({method: 'response', message: 'Registration Successful'}), conn)
    return

  }

  async apiHandler(req, conn, info){
    var peerId = info.id.toString()
    try{
      req = JSON.parse(req)
    } catch (error) {
      console.log(error)
      return
    }

    const seq = this.connSeq

    switch(req.method){
      case "response":
        console.log(req)
        break
      case "register":
       this.handleRegistration(req, conn)
       break
      default:
       send(JSON.stringify({method: 'response', message: 'Error: Invalid value for parameter method'}), conn)
    }
    return
  }
}
// Counter for connections, used for identify connections

/**
 * Here we will save our TCP peer connections
 * using the peer id as key: { peer_id: TCP_Connection }
 */

/*setInterval(async function() {
  // method to be executed;
  var registration = await getRegistration()
  var message = JSON.stringify({method: "register", message: registration.message, signature: registration.signature})
  sendAll(message)
}, 5000);*/

/** 
 * Default DNS and DHT servers
 * This servers are used for peer discovery and establishing connection
 */

module.exports = P2P
