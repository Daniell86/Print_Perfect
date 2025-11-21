/**
 * PrintPerfect - A4 Canvas Manager
 * Multi-image layout system with drag, resize, and arrange features
 */

class A4CanvasManager {
    constructor() {
        // A4 dimensions in pixels at 96 DPI (screen resolution)
        this.A4_WIDTH = 794;  // 210mm at 96 DPI
        this.A4_HEIGHT = 1123; // 297mm at 96 DPI
        
        this.canvas = null;
        this.ctx = null;
        this.images = []; // Array to store multiple images with their properties
        this.selectedImage = null;
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.scale = 1; // For fitting A4 in preview area
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.drawCanvas();
    }
    
    setupCanvas() {
        this.canvas = document.getElementById('a4Canvas');
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas to A4 size
        this.canvas.width = this.A4_WIDTH;
        this.canvas.height = this.A4_HEIGHT;
        
        // Calculate scale to fit in preview area
        const container = this.canvas.parentElement;
        const containerWidth = container.offsetWidth - 40;
        const containerHeight = container.offsetHeight - 40;
        
        const scaleX = containerWidth / this.A4_WIDTH;
        const scaleY = containerHeight / this.A4_HEIGHT;
        this.scale = Math.min(scaleX, scaleY, 1);
        
        // Apply scale to canvas display
        this.canvas.style.width = (this.A4_WIDTH * this.scale) + 'px';
        this.canvas.style.height = (this.A4_HEIGHT * this.scale) + 'px';
    }
    
    setupEventListeners() {
        if (!this.canvas) return;
        
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // File upload for multiple images
        const addImageBtn = document.getElementById('addImageToCanvas');
        const fileInput = document.getElementById('fileInput');
        
        if (addImageBtn && fileInput) {
            addImageBtn.addEventListener('click', () => {
                fileInput.click();
            });
            
            fileInput.addEventListener('change', (e) => {
                const files = e.target.files;
                for (let file of files) {
                    this.loadImage(file);
                }
            });
        }
        
        // Control buttons
        document.getElementById('deleteSelectedImage')?.addEventListener('click', () => {
            this.deleteSelectedImage();
        });
        
        document.getElementById('bringToFront')?.addEventListener('click', () => {
            this.bringToFront();
        });
        
        document.getElementById('sendToBack')?.addEventListener('click', () => {
            this.sendToBack();
        });
        
        document.getElementById('clearAllImages')?.addEventListener('click', () => {
            this.clearAllImages();
        });
        
        document.getElementById('downloadA4Layout')?.addEventListener('click', () => {
            this.downloadLayout();
        });
        
        document.getElementById('printA4Layout')?.addEventListener('click', () => {
            this.printLayout();
        });
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }
    
    getTouchPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY
        };
    }
    
    loadImage(file) {
        if (!file.type.match('image.*')) {
            showToast('Please select an image file', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.addImageToCanvas(img, file.name);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    addImageToCanvas(img, name) {
        // Calculate initial size (fit to 1/3 of A4 width while maintaining aspect ratio)
        const maxWidth = this.A4_WIDTH / 3;
        const maxHeight = this.A4_HEIGHT / 3;
        
        let width = img.width;
        let height = img.height;
        
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = width * ratio;
        height = height * ratio;
        
        // Position in center with slight offset for each new image
        const offset = this.images.length * 20;
        const x = (this.A4_WIDTH - width) / 2 + offset;
        const y = (this.A4_HEIGHT - height) / 2 + offset;
        
        const imageObj = {
            id: Date.now() + Math.random(),
            image: img,
            name: name,
            x: x,
            y: y,
            width: width,
            height: height,
            rotation: 0,
            selected: false
        };
        
        this.images.push(imageObj);
        this.selectImage(imageObj);
        this.drawCanvas();
        this.updateImageList();
        
        showToast(`Image "${name}" added to canvas`, 'success');
    }
    
    handleMouseDown(e) {
        const pos = this.getMousePos(e);
        
        // Check if clicking on resize handle
        const handle = this.getResizeHandle(pos.x, pos.y);
        if (handle) {
            this.isResizing = true;
            this.resizeHandle = handle;
            this.dragStartX = pos.x;
            this.dragStartY = pos.y;
            return;
        }
        
        // Check if clicking on an image
        const clickedImage = this.getImageAt(pos.x, pos.y);
        if (clickedImage) {
            this.selectImage(clickedImage);
            this.isDragging = true;
            this.dragStartX = pos.x - clickedImage.x;
            this.dragStartY = pos.y - clickedImage.y;
        } else {
            this.deselectAll();
        }
        
        this.drawCanvas();
    }
    
    handleMouseMove(e) {
        const pos = this.getMousePos(e);
        
        if (this.isResizing && this.selectedImage) {
            this.resizeSelectedImage(pos.x, pos.y);
        } else if (this.isDragging && this.selectedImage) {
            this.selectedImage.x = pos.x - this.dragStartX;
            this.selectedImage.y = pos.y - this.dragStartY;
            
            // Keep within canvas bounds
            this.selectedImage.x = Math.max(0, Math.min(this.A4_WIDTH - this.selectedImage.width, this.selectedImage.x));
            this.selectedImage.y = Math.max(0, Math.min(this.A4_HEIGHT - this.selectedImage.height, this.selectedImage.y));
            
            this.drawCanvas();
        } else {
            // Update cursor based on position
            this.updateCursor(pos.x, pos.y);
        }
    }
    
    handleMouseUp(e) {
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
        this.canvas.style.cursor = 'default';
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        const pos = this.getTouchPos(e);
        this.handleMouseDown({clientX: pos.x, clientY: pos.y, ...e});
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        const pos = this.getTouchPos(e);
        this.handleMouseMove({clientX: pos.x, clientY: pos.y, ...e});
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        this.handleMouseUp(e);
    }
    
    getImageAt(x, y) {
        // Check from top to bottom (last drawn = on top)
        for (let i = this.images.length - 1; i >= 0; i--) {
            const img = this.images[i];
            if (x >= img.x && x <= img.x + img.width &&
                y >= img.y && y <= img.y + img.height) {
                return img;
            }
        }
        return null;
    }
    
    getResizeHandle(x, y) {
        if (!this.selectedImage) return null;
        
        const img = this.selectedImage;
        const handleSize = 10;
        const handles = [
            { name: 'nw', x: img.x, y: img.y },
            { name: 'ne', x: img.x + img.width, y: img.y },
            { name: 'sw', x: img.x, y: img.y + img.height },
            { name: 'se', x: img.x + img.width, y: img.y + img.height },
            { name: 'n', x: img.x + img.width / 2, y: img.y },
            { name: 's', x: img.x + img.width / 2, y: img.y + img.height },
            { name: 'w', x: img.x, y: img.y + img.height / 2 },
            { name: 'e', x: img.x + img.width, y: img.y + img.height / 2 }
        ];
        
        for (let handle of handles) {
            const distance = Math.sqrt(Math.pow(x - handle.x, 2) + Math.pow(y - handle.y, 2));
            if (distance <= handleSize) {
                return handle.name;
            }
        }
        
        return null;
    }
    
    resizeSelectedImage(x, y) {
        if (!this.selectedImage) return;
        
        const img = this.selectedImage;
        const aspectRatio = img.width / img.height;
        
        switch (this.resizeHandle) {
            case 'se':
                img.width = Math.max(50, x - img.x);
                img.height = img.width / aspectRatio;
                break;
            case 'sw':
                const newWidth = Math.max(50, img.x + img.width - x);
                img.x = img.x + img.width - newWidth;
                img.width = newWidth;
                img.height = img.width / aspectRatio;
                break;
            case 'ne':
                img.width = Math.max(50, x - img.x);
                const newHeight = img.width / aspectRatio;
                img.y = img.y + img.height - newHeight;
                img.height = newHeight;
                break;
            case 'nw':
                const nwWidth = Math.max(50, img.x + img.width - x);
                const nwHeight = nwWidth / aspectRatio;
                img.x = img.x + img.width - nwWidth;
                img.y = img.y + img.height - nwHeight;
                img.width = nwWidth;
                img.height = nwHeight;
                break;
            case 'n':
                const nHeight = Math.max(50, img.y + img.height - y);
                img.y = img.y + img.height - nHeight;
                img.height = nHeight;
                img.width = img.height * aspectRatio;
                break;
            case 's':
                img.height = Math.max(50, y - img.y);
                img.width = img.height * aspectRatio;
                break;
            case 'w':
                const wWidth = Math.max(50, img.x + img.width - x);
                img.x = img.x + img.width - wWidth;
                img.width = wWidth;
                img.height = img.width / aspectRatio;
                break;
            case 'e':
                img.width = Math.max(50, x - img.x);
                img.height = img.width / aspectRatio;
                break;
        }
        
        // Keep within bounds
        if (img.x < 0) {
            img.width = img.width + img.x;
            img.height = img.width / aspectRatio;
            img.x = 0;
        }
        if (img.y < 0) {
            img.height = img.height + img.y;
            img.width = img.height * aspectRatio;
            img.y = 0;
        }
        if (img.x + img.width > this.A4_WIDTH) {
            img.width = this.A4_WIDTH - img.x;
            img.height = img.width / aspectRatio;
        }
        if (img.y + img.height > this.A4_HEIGHT) {
            img.height = this.A4_HEIGHT - img.y;
            img.width = img.height * aspectRatio;
        }
        
        this.drawCanvas();
    }
    
    updateCursor(x, y) {
        const handle = this.getResizeHandle(x, y);
        
        if (handle) {
            const cursors = {
                'nw': 'nw-resize',
                'ne': 'ne-resize',
                'sw': 'sw-resize',
                'se': 'se-resize',
                'n': 'n-resize',
                's': 's-resize',
                'w': 'w-resize',
                'e': 'e-resize'
            };
            this.canvas.style.cursor = cursors[handle];
        } else if (this.getImageAt(x, y)) {
            this.canvas.style.cursor = 'move';
        } else {
            this.canvas.style.cursor = 'default';
        }
    }
    
    selectImage(imageObj) {
        this.deselectAll();
        imageObj.selected = true;
        this.selectedImage = imageObj;
        this.updateImageList();
    }
    
    deselectAll() {
        this.images.forEach(img => img.selected = false);
        this.selectedImage = null;
        this.updateImageList();
    }
    
    drawCanvas() {
        if (!this.ctx) return;
        
        // Clear canvas
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.A4_WIDTH, this.A4_HEIGHT);
        
        // Draw A4 border
        this.ctx.strokeStyle = '#e5e7eb';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, 0, this.A4_WIDTH, this.A4_HEIGHT);
        
        // Draw A4 size text
        this.ctx.fillStyle = '#9ca3af';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('A4 Size (210mm × 297mm)', this.A4_WIDTH / 2, 30);
        
        // Draw all images
        this.images.forEach(imageObj => {
            this.ctx.save();
            
            // Draw image
            this.ctx.drawImage(
                imageObj.image,
                imageObj.x,
                imageObj.y,
                imageObj.width,
                imageObj.height
            );
            
            // Draw selection border and handles if selected
            if (imageObj.selected) {
                this.ctx.strokeStyle = '#6366f1';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(imageObj.x, imageObj.y, imageObj.width, imageObj.height);
                
                // Draw resize handles
                this.drawResizeHandles(imageObj);
            }
            
            this.ctx.restore();
        });
        
        // Update info
        this.updateCanvasInfo();
    }
    
    drawResizeHandles(imageObj) {
        const handleSize = 8;
        this.ctx.fillStyle = '#6366f1';
        
        const handles = [
            { x: imageObj.x, y: imageObj.y }, // nw
            { x: imageObj.x + imageObj.width, y: imageObj.y }, // ne
            { x: imageObj.x, y: imageObj.y + imageObj.height }, // sw
            { x: imageObj.x + imageObj.width, y: imageObj.y + imageObj.height }, // se
            { x: imageObj.x + imageObj.width / 2, y: imageObj.y }, // n
            { x: imageObj.x + imageObj.width / 2, y: imageObj.y + imageObj.height }, // s
            { x: imageObj.x, y: imageObj.y + imageObj.height / 2 }, // w
            { x: imageObj.x + imageObj.width, y: imageObj.y + imageObj.height / 2 } // e
        ];
        
        handles.forEach(handle => {
            this.ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
        });
    }
    
    updateCanvasInfo() {
        const imageCount = document.getElementById('imageCount');
        const selectedInfo = document.getElementById('selectedImageInfo');
        
        if (imageCount) {
            imageCount.textContent = `${this.images.length} image${this.images.length !== 1 ? 's' : ''} on canvas`;
        }
        
        if (selectedInfo) {
            if (this.selectedImage) {
                const widthMM = (this.selectedImage.width / this.A4_WIDTH * 210).toFixed(1);
                const heightMM = (this.selectedImage.height / this.A4_HEIGHT * 297).toFixed(1);
                selectedInfo.textContent = `Selected: ${this.selectedImage.name} (${widthMM}×${heightMM}mm)`;
            } else {
                selectedInfo.textContent = 'No image selected';
            }
        }
    }
    
    updateImageList() {
        const imageList = document.getElementById('imageListContainer');
        if (!imageList) return;
        
        if (this.images.length === 0) {
            imageList.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 20px;">No images on canvas</p>';
            return;
        }
        
        imageList.innerHTML = this.images.map((img, index) => `
            <div class="image-list-item ${img.selected ? 'selected' : ''}" data-id="${img.id}">
                <div class="image-list-info">
                    <span class="image-list-name">${img.name}</span>
                    <span class="image-list-size">${Math.round(img.width)}×${Math.round(img.height)}px</span>
                </div>
                <div class="image-list-actions">
                    <button class="btn-icon" onclick="a4Manager.selectImageById('${img.id}')" title="Select">
                        <i class="fas fa-hand-pointer"></i>
                    </button>
                    <button class="btn-icon" onclick="a4Manager.deleteImageById('${img.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    selectImageById(id) {
        const img = this.images.find(i => i.id == id);
        if (img) {
            this.selectImage(img);
            this.drawCanvas();
        }
    }
    
    deleteImageById(id) {
        const index = this.images.findIndex(i => i.id == id);
        if (index !== -1) {
            const img = this.images[index];
            this.images.splice(index, 1);
            if (this.selectedImage && this.selectedImage.id === img.id) {
                this.selectedImage = null;
            }
            this.drawCanvas();
            this.updateImageList();
            showToast('Image removed from canvas', 'success');
        }
    }
    
    deleteSelectedImage() {
        if (this.selectedImage) {
            this.deleteImageById(this.selectedImage.id);
        } else {
            showToast('Please select an image first', 'warning');
        }
    }
    
    bringToFront() {
        if (!this.selectedImage) {
            showToast('Please select an image first', 'warning');
            return;
        }
        
        const index = this.images.indexOf(this.selectedImage);
        if (index !== -1) {
            this.images.splice(index, 1);
            this.images.push(this.selectedImage);
            this.drawCanvas();
            this.updateImageList();
            showToast('Image brought to front', 'success');
        }
    }
    
    sendToBack() {
        if (!this.selectedImage) {
            showToast('Please select an image first', 'warning');
            return;
        }
        
        const index = this.images.indexOf(this.selectedImage);
        if (index !== -1) {
            this.images.splice(index, 1);
            this.images.unshift(this.selectedImage);
            this.drawCanvas();
            this.updateImageList();
            showToast('Image sent to back', 'success');
        }
    }
    
    clearAllImages() {
        if (this.images.length === 0) {
            showToast('Canvas is already empty', 'info');
            return;
        }
        
        if (confirm('Are you sure you want to remove all images from the canvas?')) {
            this.images = [];
            this.selectedImage = null;
            this.drawCanvas();
            this.updateImageList();
            showToast('All images cleared', 'success');
        }
    }
    
    downloadLayout() {
        if (this.images.length === 0) {
            showToast('Please add images to canvas first', 'warning');
            return;
        }
        
        // Create high-resolution canvas for printing (300 DPI)
        const printCanvas = document.createElement('canvas');
        const printCtx = printCanvas.getContext('2d');
        
        // A4 at 300 DPI: 2480 × 3508 pixels
        const dpi = 300;
        const scale = dpi / 96; // 96 is screen DPI
        printCanvas.width = this.A4_WIDTH * scale;
        printCanvas.height = this.A4_HEIGHT * scale;
        
        // White background
        printCtx.fillStyle = '#ffffff';
        printCtx.fillRect(0, 0, printCanvas.width, printCanvas.height);
        
        // Draw all images at higher resolution
        this.images.forEach(imageObj => {
            printCtx.drawImage(
                imageObj.image,
                imageObj.x * scale,
                imageObj.y * scale,
                imageObj.width * scale,
                imageObj.height * scale
            );
        });
        
        // Download
        printCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `A4-Layout-${Date.now()}.png`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
            
            showToast('A4 layout downloaded successfully', 'success');
        }, 'image/png');
    }
    
    printLayout() {
        if (this.images.length === 0) {
            showToast('Please add images to canvas first', 'warning');
            return;
        }
        
        // Create print window
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print A4 Layout</title>
                <style>
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                    }
                    .print-container {
                        width: 210mm;
                        height: 297mm;
                        position: relative;
                        background: white;
                    }
                    img {
                        position: absolute;
                    }
                </style>
            </head>
            <body>
                <div class="print-container">
                    ${this.images.map(img => {
                        const leftMM = (img.x / this.A4_WIDTH * 210).toFixed(2);
                        const topMM = (img.y / this.A4_HEIGHT * 297).toFixed(2);
                        const widthMM = (img.width / this.A4_WIDTH * 210).toFixed(2);
                        const heightMM = (img.height / this.A4_HEIGHT * 297).toFixed(2);
                        
                        return `<img src="${img.image.src}" style="left: ${leftMM}mm; top: ${topMM}mm; width: ${widthMM}mm; height: ${heightMM}mm;">`;
                    }).join('')}
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            setTimeout(function() {
                                window.close();
                            }, 500);
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
}

// Initialize A4 Canvas Manager
let a4Manager;
document.addEventListener('DOMContentLoaded', function() {
    // Check if A4 canvas exists
    if (document.getElementById('a4Canvas')) {
        a4Manager = new A4CanvasManager();
        console.log('A4 Canvas Manager initialized');
    }
});
