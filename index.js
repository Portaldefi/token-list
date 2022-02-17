var express = require('express');
var app = express();

let getLists = require('./public/tokenlists')

let port = process.env.PORT || 3344;

app.use('/', express.static('public'));

app.get('/lists', function(req, res){
  let chainId = req.query.chainId;
  console.log("chain id", chainId);
  getLists(chainId, function(data){
    res.send({
      count: data.length,
      chainId: chainId,
      tokens: data
    });
  });
})

app.listen(port);
