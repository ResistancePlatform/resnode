let P2P = require("./p2p.js")

let p2p = new P2P()
p2p.init()

//Wait for connections and run pings every 5 seconds
setInterval(async function() {
  var peers = p2p.peers
  for(var peer in peers){
    await p2p.ping(peers[peer].conn)
  }
}, 5000, p2p);
