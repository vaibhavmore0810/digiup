let folderName
$(document).ready(function () {
    $('#tableData').DataTable({
        "paging": false,
        "language": {
            "info": "_TOTAL_ items",
        },
        "columnDefs": [
            { "targets": 0, "orderable": false },
            { "targets": 4, "orderable": false },
            { "orderSequence": ["desc", "asc"], "targets": [1] }
        ],
        order: [[1, "asc"]]
    });

    $('#download-zip-button').click(function (e) {
        e.preventDefault();
        var currentDirectory = document.title.replace("digiup - ", "");
        var downloadUrl = `/download?path=${encodeURIComponent(currentDirectory)}`;
    
        var downloadProgressBarContainer = createProgressBar();
        var downloadProgressBar = downloadProgressBarContainer.querySelector('progress');
        var downloadProgressBarLabel = downloadProgressBarContainer.querySelector('.progress-bar-label');
    
        // Show initial message for zipping progress
        downloadProgressBarLabel.innerHTML = 'Zipping...and Downloading. Please Wait!!!';
    
        fetch(downloadUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
    
                const contentLength = +response.headers.get('Content-Length');
                folderName = response.headers.get('X-Folder-Name');
                const reader = response.body.getReader();
                const chunks = [];
    
                function readChunk() {
                    return reader.read().then(({ done, value }) => {
                        if (done) {
                            return chunks;
                        }
    
                        chunks.push(value);
                        const receivedLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
                        const progress = (receivedLength / contentLength) * 100;
                        downloadProgressBar.value = progress
    
                        // Update progress message for zipping
                        downloadProgressBarLabel.innerHTML = `Progress: ${progress.toFixed(2)}%`;
    
                        return readChunk();
                    });
                }
    
                return readChunk();
            })
            .then(chunks => {
                const blob = new Blob(chunks);
                const arrayBufferPromise = blob.arrayBuffer();
                return arrayBufferPromise;
            })
            .then(arrayBuffer => {
                const blob = new Blob([arrayBuffer]);
    
                // Update progress message for overall download progress
                downloadProgressBarLabel.innerHTML = 'Downloading...';
    
                const downloadLink = document.createElement('a');
                downloadLink.href = URL.createObjectURL(blob);
                downloadLink.download = `${folderName}.zip`;
                downloadLink.click();
    
                // Remove the progress bar after download is complete
                document.body.removeChild(downloadProgressBarContainer);
            })
            .catch(error => {
                console.error('Error downloading file:', error);
    
                // Remove the progress bar on error
                document.body.removeChild(downloadProgressBarContainer);
            });
    });
    

    
    // function createProgressBar() {
    //     var progressBarContainer = document.createElement('div');
    //     progressBarContainer.className = 'progress-bar-container';
    //     progressBarContainer.style.position = 'absolute';
    //     progressBarContainer.style.top = topPosition || '0';
    //     progressBarContainer.style.left = leftPosition || '0';
        

    //     var progressBar = document.createElement('progress');
    //     progressBar.value = 0;
    //     progressBar.max = 100;
    //     progressBarContainer.appendChild(progressBar);

    //     var progressBarLabel = document.createElement('div');
    //     progressBarLabel.className = 'progress-bar-label';
    //     progressBarContainer.appendChild(progressBarLabel);

    //     document.body.appendChild(progressBarContainer);

    //     return progressBarContainer;
    // }


        // Function to create a new folder
        function createNewFolder() {
            var folderName = prompt("Enter a name for the new folder:");
    
            if (folderName !== null && folderName.trim() !== "") {
                // Get the current directory from the page title
                var currentDirectory = document.title.replace("digiup - ", "");
    
                // Check if the folder already exists in the table
                var folderAlreadyExists = false;
                var directoryFiles = document.querySelectorAll('.table_p tbody tr td:nth-child(2) a');
                for (var i = 0; i < directoryFiles.length; i++) {
                    if (directoryFiles[i].innerText === folderName) {
                        folderAlreadyExists = true;
                        break;
                    }
                }
    
                if (folderAlreadyExists) {
                    alert(`Folder "${folderName}" already exists.`);
                } else {
                    // Continue with folder creation logic
                    var createFolderUrl = `/create_folder`;
                    $.ajax({
                        type: "POST",
                        url: createFolderUrl,
                        data: { folder_name: folderName, path: currentDirectory },
                        success: function (response) {
                            // Reload the page to see the changes (you can update this as needed)
                            location.reload();
                        },
                        error: function (error) {
                            alert("An error occurred while creating the folder.");
                        }
                    });
                }
            }
        }
    
        // Attach the createNewFolder function to the "New Folder" button click event
        $('#new-folder-button').click(function (e) {
            e.preventDefault(); // Prevent the default behavior of a button inside a form
            createNewFolder();
        });


// Create a combined progress bar
// combinedProgressBar = document.createElement('progress');
// combinedProgressBar.value = 0;
// combinedProgressBar.max = 100;

// combinedProgressBarLabel = document.createElement('div');
// combinedProgressBarLabel.className = 'progress-bar-label';

// document.body.appendChild(combinedProgressBar);
// document.body.appendChild(combinedProgressBarLabel);

// function updateCombinedProgressBar(progress) {
//     combinedProgressBar.value = progress;
//     combinedProgressBarLabel.innerHTML = `Progress: ${progress}%`;
// }

    // Event listener for file upload
    $('.uploadForm').submit(function (e) {
        e.preventDefault();

        var formData = new FormData(this);

        var uploadProgressBarContainer = createProgressBar();
        var uploadProgressBar = uploadProgressBarContainer.querySelector('progress');
        var uploadProgressBarLabel = uploadProgressBarContainer.querySelector('.progress-bar-label');

        $.ajax({
            type: 'POST',
            url: '/upload',
            data: formData,
            contentType: false,
            processData: false,
            xhr: function () {
                var xhr = $.ajaxSettings.xhr();
                if (xhr.upload) {
                    xhr.upload.addEventListener('progress', function (event) {
                        if (event.lengthComputable) {
                            var progress = (event.loaded / event.total) * 100;
                            uploadProgressBar.value = progress;
                            uploadProgressBarLabel.innerHTML = 'Upload Progress: ' + progress.toFixed(2) + '%';
                        }
                    }, false);
                }
                return xhr;
            },
            success: function (response) {
                // Handle upload success
                // ...
                // Remove the progress bar after upload is complete
                document.body.removeChild(uploadProgressBarContainer);
            },
            error: function (error) {
                console.error('Error uploading file:', error);
            
                // Display a user-friendly error message
                alert('An error occurred while uploading the file. Please try again.');
            
                // Remove the progress bar on error
                document.body.removeChild(uploadProgressBarContainer);
            },
        });
    });

    function createProgressBar() {
        var progressBarContainer = document.createElement('div');
        progressBarContainer.className = 'progress-bar-container';
        

        var progressBar = document.createElement('progress');
        progressBar.value = 0;
        progressBar.max = 100;
        progressBarContainer.appendChild(progressBar);

        var progressBarLabel = document.createElement('div');
        progressBarLabel.className = 'progress-bar-label';
        progressBarContainer.appendChild(progressBarLabel);

        document.body.appendChild(progressBarContainer);

        return progressBarContainer;
    }


    var inputs = document.querySelectorAll('.uploadFile');

    Array.prototype.forEach.call(inputs, function (input) {
        var label = input.nextElementSibling,
            labelVal = label.innerHTML;

        input.addEventListener('change', function (e) {
            var fileName = '';
            if (this.files && this.files.length > 1)
                fileName = (this.getAttribute('data-multiple-caption') || '').replace('{count}', this.files.length);
            else {
                fileName = e.target.value.split("\\").pop();
            }

            if (fileName)
                label.querySelector('span').innerHTML = fileName;
            else
                label.innerHTML = labelVal;
        });
    });
});
