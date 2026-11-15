
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const path = require("path");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// BOOK SCHEMA
// ===============================

const bookSchema = new mongoose.Schema({
  title: String,
  author: String,
  genre: String,
  price: Number,
  coverUrl: String
});

const Book = mongoose.model("Book", bookSchema);

// ===============================
// ORDER SCHEMA
// ===============================

const orderSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: true,
      trim: true
    },

    items: [
      {
        book: {
          title: {
            type: String,
            required: true
          }
        },
        price: {
          type: Number,
          required: true,
          min: 0
        },
        quantity: {
          type: Number,
          required: true,
          min: 1
        }
      }
    ],

    phone: {
      type: String,
      required: true,
      trim: true
    },

    address: {
      type: String,
      required: true,
      trim: true
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled"
      ],
      default: "Pending"
    }
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

// ===============================
// BOOKS DATA
// ===============================

const novels = [
  { title: "The Alchemist", author: "Paulo Coelho", genre: "English" },
  { title: "It Ends With Us", author: "Colleen Hoover", genre: "English" },
  { title: "Ugly Love", author: "Colleen Hoover", genre: "English" },
  { title: "Verity", author: "Colleen Hoover", genre: "English" },
  { title: "The Silent Patient", author: "Alex Michaelides", genre: "English" },
  { title: "The Fault in Our Stars", author: "John Green", genre: "English" },
  { title: "Twisted Love", author: "Ana Huang", genre: "English" },
  { title: "November 9", author: "Colleen Hoover", genre: "English" },
  { title: "The Love Hypothesis", author: "Ali Hazelwood", genre: "English" },
  { title: "A Thousand Splendid Suns", author: "Khaled Hosseini", genre: "English" },
  { title: "The Kite Runner", author: "Khaled Hosseini", genre: "English" },
  { title: "Pride and Prejudice", author: "Jane Austen", genre: "English" },
  { title: "Atomic Habits", author: "James Clear", genre: "English" },
  { title: "The Great Gatsby", author: "F. Scott Fitzgerald", genre: "English" },
  { title: "Harry Potter", author: "J.K. Rowling", genre: "English" },

  { title: "Peer-e-Kamil", author: "Umera Ahmed", genre: "Urdu" },
  { title: "Aab-e-Hayat", author: "Umera Ahmed", genre: "Urdu" },
  { title: "Jannat Kay Pattay", author: "Nimra Ahmed", genre: "Urdu" },
  { title: "Namal", author: "Nimra Ahmed", genre: "Urdu" },
  { title: "Mushaf", author: "Nimra Ahmed", genre: "Urdu" },
  { title: "Haalim", author: "Nimra Ahmed", genre: "Urdu" },
  { title: "Amarbail", author: "Umera Ahmed", genre: "Urdu" },
  { title: "Zindagi Gulzar Hai", author: "Umera Ahmed", genre: "Urdu" },
  { title: "La Hasil", author: "Umera Ahmed", genre: "Urdu" },
  { title: "Man-o-Salwa", author: "Umera Ahmed", genre: "Urdu" },
  { title: "Mala", author: "Nimra Ahmed", genre: "Urdu" },
  { title: "Humsafar", author: "Farhat Ishtiaq", genre: "Urdu" },
  { title: "Bin Roye Ansoo", author: "Farhat Ishtiaq", genre: "Urdu" },
  { title: "Diyar-e-Dil", author: "Farhat Ishtiaq", genre: "Urdu" },
  { title: "Yaram", author: "Sumaira Hameed", genre: "Urdu" }
];

// ===============================
// SEED BOOKS
// ===============================

async function seedBooks() {
  try {
    const count = await Book.countDocuments();

    if (count === 0) {
      const booksToInsert = novels.map(book => ({
        ...book,
        price: 0,
        coverUrl: ""
      }));

      await Book.insertMany(booksToInsert);
      console.log("Books Added Successfully!");
    }
  } catch (error) {
    console.log("Book Seed Error:", error.message);
  }
}

// ===============================
// ADMIN AUTH MIDDLEWARE
// ===============================

