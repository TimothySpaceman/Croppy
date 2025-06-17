let originalImage = null;
let cropData = { x: 0, y: 0, width: 100, height: 100 };
let isDragging = false;
let isResizing = false;
let dragStart = { x: 0, y: 0 };
let resizeHandle = null;
const imageInput = document.getElementById('imageInput');
const originalImageEl = document.getElementById('originalImage');
const cropContainer = document.getElementById('cropContainer');
const cropOverlay = document.getElementById('cropOverlay');
const cropSelection = document.getElementById('cropSelection');
const cropButton = document.getElementById('cropButton');
const resultSection = document.getElementById('resultSection');
const resultImage = document.getElementById('resultImage');
const resultInfo = document.getElementById('resultInfo');
const targetWidth = document.getElementById('targetWidth');
const targetHeight = document.getElementById('targetHeight');

imageInput.addEventListener('change', handleImageUpload);
cropButton.addEventListener('click', cropImage);

// Add event listener for dimension changes
targetWidth.addEventListener('input', updateCropAspectRatio);
targetHeight.addEventListener('input', updateCropAspectRatio);

targetWidth.value = localStorage.getItem("target-width", 300);;
targetHeight.value = localStorage.getItem("target-height", 300);;

targetWidth.addEventListener('input', function() {
    localStorage.setItem("target-width", this.value);
});
targetHeight.addEventListener('input', function() {
    localStorage.setItem("target-height", this.value);
});

function updateCropAspectRatio() {
    if (cropContainer.style.display !== 'none') {
        initializeCropArea();
    }
}

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        originalImage = new Image();
        originalImage.onload = function () {
            originalImageEl.src = e.target.result;
            cropContainer.style.display = 'block';
            resultSection.style.display = 'none';
            initializeCropArea();
        };
        originalImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function initializeCropArea() {
    setTimeout(() => {
        const rect = originalImageEl.getBoundingClientRect();
        const containerRect = originalImageEl.parentElement.getBoundingClientRect();

        // Calculate relative position within the image editor
        const imageRect = {
            left: rect.left - containerRect.left,
            top: rect.top - containerRect.top,
            width: rect.width,
            height: rect.height
        };

        // Get target aspect ratio
        const targetW = parseInt(targetWidth.value) || 300;
        const targetH = parseInt(targetHeight.value) || 300;
        const targetAspectRatio = targetW / targetH;

        // Initialize crop area maintaining aspect ratio
        let cropWidth, cropHeight;
        const maxSize = Math.min(imageRect.width * 0.6, imageRect.height * 0.6);

        if (targetAspectRatio > 1) {
            // Wider than tall
            cropWidth = maxSize;
            cropHeight = maxSize / targetAspectRatio;
        } else {
            // Taller than wide or square
            cropHeight = maxSize;
            cropWidth = maxSize * targetAspectRatio;
        }

        cropData = {
            x: (imageRect.width - cropWidth) / 2,
            y: (imageRect.height - cropHeight) / 2,
            width: cropWidth,
            height: cropHeight
        };

        updateCropSelection();
        addEventListeners();
    }, 100);
}

function updateCropSelection() {
    cropSelection.style.left = cropData.x + 'px';
    cropSelection.style.top = cropData.y + 'px';
    cropSelection.style.width = cropData.width + 'px';
    cropSelection.style.height = cropData.height + 'px';
}

function addEventListeners() {
    // Crop selection dragging
    cropSelection.addEventListener('mousedown', startDrag);

    // Handle resizing
    const handles = cropSelection.querySelectorAll('.crop-handle');
    handles.forEach(handle => {
        handle.addEventListener('mousedown', startResize);
    });

    // Global mouse events
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopDragResize);
}

function startDrag(e) {
    if (e.target.classList.contains('crop-handle')) return;

    isDragging = true;
    dragStart.x = e.clientX - cropData.x;
    dragStart.y = e.clientY - cropData.y;
    e.preventDefault();
}

function startResize(e) {
    isResizing = true;
    resizeHandle = e.target.classList[1]; // nw, ne, sw, se
    dragStart.x = e.clientX;
    dragStart.y = e.clientY;
    e.preventDefault();
    e.stopPropagation();
}

