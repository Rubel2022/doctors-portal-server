const express = require('express')
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const { query } = require('express');
var jwt = require('jsonwebtoken');
const app = express()
require('dotenv').config()
const port = process.env.PORT || 5000

// middle ware 
app.use(cors());
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nyfzv.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
  try {
    await client.connect();
    const serviceCollection = client.db("doctors_portal").collection("services");
    const bookingCollection = client.db("doctors_portal").collection("bookings");
    const userCollection = client.db("doctors_portal").collection("users");

    app.get('/service', async (req, res) => {
      const query = {}
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services)
    })

    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ result, token });
    })

    app.get('/available', async (req, res) => {
      const date = req.query.date
      //step1: get all services
      const services = await serviceCollection.find().toArray();
      //step2:get the booking of that day
      const query = { date: date };
      const bookings = await bookingCollection.find(query).toArray();
      //step3:for each service, find booking for that service
      services.forEach(service => {
        const serviceBookings = bookings.filter(b => b.treatment === service.name);
        const booked = serviceBookings.map(s => s.slot);
        const available = service.slots.filter(s => !booked.includes(s));
        service.slots = available;
      })
      res.send(services)

    })

    app.get('/booking', async (req, res) => {
      const patient = req.query.patient
      console.log(patient)
      const query = { patient: patient };
      const bookings = await bookingCollection.find(query).toArray();
      res.send(bookings);
    })

    app.post('/booking', async (req, res) => {
      const booking = req.body;
      const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient, }
      const exists = await bookingCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, booking: exists })
      }
      const result = await bookingCollection.insertOne(booking);
      return res.send({ success: true, result });
    })


  }
  finally {

  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello from doctors!')
})

app.listen(port, () => {
  console.log(`Doctors App listening on port ${port}`)
})