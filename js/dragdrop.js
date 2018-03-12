// create a closure that runs when window is loaded
(function () {

    // AWS setup
    AWS.config.region = 'us-west-2'; // 1. Enter your region

    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: 'us-west-2:22fe90da-13ea-44da-b44e-41fd208c0d88' // 2. Enter your identity pool
    });

    AWS.config.credentials.get(function (err) {
        if (err) alert(err)
        // console.log(AWS.config.credentials);
    });

    let bucketName = 'comp680testfiles'; // Enter your bucket name
    let bucket = new AWS.S3({
        params: {
            Bucket: bucketName
        }
    });
    ///////////////

    let filename;   // will hold the local file name
    let fileurl;    // will hold the temporary aws link to the file once uploaded

    const AWS_FILE_LINK = 'https://s3-us-west-2.amazonaws.com/comp680testfiles/';
    const MAX_FILE_SIZE = 1.5 * (10**7);    // set to 15 MB
    let VALID_FILE_TYPES = ['application/pdf','text/plain','application/rtf','application/msword']; // initial list of valid mimetypes for files

    let dropzone = document.getElementById('dropzone');
    let uploadButton = document.getElementById('uploadButton');
    let clearButton = document.getElementById('clearButton');
    let filebrowser = document.getElementById("fileBrowser");

    // color dropzone with hover color
    dropzone.ondragover = function () {
        this.className = 'dropzone dragover';

        return false
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
            alert('Only one file allowed.')
        } else {
            //console.log(e.dataTransfer.files[0]);
            prepareUpload(e.dataTransfer.files[0])
        }
    };

    // Prepares the given file by creating the FormData that will be submitted and enables
    function prepareUpload (file) {

        let fileTypeValid = false;
        let fileSizeValid = false;

        console.log(file);  // log the file details for debug

        let formData = new FormData();

        formData.append('file', file);

        console.log(formData);  // log the form data for debug

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

        console.log(filesize + " bytes");
        console.log(filetype + " mimetype");

        // Upload the file only if the file size and file type has been validated
        if (fileTypeValid == true && fileSizeValid == true) {

            // once a file has been added set the button properties as necessary and enable the usage of buttons
            clearButton.classList.remove('btn-secondary');
            clearButton.classList.add('btn-danger');
            clearButton.disabled = false;

            uploadButton.classList.remove('btn-secondary');
            uploadButton.classList.add('btn-success');
            uploadButton.disabled = false;

            dropzone.innerHTML = '<img src="img/fileicon.png" />' + filename;   // add the doc image to the dropzone and append the filename


            uploadToS3(uploadFile);
        }
        else {
            alert("Check the file size and/or filetype.");
            location.reload();
        }
    }

    // Uploads the file to S3 bucket
    function uploadToS3 (file) {
        // uploadButton's click will upload the file to S3 while setting the bucket file property to be public
        uploadButton.addEventListener('click', function () {
            var objKey = file.name;
            var params = {
                Key: objKey,
                ContentType: file.type,
                Body: file,
                ACL: 'public-read'
            };

            bucket.putObject(params, function (err, data) {
                if (err) {
                    console.log('ERROR: ' + err);   // File failed to upload, log it to console
                } else {
                    console.log('Upload success.'); // File was uploaded, display the link to user via an alert for now
                    fileurl = AWS_FILE_LINK + filename;
                    alert('File ' + filename + ' uploaded.\n' + 'File can be accessed from: ' + fileurl);

                    // reload the page to "clear" it after a sucessful upload
                    location.reload();
                }
            })
        })
    }
}());
