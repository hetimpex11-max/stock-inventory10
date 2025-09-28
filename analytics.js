// Clothify Analytics Engine - Full Featured
// Version 4.0.0

class ClothifyAnalytics {
    constructor() {
        this.inventoryData = JSON.parse(localStorage.getItem('clothify_inventory_data') || '[]');
        this.hiddenItems = []; // To keep track of removed items from the not-selling list
    }

    calculateMetrics() {
        const totalProducts = this.inventoryData.length;
        const totalStock = this.inventoryData.reduce((sum, p) => sum + p.stock, 0);
        const totalSold = this.inventoryData.reduce((sum, p) => sum + p.sold, 0);
        const avgTurnover = totalStock + totalSold > 0 ? ((totalSold / (totalStock + totalSold)) * 100).toFixed(1) : 0;
        
        return { totalProducts, totalStock, totalSold, avgTurnover };
    }

    updateMetrics() {
        const metrics = this.calculateMetrics();
        document.getElementById('total-products').textContent = metrics.totalProducts;
        document.getElementById('total-stock').textContent = metrics.totalStock;
        document.getElementById('total-sold').textContent = metrics.totalSold;
        document.getElementById('avg-turnover').textContent = `${metrics.avgTurnover}%`;
    }

    createStockChart() {
        const ctx = document.getElementById('stockChart').getContext('2d');
        const labels = this.inventoryData.map(p => p.design);
        const data = this.inventoryData.map(p => p.stock);

        new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Stock Level', data, backgroundColor: '#8B5CF6' }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    createTopSellersChart() {
        const topSellers = [...this.inventoryData].sort((a, b) => b.sold - a.sold).slice(0, 5);
        const ctx = document.getElementById('topSellersChart').getContext('2d');
        const labels = topSellers.map(p => p.design);
        const data = topSellers.map(p => p.sold);

        new Chart(ctx, {
            type: 'pie',
            data: { labels, datasets: [{ data, backgroundColor: ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6'] }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    
    createSalesTrendChart() {
        const ctx = document.getElementById('salesTrendChart').getContext('2d');
        // This is mock data, in a real app this would come from a backend with historical sales
        const labels = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
        const data = labels.map(() => Math.floor(Math.random() * 50));
        
        new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Units Sold', data, borderColor: '#EC4899', tension: 0.1 }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    
    createForecastChart() {
        const ctx = document.getElementById('forecastChart').getContext('2d');
        // This is mock data
        const labels = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
        const data = labels.map(() => Math.floor(Math.random() * 60));

        new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Forecasted Demand', data, borderColor: '#10B981', borderDash: [5, 5] }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    populateSkuAnalysis() {
        const tbody = document.getElementById('sku-analysis-tbody');
        tbody.innerHTML = this.inventoryData.map(p => {
            const turnover = p.stock + p.sold > 0 ? ((p.sold / (p.stock + p.sold)) * 100).toFixed(1) : 0;
            return `
                <tr>
                    <td>${p.sku}</td>
                    <td>${p.design}</td>
                    <td>${p.stock}</td>
                    <td>${p.sold}</td>
                    <td>${turnover}%</td>
                </tr>
            `;
        }).join('');
    }

    createTopNotSellingItemsChart() {
        const tbody = document.getElementById('not-selling-tbody');
        const now = new Date();

        const notSellingItems = this.inventoryData
            .filter(p => !this.hiddenItems.includes(p.sku)) // Filter out hidden items
            .map(p => {
                const lastSoldDate = p.lastSold ? new Date(p.lastSold) : (p.createdAt ? new Date(p.createdAt) : now); // Use createdAt or now as fallback
                const diffTime = Math.abs(now - lastSoldDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return { ...p, daysSinceLastSale: diffDays };
            })
            .sort((a, b) => b.daysSinceLastSale - a.daysSinceLastSale)
            .slice(0, 10);

        tbody.innerHTML = notSellingItems.map(p => `
            <tr id="not-selling-row-${p.sku}">
                <td><img src="${p.image || 'https://via.placeholder.com/40'}" alt="${p.design}" class="product-image"></td>
                <td>${p.sku}</td>
                <td>${p.design}</td>
                <td>${p.daysSinceLastSale}</td>
                <td><button class="btn-remove" onclick="analytics.hideNotSellingItem('${p.sku}')">Remove</button></td>
            </tr>
        `).join('');
    }

    hideNotSellingItem(sku) {
        this.hiddenItems.push(sku);
        this.createTopNotSellingItemsChart(); // Re-render the table to reflect the change
    }

    init() {
        this.updateMetrics();
        this.createStockChart();
        this.createTopSellersChart();
        this.createSalesTrendChart();
        this.createForecastChart();
        this.populateSkuAnalysis();
        this.createTopNotSellingItemsChart();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.analytics = new ClothifyAnalytics();
    analytics.init();
});