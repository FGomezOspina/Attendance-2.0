// backend/routes/api.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { admin, db, bucket } = require('../firebase'); // Asegúrate de ajustar la ruta si es necesario

// Configurar almacenamiento temporal con multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedExtensions = ['.txt', '.dat'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

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

// Función para normalizar IDs (eliminar caracteres no numéricos y espacios)
const normalizeId = (id) => {
    return id.replace(/\D/g, '').trim();
};

// Función para procesar el archivo subido
const processFile = async (filePath, attendanceDate, fileName) => {
    try {
        // Subir archivo a Firebase Storage
        const destination = `attendance_files/${Date.now()}_${fileName}`;
        await bucket.upload(filePath, {
            destination: destination,
            metadata: {
                metadata: {
                    firebaseStorageDownloadTokens: admin.firestore.FieldValue.serverTimestamp()
                }
            }
        });

        // Obtener la URL del archivo
        const file = bucket.file(destination);
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491' // Fecha de expiración muy lejana
        });

        // Crear un documento en 'attendance_files'
        const attendanceFileRef = db.collection('attendance_files').doc();
        await attendanceFileRef.set({
            file_id: attendanceFileRef.id,
            file_name: fileName,
            upload_date: admin.firestore.Timestamp.now(),
            attendance_date: admin.firestore.Timestamp.fromDate(new Date(attendanceDate)),
            file_url: url
        });

        // Leer y procesar el contenido del archivo
        const data = fs.readFileSync(filePath, 'utf8');
        const lines = data.split('\n');
        const userTimes = {};

        lines.forEach(line => {
            const fields = line.trim().split('\t');
            if (fields.length >= 2) {
                const rawIdNumber = fields[0].trim();
                const idNumber = normalizeId(rawIdNumber);
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

        // Procesar cada usuario
        for (const id_number of Object.keys(userTimes)) {
            let employee = null;

            // Intentar coincidencia exacta primero
            const employeeSnapshot = await db.collection('employees').doc(id_number).get();
            if (employeeSnapshot.exists) {
                employee = employeeSnapshot.data();
            } else {
                // Intentar buscar empleados cuyo ID comience con id_number
                const querySnapshot = await db.collection('employees')
                    .where('id', '>=', id_number)
                    .where('id', '<=', id_number + '\uf8ff')
                    .limit(1)
                    .get();

                if (!querySnapshot.empty) {
                    employee = querySnapshot.docs[0].data();
                }
            }

            if (employee && employee.name && employee.area) {
                await handleUserTimes(attendanceFileRef.id, id_number, employee.name, employee.area, userTimes[id_number], attendanceDate);
            } else {
                console.warn(`No se encontró registro para el ID ${id_number}`);
            }
        }

        console.log(`Archivo ${fileName} procesado y almacenado correctamente.`);
    } catch (error) {
        console.error('Error al procesar el archivo:', error);
        throw error;
    } finally {
        // Eliminar el archivo temporal
        fs.unlink(filePath, (err) => {
            if (err) console.error('Error al eliminar el archivo subido', err.message);
        });
    }
};

// Función para manejar los tiempos de cada usuario
const handleUserTimes = async (fileId, id_number, name, area, times, attendanceDate) => {
    try {
        times.sort();
        const check_in = new Date(times[0]);
        const check_out = times.length > 1 ? new Date(times[times.length - 1]) : null;

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

                const actualCheckInMinutes = check_in.getHours() * 60 + check_in.getMinutes();
                const expectedCheckInMinutes = expectedHours * 60 + expectedMinutes;

                status = actualCheckInMinutes <= expectedCheckInMinutes ? "TEMPRANO" : "TARDE";

                if (check_out) {
                    const diffMs = check_out - check_in;
                    const totalHours = diffMs / (1000 * 60 * 60);
                    const hours = Math.floor(totalHours);
                    const minutes = Math.floor((totalHours - hours) * 60);
                    hours_worked = `${hours}h ${minutes}m`;
                }
            } else {
                status = "Horario no definido para este día";
                hours_worked = "N/A";
            }
        } else {
            status = "Área no definida";
            hours_worked = "N/A";
        }

        // Crear documento en 'matched_results'
        await db.collection('matched_results').add({
            file_id: fileId,
            id_number: id_number,
            name: name,
            area: area,
            check_in: admin.firestore.Timestamp.fromDate(check_in),
            check_out: check_out ? admin.firestore.Timestamp.fromDate(check_out) : null,
            status: status,
            hours_worked: hours_worked
        });
    } catch (error) {
        console.error(`Error al manejar tiempos para el ID ${id_number}:`, error);
    }
};

