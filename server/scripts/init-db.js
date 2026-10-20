// server/scripts/init-db.js
const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

async function init() {
  console.log('🔧 Initialisation de la base de données...');
  const sql = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf-8');
  await pool.query(sql);
  console.log('✅ Schéma appliqué avec succès.');
  await pool.end();
}

init().catch((err) => {
  console.error('❌ Échec init DB:', err.message);
  process.exit(1);
});