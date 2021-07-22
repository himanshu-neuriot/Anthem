const logger = require('../lib/log');
const mysql = require('../services/mysql');
const elasticSearch = require('../services/elastic');
const io = require('../services/socketio');
async function fetchTaxonomy(data, callback) {
    try{
        let query='select * from taxonomy where groupID = ? and deleted = ?';
        let dataArray=[data.groupID,'N'];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            if(!result.error){
                if(result.result.length==0){
                    result={error:false,result:'length 0'};
                }else{
                    let taxoData=result.result;
                    let customParentTag=null;
                    let parentTags=[];
                    let parentTagsStructed={}
                    let child1Tags=[];
                    let child2Tags=[];
                    let child3Tags=[];
                    //customParentTag = taxoData.find(o => o.nodeDescription === '#Custom').nodeID;
                    //taxoData = taxoData.filter(data => data.nodeID!==customParentTag && data.parentID!==customParentTag);
                    taxoData = taxoData.filter(data => {
                    if(!data.parentID){
                        parentTags.push({value:data.nodeDescription,id:data.nodeID});
                        parentTagsStructed[[data.nodeID]]=data.nodeDescription
                    }
                    else
                        return data;
                    });
                    if(parentTags.length!=0 && taxoData.length!=0){
                    let parentIds=Object.keys(parentTagsStructed);
                    let child1TagsStructured={}
                    taxoData = taxoData.filter(data => {
                        if(parentIds.includes(data.parentID.toString())){
                        child1Tags.push({value:data.nodeDescription,id:data.nodeID,parent:parentTagsStructed[data.parentID],parentID:data.parentID});
                        child1TagsStructured[[data.nodeID]]=data.nodeDescription
                    }
                        else
                        return data;
                    });
                    if(child1Tags.length!=0 && taxoData.length!=0){
                        let child1Ids=Object.keys(child1TagsStructured);
                        let child2TagsStructured={}
                        taxoData = taxoData.filter(data => {
                        if(child1Ids.includes(data.parentID.toString())){
                        child2Tags.push({value:data.nodeDescription,id:data.nodeID,parent:child1TagsStructured[data.parentID],parentID:data.parentID});
                        child2TagsStructured[[data.nodeID]]=data.nodeDescription
                    }
                        else
                        return data;
                    });
                    if(child2Tags.length!=0 && taxoData.length!=0){
                        let child2Ids=Object.keys(child2TagsStructured);
                        taxoData = taxoData.filter(data => {
                        if(child2Ids.includes(data.parentID.toString())){
                        child3Tags.push({value:data.nodeDescription,id:data.nodeID,parent:child2TagsStructured[data.parentID],parentID:data.parentID});
                    }
                        else
                        return data;
                    });
                    }
                    }
                    }
                    result={error:false,result:{parentTags,child1Tags,child2Tags,child3Tags}};
                }
            }
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsAfterIngestion.js/fetchTaxonomy','catch',err);
        callback({error:true,result:err}) ;
    } 
}
async function checkIfFileIsCorrect(data,callback){
    try{
        let query='select * from contentfile where fileID = ? and deleted = ?';
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
        logger.error('utils/utilsAfterIngestion.js/checkIfFileIsCorrect','catch',err);
        callback({error:true,result:err}) ;
    }
}
async function storePredictedTagsInTable(data,callback){
    try{
        if(data.allPredictedTags.length>0){
            let fileClassValues=[];
            data.allPredictedTags.forEach((tag) => {
                fileClassValues.push([data.fileID,tag,'N']);
              });
            let query='INSERT INTO fileclass VALUES ?';
            let dataArray=[fileClassValues];
            mysql.querySQL({query:query,dataArray:dataArray }, async result => {
                callback(result)
            })
        }else{
            callback({error:false,result:'No tags present to store in table'}) ;
        }
        
    }catch(err){
        logger.error('utils/utilsAfterIngestion.js/storePredictedTagsInTable','catch',err);
        callback({error:true,result:err}) ;
    }
}
async function fetchEsIndex(data,callback){
    try{
        let query='select * from companyuser where userID = ? and deleted = ?';
        let dataArray=[data.authorID,'N'];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            if(!result.error){
                if(result.result.length>0){
                    let query1='select * from companygroup where groupID = ? and deleted = ?';
                    let dataArray1=[result.result[0].groupID,'N'];
                    mysql.querySQL({query:query1,dataArray:dataArray1 }, async result1 => {
                        if(!result1.error){
                            if(result1.result.length==0){
                                result1={error:true,result:'Group Not found'};
                            }
                         }
                         callback(result1)
                    })
                }else{
                    callback({error:true,result:'User Not found'})
                }
            }else{
                callback(result)
            }
            
        })
    }catch(err){
        logger.error('utils/utilsAfterIngestion.js/fetchEsIndex','catch',err);
        callback({error:true,result:err}) ;
    }
}
async function storePredictedTagsInES(data,callback){
    try{
        if(data.taxoData!='length 0'){
            if(data.taxoData.parentTags.length>0 && data.predictedLevel1.length>0){
                let predictedLevel1=data.predictedLevel1;
                let predictedLevel2=data.predictedLevel2;
                let predictedLevel3=data.predictedLevel3;
                let predictedLevel4=data.predictedLevel4;
                let taxoData=data.taxoData
                let addedLevel1Tags=[];
                let addedLevel2Tags=[];
                let addedLevel3Tags=[];
                let addedLevel4Tags=[];
                let dataForEs=[];
                if(predictedLevel4.length>0){
                taxoData.child3Tags.forEach((tag) => {
                     if(predictedLevel4.includes(tag.id)){
                         let Level3_tag;
                         taxoData.child2Tags.filter(function (child2) {
                             if(child2.id===tag.parentID){
                                 Level3_tag=child2
                             }
                           });
                         let Level2_tag={}
                         taxoData.child1Tags.filter(function (child1) {
                             if(child1.id===Level3_tag.parentID){
                                 Level2_tag=child1
                             }
                           });
                         let Level1_tag={}
                           taxoData.parentTags.filter(function (parent) {
                               if(parent.id===Level2_tag.parentID){
                                   Level1_tag=parent
                               }
                         });
                         dataForEs.push({Level1_tag:Level1_tag.value,Level2_tag:Level2_tag.value,Level3_tag:Level3_tag.value,Level4_tag:tag.value})
                         addedLevel1Tags.push(Level1_tag.id);
                         addedLevel2Tags.push(Level2_tag.id);
                         addedLevel3Tags.push(Level3_tag.id);
                         addedLevel4Tags.push(tag.id)
                     }
                   });
                }
                predictedLevel3= predictedLevel3.filter(function (level3) {
                 if(!addedLevel3Tags.includes(level3)){
                     return level3
                 }
               });
         
         
               if(predictedLevel3.length>0){
                 taxoData.child2Tags.forEach((tag) => {
                      if(predictedLevel3.includes(tag.id)){
                          let Level2_tag;
                          taxoData.child1Tags.filter(function (child1) {
                              if(child1.id===tag.parentID){
                                  Level2_tag=child1
                              }
                            });
                          let Level1_tag={}
                            taxoData.parentTags.filter(function (parent) {
                                if(parent.id===Level2_tag.parentID){
                                    Level1_tag=parent
                                }
                          });
                          dataForEs.push({Level1_tag:Level1_tag.value,Level2_tag:Level2_tag.value,Level3_tag:tag.value})
                          addedLevel1Tags.push(Level1_tag.id);
                          addedLevel2Tags.push(Level2_tag.id);
                          addedLevel3Tags.push(tag.id);
                      }
                    });
                 }
                 predictedLevel2= predictedLevel2.filter(function (level2) {
                  if(!addedLevel2Tags.includes(level2)){
                      return level2
                  }
                });
         
                if(predictedLevel2.length>0){
                 taxoData.child1Tags.forEach((tag) => {
                      if(predictedLevel2.includes(tag.id)){
                          let Level1_tag;
                          taxoData.parentTags.filter(function (parent) {
                              if(parent.id===tag.parentID){
                                  Level1_tag=parent
                              }
                            });
                          dataForEs.push({Level1_tag:Level1_tag.value,Level2_tag:tag.value})
                          addedLevel1Tags.push(Level1_tag.id);
                          addedLevel2Tags.push(tag.id);
                      }
                    });
                 }
                 predictedLevel1= predictedLevel1.filter(function (level1) {
                  if(!addedLevel1Tags.includes(level1)){
                      return level1
                  }
                });
                if(predictedLevel1.length>0){
                 taxoData.parentTags.forEach((tag) => {
                     if(predictedLevel1.includes(tag.id)){
                         dataForEs.push({Level1_tag:tag.value})
                         addedLevel1Tags.push(tag.id);
                     }
                   });
                };
             
                let body={
                 "query": {"match_phrase": {"fileID": data.fileID}},
                 "script": {
                   "source": "ctx._source.tags = params.tags;ctx._source.custom_tags = params.custom_tags;",
                   "lang": "painless",
                   "params": {
                     "tags": dataForEs,
                     "custom_tags": []
                   }
                 }
               };
         
               let esResponse=await elasticSearch.updateByQuery(data.index,body)
               if(!esResponse.error){
                 callback({error:false,result:'Updated in ES Successfully'})
               }
               else{
                 callback(esResponse)
               }
             }else{
                 callback({error:false,result:'No tags to store in ES'}) ;
             }
        }else{
            callback({error:false,result:'No tags to store in ES'}) ;
        }
        
       
    }catch(err){
        logger.error('utils/utilsAfterIngestion.js/storePredictedTagsInES','catch',err);
        callback({error:true,result:err}) ;
    }
}
async function updateContentFile(data,callback){
    try{
        let query='update contentfile set ingested = ? where fileID = ?';
        let dataArray=[data.ingested,data.fileID];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsAfterIngestion.js/updateContentFile','catch',err);
        callback({error:true,result:err}) ;
    }
}
async function sendNotification(data,callback){
    try{
        let query='INSERT INTO notification VALUES ?';
        mysql.querySQL({query:query,dataArray:[data.dataArray] }, async result => {
            if(!result.error){
                io.getio();
                
            }
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsAfterIngestion.js/storePredictedTagsInTable','catch',err);
        callback({error:true,result:err}) ;
    }
}
async function updateModel(data,callback){
    try{
        let query='Select * from trainingdata where groupID = ? and deleted = ?';
        let dataArray=[data.groupID,'N'];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            if(!result.error){
                if(result.result.length==0){
                    data.setAsDefault='Y'
                }
                let query1='update trainingdata set modelName = ?, score = ?, trainingDate =? , defaultModel = ? where groupID =? and deleted =? and modelID =?';;
        let dataArray1=[data.modelName,data.score,data.trainingDate,data.setAsDefault,data.groupID,'N',data.modelID];
        mysql.querySQL({query:query1,dataArray:dataArray1 }, async result1 => {
            callback(result1)
        })

            }else{
                callback(result)
            }
        })
    }catch(err){
        logger.error('utils/updateModel.js/updateModel','catch',err);
        callback({error:true,result:err}) ;
    } 
}
async function fetchAdminToSendModelNotification(data, callback) {
    try{
        let query="Select * from companygroup where groupID = ? and deleted =?"
        let dataArray=[data.groupID,'N'];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            callback(result);
        })
    }catch(err){
        logger.error('utils/utilsAfterIngestion.js/fetchAdminToSendModelNotification','catch',err);
        callback({error:true,result:err}) ;
    } 
}
async function insertModel(data, callback) {
    try{
        let query='Select * from trainingdata where groupID = ? and deleted = ?';
        let dataArray=[data.modelData.groupID,'N'];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            if(!result.error){
                if(result.result.length==0){
                    data.setAsDefault='Y'
                }
                let query1='INSERT INTO trainingdata VALUES ?';
        let dataArray1=[];
        dataArray1.push([null,data.modelData.model_name,data.modelData.groupID,data.modelData.date_today,data.modelData.model_score,data.setAsDefault,null,null,'N']);
        mysql.querySQL({query:query1,dataArray:[dataArray1] }, async result1 => {
            callback(result1)
        })

            }else{
                callback(result)
            }
        })
        
        
    }catch(err){
        logger.error('utils/utilsAfterIngestion.js/insertModel','catch',err);
        callback({error:true,result:err}) ;
    } 
}
async function deleteFileFromTable(data,callback){
    try{
        let query='update contentfile set deleted =? where fileID =?';
        let dataArray=['Y',data.fileID];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsCommon.js/deleteFileFromTable','catch',err);
        callback({error:true,result:err}) ;
    } 
}
async function deleteFileFromElasticSearch(data,callback){
    try{
        let body={
            "query": {"match_phrase": {"fileID": data.fileID}}
          }
        let esResponse=await elasticSearch.deleteByQuery(data.index,body)
      if(!esResponse.error){
        callback({error:false,result:'File deleted successfully from ES'})
      }
      else{
        callback(esResponse)
      }
    }catch(err){
        logger.error('utils/utilsCommon.js/deleteFileFromElasticSearch','catch',err);
        callback({error:true,result:err}) ;
    } 
}
async function deleteFile(data,callback){
  deleteFileFromTable(data, async resultDeleteFileFromTable=> {
    if(!resultDeleteFileFromTable.error){
      deleteFileFromElasticSearch(data, async resultDeleteFileFromElasticSearch=> {
        if(!resultDeleteFileFromElasticSearch.error){
          callback({error:false,result:"Deleted from table and ES"});
        }else{
          logger.error('utils/utilsCommon.js/documentManagementDeleteFile','deleteFileFromElasticSearch',resultDeleteFileFromElasticSearch.result);
          callback({error:true,result:"Deleted from table but error in ES"});
        }
      })
    }else{
      logger.error('utils/utilsCommon.js/documentManagementDeleteFile','deleteFileFromTable',resultDeleteFileFromTable.result);
      callback({error:true,result:"Error in deleting from table"});
    }
  })
}
module.exports={
    fetchTaxonomy,
    checkIfFileIsCorrect,
    storePredictedTagsInTable,
    fetchEsIndex,
    storePredictedTagsInES,
    updateContentFile,
    sendNotification,
    updateModel,
    fetchAdminToSendModelNotification,
    insertModel,
    deleteFile
}
