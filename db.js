const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'portal-ds',
  password: 'cimatec',
  port: 5432,
});

module.exports = pool;
