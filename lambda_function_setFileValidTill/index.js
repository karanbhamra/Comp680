let AWS = require('aws-sdk');

function convertHrToMs(hour) {
    return hour * 3600000;
}

exports.handler = (event, context, callback) => {

    var docClient = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

    var getparams = {
        TableName: 'ProtoDoc',
        Key: { 'uploaded_filename': event.filename }
    };

    let getObjectPromise = docClient.get(getparams).promise();
    let fileobject;
    let updateparams;
    let newExpireTime = 0;
    let output;
    let response;

    getObjectPromise.then(function (data) {
        console.log('success in first promise');

        fileobject = data.Item;
        console.log("Retrieved item successfully: ", data.Item);
        console.log('Item will expire after: ', data.Item.time_expire);
        console.log('Item created at: ', data.Item.time_created);

        newExpireTime = data.Item.time_created + convertHrToMs(event.validtill);

        console.log('Item will expire at:', newExpireTime);
        //updating item
        updateparams = {
            TableName: 'ProtoDoc',
            Key: { 'uploaded_filename': event.filename },
            UpdateExpression: 'set time_expire = :t',
            ExpressionAttributeValues: {
                ':t': newExpireTime,
            }
        };

        return docClient.update(updateparams).promise();

    }).then(function (data) {
        console.log('succes in second promise');
        console.log(newExpireTime);
        output = {
            filename: event.filename,
            timecreated: fileobject.time_created,
            validtill: newExpireTime
        };

        response = {
            "statusCode": 200,
            "body": JSON.stringify(output),
            "isBase64Encoded": false
        };

        callback(null, response);

    }).catch(function (err) {
        console.log('error', err);

        response = {
            "statusCode": 200,
            "body": JSON.stringify(err),
            "isBase64Encoded": false
        };
        callback(null, response);
    });

};
