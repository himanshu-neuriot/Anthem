const logger = require('../lib/log');
const mysql = require('../services/mysql');
const elasticSearch = require('../services/elastic');


async function fetchAllVersionsOfFile(data,callback){
    try{
        let query='select * from contentfile where versionOf =? and deleted = ?';
        let dataArray=[data.fileID,'N'];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
             callback(result)
        })
    }catch(err){
        logger.error('utils/utilsDocumentManagement.js/fetchAllVersionsOfFile','catch',err);
        callback({error:true,result:err}) ;
    }
}
async function deleteFileFromTable(data,callback){
    try{
        let fileIDs='(';
        for(let i=0;i<data.fileIDs.length;i++){
            if((i+1)==data.fileIDs.length){
                fileIDs+=data.fileIDs[i]
            }else{
                fileIDs+=data.fileIDs[i]+','
            }

        }
        fileIDs+=')'
        let query='update contentfile set deleted = ? where fileID in '+fileIDs;
        let dataArray=['Y'];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsDocumentManagement.js/deleteFileFromTable','catch',err);
        callback({error:true,result:err}) ;
    } 
}
async function deleteFileFromElasticSearch(data,callback){
    try{
        //let body={
          //  "query": {"match_phrase": {"fileID": data.fileIDs}}
          //}
let body ={
            "query": {
                "bool": {
                    "must": [
                        {
                            "terms": {
                                "fileID": data.fileIDs
                            }
                        }
                    ]
                }
            }
        }
console.log("body %j",body);
        let esResponse=await elasticSearch.deleteByQuery(data.index,body)
      if(!esResponse.error){
        callback({error:false,result:'File deleted successfully from ES'})
      }
      else{
        callback(esResponse)
      }
    }catch(err){
        logger.error('utils/utilsDocumentManagement.js/deleteFileFromElasticSearch','catch',err);
        callback({error:true,result:err}) ;
    } 
}
async function documentManagementDeleteFile(data,callback){
  deleteFileFromTable(data, async resultDeleteFileFromTable=> {
    if(!resultDeleteFileFromTable.error){
      deleteFileFromElasticSearch(data, async resultDeleteFileFromElasticSearch=> {
        if(!resultDeleteFileFromElasticSearch.error){
          callback({error:false,result:"Deleted from table and ES"});
        }else{
          logger.error('utils/utilsDocumentManagement.js/documentManagementDeleteFile','deleteFileFromElasticSearch',resultDeleteFileFromElasticSearch.result);
          callback({error:true,result:"Deleted from table but error in ES"});
        }
      })
    }else{
      logger.error('utils/utilsDocumentManagement.js/documentManagementDeleteFile','deleteFileFromTable',resultDeleteFileFromTable.result);
      callback({error:true,result:"Error in deleting from table"});
    }
  })
}


module.exports={
    fetchAllVersionsOfFile,
     documentManagementDeleteFile
}
