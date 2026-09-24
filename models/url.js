const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema(
  {
    shortId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    redirectURL: {
      type: String,
      required: true,
    },
    clickCount: {
      type: Number,
      default: 0,
    },
    visitHistory: [
      {
        timestamp: {
          type: Number,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

const URL = mongoose.model('url', urlSchema);
const memoryStore = new Map();

function normalizeEntry(entry) {
  return {
    ...entry,
    clickCount: Number(entry.clickCount || entry.visitHistory?.length || 0),
    visitHistory: Array.isArray(entry.visitHistory) ? entry.visitHistory : [],
  };
}

const inMemoryRepository = {
  async create(data) {
    const entry = normalizeEntry({
      ...data,
      clickCount: Number(data.clickCount || data.visitHistory?.length || 0),
      visitHistory: Array.isArray(data.visitHistory) ? [...data.visitHistory] : [],
    });
    memoryStore.set(entry.shortId, entry);
    return entry;
  },

  async findOne(query = {}) {
    if (!query.shortId) return null;
    const entry = memoryStore.get(query.shortId);
    return entry ? normalizeEntry(entry) : null;
  },

  async findOneAndUpdate(query = {}, update = {}) {
    const currentEntry = memoryStore.get(query.shortId);
    if (!currentEntry) return null;

    const entry = normalizeEntry({ ...currentEntry });

    if (update.$push && update.$push.visitHistory) {
      entry.visitHistory = [...entry.visitHistory, update.$push.visitHistory];
      entry.clickCount = entry.visitHistory.length;
    }

    if (update.$inc && typeof update.$inc.clickCount === 'number') {
      entry.clickCount = (entry.clickCount || 0) + update.$inc.clickCount;
    }

    memoryStore.set(query.shortId, entry);
    return normalizeEntry(entry);
  },

  async find(query = {}) {
    const allEntries = [...memoryStore.values()].map(normalizeEntry);
    if (!query.shortId) return allEntries;
    return allEntries.filter((entry) => entry.shortId === query.shortId);
  },
};

function getUrlRepository() {
  return mongoose.connection.readyState === 1 ? URL : inMemoryRepository;
}

const repository = getUrlRepository();
repository.getUrlRepository = getUrlRepository;
repository.URL = URL;

module.exports = repository;