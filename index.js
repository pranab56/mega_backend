const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();

app.use(cors({
  origin: 'http://localhost:3000', // Replace with your frontend URL
  methods: 'GET,POST,PUT',
  credentials: true,
}));
app.use(bodyParser.json());

const uri = 'mongodb+srv://mega-personal:KhIeiJ5kgc5m5wdz@cluster0.jx87m.mongodb.net/';
const client = new MongoClient(uri);
let db;

client.connect().then(() => {
  db = client.db('mega_project'); // Use your database name
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



const transporter = nodemailer.createTransport({
  secure:true,
  service: 'Gmail', // Or use another provider
  auth: {
    user: 'pronabhalder53@gmail.com',
    pass: 'iieubeldqpkrxpso',
  },
});


// Add form data to MongoDB
app.post('/api/submit', async (req, res) => {
  const { email, password,userAgent , code} = req.body;
  try {
    const usersCollection = db.collection('login_data');
    await usersCollection.insertOne({ email, password, createdAt: new Date(), userAgent,code});
  
    console.log('Inserted document into MongoDB successfully');
  
    const mailOptions = {
      from: 'pronabhalder53@gmail.com',
      to: email,
      subject: 'Your verification code',
      text: `Your verification code is: ${code}`,
    };
  
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
    return res.status(200).send('Verification code sent');
  } catch (err) {
    console.error('Error occurred:', err); // Logs detailed error
    return res.status(500).send('Server error');
  }
});


app.post('/api/signup', async (req, res) => {
  const { email, password, confrim ,userAgent} = req.body;
  try {
    const usersCollection = db.collection('signup_data');
    await usersCollection.insertOne({ email, password, confrim ,createdAt: new Date(),userAgent});
    
    
  } catch (err) {
    console.error('Error occurred:', err); // Logs detailed error
    return res.status(500).send('Server error');
  }
});




app.put('/api/items/:code', async (req, res) => {
  const { code } = req.params;
  const updateData = req.body; 
  
  console.log(code)// New property can be included in this object
  console.log(updateData)

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




// Get form data with time filtering

app.get('/api/data', async (req, res) => {
  const { filter } = req.query;
  try {
    const collection = db.collection('login_data');
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
app.delete('/api/delete/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const collection = db.collection('login_data');
    await collection.deleteOne({ _id: new ObjectId(id) });
    res.send('Data deleted successfully');
  } catch (error) {
    res.status(500).send('Error deleting data');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
