const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');
const redisUrl = "redis://127.0.0.1:6379";
const client = redis.createClient(redisUrl);
client.get = util.promisify(client.get);


const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function(){
  this.useCache = true;
  return this;
};

mongoose.Query.prototype.exec =async function () {
    if(!this.useCache){
        return exec.apply(this,arguments);
    }
    const key = JSON.stringify(Object.assign({},this.getQuery(),{
        collection:this.mongooseCollection.name
    }));

    let cachedData = await client.get(key);

    if(cachedData){
        let cached_doc = JSON.parse(cachedData);
        return Array.isArray(cached_doc)?cached_doc.map((doc_item)=>new this.model(doc_item)):new this.model(cached_doc);
    }

    let query_exec = await exec.apply(this,arguments);
    client.set(key,JSON.stringify(query_exec));
    return query_exec
};
