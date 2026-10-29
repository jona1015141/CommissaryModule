const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// JSON Database File Path
const DB_FILE = './commissary_data.json';

// Initialize default data kung wala pang database file
if (!fs.existsSync(DB_FILE)) {
    const initialData = {
        raw_materials: [
            { id: '#RM-1001', name: 'Dressed Chicken', category: 'Poultry / Raw Meat', current_stock: 120.0, min_limit: 150.0, unit: 'kg', status: 'Low Stock' },
            { id: '#RM-1002', name: 'Jasmine Rice', category: 'Grains', current_stock: 450.0, min_limit: 200.0, unit: 'kg', status: 'In Stock' }
        ],
        active_batches: [
            { id: '#BATCH-2026-004', recipe_target: 'Classic Chicken Pastil Tubs', target_yield: '300 Tubs', status: 'Low Ingredient Alert' },
            { id: '#BATCH-2026-005', recipe_target: 'Spicy Pastil Tubs', target_yield: '150 Tubs', status: 'Ready to Start' }
        ],
        deliveries: [
            { id: '#DEL-2026-001', branch_name: 'Balagtas Branch', items_summary: '70 Total Units', status: 'Ready to Dispatch' }
        ],
        purchase_orders: [
            { id: '#PO-2026-089', supplier_name: 'Magnolia Poultry', total_value: 45000.00, trigger_reason: 'Low Stock', status: 'Draft Pending' }
        ],
        wastages: [
            { id: '#WASTE-2026-001', item_name: 'Dressed Chicken', quantity: 5.0, unit: 'kg', reason: 'Spoiled / Expired', date: '2026-10-29' }
        ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
}

// Helper functions para basahin at isulat ang JSON DB
const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// --- API ENDPOINTS ---

// 1. Kunin ang Raw Materials Inventory
app.get('/api/raw-materials', (req, res) => {
    try {
        const db = readDB();
        res.json(db.raw_materials);
    } catch (err) {
        res.status(500).json({ error: "Failed to read database" });
    }
});

// 2. Pag-adjust ng Stock (Stock-in / Spoilage)
app.post('/api/raw-materials/adjust', (req, res) => {
    try {
        const { id, adjustment_type, quantity } = req.body;
        let db = readDB();
        const item = db.raw_materials.find(r => r.id === id);
        
        if (!item) return res.status(404).json({ error: "Item not found" });

        if (adjustment_type === 'stock_in') {
            item.current_stock += parseFloat(quantity);
        } else if (adjustment_type === 'spoilage') {
            item.current_stock -= parseFloat(quantity);
        }

        item.status = item.current_stock < item.min_limit ? 'Low Stock' : 'In Stock';
        writeDB(db);
        
        res.json({ message: "Stock updated successfully", new_stock: item.current_stock, status: item.status });
    } catch (err) {
        res.status(500).json({ error: "Server error during adjustment" });
    }
});

// 3. Kunin ang Active Kitchen Batches
app.get('/api/batches', (req, res) => {
    res.json(readDB().active_batches);
});

// 4. Kunin ang Deliveries & Logistics
app.get('/api/deliveries', (req, res) => {
    res.json(readDB().deliveries);
});

// 5. Kunin ang Purchase Orders
app.get('/api/purchase-orders', (req, res) => {
    res.json(readDB().purchase_orders);
});

// 6. Mag-apruba ng Purchase Order
app.post('/api/purchase-orders/approve', (req, res) => {
    try {
        const { po_number } = req.body;
        let db = readDB();
        const po = db.purchase_orders.find(p => p.id === po_number);
        
        if (po) {
            po.status = 'Approved & Sent';
            writeDB(db);
            res.json({ message: "PO approved and sent to supplier successfully" });
        } else {
            res.status(404).json({ error: "Purchase Order not found" });
        }
    } catch (err) {
        res.status(500).json({ error: "Server error approving PO" });
    }
});

// Kunin ang Wastage Records
app.get('/api/wastages', (req, res) => {
    try {
        const db = readDB();
        res.json(db.wastages || []);
    } catch (err) {
        res.status(500).json({ error: "Failed to read wastages" });
    }
});

// Mag-record ng Bagong Wastage
app.post('/api/wastages', (req, res) => {
    try {
        const { item_name, quantity, unit, reason } = req.body;
        let db = readDB();
        
        const newWastage = {
            id: `#WASTE-${Date.now().toString().slice(-4)}`,
            item_name,
            quantity: parseFloat(quantity),
            unit,
            reason,
            date: new Date().toISOString().split('T')[0]
        };

        if (!db.wastages) db.wastages = [];
        db.wastages.push(newWastage);
        writeDB(db);

        res.json({ message: "Wastage recorded successfully", wastage: newWastage });
    } catch (err) {
        res.status(500).json({ error: "Server error saving wastage" });
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tine's Kitchen Commissary Backend running on http://localhost:${PORT}`);
});
