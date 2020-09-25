// imports
import express from 'express';
import mongoose from 'mongoose';
import Pusher from 'pusher';
import admin from 'firebase-admin';
import ChatRooms from './dbChatRooms.js';
import Messages from './dbMessages.js';
import Users from './dbUsers.js';
import cors from 'cors';

// firebase admin config
import serviceAccount from './firebase-config/serviceAccount.js';
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://my-whatsapp-f7a19.firebaseio.com"
});

// app config
const app = express();
const port = process.env.PORT || 9000;

const pusher = new Pusher({
  appId: '*****',
  key: '************',
  secret: '*************',
  cluster: 'mt1',
  encrypted: true
});

// middleware
app.use(express.json());
app.use(cors());


// DB config
const password = '*************';
const dbName = '*******';
const dbConnectionUri = `mongodb+srv://admin:${password}@cluster0.hbqkj.mongodb.net/${dbName}?retryWrites=true&w=majority`
mongoose.connect(dbConnectionUri, {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true
}).catch(err => console.log(err.message));

const db = mongoose.connection;
db.once('open', () => {
  console.log('db is connected');

  const msgCollection = db.collection('messages');
  const changeStream = msgCollection.watch();

  changeStream.on('change', async (change) => {
    console.log('change:', change);

    if (change.operationType === 'insert') {
      const messageDetails = change.fullDocument;
      const roomId = messageDetails.room;
      const user = await Users.findOne({_id: messageDetails.user});
      pusher.trigger(`channel_${roomId}`, 'inserted', {
        ...messageDetails,
        user
      });
    } else {
      console.log('There was a problem triggering pusher');
    }
  })
});

// api routes
app.get('/', (req, res) => {
  res.status(200).send('Hello World');
});

// get all chatrooms
app.get('/api/v1/rooms', async (req, res) => {
  const chatRooms = await ChatRooms.find({}).select().populate({
    path: 'messages',
    options: {
      limit: 1,
      sort: { createdAt: -1 }
    }
  });
  res.status(200).send(chatRooms);
});

// get all messages in a chatroom
app.get('/api/v1/messages/:roomId', async (req, res) => {
  try {
    const chatRoom = (await ChatRooms.findOne({ _id: req.params.roomId }).populate({
      path: 'messages',
      populate: {
        path: 'user'
      }
    }));
    const messages = chatRoom.messages || [];
    res.status(200).send(messages);
  } catch (err) {
    res.status(500).send({ err: err.message });
  }
});

// get a user
app.get('/api/v1/users/:uid', async (req, res) => {
  const user = await Users.findOne({ uid: req.params.uid });
  res.status(200).send(user);
});

// create a new chat room
app.post('/api/v1/rooms/new', async (req, res) => {
  try {
    const { name } = req.body;
    const room = await ChatRooms.create({
      name
    });
    res.status(201).send(room);
  } catch (err) {
    res.status(500).send({ err: err.message });
  }
});

// post a message to a chat room
app.post('/api/v1/messages/:roomId', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { message, user, timestamp } = req.body;
    const roomId = req.params.roomId;
    const room = await ChatRooms.findOne({ _id: roomId });

    const createdMessage = new Messages({
      message,
      user,
      timestamp: new Date(timestamp),
      room: roomId
    });
    await createdMessage.save();
    room.messages.push(createdMessage);
    await room.save();

    await session.commitTransaction();

    res.status(201).send(createdMessage);
  } catch (err) {
    await session.abortTransaction();
    res.status(500).send({ err: err.message });
  } finally {
    session.endSession();
  }
});

// create a user
app.post('/api/v1/users/new', async (req, res) => {
  try {
    const { name, uid } = req.body;
    let createdUser = await Users.findOne({ uid });
    
    if (!createdUser) {
      createdUser = await Users.create({
        name, 
        uid
      });
    }

    res.status(200).send(createdUser);
  } catch (err) {
    res.status(500).send({ err: err.message });
  }
});

app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

// listen
app.listen(port, () => console.log(`Listining on port ${port}`));
