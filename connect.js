const mongoose = require('mongoose');

mongoose.set('strictQuery', true);

async function connectToMongoDB(url) {
  return mongoose.connect(url, {
    serverSelectionTimeoutMS: 3000,
  });
}

module.exports = {
  connectToMongoDB,
};