// Clothify Inventory Management Engine - Advanced Features
// Version 7.2.0

class ClothifyInventoryManager {
    constructor() {
        this.storageKey = 'clothify_inventory_data';
        this.inventory = this.loadInventory();
        this.html5QrCode = null;
        this.cameraStream = null;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.isScanning = false;

        if (!Auth.isLoggedIn()) {
            window.location.href = 'login.html';
        }
    }

    loadInventory() {
        const data = localStorage.getItem(this.storageKey);
        if (!data) return [];
        const inventory = JSON.parse(data);
        // Add createdAt for old items for not-selling logic
        return inventory.map(item => ({...item, createdAt: item.createdAt || new Date().toISOString() }));
    }

    saveInventory() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.inventory));
    }
    
    displayInventory(sortBy = '') {
        const tbody = document.getElementById('inventory-tbody');
        this.inventory = this.loadInventory();

        let sortedInventory = [...this.inventory];
        if (sortBy === 'design') {
            sortedInventory.sort((a, b) => a.design.localeCompare(b.design));
        } else if (sortBy === 'stock') {
            sortedInventory.sort((a, b) => b.stock - a.stock);
        } else if (sortBy === 'sold') {
            sortedInventory.sort((a, b) => b.sold - a.sold);
        }

        tbody.innerHTML = sortedInventory.map(product => `
            <tr>
                <td>
                    <div class="product-image-container">
                        <img src="${product.image || 'https://via.placeholder.com/40'}" alt="${product.design}" onclick="inventoryManager.showImageModal('${product.image}')">
                    </div>
                </td>
                <td>${product.sku}</td>
                <td>${product.design}</td>
                <td>${product.stock}</td>
                <td>${product.sold}</td>
                <td class="qr-actions">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=40x40&data=${product.productLink || product.sku}" 
                         class="qr-code-img" 
                         onclick="inventoryManager.showQrImageModal('${product.sku}', '${product.productLink}')">
                    <button class="btn-qr-bulk" onclick="inventoryManager.showSuccessModal('Bulk QR for ${product.design}', '${product.sku}', true, '${product.productLink}')">Bulk QR</button>
                </td>
                <td>
                    ${Auth.isAdmin() ? `<button class="btn btn-danger" onclick="inventoryManager.deleteProduct('${product.sku}')">Remove</button>` : ''}
                </td>
            </tr>
        `).join('');
    }

    addProduct(event) {
        event.preventDefault();
        const form = event.target;
        const design = form.design.value;
        const stock = parseInt(form.stock.value);
        const productLink = form['product-link'].value;
        const image = document.getElementById('image-preview').src;
        
        let product = this.inventory.find(p => p.design.toLowerCase() === design.toLowerCase());
        let message = '';
        let showQrOptions = false;
        
        const sku = product ? product.sku : `CL-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        if (product) { // Restock
            product.stock += stock;
            message = `Restocked ${design}. New stock is ${product.stock}.`;
        } else { // Add new
            product = {
                sku: sku,
                design: design,
                stock: stock,
                sold: 0,
                image: image,
                productLink: productLink ? `${productLink}?sku=${sku}` : sku,
                createdAt: new Date().toISOString() // Track creation date
            };
            this.inventory.push(product);
            message = `Added new product: ${design}.`;
            showQrOptions = true;
        }
        
        this.saveInventory();
        this.displayInventory();
        this.showSuccessModal(message, product.sku, showQrOptions, product.productLink);
        switchTab('inventory');
        form.reset();
        document.getElementById('image-preview').style.display = 'none';
    }

    deleteProduct(sku) {
        if (confirm(`Are you sure you want to delete product ${sku}? This action cannot be undone.`)) {
            const result = Auth.deleteProduct(sku);
            if (result.success) {
                this.displayInventory();
                alert(result.message);
            } else {
                alert(`Error: ${result.message}`);
            }
        }
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('image-preview');
                preview.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }
    
    async openCamera() {
        const modal = document.getElementById('camera-modal');
        const video = document.getElementById('camera-video');
        modal.classList.add('show');
        
        try {
            this.cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = this.cameraStream;
            document.getElementById('capture-btn').onclick = () => this.captureImage();
        } catch (err) {
            console.error("Error accessing camera: ", err);
            this.closeCamera();
        }
    }

    closeCamera() {
        const modal = document.getElementById('camera-modal');
        modal.classList.remove('show');
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
        }
    }

    captureImage() {
        const video = document.getElementById('camera-video');
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageDataUrl = canvas.toDataURL('image/jpeg');
        const preview = document.getElementById('image-preview');
        preview.src = imageDataUrl;
        preview.style.display = 'block';
        
        this.closeCamera();
    }

    startScanner() {
        this.html5QrCode = new Html5Qrcode("reader");
        const config = { fps: 10, qrbox: {width: 250, height: 250} };

        this.updateScannerStatus('Starting scanner...', 'ready');
        this.html5QrCode.start({ facingMode: "environment" }, config, 
            (decodedText, decodedResult) => {
                if (this.isScanning) return;
                
                this.isScanning = true;
                
                let sku = decodedText;
                try {
                    const url = new URL(decodedText);
                    sku = url.searchParams.get("sku") || decodedText;
                } catch(e) {
                    // Not a URL, use raw text
                }

                const product = this.inventory.find(p => p.sku === sku);
                if (product && product.stock > 0) {
                    product.stock--;
                    product.sold++;
                    product.lastSold = new Date().toISOString(); // Track last sale date
                    this.saveInventory();
                    this.updateScannerStatus(`Sold: ${product.design}`, 'success');
                    this.playSound(true);
                } else {
                    this.updateScannerStatus(`Invalid or out of stock: ${sku}`, 'error');
                    this.playSound(false);
                }
                
                setTimeout(() => { this.isScanning = false; this.updateScannerStatus('Ready to scan...', 'ready'); }, 2000);
            },
            (errorMessage) => {})
            .catch((err) => {
                this.updateScannerStatus('Error starting scanner.', 'error');
            });
    }

    stopScanner() {
        if (this.html5QrCode && this.html5QrCode.isScanning) {
            this.html5QrCode.stop().catch(err => {});
        }
    }
    
    updateScannerStatus(message, type) {
        const statusEl = document.getElementById('scanner-status');
        statusEl.textContent = message;
        statusEl.className = `scanner-status ${type}`;
    }
    
    playSound(isSuccess) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        if(isSuccess) {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        } else {
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
        }
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.2);
    }
    
    showSuccessModal(message, sku, showQrOptions, productLink) {
        const modal = document.getElementById('success-modal');
        document.getElementById('success-message').textContent = message;
        document.getElementById('qr-options').style.display = showQrOptions ? 'block' : 'none';
        
        if (showQrOptions) {
            document.getElementById('success-download-one-qr-btn').onclick = () => this.downloadSingleQR(sku, productLink);
            document.getElementById('success-generate-qr-btn').onclick = () => this.generateBulkQRCodes(sku, productLink);
        }
        modal.classList.add('show');
    }
    
    downloadSingleQR(sku, productLink) {
        const link = document.createElement('a');
        link.href = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(productLink || sku)}`;
        link.download = `QR_${sku}.png`;
        link.click();
    }

    generateBulkQRCodes(sku, productLink) {
        const quantity = document.getElementById('success-qr-quantity').value;
        let qrHtml = `
            <style>
                @media print {
                    .no-print { display: none; }
                    body { margin: 0; }
                    .qr-page { 
                        display: grid; 
                        grid-template-columns: repeat(4, 1fr); 
                        grid-template-rows: repeat(6, 1fr); 
                        gap: 5mm; 
                        page-break-after: always;
                        width: 210mm;
                        height: 297mm;
                        padding: 10mm;
                        box-sizing: border-box;
                    }
                    .qr-item { text-align: center; }
                    .qr-item img { width: 100%; }
                    .qr-item p { font-size: 8pt; margin: 0; word-break: break-all; }
                }
            </style>
            <div class="no-print">
                <h2>QR Codes for ${sku}</h2>
                <button onclick="window.print()">Print</button>
                <hr>
            </div>
        `;

        let pageContent = '';
        for (let i = 0; i < quantity; i++) {
            if (i % 24 === 0) {
                if (i > 0) pageContent += '</div>';
                pageContent += '<div class="qr-page">';
            }
            pageContent += `
                <div class="qr-item">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(productLink || sku)}">
                    <p>${sku}</p>
                </div>
            `;
        }
        pageContent += '</div>';
        qrHtml += pageContent;

        const qrWindow = window.open('', '_blank');
        qrWindow.document.write(qrHtml);
        document.getElementById('success-modal').classList.remove('show');
    }
    
    showImageModal(imageUrl) {
        if (!imageUrl) return;
        const modal = document.getElementById('image-modal');
        document.getElementById('image-modal-content').src = imageUrl;
        modal.classList.add('show');
    }
    
    showQrImageModal(sku, productLink) {
        const modal = document.getElementById('qr-image-modal');
        document.getElementById('qr-image-modal-content').src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(productLink || sku)}`;
        document.getElementById('qr-download-btn').onclick = () => this.downloadSingleQR(sku, productLink);
        modal.classList.add('show');
    }
}

const inventoryManager = new ClothifyInventoryManager();

function switchTab(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(`${section}-section`).classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.nav-btn[data-section="${section}"]`).classList.add('active');

    if (section === 'scan') {
        inventoryManager.startScanner();
    } else {
        inventoryManager.stopScanner();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    inventoryManager.displayInventory();
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.section));
    });
    
    document.getElementById('add-product-form').addEventListener('submit', (e) => inventoryManager.addProduct(e));
    document.getElementById('image-upload').addEventListener('change', (e) => inventoryManager.handleImageUpload(e));
    document.getElementById('sort-select').addEventListener('change', (e) => inventoryManager.displayInventory(e.target.value));
    document.getElementById('search-input').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('#inventory-tbody tr').forEach(tr => {
            const design = tr.cells[2].textContent.toLowerCase();
            const sku = tr.cells[1].textContent.toLowerCase();
            tr.style.display = (design.includes(searchTerm) || sku.includes(searchTerm)) ? '' : 'none';
        });
    });

    // Show admin panel link if user is admin
    if (Auth.getRole() === 'admin') {
        document.getElementById('admin-panel-link').style.display = 'inline-flex';
    }

    // Settings tab logout button
    document.getElementById('logout-btn').addEventListener('click', () => {
        Auth.logout();
    });
});