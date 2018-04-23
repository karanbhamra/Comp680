let AWS = require('aws-sdk');
let tinyurl = require('tinyurl');
let s3 = new AWS.S3();


exports.createTempLink = (event, context, callback) => {

    //     var url = s3.getSignedUrl('getObject', {
    //     Bucket: event.s3bucket,
    //     Key: event.s3key,
    //     Expires: 30,
    //   });
    //   var result = { link : url };
    //     callback(null, result);

    // tinyurl.shorten('http://google.com', function (res) {
    //     console.log(res); //Returns a shorter version of http://google.com - http://tinyurl.com/2tx 
    // });    

};
