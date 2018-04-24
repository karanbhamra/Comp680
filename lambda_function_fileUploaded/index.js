let AWS = require('aws-sdk');
const fs = require('fs');

// uuid/v1 is timestamp based, generates a unique 128bit guid/uuid
const uuidv1 = require('uuid/v1');

let s3 = new AWS.S3({ apiVersion: '2006-03-01' });
let docClient = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });


function convertHrToMs(hour) {
    return hour * 3600000;
}

// Splits the key into its respective filename and extension
function getFileInfo(key) {
    let file = key.substr(0, key.lastIndexOf('.'));
    let extension = key.substr(key.lastIndexOf('.'), key.length);

    return {
        "filename": file,
        "extension": extension
    };
}

function deleteOriginalFile(oldfile) {
    var params = {
        Bucket: 'comp680testfiles',
        Key: oldfile
    };
    s3.deleteObject(params, function (err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else console.log('File deleted successfully.'); // successful response
    });
}

exports.handler = function (event, context, callback) {
    // key is the S3 object that was uploaded
    var key = event.Records[0].s3.object.key;
    console.log('original key:', key);

    // fileinfo object holds the filename and file extension
    let fileinfo = getFileInfo(key);
    let newfilename = uuidv1() + fileinfo.extension;

    // send the original object with the new objects filename
    var renameparams = {
        Bucket: "comp680testfiles",
        CopySource: "/comp680testfiles/" + key,
        Key: newfilename,
        ACL: 'public-read'
    };

    //rename file
    let renamePromise = s3.copyObject(renameparams).promise();

    renamePromise.then(function (data) {

        // write items to db

        let milliseconds = 0;

        if (key.includes('day')) {

            milliseconds = convertHrToMs(24);
        }
        else {
            milliseconds = convertHrToMs(1);
        }

        var putparams = {
            TableName: 'ProtoDoc',
            Item: {
                'uploaded_filename': key,
                'secure_filename': newfilename,
                'time_created': Date.now(),
                'time_expire': Date.now() + milliseconds
            }
        };

        return docClient.put(putparams).promise();

    }).then(function (data) {
        // delete original file

        var deleteparams = {
            Bucket: 'comp680testfiles',
            Key: key
        };
        return s3.deleteObject(deleteparams).promise();

    }).catch(function (err) {
        callback(err, null);
    });

    callback(null, 'lambda finished success');
}
