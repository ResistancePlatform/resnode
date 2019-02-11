let P2P = require("./p2p.js")

let p2p = new P2P()
p2p.init()

//for testing only
setInterval(async function() {
  // method to be executed;
  var peers = p2p.peers
  console.log(peers)
  var registration = await p2p.getRegistration()
  var message = JSON.stringify({method: "register", message: registration.message, signature: registration.signature})
  for(var peer in peers){
    if(!peers[peer].registered){
      p2p.send(message, peers[peer].conn)
      console.log("Sent registration")
    }
  }
}, 5000, p2p);
