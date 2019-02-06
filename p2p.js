var P2P = require('socket.io-p2p');

function p2pInit(socket){
  var p2p = new P2P(socket);
  p2p.on('peer-msg', function (data) {
    console.log('From a peer %s', data);
  });
  return p2p
}

module.exports = {p2pInit}
