const express = require('express');
const routes = require('./api');
const http = require('http');
const mysql=require('./services/mysql');
const logger = require('./lib/log');
const kafka = require('./services/kafka-js')
const config = require('config').get('server');
const {checkAndStartPreviouslyScheduledTraining} = require('./services/startPreviouslyScheduledTraining');
let server;
var cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
console.log(`Your port is ${process.env.PORT}`);
const app = express();
  app.use(cors({
    origin: config.cors,
  }));

  app.use(express.json());
   app.use(express.urlencoded({ extended: true}));
  server = http.Server(app);
  
  app.set('view engine', 'ejs');
  // const socketIO = require('socket.io');
  // const io = socketIO(server);
  // io.on('connection', function (socket) {

  //   console.log('connection made for notification');
  // });
  
  // var toAll = function (eventName, data) {
  //   io.sockets.emit(eventName, data);
  // }
  
  // module.exports = {
  //   toAll: toAll // publish `toAll` function to call every where
  // };

  const io = require('./services/socketio').init(server);
  // const socketIO = require('socket.io');
  // const io = socketIO(server);
  // io.on('connection', socket => {
  //   console.log("connection made for notification");
  //   socket.on('userDeleted', function( data ) {
  //     io.sockets.emit('userDeleted', {
  //       type:data.type,
  //     });
  //   });
  //   socket.on('approveOrReminderNoti', function( data ) {
  //     io.sockets.emit('approveOrReminderNoti', {
  //       type:data.type
  //     });
  //   });
  // });
const startServer = async () => {
  server.listen(config.port, async () => {
  logger.info("",`Server now listening at '${config.port}'`);
console.log(new Date());
console.log(new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''));
  app.use('/uiManagement', routes);
	//kafka.consume();
     try{
      mysql.connectToDB();
     }catch(err){
       logger.error('index.js/startServer','catch - connecting to DB',err);
     }
    checkAndStartPreviouslyScheduledTraining();
  });  
};

if (require.main === module) {
  startServer().catch((err) => {
    logger.error('index.js/main','Failed to start app',err);
  });
}