function handleMouseMove(e) {
    if (!isDragging && !isResizing) return;

    const rect = originalImageEl.getBoundingClientRect();
    const containerRect = originalImageEl.parentElement.getBoundingClientRect();

    const imageRect = {
        left: rect.left - containerRect.left,
        top: rect.top - containerRect.top,
        width: rect.width,
        height: rect.height
    };

    if (isDragging) {
        let newX = e.clientX - dragStart.x;
        let newY = e.clientY - dragStart.y;

        // Constrain to image bounds
        newX = Math.max(0, Math.min(newX, imageRect.width - cropData.width));
        newY = Math.max(0, Math.min(newY, imageRect.height - cropData.height));

        cropData.x = newX;
        cropData.y = newY;
    }

    if (isResizing) {
        const targetW = parseInt(targetWidth.value) || 300;
        const targetH = parseInt(targetHeight.value) || 300;
        const targetAspectRatio = targetW / targetH;

        // Convert mouse position to image coordinates
        const mouseX = e.clientX - rect.left - (rect.left - containerRect.left);
        const mouseY = e.clientY - rect.top - (rect.top - containerRect.top);

        // Determine fixed corner based on resize handle
        let fixedX, fixedY, newX, newY, newWidth, newHeight;

        switch (resizeHandle) {
            case 'nw':
                // Fixed corner is bottom-right
                fixedX = cropData.x + cropData.width;
                fixedY = cropData.y + cropData.height;
                newX = Math.max(0, Math.min(mouseX, fixedX - 20));
                newY = Math.max(0, Math.min(mouseY, fixedY - 20));
                break;
            case 'ne':
                // Fixed corner is bottom-left
                fixedX = cropData.x;
                fixedY = cropData.y + cropData.height;
                newX = Math.min(imageRect.width, Math.max(mouseX, fixedX + 20));
                newY = Math.max(0, Math.min(mouseY, fixedY - 20));
                break;
            case 'sw':
                // Fixed corner is top-right
                fixedX = cropData.x + cropData.width;
                fixedY = cropData.y;
                newX = Math.max(0, Math.min(mouseX, fixedX - 20));
                newY = Math.min(imageRect.height, Math.max(mouseY, fixedY + 20));
                break;
            case 'se':
                // Fixed corner is top-left
                fixedX = cropData.x;
                fixedY = cropData.y;
                newX = Math.min(imageRect.width, Math.max(mouseX, fixedX + 20));
                newY = Math.min(imageRect.height, Math.max(mouseY, fixedY + 20));
                break;
        }

        // Calculate width and height from the dragged corner to fixed corner
        const rawWidth = Math.abs(newX - fixedX);
        const rawHeight = Math.abs(newY - fixedY);

        // Determine which dimension should drive the size (maintain aspect ratio)
        const currentRatio = rawWidth / rawHeight;

        if (currentRatio > targetAspectRatio) {
            // Width is limiting factor
            newHeight = rawHeight;
            newWidth = newHeight * targetAspectRatio;
        } else {
            // Height is limiting factor
            newWidth = rawWidth;
            newHeight = newWidth / targetAspectRatio;
        }

        // Ensure minimum size
        if (newWidth < 20 || newHeight < 20) {
            newWidth = Math.max(20, newWidth);
            newHeight = newWidth / targetAspectRatio;
        }

        // Calculate final position based on which corner is being dragged
        let finalX, finalY;

        switch (resizeHandle) {
            case 'nw':
                finalX = fixedX - newWidth;
                finalY = fixedY - newHeight;
                break;
            case 'ne':
                finalX = fixedX;
                finalY = fixedY - newHeight;
                break;
            case 'sw':
                finalX = fixedX - newWidth;
                finalY = fixedY;
                break;
            case 'se':
                finalX = fixedX;
                finalY = fixedY;
                break;
        }

        // Constrain to image bounds
        finalX = Math.max(0, Math.min(finalX, imageRect.width - newWidth));
        finalY = Math.max(0, Math.min(finalY, imageRect.height - newHeight));

        // If constrained, recalculate size
        if (finalX === 0 || finalX === imageRect.width - newWidth ||
            finalY === 0 || finalY === imageRect.height - newHeight) {

            const maxWidth = imageRect.width - finalX;
            const maxHeight = imageRect.height - finalY;

            newWidth = Math.min(newWidth, maxWidth);
            newHeight = Math.min(newHeight, maxHeight);

            // Re-apply aspect ratio
            if (newWidth / newHeight > targetAspectRatio) {
                newWidth = newHeight * targetAspectRatio;
            } else {
                newHeight = newWidth / targetAspectRatio;
            }
        }

        cropData.x = finalX;
        cropData.y = finalY;
        cropData.width = newWidth;
        cropData.height = newHeight;
    }

    updateCropSelection();
}

function stopDragResize() {
    isDragging = false;
    isResizing = false;
    resizeHandle = null;
}

function cropImage() {
    if (!originalImage) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const targetW = parseInt(targetWidth.value) || 300;
    const targetH = parseInt(targetHeight.value) || 300;

    canvas.width = targetW;
    canvas.height = targetH;

    // Calculate scale factors
    const scaleX = originalImage.naturalWidth / originalImageEl.clientWidth;
    const scaleY = originalImage.naturalHeight / originalImageEl.clientHeight;

    // Calculate actual crop coordinates on the original image
    const sourceX = cropData.x * scaleX;
    const sourceY = cropData.y * scaleY;
    const sourceWidth = cropData.width * scaleX;
    const sourceHeight = cropData.height * scaleY;

    // Draw the cropped and resized image
    ctx.drawImage(
        originalImage,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, targetW, targetH
    );

    // Display result
    resultImage.src = canvas.toDataURL();
    resultInfo.textContent = `Обрізано до ${targetW}×${targetH} пікселів з обраної ділянки (${Math.round(sourceWidth)}×${Math.round(sourceHeight)} пікселів)`;
    resultSection.style.display = 'block';
}