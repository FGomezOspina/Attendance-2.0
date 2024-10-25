// backend/routes/api.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar almacenamiento con multer
const uploadDir = path.join(__dirname, '../uploads');

// Verificar si el directorio 'uploads' existe, si no, crearlo
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Directorio creado: ${uploadDir}`);
}

const upload = multer({ dest: uploadDir });

// Horarios esperados para cada área, diferenciando entre días laborables y sábados
const expectedSchedules = {
    "ASEO": { 
        "weekday": { "check_in": "06:15", "check_out": "15:00" }, 
        "saturday": { "check_in": "06:15", "check_out": "15:00" } // Mismo horario
    },
    "MANTENIMIENTO": { 
        "weekday": { "check_in": "07:15", "check_out": "17:00" }, 
        "saturday": { "check_in": "08:00", "check_out": "12:00" } // Horario reducido
    },
    "ADMINISTRACION": { 
        "weekday": { "check_in": "07:45", "check_out": "17:00" }, 
        "saturday": { "check_in": "08:00", "check_out": "12:00" } // Horario reducido
    },
    "POSCOSECHA": { 
        "weekday": { "check_in": "06:40", "check_out": "15:30" }, 
        "saturday": { "check_in": "06:40", "check_out": "15:30" } // Mismo horario
    },
    "OPERACIONES": { 
        "weekday": { "check_in": "07:00", "check_out": "16:00" }, 
        "saturday": { "check_in": "07:00", "check_out": "16:00" } // Mismo horario
    },
    // Puedes agregar más áreas y horarios según sea necesario
};

// Función para normalizar cadenas (eliminar acentos y convertir a mayúsculas)
const normalizeString = (str) => {
    return str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase() : '';
};

// Función para obtener una propiedad de un objeto sin distinguir mayúsculas y minúsculas
const getPropertyCaseInsensitive = (obj, prop) => {
    if (!obj) return undefined;
    const propLower = prop.toLowerCase();
    const key = Object.keys(obj).find(k => k.toLowerCase() === propLower);
    return key ? obj[key] : undefined;
};

// Función para procesar el archivo subido
const processFile = (db, filePath, attendanceDate, fileName) => {
    return new Promise((resolve, reject) => {
        // Insertar el archivo en attendance_files
        const uploadDate = new Date().toISOString();
        db.run(
            `INSERT INTO attendance_files (file_name, upload_date, attendance_date) VALUES (?, ?, ?)`,
            [fileName, uploadDate, attendanceDate],
            function (err) {
                if (err) {
                    console.error('Error al insertar en attendance_files', err.message);
                    return reject(err);
                }

                const fileId = this.lastID;

                // Leer y procesar el contenido del archivo
                fs.readFile(filePath, 'utf8', (err, data) => {
                    if (err) {
                        console.error('Error al leer el archivo', err.message);
                        return reject(err);
                    }

                    const lines = data.split('\n');
                    const userTimes = {};

                    lines.forEach(line => {
                        const fields = line.trim().split('\t');
                        if (fields.length >= 2) {
                            const idNumber = fields[0].trim();
                            const dateTime = fields[1].trim();

                            // Filtrar IDs inválidos
                            if (idNumber.length < 4 || !/^\d+$/.test(idNumber)) {
                                return;
                            }

                            if (!userTimes[idNumber]) {
                                userTimes[idNumber] = [];
                            }
                            userTimes[idNumber].push(dateTime);
                        }
                    });

                    const insertStmt = db.prepare(
                        `INSERT INTO matched_results (file_id, id_number, name, area, check_in, check_out, status, hours_worked) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
                    );

                    const processUser = (id_number) => {
                        return new Promise((resolveUser, rejectUser) => {
                            // Intentar coincidencia exacta primero
                            db.get(
                                `SELECT name, area FROM records WHERE id = ?`,
                                [id_number],
                                (err, row) => {
                                    if (err) {
                                        console.error('Error al consultar records', err.message);
                                        return resolveUser(); // Ignorar errores de consulta y continuar
                                    }

                                    let name = getPropertyCaseInsensitive(row, 'name');
                                    let area = getPropertyCaseInsensitive(row, 'area');

                                    if (!name) {
                                        // Intentar con LIKE
                                        db.get(
                                            `SELECT name, area FROM records WHERE id LIKE ?`,
                                            [id_number + '%'],
                                            (err, rowLike) => {
                                                if (err) {
                                                    console.error('Error al consultar records con LIKE', err.message);
                                                    return resolveUser();
                                                }

                                                if (rowLike) {
                                                    name = getPropertyCaseInsensitive(rowLike, 'name');
                                                    area = getPropertyCaseInsensitive(rowLike, 'area');
                                                }

                                                if (name && area) {
                                                    handleUserTimes(db, insertStmt, fileId, id_number, name, area, userTimes[id_number], attendanceDate)
                                                        .then(resolveUser)
                                                        .catch(() => resolveUser());
                                                } else {
                                                    console.warn(`No se encontró registro para el ID ${id_number} incluso con LIKE`);
                                                    resolveUser();
                                                }
                                            }
                                        );
                                    } else if (name && area) {
                                        handleUserTimes(db, insertStmt, fileId, id_number, name, area, userTimes[id_number], attendanceDate)
                                            .then(resolveUser)
                                            .catch(() => resolveUser());
                                    } else {
                                        console.warn(`No se encontró registro para el ID ${id_number}`);
                                        resolveUser();
                                    }
                                }
                            );
                        });
                    };

                    // Función para manejar los tiempos de cada usuario
                    const handleUserTimes = (db, insertStmt, fileId, id_number, name, area, times, attendanceDate) => {
                        return new Promise((resolveHandle, rejectHandle) => {
                            times.sort();
                            const check_in = times[0];
                            const check_out = times.length > 1 ? times[times.length - 1] : null;

                            let status = "N/A";
                            let hours_worked = "N/A";

                            const normalizedArea = normalizeString(area);

                            // Determinar el día de la semana a partir de attendanceDate
                            const attendanceDateObj = new Date(attendanceDate);
                            const dayOfWeek = attendanceDateObj.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
                            const dayType = (dayOfWeek === 6) ? 'saturday' : 'weekday'; // 'saturday' o 'weekday'

                            if (expectedSchedules[normalizedArea]) {
                                const schedule = expectedSchedules[normalizedArea][dayType] || expectedSchedules[normalizedArea]['weekday'];

                                if (schedule) {
                                    const expectedCheckInStr = schedule.check_in;
                                    const [expectedHours, expectedMinutes] = expectedCheckInStr.split(':').map(Number);

                                    try {
                                        const actualCheckInDate = new Date(check_in);
                                        const actualHours = actualCheckInDate.getHours();
                                        const actualMinutes = actualCheckInDate.getMinutes();

                                        const expectedCheckInMinutes = expectedHours * 60 + expectedMinutes;
                                        const actualCheckInMinutes = actualHours * 60 + actualMinutes;

                                        status = actualCheckInMinutes <= expectedCheckInMinutes ? "TEMPRANO" : "TARDE";
                                    } catch (e) {
                                        status = "Formato de Hora Inválido";
                                    }

                                    if (check_out) {
                                        try {
                                            const actualCheckInDate = new Date(check_in);
                                            const actualCheckOutDate = new Date(check_out);

                                            const diffMs = actualCheckOutDate - actualCheckInDate;
                                            const totalHours = diffMs / (1000 * 60 * 60);
                                            const hours = Math.floor(totalHours);
                                            const minutes = Math.floor((totalHours - hours) * 60);
                                            hours_worked = `${hours}h ${minutes}m`;
                                        } catch (e) {
                                            hours_worked = "Formato de Hora Inválido";
                                        }
                                    }
                                } else {
                                    status = "Horario no definido para este día";
                                    hours_worked = "N/A";
                                }
                            } else {
                                status = "Área no definida";
                                hours_worked = "N/A";
                            }

                            // Insertar el resultado emparejado
                            insertStmt.run(
                                [fileId, id_number, name, area, check_in, check_out, status, hours_worked],
                                (err) => {
                                    if (err) {
                                        console.error('Error al insertar en matched_results', err.message);
                                        // No rechazar para continuar con otros registros
                                    }
                                    resolveHandle();
                                }
                            );
                        });
                    };

                    // Procesar cada usuario de forma secuencial
                    const userIds = Object.keys(userTimes);
                    const processAllUsers = userIds.reduce((promiseChain, id_number) => {
                        return promiseChain.then(() => processUser(id_number));
                    }, Promise.resolve());

                    processAllUsers
                        .then(() => {
                            insertStmt.finalize(() => {
                                console.log(`Archivo ${fileName} procesado y almacenado correctamente.`);
                                resolve();
                            });
                        })
                        .catch((err) => {
                            console.error('Error al procesar usuarios', err.message);
                            reject(err);
                        });
                }); // Cierre de fs.readFile
            } // Cierre de la función callback de db.run
        ); // Cierre de db.run
    }); // Cierre de new Promise
}; // Cierre de processFile

