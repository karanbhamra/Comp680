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

    docClient.scan(dbParams, function (err, data) {
        if (err) {
            console.log('dynamodb error', err);
        }
        else {
            for (let file of data.Items) {
                if (file.uploaded_filename === ufilename) {
                    let fname = file.secure_filename;
                    let timemilli = file.time_expire - file.time_created;
                    let validTimeInSeconds = convertMStoSec(timemilli);

                    console.log('found file in db called', file.secure_filename);
                    console.log('filelink will be valid for', validTimeInSeconds);


                    // gets the signed url to the file in s3 that will be valid for the duration user selected
                    let signedUrl = s3.getSignedUrl('getObject', {
                        Bucket: 'comp680testfiles',
                        Key: fname,
                        Expires: validTimeInSeconds,
                    });

                    console.log('signed url:', signedUrl);

                    // get shortened URL
                    tinyurl.shorten(signedUrl, function (shortenedUrl) {

                        console.log(shortenedUrl);

                        // return the shortenedUrl as result to be given to user
                        var result = { link: shortenedUrl };
                        callback(null, result);

                    });

                }
            }
        }
    });
};
