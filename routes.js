module.exports = function(app, p2psocket){
  p2psocket.on('ready', function(){
    p2psocket.usePeerConnection = true
    p2psocket.emit('peer-msg', {message:"hello world"})
  })
  app.get('/health', async function (req, res) {
  	res.send(JSON.stringify({status: "OK"}))
  })
  app.get('/p2p', async function(req, res) {
      p2psocket.emit('peer-msg', {message:"hello world"}); 
      res.send("Sent the message")
  })
}
