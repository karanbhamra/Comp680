// create a closure that runs when window is loaded
(function () {
    // AWS setup
    AWS.config.region = 'us-west-2'; // 1. Enter your region

    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: 'us-west-2:bda72b98-1668-4af4-85a7-c168a69133b8', // 2. Enter your identity pool
    });

    AWS.config.credentials.get(function (err) {
        if (err) alert(err);
    });

    let bucketName = 'comp680testfiles'; // Enter your bucket name
    let bucket = new AWS.S3({
        params: {
            Bucket: bucketName,
        },
    });
    let lambda = new AWS.Lambda();
    ///////////////

    new ClipboardJS('#copy-button');
    let dropzone = document.getElementById('dropzone');
    let modalButton = document.getElementById('modalButton');
    let dismissButton = document.getElementById('dismissButton');
    let deleteDismissButton = document.getElementById('deleteDismissButton');
    let uploadButton = document.getElementById('uploadButton');
    let clearButton = document.getElementById('clearButton');
    let filebrowser = document.getElementById('fileBrowser');
    let deleteFileButton = document.getElementById('deleteFileButton');

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

    // dismissing link modal will reload the page to reset everything
    dismissButton.addEventListener('click', () => {
        location.reload();
    });

    deleteDismissButton.addEventListener('click', () => dismissButton.click());

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
            let extension = file.name.substr(file.name.lastIndexOf('.'), file.name.length);

            let radioOneDay = document.getElementById('radioOneDay');

            let isValidForOneDay = radioOneDay.checked;

            console.log('radio one day selected', isValidForOneDay);
            console.log('radio one hour selected', !isValidForOneDay);

            let prefix = "day";

            if (isValidForOneDay == false) {
                prefix = "hour";
            }

            let objKey = prefix + randomString() + extension;

            let params = {
                Key: objKey,
                ContentType: file.type,
                Body: file,
                ACL: 'public-read',
            };

            let putObjectPromise = bucket.putObject(params).promise();


            // display uploading Modal
            $('#uploadModal').modal('show');

            putObjectPromise.then(function (data) {

                setTimeout(() => {

                    console.log('Upload success.', data); // File was uploaded

                    let createLinkParams = {
                        FunctionName: 'createTempLink',
                        InvocationType: 'RequestResponse',
                        Payload: JSON.stringify({ s3key: objKey }),
                        LogType: 'None',
                    };


                    lambda.invoke(createLinkParams, function (err, data) {
                        if (err) {
                            console.log('error invoking createlink function', err);
                        } else {
                            console.log('success in creating link promise');

                            let shortfileurl = JSON.parse(data.Payload).link;
                            let securefileurl = JSON.parse(data.Payload).securelink;
                            console.log(shortfileurl);
                            console.log(securefileurl);
                            //pass link back to user

                            let showUrl = document.getElementById('copy-input');
                            showUrl.value = shortfileurl;

                            $('#uploadModal').modal('hide');
                            $('#myModal').modal('show');

                            deleteFileButton.addEventListener('click', () => {

                                let deleteFileParams = {
                                    FunctionName: 'deleteFile',
                                    InvocationType: 'Event',
                                    Payload: JSON.stringify({ fileToDelete: objKey }),
                                    LogType: 'None',
                                };


                                lambda.invoke(deleteFileParams, function (err, data) {
                                    if (err) {
                                        console.log('error invoking deletefile function', err);
                                    } else {
                                        console.log('file deleted');
                                        $('#myModal').modal('hide');
                                        $('#deletedModal').modal('show');
                                    }

                                });
                            });

                        }

                    }); // invoke lambda with delay to make sure file was created  

                }, 5000);

            }).catch(function (err) {
                console.log('Failed to upload', err);

            });

        });
    }
})();
