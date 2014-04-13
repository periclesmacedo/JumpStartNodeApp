'use strict';

var exchangeData = {},
    exch = require('./lib/exchange'),
    nocklib = require('./lib/nocklib'),
    nockroutes = require('./routes/nockroutes'),
    db = require('./lib/db'),
    express = require('express'),
    http = require('http'),
    timeFloor = 500,
    timeRange = 1000,
    SECRET_KEY = 'secretpasswordforsessions';

var stocks = ['NOCK1', 'NOCK2', 'NOCK3', 'NOCK4', 'NOCK5'];
var allData = [];
stocks.forEach(function(stock){allData.push({});});

function submitRandomOrder(index){
  var exchangeData = allData[index];
  //order
  var ord = nocklib.generateRandomOrder(exchangeData);
  ord.stock = stocks[index];
  console.log('order', ord);
  if(ord.type == exch.BUY)
    allData[index] = exch.buy(ord.price, ord.volume, exchangeData);
  else
    allData[index] = exch.sell(ord.price, ord.volume, exchangeData);

  db.insertOne('transactions', ord, function(err, order){
    if(exchangeData.trades && exchangeData.trades.length > 0){
      nocklib.sendTrades(exchangeData.trades);
      var trades = exchangeData.trades.map(function(trade){
        trade.init = (ord.type == exch.BUY)? 'b' : 's';
        trade.stock = stocks[index];
        return trade;
      });
      nocklib.sendExchangeData(stocks[index], exchangeData);
      db.insert('transactions', trades, function(err, trades){
        pauseThenTrade();
      });
    }
    else
      pauseThenTrade();
  })

  function pauseThenTrade(){
    var pause = Math.floor(Math.random() * timeRange) + timeFloor;
    setTimeout(submitRandomOrder.bind(this, index), pause);
    console.log(exch.getDisplay(exchangeData));
  }
}

var app = express();
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.static(__dirname + '/public'));
});
app.set('view options', {layout: false});
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({secret: SECRET_KEY, 
  store: nocklib.getSessionStore()}));
app.post('/add-stock', nockroutes.addStock);
app.get('/', nockroutes.getIndex);
app.get('/api/user/:username', nockroutes.getUser);
app.post('/login', nockroutes.login);
app.post('/signup', nockroutes.signup);
app.get('/portfolio', nocklib.ensureAuthenticated, nockroutes.portfolio);
app.get('/api/trades', function(req, res){
  db.find('transactions', {init: {$exists: true}}, 100,
    function(err, trades){
      if(err){
        console.error(err);
        return
      }
      var json = [];
      var lastTime = 0;
      //hightstock expects an array of arrays.
      //Each subarray of form [time, price]
      trades.reverse().forEach(function(trade){
        var date = new Date(parseInt(trade._id.toString()
            .substring(0,8), 16) * 1000);
        var dataPoint = [date.getTime(), trade.price];
        if(date - lastTime > 1000)
          json.push(dataPoint);
        
      });
      res.json(json);
    });
});

db.open(function(){
  var server = http.createServer(app);
  nocklib.createSocket(server, SECRET_KEY);
  server.listen(3000);
  for(var i = 0; i < stocks.length; i++){
    submitRandomOrder(i);
  }
});
