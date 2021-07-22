const logger = require('../lib/log');
const mysql = require('../services/mysql');
const io = require('../services/socketio');
const elasticSearch = require('../services/elastic');

async function updateContentFileBulk(data,callback){
    try{
        let fileIds='(';
        for(let i=0;i<data.files.length;i++){
            if(i+1==(data.files.length)){
                fileIds+=data.files[i]['fileID']
            }else{
                fileIds+=data.files[i]['fileID']+','
            }
        }
        fileIds+=')';

        let query='UPDATE contentfile SET approvalStatus = ? WHERE fileID in '+fileIds;
        let dataArray=[data.approvalStatus];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsAfterBulkApproval.js/updateContentFileBulk ','catch',err);
        callback({error:true,result:err}) ;
    } 
}

async function deleteFromNotification(data,callback){
    try{
        let fileIds='(';
        for(let i=0;i<data.files.length;i++){
            if(i+1==(data.files.length)){
                fileIds+=data.files[i]['fileID']
            }else{
                fileIds+=data.files[i]['fileID']+','
            }
        }
        fileIds+=')';
        console.log("delete from notification ",data.userID, "   %j",fileIds)
        let query='DELETE FROM notification where userID=? and fileID in '+fileIds;
        let dataArray=[data.userID];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            console.log("result %j",result)
            if(!result.error){
                io.getio();
            }
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsAfterApproval.js/deleteFromNotification ','catch',err);
        callback({error:true,result:err}) ;
    } 
}

async function insertIntoNotification(data,callback){
    try{
        let notificationArray=[];
        for(let file of data.files){
            if(data.notiType=='B'){
                notificationArray.push([file.adminApproverID,'A',new Date().toISOString().slice(0,10),file.fileID,'N',file.fileName,file.authorID,null]);
            }
            notificationArray.push([file.authorID,data.notiType,new Date().toISOString().slice(0,10),file.fileID,'N',file.fileName,file.authorID,null])
        }
        let query='INSERT INTO notification VALUES ?';
                    let dataArray=[notificationArray]
                    mysql.querySQL({query:query,dataArray:dataArray }, async result => {
                        if(!result.error){
                            io.getio();
                        }
                        callback(result)
                    })
    }catch(err){
        logger.error('utils/utilsAfterBulkApproval.js/InsertIntoNotification ','catch',err);
        callback({error:true,result:err}) ;
    } 
}


async function updateES(data,callback){
    try{
        let index=data.fileIDs[0]['indexSearch'];
        if(index){
        let ids=[];
        for(let file of data.fileIDs){
            ids.push(file['fileID'])
        }
console.log("ids ",ids)
       let body={
        "query": {
            "bool": {
                "must": [
                    {
                        "terms": {
                            "fileID": ids
                        }
                    }
                ]
            }
        },
        "script": {
          "source": "ctx._source.approved = params.approved",
          "lang": "painless",
          "params": {
            "approved":"Y"
          }
        }
      }
        
          let esResponse=await elasticSearch.updateByQuery(index.toString(),body)
          if(!esResponse.error){
            callback({error:false,result:'Updated in ES Successfully'})
          }
          else{
            callback(esResponse)
          }
        }else{
            callback({error:true,result:'Index not found for file'})
        }
    }catch(err){
        callback({error:true,result:err}) ;
    }
}


module.exports={
    updateContentFileBulk,
    deleteFromNotification,
    insertIntoNotification,
    updateES
}