// Horarios esperados para cada área
const expected_schedules = {
  "ASEO": { "check_in": "06:15", "check_out": "15:00" },
  "MANTENIMIENTO": { "check_in": "07:15", "check_out": "17:00" },
  "ADMINISTRACIÓN": { "check_in": "07:45", "check_out": "17:00" },
  "POSCOSECHA": { "check_in": "06:40", "check_out": "15:30" }
};

// Variable global para almacenar los usuarios obtenidos de Firebase
let usuariosFirebase = [];

// Función para obtener los usuarios desde el endpoint de Firebase
async function fetchUsuarios() {
  try {
    const response = await fetch('/api/usuarios');
    if (!response.ok) {
      throw new Error('Error al obtener usuarios');
    }
    usuariosFirebase = await response.json();
    console.log('Usuarios actualizados:', usuariosFirebase);
  } catch (error) {
    console.error('Error fetching usuarios:', error);
  }
}

// Llamamos a fetchUsuarios al cargar el DOM para tener la lista actualizada
document.addEventListener('DOMContentLoaded', fetchUsuarios);

// -------------------------------------------------------------------
// Función para comparar las cédulas utilizando los datos de Firebase
function matchIdWithArea(id_number) {
  id_number = id_number.trim();
  // Si el id en el .dat tiene 9 dígitos, buscamos el usuario cuyo campo 'cedula'
  // (almacenado con 10 dígitos en Firebase) coincida en sus primeros 9 dígitos.
  if (id_number.length === 9) {
    for (let user of usuariosFirebase) {
      if (user.cedula.slice(0, -1) === id_number) {
        return { 
          area: user.area, 
          fullId: user.cedula, 
          name: user.nombre 
        };
      }
    }
  }
  // Opcional: si el id ya tiene 10 dígitos, se puede comparar directamente
  if (id_number.length === 10) {
    for (let user of usuariosFirebase) {
      if (user.cedula === id_number) {
        return { 
          area: user.area, 
          fullId: user.cedula, 
          name: user.nombre 
        };
      }
    }
  }
  return null;
}

// -------------------------------------------------------------------
// Procesamiento del archivo de asistencia (.dat)

// Manejo de la carga del archivo
document.getElementById('inputFile')?.addEventListener('change', handleFileUpload);

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file) {
    // Mostrar el mensaje de "Cargando..."
    document.getElementById('statusMessage').innerText = 'Cargando archivo...';
    document.getElementById('statusMessage').style.display = 'block';
    processDATFile(file);
  }
}

function processDATFile(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const fileContent = e.target.result;
    const lines = fileContent.split('\n'); // Dividir el contenido en líneas
    processAttendanceData(lines);
  };
  reader.readAsText(file); // Leer el archivo como texto
}

