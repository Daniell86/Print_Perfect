/**
 * PrintPerfect - Print Adjuster JavaScript
 * Advanced image processing and print optimization
 */

// Global variables
let currentImage = null;
let originalImage = null;
let canvas = null;
let ctx = null;
let zoomLevel = 1;
let panX = 0;
let panY = 0;
let isDragging = false;
let lastX = 0;
let lastY = 0;
let rotation = 0;
let flipH = 1;
let flipV = 1;

// Crop tool variables
let isCropping = false;
let cropData = { x: 0, y: 0, width: 0, height: 0 };
let cropDragging = false;
let cropResizing = false;
let cropResizeHandle = '';
let cropStartX = 0;
let cropStartY = 0;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeCanvas();
    setupEventListeners();
    setupSliders();
});

// Initialize canvas
function initializeCanvas() {
    canvas = document.getElementById('previewCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
    }
}

// Setup all event listeners
function setupEventListeners() {
    // Upload controls
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleDrop);
    }
    
    if (browseBtn && fileInput) {
        browseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });
    }
    
    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', () => fileInput.click());
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    // Tool controls
    setupToolControls();
    
    // Preview controls
    setupPreviewControls();
    
    // Crop controls
    setupCropControls();
    
    // Settings controls
    setupSettingsControls();
}

// Handle drag over
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('dragover');
}

// Handle drag leave
function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
}

// Handle file drop
function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFiles(files);
    }
}

// Handle file selection
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFiles(files);
    }
}

// Handle uploaded files
function handleFiles(files) {
    const file = files[0]; // For now, handle single file
    
    if (!file.type.match('image.*')) {
        showToast('Please select an image file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        loadImage(e.target.result, file);
    };
    reader.readAsDataURL(file);
}

// Load image into canvas
function loadImage(src, file) {
    const img = new Image();
    img.onload = function() {
        originalImage = img;
        currentImage = img;
        
        // Reset transformations
        rotation = 0;
        flipH = 1;
        flipV = 1;
        zoomLevel = 1;
        panX = 0;
        panY = 0;
        
        // Setup canvas
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image
        drawImage();
        
        // Show preview
        document.getElementById('previewPlaceholder').style.display = 'none';
        document.getElementById('previewImageWrapper').classList.add('active');
        
        // Enable controls
        enableControls();
        
        // Update file info
        updateFileInfo(file, img);
        
        // Initialize crop area
        initCropArea();
        
        showToast('Image loaded successfully', 'success');
    };
    img.src = src;
}

// Draw image on canvas
function drawImage() {
    if (!currentImage || !ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply transformations
    ctx.save();
    
    // Move to center
    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);
    
    // Apply flip
    ctx.scale(flipH, flipV);
    
    // Draw image centered
    ctx.drawImage(currentImage, -currentImage.width / 2, -currentImage.height / 2);
    
    ctx.restore();
    
    // Apply filters and adjustments
    applyAdjustments();
}

// Apply image adjustments
function applyAdjustments() {
    if (!ctx) return;
    
    const brightness = parseInt(document.getElementById('brightnessSlider')?.value || 0);
    const contrast = parseInt(document.getElementById('contrastSlider')?.value || 0);
    const saturation = parseInt(document.getElementById('saturationSlider')?.value || 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Apply brightness and contrast
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    
    for (let i = 0; i < data.length; i += 4) {
        // Brightness
        data[i] += brightness;     // R
        data[i + 1] += brightness; // G
        data[i + 2] += brightness; // B
        
        // Contrast
        data[i] = factor * (data[i] - 128) + 128;
        data[i + 1] = factor * (data[i + 1] - 128) + 128;
        data[i + 2] = factor * (data[i + 2] - 128) + 128;
        
        // Clamp values
        data[i] = Math.min(255, Math.max(0, data[i]));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1]));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2]));
    }
    
    // Apply color mode
    const colorMode = document.getElementById('colorMode')?.value;
    if (colorMode === 'grayscale') {
        for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
        }
    } else if (colorMode === 'bw') {
        for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            const bw = gray > 128 ? 255 : 0;
            data[i] = bw;
            data[i + 1] = bw;
            data[i + 2] = bw;
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

// Enable tool controls
function enableControls() {
    const buttons = ['cropBtn', 'processBtn', 'printBtn', 'downloadBtn', 'resetBtn',
                     'zoomOutBtn', 'zoomInBtn', 'fitScreenBtn', 'actualSizeBtn',
                     'rotateLeftBtn', 'rotateRightBtn', 'flipHBtn', 'flipVBtn', 'gridToggleBtn'];
    
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = false;
    });
}

