const express = require('express')
const db = require('../db');
const app = express()

app.use(express.json())

const getUsers = (req, res) => {
         const users = "Select*from users"
         db.query(users , (err,result) => {
            if(err)
                console.log(err);
            else
                return res.send(result)
         })
};
const addUser = (req, res) => {
    const users = "INSERT INTO users (name, email, age) VALUES (?)";
    const values = [
        req.body.name,
        req.body.email,
        req.body.age
    ];

    db.query(users, [values], (err, result) => {
        if (err) {
            console.error(err);
            return res.send(err);
        }
        return res.send("Created successfully");
    });
};

const getUserById = (req, res) => {
    const userId = req.params.id;  
    const query = "SELECT * FROM users WHERE id = ?";

    db.query(query, userId, (err, result) => {
        if (err) {
            console.error( err);
        }

        if (result.length === 0) {
            return res.send("User not found" );
        }

        return res.json(result);
    });
};

const updateUser = (req,res) => {
    const userId = req.params.id;
    const { name, email, age } = req.body;

    const query = 'UPDATE users SET name = ?, email = ?, age = ?   WHERE id = ?';
    const values = [name, email, age, userId];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error(err);
            return res.send(err);
        }

        if (result.affectedRows === 0) {
            return res.send("User not found");
        }

        return res.send("User updated successfully",);
    });
}

const deleteUser = (req,res) => {
    const userId = req.params.id;

    const query = "DELETE FROM users WHERE id = ?";
    const values = [userId];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error(err);
            return res.send(err);
        }

        if (result.affectedRows === 0) {
            return res.send("User not found");
        }

        return res.send("User deleted successfully",);
    });
}

module.exports = {
  getUsers,
  getUserById,
  addUser,
  updateUser,
  deleteUser,
};