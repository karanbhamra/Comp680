// create a closure that runs when window is loaded
(function () {
	//console.log("Test");

	var dropzone = document.getElementById("dropzone");
	AWS.config.region = 'us-west-2'; // 1. Enter your region

	AWS.config.credentials = new AWS.CognitoIdentityCredentials({
		IdentityPoolId: "us-west-2:22fe90da-13ea-44da-b44e-41fd208c0d88" // 2. Enter your identity pool
	});

	AWS.config.credentials.get(function (err) {
		if (err) alert(err);
		console.log(AWS.config.credentials);
	});

	var bucketName = "comp680testfiles"; // Enter your bucket name
	var bucket = new AWS.S3({
		params: {
			Bucket: bucketName
		}
	});

	var filename;
	var fileurl;


	function prepareUpload(file) {
		console.log(file);


		const MAX_FILE_SIZE = 1.5 * (10 ** 7);

		const VALID_FILE_TYPE = "application/pdf";

		let formData = new FormData();

		formData.append('file', file);


		console.log(formData);
		var uploadFile = formData.get('file');
		filename = uploadFile.name;



		let dropzone = document.getElementById("dropzone");

		dropzone.innerHTML = '<img src="img/fileicon.png" />' + filename;


		let button = document.getElementById("uploadButton");

		let clearButton = document.getElementById("clearButton");


		clearButton.classList.remove("btn-secondary");
		clearButton.classList.add("btn-danger");
		clearButton.disabled = false;



		button.classList.remove("btn-secondary");
		button.classList.add("btn-success");
		button.disabled = false;

		// console.log(uploadFile.name);
		// console.log(uploadFile.size);

		// if (uploadFile.size < MAX_FILE_SIZE) {
		// 	console.log("Valid filesize");
		// } else {
		// 	console.log("Invalid filesize");
		// }

		// if (uploadFile.type === VALID_FILE_TYPE) {
		// 	console.log("Uploading PDF");
		// } else {
		// 	console.log("File MUST be a PDF.");
		// }
		//fileToUpload = uploadFile;

		uploadToS3(uploadFile);

	}

	function uploadToS3(file) {


		let button = document.getElementById("uploadButton");

		button.addEventListener('click', function (params) {

			//	results.innerHTML = '';
			var objKey = 'testing/' + file.name;
			var params = {
				Key: objKey,
				ContentType: file.type,
				Body: file,
				ACL: 'public-read'
			};

			bucket.putObject(params, function (err, data) {
				if (err) {
					results.innerHTML = 'ERROR: ' + err;
				} else {
					listObjs();
				}
			});
			fileurl = "https://s3-us-west-2.amazonaws.com/comp680testfiles/testing/" + filename;
			alert("File " + filename + " uploaded.\n" + "File can be accessed from: " + fileurl);
		});
	}



	// on drop send a list of files to upload func
	dropzone.ondrop = function (e) {
		e.preventDefault();	// make sure any dropped object isnt loaded and displayed
		this.className = "dropzone";
		//console.log(e.dataTransfer.files);

		if (e.dataTransfer.files.length > 1) {
			alert("Only one file allowed.");
		}
		else {

			prepareUpload(e.dataTransfer.files[0]);
		}


	};

	// color it black
	dropzone.ondragover = function () {

		this.className = "dropzone dragover";

		return false;
	}

	// color it back to gray
	dropzone.ondragleave = function () {
		this.className = "dropzone";

		return false;
	}
}());