// Setup tool controls
function setupToolControls() {
    // Crop button
    const cropBtn = document.getElementById('cropBtn');
    if (cropBtn) {
        cropBtn.addEventListener('click', toggleCropMode);
    }
    
    // Process button
    const processBtn = document.getElementById('processBtn');
    if (processBtn) {
        processBtn.addEventListener('click', processImage);
    }
    
    // Print button
    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
        printBtn.addEventListener('click', showPrintPreview);
    }
    
    // Download button
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadImage);
    }
    
    // Reset button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetImage);
    }
}

// Setup preview controls
function setupPreviewControls() {
    // Zoom controls
    document.getElementById('zoomInBtn')?.addEventListener('click', () => zoomImage(1.2));
    document.getElementById('zoomOutBtn')?.addEventListener('click', () => zoomImage(0.8));
    document.getElementById('fitScreenBtn')?.addEventListener('click', fitToScreen);
    document.getElementById('actualSizeBtn')?.addEventListener('click', actualSize);
    
    // Transform controls
    document.getElementById('rotateLeftBtn')?.addEventListener('click', () => rotateImage(-90));
    document.getElementById('rotateRightBtn')?.addEventListener('click', () => rotateImage(90));
    document.getElementById('flipHBtn')?.addEventListener('click', flipHorizontal);
    document.getElementById('flipVBtn')?.addEventListener('click', flipVertical);
    document.getElementById('gridToggleBtn')?.addEventListener('click', toggleGrid);
}

// Zoom image
function zoomImage(factor) {
    zoomLevel *= factor;
    zoomLevel = Math.max(0.1, Math.min(5, zoomLevel));
    updateZoomLevel();
    applyZoom();
}

// Update zoom level display
function updateZoomLevel() {
    const zoomLevelEl = document.getElementById('zoomLevel');
    if (zoomLevelEl) {
        zoomLevelEl.textContent = Math.round(zoomLevel * 100) + '%';
    }
}

// Apply zoom
function applyZoom() {
    if (canvas) {
        canvas.style.transform = `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`;
    }
}

// Fit to screen
function fitToScreen() {
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    updateZoomLevel();
    applyZoom();
}

// Actual size
function actualSize() {
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    updateZoomLevel();
    applyZoom();
}

// Rotate image
function rotateImage(angle) {
    rotation = (rotation + angle) % 360;
    drawImage();
}

// Flip horizontal
function flipHorizontal() {
    flipH *= -1;
    drawImage();
}

// Flip vertical
function flipVertical() {
    flipV *= -1;
    drawImage();
}

// Toggle grid
function toggleGrid() {
    const gridOverlay = document.getElementById('gridOverlay');
    if (gridOverlay) {
        gridOverlay.classList.toggle('active');
    }
}

// Setup crop controls
function setupCropControls() {
    const applyCropBtn = document.getElementById('applyCropBtn');
    const cancelCropBtn = document.getElementById('cancelCropBtn');
    
    if (applyCropBtn) {
        applyCropBtn.addEventListener('click', applyCrop);
    }
    
    if (cancelCropBtn) {
        cancelCropBtn.addEventListener('click', cancelCrop);
    }
}

// Toggle crop mode
function toggleCropMode() {
    isCropping = !isCropping;
    const cropTool = document.getElementById('cropTool');
    const cropBtn = document.getElementById('cropBtn');
    
    if (cropTool && cropBtn) {
        if (isCropping) {
            cropTool.classList.add('active');
            cropBtn.innerHTML = '<i class="fas fa-crop"></i> Finish Crop';
            cropBtn.classList.add('btn-accent');
        } else {
            cropTool.classList.remove('active');
            cropBtn.innerHTML = '<i class="fas fa-crop"></i> Crop';
            cropBtn.classList.remove('btn-accent');
        }
    }
}

// Initialize crop area
function initCropArea() {
    if (!canvas) return;
    
    const containerWidth = canvas.offsetWidth;
    const containerHeight = canvas.offsetHeight;
    
    cropData.width = containerWidth * 0.8;
    cropData.height = containerHeight * 0.8;
    cropData.x = (containerWidth - cropData.width) / 2;
    cropData.y = (containerHeight - cropData.height) / 2;
    
    updateCropArea();
}

// Update crop area
function updateCropArea() {
    const cropArea = document.getElementById('cropArea');
    if (cropArea) {
        cropArea.style.left = cropData.x + 'px';
        cropArea.style.top = cropData.y + 'px';
        cropArea.style.width = cropData.width + 'px';
        cropArea.style.height = cropData.height + 'px';
        
        // Update dimensions display
        const cropDimensions = document.getElementById('cropDimensions');
        if (cropDimensions) {
            cropDimensions.textContent = `${Math.round(cropData.width)} × ${Math.round(cropData.height)} px`;
        }
    }
}

