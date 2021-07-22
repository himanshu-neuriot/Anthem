const logger = require('../lib/log');
const mysql = require('../services/mysql');
const elasticSearch = require('../services/elastic');
const kafka = require('../services/kafka-js');
const nodemailer = require('nodemailer');
var crypto = require('crypto');
var config=require('config');

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
async function documentManagementDeleteFile(data,callback){
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
async function sendDataInKafkaQueueForNextService(data,callback){
  try{
  kafka.produce(data.kafkaData)
	  callback({error:false})
      
  }catch(err){
      logger.error('utils/utilsCommon.js/sendDataInKafkaQueueForNextService','catch',err);
      callback({error:true,result:err}) ;
  } 
}
async function fetchEsIndex(data, callback) {
  try{
      let query='select * from companygroup where groupID= ?';
      let dataArray=[data.groupID];
      mysql.querySQL({query:query,dataArray:dataArray }, async result => {
          if(!result.error){
              if(result.result.length==0){
                  result={error:false,result:'length 0'};
              }
          }
          callback(result)
      })
  }catch(err){
      logger.error('utils/utilsCommon.js/fetchEsIndex','catch',err);
      callback({error:true,result:err}) ;
  } 
}
async function fetchAllDocuments(data,callback){
  try{
      let query='select * from contentfile where groupID = ? and deleted = ? and publishOrTrainer = ?';
      let dataArray=[data.groupID,'N','P'];
      mysql.querySQL({query:query,dataArray:dataArray }, async result => {
          callback(result)
      })
  }catch(err){
      logger.error('utils/utilsCommon.js/fetchAllDocuments','catch',err);
      callback({error:true,result:err}) ;
  } 
}
async function sendmail(user,callback){
  let transporter=nodemailer.createTransport({
    service: 'Godaddy',
    host: "smtpout.secureserver.net",  
    secureConnection: true,
    port: 465,
    auth:{
        user:'support@findout.ai',
        pass:'Neuriot_123!'
    }
  });
  
  
  crypto.randomBytes(20, function (err, buf) {
    let token = buf.toString('hex');
    var link = config.get('App.verifyPasswordApi')+token;
    let tokenExpiry=Date.now() + 86400 * 1000;
    let mailoptions ={
      from: 'support@findout.ai',
      to : user.email,
      subject:"Welcome to findout",
      html:'Dear '+user.name+',<br><br>Please click <a href="' + link + '"> here </a> to activate your account and then set password for your account.<br><br>Best Regards<br>Findout Support Team'
      
  };
    transporter.sendMail(mailoptions, function(error, info){
      var response;
      if(error) {
        console.log("error in sending mail",error);
        response={"status":false,res:"Email Id is invalid or some error occured"}
        callback(response)
      }
      else{
              storeToken({token:token,email:user.email,tokenExpiry:tokenExpiry},async result => {
                  if(result.error){
                      result = result.result;
                  }else{
                      result = result.result;
                  }
                  callback({error:false,result:result});
              });

          }
      });
  
  })
  
}
async function storeToken(data,callback){
  try{
      let newtoken="'"+data.token+"'";
      let userId="'"+data.email+"'";
      var query='UPDATE companyuser SET token='+newtoken+', tokenExpiry='+data.tokenExpiry+ ' WHERE userID='+userId;
      mysql.querySQL({query:query,dataArray:null},async result => {
          if(result.error){
              result = {status:200,send:{"status":false,res:"Error while storing token to db but mail is sent"}}
          }else{
              result = {status:200,send:{"status":true,res:"Everything is done successfully while sending mail."}};
          }
          callback({error:false,result:result});
       });
  }catch(error){
      logger.error('utils/utilsGroup.js/userAdd','catch',error);
      callback({error:true,result:error}) ;
  }
}
// mail in contact us
async function contactsSendMail(user,callback){
  let transporter=nodemailer.createTransport({
    service: 'Godaddy',
    host: "smtpout.secureserver.net",  
    secureConnection: true,
    port: 465,
    auth:{
        user:'support@findout.ai',
        pass:'Neuriot_123!'
    }
  });
  let mailoptions ={
    from: 'support@findout.ai',
    to : user.email,
    subject:"Welcome to findout",
    html:'Dear '+user.name+',<br><br>We have received your inquiry about '+user.purpose+'. Thank you for contacting us. We will be in touch with you shorty.<br><br>Best Regards<br>Findout Support Team'
  };
  transporter.sendMail(mailoptions, function(error, info){
      var response;
      if(error) {
          console.log("Contact us - error in sending mail",error);
          response={"status":false,res:"Email Id is invalid or some error occured"}
          callback(response)
      }
      else{
          console.log('Contact us - mail sent:', info.response);
          response={"status":true,res:"Mail sent."}
          callback(response);
      }
  })
  
}

module.exports={
    documentManagementDeleteFile,
    sendDataInKafkaQueueForNextService,
    fetchEsIndex,
    fetchAllDocuments
}
module.exports.sendmail = sendmail;
module.exports.contactsSendMail = contactsSendMail;