function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Please login first"
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.isAdmin) {
      return res.status(403).json({
        message: "Admin access required"
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
}

// ===============================
// ADMIN LOGIN
// ===============================

app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;

    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      return res.status(500).json({
        message: "Admin credentials are not configured in environment variables"
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: "JWT_SECRET is missing"
      });
    }

    const enteredEmail = String(email || "").trim().toLowerCase();
    const adminEmail = process.env.ADMIN_EMAIL.trim().toLowerCase();

    if (
      enteredEmail !== adminEmail ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      {
        email: adminEmail,
        isAdmin: true
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token: token,
      user: {
        email: adminEmail,
        isAdmin: true
      }
    });

  } catch (error) {
    console.log("Login Error:", error.message);

    res.status(500).json({
      message: "Unable to login"
    });
  }
});

// ===============================
// GET ALL BOOKS
// ===============================

app.get("/api/books", async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (error) {
    res.status(500).json({
      message: "Unable to fetch books"
    });
  }
});

// ===============================
// PLACE CUSTOMER ORDER
// ===============================

app.post("/api/orders", async (req, res) => {
  try {
    const {
      customerName,
      items,
      phone,
      address,
      totalAmount
    } = req.body;

    if (
      !customerName ||
      !Array.isArray(items) ||
      items.length === 0 ||
      !phone ||
      !address ||
      !Number.isFinite(Number(totalAmount))
    ) {
      return res.status(400).json({
        message: "Please provide all required order details"
      });
    }

    const validItems = items.every(item =>
      item &&
      item.book &&
      typeof item.book.title === "string" &&
      item.book.title.trim() !== "" &&
      Number.isFinite(Number(item.price)) &&
      Number(item.price) >= 0 &&
      Number.isInteger(Number(item.quantity)) &&
      Number(item.quantity) > 0
    );

    if (!validItems) {
      return res.status(400).json({
        message: "Invalid book details in order"
      });
    }

    const calculatedTotal = items.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );

    if (Math.abs(calculatedTotal - Number(totalAmount)) > 0.01) {
      return res.status(400).json({
        message: "Order total does not match the items"
      });
    }

    const newOrder = new Order({
      customerName: String(customerName).trim(),
      items: items.map(item => ({
        book: {
          title: item.book.title.trim()
        },
        price: Number(item.price),
        quantity: Number(item.quantity)
      })),
      phone: String(phone).trim(),
      address: String(address).trim(),
      totalAmount: calculatedTotal,
      status: "Pending"
    });

    await newOrder.save();

    res.status(201).json({
      success: true,
      message: "Your order has been placed successfully!",
      order: newOrder
    });

  } catch (error) {
    console.log("Order Error:", error.message);

    res.status(500).json({
      message: "Unable to place order"
    });
  }
});

// ===============================
// GET ALL ADMIN ORDERS
// ===============================

app.get("/api/admin/orders", verifyAdmin, async (req, res) => {
  try {
    const orders = await Order.find().sort({
      createdAt: -1
    });

    res.json(orders);

  } catch (error) {
    console.log("Fetch Orders Error:", error.message);

    res.status(500).json({
      message: "Unable to fetch orders"
    });
  }
});

// ===============================
// UPDATE ORDER STATUS
// ===============================

app.patch("/api/admin/orders/:id", verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "Pending",
      "Confirmed",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status"
      });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { status: status },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    res.json({
      success: true,
      message: "Order status updated",
      order: updatedOrder
    });

  } catch (error) {
    console.log("Update Status Error:", error.message);

    res.status(500).json({
      message: "Unable to update order"
    });
  }
});

// ===============================
// HOME ROUTE
// ===============================

app.get("/", (req, res) => {
  res.send("VELORA Backend is Running!");
});

// ===============================
// SERVER + DATABASE CONNECTION
// ===============================

const PORT = process.env.PORT || 5000;

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI is missing in .env file");
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing in .env file");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB Connected Successfully!");

    await seedBooks();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(error => {
    console.log("MongoDB Connection Error:", error.message);
  });
