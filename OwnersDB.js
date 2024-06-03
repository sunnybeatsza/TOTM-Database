const express = require("express");
const app = express();
const mysql = require("mysql2");
const cors = require("cors");
const multer = require("multer");
const upload = multer();

app.use(express.json());
app.use(cors());

// Creating a connection
const connection = mysql.createPool({
  host: "basic-db.clukcwgswmnr.us-east-1.rds.amazonaws.com",
  user: "admin",
  password: "MasterDB",
  database: "owners_information",
  port: "3306",
});

// Check for a successful connection
connection.getConnection((err) => {
  if (err) {
    console.error("Error connecting to the database:", err);
  } else {
    console.log("Successfully connected to the database");
  }
});

// Define a MySQL table structure for storing documents
const createDocumentsTable = `CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT,
    document_name VARCHAR(255),
    document_data LONGBLOB,
    FOREIGN KEY (owner_id) REFERENCES owners_information(id) ON DELETE CASCADE
)`;

const createOwnerTable = `CREATE TABLE IF NOT EXISTS owners_information (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    surname VARCHAR(255) NOT NULL,
    id_number VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    gender VARCHAR(10) NOT NULL,
    password VARCHAR(255) NOT NULL
)`;

connection.query(createOwnerTable, (err, result) => {
  if (err) {
    console.error("Error creating owners_information table:", err);
  } else {
    console.log("Owners information table created successfully");
  }
});

connection.query(createDocumentsTable, (err, result) => {
  if (err) {
    console.error("Error creating documents table:", err);
  } else {
    console.log("Documents table created successfully");
  }
});

app.post("/create_owner", (req, res) => {
  const ownerInfo = req.body;
  const insertQuery = `INSERT INTO owners_information (name, surname, id_number, email, phone_number, gender, password) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  connection.query(
    insertQuery,
    [
      ownerInfo.name,
      ownerInfo.surname,
      ownerInfo.id_number,
      ownerInfo.email,
      ownerInfo.phone_number,
      ownerInfo.gender,
      ownerInfo.password,
    ],
    (err, result) => {
      if (err) {
        console.error("Error creating owner:", err);
        return res.status(500).json({ error: "Failed to create owner" });
      }
      console.log("Owner created successfully");
      res.status(200).json({
        message: "Owner created successfully",
        ownerId: result.insertId,
      });
    }
  );
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const selectQuery = `SELECT * FROM owners_information WHERE email = ? AND password = ?`;
  connection.query(selectQuery, [email, password], (err, results) => {
    if (err) {
      console.error("Error retrieving owner:", err);
      return res.status(500).json({ error: "Failed to retrieve owner" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Invalid email or password" });
    }

    const owner = results[0];
    res
      .status(200)
      .json({
        message: `Login successful, Welcome ${owner.name}`,
        ownerId: owner.id,
      });
  });
});

app.get("/get_owner", (req, res) => {
  const ownerId = req.query.id;

  if (!ownerId) {
    return res.status(400).json({ error: "Owner ID is required" });
  }

  const selectQuery = `SELECT * FROM owners_information WHERE id = ?`;
  connection.query(selectQuery, [ownerId], (err, results) => {
    if (err) {
      console.error("Error retrieving owner:", err);
      return res.status(500).json({ error: "Failed to retrieve owner" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Owner not found" });
    }

    res.status(200).json(results[0]);
  });
});

app.get("/get_owners", (req, res) => {
  const selectQuery = `SELECT * FROM owners_information`;

  connection.query(selectQuery, (err, results) => {
    if (err) {
      console.error("Error retrieving owners:", err);
      return res.status(500).json({ error: "Failed to retrieve owners" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "No owners found" });
    }

    res.status(200).json(results);
  });
});

// Handle document upload
app.post("/upload", upload.single("ID_docs"), (req, res) => {
  const document = req.file;
  if (!document) {
    return res.status(400).json({ error: "No document uploaded" });
  }

  const ownerId = req.body.ownerId; // Access ownerId directly
  const documentData = document.buffer; // Assuming Multer stores the file data in buffer
  const documentName = document.originalname;

  const insertQuery =
    "INSERT INTO documents (owner_id, document_name, document_data) VALUES (?, ?, ?)";
  connection.query(
    insertQuery,
    [ownerId, documentName, documentData],
    (err, result) => {
      if (err) {
        console.error("Error uploading document:", err);
        return res.status(500).json({ error: "Failed to upload document" });
      }
      console.log("Document uploaded successfully");
      res.status(200).json({ message: "Document uploaded successfully" });
    }
  );
});

app.patch(`/update_owner/:id`, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, surname, id_number, email, phone_number, gender, password } =
      req.body;

    // Check if at least one field to update is provided
    if (
      !(
        name ||
        surname ||
        id_number ||
        email ||
        phone_number ||
        gender ||
        password
      )
    ) {
      return res
        .status(400)
        .json({ error: "At least one field to update is required" });
    }

    const updateValues = [];
    const updateFields = [];

    // Check each field and add it to the updateFields array if it's provided
    if (name) {
      updateFields.push("name = ?");
      updateValues.push(name);
    }
    if (surname) {
      updateFields.push("surname = ?");
      updateValues.push(surname);
    }
    if (id_number) {
      updateFields.push("id_number = ?");
      updateValues.push(id_number);
    }
    if (email) {
      updateFields.push("email = ?");
      updateValues.push(email);
    }
    if (phone_number) {
      updateFields.push("phone_number = ?");
      updateValues.push(phone_number);
    }
    if (gender) {
      updateFields.push("gender = ?");
      updateValues.push(gender);
    }
    if (password) {
      updateFields.push("password = ?");
      updateValues.push(password);
    }

    // Construct the update query based on the provided fields
    const updateQuery = `UPDATE owners_information SET ${updateFields.join(
      ", "
    )} WHERE id = ?`;
    updateValues.push(id);

    // Execute the update query
    const [update] = await connection
      .promise()
      .query(updateQuery, updateValues);

    // Check if any rows were affected (i.e., if the owner exists and was updated)
    if (update.affectedRows === 0) {
      return res.status(404).json({ error: "Owner not found" });
    }

    // Return success message
    res.status(200).json({ message: "Owner updated successfully" });
  } catch (err) {
    // Handle errors
    console.error("Error updating owner:", err);
    res.status(500).json({ error: "Failed to update owner" });
  }
});

app.delete("/delete_owner/:id", async (req, res) => {
  try {
    const ownerId = req.params.id;

    // Check if owner ID is provided
    if (!ownerId) {
      return res.status(400).json({ error: "Owner ID is required" });
    }

    // Delete owner from the database
    const deleteQuery = `DELETE FROM owners_information WHERE id = ?`;
    const [result] = await connection.promise().query(deleteQuery, [ownerId]);

    // Check if any rows were affected (i.e., if the owner exists and was deleted)
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Owner not found" });
    }

    // Return success message
    res.status(200).json({ message: "Owner deleted successfully" });
  } catch (err) {
    // Handle errors
    console.error("Error deleting owner:", err);
    res.status(500).json({ error: "Failed to delete owner" });
  }
});

app.get("/", async (req, res) => {
  res.send("Welcome to T.O.T.M backend");
});

app.listen(8080, () => {
  console.log("Server is listening on http://localhost:8080");
});
