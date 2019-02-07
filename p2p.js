const configuration = require('./config/config');
const Peer = require('peerjs-nodejs');

module.exports = function(config){
  const nodeid = config.nodeid || null;
  if(nodeid){
    var peer = new Peer(nodeid, {host:'resnodetracker.tk', path:'/peerjs', port:443, secure:true})

    peer.on('open', function(id) {
      console.log('My peer ID is: ' + id);
    });
  }
}

  
