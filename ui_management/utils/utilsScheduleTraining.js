const logger = require('../lib/log');
const mysql = require('../services/mysql');

async function fetchScheduleInfoForGroup(data,callback){
    try{
        let query='select * from companygroup where groupID = ? and deleted = ?';
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
        logger.error('utils/utilsScheduleTraining.js/fetchScheduleInfoForGroup','catch',err);
        callback({error:true,result:err}) ;
    } 
}
async function updateScheduledTrainingInTable(data,callback){
    try{
        let query='update companygroup set scheduled =? , scheduleData =? where groupID =?';
        let dataArray=['Y',data.scheduleData,data.groupID];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsScheduleTraining.js/updateScheduledTrainingInTable','catch',err);
        callback({error:true,result:err}) ;
    } 
}
async function fetchScheduleInfoForAllGroup(callback){
    try{
        let query='select * from companygroup where deleted = ? and scheduled = ?';
        let dataArray=['N','Y'];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            if(!result.error){
                if(result.result.length==0){
                    result={error:false,result:'length 0'};
                }
            }
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsScheduleTraining.js/fetchScheduleInfoForGroup','catch',err);
        callback({error:true,result:err}) ;
    } 
}
async function cancelScheduledTraining(data,callback){
    try{
        let query='update companygroup set scheduled =? , scheduleData =? where groupID =?';
        let dataArray=['N',null,data.groupID];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsScheduleTraining.js/cancelScheduledTraining','catch',err);
        callback({error:true,result:err}) ;
    } 
}

async function fetchTaxonomy(data,callback){
    try{
        let query='select * from taxonomy where groupID =? and deleted =? ';
        let dataArray=[data.groupID,'N'];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsScheduleTraining.js/fetchTaxonomy','catch',err);
        callback({error:true,result:err}) ;
    } 
}

module.exports={
    fetchScheduleInfoForGroup,
    updateScheduledTrainingInTable,
    fetchScheduleInfoForAllGroup,
    cancelScheduledTraining,
    fetchTaxonomy
}