const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

function deleteFilesS3(files) {
    var options = {
        Bucket: 'comp680testfiles',
        Delete: {
            Objects: files
        }
    };
    s3.deleteObjects(options, function (err, data) {
        if (data) {
            console.log("File(s) successfully deleted");
        }
        else {
            console.log("Check with error message " + err);
        }
    });
}

function deleteItemsDB(items) {
    let options = {
        //TableName: 'ProtoDoc',
        RequestItems: {
            'ProtoDoc': items
        }
    };
    docClient.batchWrite(options, function (err, data) {
        if (err) {
            console.log('Batch delete unsuccessful ...');
            console.log(err, err.stack); // an error occurred
        } else {
            console.log('Batch delete successful ...');
            console.log(data); // successful response
        }

    });
}


exports.handler = (event, context, callback) => {
    // TODO implement
    // Delete the record from DynamoDB

    var params = {
        TableName: 'ProtoDoc',
    };

    docClient.scan(params, function (err, data) {
        if (err) {
            //callback(err, null);
            console.log('error in dynamodb', err);
        }
        else {

            let items = []; // holds the db items to be deleted
            let objects = []; // holds the s3 objects to be deleted
            let info = data; // info will hold all the items in db

            // for each item, delete item from db if its expire time has passed
            for (let file of info.Items) {
                //console.log(file.uploaded_filename, file.time_expire);

                if (file.time_expire < Date.now()) {
                    console.log(`${file.uploaded_filename} should will be deleted`);
                    objects.push({ Key: file.secure_filename });

                    var item = {
                        DeleteRequest: {
                            Key: {
                                'uploaded_filename': file.uploaded_filename
                            }
                        }
                    };
                    items.push(item);
                    //items.push({Key: file.uploaded_filename});
                }
            }

            deleteFilesS3(objects);
            deleteItemsDB(items);


            //console.log(objects);

            console.log('*************************');
        }
    });




    callback(null, 'Function finished');
};