// Apply crop
function applyCrop() {
    if (!canvas || !ctx) return;
    
    // Create temporary canvas
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCanvas.width = cropData.width;
    tempCanvas.height = cropData.height;
    
    // Draw cropped image
    tempCtx.drawImage(canvas, cropData.x, cropData.y, cropData.width, cropData.height, 0, 0, cropData.width, cropData.height);
    
    // Update main canvas
    canvas.width = cropData.width;
    canvas.height = cropData.height;
    ctx.drawImage(tempCanvas, 0, 0);
    
    // Exit crop mode
    toggleCropMode();
    
    showToast('Crop applied successfully', 'success');
}

// Cancel crop
function cancelCrop() {
    toggleCropMode();
}

// Setup sliders
function setupSliders() {
    // DPI slider
    const dpiSlider = document.getElementById('dpiSlider');
    const dpiValue = document.getElementById('dpiValue');
    if (dpiSlider && dpiValue) {
        dpiSlider.addEventListener('input', function() {
            dpiValue.textContent = this.value + ' DPI';
            updateQualityIndicator();
        });
    }
    
    // JPG Quality slider
    const jpgQualitySlider = document.getElementById('jpgQualitySlider');
    const jpgQualityValue = document.getElementById('jpgQualityValue');
    if (jpgQualitySlider && jpgQualityValue) {
        jpgQualitySlider.addEventListener('input', function() {
            jpgQualityValue.textContent = this.value + '%';
        });
    }
    
    // Adjustment sliders
    const adjustmentSliders = [
        { id: 'brightnessSlider', valueId: 'brightnessValue' },
        { id: 'contrastSlider', valueId: 'contrastValue' },
        { id: 'saturationSlider', valueId: 'saturationValue' },
        { id: 'sharpnessSlider', valueId: 'sharpnessValue' },
        { id: 'hueSlider', valueId: 'hueValue' }
    ];
    
    adjustmentSliders.forEach(slider => {
        const sliderEl = document.getElementById(slider.id);
        const valueEl = document.getElementById(slider.valueId);
        
        if (sliderEl && valueEl) {
            sliderEl.addEventListener('input', function() {
                let displayValue = this.value;
                if (slider.id === 'hueSlider') {
                    displayValue += '°';
                }
                valueEl.textContent = displayValue;
                drawImage();
            });
        }
    });
}

// Setup settings controls
function setupSettingsControls() {
    // Orientation buttons
    const portraitBtn = document.getElementById('portraitBtn');
    const landscapeBtn = document.getElementById('landscapeBtn');
    
    if (portraitBtn && landscapeBtn) {
        portraitBtn.addEventListener('click', function() {
            portraitBtn.classList.add('active');
            landscapeBtn.classList.remove('active');
        });
        
        landscapeBtn.addEventListener('click', function() {
            landscapeBtn.classList.add('active');
            portraitBtn.classList.remove('active');
        });
    }
    
    // DPI preset buttons
    const dpiPresetBtns = document.querySelectorAll('[data-dpi]');
    dpiPresetBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const dpi = this.getAttribute('data-dpi');
            const dpiSlider = document.getElementById('dpiSlider');
            const dpiValue = document.getElementById('dpiValue');
            
            if (dpiSlider && dpiValue) {
                dpiSlider.value = dpi;
                dpiValue.textContent = dpi + ' DPI';
                updateQualityIndicator();
            }
        });
    });
    
    // Auto enhance button
    const autoEnhanceBtn = document.getElementById('autoEnhanceBtn');
    if (autoEnhanceBtn) {
        autoEnhanceBtn.addEventListener('click', autoEnhance);
    }
    
    // Reset adjustments button
    const resetAdjustmentsBtn = document.getElementById('resetAdjustmentsBtn');
    if (resetAdjustmentsBtn) {
        resetAdjustmentsBtn.addEventListener('click', resetAdjustments);
    }
}

// Auto enhance image
function autoEnhance() {
    document.getElementById('brightnessSlider').value = 10;
    document.getElementById('contrastSlider').value = 15;
    document.getElementById('saturationSlider').value = 10;
    document.getElementById('sharpnessSlider').value = 20;
    
    document.getElementById('brightnessValue').textContent = '10';
    document.getElementById('contrastValue').textContent = '15';
    document.getElementById('saturationValue').textContent = '10';
    document.getElementById('sharpnessValue').textContent = '20';
    
    drawImage();
    showToast('Auto enhance applied', 'success');
}

