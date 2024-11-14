const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { getDB } = require('./config/db');

// Function to retrieve emails of admins, managers, and supplier
async function getNotificationRecipients(product) {
    const db = getDB();
    
    // Get all admin and manager emails
    const userEmails = await db.collection('users')
        .find({ role: { $in: ['admin', 'manager'] } })
        .project({ email: 1, _id: 0 })
        .toArray();

    const adminManagerEmails = userEmails.map(user => user.email);

    // Get supplier email using supplierId
    const supplier = await db.collection('suppliers')
        .findOne({ _id: product.supplierId });
    const supplierEmail = supplier ? supplier.email : null;

    return { adminManagerEmails, supplierEmail };
}

// Function to send low stock alert emails
async function sendLowStockAlert(product) {
    const { adminManagerEmails, supplierEmail } = await getNotificationRecipients(product);

    const emails = [...adminManagerEmails];
    if (supplierEmail) emails.push(supplierEmail);

    const subject = `Low Stock Alert: ${product.category} - ${product.description}`;
    const message = `
        Product: ${product.description}
        Category: ${product.category}
        Current Stock: ${product.stock}
        Minimum Stock Level: ${product.minStockLevel}
        
        Please restock soon to avoid shortages.
    `;

    const transporter = nodemailer.createTransport({
        service: 'your_email_service', // e.g., 'gmail'
        auth: {
            user: 'your_email',
            pass: 'your_password'
        }
    });

    for (const email of emails) {
        await transporter.sendMail({
            from: 'your_email',
            to: email,
            subject,
            text: message
        });
    }
    console.log(`Low stock alert sent for ${product.description} to ${emails.join(', ')}`);
}

// Function to check stock levels and send alerts if necessary
async function checkStockLevels() {
    const db = getDB();
    const lowStockProducts = await db.collection('globalproducts')
        .find({ stock: { $lt: '$minStockLevel' } })
        .toArray();

    for (const product of lowStockProducts) {
        await sendLowStockAlert(product);
    }
}

// Schedule the job to run every day at midnight
cron.schedule('0 0 * * *', () => {
    console.log('Running daily stock level check...');
    checkStockLevels().catch(error => console.error('Error checking stock levels:', error));
});
