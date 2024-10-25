// backend/migrateEmployees.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { admin, db } = require('./firebase'); // Asegúrate de que la ruta a firebase.js sea correcta

// Ruta a tu base de datos SQLite
const dbPath = path.join(__dirname, 'database.db'); // Ajusta el nombre si tu archivo de base de datos tiene otro nombre

// Conectar a SQLite
const sqliteDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error al conectar a SQLite:', err.message);
        process.exit(1);
    }
    console.log('Conectado a la base de datos SQLite.');
});

// Función para migrar empleados
const migrateEmployees = () => {
    return new Promise((resolve, reject) => {
        sqliteDb.all('SELECT * FROM records', [], async (err, rows) => {
            if (err) {
                console.error('Error al obtener empleados de SQLite:', err.message);
                reject(err);
                return;
            }

            const batch = db.batch();

            rows.forEach((row) => {
                const employeeRef = db.collection('employees').doc(row.id.toString());
                batch.set(employeeRef, {
                    id: row.id.toString(),
                    name: row.name,
                    area: row.area
                });
            });

            try {
                await batch.commit();
                console.log('Migración completada. Se migraron', rows.length, 'empleados.');
                resolve();
            } catch (error) {
                console.error('Error al migrar empleados a Firestore:', error);
                reject(error);
            }
        });
    });
};

// Ejecutar la migración
migrateEmployees()
    .then(() => {
        sqliteDb.close();
        process.exit(0);
    })
    .catch((error) => {
        sqliteDb.close();
        process.exit(1);
    });
