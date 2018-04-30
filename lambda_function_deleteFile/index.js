const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

exports.handler = (event, context, callback) => {
    // TODO implement

    let uploadedname = event.fileToDelete;

    let dbParams = {
        TableName: 'ProtoDoc',
    };

    docClient.scan(dbParams, function (err, data) {
        if (err) {
            callback(err, null);
        }
        else {
            let fname = '';

            let found = false;

            for (let file of data.Items) {
                if (file.uploaded_filename === uploadedname) {
                    fname = file.secure_filename;
                    console.log('found file in db called', file.secure_filename);
                    found = true;
                    break;

                }
            }

            if (!found) {
                return callback('file not found in db', null);
            }

            var deleteparams = {
                Bucket: "comp680testfiles",
                Key: fname
            };

            s3.deleteObject(deleteparams, function (err, data) {
                if (err) {
                    callback(err, null);
                } else {
                    callback(null, 'deleted file');
                }

            });
        }
    });


};
