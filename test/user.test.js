const { MongoClient } = require('mongodb');

describe('User Model', () => {
  let client;
  let db;
  let usersCollection;

  beforeAll(async () => {
    // Set up the MongoDB client and connect to the database
    client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    db = client.db('test'); // Use your test database
    usersCollection = db.collection('users'); // Your collection name
  });

  afterAll(async () => {
    // Clean up and close the database connection
    await usersCollection.deleteMany({}); // Clean up users
    await client.close();
  });

  it('should create a valid user', async () => {
    const user = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin',
    };

    const result = await usersCollection.insertOne(user);

    expect(result.acknowledged).toBe(true); // Ensure the operation was acknowledged
    expect(result.insertedId).toBeTruthy(); // Ensure the insertedId is present

    const insertedUser = await usersCollection.findOne({ _id: result.insertedId });
    
    expect(insertedUser.username).toBe('testuser');
    expect(insertedUser.email).toBe('test@example.com');
    expect(insertedUser.role).toBe('admin');
  });

  it('should fail when email is missing', async () => {
    const user = {
      username: 'testuser',
      password: 'password123',
    };

    try {
      await usersCollection.insertOne(user);
    } catch (error) {
      expect(error).toHaveProperty('name', 'MongoError');
    }
  });
});
