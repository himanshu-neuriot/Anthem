const express = require('express')
const app = express();
//const http = require('http');
//const server = http.Server(app);
//const io = require('../index');
const logger = require('../lib/log');
const mysql = require('../services/mysql');
const mail = require('../utils/utilsCommon');

async function userFetch(data, callback){
    try {
        let query1='select * from companyuser where userID = ? AND deleted =?';
        let userID=data.userID;
        let deleted='N';
        mysql.querySQL({query:query1,dataArray:[userID,deleted]},async result => {
            if(result.error){
                result = {status:400, send:{status:false,res:{message:"Some Error Occurred."}}}
                callback({error:false,result:result});
            }else{
                if(result.result.length != 0){
                    result = {status:200,send:{status:false,res:{message:"User already exists with the same Email ID"}}};
                    callback({error:false,result:result});
                }else{
                    let query='select * from companyuser where groupID = ? AND userType =? AND deleted =?';
                    let groupID=data.groupID;
                    let userType='A';
                    let deleted='N'
                    mysql.querySQL({query:query,dataArray:[groupID,userType,deleted]},async result => {
                        if(result.error){
                            result = {status:400, send:{status:false,res:{message:"Error while checking if the group has admin or not"}}}
                            callback({error:false,result:result});
                        }else{
                            if(result.result.length == 0){
                                if(data.userType === 'M' || data.userType === 'S'){
                                    result = {status:200,send:{status:false,res:{message:"Admin should be added first"}}};
                                    callback({error:false,result:result});
                                }else if(data.userType === 'A'){
                                    userAdd(data.valuesAddUser, async resultUserInsert => {
                                        if(resultUserInsert.error){
                                            callback({error:true,result:resultUserInsert.result})
                                        }else{
                                            if(resultUserInsert.result.send.status){
                                                if(resultUserInsert.result.send.res.duplicateUserId){
                                                    callback({error:false,result:{status:200,send:{"status":false,"res":resultUserInsert.result.send.res}}})
                                                }else{
                                                    let user = {email:data.userID,name:data.userFname}
                                                    mail.sendmail(user, async resultSendMail => {
                                                        if(resultSendMail.result.send.status){
                                                            updateAdminInCompanyGroup({userID:data.userID,groupID:data.groupID},async resultUpdateAdminInCompanyGroup=>{
                                                                if(!resultUpdateAdminInCompanyGroup.error){
                                                                    callback({error:false,result:{status:200,send:{"status":true,"res":{message:"User Created Successfully."}}}})
                                                                }else{
                                                                    console.log("resultUpdateAdminInCompanyGroup %j",resultUpdateAdminInCompanyGroup.result)
                                                                    callback({error:false,result:{status:400,send:{"status":false,"res":{"message":"Some Error Occurred"}}}})
                                                                }
                                                            })
                                                        }else{
                                                            callback({error:false,result:{status:400,send:{"status":false,"res":{"message":resultSendMail.result.send.res}}}})
                                                        }
                                                    });
                                                }
                                                
                                            }else{
                                                callback({error:false,result:{status:400,send:{"status":false,"res":resultUserInsert.result.send.res}}})
                                            }
                                        }
                                        
                                    });
                                }
                            }else{
                                if(data.userType=='A'){
                                    result = {status:200,send:{status:false,res:{message:"This group already has admin"}}};
                                    callback({error:false,result:result})
                                  }
                                  else if(data.userType=='M' || data.userType === 'S'){
                                        userAdd(data.valuesAddUser, async resultUserInsert => {
                                            if(resultUserInsert.error){
                                                callback({error:true,result:resultUserInsert.result})
                                            }else{
                                                if(resultUserInsert.result.send.status){
                                                    if(resultUserInsert.result.send.res.duplicateUserId){
                                                        callback({error:false,result:{status:200,send:{"status":false,"res":resultUserInsert.result.send.res}}})
                                                    }else{
                                                        //callback({error:false,result:{status:200,send:{"status":true,"res":{message:"User created successfully"}}}})
                                                        let user = {email:data.userID,name:data.userFname}
                                                        mail.sendmail(user, async resultSendMail => {
                                                            console.log("resultSendMail %j",resultSendMail);
                                                            if(resultSendMail.result.send.status){
                                                                callback({error:false,result:{status:200,send:{"status":true,"res":{message:"User created successfully"}}}})
                                                            }else{
                                                                callback({error:false,result:{status:400,send:{"status":false,"res":{"message":resultSendMail.result.send}}}})
                                                            }
                                                        });
                                                    }
                                                    
                                                }else{
                                                    callback({error:false,result:{status:400,send:{"status":false,"res":resultUserInsert.result.send.res}}})
                                                }
                                            }
                                            
                                        }); 
                                    }
                            }
                        }
                        
                    });
                }

            }
        })
        
    } catch (error) {
        logger.error('utils/utilsUser.js/userAdd','catch',error);
        callback({error:true,result:error}) ;
    }
}

