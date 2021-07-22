const express = require('express')
const app = express();
const http = require('http');
//const server = http.Server(app);
//const socketIO = require('socket.io');
//const io = socketIO(server);
const logger = require('../lib/log');
const mysql = require('../services/mysql');
const mail = require('../utils/utilsCommon');


async function taxonomyAddChild(data, callback){
    try {
        let query='select * from taxonomy where nodeDescription = ? and groupID = ? and parentID = ?';
        mysql.querySQL({query:query,dataArray:[data.nodeDescription,data.groupID,data.parentID]},async result => {
            if(result.error){
                callback({error:true, result:{status:400, send:{status:false,res:'Some error occured while selecting from taxonomy'}}})
            }else{
                if(result.result.length == 0){
                    taxonomyAddUtil({values:data.values},async resultTaxonomyAddUtil => {
                        if(resultTaxonomyAddUtil.error){
                            callback({error:true, result:resultTaxonomyAddUtil.result})
                        }else{
                            updateTaxonomyDetailsInGroup({level:data.level,groupID:data.groupID},async resultUpdateTaxonomyDetailsInGroup => {
                                if(resultUpdateTaxonomyDetailsInGroup.error){
                                    callback({error:true, result:resultTaxonomyAddUtil.result})
                                }else{
                                    
                                    callback({error:false, result: resultTaxonomyAddUtil.result})
                                }
                            })
                        }
                    });
                }else{
                    if(result.result[0].deleted == 'Y'){
                        taxonomyUpdateUtil({nodeDescription:data.nodeDescription,groupID:data.groupID,parentID:data.parentID},async resultTaxonomyUpdateUtil => {
                            if(resultTaxonomyUpdateUtil.error){
                                callback({error:true, result:resultTaxonomyUpdateUtil.result})
                            }else{
                                updateTaxonomyDetailsInGroup({level:data.level,groupID:data.groupID},async resultUpdateTaxonomyDetailsInGroup => {
                                    if(resultUpdateTaxonomyDetailsInGroup.error){
                                        callback({error:true, result:resultTaxonomyUpdateUtil.result})
                                    }else{
                                        
                                        callback({error:false, result: resultTaxonomyUpdateUtil.result})
                                    }
                                })
                            }
                        });
                    }else{
                        callback({error:false, result:{status:400, send:{status:false, res:'Same child already present for this parent.'}}})
                    }
                }
                
            }
        });
    } catch (error) {
        logger.error('utils/utilsTaxonomy.js/taxonomyAddChild','catch',error);
        callback({error:true,result:error}) ;
    }
}
async function taxonomyUpdateUtil(data,callback){
    try {
        let deleted = 'N';
        let query='update taxonomy set deleted = ? where nodeDescription = ? and groupID = ? and parentID = ?';
        mysql.querySQL({query:query,dataArray:[deleted,data.nodeDescription,data.groupID,data.parentID]}, async result => {
            if(result.error){
                callback({error:true, result:{status:400, send:{status:false, res:'Some error occurred while updating taxonomy'}}})
            }else{
                callback({error:false, result:{status:200, send:{status:true, res:'Child added successfully'}}});
            }
        });
    } catch (error) {
        logger.error('utils/utilsTaxonomy.js/taxonomyUpdateTaxonomyUtil','catch',error);
        callback({error:true,result:error}) ;
    }
}

