require('dotenv').load();
const Client = require('bitcoin-core');
const client = new Client({ 
	network: 'testnet',
	port: 18132,
	username:process.env.RPCUSER,
	password:process.env.RPCPASSWORD
});

//client.getInfo().then((help) => console.log(help));
//
//
//

class RpcClient {
  constructor(){
    this.rpcclient = client
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async sendMany(payouts){
    try{
      var data = {}
      for(var i = 0; i < payouts.length; i++){
        data[payouts[i].paid_address] = payouts[i].amount.toFixed(8)
      }
      console.log(data)
      return await this.rpcclient.sendMany("",data)
    } catch(e) {
      console.log(e)
    }
  }

  async getPrivKey(address){
    var key = await this.rpcclient.dumpPrivKey(address)
    return key
  }
  
  async getPublicAddress(){
    var addresses = await this.rpcclient.getAddressesByAccount("")
    return addresses[0]
  }

  async getPublicKey(address){
    return await this.rpcclient.validateAddress(address)
  }

  async getInfo(){
    await this.rpcclient.getInfo()
  }

  async getCurrentBlock(){
    try{
      let info = await this.rpcclient.getBlockchainInfo()
      return info.blocks
    } catch (e){
    }
  }

  async getAddressBalance(address) {
    try{  
      await this.rpcclient.importAddress(address, "", true);
      await this.sleep(10000)
      let allUTXOs = await client.listUnspent()
      var balance = 0
      for(var i = 0; i < allUTXOs.length; i++){
        if(allUTXOs[i].address == address){
          balance += allUTXOs[i].amount
        }
      }
      return balance
    } catch (e) {
      console.log(e)
    }
  }

  async getTransactionReceived(address, txid) {
    try{
      var received = await this.rpcclient.command("z_listreceivedbyaddress", address, 0)
      for(var i = 0; i < received.length; i++){
          if(received[i].txid == txid){
	      return received[i]
	  }
      }
      return received
    } catch (e) {
      console.log(e)
    }
  }

  async verifyMessage(address, signature, message){
    return await this.rpcclient.verifyMessage(address, signature, message)
  }

  async signMessage(address, message){
    return await this.rpcclient.signMessage(address, message)
  }

  async z_getnewaddress() {
    try{
      return await this.rpcclient.command("z_getnewaddress");
    } catch(e) {
      console.log(e)
    }
  }
}

/*;(async () => {
    try {
	var rpc = new RpcClient()
	var pubKeyResult = await rpc.getPublicKey(await rpc.getPublicAddress())
	
	//var privKey = await rpc.getPrivKey(await rpc.getPublicAddress())
	//var message = "{data:'Here is some JSON'}"
	//var signature = await rpc.signMessage(await rpc.getPublicAddress(), message)
	//console.log("Signature: " + signature)
	//message = message
        //console.log(await rpc.verifyMessage(await rpc.getPublicAddress(), signature, message))	
    } catch (e) {
        console.log(e)
        // Deal with the fact the chain failed
    }
})();*/

module.exports = RpcClient;