async function addUserCheckIfAdminExists(data,callback){
    if(data.userType=='A'){
        callback({error:false,result:'This functionality is not required here'})
    }else{
        let query='select * from companyuser where groupID = ? AND userType =? AND deleted =?';
        let dataArray=[data.groupID,'A','N']
        mysql.querySQL({query:query,dataArray:dataArray},async result => {
            if(!result.error){
                if(result.result.length==0){
                    result={error:false,result:'length 0'};
                }
            }
            callback(result)
        })
    }
    
}
async function updateAdminInCompanyGroup(data,callback){
    try {
        let query='UPDATE companygroup SET groupAdmin=? WHERE groupID = ?';
        let dataArray=[data.userID,data.groupID]
        mysql.querySQL({query:query,dataArray:dataArray},async result => {
            callback(result);
        });
    } catch (error) {
        logger.error('utils/utilsUser.js/userUpdate','catch',error);
        callback({error:true,result:error}) ;
    }
}
async function userAdd(data,callback){
    let query='INSERT INTO companyuser VALUES ?';
    mysql.querySQL({query:query,dataArray:[data]},async result => {
        if(result.error){
           if(result.error.errno==1062){
                result = {status:200,send:{status:true,"res":{duplicateUserId:true,message:"UserId already present"}}};
           }else{
                result = {status:200,send:{status:false,"res":{message:"Some error occured while adding user"}}};
           }
        }else{
            result = {status:200,send:{status:true,"res":{duplicateUserId:false,message:"User Created successfully}"}}};
        }
        callback({error:false,result:result})
    });
}

async function userUpdate(data,callback){
    try {
        let userTitle="'"+data.userTitle+"'";
        let userFname="'"+data.userFname+"'";
        let userMname=data.userMname?"'"+data.userMname+"'":null;
        let userLname=data.userLname?"'"+data.userLname+"'":null;
        let userSuffix=data.userSuffix?"'"+data.userSuffix+"'":null;
        let userID="'"+data.userID+"'"
        let query='UPDATE companyuser SET userTitle='+userTitle+',userFname='+userFname+',userMname='+userMname+',userLname='+userLname+',userSuffix='+userSuffix+ ' WHERE userID='+userID;
        console.log(query);
        mysql.querySQL({query:query,dataArray:null},async result => {
            if(result.error){
               result =  {status:400,send:{"status":false,"res":"Error occured while updating user"}};
            }else{
                result = {status:200,send:{"status":true,"res":"User details updated successfully"}};
            }
            callback({error:false,result:result});
        });
    } catch (error) {
        logger.error('utils/utilsUser.js/userUpdate','catch',error);
        callback({error:true,result:error}) ;
    }
}


