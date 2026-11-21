import database from './connect.js';

export default {
  async scheduled(_controller, env, context) {
    const task = database.keepDatabaseWarm(env).catch((error) => {
      console.error('[db] scheduled keepalive failed:', error.message);
    });
    context.waitUntil(task);
  },
};
