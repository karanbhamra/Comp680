let AWS = require('aws-sdk');
const fs = require('fs');

// uuid/v1 is timestamp based, generates a unique 128bit guid/uuid
const uuidv1 = require('uuid/v1');

let s3 = new AWS.S3({ apiVersion: '2006-03-01' });
let docClient = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });


// Splits the key into its respective filename and extension
function getFileInfo(key) {
    let file = key.substr(0, key.lastIndexOf('.'));
    let extension = key.substr(key.lastIndexOf('.'), key.length);

    return {
        "filename": file,
        "extension": extension
    };
}

// Makes a copy of the uploaded file with the new filename which will be public
function renameFile(oldfile, newfile) {
    var params = {
        Bucket: "comp680testfiles",
        CopySource: "/comp680testfiles/" + oldfile,
        Key: newfile,
        ACL: 'public-read'
    };
    s3.copyObject(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else console.log(data); // successful response
    });
}

function deleteOriginalFile(oldfile) {
    var params = {
        Bucket: 'comp680testfiles',
        Key: oldfile
    };
    s3.deleteObject(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else console.log('File deleted successfully.'); // successful response
    });
}

function writeInfoToDynamoDB(uploadedFileName, newFileName, date) {
    // Load the AWS SDK for Node.js
    // Create the DynamoDB service object
    var params = {
        TableName: 'ProtoDoc',
        Item: {
            'uploaded_filename': uploadedFileName,
            'secure_filename': newFileName,
            'time_created': date,
            'time_expire' : -1
        }
    };

    docClient.put(params, function(err, data) {
        if (err) {
            console.log("Error", err);
        }
        else {
            console.log("Success", data);
        }
    });
}

exports.handler = function(event, context, callback) {
    // key is the S3 object that was uploaded
    var key = event.Records[0].s3.object.key;
    console.log('original key:', key);

    // fileinfo object holds the filename and file extension
    let fileinfo = getFileInfo(key);
    let newfilename = uuidv1() + fileinfo.extension;

    // send the original object with the new objects filename
    renameFile(key, newfilename);


    let output = {
        'oldfilename': key,
        'newfilename': newfilename
    };

    let result = {
        'status': 200,
        'body': {
            output
        }
    };

    // write items to dB
    writeInfoToDynamoDB(key, newfilename, Date.now());

    // deleteOriginalFile(key);

    callback(null, deleteOriginalFile(key));
}
