const express = require('express')
const app = express();
const http = require('http');
const server = http.Server(app);
//const {io} = require('../index');
const logger = require('../lib/log');
const mysql = require('../services/mysql');
const config = require('config');

const { Client } = require('@elastic/elasticsearch')
const elasticSearch = new Client({ node: `${config.elastic_search.uri}:${config.elastic_search.port}`, requestTimeout: 600000 });
const fs = require('fs')
const path = require('path')

async function groupAddData(data, callback){
    try {
        //console.log('inside groupAddData()')
        let query='INSERT INTO companygroup VALUES ?';
        let dataArray = [];
        dataArray.push(
            [null,data.customerID,data.groupName,'N','N',null,0,'anthem_1_publish','anthem_1_notPublish','anthem_1_Questions']);
        mysql.querySQL({query:query,dataArray:[dataArray]},async result => {
            if(!result.error){
                
                //result = {error:false,result:result.result.insertId};
                
                var data1 = {};
                data1 = {insertId:result.result.insertId};
                let esIndexPublish = data.groupName.toLowerCase()+'_'+result.result.insertId+'_'+'publish';
                let esIndexNotPublish = data.groupName.toLowerCase()+'_'+result.result.insertId+'_'+'notpublish';
                let esIndexQuestions = data.groupName.toLowerCase()+'_'+result.result.insertId+'_'+'questions';
                let updateQuery = 'Update companygroup SET esIndexPublish = ?, esIndexNotPublish = ?, esIndexQuestions = ? WHERE groupID = ?';
                create_esIndex({index:esIndexPublish});
                create_esIndex({index:esIndexNotPublish});
                create_esIndexQ({index:esIndexQuestions});
                createDirectory({groupID:result.result.insertId})
                mysql.querySQL({query:updateQuery,dataArray:[esIndexPublish,esIndexNotPublish,esIndexQuestions,result.result.insertId]},async resultUpdate => {
                    if(!result.error){
                        //console.log('inside mysql() result')
                        groupAddTaxonomy(data1, async resultGroupAddTaxonomy => {
                            result = {error:false,result:resultGroupAddTaxonomy.result}
                            callback(result)
                        });
                    }else{
                        callback({error:true,result:{status:400,send:{"status":false,"res":"Some error occurred."}}})
                    }
                }) 
            
            }else{
                result = {error:true, result:result}
                callback(result)
            }
            //callback(result)
        }); 
    } catch (error) {
        logger.error('utils/utilsGroup.js/groupAddData','catch',error);
        callback({error:true,result:error}) ;
    }
}

async function groupAddTaxonomy(data, callback){
    try {
        //console.log('inside groupAddTaxonomy()')
        let query='INSERT INTO taxonomy VALUES ?';
        let dataArray =[];
        dataArray.push([null,'#Custom',data.insertId,null,'N']);
        mysql.querySQL({query:query,dataArray:[dataArray]},async result => {
            if(result.error){
                result = {status:400,send:{"status":false,"res":"Error occured while creating group"}};
            }else{
                result = {status:200,send:{"status":true,"res":'Group Created Successfully'}}
            }
            //console.log('inside groupAddTaxonomy().mysql().result()')
            callback({error:false,result:result})
        });
    } catch (error) {
        logger.error('utils/utilsGroup.js/groupAddTaxonomy','catch',error);
        callback({error:true,result:error}) ;
    }
}

 async function groupRenameData(data,callback){
    try {
        let query='UPDATE companygroup SET groupName='+data.groupName+ ' WHERE groupID='+data.groupID;
        mysql.querySQL({query:query,dataArray:null},async result => {
            if(result.error){
                result = {status:400,send:{"status":false,"res":"Error occured while renaming group"}};
            }else{
                result = {status:200,send:{"status":true,"res":"Group renamed successfully"}};
            }
            callback({error:false,result:result})
        });
    } catch (error) {
        logger.error('utils/utilsGroup.js/groupRenameData','catch',error);
        callback({error:true,result:error});
    }
}

 async function groupFetchAll(data, callback){
    try {
        var query='select * from customer where adminEmail = ?';
        var adminEmail=data.userID;
        mysql.querySQL({query:query,dataArray:[adminEmail]}, async result =>{
            if(result.error){
                result = {status:400,send:{status:false,res:{message:"Some error occured."}}}
                callback({error:true,result:result})
            }else{
                var customerID = result.result[0].customerID;
                var deleted = 'N';
                var data ={customerID:customerID,deleted:deleted};
                groupFetchAllCompanyGroup(data, async resultGroupFetchAllCompanyGroup => {
                    if(resultGroupFetchAllCompanyGroup.error){
                        result = {error:true,result:resultGroupFetchAllCompanyGroup.result};
                        
                    }else{
                        result = {error:false,result:resultGroupFetchAllCompanyGroup.result};
                    }
                    //result = resultGroupFetchAllCompanyGroup.result;
                    callback(result)
                });
            }
            
        });
    } catch (error) {
        logger.error('utils/utilsGroup.js/groupFetchAll','catch',error);
        callback({error:true,result:error});
    }
}

