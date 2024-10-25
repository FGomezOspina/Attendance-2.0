// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const apiRoutes = require('./routes/api');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Horarios esperados para cada área
const expectedSchedules = {
    "ASEO": { "check_in": "06:15", "check_out": "15:00" },
    "MANTENIMIENTO": { "check_in": "07:15", "check_out": "17:00" },
    "ADMINISTRACIÓN": { "check_in": "07:45", "check_out": "17:00" },
    "POSCOSECHA": { "check_in": "06:40", "check_out": "15:30" },
    // Puedes agregar más áreas y horarios según sea necesario
};

// Ruta al archivo de la base de datos
const dbDir = path.join(__dirname);
const dbPath = path.join(dbDir, 'database.db');

// Verificar si el directorio de la base de datos existe
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`Directorio creado: ${dbDir}`);
}

// Eliminar la base de datos existente (opcional, solo para pruebas)
// if (fs.existsSync(dbPath)) {
//     fs.unlinkSync(dbPath);
//     console.log('Base de datos eliminada para recreación.');
// }

// Inicializa la conexión a la base de datos SQLite
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('No se pudo conectar a la base de datos', err.message);
        process.exit(1); // Termina la ejecución si no se puede conectar
    } else {
        console.log('Conectado a la base de datos SQLite');
        createTables(); // Crear tablas después de conectarse a la base de datos
    }
});