// Reset adjustments
function resetAdjustments() {
    document.getElementById('brightnessSlider').value = 0;
    document.getElementById('contrastSlider').value = 0;
    document.getElementById('saturationSlider').value = 0;
    document.getElementById('sharpnessSlider').value = 0;
    document.getElementById('hueSlider').value = 0;
    
    document.getElementById('brightnessValue').textContent = '0';
    document.getElementById('contrastValue').textContent = '0';
    document.getElementById('saturationValue').textContent = '0';
    document.getElementById('sharpnessValue').textContent = '0';
    document.getElementById('hueValue').textContent = '0°';
    
    drawImage();
    showToast('Adjustments reset', 'success');
}

// Update file info
function updateFileInfo(file, img) {
    // Original size
    const originalSize = document.getElementById('originalSize');
    if (originalSize) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        originalSize.textContent = sizeMB + ' MB';
    }
    
    // Current dimensions
    const currentDimensions = document.getElementById('currentDimensions');
    if (currentDimensions) {
        currentDimensions.textContent = `${img.width} × ${img.height} px`;
    }
    
    updateQualityIndicator();
}

// Update quality indicator
function updateQualityIndicator() {
    const qualityIndicator = document.getElementById('qualityIndicator');
    if (!qualityIndicator || !currentImage) return;
    
    const dpi = parseInt(document.getElementById('dpiSlider')?.value || 300);
    
    let quality = 'Excellent';
    let className = 'success';
    
    if (dpi < 150) {
        quality = 'Poor';
        className = 'error';
    } else if (dpi < 200) {
        quality = 'Fair';
        className = 'warning';
    } else if (dpi < 300) {
        quality = 'Good';
        className = 'success';
    }
    
    qualityIndicator.textContent = quality;
    qualityIndicator.className = `info-value ${className}`;
}

// Process image
function processImage() {
    if (!canvas) {
        showToast('Please upload an image first', 'error');
        return;
    }
    
    drawImage();
    showToast('Image processed successfully', 'success');
}

// Show print preview
function showPrintPreview() {
    if (!canvas) {
        showToast('Please upload an image first', 'error');
        return;
    }
    
    const printModal = document.getElementById('printModal');
    const printCanvas = document.getElementById('printCanvas');
    
    if (printModal && printCanvas) {
        // Copy current canvas to print canvas
        const printCtx = printCanvas.getContext('2d');
        printCanvas.width = canvas.width;
        printCanvas.height = canvas.height;
        printCtx.drawImage(canvas, 0, 0);
        
        // Update print info
        const paperSize = document.getElementById('paperSize');
        const dpiSlider = document.getElementById('dpiSlider');
        
        document.getElementById('printPaperSize').textContent = paperSize?.options[paperSize.selectedIndex].text || '-';
        document.getElementById('printResolution').textContent = (dpiSlider?.value || '300') + ' DPI';
        document.getElementById('printDimensions').textContent = `${canvas.width} × ${canvas.height} px`;
        
        const portraitBtn = document.getElementById('portraitBtn');
        const orientation = portraitBtn?.classList.contains('active') ? 'Portrait' : 'Landscape';
        document.getElementById('printOrientation').textContent = orientation;
        
        // Show modal
        printModal.classList.add('active');
    }
}

// Download image
function downloadImage() {
    if (!canvas) {
        showToast('Please upload an image first', 'error');
        return;
    }
    
    const outputFormat = document.getElementById('outputFormat')?.value || 'jpg';
    const jpgQuality = parseInt(document.getElementById('jpgQualitySlider')?.value || 90) / 100;
    
    let mimeType = 'image/jpeg';
    let extension = '.jpg';
    
    if (outputFormat === 'png') {
        mimeType = 'image/png';
        extension = '.png';
    } else if (outputFormat === 'webp') {
        mimeType = 'image/webp';
        extension = '.webp';
    }
    
    canvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `print-optimized-${Date.now()}${extension}`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        
        showToast('Image downloaded successfully', 'success');
    }, mimeType, jpgQuality);
}

// Reset image
function resetImage() {
    if (!originalImage) return;
    
    currentImage = originalImage;
    rotation = 0;
    flipH = 1;
    flipV = 1;
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    
    drawImage();
    resetAdjustments();
    
    showToast('Image reset to original', 'success');
}

// Close print modal
document.getElementById('closeModal')?.addEventListener('click', function() {
    document.getElementById('printModal')?.classList.remove('active');
});

document.getElementById('closePrintBtn')?.addEventListener('click', function() {
    document.getElementById('printModal')?.classList.remove('active');
});

// Start print
document.getElementById('startPrintBtn')?.addEventListener('click', function() {
    window.print();
});

// Close modal on outside click
document.getElementById('printModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.remove('active');
    }
});
