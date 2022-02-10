var express = require('express');
var app = express();

let port = process.env.PORT || 3344;

app.use('/', express.static('public'));

app.listen(port);
