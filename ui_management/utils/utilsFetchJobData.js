const logger = require('../lib/log');
const mysql = require('../services/mysql');

async function fetchJobs(data,callback){
    try{
        let query='select * from jobs where authorID = ?';
        let dataArray=[data.userID];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            if(result.error){
                logger.error('utils/utilsFetchJobData.js/fetchJobs','querySQL',result.result);
            }
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsFetchJobData.js/fetchJobs','catch',err);
        callback({error:true,result:err}) ;
    } 
}
async function fetchFilesForJobs(data,callback){
    try{
        let jobIds='(';
        for(let i=0;i<data.jobs.length;i++){
            if(i+1==(data.jobs.length)){
                jobIds+=data.jobs[i]['jobID']
            }else{
                jobIds+=data.jobs[i]['jobID']+','
            }
        }
        jobIds+=')';
        let query='select * from contentfile where jobID in '+jobIds;
        let dataArray=[];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            if(result.error){
                logger.error('utils/utilsFetchJobData.js/fetchFilesForJobs','querySQL',result.result);
            }
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsFetchJobData.js/fetchFilesForJobs','catch',err);
        callback({error:true,result:err}) ;
    } 
}
module.exports={
    fetchJobs,
    fetchFilesForJobs
}