async function groupFetchAllCompanyGroup(data, callback){
    try {
        var query='select * from companygroup where customerID = ? and deleted = ?';
        mysql.querySQL({query:query,dataArray:[data.customerID,data.deleted]},async result => {
            if(result.error){
                result = {status:400,send:{status:false,res:{message:"Some error occured."}}};
            }else{
                result = {status:200,send:{status:true,res:{groups:result,customerID:data.customerID}}};
            }
            callback({error:false,result:result});
        });
    } catch (error) {
        logger.error('utils/utilsGroup.js/groupFetchAllCompanyGroup','catch',error);
        callback({error:true,result:error});
    }
}

 async function groupFetchParticular(data, callback){
    try {
        var query='select * from companygroup where groupID = ? and deleted = ?';
        var groupID = data.groupID;
        let deleted='N';
        mysql.querySQL({query:query,dataArray:[groupID,deleted]},async result => {
            if(result.error){
                result = {status:400,send:{status:false,res:{message:"Some error occured."}}};
            }else{
                result = {status:200,send:{status:true,res:result}}
            }
            callback({error:false,result:result});
        });
    } catch (error) {
        logger.error('utils/utilsGroup.js/groupFetchParticular','catch',error);
        callback({error:true,result:error});
    }
}

 async function groupDelete(data, callback){
    try {
        let deleted = 'Y';
        let groupID = data.groupID
        let query = 'update companygroup set deleted = ? where groupID =? ';
        mysql.querySQL({query:query,dataArray:[deleted,groupID]}, async result => {
            if(result.error){
                result = {status:400,send:{status:false,res:"Error occured while deleting group"}};
                callback({error:false,result:result});
            }else{
                
                groupDeleteAllUsers({groupID:groupID}, async resultGroupDeleteAllUsers => {
                    if(resultGroupDeleteAllUsers.error){
                        result = resultGroupDeleteAllUsers.result; 
                        callback({error:false, result:result});  
                    }else{
                        //result = resultGroupDeleteAllUsers.result;
                        groupDeleteTaxonomy({groupID:groupID}, async resultGroupDeleteTaxonomy => {
                            if(resultGroupDeleteTaxonomy.error){
                                result = resultGroupDeleteTaxonomy.result;
                            }else{
                                result = resultGroupDeleteTaxonomy.result;
                            }
                            callback({error:false, result:result});
                        });
                    }
                    
                });
            }
            
        });
    } catch (error) {
        logger.error('utils/utilsGroup.js/groupDelete','catch',error);
        callback({error:true,result:error});
    }
}

