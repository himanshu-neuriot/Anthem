const logger = require('../lib/log');
const mysql = require('../services/mysql');

async function fetchAllModels(data,callback){
    try{
        let query='select * from trainingdata where groupID = ? and deleted = ? and modelName is not null';
        let dataArray=[data.groupID,'N'];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsTrainModel.js/fetchAllModels','catch',err);
        callback({error:true,result:err}) ;
    } 
}
async function updatePreviouslyDefaultModel(data,callback){
    try{
        if(data.setAsDefault=='Y'){
        let query='update trainingdata set defaultModel = ? where groupID =? and deleted =?';
        let dataArray=['N',data.groupID,'N'];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            callback(result)
        })
        }else{
            callback({error:false,result:'No need to update default model.'})
        }
    }catch(err){
        logger.error('utils/utilsTrainModel.js/updatePreviouslyDefaultModel','catch',err);
        callback({error:true,result:err}) ;
    } 
}
async function updateNewDefaultModel(data,callback){
    try{
        let query='update trainingdata set defaultModel = ? where groupID =? and deleted =? and modelID =?';
        let dataArray=['Y',data.groupID,'N',data.modelID];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsTrainModel.js/updatePreviouslyDefaultModel','catch',err);
        callback({error:true,result:err}) ;
    } 
}
async function deleteModel(data,callback){
    try{
        let query='update trainingdata set deleted = ? ,defaultModel=? where groupID =? and modelID =?';
        let dataArray=['Y','N',data.groupID,data.modelID];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsTrainModel.js/deleteModel','catch',err);
        callback({error:true,result:err}) ;
    } 
}



module.exports={
    fetchAllModels,
    updatePreviouslyDefaultModel,
    updateNewDefaultModel,
    deleteModel
}