module.exports = function(app){
  app.get('/health', async function (req, res) {
  	res.send(JSON.stringify({status: "OK"}))
  })
  app.get('/p2p', async function(req, res) {
      res.send("Sent the message")
  })
}
