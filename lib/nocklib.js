'use strict';

var exchange = require('./exchange'),
    express = require('express'),
    crypto = require('crypto'),
    cookie = require('cookie'),
    http = require('http'),
    ObjectID = require('mongodb').ObjectID,
    MemoryStore = express.session.MemoryStore,
    db = require('./db'),
    priceFloor = 35,
    priceRange = 10,
    volFloor = 80,
    volRange = 40;

var sessionStore = new MemoryStore();
var io;
var online = [];

module.exports = {
  authenticate: function(username, password, callback){
    db.findOne('users', {username: username}, function(err, user){
      if(user && (user.password == encryptPassword(password)))
        callback(err, user._id);
      else
        callback(err, null);
    });
  },

  getUserById: function(id, callback){
    db.findOne('users', {_id: new ObjectID(id)}, callback);
  },

  createSocket: function(server, SECRET_KEY){
    io = require('socket.io').listen(server);
    io.configure(function(){
      //authorizes the user by the id is
      //passed as a handshake
      io.set('authorization', function(handshakeData, callback){
        if(handshakeData.headers.cookie){
          //parse cookie
          var cookieParser = express.cookieParser(SECRET_KEY);
          cookieParser(handshakeData, null, function(error){
            //after unsigning the cookie, get the session ID
            handshakeData.sessionID = handshakeData.signedCookies['connect.sid'];
            sessionStore.get(handshakeData.sessionID,
              function(error, session){
                if(error || !session){
                  return callback(null, false);
                }else{
                  handshakeData.session = session;
                  return callback(null, true);
                }
            });
          });
        }
        else{
          return callback(null, false);
        }
      });

      //function on joined event
      io.sockets.on('connection', function(socket){
        socket.on('joined', function(data){
          var username = socket.handshake.session.username;
          online.push(username);
          var message = username + ': ' +
            data.message + '\n';
          socket.emit('chat', {message: message, 
            users: online});
          socket.broadcast.emit('chat', {message: message,
            username: username});
        });

        socket.on('updateAccount', function(data){
          module.exports.updateEmail(socket.handshake.session._id,
            data.email, function(err, numUpdates){
              socket.emit('updateSuccess', {});
            });
        });

        socket.on('clientChat', function(data){
          var message = socket.handshake.session.username + ": "+
            data.message + '\n';
          socket.emit('chat', {message: message});
          socket.broadcast.emit('chat', {message: message});
        });

        socket.on('disconnect', function(data){
          var username = socket.handshake.session.username;
          var index = online.indexOf(username);
          online.splice(index, 1);
          socket.broadcast.emit('disconnect', {username: username});
        });
      });
    });
  },

  createUser: function(username, email, password, callback){
    var user = {username: username, email: email,
      password: encryptPassword(password)};
    db.insertOne('users', user, callback);
  },

  sendTrades: function(trades){
    io.sockets.emit('trade', JSON.stringify(trades));
  },

  updateEmail: function(id, email, callback){
    db.updateById('users', new ObjectID(id),
      {email: email}, callback);
  },

  getUser: function(username, callback){
    db.findOne('users', {username: username}, callback);
  },
  
  ensureAuthenticated: function(req, res, next){
    if(req.session._id){
      return next();
    }
    res.redirect('/');
  },

  generateRandomOrder: function(exchangeData){
    var order = {};
    if(Math.random() > 0.5) order.type = exchange.BUY;
    else order.type = exchange.SELL;

    var buyExists = exchangeData.buys &&
      exchangeData.buys.prices.peek();
    var sellExists = exchangeData.sells &&
      exchangeData.sells.prices.peek();
    var ran = Math.random();

    if(!buyExists && !sellExists)
      order.price = Math.floor(ran * priceRange) + priceFloor;
    else if(buyExists && sellExists){
      if(Math.random() > 0.5)
        order.price = exchangeData.buys.prices.peek();
      else
        order.price = exchangeData.sells.prices.peek();
    } else if (buyExists){
      order.price = exchangeData.buys.prices.peek();
    }else{
      order.price = exchangeData.sells.prices.peek();
    }

    var shift = Math.floor(Math.random() * priceRange / 2);

    if(Math.random() > 0.5) order.price += shift;
    else order.price -= shift;
    order.volume = Math.floor(Math.random() * volRange) + volFloor;
    return order;
  },

  getSessionStore: function(){
    return sessionStore;
  },

  getStockPrices: function(stocks, callback){
    var stockList = '';
    stocks.forEach( function(stock){
      stockList += stock + ',';
    });

    var options = {
      host: 'download.finance.yahoo.com',
      port: 80,
      path: '/d/quotes.csv?s=' + stockList + '&f=sl1c1d1&e=.csv'
    };

    http.get(options, function(res){
      var data = '';
      res.on('data', function(chunk){
        data += chunk.toString();
      }).on('error', function(err){
        console.err('Error retrieving Yahoo stock prices');
        throw err;
      }).on('end', function(){
        var tokens = data.split('\r\n');
        var prices = [];
        tokens.forEach(function(line){
          var price = line.split(',')[1];
          if(price)
            prices.push(price);
        });
        callback(null, prices);
      });
    });
  },

  addStock: function(uid, stock, callback){
    function doCallback(){
      counter++;
      if(counter == 2){
        callback(null, price);
      }
    }
    var counter = 0;
    var price;
    module.exports.getStockPrices([stock],
      function(err, retrieved){
        price = retrieved[0];
        doCallback();
      });

    db.push('users', new ObjectID(uid), {portfolio: stock}, doCallback);
  }
}

function encryptPassword(plainText){
  return crypto.createHash('md5').update(plainText).digest('hex');
}
