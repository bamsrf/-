// Meme Generator Application
class HmmGenerator {
    constructor() {
        this.canvas = document.getElementById('hmm-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.textBoxes = [];
        this.selectedTextBox = null;
        this.currentImage = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.textSize = 40;
        this.textInputContainer = document.getElementById('text-input-container');
        this.textInput = document.getElementById('text-input');
        this.editingTextBox = null;

        this.init();
    }

    init() {
        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // File upload handler
        document.getElementById('image-upload').addEventListener('change', (e) => {
            this.loadImageFromFile(e.target.files[0]);
        });

        // Add text button
        document.getElementById('add-text-btn').addEventListener('click', () => {
            this.addTextBox();
        });

        // Text size slider
        const textSizeSlider = document.getElementById('text-size');
        const textSizeValue = document.getElementById('text-size-value');
        textSizeSlider.addEventListener('input', (e) => {
            this.textSize = parseInt(e.target.value);
            textSizeValue.textContent = this.textSize;
            if (this.selectedTextBox) {
                this.selectedTextBox.fontSize = this.textSize;
                this.render();
            }
        });

        // Download button
        document.getElementById('download-btn').addEventListener('click', () => {
            this.downloadHmm();
        });

        // Delete text button
        document.getElementById('delete-text-btn').addEventListener('click', () => {
            this.deleteSelectedTextBox();
        });

        // Canvas mouse events for dragging
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (!this.textInputContainer.style.display || this.textInputContainer.style.display === 'none') {
                    this.deleteSelectedTextBox();
                }
            }
            if (e.key === 'Escape') {
                this.hideTextInput();
            }
        });

        // Text input events
        this.textInput.addEventListener('input', (e) => {
            if (this.editingTextBox) {
                this.editingTextBox.text = e.target.value;
                this.render();
            }
        });

        this.textInput.addEventListener('blur', () => {
            this.hideTextInput();
        });

        this.textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
        e.preventDefault();
                this.hideTextInput();
            }
        });

        // Initialize gallery
        this.initGallery();
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth - 64; // Account for padding
        const maxWidth = Math.min(900, containerWidth);
        const maxHeight = window.innerHeight * 0.7; // Max 70% of viewport height
        
        if (this.currentImage) {
            // Resize canvas to match image aspect ratio
            const imgAspect = this.currentImage.width / this.currentImage.height;
            
            let canvasWidth, canvasHeight;
            
            if (imgAspect > 1) {
                // Image is wider (landscape)
                canvasWidth = Math.min(maxWidth, maxHeight * imgAspect);
                canvasHeight = canvasWidth / imgAspect;
            } else {
                // Image is taller (portrait) or square
                canvasHeight = Math.min(maxHeight, maxWidth / imgAspect);
                canvasWidth = canvasHeight * imgAspect;
            }
            
            // Ensure canvas doesn't exceed container dimensions
            if (canvasWidth > maxWidth) {
                canvasWidth = maxWidth;
                canvasHeight = canvasWidth / imgAspect;
            }
            if (canvasHeight > maxHeight) {
                canvasHeight = maxHeight;
                canvasWidth = canvasHeight * imgAspect;
            }
            
            this.canvas.width = canvasWidth;
            this.canvas.height = canvasHeight;
            this.render();
        } else {
            // Default 16:9 aspect ratio when no image is loaded
            this.canvas.width = maxWidth;
            this.canvas.height = (maxWidth * 9) / 16;
        }
    }

    loadImageFromFile(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.currentImage = img;
                this.textBoxes = [];
                this.selectedTextBox = null;
                document.getElementById('canvas-placeholder').style.display = 'none';
                // Resize canvas to match image aspect ratio
                this.resizeCanvas();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    loadImageFromURL(url) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            this.currentImage = img;
            this.textBoxes = [];
            this.selectedTextBox = null;
            document.getElementById('canvas-placeholder').style.display = 'none';
            // Resize canvas to match image aspect ratio
            this.resizeCanvas();
        };
        img.onerror = () => {
            alert('Failed to load image. Please try another one.');
        };
        img.src = url;
    }

    addTextBox() {
        if (!this.currentImage) {
            // Try to show a more user-friendly message
            const placeholder = document.getElementById('canvas-placeholder');
            if (placeholder) {
                placeholder.style.display = 'block';
                setTimeout(() => {
                    if (this.currentImage) {
                        placeholder.style.display = 'none';
                    }
                }, 2000);
            }
            return;
        }

        const textBox = {
            id: Date.now(),
            text: 'Your text here',
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            fontSize: this.textSize
        };

        this.textBoxes.push(textBox);
        this.selectedTextBox = textBox;
        this.render();
        this.showTextInput(textBox);
    }

    showTextInput(textBox) {
        this.editingTextBox = textBox;
        this.textInput.value = textBox.text;
        this.textInputContainer.style.display = 'block';
        
        // Position input near the text box
        const canvasRect = this.canvas.getBoundingClientRect();
        const containerRect = this.canvas.parentElement.getBoundingClientRect();
        
        // Convert canvas coordinates to container coordinates
        const scaleX = canvasRect.width / this.canvas.width;
        const scaleY = canvasRect.height / this.canvas.height;
        const relativeX = (textBox.x * scaleX) + (canvasRect.left - containerRect.left);
        const relativeY = (textBox.y * scaleY) + (canvasRect.top - containerRect.top);
        
        // Position above the text box, or below if too close to top
        let topPosition = relativeY - 80;
        if (topPosition < 20) {
            topPosition = relativeY + 60;
        }
        
        // Center horizontally relative to text box, but keep within container bounds
        const inputWidth = 300;
        let leftPosition = relativeX - (inputWidth / 2);
        leftPosition = Math.max(20, Math.min(leftPosition, containerRect.width - inputWidth - 20));
        
        this.textInputContainer.style.top = `${topPosition}px`;
        this.textInputContainer.style.left = `${leftPosition}px`;
        
        this.textInput.focus();
        this.textInput.select();
    }

    hideTextInput() {
        this.textInputContainer.style.display = 'none';
        this.editingTextBox = null;
        // If text is empty, remove the text box
        if (this.selectedTextBox && this.selectedTextBox.text.trim() === '') {
            this.deleteSelectedTextBox();
        }
    }

    editTextBox(textBox) {
        this.selectedTextBox = textBox;
        this.render();
        this.showTextInput(textBox);
    }

    render() {
        if (!this.currentImage) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Since canvas is now sized to match image aspect ratio, draw image to fill canvas
        // Calculate scale to ensure image fits perfectly within canvas bounds
        const scaleX = this.canvas.width / this.currentImage.width;
        const scaleY = this.canvas.height / this.currentImage.height;
        const scale = Math.min(scaleX, scaleY);
        
        const drawWidth = this.currentImage.width * scale;
        const drawHeight = this.currentImage.height * scale;
        const drawX = (this.canvas.width - drawWidth) / 2;
        const drawY = (this.canvas.height - drawHeight) / 2;

        // Draw image
        this.ctx.drawImage(this.currentImage, drawX, drawY, drawWidth, drawHeight);

        // Draw text boxes
        this.textBoxes.forEach((textBox) => {
            this.drawText(textBox, textBox === this.selectedTextBox);
        });
    }

    drawText(textBox, isSelected) {
        this.ctx.save();
        
        // Set font
        this.ctx.font = `bold ${textBox.fontSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Calculate text metrics
        const metrics = this.ctx.measureText(textBox.text);
        const textWidth = metrics.width;
        const textHeight = textBox.fontSize;

        // Draw text with white fill and black stroke (border)
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = Math.max(3, textBox.fontSize / 15);
        this.ctx.lineJoin = 'round';
        this.ctx.miterLimit = 2;
        
        // Draw stroke (border) multiple times for better visibility
        this.ctx.strokeText(textBox.text, textBox.x, textBox.y);
        this.ctx.strokeText(textBox.text, textBox.x, textBox.y);
        
        // Draw fill (white text)
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(textBox.text, textBox.x, textBox.y);

        // Draw selection indicator
        if (isSelected) {
            this.ctx.strokeStyle = '#3B82F6';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            const padding = 10;
            this.ctx.strokeRect(
                textBox.x - textWidth / 2 - padding,
                textBox.y - textHeight / 2 - padding,
                textWidth + padding * 2,
                textHeight + padding * 2
            );
            this.ctx.setLineDash([]);
        }

        this.ctx.restore();
    }

    getTextBoxAt(x, y) {
        // Check text boxes in reverse order (top to bottom)
        for (let i = this.textBoxes.length - 1; i >= 0; i--) {
            const textBox = this.textBoxes[i];
            this.ctx.font = `bold ${textBox.fontSize}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            const metrics = this.ctx.measureText(textBox.text);
            const textWidth = metrics.width;
            const textHeight = textBox.fontSize;
            
            const padding = 10;
            if (
                x >= textBox.x - textWidth / 2 - padding &&
                x <= textBox.x + textWidth / 2 + padding &&
                y >= textBox.y - textHeight / 2 - padding &&
                y <= textBox.y + textHeight / 2 + padding
            ) {
                return textBox;
            }
        }
        return null;
    }

    handleMouseDown(e) {
        if (!this.currentImage) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const clickedTextBox = this.getTextBoxAt(x, y);
        
        if (clickedTextBox) {
            this.selectedTextBox = clickedTextBox;
            this.isDragging = true;
            this.dragOffset.x = x - clickedTextBox.x;
            this.dragOffset.y = y - clickedTextBox.y;
            
            // Double click to edit
            if (this.lastClickTime && Date.now() - this.lastClickTime < 300) {
                this.isDragging = false;
                this.editTextBox(clickedTextBox);
            }
            this.lastClickTime = Date.now();
        } else {
            this.selectedTextBox = null;
            this.hideTextInput();
        }
        
        this.render();
    }

    handleMouseMove(e) {
        if (!this.isDragging || !this.selectedTextBox) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.selectedTextBox.x = x - this.dragOffset.x;
        this.selectedTextBox.y = y - this.dragOffset.y;

        // Keep text within canvas bounds
        this.selectedTextBox.x = Math.max(0, Math.min(this.canvas.width, this.selectedTextBox.x));
        this.selectedTextBox.y = Math.max(0, Math.min(this.canvas.height, this.selectedTextBox.y));

        this.render();
    }

    handleMouseUp() {
        this.isDragging = false;
    }

    deleteSelectedTextBox() {
        if (this.selectedTextBox) {
            const index = this.textBoxes.indexOf(this.selectedTextBox);
            if (index > -1) {
                this.textBoxes.splice(index, 1);
                this.selectedTextBox = null;
                this.render();
            }
        }
    }

    downloadHmm() {
        if (!this.currentImage) {
            // Show user-friendly feedback
            const placeholder = document.getElementById('canvas-placeholder');
            if (placeholder) {
                placeholder.style.display = 'block';
                setTimeout(() => {
                    if (this.currentImage) {
                        placeholder.style.display = 'none';
                    }
                }, 2000);
            }
            return;
        }

        // Create a temporary canvas with the actual image dimensions for better quality
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // Use original image dimensions or a reasonable max size
        const maxDimension = 2000;
        let width = this.currentImage.width;
        let height = this.currentImage.height;
        
        if (width > maxDimension || height > maxDimension) {
            const scale = maxDimension / Math.max(width, height);
            width = width * scale;
            height = height * scale;
        }
        
        tempCanvas.width = width;
        tempCanvas.height = height;
        
        // Draw image
        tempCtx.drawImage(this.currentImage, 0, 0, width, height);
        
        // Calculate scale factor
        const scaleX = width / this.canvas.width;
        const scaleY = height / this.canvas.height;
        
        // Draw text boxes
        this.textBoxes.forEach((textBox) => {
            tempCtx.save();
            tempCtx.font = `bold ${textBox.fontSize * scaleX}px Arial`;
            tempCtx.textAlign = 'center';
            tempCtx.textBaseline = 'middle';
            
            const scaledX = textBox.x * scaleX;
            const scaledY = textBox.y * scaleY;
            const scaledFontSize = textBox.fontSize * scaleX;
            
            // Draw stroke (border)
            tempCtx.strokeStyle = 'black';
            tempCtx.lineWidth = Math.max(3, scaledFontSize / 15);
            tempCtx.lineJoin = 'round';
            tempCtx.miterLimit = 2;
            tempCtx.strokeText(textBox.text, scaledX, scaledY);
            tempCtx.strokeText(textBox.text, scaledX, scaledY);
            
            // Draw fill (white text)
            tempCtx.fillStyle = 'white';
            tempCtx.fillText(textBox.text, scaledX, scaledY);
            
            tempCtx.restore();
        });
        
        // Download
        tempCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'hmm.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    initGallery() {
        // Popular meme templates
        const hmmTemplates = [
            { name: 'Drake', url: 'https://i.imgflip.com/30b1gx.jpg' },
            { name: 'Distracted Boyfriend', url: 'https://i.imgflip.com/1ur9b0.jpg' },
            { name: 'Expanding Brain', url: 'https://i.imgflip.com/1jhl8s.jpg' },
            { name: 'Two Buttons', url: 'https://i.imgflip.com/1g8my4.jpg' },
            { name: 'Change My Mind', url: 'https://i.imgflip.com/24y43o.jpg' },
            { name: 'Woman Yelling at Cat', url: 'https://i.imgflip.com/345v97.jpg' },
            { name: 'This Is Fine', url: 'https://i.imgflip.com/26am.jpg' },
            { name: 'Drake Pointing', url: 'https://i.imgflip.com/30b1gx.jpg' }
        ];

        const galleryGrid = document.getElementById('gallery-grid');
        
        hmmTemplates.forEach((template, index) => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            galleryItem.style.setProperty('--index', index);
            galleryItem.innerHTML = `
                <img src="${template.url}" alt="${template.name}" loading="lazy">
                <div class="gallery-item-overlay">
                    <span>${template.name}</span>
                </div>
            `;
            galleryItem.addEventListener('click', () => {
                this.loadImageFromURL(template.url);
                // Scroll to top to show the canvas
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            galleryGrid.appendChild(galleryItem);
        });
    }
}

