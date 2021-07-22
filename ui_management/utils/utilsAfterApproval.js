const logger = require('../lib/log');
const mysql = require('../services/mysql');
const elasticSearch = require('../services/elastic');
const io = require('../services/socketio')

async function setDeletedInFileClass(data,callback){
    try{
        let query='delete from fileclass where fileID = ?';
        let dataArray=[data.fileID];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsAfterApproval.js/setDeletedInFileClass','catch',err);
        callback({error:true,result:err}) ;
    } 
}

async function storeCustomTagsInTaxonomy(data,callback){
    try {
        let arrayForFileClass=[];
        let insertInTaxo=[];
        if(data.customTagsArray.length>0){
        let query='Select * from taxonomy where groupID= ? and nodeDescription=? and deleted =?';
        let dataArray=[data.groupID,'#Custom','N'];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            if(!result.error){
                let parentCustomTagID=result.result[0].nodeID;
                let query1='Select * from taxonomy where parentID = ? and deleted = ?';
                let dataArray1=[parentCustomTagID,'N'];
                mysql.querySQL({query:query1,dataArray:dataArray1 }, async result1 => {
                    if(!result1.error){
                        let customTags=result1.result;
                        if(customTags.length>0){
                            for(let tag of data.customTagsArray){
                                let found=false;
                               for(let tag1 of customTags){
                                   if(tag.toLowerCase()===tag1.nodeDescription.toLowerCase()){
                                    found=true
                                    arrayForFileClass.push([data.fileID,tag1.nodeID,'N']);
                                    break;
                                   }
                               }
                               if(!found){
                                insertInTaxo.push([null,tag,data.groupID,parentCustomTagID,'N'])
                               }
                            }
                        }else{
                            for(let tag of data.customTagsArray){
                                insertInTaxo.push([null,tag,data.groupID,parentCustomTagID,'N'])
                             }
                        }
                         if(insertInTaxo.length===0){
                             if(arrayForFileClass.length>0){
                                arrayForFileClass.push([data.fileID,parentCustomTagID,'N']);
                             }
                            callback({error:false,result:{arrayForFileClass}});
                        }else{
                            let query2='INSERT INTO taxonomy VALUES ?';
                            let dataArray2=[insertInTaxo];
                            mysql.querySQL({query:query2,dataArray:dataArray2 }, async result2 => {
                                if(!result2.error){
                                let insertId=result2.result.insertId;
                            
                                    arrayForFileClass.push([data.fileID,insertId,'N'])
                                
                                if(insertInTaxo.length>1){
                                    for(let i=1;i<insertInTaxo.length;i++){
                                        arrayForFileClass.push([data.fileID,(insertId+i),'N'])
                                    }
                                }
                                if(arrayForFileClass.length>0){
                                    arrayForFileClass.push([data.fileID,parentCustomTagID,'N']);
                                 }
                                callback({error:false,result:{arrayForFileClass}});
                                }else{
                                    logger.error('utils/utilsAfterApproval.js/storeCustomTagsInTaxonomy','insert in taxonomy',result2.result);
                                    callback(result2)
                                }
                            })
                        }
                    }else{
                        logger.error('utils/utilsAfterApproval.js/storeCustomTagsInTaxonomy','fetching all custom tags',result1.result);
                        callback(result1)
                    }
                })

            }
            else{
                logger.error('utils/utilsAfterApproval.js/storeCustomTagsInTaxonomy','fetching parent custom tag',result.result);
                callback(result)
            }
        })
    }else{
        callback({error:false,result:{arrayForFileClass:[]}});
    }
      
    } catch (err) {
      return {error:true,result:err}
    }
};

async function storeTagsInFileClass(data,callback){
    try{
        let query='insert into fileclass values ?';
        let dataArray=[data.arrayInApprove];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsAfterApproval.js/storeTagsInFileClass','catch',err);
        callback({error:true,result:err}) ;
    } 
}

