const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');
const redisUrl = "redis://127.0.0.1:6379";
const client = redis.createClient(redisUrl);
client.hget = util.promisify(client.hget);


const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function(options={}){
  this.useCache = true;
  this.hashKey = JSON.stringify(options.key || "");
  return this;
};

mongoose.Query.prototype.exec =async function () {
    if(!this.useCache){
        return exec.apply(this,arguments);
    }
    const key = JSON.stringify(Object.assign({},this.getQuery(),{
        collection:this.mongooseCollection.name
    }));
    console.log("Cache Working")
    let cachedData = await client.hget(this.hashKey,key);

    if(cachedData){
        let cached_doc = JSON.parse(cachedData);
        return Array.isArray(cached_doc)?cached_doc.map((doc_item)=>new this.model(doc_item)):new this.model(cached_doc);
    }

    let query_exec = await exec.apply(this,arguments);
    client.hset(this.hashKey,key,JSON.stringify(query_exec),"EX",60);
    return query_exec
};
function clearHash(hashKey){
    console.log("Cache Clear: ",hashKey)
    client.del(JSON.stringify(hashKey));
}
module.exports={
    clearHash:clearHash
};