// Subir archivo de asistencia
router.post('/upload', upload.single('attendanceFile'), async (req, res) => {
    const attendanceDate = req.body.attendance_date;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    if (!attendanceDate) {
        return res.status(400).json({ error: 'No se proporcionó la fecha de asistencia' });
    }

    const filePath = path.join(__dirname, '..', file.path); // Ruta al archivo temporal
    const fileName = file.originalname;

    try {
        await processFile(filePath, attendanceDate, fileName);
        res.json({ message: `Archivo '${fileName}' procesado y almacenado correctamente.` });
    } catch (error) {
        console.error('Error al procesar el archivo:', error);
        res.status(500).json({ error: 'Error al procesar el archivo' });
    }
});
// Subir archivo de asistencia
router.post('/upload', upload.single('attendanceFile'), async (req, res) => {
    const attendanceDate = req.body.attendance_date;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    if (!attendanceDate) {
        return res.status(400).json({ error: 'No se proporcionó la fecha de asistencia' });
    }

    const filePath = path.join(__dirname, '..', file.path); // Ruta al archivo temporal
    const fileName = file.originalname;

    try {
        await processFile(filePath, attendanceDate, fileName);
        res.json({ message: `Archivo '${fileName}' procesado y almacenado correctamente.` });
    } catch (error) {
        console.error('Error al procesar el archivo:', error);
        res.status(500).json({ error: 'Error al procesar el archivo' });
    }
});

// Obtener lista de archivos de asistencia
router.get('/attendance-files', async (req, res) => {
    try {
        const snapshot = await db.collection('attendance_files').orderBy('attendance_date', 'desc').get();
        const files = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                attendance_date: data.attendance_date.toDate().toISOString().split('T')[0],
                upload_date: data.upload_date.toDate().toISOString()
            };
        });
        res.json(files);
    } catch (error) {
        console.error('Error al obtener attendance_files:', error);
        res.status(500).json({ error: 'Error de base de datos' });
    }
});

// Obtener resultados emparejados de un archivo específico
router.get('/matched-results/:fileId', async (req, res) => {
    const fileId = req.params.fileId;

    try {
        const snapshot = await db.collection('matched_results').where('file_id', '==', fileId).get();
        const results = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                check_in: data.check_in.toDate().toISOString(),
                check_out: data.check_out ? data.check_out.toDate().toISOString() : null
            };
        });
        res.json(results);
    } catch (error) {
        console.error('Error al obtener matched_results:', error);
        res.status(500).json({ error: 'Error de base de datos' });
    }
});

// Obtener todos los resultados emparejados
router.get('/all-results', async (req, res) => {
    try {
        const snapshot = await db.collection('matched_results').orderBy('check_in', 'desc').get();
        const results = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                check_in: data.check_in.toDate().toISOString(),
                check_out: data.check_out ? data.check_out.toDate().toISOString() : null
            };
        });
        res.json(results);
    } catch (error) {
        console.error('Error al obtener all-results:', error);
        res.status(500).json({ error: 'Error de base de datos' });
    }
});

// Obtener lista de empleados
router.get('/employees', async (req, res) => {
    try {
        const snapshot = await db.collection('employees').orderBy('name', 'asc').get();
        const employees = snapshot.docs.map(doc => doc.data());
        res.json(employees);
    } catch (error) {
        console.error('Error al obtener empleados:', error);
        res.status(500).json({ error: 'Error de base de datos' });
    }
});

// Agregar un nuevo empleado
router.post('/employees', async (req, res) => {
    const { id, name, area } = req.body;

    if (!id || !name || !area) {
        return res.status(400).json({ error: 'Faltan datos del empleado' });
    }

    const normalizedId = normalizeId(id);

    try {
        // Verificar si el empleado ya existe
        const employeeRef = db.collection('employees').doc(normalizedId);
        const doc = await employeeRef.get();
        if (doc.exists) {
            return res.status(400).json({ error: 'Empleado con esta cédula ya existe' });
        }

        // Agregar empleado
        await employeeRef.set({
            id: normalizedId,
            name: name,
            area: area
        });

        res.json({ message: 'Empleado agregado correctamente' });
    } catch (error) {
        console.error('Error al insertar empleado:', error);
        res.status(500).json({ error: 'Error al insertar empleado' });
    }
});

// Eliminar un empleado
router.delete('/employees/:id', async (req, res) => {
    const id = req.params.id;
    const normalizedId = normalizeId(id);

    try {
        const employeeRef = db.collection('employees').doc(normalizedId);
        const doc = await employeeRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }

        await employeeRef.delete();
        res.json({ message: 'Empleado eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar empleado:', error);
        res.status(500).json({ error: 'Error al eliminar empleado' });
    }
});

module.exports = router;
