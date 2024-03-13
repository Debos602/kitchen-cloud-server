const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

// Middleware
app.use(cors()); // Enable CORS for all origins

app.use(express.json());

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gdk9eql.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

// JWT verification middleware
function verifyJWT(req, res, next) {
	console.log(req.headers.authorization);

	const authHeader = req.headers.authorization;
	if (!authHeader) {
		return res.status(401).send({ message: "unauthorized access" });
	}

	const token = authHeader.split(" ")[1];

	jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (error, decoded) {
		if (error) {
			return res.status(401).send({ message: "unauthorized access" });
		}
		req.decoded = decoded;
		next();
	});
}

async function run() {
	try {
		await client.connect();
		const serviceCollection = client.db("CloudKitchen").collection("services");
		const reviewCollection = client.db("CloudKitchen").collection("review");
		const foodCollection = client.db("CloudKitchen").collection("foodList");

		// Route definitions
		app.post("/jwt", (req, res) => {
			const user = req.body;
			const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
				expiresIn: "1h",
			});
			res.send({ token });
		});

		app.get("/services", async (req, res) => {
			const page = req.query.page;
			const size = parseInt(req.query.size);
			const query = {};
			const cursor = serviceCollection.find(query);
			const services = await cursor
				.skip(page * size)
				.limit(size)
				.toArray();
			const count = await serviceCollection.estimatedDocumentCount();
			res.send({ count, services });
		});

		app.get("/foodlist", async (req, res) => {
			const query = {};
			const cursor = foodCollection.find(query);
			const allFood = await cursor.toArray();
			res.send(allFood);
		});

		app.get("/services/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const service = await serviceCollection.findOne(query);
			res.send(service);
		});

		app.get("/review/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const review = await serviceCollection.findOne(query);
			res.send(review);
		});

		app.get("/reviews", verifyJWT, async (req, res) => {
			const decoded = req.decoded;
			console.log("Inside kitchen api", decoded);
			if (decoded.email !== req.query.email) {
				res.status(403).send({ message: "Forbidden access" });
			}

			let query = {};
			if (req.query.email) {
				query = {
					email: req.query.email,
				};
			}

			const cursor = reviewCollection.find(query);
			const reviews = await cursor.toArray();
			res.send(reviews);
		});

		app.post("/review", async (req, res) => {
			const review = req.body;
			const result = await reviewCollection.insertOne(review);
			res.send(result);
		});

		app.post("/addservice", async (req, res) => {
			const newService = req.body;
			const result = await serviceCollection.insertOne(newService);
			res.send(result);
		});

		app.put("/myreview/:id", async (req, res) => {
			const id = req.params.id;
			const filter = { _id: new ObjectId(id) };
			const editedReview = req.body;
			const updateReview = {
				$set: {
					message: editedReview.message,
				},
			};

			const result = await reviewCollection.updateOne(filter, updateReview);
			res.send(result);
		});

		app.delete("/review/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await reviewCollection.deleteOne(query);
			res.send(result);
		});
	} finally {
	}
}
run().catch((error) => console.log(error));

// Home route
app.get("/", (req, res) => {
	res.send("Kitchen-Cloud server is running");
});

// Start server
app.listen(port, () => {
	console.log(`Kitchen-Cloud server running on port ${port}`);
});
