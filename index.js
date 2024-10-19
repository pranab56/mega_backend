const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const uri = 'mongodb+srv://mega-personal:KhIeiJ5kgc5m5wdz@cluster0.jx87m.mongodb.net/';
const client = new MongoClient(uri);
let db;

client.connect().then(() => {
  db = client.db('your_db_name'); // Use your database name
  console.log('Connected to MongoDB');
});

// Helper function to get the date range
const getDateRange = (filter) => {
  const now = new Date();
  let startDate;
  
  if (filter === 'today') {
    startDate = new Date(now.setHours(0, 0, 0, 0));
  } else if (filter === 'week') {
    startDate = new Date(now.setDate(now.getDate() - 7));
  } else if (filter === 'month') {
    startDate = new Date(now.setMonth(now.getMonth() - 1));
  }
  
  return { $gte: startDate };
};

// Add form data to MongoDB
app.post('/api/submit', async (req, res) => {
  const { email, password } = req.body;
  const newEntry = {
    email,
    password,
    createdAt: new Date(), // Store submission time
  };
  
  try {
    const collection = db.collection('form_data');
    await collection.insertOne(newEntry);
    res.status(201).send('Data added successfully');
  } catch (error) {
    res.status(500).send('Error adding data');
  }
});

// Get form data with time filtering

app.get('/api/data', async (req, res) => {
  const { filter } = req.query;
  
  try {
    const collection = db.collection('form_data');
    let query = {};
    
    if (filter) {
      query.createdAt = getDateRange(filter); // Add time-based filter
    }
    
    const data = await collection.find(query).toArray();
    res.json(data);
  } catch (error) {
    res.status(500).send('Error retrieving data');
  }
});

// Delete form data
app.delete('/api/delete/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const collection = db.collection('form_data');
    await collection.deleteOne({ _id: new ObjectId(id) });
    res.send('Data deleted successfully');
  } catch (error) {
    res.status(500).send('Error deleting data');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