async function storeTagsInEs(data,callback){
    try{
        let dataForEs=[];
        if(data.taxonomyData.length>0){
            for(let Level1 of data.taxonomyData){
                if(Level1.children.length>0){
                    let Level2Checked=false;
                    for(let Level2 of Level1.children){
                        if(Level2.children.length>0){
                            let Level3Checked=false;
                            for(let Level3 of Level2.children){
                                if(Level3.children.length>0){
                                    let Level4Checked=false;
                                    for(let Level4 of Level3.children){
                                        if(Level4.checked){
                                            dataForEs.push({Level1_tag:Level1.nodeDescription,Level2_tag:Level2.nodeDescription,Level3_tag:Level3.nodeDescription,Level4_tag:Level4.nodeDescription});
                                            Level4Checked=true;
                                            Level3Checked=true;
                                            Level2Checked=true;
                                        }
                                    }
                                    if(!Level4Checked && Level3.checked){
                                        dataForEs.push({Level1_tag:Level1.nodeDescription,Level2_tag:Level2.nodeDescription,Level3_tag:Level3.nodeDescription});
                                        Level3Checked=true;
                                        Level2Checked=true;
                                    }
                                }else{
                                    if(Level3.checked){
                                        dataForEs.push({Level1_tag:Level1.nodeDescription,Level2_tag:Level2.nodeDescription,Level3_tag:Level3.nodeDescription});
                                        Level3Checked=true;
                                        Level2Checked=true;
                                    }
                                    
                                }
                            }
                            if(!Level3Checked && Level2.checked){
                                dataForEs.push({Level1_tag:Level1.nodeDescription,Level2_tag:Level2.nodeDescription});
                                Level2Checked=true;
                            }
                        }
                        else{
                            if(Level2.checked){
                            dataForEs.push({Level1_tag:Level1.nodeDescription,Level2_tag:Level2.nodeDescription});
                            Level2Checked=true;
                            }
                        }
                    }
                    if(!Level2Checked && Level1.checked){
                        dataForEs.push({Level1_tag:Level1.nodeDescription});
                    }
                }else{
                    if(Level1.checked){
                        dataForEs.push({Level1_tag:Level1.nodeDescription});
                    }
                    
                }
            }
        }
        
        let customTags=[];
        // if(data.customTagsArray){
        //     for(let tag of data.customTagsArray){
        //         //customTags.push({tag})
        //         dataForEs.push({Level1_tag:'#Custom',Level2_tag:tag});
        //     }
        // }
        
        
       let body;
        if(data.approvalStatus=='Y'){
            body={
                "query": {"match_phrase": {"fileID": data.fileID}},
                "script": {
                  "source": "ctx._source.tags = params.tags;ctx._source.custom_tags = params.custom_tags;ctx._source.approved = params.approved;",
                  "lang": "painless",
                  "params": {
                    "tags": dataForEs,
                    "custom_tags": customTags,
                    "approved":"Y"
                  }
                }
              }
        }
        else{
            body={
                "query": {"match_phrase": {"fileID": data.fileID}},
                "script": {
                  "source": "ctx._source.tags = params.tags;ctx._source.custom_tags = params.custom_tags;",
                  "lang": "painless",
                  "params": {
                    "tags": dataForEs,
                    "custom_tags": customTags
                  }
                }
              }
        }
        
          let esResponse=await elasticSearch.updateByQuery(data.index.toString(),body)
          if(!esResponse.error){
            callback({error:false,result:'Updated in ES Successfully'})
          }
          else{
            callback(esResponse)
          }

    }catch(err){
        logger.error('utils/utilsAfterApproval.js/storeTagsInEs','catch',err);
        callback({error:true,result:err}) ;
    }
}

async function updateContentFile(data,callback){
    try{
        let query='UPDATE contentfile SET approvalStatus = ? WHERE fileID = ?';
        let dataArray=[data.approvalStatus,data.fileID];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsAfterApproval.js/updateContentFile ','catch',err);
        callback({error:true,result:err}) ;
    } 
}
//approvalStatus,userType,approverID,adminApproverID,fileID,fileName,authorID
async function sendNotification(data,callback){
    try{
        let userID=(data.userType==='A'?data.approverID:data.adminApproverID);
        let query='DELETE FROM notification where fileID=? AND userID=?';
        let dataArray=[data.fileID,userID];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            if(!result.error){
                logger.info('utils/utilsAfterApproval.js/sendNotification ','Successfully deleted from notification',);
            }else{
                logger.error('utils/utilsAfterApproval.js/sendNotification ','Error occurred while deleting from notification',result.result);
            }
            let valueNoti=[];
                if(data.approvalStatus==='P'){
                    valueNoti.push([data.adminApproverID,'A',new Date().toISOString().slice(0,10),data.fileID,'N',data.fileName,data.authorID,null]);
                    valueNoti.push([data.authorID,'B',new Date().toISOString().slice(0,10),data.fileID,'N',data.fileName,data.authorID,null]);
                }
                else if(data.approvalStatus==='Y'){
                    if(data.userType=='A'){
                        valueNoti.push([data.authorID,'C',new Date().toISOString().slice(0,10),data.fileID,'N',data.fileName,data.authorID,null]);
                    }
                    else if(data.userType=='C'){
                        valueNoti.push([data.authorID,'D',new Date().toISOString().slice(0,10),data.fileID,'N',data.fileName,data.authorID,null]);
                    }
                }
                let query1='INSERT INTO notification VALUES ?';
                    let dataArray1=[valueNoti]
                    mysql.querySQL({query:query1,dataArray:dataArray1 }, async result1 => {
                        io.getio();
                        if(!result1.error){
                            callback({error:false});
                        }
                        else{
                            callback(result1);
                        }
                    })
        })
    }catch(err){
        logger.error('utils/utilsAfterApproval.js/sendNotification ','catch',err);
        callback({error:true,result:err}) ;
    } 
}

module.exports={
    setDeletedInFileClass,
    storeCustomTagsInTaxonomy,
    storeTagsInFileClass,
    storeTagsInEs,
    updateContentFile,
    sendNotification
}