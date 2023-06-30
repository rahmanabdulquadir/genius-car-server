const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;

// middle wares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.64qf7no.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeaders = req.headers.authorization 
  if(!authHeaders){
    return res.status(401).send({message: 'unauthorized access'})
  }
  const token = authHeaders.split(' ')[1]
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(403).send({message: 'forbidden access'})
    }
    req.decoded = decoded;
    next()
  })
}

async function run() {
  try {
    const serviceCollection = client.db("geniusCar").collection("services");
    const orderCollection = client.db("geniusCar").collection("orders");

    // implementation of jwt token
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    // get single selected service product by this api
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const service = await serviceCollection.findOne(query);
      res.send(service);
    });

    // all the orders related api from ordersCollection db

    // get all the orders from an user from this api through query (?email=example@gamil.com)
    app.get("/orders", verifyJWT, async (req, res) => {
      const decoded = req.decoded;
      if(decoded.email !== req.query.email){
        res.status(403).send({message: 'unauthorized access'})
      }
      let query = {};
      if (req.query.email) {
        query = {
          email: req.query.email,
        };
      }
      const cursor = orderCollection.find(query);
      const orders = await cursor.toArray();
      res.send(orders);
    });

    // make orders from frontend and save it in database by this api
    app.post("/orders", async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });

    // api for updating doc
    app.patch("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.body.status;
      const query = {
        _id: new ObjectId(id),
      };
      const updateDoc = {
        $set: {
          status: status,
        },
      };
      const result = await orderCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // api for deleting orders
    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
  }
}
run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("genius car server is running");
});

app.listen(port, () => {
  console.log(`genius car server running on ${port}`);
});