async function groupDeleteAllUsers(data, callback){
    try {
        var groupID = data.groupID;
        let deleted='Y'
        let query='update companyuser set deleted = ? where groupID =?';
        mysql.querySQL({query:query,dataArray:[deleted,groupID]}, async result => {
            if(result.error){
                result = {status:400, send:{status:false,res:"Error occured during deleting companyuser"}};
                callback({error:false,result:result});
            }else{
                groupDeleteContentFile({groupID:groupID}, async resultGroupDeleteContentFile => {
                    if(resultGroupDeleteContentFile.error){
                        result = resultGroupDeleteContentFile.result;
                        callback({error:false, result:result});
                    }else{
                        groupDeleteFileClass({groupID:groupID}, async resultGroupDeleteFileClass => {
                            if(resultGroupDeleteFileClass.error){
                                result = resultGroupDeleteFileClass.result;
                                callback({error:false, result:result});
                            }else{
                                groupFetchAllUsers({groupID:groupID}, async resultGroupFetchAllUsers => {
                                    if(resultGroupFetchAllUsers.error){
                                        result = resultGroupFetchAllUsers.result;
                                        callback({error: false, result:result});
                                    }else{
                                        if(resultGroupFetchAllUsers.result.length == 0){
                                            result = {status:200, send:{status:true, res:"Success"}}
                                            callback({error:false,result:result});
                                        }else{
                                            
                                            let notiTableValues = [];
                                            
                                            for(let v of resultGroupFetchAllUsers.result){
                                                notiTableValues.push([v.userID,'D',null,null,null,null]);
                                            }
                                            groupAddNotification(notiTableValues, async resultGroupAddNotification => {
                                                if(resultGroupAddNotification.error){
                                                    result = resultGroupAddNotification.result;
                                                }else{
                                                    result = resultGroupAddNotification.result;
                                                }
                                                callback({error: false, result:result})
                                            });
                                        }
                                    }
                                    
                                });
                            }
                            
                        });
                    }
                    
                });
            }
            
        });
    } catch (error) {
        logger.error('utils/utilsGroup.js/groupDeleteAllUsers','catch',error);
        callback({error:true,result:error});
    }
}
async function groupDeleteContentFile(data, callback){
    try {
        let deleted='Y'
        let groupID = data.groupID;
        let query='update contentfile set deleted =? where authorID in (select userID from companyuser where groupID =?)';
        mysql.querySQL({query:query,dataArray:[deleted,groupID]}, async result => {
            if(result.error){
                result = {status:400, send:{status:false,res:"Error occured while groupDeleteContentFile"}}
            }else{

            }
            callback({error:false,result:result});
        });
    } catch (error) {
        logger.error('utils/utilsGroup.js/groupDeleteContentFile','catch',error);
        callback({error:true,result:error});
    }
}
async function groupDeleteFileClass(data, callback){
    try {
        let deleted='Y'
        let groupID = data.groupID;
        let query='update fileclass set deleted =? where fileID in (select fileID from contentfile where authorID in (select userID from companyuser where groupID =?))';
        mysql.querySQL({query:query,dataArray:[deleted,groupID]}, async result => {
            if(result.error){
                result = {status:400, send:{status:false,res:"Error occured while groupDeleteFileClass"}}
            }else{

            }
            callback({error:false, result:result})
        });
    } catch (error) {
        logger.error('utils/utilsGroup.js/groupDeleteFileClass','catch',error);
        callback({error:true,result:error});
    }
}
async function groupFetchAllUsers(data, callback){
    try {
        let groupID = data.groupID;
        let query='select * from companyuser where groupID =?';
        mysql.querySQL({query:query,dataArray:[groupID]}, async result => {
            if(result.error){
                result = {status:400, send:{status: false,res:"Error occured while groupFetchAllUsers"}};
            }else{
                result = result.result;
                
            }
            callback({error:false,result:result});
        });
    } catch (error) {
        logger.error('utils/utilsGroup.js/groupFetchAllUsers','catch',error);
        callback({error:true,result:error});
    }
}

