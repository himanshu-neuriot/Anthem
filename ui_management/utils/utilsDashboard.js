const mysql = require('../services/mysql');


async function dashboardFetchAllGroups(valuesAllGroup,callback){
    let adminEmail=valuesAllGroup.userID
    let deleted="'N'";
    let sqlAllGroups='select * from companygroup where customerID=(select customerID from customer where adminEmail=?) and deleted ='+deleted;
    mysql.querySQL({query:sqlAllGroups,dataArray:[adminEmail]},async result => {
        if(result.error){
            callback({status:false, res:"Error occurred while fetching groups"});
        }else{
            callback({status:true, res:result.result});
        }
    });
}

async function dashboardFetchAllAdmins(valuesAllUsers,callback){
    let groupIDs=valuesAllUsers;
    let userType="'A'";
    let deleted="'N'"
    let sqlAllUsers='select * from companyuser where userType='+userType+' and groupID in '+groupIDs + ' and deleted = '+deleted;
    mysql.querySQL({query:sqlAllUsers,dataArray:null},async result=>{
        if(result.error){
            callback({status:false, res:"Error occurred while fetching admins"})
        }else{
            callback({status:true, res:result.result})
        }
    });
}

async function dashboardFetchAllUsers(valuesAllUsers,callback){
    let groupIDs=valuesAllUsers;
    let deleted="'N'";
    let sqlAllUsers='select * from companyuser where groupID in '+groupIDs+' and deleted ='+deleted;
    mysql.querySQL({query:sqlAllUsers,dataArray:null},async result => {
        if(result.error){
            callback({status:false, res:"Error occurred while fetching users"})
        }else{
            callback({status:true, res:result.result})
        }
    });
}
async function dashboardFetchAllDocs(valuesAllDocs,callback){
    let authorIDs=valuesAllDocs;
    let deleted="'N'";
    let ingested="'Y'";
    let approved="'Y'"
    // let sqlAllDocs='select * from contentfile where authorID in '+authorIDs +" and deleted ="+deleted+" and ingested ="+ingested;
    let sqlAllDocs='select * from contentfile where authorID in '+authorIDs +" and deleted ="+deleted +" and approvalStatus="+approved +" and ingested="+ingested ;
    mysql.querySQL({query:sqlAllDocs,dataArray:[]},async result => {
        if(result.error){
            callback({status:false, res:"error occurred while fetching documents"})
        }else{
            callback({status:true, res:result.result})
        }
    });   
}

async function dashboardFetchAllPendingDocs(valuesAllDocs,callback){
    let authorIDs=valuesAllDocs;
    let approvalStatus="("+"'P'"+","+"'N'"+")";
    let deleted ="'N'";
    let ingested="'Y'";
    let sqlAllDocs='select * from contentfile where authorID in '+authorIDs +'and deleted ='+deleted+' and (approvalStatus <> '+"'Y'"+' or (approvalStatus = '+"'Y'"+' and ingested = '+"'N'"+'))';
    //let sqlAllDocs='select * from contentfile where authorID in '+authorIDs +' and approvalStatus <> '+"'Y'" +' and deleted ='+deleted;
    mysql.querySQL({query:sqlAllDocs,dataArray:[]},async result=>{
        if(result.error){
            callback({status:false, res:"Error occurred while fetching pending documents"})
        }else{
            callback({status:true, res: result.result})
        }
    });
}

async function dashboardGroupAdminFetchAllUsers(valuesAllUsers,callback){
    let groupID=valuesAllUsers;
    let deleted="'N'";
    let sqlAllUsers='select * from companyuser where groupID = '+groupID+' and deleted ='+deleted;
    mysql.querySQL({query:sqlAllUsers,dataArray:[]},async result => {
        if(result.error){
            callback({status:false,res:"Error occurred while fetching users"})
        }else{
            callback({status:true, res:result.result})
        }
    });
    
  }
  async function dashboardGroupMemberFetchApprovedDocs(authorID,callback){
    let author="'"+authorID+"'";
    let approvalStatus="'Y'";
    let deleted="'N'";
    let ingested="'Y'";
    //let sqlApprovedDocs='select * from contentfile where authorID = '+author +' and approvalStatus ='+approvalStatus +' and deleted ='+deleted+' and ingested ='+ingested;
    let sqlApprovedDocs='select * from contentfile where authorID = '+author +' and approvalStatus ='+approvalStatus +' and deleted ='+deleted;
    mysql.querySQL({query:sqlApprovedDocs,dataArray:[]}, async result=>{
        if(result.error){
            callback({status:false,res:"Error occurred while fetching approved documents"})
        }else{
            callback({status:true,res:result.result})
        }
    });
    
    
  }
  async function dashboardGroupMemberFetchPendingDocs(authorID,callback){
    let author="'"+authorID+"'";
    let approvalStatus="("+"'P'"+","+"'N'"+")";
    let deleted="'N'";
    let ingested="'Y'";
    // let sqlAllDocs='select * from contentfile where authorID = '+author + 'and approvalStatus in '+approvalStatus+ ' and deleted = '+deleted+' and ingested ='+ingested;
    let sqlAllDocs='select * from contentfile where authorID = '+author + 'and approvalStatus in '+approvalStatus+ ' and deleted = '+deleted;
    mysql.querySQL({query:sqlAllDocs,dataArray:[]},async result=>{
        if(result.error){
            callback({status:false,res:"Error occurred while fetching pending documents"})
        }else{
            callback({status:true, res: result.result})
        }
    });
  }

  async function customizedUtil(data, callback){
    let sqlUpdateUser='UPDATE companyuser SET dbActive='+data.dbActive+ ' WHERE userID='+data.userID;
    mysql.querySQL({query:sqlUpdateUser,dataArray:null},async result => {
        if(result.error){
            callback({"status":false, "res":"error occured while storing new changes to db"})
        }else{
            callback({status:true, res:"Dashboard Customized"})
        }
    });
     
  }
module.exports.dashboardFetchAllGroups = dashboardFetchAllGroups;
module.exports.dashboardFetchAllAdmins = dashboardFetchAllAdmins;
module.exports.dashboardFetchAllUsers = dashboardFetchAllUsers;
module.exports.dashboardFetchAllDocs = dashboardFetchAllDocs;
module.exports.dashboardFetchAllPendingDocs = dashboardFetchAllPendingDocs;
module.exports.dashboardGroupAdminFetchAllUsers = dashboardGroupAdminFetchAllUsers;
module.exports.dashboardGroupMemberFetchApprovedDocs = dashboardGroupMemberFetchApprovedDocs;
module.exports.dashboardGroupMemberFetchPendingDocs = dashboardGroupMemberFetchPendingDocs;
module.exports.customizedUtil = customizedUtil;