async function updateTaxonomyDetailsInGroup(data,callback){
    try {
        let query='update companygroup set taxonomyLevel = ? where groupID = ?';
        mysql.querySQL({query:query,dataArray:[data.level,data.groupID]}, async result => {
            console.log("updateTaxonomyDetailsInGroup result %j",result)
            if(result.error){
                callback({error:true, result:{status:400, send:{status:false, res:'Some error occurred while updating taxonomy'}}})
            }else{
                callback({error:false, result:{status:200, send:{status:true, res:'Child Added Successfully.'}}});
            }
        });
    } catch (error) {
        logger.error('utils/utilsTaxonomy.js/updateTaxonomyDetailsInGroup','catch',error);
        callback({error:true,result:error}) ;
    }
}
async function taxonomyAddUtil(data, callback){
    try {
        var query='INSERT INTO taxonomy VALUES ?';
        mysql.querySQL({query:query, dataArray:[data.values]}, async result => {
            if(result.error){
                callback({error:true, result:{status:400, send:{status:false, res:'some error occured while adding taxonomy'}}})
            }else{
                callback({error:false, result:{status:200, send:{status:true, res:'Child added successfully'}}})
            }
        });
    } catch (error) {
        logger.error('utils/utilsTaxonomy.js/taxonomyAddUtil','catch',error);
        callback({error:true,result:error}) ;
    }
}

async function taxonomyAddParent(data, callback){
    try {
        var query = 'select * from taxonomy where groupID = ? and nodeDescription = ? and parentID is NULL';
        mysql.querySQL({query:query, dataArray:[data.groupID,data.nodeDescription]},async result => {
            if(result.error){
                callback({error:true, result:{status:400, send:{status:false, res:'some error occurred while taxonomyAddParent'}}})
            }else{
                if(result.result.length == 0){
                    taxonomyAddParentUtil({values:data.values},async resultTaxonomyAddParentUtil => {
                        if(resultTaxonomyAddParentUtil.error){
                            callback({error:true, result:resultTaxonomyAddParentUtil.result})
                        }else{
                            updateTaxonomyDetailsInGroup({level:data.level,groupID:data.groupID},async resultUpdateTaxonomyDetailsInGroup => {
                                if(resultUpdateTaxonomyDetailsInGroup.error){
                                    callback({error:true, result:resultTaxonomyAddParentUtil.result})
                                }else{
                                    
                                    callback({error:false, result: resultTaxonomyAddParentUtil.result})
                                }
                            })
                        }
                    });
                }else{
                    if(result.result[0].deleted == 'Y'){
                        taxonomyUpdateParentUtil({nodeDescription:data.nodeDescription,groupID:data.groupID},async resultTaxonomyUpdateParentUtil => {
                            if(resultTaxonomyUpdateParentUtil.error){
                                callback({error:true, result:resultTaxonomyUpdateParentUtil.result})
                            }else{
                                updateTaxonomyDetailsInGroup({level:data.level,groupID:data.groupID},async resultUpdateTaxonomyDetailsInGroup => {
                                    if(resultUpdateTaxonomyDetailsInGroup.error){
                                        callback({error:true, result:resultTaxonomyUpdateParentUtil.result})
                                    }else{
                                        
                                        callback({error:false, result: resultTaxonomyUpdateParentUtil.result})
                                    }
                                })
                            }
                        });
                    }else{
                        callback({error:false, result:{status:400, send:{status:false, res:'Same parent already present for this group.'}}})
                    }
                }
            }
        });
    } catch (error) {
        logger.error('utils/utilsTaxonomy.js/taxonomyAddParent','catch',error);
        callback({error:true,result:error}) ;
    }
}
async function taxonomyUpdateParentUtil(data, callback){
    try {
        let deleted = 'N';
        let query='update taxonomy set deleted = ? where groupID = ? and nodeDescription = ? and parentID is NULL';
        mysql.querySQL({query:query, dataArray:[deleted,data.groupID,data.nodeDescription]},async result => {
            if(result.error){
                callback({error:true, result:{status:400, send:{status:false, res:'Some error occurred while updating taxonomy Parent'}}})
            }else{
                callback({error:false, result:{status:200, send:{status:true, res:'Parent added successfully'}}});
            }
        });
    } catch (error) {
        logger.error('utils/utilsTaxonomy.js/taxonomyUpdateParentUtil','catch',error);
        callback({error:true,result:error}) ;
    }
}

