const express = require('express')
const { CosmosClient } = require('@azure/cosmos')
const {
   getUsers,
   getUserById,
   addUser,
   updateUser,
   deleteUser,
} = require('./Controller/user');
const sql = require('./db')
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const app = express()
app.use(express.json())

sql.connect(function (err) {
   if (err) {
      console.log(err)
   } else {
      console.log("MYSQL Connected Successfully")
      sql.query('show databases',
         function (err, result) {
            if (err) {
               console.log(err);
            } else {
               console.log(result);
            }
         }
      )
   }
})

app.get("/", getUsers);
app.get("/:id", getUserById);
app.post("/users", addUser);
app.put("/:id", updateUser);
app.delete("/:id", deleteUser);

const endpoint = "https://localhost:8081"
const key = "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw=="
const client = new CosmosClient({ endpoint, key, tls: { rejectUnauthorized: false } })
let container;

async function cosmosConnection() {
   try {

      const { database } = await client.databases.createIfNotExists({
         id: 'practice',
         throughput: 400
      })

      const { container: cosmosContainer } = await database.containers.createIfNotExists({
         id: 'users',
         partitionKey: {
            paths: [
               '/id'
            ]
         }
      })
      console.log("Cosmos Db Connected Successfully");
      container = cosmosContainer;
   }
   catch (err) {
      console.log(err);
   }
}

cosmosConnection()

app.get('/users', async (req, res) => {
   try {
      const { resource: user } = await container.read();  
      if (user) {
         res.send(user);
      } else {
         res.send('User not found');
      }
   } catch (err) {
      res.send(err);
   }
});


app.get('/users/:id', async (req, res) => {
   try {
      const id = req.params.id;
      const { resource: user } = await container.item(id, id).read();  
      if (user) {
         res.send(user);
      } else {
         res.send('User not found');
      }
   } catch (err) {
      res.send(err);
   }
});

async function createUser(userData) {
   const item = {
      id: String(userData.id),  
      fullName: userData.fullName,
      contact: {
         email: userData.email
      },
      orders: userData.orders 
   };

   const { resource: createdUser } = await container.items.create(item);
   return createdUser;
}


app.post('/cusers', async (req, res) => {
   try {
       const userData = req.body;
       const createdUser = await createUser(userData);
       res.json(createdUser);
   } catch (error) {
      console.log(error);
       res.send('Error creating user');
   }
});

app.put('/users/:id', async (req, res) => {
   try {
       const id = req.params.id;         
       const userData = req.body;

       if (!userData || Object.keys(userData).length === 0) {
           return res.send("No update");
       }

       const partitionKey = id; 

       const { resource: existingUser } = await container.item(id, partitionKey).read();

       if (!existingUser) {
           return res.send('User not found');
       }

       const updatedUser = {
           ...existingUser,
           ...userData,
           id: id  
       };

       console.log(updatedUser);

       const { resource: result } = await container.item(id, partitionKey).replace(updatedUser);

       res.json(updatedUser);
   } catch (error) {
       console.log(error);
       res.send('Error updating user');
   }
});

app.delete('/users/:id', async (req, res) => {
   try {
      const id = req.params.id;
      const partitionKey = id;  

      const { resource: user } = await container.item(id, partitionKey).read();

      if (!user) {
         return res.send('User not found');
      }

      await container.item(id, partitionKey).delete();

      res.send({ message: 'User deleted successfully', id });
   } catch (error) {
      console.log(error);
      res.send('Error deleting user');
   }
});


app.get('/migrate', async (req, res) => {
   try {
      const [users] = await sql.promise().query("SELECT * FROM Users");


      for (const user of users) {
         const [orders] = await sql.promise().query(
            "SELECT item FROM Orders WHERE userId = ?",
            [user.id]
         );

         const q = {
            id: String(user.id),
            fullName: user.name,
            contact: {
               email: user.email
            },
            orders: orders.map(o => ({ item: o.item }))
         };

         await container.items.upsert(q);
      }

      res.send("Migration completed successfully");
   } catch (error) {
      console.error(error);
      res.send("Migration failed");
   }
});



app.listen(1234, () => {
   console.log("Server started");
})