const logger = require('../lib/log');
const mysql = require('../services/mysql');

async function fetchNotificationData(data,callback){
    try{
        let query='select * from notification where userID = ?';
        let dataArray=[data.userID];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsNotification.js/fetchNotificationData','catch',err);
        callback({error:true,result:err}) ;
    } 
}
async function resetActiveNotification(data,callback){
    try{
        let query='update notification SET notiOpened=?  where userID=?';
        let dataArray=['Y',data.userID];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsNotification.js/resetActiveNotification','catch',err);
        callback({error:true,result:err}) ;
    } 
}
module.exports={
    fetchNotificationData,
    resetActiveNotification
}