// Subir archivo de asistencia
router.post('/upload', upload.single('attendanceFile'), async (req, res) => {
    const db = req.db;
    const attendanceDate = req.body.attendance_date;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    if (!attendanceDate) {
        return res.status(400).json({ error: 'No se proporcionó la fecha de asistencia' });
    }

    const filePath = path.join(uploadDir, file.filename); // 'uploads/' + filename
    const fileName = file.originalname;

    try {
        await processFile(db, filePath, attendanceDate, fileName);
        // Opcional: eliminar el archivo después de procesarlo
        fs.unlink(filePath, (err) => {
            if (err) console.error('Error al eliminar el archivo subido', err.message);
        });
        res.json({ message: `Archivo '${fileName}' procesado y almacenado correctamente.` });
    } catch (error) {
        console.error('Error al procesar el archivo', error.message);
        res.status(500).json({ error: 'Error al procesar el archivo' });
    }
});

// Obtener lista de archivos de asistencia
router.get('/attendance-files', (req, res) => {
    const db = req.db;
    db.all(`SELECT * FROM attendance_files ORDER BY attendance_date DESC`, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener attendance_files', err.message);
            res.status(500).json({ error: 'Error de base de datos' });
        } else {
            res.json(rows);
        }
    });
});

// Obtener resultados emparejados de un archivo específico
router.get('/matched-results/:fileId', (req, res) => {
    const db = req.db;
    const fileId = req.params.fileId;

    db.all(
        `SELECT id_number, name, area, check_in, check_out, status, hours_worked FROM matched_results WHERE file_id = ?`,
        [fileId],
        (err, rows) => {
            if (err) {
                console.error('Error al obtener matched_results', err.message);
                res.status(500).json({ error: 'Error de base de datos' });
            } else {
                res.json(rows);
            }
        }
    );
});

