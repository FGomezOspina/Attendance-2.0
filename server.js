const express = require('express');
const path = require('path');
require('dotenv').config(); // Cargar las variables de entorno
const admin = require('firebase-admin');

const app = express();

// Middlewares para procesar JSON y URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Inicializar Firebase Admin usando las credenciales del .env
const serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
if (!serviceAccount) {
  console.error("No se encontraron las credenciales de Google");
  process.exit(1);
}

// Inicializar Firebase con Firestore
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore(); // Usamos Firestore en lugar de la Realtime Database

// Servir los archivos estáticos (HTML, CSS, JS) desde la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------------------
// Endpoints de API
// -------------------------------------------------------------------

// GET /api/usuarios - Obtiene la lista de usuarios almacenados en Firestore
app.get('/api/usuarios', async (req, res) => {
  try {
    const snapshot = await db.collection('usuarios').get(); // Acceder a la colección 'usuarios'
    if (snapshot.empty) {
      return res.status(404).json({ error: "No se encontraron usuarios" });
    }
    
    let usuarios = [];
    snapshot.forEach(doc => {
      usuarios.push({ id: doc.id, ...doc.data() });
    });
    
    res.json(usuarios);
  } catch (error) {
    console.error("Error obteniendo usuarios: ", error);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// POST /api/usuarios - Agrega un nuevo usuario a Firestore
app.post('/api/usuarios', async (req, res) => {
  try {
    const { cedula, nombre, area } = req.body;
    if (!cedula || !nombre || !area) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }
    // Agregar un nuevo usuario a la colección 'usuarios'
    const newUserRef = await db.collection('usuarios').add({ cedula, nombre, area });
    res.status(201).json({ id: newUserRef.id });
  } catch (error) {
    console.error("Error agregando usuario: ", error);
    res.status(500).json({ error: "Error al agregar usuario" });
  }
});

// (Opcional) POST /api/asistencia - Recibe y procesa el archivo de asistencia (.dat)
// Se asume que el cliente envía el contenido del archivo en el cuerpo de la solicitud.
app.post('/api/asistencia', async (req, res) => {
  try {
    const { fileContent } = req.body;
    if (!fileContent) {
      return res.status(400).json({ error: "No se proporcionó contenido del archivo" });
    }
    // Ejemplo de procesamiento: se separa el contenido en líneas y se realiza algún procesamiento
    const lines = fileContent.split('\n');
    // Aquí podrías replicar la lógica de tu función processAttendanceData,
    // o realizar el procesamiento del archivo en el servidor.
    let processedData = [];
    // Procesar cada línea (ejemplo simplificado)
    lines.forEach(line => {
      if (line.trim()) {
        const fields = line.split('\t');
        processedData.push(fields);
      }
    });
    res.json({ processedData });
  } catch (error) {
    console.error("Error procesando asistencia: ", error);
    res.status(500).json({ error: "Error procesando asistencia" });
  }
});

// DELETE /api/usuarios/:id - Elimina un usuario de Firestore por su ID
app.delete('/api/usuarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Intentamos obtener el documento del usuario por su ID
    const userRef = db.collection('usuarios').doc(id);
    const doc = await userRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    // Eliminar el usuario
    await userRef.delete();
    res.status(200).json({ message: "Usuario eliminado exitosamente" });
  } catch (error) {
    console.error("Error eliminando usuario: ", error);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});


// -------------------------------------------------------------------
// Configuración del puerto y arranque del servidor
// -------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