// Crear tablas e insertar datos iniciales
const createTables = () => {
    db.serialize(() => {
        // Tabla de registros
        db.run(`CREATE TABLE IF NOT EXISTS records (
            id TEXT PRIMARY KEY,
            name TEXT,
            area TEXT
        )`, (err) => {
            if (err) {
                console.error('Error al crear la tabla records', err.message);
            } else {
                console.log('Tabla records verificada/existe');
            }
        });

        // Insertar datos iniciales si la tabla está vacía
        db.get(`SELECT COUNT(*) AS count FROM records`, (err, row) => {
            if (err) {
                console.error('Error al contar registros en records', err.message);
            } else if (row.count === 0) {
                const recordsData = [
                    ['1088327667', 'ERIKA TATIANA GALLEGO VINASCO', 'POSCOSECHA'],
                    ['1004520909', 'ANGIE VANESSA ARCE LOPEZ', 'POSCOSECHA'],
                    ['94509907', 'JULIÁN ANDRÉS PÉREZ BETANCUR', 'ADMINISTRACIÓN'],
                    ['22131943', 'ROSA AMELIA SOLORZANO SAMPEDRO', 'ASEO'],
                    ['1089747022', 'JUAN ESTEBAN TORO VARGAS', 'MANTENIMIENTO'],
                    ['1004733786', 'STEVEN ARCE VALLE', 'POSCOSECHA'],
                    ['1004756825', 'LAURA RAMIREZ QUINTERO', 'ADMINISTRACIÓN'],
                    ['1088305975', 'PAOLA ANDREA OSORIO GRISALES', 'POSCOSECHA'],
                    ['1004751727', 'LAURA VANESSA LONDOÑO SILVA', 'POSCOSECHA'],
                    ['1088256932', 'YEISON LEANDRO ARIAS MONTES', 'OPERACIONES'],
                    ['1088346284', 'NATALIA VALENCIA CORTES', 'ADMINISTRACIÓN'],
                    ['1117964380', 'YAMILETH HILARION OLAYA', 'POSCOSECHA'],
                    ['5760588', 'JOSE AUGUSTO CORDOVEZ CHARAMA', 'POSCOSECHA'],
                    ['1112770658', 'LUIS ALBERTO OROZCO RODRIGUEZ', 'POSCOSECHA'],
                    ['1110480331', 'CLAUDIA YULIMA CUTIVA BETANCOURTH', 'POSCOSECHA'],
                    ['25038229', 'YORME DE JESUS LOPEZ IBARRA', 'POSCOSECHA'],
                    ['1128844585', 'YENIFFER MOSQUERA PEREA', 'POSCOSECHA'],
                    ['1089930892', 'ALEXANDRA RIOS BUENO', 'POSCOSECHA'],
                    ['1088295574', 'ANDRES FELIPE BEDOYA ROJAS', 'POSCOSECHA'],
                    ['1004767653', 'BRAYAN ANDRES JARAMILLO URBANO', 'MANTENIMIENTO'],
                    ['1093984174', 'CARLOS ANDRES SANCHEZ QUEBRADA', 'POSCOSECHA'],
                    ['1193546514', 'MAYERLIN PARRA RIVEROS', 'POSCOSECHA'],
                    ['1088316215', 'SERGIO MUÑOZ RAMIREZ', 'ADMINISTRACIÓN'],
                    ['1128844863', 'BIVIAN YISET MOSQUERA PEREA', 'POSCOSECHA'],
                    ['30356482', 'MAGOLA PATIÑO ECHEVERRY', 'POSCOSECHA'],
                    ['1085816021', 'LEIDY CAROLINA JIMENEZ BERMUDEZ', 'POSCOSECHA'],
                    ['1089599713', 'MARIA CAMILA COLORADO LONDOÑO', 'POSCOSECHA'],
                    ['1007367459', 'FLOR NORELA VARGAS SERNA', 'POSCOSECHA'],
                    ['1004668536', 'LAURA CAMILA ARIAS HERNANDEZ', 'ADMINISTRACIÓN'],
                    ['1054926615', 'MARIA PAULA AGUIRRE OCHOA', 'ADMINISTRACIÓN'],
                    ['1089598139', 'JHON MICHAEL GOMEZ RESTREPO', 'POSCOSECHA'],
                    ['41214603', 'LUZ KARIME CONTRERAS BUITRAGO', 'POSCOSECHA'],
                    ['1060270203', 'MARCELA LOPEZ RAMIREZ', 'POSCOSECHA'],
                    ['1274327', 'WYNDIMAR YALUZ SANCHEZ HERRERA', 'POSCOSECHA'],
                    ['1118287112', 'MARTHA LUCIA LOPEZ ARBOLEDA', 'POSCOSECHA'],
                    ['5472144', 'NERYS CAROLINA HERNANDEZ GARCIA', 'POSCOSECHA'],
                    ['63530730', 'NORIZA NIÑO PEDRAZA', 'POSCOSECHA'],
                    ['1085717082', 'BRAYAN LEANDRO BELTRAN PIEDRAHITA', 'POSCOSECHA'],
                    ['1004755939', 'FABIO ANDRES GOMEZ OSPINA', 'ADMINISTRACIÓN'],
                    ['1089601326', 'LEIDY LAURA ESPINOZA OSPINA', 'POSCOSECHA'],
                    ['1007554110', 'ANGIE PAOLA OCAMPO HENAO', 'POSCOSECHA'],
                    ['1032936469', 'DANA CAROLINA SUAREZ GALEANO', 'POSCOSECHA'],
                    ['1090332929', 'MAIKOL JUNIOR CHIQUITO MONTOYA', 'POSCOSECHA'],
                    ['6624989', 'ADELMIRA PRADO NAVARRO', 'POSCOSECHA'],
                    ['42162247', 'NATALY TABIMA GARCIA', 'POSCOSECHA'],
                    ['42146393', 'ANGELA MARIA ALARCON ESCOBAR', 'POSCOSECHA']
                ];

                // Preparar la declaración SQL para insertar datos
                const insertStmt = db.prepare(`INSERT OR IGNORE INTO records (id, name, area) VALUES (?, ?, ?)`);

                recordsData.forEach(record => {
                    insertStmt.run([record[0], record[1], record[2]], (err) => {
                        if (err) {
                            console.error('Error al insertar registro', err.message);
                        }
                    });
                });

                insertStmt.finalize(() => {
                    console.log('Datos iniciales insertados en records');

                    // Verificar el contenido de la tabla records
                    db.all(`SELECT * FROM records`, [], (err, rows) => {
                        if (err) {
                            console.error('Error al obtener records', err.message);
                        } else {
                            console.log('Contenido de la tabla records:', rows);
                        }
                    });
                });
            }
        });

        // Tabla de archivos de asistencia
        db.run(`CREATE TABLE IF NOT EXISTS attendance_files (
            file_id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_name TEXT,
            upload_date TEXT,
            attendance_date TEXT
        )`, (err) => {
            if (err) {
                console.error('Error al crear la tabla attendance_files', err.message);
            } else {
                console.log('Tabla attendance_files verificada/existe');
            }
        });

        // Tabla de resultados emparejados
        db.run(`CREATE TABLE IF NOT EXISTS matched_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_id INTEGER,
            id_number TEXT,
            name TEXT,
            area TEXT,
            check_in TEXT,
            check_out TEXT,
            status TEXT,
            hours_worked TEXT,
            FOREIGN KEY (file_id) REFERENCES attendance_files(file_id)
        )`, (err) => {
            if (err) {
                console.error('Error al crear la tabla matched_results', err.message);
            } else {
                console.log('Tabla matched_results verificada/existe');
            }
        });
    });
};

// Hacer la base de datos accesible a las rutas
app.use((req, res, next) => {
    req.db = db;
    next();
});

// Rutas
app.use('/api', apiRoutes);

// Servir archivos frontend
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Algo salió mal!');
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
