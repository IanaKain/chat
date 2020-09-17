/* eslint-disable no-unused-vars */
let processedFiles = [];
let currentFileCount = 0;
const maxFileCount = 6;

function addFiles(files) {
  if (files.length === 0) { return; }
  const imagePreview = document.getElementById('images-list');

  currentFileCount += (files.length > maxFileCount ? maxFileCount : files.length);

  for (let i = 0; i < currentFileCount; i++) {
    const file = files[i];

    if (file) {
      // give each file a unique token
      file.token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      imagePreview.classList.add('active');
      processFile(file);
    }
  }
}

// Append a file object to the image preview container
function processFile(initialFile) {
  function renderFilePreview(file) {
    const imagePreview = document.getElementById('images-list');

    imagePreview.innerHTML += `
        <div class="image-list_preview" data-upload-token="${file.file.token}" style="background-image: url('${file.preview}');">
          <span class="image-clear-wrapper">
            <span class="image-clear-icon" data-upload-token="${file.file.token}">
              &times;
            </span>
          </span>
        </div>
      `;
  }

  if (initialFile.base64) {
    return renderFilePreview(initialFile);
  }

  if (!initialFile.base64) {
    return new Promise((res) => {
      const result = {file: null, base64: '', preview: ''};
      const targetFile = initialFile;
      const reader = new FileReader();

      reader.onload = ({target}) => {
        result.file = initialFile;
        result.preview = target.result;
        result.base64 = target.result;
        processedFiles.push(result);

        res(result);
      };

      reader.readAsDataURL(targetFile);
    })
      .then((processedFile) => {
        renderFilePreview(processedFile);
      })
      .catch((error) => console.error('Error while file processing. ', error));
  }
}

function clearPreviewPanel() {
  const uploadFileContainer = document.getElementById('upload-file-container');
  const inputFile = uploadFileContainer.querySelector('input[type="file"]');
  const imagePreview = document.getElementById('images-list');

  inputFile.value = '';
  imagePreview.classList.remove('active');
  processedFiles = [];
  imagePreview.innerHTML = '';
  currentFileCount = 0;
}

function deleteFileByIndex(index) {
  if (!processedFiles[index]) {
    throw new Error(`There is no file at index ${index}`);
  }
  processedFiles.splice(index, 1);
  // refresh preview panel
  const imagePreview = document.getElementById('images-list');

  imagePreview.innerHTML = '';
  currentFileCount = processedFiles.length;
  processedFiles.forEach((file) => processFile(file));

  if (!processedFiles.length) {
    clearPreviewPanel();
  }
}
