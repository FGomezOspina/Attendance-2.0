// backend/firebase.js
const admin = require('firebase-admin');
const path = require('path');

// Ruta al archivo JSON de credenciales
const serviceAccount = require(path.join(__dirname, 'attendance-509dd-firebase-adminsdk-w5i38-7ccb794e19.json'));

// Inicializar la aplicación de Firebase
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'attendance-509dd.appspot.com' // Reemplaza con el nombre de tu bucket de Storage
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

module.exports = { admin, db, bucket };
