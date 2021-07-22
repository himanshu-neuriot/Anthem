const logger = require('../lib/log');
const mysql = require('../services/mysql');


async function viewDownloadDocument(data,callback){
    try{
        let query='select * from contentfile where fileID= ? and deleted= ?';
        let dataArray=[data.fileID,'N'];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsViewAndDownloadDoc.js/viewDocument','catch',err);
        callback({error:true,result:err}) ;
    } 
}
module.exports={
    viewDownloadDocument
}