// Obtener todos los resultados emparejados
router.get('/all-results', (req, res) => {
    const db = req.db;
    const query = `
        SELECT 
            af.file_id AS file_id,
            af.file_name AS file_name,
            af.attendance_date AS attendance_date,
            mr.id_number AS id_number,
            mr.name AS name,
            mr.area AS area,
            mr.check_in AS check_in,
            mr.check_out AS check_out,
            mr.status AS status,
            mr.hours_worked AS hours_worked
        FROM 
            matched_results mr
        JOIN 
            attendance_files af ON mr.file_id = af.file_id
        ORDER BY 
            af.attendance_date DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener all-results', err.message);
            res.status(500).json({ error: 'Error de base de datos' });
        } else {
            res.json(rows);
        }
    });
});

// Obtener lista de empleados
router.get('/employees', (req, res) => {
    const db = req.db;
    db.all(`SELECT * FROM records ORDER BY name ASC`, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener empleados', err.message);
            res.status(500).json({ error: 'Error de base de datos' });
        } else {
            res.json(rows);
        }
    });
});

// Agregar un nuevo empleado
router.post('/employees', (req, res) => {
    const db = req.db;
    const { id, name, area } = req.body;

    if (!id || !name || !area) {
        return res.status(400).json({ error: 'Faltan datos del empleado' });
    }

    db.run(
        `INSERT INTO records (id, name, area) VALUES (?, ?, ?)`,
        [id, name, area],
        (err) => {
            if (err) {
                console.error('Error al insertar empleado', err.message);
                res.status(500).json({ error: 'Error al insertar empleado' });
            } else {
                res.json({ message: 'Empleado agregado correctamente' });
            }
        }
    );
});

// Eliminar un empleado
router.delete('/employees/:id', (req, res) => {
    const db = req.db;
    const id = req.params.id;

    db.run(`DELETE FROM records WHERE id = ?`, [id], function(err) {
        if (err) {
            console.error('Error al eliminar empleado', err.message);
            res.status(500).json({ error: 'Error al eliminar empleado' });
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Empleado no encontrado' });
        } else {
            res.json({ message: 'Empleado eliminado correctamente' });
        }
    });
});

module.exports = router;