async function taxonomyAddParentUtil(data,callback){
    try {
        var query = 'INSERT INTO taxonomy VALUES ?';
        mysql.querySQL({query:query, dataArray:[data.values]}, async result => {
            if(result.error){
                callback({error:true, result:{status:400, send:{status:false, res:'some error occured while adding taxonomy Parent'}}})
            }else{
                callback({error:false, result:{status:200, send:{status:true, res:'Parent added successfully'}}})
            }
        });
    } catch (error) {
        logger.error('utils/utilsTaxonomy.js/taxonomyAddParentUtil','catch',error);
        callback({error:true,result:error}) ;
    }
}

async function taxonomyFetchAllInGroup(data, callback){
    try {
        let deleted='N';
        var query='select * from taxonomy where groupID = ? and deleted = ?';
        mysql.querySQL({query:query, dataArray:[data.groupID, deleted]}, async result => {
            if(result.error){
                if(result.error.errno==1048){
                    result = {status:false,res:{message:"UI not sending all the fields"}}
                }
                else if(result.error.errno==1136){
                    result = {status:false,"res":{message:"column missing while storing to db"}}
                }
                else{
                    result = {status:false,res:{message:"error occured while fetching data from db"}}
                }
                callback({error:true, result:{status:400,send:result}});
            }else{
                callback({error:false, result:{status:200, send:{status:true, res:result.result}}})
            }
        })
    } catch (error) {
        logger.error('utils/utilsTaxonomy.js/taxonomyFetchAllInGroup','catch',error);
        callback({error:true,result:error}) ;
    }
}

async function taxonomyDelete(data, callback){
    try {
        let nodeIDs = data.nodeIDs;
        let deleted = 'Y';
        let query='update taxonomy set deleted =? where nodeID in '+nodeIDs;
        console.log("query ",query)
        mysql.querySQL({query:query, dataArray:[deleted]}, async result => {
            console.log("result %j",result)
            if(result.error){
                callback({error:true, result:{status:400, send:{status:false,res:'Some error occurred while deleting taxonomy'}}})
            }else{
                taxonomyDeleteFileClass({nodeIDs:data.nodeIDs},async resultTaxonomyDeleteFileClass => {
                    if(resultTaxonomyDeleteFileClass.error){
                        callback({error:true, result:resultTaxonomyDeleteFileClass.result})
                    }else{
                        updateTaxonomyDetailsInGroup({level:data.level,groupID:data.groupID},async resultUpdateTaxonomyDetailsInGroup => {
                            if(resultUpdateTaxonomyDetailsInGroup.error){
                                callback({error:true, result:resultTaxonomyDeleteFileClass.result})
                            }else{
                                
                                callback({error:false, result: resultTaxonomyDeleteFileClass.result})
                            }
                        })
                    }
                });
            }
        });
    } catch (error) {
        logger.error('utils/utilsTaxonomy.js/taxonomyDelete','catch',error);
        callback({error:true,result:error}) ;
    }
}
async function taxonomyDeleteFileClass(data, callback){
    try {
        let nodeIDs = data.nodeIDs;
        let deleted = 'Y';
       let query ='update fileclass set deleted =? where nodeID in '+nodeIDs;
       mysql.querySQL({query:query, dataArray:[deleted]}, async result => {
           console.log("taxonomyDeleteFileClass result %j",result)
           if(result.error){
                callback({error:true, result:{status:400, send:{status:false, res:'Some error occurred while deleting file class for taxonomy'}}});
           }else{
                callback({error:false, result:{status:200, send:{status:true, res:'Taxonomy deleted successfully'}}})
           }
       });
    } catch (error) {
        
    }
}
module.exports.taxonomyAddChild = taxonomyAddChild;
module.exports.taxonomyAddParent = taxonomyAddParent;
module.exports.taxonomyFetchAllInGroup = taxonomyFetchAllInGroup;
module.exports.taxonomyDelete = taxonomyDelete;