async function groupAddNotification(data, callback){
    try {
        let query='insert into notification values ?';
        mysql.querySQL({query:query, dataArray:[data]}, async result => {
            if(result.error){
                result = {status:400, send:{status: false, res:"Error occured while groupAddNotification"}}
            }else{
                //io.sockets.emit('userDeleted', {
                 //   type:'delete'
                 // });
                  result = {status:200, send:{status:true, res:"Success"}};
            }
            callback({error:false,result:result});
        });

    } catch (error) {
        logger.error('utils/utilsGroup.js/groupAddNotification','catch',error);
        callback({error:true,result:error});
    }
}

async function groupDeleteTaxonomy(data, callback){
    try {
        let deleted='Y'
        let query='update taxonomy set deleted = ? where groupID =?';
        mysql.querySQL({query:query,dataArray:[deleted,data.groupID]}, async result => {
            if(result.error){
                result = {status:400,send:{status:false, res:"Error occured while groupDeleteTaxonomy"}};
                callback({error:false, result:result});
            }else{
                groupDeleteFileClassTaxonomy({groupID:data.groupID}, async resultGroupDeleteFileClassTaxonomy => {
                    callback({error:resultGroupDeleteFileClassTaxonomy.error,result:resultGroupDeleteFileClassTaxonomy.result});
                });
            }
            
        });
    } catch (error) {
        logger.error('utils/utilsGroup.js/groupDeleteTaxonomy','catch',error);
        callback({error:true,result:error});
    }
}

async function groupDeleteFileClassTaxonomy(data, callback){
    try {
        let deleted = 'Y'
        let query='update fileclass set deleted =? where nodeID in (select nodeID from taxonomy where groupID =?)';
        mysql.querySQL({query:query,dataArray:[deleted,data.groupID]}, async result => {
            if(result.error){
                result = {status:400, send:{status:false, res:"Error occured while groupDeleteFileClassTaxonomy"}};
            }else{
                result = {status:200, send:{status:true, res:"Success"}};
            }
            callback({error:false,result:result})
        });
    } catch (error) {
        logger.error('utils/utilsGroup.js/groupDeleteTaxonomy','catch',error);
        callback({error:true,result:error});
    }
}
async function create_esIndexQ(data){
await elasticSearch.indices.create({
	index: data.index,
	body:{}
},{ignore:[400]});
}
async function create_esIndex(data){
    await elasticSearch.indices.create({
        index: data.index,
        body: {
            settings: {
                index: {
                    analysis: {
                        filter: {
                            synonym_filter: {
                                type: "synonym",
                                format: "wordnet",
                                synonyms_path: config["wordnet_synonyms_path"],
                            },
                            english_stop: {"type": "stop", "stopwords": "_english_"},
                            english_keywords: {
                                type: "keyword_marker",
                                keywords: ["studying"],
                            },
                            english_stemmer: {type: "stemmer", language: "english"},
                            english_possessive_stemmer: {
                                type: "stemmer",
                                language: "possessive_english",
                            },
                        },
                        analyzer: {
                            analyzera: {
                                tokenizer: "standard",
                                filter: [
                                    "synonym_filter",
                                    "english_stop",
                                    "english_possessive_stemmer",
                                ],
                            },
                            analyzerb: {
                                tokenizer: "standard",
                                filter: ["english_stop", "english_possessive_stemmer"],
                            },
                        },
                    }
                }
            },
            mappings: {
                properties: {
                    content: {type: "text", analyzer: "analyzerb"},
                    embeddings_model_v1:  {type: "dense_vector", dims: 768},
                    tags: {type: "nested",
                            properties: {
                                Level1_tag: {type: "text"},
                                Level2_tag: {type: "text"},
                                Level3_tag: {type: "text"},
                                Level4_tag: {type: "text"}
                            }},
                    custom_tag: {type: "nested",
                                  properties: {
                                      tag: {type: "text"}
                                  }}
                }
            }
        }
      },function(err, resp, respcode){
      console.log(err,resp,respcode);
      })
}

