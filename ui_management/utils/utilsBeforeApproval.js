const logger = require('../lib/log');
const mysql = require('../services/mysql');

async function fetchDocumentsForApproval(data,callback){
    try{
        let approvalStatus=undefined;
        let query=undefined
        if(data.userType=='A'){
            approvalStatus='N'
            query='select * from contentfile where approverID = ? AND approvalStatus = ? AND deleted = ? AND ingested = ? AND publishOrTrainer =? AND versionOf is null AND replacementOf is null';
        }
        else if(data.userType=='C'){
            approvalStatus='P';
            query='select * from contentfile where adminApproverID = ? AND approvalStatus = ? AND deleted = ? AND ingested = ? AND publishOrTrainer =? AND versionOf is null AND replacementOf is null';
        }
        let dataArray=[data.approverID,approvalStatus,'N','Y','P'];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsBeforeApproval.js/fetchDocumentsForApproval','catch',err);
        callback({error:true,result:err}) ;
    } 
}

async function fetchTaxonomy(data,callback){
    try{
        let query='select * from taxonomy where groupID = ? and deleted = ?';
        let dataArray=[data.groupID,'N'];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            if(!result.error){
                if(result.result.length==0){
                    result={error:false,result:'length 0'};
                }
            }
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsBeforeApproval.js/fetchTaxonomy','catch',err);
        callback({error:true,result:err}) ;
    } 
}

async function fetchPreviousTaxonomy(data,callback){
    try{
        let query='select * from fileclass where fileID = ? and deleted = ?';
        let dataArray=[data.fileID,'N'];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            if(!result.error){
                if(result.result.length==0){
                    result={error:false,result:'length 0'};
                }
            }
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsBeforeApproval.js/fetchPreviousTaxonomy','catch',err);
        callback({error:true,result:err}) ;
    } 
}
module.exports={
    fetchDocumentsForApproval,
    fetchTaxonomy,
    fetchPreviousTaxonomy
}