const express = require('express')
const logger = require('../lib/log');
const mysql = require('../services/mysql');
const bcrypt = require('bcryptjs');
var jwt = require("jsonwebtoken");
const configData = require ('config');


async function loginUtil(data,callback){
    try {
        let query='select * from companyuser where userID = ?';
        mysql.querySQL({query:query,dataArray:[data.email]},async result => {
            if(result.error){
                callback({error:true, result:{"status":false,"res":"Login error"}})
            }else{
                logger.info("",`this is the results object  '${result}'`);
                if(result.result.length==0){
                    callback({error:false,result:{status:true,valid:false,res:"No user exists for entered username."}})
                }else{
                    if(result.result[0].verified!='Y'){
                        callback({error:false,result:{status:true,valid:false,res:"Verify your email ID and set password."}})
                      }
                      else{
                        if(result.result[0].deleted=='Y'){
                            callback({error:false,result:{status:true,valid:false,res:"User is deleted by admin."}})
                        }
                        else{
                          let storedPass=result.result[0].password;
                          bcrypt.compare(data.password, storedPass, function (err, resultCompare) {
                            if (resultCompare == true) {
                                let loggedInUser=[{
                                userID: result.result[0].userID,
                                groupID: result.result[0].groupID,
                                userType: result.result[0].userType,
                                userTitle: result.result[0].userTitle,
                                userFname: result.result[0].userFname,
                                userMname: result.result[0].userMname,
                                userLname: result.result[0].userLname,
                                userSuffix: result.result[0].userSuffix,
                                creationDate: result.result[0].creationDate,
                                dbActive:result.result[0].dbActive
                                }];
                                let token = jwt.sign({ 
                                    email : data.email
                                },
                                configData.jwtSecretKey,
                                    { expiresIn : '2d' }
                                )
                                callback({error:false,result:{status:true,valid:true,res:loggedInUser,token:token}})     
                            } else {
                                callback({error:false,result:{status:true,valid:false,res:"Username and password did not match."}})
                            }
                            })
                        }
                        
                      }
                }
               
            }
        });
    } catch (error) {
        logger.error('utils/utilsLogin.js/loginUtil','catch',error);
        callback({error:true,result:error}) ;
    }
}

module.exports.loginUtil = loginUtil
