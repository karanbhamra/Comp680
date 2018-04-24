let tinyurl = require('tinyurl');
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();


function convertMStoSec(millis) {
    return millis / 1000;
}

exports.createTempLink = (event, context, callback) => {

    let ufilename = event.s3key;

    let dbParams = {
        TableName: 'ProtoDoc',
    };

    let scanDBPromise = docClient.scan(dbParams).promise();

    scanDBPromise.then(function (data) {

        let fname = '';
        let timemilli = 0;
        let validTimeInSeconds = 0;

        let found = false;

        for (let file of data.Items) {
            if (file.uploaded_filename === ufilename) {
                fname = file.secure_filename;
                timemilli = file.time_expire - file.time_created;
                validTimeInSeconds = convertMStoSec(timemilli);

                console.log('found file in db called', file.secure_filename);
                console.log('filelink will be valid for', validTimeInSeconds);
                found = true;
                break;

            }
        }

        if (!found) {
            return callback('file not found in db', null);
        }

        let signedUrl = s3.getSignedUrl('getObject', {
            Bucket: 'comp680testfiles',
            Key: fname,
            Expires: validTimeInSeconds,
        });
        console.log(signedUrl);

        // get shortened URL
        tinyurl.shorten(signedUrl, function (shortenedUrl) {

            console.log(shortenedUrl);

            // return the shortenedUrl as result to be given to user
            // var result = { link: shortenedUrl };
            var result = { link: shortenedUrl, securelink: signedUrl };

            console.log('the result that will be returned', result);
            callback(null, result);

        });


    }).catch(function (err) {
        console.log('Failed to upload', err);

        //let result = { link: 'error' };

        callback(err, null);

    });

};