async function createDirectory(data){
    var groupID = data.groupID+'';
    var dir = path.join(__dirname,'../../docs_models');
    var dir_docs = path.join(dir,'/docs');
    var dir_models = path.join(dir,'/models');
    var dir_tag_predictor = path.join(dir_docs,'/tag_predictor');
    var dir_trainer = path.join(dir_docs,'/trainer');
    var dir_tag_predictor_group = path.join(dir_tag_predictor,'/',groupID);
    var dir_trainer_group = path.join(dir_trainer,'/',groupID);
    var dir_trainer_group_template = path.join(dir_trainer_group,'/template');
    var dir_models_group = path.join(dir_models,'/',groupID);
    if (!fs.existsSync(dir)){
        fs.mkdir(dir,function(){
            if(!fs.existsSync(dir_docs)){
                fs.mkdir(dir_docs,function(){
                    if(!fs.existsSync(dir_tag_predictor)){
                        fs.mkdir(dir_tag_predictor,function(){
                            if(!fs.existsSync(dir_tag_predictor_group)){
                                fs.mkdir(dir_tag_predictor_group,function(){})
                            }else{

                            }
                        });
                    }else{
                        if(!fs.existsSync(dir_tag_predictor_group)){
                            fs.mkdir(dir_tag_predictor_group,function(){})
                        }else{

                        }
                    }
                    if(!fs.existsSync(dir_trainer)){
                        fs.mkdir(dir_trainer,function(){
                            if(!fs.existsSync(dir_trainer_group)){
                                fs.mkdir(dir_trainer_group,function(){
                                    if(!fs.existsSync(dir_trainer_group_template)){
                                        fs.mkdir(dir_trainer_group_template,function(){})
                                    }else{

                                    }
                                });
                            }else{
                                if(!fs.existsSync(dir_trainer_group_template)){
                                    fs.mkdir(dir_trainer_group_template,function(){})
                                }else{

                                }
                            }
                        })
                    }else{
                        if(!fs.existsSync(dir_trainer_group)){
                            fs.mkdir(dir_trainer_group,function(){
                                if(!fs.existsSync(dir_trainer_group_template)){
                                    fs.mkdir(dir_trainer_group_template,function(){})
                                }else{

                                }
                            });
                        }else{
                            if(!fs.existsSync(dir_trainer_group_template)){
                                fs.mkdir(dir_trainer_group_template,function(){})
                            }else{

                            }
                        }
                    }
                });
            }else{
                if(!fs.existsSync(dir_tag_predictor)){
                    fs.mkdir(dir_tag_predictor,function(){
                        if(!fs.existsSync(dir_tag_predictor_group)){
                            fs.mkdir(dir_tag_predictor_group,function(){})
                        }else{

                        }
                    });
                }else{
                    if(!fs.existsSync(dir_tag_predictor_group)){
                        fs.mkdir(dir_tag_predictor_group,function(){})
                    }else{

                    }
                }
                if(!fs.existsSync(dir_trainer)){
                    fs.mkdir(dir_trainer,function(){
                        if(!fs.existsSync(dir_trainer_group)){
                            fs.mkdir(dir_trainer_group,function(){
                                if(!fs.existsSync(dir_trainer_group_template)){
                                    fs.mkdir(dir_trainer_group_template,function(){})
                                }else{

                                }
                            });
                        }else{
                            if(!fs.existsSync(dir_trainer_group_template)){
                                fs.mkdir(dir_trainer_group_template,function(){})
                            }else{

                            }
                        }
                    })
                }else{
                    if(!fs.existsSync(dir_trainer_group)){
                        fs.mkdir(dir_trainer_group,function(){
                            if(!fs.existsSync(dir_trainer_group_template)){
                                fs.mkdir(dir_trainer_group_template,function(){})
                            }else{

                            }
                        });
                    }else{
                        if(!fs.existsSync(dir_trainer_group_template)){
                            fs.mkdir(dir_trainer_group_template,function(){})
                        }else{

                        }
                    }
                }
            }
            if(!fs.existsSync(dir_models)){
                fs.mkdir(dir_models,function(){
                    if(!fs.existsSync(dir_models_group)){
                        fs.mkdir(dir_models_group,function(){})
                    }else{

                    }
                })
            }else{
                if(!fs.existsSync(dir_models_group)){
                    fs.mkdir(dir_models_group,function(){})
                }else{

                }
            }
        });
    }else{
        if(!fs.existsSync(dir_docs)){
            fs.mkdir(dir_docs,function(){
                if(!fs.existsSync(dir_tag_predictor)){
                    fs.mkdir(dir_tag_predictor,function(){
                        if(!fs.existsSync(dir_tag_predictor_group)){
                            fs.mkdir(dir_tag_predictor_group,function(){})
                        }else{

                        }
                    });
                }else{
                    if(!fs.existsSync(dir_tag_predictor_group)){
                        fs.mkdir(dir_tag_predictor_group,function(){})
                    }else{

                    }
                }
                if(!fs.existsSync(dir_trainer)){
                    fs.mkdir(dir_trainer,function(){
                        if(!fs.existsSync(dir_trainer_group)){
                            fs.mkdir(dir_trainer_group,function(){
                                if(!fs.existsSync(dir_trainer_group_template)){
                                    fs.mkdir(dir_trainer_group_template,function(){})
                                }else{

                                }
                            });
                        }else{
                            if(!fs.existsSync(dir_trainer_group_template)){
                                fs.mkdir(dir_trainer_group_template,function(){})
                            }else{

                            }
                        }
                    })
                }else{
                    if(!fs.existsSync(dir_trainer_group)){
                        fs.mkdir(dir_trainer_group,function(){
                            if(!fs.existsSync(dir_trainer_group_template)){
                                fs.mkdir(dir_trainer_group_template,function(){})
                            }else{

                            }
                        });
                    }else{
                        if(!fs.existsSync(dir_trainer_group_template)){
                            fs.mkdir(dir_trainer_group_template,function(){});
                        }else{

                        }
                    }
                }
            });
        }else{
            if(!fs.existsSync(dir_tag_predictor)){
                fs.mkdir(dir_tag_predictor,function(){
                    if(!fs.existsSync(dir_tag_predictor_group)){
                        fs.mkdir(dir_tag_predictor_group,function(){})
                    }else{

                    }
                });
            }else{
                if(!fs.existsSync(dir_tag_predictor_group)){
                    fs.mkdir(dir_tag_predictor_group,function(){});
                }else{

                }
            }
            if(!fs.existsSync(dir_trainer)){
                fs.mkdir(dir_trainer,function(){
                    if(!fs.existsSync(dir_trainer_group)){
                        fs.mkdir(dir_trainer_group,function(){
                            if(!fs.existsSync(dir_trainer_group_template)){
                                fs.mkdir(dir_trainer_group_template,function(){});
                            }else{

                            }
                        });
                    }else{
                        if(!fs.existsSync(dir_trainer_group_template)){
                            fs.mkdir(dir_trainer_group_template,function(){});
                        }else{

                        }
                    }
                })
            }else{
                if(!fs.existsSync(dir_trainer_group)){
                    fs.mkdir(dir_trainer_group,function(){
                        if(!fs.existsSync(dir_trainer_group_template)){
                            fs.mkdir(dir_trainer_group_template,function(){});
                        }else{

                        }
                    });
                }else{
                    if(!fs.existsSync(dir_trainer_group_template)){
                        fs.mkdir(dir_trainer_group_template,function(){});
                    }else{

                    }
                }
            }
        }
        if(!fs.existsSync(dir_models)){
            fs.mkdir(dir_models,function(){
                if(!fs.existsSync(dir_models_group)){
                    fs.mkdir(dir_models_group,function(){})
                }else{

                }
            })
        }else{
            if(!fs.existsSync(dir_models_group)){
                fs.mkdir(dir_models_group,function(){})
            }else{

            }
        }
    }
}

module.exports.groupAddData = groupAddData
module.exports.groupRenameData = groupRenameData
module.exports.groupFetchAll = groupFetchAll
module.exports.groupFetchParticular = groupFetchParticular
module.exports.groupDelete = groupDelete
