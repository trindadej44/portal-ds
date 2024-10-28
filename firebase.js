const admin = require('firebase-admin');

const serviceAccount = require('./path/to/serviceAccountKey.json'); // Baixe a chave JSON do Firebase e aponte para o caminho correto

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://<YOUR_PROJECT_ID>.firebaseio.com' // Substitua pelo seu URL do Firebase
});

module.exports = admin;
