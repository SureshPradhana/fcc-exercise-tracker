const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const {MongoClient}=require('mongodb');
const { ObjectId } = require('mongodb');

async function main(callback){
  const url=process.env.MONGO_URI;
  const client =new MongoClient(url,{ useNewUrlParser: true, useUnifiedTopology: true })
  try {
    await client.connect();
    await callback(client);

  }catch(e){
    console.log(e)
  }
}
main(async (client)=>{
  const database =await client.db('exercisetracker');
  const collection =await database.collection('users');
  const exercise =await database.collection('exercises');
  app.post('/api/users',async (req,res)=>{
    const data=req.body.username;
    const us=await collection.insertOne({username:data})
    res.json({username: data, _id: us.insertedId});
  })
  app.get('/api/users',async (req,res)=>{
    const data = await collection.find({}, { projection: { _id: 1, username: 1 } });
    const users = await data.toArray();
    res.json(users);
  })
  app.post('/api/users/:_id/exercises',async (req,res)=>{
    const userId = req.params._id;
    const objectId = new ObjectId(userId);
    const user =await collection.findOne({_id: objectId});
    const usern=user.username;
    const existingExercise = await exercise.findOne({  userId: userId });
    let { duration, description, date } = req.body;
    const dt= formated(date).toLocaleDateString();
    duration=Number(duration);
    if (existingExercise) {
      await exercise.findOneAndUpdate(
        { userId:userId},
        { $set: { description:description,duration:duration,date:dt},
          $push: {
          logs: {
            description: description,
            duration: duration,
            date: dt
            }
          } 
        }
      );
    }
    else {
      await exercise.insertOne({
      userId: userId,
      description,
      duration: duration,
      date: dt,
      logs:[{description: description,
            duration: duration,
            date: dt}]
     });
    }
    res.json({username:usern,
      description: description,
      duration:duration,
      date: new Date(dt).toDateString(),
      _id: userId
    });
  })
  app.get('/api/users/:_id/logs',async (req,res)=>{
    const userId = req.params._id;
    const objectId = new ObjectId(userId);
    const collection =await database.collection('users');
    const user =await collection.findOne({_id: objectId});
    const usern=user.username;
    const exercise =await database.collection('exercises');
    const result=await exercise.findOne({userId:userId});
    let { from, to, limit } = req.query;
    if (from) {
      from = new Date(from);
    }
    if (to) {
      to = new Date(to);
    }
    let logs = result.logs;
    if (from) {
      logs = logs.filter((log) => new Date(log.date) >= from);
    }
    if (to) {
      logs = logs.filter((log) => new Date(log.date) <= to);
    }
    if (limit) {
      logs = logs.slice(0, Number(limit));
    }
    const count = result.logs.length;
    res.json({username: usern,
      count: count,
      _id: userId,
      log:logs.map(({ description, duration, date }) => ({
          description,
          duration,
          date: new Date(date).toDateString(),
        })
      )
    })
  })      
})
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

function formated(d){
  return d ? new Date(d):new Date();
}
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