async function userFetchAllInGroup(data, callback){
    try {
        var query='select * from companyuser where groupID = ? and deleted = ?';
        groupID=data.groupID;
        let deleted='N';
        mysql.querySQL({query:query,dataArray:[groupID,deleted]},async result => {
            if(result.error){
                var res = {};
                if(result.error.errno == 1048){
                    res = {message:"UI not sending all the fields"}
                }else if(result.error.errno == 1136){
                    res = {message:"column missing while storing to db"}
                }else{
                    res = {message:"error occured while fetching data from db"}
                }
                result = {status:400,send:{status:false,res:res}}    
            }else{
                result = {status:200,send:{status:true,res:result.result}}
            }
            callback({error:false,result:result})
        });

    } catch (error) {
        logger.error('utils/utilsUser.js/userFetchAllInGroup','catch',error);
        callback({error:true,result:error}) ;
    }
}

async function userDeleteAll(data,callback){
    try {
        var groupID = data.groupID;
        let deleted='Y'
        let query='update companyuser set deleted = ? where groupID =?';
        mysql.querySQL({query:query,dataArray:[deleted,groupID]}, async result => {
            if(result.error){
                result = {status:400, send:{status:false,res:"Error occured during deleting companyuser"}};
                callback({error:false,result:result});
            }else{
                userDeleteAllContentFile({groupID:groupID}, async resultUserDeleteAllContentFile => {
                    if(resultUserDeleteAllContentFile.error){
                        result = resultUserDeleteAllContentFile.result;
                        callback({error:false, result:result});
                    }else{
                        userDeleteAllFileClass({groupID:groupID}, async resultUserDeleteAllFileClass => {
                            if(resultUserDeleteAllFileClass.error){
                                result = resultUserDeleteAllFileClass.result;
                                callback({error:false, result:result});
                            }else{
                                userFetchAllAllUsers({groupID:groupID}, async resultUserFetchAllAllUsers => {
                                    if(resultUserFetchAllAllUsers.error){
                                        result = resultUserFetchAllAllUsers.result;
                                        callback({error: false, result:result});
                                    }else{
                                        if(resultUserFetchAllAllUsers.result.length == 0){
                                            result = {status:200, send:{status:true, res:"Success"}}
                                            callback({error:false,result:result});
                                        }else{
                                            
                                            let notiTableValues = [];
                                           let thisdate=new Date().toISOString().slice(0,10); 
                                            for(let v of resultUserFetchAllAllUsers.result){
                                                notiTableValues.push([v.userID,'D',thisdate,null,null,null,null,null]);
                                            }
                                            userAddAllNotification(notiTableValues, async resultUserAddAllNotification => {
                                                if(resultUserAddAllNotification.error){
                                                    result = resultUserAddAllNotification.result;
                                                }else{
                                                    result = resultUserAddAllNotification.result;
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
        logger.error('utils/utilsUser.js/userDeleteAll','catch',error);
        callback({error:true,result:error});
    }
}

async function userDeleteAllContentFile(data, callback){
    try {
        let deleted='Y'
        let groupID = data.groupID;
        let query='update contentfile set deleted =? where authorID in (select userID from companyuser where groupID =?)';
        mysql.querySQL({query:query,dataArray:[deleted,groupID]}, async result => {
            if(result.error){
                result = {status:400, send:{status:false,res:"Error occured while userDeleteAllContentFile"}}
            }else{

            }
            callback({error:false,result:result});
        });
    } catch (error) {
        logger.error('utils/utilsUser.js/userDeleteAllContentFile','catch',error);
        callback({error:true,result:error});
    }
}
async function userDeleteAllFileClass(data, callback){
    try {
        let deleted='Y'
        let groupID = data.groupID;
        let query='update fileclass set deleted =? where fileID in (select fileID from contentfile where authorID in (select userID from companyuser where groupID =?))';
        mysql.querySQL({query:query,dataArray:[deleted,groupID]}, async result => {
            if(result.error){
                result = {status:400, send:{status:false,res:"Error occured while userDeleteAllFileClass"}}
            }else{

            }
            callback({error:false, result:result})
        });
    } catch (error) {
        logger.error('utils/utilsUser.js/userDeleteAllFileClass','catch',error);
        callback({error:true,result:error});
    }
}
async function userFetchAllAllUsers(data, callback){
    try {
        let groupID = data.groupID;
        let query='select * from companyuser where groupID =?';
        mysql.querySQL({query:query,dataArray:[groupID]}, async result => {
            if(result.error){
                result = {status:400, send:{status: false,res:"Error occured while userFetchAllAllUsers"}};
            }else{
                result = result.result;
                
            }
            callback({error:false,result:result});
        });
    } catch (error) {
        logger.error('utils/utilsUser.js/userFetchAllAllUsers','catch',error);
        callback({error:true,result:error});
    }
}

async function userAddAllNotification(data, callback){
    try {
        let query='insert into notification values ?';
        mysql.querySQL({query:query, dataArray:[data]}, async result => {
            if(result.error){
                result = {status:400, send:{status: false, res:"Error occured while userAddAllNotification"}}
            }else{
		    io;
		   // io.on('connection',function(socket){
		   // socket.on('userDeleted',function(data){
		  //  	io.sockets.emit('userDeleted',{
		//		type:data.type,
		//	});
		   // });
		  //  });
               // io.emit('userDeleted', {
                 //   type:'delete'
                 // });
                  result = {status:200, send:{status:true, res:"Success"}};
            }
            callback({error:false,result:result});
        });

    } catch (error) {
        logger.error('utils/utilsUser.js/userAddAllNotification','catch',error);
        callback({error:true,result:error});
    }
}



async function userDeleteMember(data,callback){
    try {
        userDeleteMemberUtil({userID:data.userID},async resultUserDeleteMemberUtil => {
            if(resultUserDeleteMemberUtil.error){
                callback({error:true,result:resultUserDeleteMemberUtil.result})
            }else{
                userDeleteFromContentFileUtil({userID:data.userID},async resultUserDeleteFromContentFileUtil => {
                    if(resultUserDeleteFromContentFileUtil.error){
                        callback({error:true, result:resultUserDeleteFromContentFileUtil.result})
                    }else{
                        userDeleteFromFileClassUtil({userID:data.userID}, async resultUserDeleteFromFileClassUtil => {
                            if(resultUserDeleteFromFileClassUtil.error){
                                callback({error:true, result:resultUserDeleteFromFileClassUtil.result});
                            }else{
                                userAddNotifications({userID:data.userID}, async resultUserAddNotifications => {
                                    if(resultUserAddNotifications.error){
                                        callback({error:true, result:resultUserAddNotifications.result})
                                    }else{
                                        callback({error:false, result:resultUserAddNotifications.result})
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    } catch (error) {
        logger.error('utils/utilsUser.js/userDeleteMember','catch',error);
        callback({error:true,result:error}) ;
    }
}
async function userDeleteMemberUtil(data,callback){
    try{
        let deleted='Y';
        let query='update companyuser set deleted =? where userID =?';
        mysql.querySQL({query:query,dataArray:[deleted,data.userID]},async result => {
            if(result.error){
                callback({error:true, result:{status:400,send:{status:false,res:'Error occured while deleting companyuser!'}}})
            }else{
                callback({error:false, result:{status:200,send:{status:true,res:'Successfully deleted User'}}})
            }
        });
    }catch(error){
        logger.error('utils/utilsUser.js/userDeleteMemberUtil','catch',error);
        callback({error:true,result:error}) ;
    }
    
}
async function userDeleteFromContentFileUtil(data,callback){
    try {
        let deleted = 'Y';
        let query='update contentfile set deleted =? where authorID =?';
        mysql.querySQL({query:query,dataArray:[deleted,data.userID]},async result => {
            if(result.error){
                callback({error:true, result:{status:400, send:{status:false,res:'Error occured while deleting contentfile!'}}})
            }else{
                callback({error:false, result:{status:200, send:{status:true, res:'Successfully deleted contentfile'}}})
            }
        });
    } catch (error) {
        logger.error('utils/utilsUser.js/userDeleteFromContentFileUtil','catch',error);
        callback({error:true,result:error}) ;
    }
}
async function userDeleteFromFileClassUtil(data,callback){
    try {
        let deleted = 'Y';
        let query='update fileclass set deleted =? where fileID in (select fileID from contentfile where authorID =?)';
        mysql.querySQL({query:query, dataArray:[deleted,data.userID]},async result => {
            if(result.error){
                callback({error:true,result:{status:400, send:{status:false,res:'Error occurred while deleting fileclass!'}}})
            }else{
                callback({error:false,result:{status:200, send:{status:true,res:'Successfully deleted FileClass'}}})
            }
        });
    } catch (error) {
        logger.error('utils/utilsUser.js/userDeleteFromFileClassUtil','catch',error);
        callback({error:true,result:error}) ;
    }
}
async function userAddNotifications(data,callback){
    try {
        let NotiTableValues=[];
	    let todate=new Date().toISOString().slice(0,10);;
        // NotiTableValues.push([userID,'D',null,null,null,null,null,null]);
        NotiTableValues.push([data.userID,'D',todate,null,null,null,null]);
        let query='insert into notification values ?';
        mysql.querySQL({query:query,dataArray:[NotiTableValues]}, async result => {
            if(result.error){
                callback({error:true,result:{status:400, send:{status:false, res:'Error occured while adding values in Notification table'}}})
            }else{
		    io;
		    //io.on('connection',function(socket){
		   // socket.on('userDeleted',function(data){
		  //  io.sockets.emit('userDeleted',{
		//	    type:data.type,
		   // })
		   // })
		   // });
                //io.emit('userDeleted', {
                   // type:'delete'
                 // });
                  callback({error:false, result:{status:200, send:{status:true, res:'Success'}}})
            }
        });
    } catch (error) {
        logger.error('utils/utilsUser.js/userAddNotifications','catch',error);
        callback({error:true,result:error}) ;
    }
}
async function fetchUserFromToken(data,callback){
    try{
        let query='select * from companyuser where token = ? and deleted = ?';
        let dataArray=[data.token,'N'];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            if(!result.error){
                if(result.result.length==0){
                    result={error:false,result:'length 0'};
                }
            }
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsUser.js/fetchUserFromToken','catch',err);
        callback({error:true,result:err}) ;
    } 
}
async function setPassword(data,callback){
    try{
        let query='UPDATE companyuser SET password=? ,verified=?, token=?, tokenExpiry=? WHERE userID=?';
        let dataArray=[data.password,'Y',null,null,data.userID];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsUser.js/setPassword','catch',err);
        callback({error:true,result:err}) ;
    } 
}
async function fetchUserForForgetPassword(data,callback){
    try{
        let query='select * from companyuser where userID = ? and deleted = ?';
        let dataArray=[data.userID,'N'];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            if(!result.error){
                if(result.result.length==0){
                    result={error:false,result:'length 0'};
                }
            }
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsUser.js/fetchUserForForgetPassword','catch',err);
        callback({error:true,result:err}) ;
    } 
}
async function updateTokenForgetPassword(data,callback){
    try{
        let query='update companyuser set token = ? , tokenExpiry= ? where userID= ?';
        let dataArray=[data.token,data.tokenExpiry,data.userID];
        mysql.querySQL({query:query,dataArray:dataArray }, async result => {
            callback(result)
        })
    }catch(err){
        logger.error('utils/utilsUser.js/updateTokenForgetPassword','catch',err);
        callback({error:true,result:err}) ;
    } 
}


module.exports={
    fetchUserFromToken,
    setPassword,
    userFetch,
    userUpdate,
    userFetchAllInGroup,
    userDeleteAll,
    userDeleteMember,
    fetchUserForForgetPassword,
    updateTokenForgetPassword
}

