const { MongoClient } = require("mongodb");
const request = require("supertest");
const app = require("../../src/app");
const mongoose = require("mongoose");
const { users } = require("../../data/mockUsers");
const { books } = require("../../data/mockBooks");

describe("User", () => {
  let connection;
  let db;

  beforeAll(async () => {
    connection = await MongoClient.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    db = await connection.db();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await connection.close();
    await db.close();
  });

  const insertUserDataIntoTestDB = async () => {
    const collection = db.collection("users");
    await collection.insertMany(users);
  };

  beforeEach(async () => {
    await db.dropDatabase();
    await insertUserDataIntoTestDB();
  });

  const route = (params = "") => {
    return `/users/${params}`;
  };

  describe("get user route", () => {
    it("GET/users/:id should return the person name and book collection info based on id given", async () => {
      const validId = "7d2e85951b62fc093cc3319b";
      const response = await request(app).get(route(validId));
      expect(response.status).toBe(200);

      const mockBooksWithStringID = [];
      for (let book of books) {
        mockBooksWithStringID.push(JSON.parse(JSON.stringify(book)));
      }

      expect(response.body).toEqual({
        name: "Bob",
        books: mockBooksWithStringID,
      });
    });

    it("GET/users/:id should return 404 error if invalid id is given", async () => {
      const invalidId = "5d2e7e1aec0f970d68a71465";
      const response = await request(app).get(route(invalidId));
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: `Unable to find user with id: ${invalidId}`,
      });
    });
  });

  describe("login route", () => {
    it("POST should be able to login a user if correct email and password is given", async () => {
      const response = await request(app)
        .post(route("login"))
        .set("Content-Type", "application/json")
        .send({ email: "bob@gmail.com", password: "123" });
      expect(response.status).toBe(200);
      expect(response.body.name).toBe("Bob");
      expect(response.body.books[0].title).toBe("1984");
      expect(response.body.books[1].title).toBe("Brave New World");
      expect(response.body.books[2].title).toBe("Fahrenheit 451");
    });

    it("POST should not be able to login if wrong email is given", async () => {
      const response = await request(app)
        .post(route("login"))
        .set("Content-Type", "application/json")
        .send({ email: "random@gmail.com", password: "123" });
      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Wrong credentials");
    });

    it("POST should not be able to login if wrong password is given", async () => {
      const response = await request(app)
        .post(route("login"))
        .set("Content-Type", "application/json")
        .send({ email: "bob@gmail.com", password: "random" });
      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Wrong password");
    });
  });

  describe("register route", () => {
    it("POST should be able to register a new user and store new user profile in database", async () => {
      const newUser = {
        name: "Tom",
        email: "tom@gmail.com",
        password: "qwe",
        passwordConfirmation: "qwe",
      };

      const response = await request(app)
        .post(route("register"))
        .set("Content-Type", "application/json")
        .send(newUser);
      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Account created");

      const usersCollection = await db.collection("users");
      const insertedNewUser = await usersCollection.findOne({
        email: newUser.email,
      });
      expect(insertedNewUser.name).toBe("Tom");
      expect(insertedNewUser.books).toEqual([]);
    });

    it("POST should deny registration if the same email is already registered", async () => {
      const sameEmailUser = {
        name: "Johny",
        email: "john@gmail.com",
        password: "123",
        passwordConfirmation: "123",
      };
      const response = await request(app)
        .post(route("register"))
        .set("Content-Type", "application/json")
        .send(sameEmailUser);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("User already exists");
    });

    it("POST should deny registration if password and confirm password don't match", async () => {
      const newUser = {
        name: "Tom",
        email: "tom@gmail.com",
        password: "abc",
        passwordConfirmation: "123",
      };

      const response = await request(app)
        .post(route("register"))
        .set("Content-Type", "application/json")
        .send(newUser);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Password does not match");
    });
  });
});
