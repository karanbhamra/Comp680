// create a closure that runs when window is loaded
(function () {
    // AWS setup
    AWS.config.region = 'us-west-2'; // 1. Enter your region

    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: 'us-west-2:bda72b98-1668-4af4-85a7-c168a69133b8', // 2. Enter your identity pool
    });

    AWS.config.credentials.get(function (err) {
        if (err) alert(err);
        // console.log(AWS.config.credentials);
    });

    let bucketName = 'comp680testfiles'; // Enter your bucket name
    let bucket = new AWS.S3({
        params: {
            Bucket: bucketName,
        },
    });
    ///////////////

    let lambda = new AWS.Lambda();

    let filename; // will hold the local file name
    let fileurl; // will hold the temporary aws link to the file once uploaded

    const AWS_FILE_LINK = 'https://s3-us-west-2.amazonaws.com/comp680testfiles/';
    const MAX_FILE_SIZE = 1.5 * Math.pow(10, 7);//(10 ** 7); // set to 15 MB
    let VALID_FILE_TYPES = [
        'application/pdf',
        'text/plain',
        'application/rtf',
        'application/msword',
    ]; // initial list of valid mimetypes for files

    let dropzone = document.getElementById('dropzone');
    let uploadButton = document.getElementById('uploadButton');
    let clearButton = document.getElementById('clearButton');
    let filebrowser = document.getElementById('fileBrowser');

    // color dropzone with hover color
    dropzone.ondragover = function () {
        this.className = 'dropzone dragover';

        return false;
    };

    // color dropzone back to default
    dropzone.ondragleave = function () {
        this.className = 'dropzone';

        return false;
    };

    // Dropzone's click will run the file browser's click function
    document.getElementById('dropzone').onclick = () => filebrowser.click();

    // if a file was selected via click in the dropzone, get the file and send it to be prepared
    filebrowser.addEventListener('change', function () {
        let fileList = this.files;
        let file = fileList[0];
        prepareUpload(file);
    });

    // on drop send a list of files to upload func
    dropzone.ondrop = function (e) {
        e.preventDefault(); // make sure any dropped object is not loaded and displayed
        this.className = 'dropzone';

        // console.log(e.dataTransfer.files); // list of files dropped in the dropzone

        // prepare the file if its the only file
        if (e.dataTransfer.files.length > 1) {
            alert('Only one file allowed.');
        } else {
            //console.log(e.dataTransfer.files[0]);
            prepareUpload(e.dataTransfer.files[0]);
        }
    };

    // Prepares the given file by creating the FormData that will be submitted and enables
    function prepareUpload(file) {
        let fileTypeValid = false;
        let fileSizeValid = false;

        console.log(file); // log the file details for debug

        let formData = new FormData();

        formData.append('file', file);

        console.log(formData); // log the form data for debug

        let uploadFile = formData.get('file');

        filename = uploadFile.name;


        let filesize = uploadFile.size;

        if (filesize < MAX_FILE_SIZE) {
            fileSizeValid = true;
        }

        let filetype = uploadFile.type;

        if (VALID_FILE_TYPES.includes(filetype)) {
            fileTypeValid = true;
        }

        console.log(filesize + ' bytes');
        console.log(filetype + ' mimetype');

        // Upload the file only if the file size and file type has been validated
        if (fileTypeValid == true && fileSizeValid == true) {
            // once a file has been added set the button properties as necessary and enable the usage of buttons
            clearButton.classList.remove('btn-secondary');
            clearButton.classList.add('btn-danger');
            clearButton.disabled = false;

            uploadButton.classList.remove('btn-secondary');
            uploadButton.classList.add('btn-success');
            uploadButton.disabled = false;

            dropzone.innerHTML = '<img src="img/fileicon.png" />' + filename; // add the doc image to the dropzone and append the filename

            uploadToS3(uploadFile);
        } else {
            alert('Check the file size and/or filetype.');
            location.reload();
        }
    }

    // used to name upload filename
    function randomString() {
        let x = 2147483648;
        return Math.floor(Math.random() * x).toString(36) +
            Math.abs(Math.floor(Math.random() * x) ^ Date.now()).toString(36);
    }

    // Uploads the file to S3 bucket
    function uploadToS3(file) {
        // uploadButton's click will upload the file to S3 while setting the bucket file property to be public
        uploadButton.addEventListener('click', function () {
            //var objKey = file.name;
            let extension = file.name.substr(file.name.lastIndexOf('.'), file.name.length);


            let objKey = randomString() + extension;
            let params = {
                Key: objKey,
                ContentType: file.type,
                Body: file,
                ACL: 'public-read',
            };

            let lambdaParams = {
                FunctionName: 'setFileValidTill',
                InvocationType: 'RequestResponse',
                Payload: JSON.stringify({filename: objKey, validtill: 24}),
                LogType: 'None'
            };

            //upload object to S3

            //let apiUrl = 'https://co6yub84p6.execute-api.us-west-2.amazonaws.com/dev/setFileValidTill?filename=' + objKey + '&validtill=24';

            let putObjectPromise = bucket.putObject(params).promise();

            putObjectPromise.then(function (data) {

                console.log('Upload success.', data); // File was uploaded

                // make the api call to set the expiration time

                //alert('Upload success');


                // less fails if invoked after 1 second
                setTimeout(function() {
                    let lambdaObjectPromise = lambda.invoke(lambdaParams).promise();

                    return lambdaObjectPromise;
                }, 2500);

                //
                // lambda.invoke(lambdaParams, function (error, data) {
                //     if (error) {
                //         console.log('Error', error);
                //     } else {
                //         console.log('Data', data);
                //         alert('Upload success');
                //     }
                // })

            }).then(function(response){

                console.log('lambda invoked and expiration time set');
                console.log(response);
                alert('Upload success.');


            }).catch(function (err) {
                console.log('Error with promises', err);

            })


            // bucket.putObject(params, function (err, data) {
            //     if (err) {
            //         console.log('ERROR: ' + err); // File failed to upload, log it to console
            //     } else {
            //         console.log('Upload success.'); // File was uploaded, display the link to user via an alert for now
            //
            //         let oneDayRadio = document.getElementById('radioOneDay');
            //         //console.log(oneDayRadio.checked);
            //
            //         var xhttp = new XMLHttpRequest();
            //
            //
            //         //if (oneDayRadio.checked) {
            //         console.log('Valid for 24 hours');
            //
            //         xhttp.onreadystatechange = function () {
            //             if (this.readyState == 4 && this.status == 200) {
            //                 console.log(this.responseText);
            //                 alert('Uploaded');
            //             }
            //         };
            //         xhttp.open("PUT", "https://co6yub84p6.execute-api.us-west-2.amazonaws.com/dev/setFileValidTill?filename=" + objKey + "&validtill=24", true);
            //         xhttp.send();
            //
            //         // } else {
            //         //   console.log('Valid for 1 time');
            //         // }
            //
            //
            //     }
            // });

            // TODO: make this lambda work again
            //params for lambda invocation
            //   let createLink = {
            //     FunctionName: 'createTempLink',
            //     InvocationType: 'RequestResponse',
            //     Payload: JSON.stringify({ s3bucket: bucketName, s3key: filename }),
            //     LogType: 'None',
            //   };

            //   //invoke lambda function for temporary link generation
            //   lambda.invoke(createLink, function(error, data) {
            //     if (error) {
            //       alert(error);
            //     } else {
            //       //parse result
            //       fileurl = JSON.parse(data.Payload).link;
            //       //pass link back to user
            //       alert(fileurl);
            //       // reload the page to "clear" it after a sucessful upload
            //       location.reload();
            //     }
            //   });
        });
    }
})();