function processAttendanceData(lines) {
  const tableBody = document.querySelector('#attendanceTable tbody');
  tableBody.innerHTML = ''; // Limpiar la tabla antes de llenarla

  let users = {};
  let hasData = false; // Variable para verificar si hay datos

  // Organizar los datos por cédula y fecha
  lines.forEach(line => {
    const fields = line.split('\t'); // Dividir por tabuladores
    
    if (fields.length >= 2) {
      const id = fields[0].trim();
      const timestamp = fields[1].trim();

      const checkIn = timestamp;  // Suponemos que el archivo tiene solo un timestamp por registro
      const checkOut = checkIn; // Para este ejemplo, se usará el mismo valor para check-out

      // Extraer la fecha (sin la hora) de la marca de tiempo
      const date = checkIn.split(' ')[0];

      // Buscar la información del usuario en Firebase
      const result = matchIdWithArea(id);
      if (result) {
        const { area, fullId, name } = result;
        
        // Agrupar por cédula y fecha
        if (!users[fullId]) {
          users[fullId] = {};
        }
        if (!users[fullId][date]) {
          users[fullId][date] = { checkIn, checkOut, area, name, timestamps: [] };
        }
        users[fullId][date].timestamps.push(checkIn); // Almacenar el timestamp para el día
        hasData = true; // Hay datos en la tabla
      }
    }
  });

  // Procesar cada grupo (por usuario y fecha) para calcular asistencia y horas trabajadas
  Object.keys(users).forEach(fullId => {
    const user = users[fullId];
    Object.keys(user).forEach(date => {
      const dayRecords = user[date];
      const { area, name, timestamps } = dayRecords;

      // Se toma el primer y último timestamp del día
      const firstTimestamp = timestamps[0];
      const lastTimestamp = timestamps[timestamps.length - 1];

      // Comparar la hora de entrada con el horario máximo permitido para el área
      const schedule = expected_schedules[area];
      const checkInTime = firstTimestamp.slice(11, 16); // Ejemplo: '07:35'
      const expectedCheckInTime = schedule.check_in; // Ejemplo: '07:45'

      let arrivalStatus = (checkInTime <= expectedCheckInTime) ? 'Temprano' : 'Tarde';

      // Calcular las horas trabajadas (suponiendo checkIn y checkOut)
      const checkInDate = new Date(`1970-01-01T${firstTimestamp.slice(11, 16)}:00Z`);
      const checkOutDate = new Date(`1970-01-01T${lastTimestamp.slice(11, 16)}:00Z`);
      let workedMinutes = (checkOutDate - checkInDate) / (1000 * 60);
      let workedHours = workedMinutes / 60;
      if (isNaN(workedHours)) {
        workedHours = 0;
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${fullId}</td>
        <td>${name}</td>
        <td>${area}</td>
        <td>${firstTimestamp}</td>
        <td>${lastTimestamp}</td>
        <td>${arrivalStatus}</td>
        <td>${workedHours.toFixed(2)} horas</td>
      `;
      tableBody.appendChild(row);
    });
  });

  // Mostrar u ocultar el mensaje "No hay datos"
  document.getElementById('noDataMessage').style.display = hasData ? 'none' : 'block';

  // Mostrar los controles de búsqueda y descarga solo si hay datos
  if (hasData) {
    document.getElementById('searchReportContainer').style.display = 'block';
    document.getElementById('downloadExcelContainer').style.display = 'block';
  } else {
    document.getElementById('searchReportContainer').style.display = 'none';
    document.getElementById('downloadExcelContainer').style.display = 'none';
  }

  // Actualizar el mensaje de estado
  document.getElementById('statusMessage').innerText = 'Subido exitosamente';
  setTimeout(() => {
    document.getElementById('statusMessage').style.display = 'none';
  }, 3000);
}


// -------------------------------------------------------------------
// Gestión de la sección de Usuarios

// Manejo del formulario para agregar un nuevo usuario
const addUserForm = document.getElementById('addUserForm');
if (addUserForm) {
  addUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cedula = document.getElementById('cedula').value.trim();
    const nombre = document.getElementById('nombre').value.trim();
    const area = document.getElementById('area').value;

    if (cedula && nombre && area) {
      try {
        const response = await fetch('/api/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cedula, nombre, area })
        });
        if (!response.ok) {
          throw new Error('Error al agregar usuario');
        }
        alert('Usuario agregado exitosamente');
        addUserForm.reset();
        // Actualizamos la tabla de usuarios y la lista global
        loadUsuarios();
        await fetchUsuarios();
      } catch (error) {
        console.error(error);
        alert('Error al agregar usuario');
      }
    }
  });
}

// Función para cargar y mostrar los usuarios en la sección "Usuarios"
// Función para cargar y mostrar los usuarios en la sección "Usuarios"
async function loadUsuarios() {
  try {
    const response = await fetch('/api/usuarios');
    if (!response.ok) {
      throw new Error('Error al cargar usuarios');
    }
    const usuarios = await response.json();
    const usuariosTableBody = document.querySelector('#usuariosTable tbody');
    if (usuariosTableBody) {
      usuariosTableBody.innerHTML = '';
      usuarios.forEach(usuario => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${usuario.cedula}</td>
          <td>${usuario.nombre}</td>
          <td>${usuario.area}</td>
          <td>
            <button class="delete-btn" data-id="${usuario.id}">Eliminar</button>
          </td>
        `;
        usuariosTableBody.appendChild(row);
      });

      // Agregar evento de eliminación a los botones
      const deleteButtons = document.querySelectorAll('.delete-btn');
      deleteButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
          const userId = e.target.getAttribute('data-id');
          try {
            const response = await fetch(`/api/usuarios/${userId}`, { method: 'DELETE' });
            if (!response.ok) {
              throw new Error('Error al eliminar usuario');
            }
            alert('Usuario eliminado exitosamente');
            loadUsuarios(); // Recargar la lista de usuarios
          } catch (error) {
            console.error('Error al eliminar usuario:', error);
            alert('Error al eliminar usuario');
          }
        });
      });
    }
  } catch (error) {
    console.error('Error al cargar usuarios:', error);
  }
}


// -------------------------------------------------------------------
// Lógica para el cambio de sección (navbar)
// Se asume que en el HTML existen enlaces con id "linkReporte" y "linkUsuarios"
// y secciones con id "reporteSection" y "usuariosSection"
document.getElementById('linkReporte')?.addEventListener('click', () => {
  document.getElementById('reporteSection').style.display = 'block';
  document.getElementById('usuariosSection').style.display = 'none';
});

document.getElementById('linkUsuarios')?.addEventListener('click', () => {
  document.getElementById('reporteSection').style.display = 'none';
  document.getElementById('usuariosSection').style.display = 'block';
  loadUsuarios(); // Cargar la lista actualizada de usuarios
});

// Función para filtrar los usuarios en la tabla de Reporte de Asistencia
document.getElementById('searchReport')?.addEventListener('input', function() {
  const filter = this.value.toLowerCase();
  const rows = document.querySelectorAll('#attendanceTable tbody tr');
  
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    const name = cells[1]?.textContent.toLowerCase();
    const cedula = cells[0]?.textContent.toLowerCase();

    if (name.includes(filter) || cedula.includes(filter)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
});

// Función para filtrar los usuarios en la tabla de Gestión de Usuarios
document.getElementById('searchUsers')?.addEventListener('input', function() {
  const filter = this.value.toLowerCase();
  const rows = document.querySelectorAll('#usuariosTable tbody tr');
  
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    const name = cells[1]?.textContent.toLowerCase();
    const cedula = cells[0]?.textContent.toLowerCase();

    if (name.includes(filter) || cedula.includes(filter)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
});

// Función para descargar el reporte de asistencia como archivo Excel
document.getElementById('downloadExcel')?.addEventListener('click', function () {
  const table = document.getElementById('attendanceTable');
  const workbook = XLSX.utils.table_to_book(table, { sheet: "Reporte de Asistencia" });
  const excelFile = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });
  const buffer = new ArrayBuffer(excelFile.length);
  const view = new Uint8Array(buffer);

  for (let i = 0; i < excelFile.length; i++) {
    view[i] = excelFile.charCodeAt(i) & 0xff;
  }

  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'reporte_asistencia.xlsx';
  link.click();
});