// Initialize meme generator when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.hmmGenerator = new HmmGenerator();
    initAnimations();
    initDragAndDrop();
});

// Animated counter for stats
function initAnimations() {
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.stat-number').forEach(stat => {
        observer.observe(stat);
    });
}

function animateCounter(element) {
    const target = parseFloat(element.getAttribute('data-target'));
    const duration = 2000;
    const increment = target / (duration / 16);
    let current = 0;

    const updateCounter = () => {
        current += increment;
        if (current < target) {
            if (target >= 1000) {
                element.textContent = Math.floor(current).toLocaleString() + '+';
            } else if (target < 10) {
                element.textContent = current.toFixed(1);
            } else {
                element.textContent = Math.floor(current).toLocaleString();
            }
            requestAnimationFrame(updateCounter);
        } else {
            if (target >= 1000) {
                element.textContent = Math.floor(target).toLocaleString() + '+';
            } else if (target < 10) {
                element.textContent = target.toFixed(1);
            } else {
                element.textContent = Math.floor(target).toLocaleString();
            }
        }
    };

    updateCounter();
}

// Drag and drop functionality
function initDragAndDrop() {
    const dropZone = document.getElementById('canvas-drop-zone');
    const fileInput = document.getElementById('image-upload');

    if (!dropZone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            const generator = window.hmmGenerator;
            if (generator) {
                generator.loadImageFromFile(files[0]);
            } else {
                // Fallback: trigger file input
                fileInput.files = files;
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }, false);

    // Make drop zone clickable
    dropZone.addEventListener('click', (e) => {
        if (e.target === dropZone || e.target.closest('.canvas-placeholder')) {
            fileInput.click();
        }
    });
}
