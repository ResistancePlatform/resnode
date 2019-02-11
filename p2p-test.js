let P2P = require("./p2p.js")

let p2p = new P2P()
p2p.init()

//for testing only
setInterval(async function(p2p) {
  // method to be executed;
  var registration = await p2p.getRegistration()
  var message = JSON.stringify({method: "register", message: registration.message, signature: registration.signature})
  p2p.sendAll(message)
}, 5000);
