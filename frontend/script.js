// frontend/script.js

const apiBaseUrl = 'http://localhost:3000/api';

// Elementos de navegación
const navEmpleados = document.getElementById('nav-empleados');
const navAsistencia = document.getElementById('nav-asistencia');
const mobileMenu = document.getElementById('mobile-menu');
const navLinks = document.querySelector('.nav-links');

// Secciones de contenido
const sectionEmpleados = document.getElementById('section-empleados');
const sectionAsistencia = document.getElementById('section-asistencia');

/**
 * Manejo de la navegación entre secciones.
 * Muestra la sección seleccionada y oculta la otra.
 */
navEmpleados.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('empleados');
    toggleMenu(); // Cerrar menú en móviles al seleccionar
});

navAsistencia.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('asistencia');
    toggleMenu(); // Cerrar menú en móviles al seleccionar
});

/**
 * Función para mostrar la sección correspondiente.
 * @param {string} section - La sección a mostrar ('empleados' o 'asistencia').
 */
function showSection(section) {
    if (section === 'empleados') {
        sectionEmpleados.classList.remove('hidden');
        sectionAsistencia.classList.add('hidden');
    } else if (section === 'asistencia') {
        sectionEmpleados.classList.add('hidden');
        sectionAsistencia.classList.remove('hidden');
    }
}

/**
 * Función para alternar el menú en dispositivos móviles.
 */
function toggleMenu() {
    navLinks.classList.toggle('active');
    mobileMenu.classList.toggle('active');
}

// Event listener para el botón de menú en móviles
mobileMenu.addEventListener('click', toggleMenu);

// Mostrar la sección de empleados por defecto al cargar la página
showSection('empleados');

/**
 * =====================
 * Funcionalidades de Empleados
 * =====================
 */

/**
 * Cargar y mostrar la lista de empleados.
 */
async function loadEmployees() {
    try {
        const response = await fetch(`${apiBaseUrl}/employees`);
        const employees = await response.json();
        const tableBody = document.querySelector('#employees-table tbody');
        tableBody.innerHTML = '';

        employees.forEach(emp => {
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td data-label="Cédula">${emp.id}</td>
                <td data-label="Nombre">${emp.name}</td>
                <td data-label="Área">${emp.area}</td>
                <td data-label="Acciones"><button class="delete-btn" data-id="${emp.id}">Eliminar</button></td>
            `;

            tableBody.appendChild(tr);
        });

        // Agregar event listeners a los botones de eliminación
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', () => {
                const id = button.getAttribute('data-id');
                deleteEmployee(id);
            });
        });

        // Resetear cualquier búsqueda previa
        document.getElementById('search-employees-input').value = '';
    } catch (error) {
        console.error('Error al cargar los empleados:', error);
    }
}

/**
 * Manejar el envío del formulario para agregar un nuevo empleado.
 */
document.getElementById('add-employee-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const idInput = document.getElementById('cedula');
    const nameInput = document.getElementById('nombre');
    const areaInput = document.getElementById('area');
    const messageDiv = document.getElementById('employee-message');

    const id = idInput.value.trim();
    const name = nameInput.value.trim();
    const area = areaInput.value.trim();

    if (!id || !name || !area) {
        messageDiv.textContent = 'Por favor, completa todos los campos.';
        messageDiv.style.color = 'red';
        return;
    }

    try {
        const response = await fetch(`${apiBaseUrl}/employees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, name, area })
        });

        const result = await response.json();
        if (response.ok) {
            messageDiv.textContent = result.message;
            messageDiv.style.color = 'green';
            loadEmployees();
            // Limpiar el formulario
            document.getElementById('add-employee-form').reset();
        } else {
            messageDiv.textContent = result.error || 'Error al agregar el empleado.';
            messageDiv.style.color = 'red';
        }
    } catch (error) {
        console.error('Error al agregar el empleado:', error);
        messageDiv.textContent = 'Error al conectar con el servidor.';
        messageDiv.style.color = 'red';
    }
});

/**
 * Eliminar un empleado por su cédula (ID).
 * @param {string} id - La cédula del empleado a eliminar.
 */
async function deleteEmployee(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este empleado?')) return;

    try {
        const response = await fetch(`${apiBaseUrl}/employees/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (response.ok) {
            alert(result.message);
            loadEmployees();
        } else {
            alert(result.error || 'Error al eliminar el empleado.');
        }
    } catch (error) {
        console.error('Error al eliminar el empleado:', error);
        alert('Error al conectar con el servidor.');
    }
}

/**
 * Funcionalidad de búsqueda para empleados.
 * Filtra la tabla de empleados en tiempo real según el término ingresado.
 */
document.getElementById('search-employees-input').addEventListener('input', function() {
    const query = this.value.toLowerCase();
    const rows = document.querySelectorAll('#employees-table tbody tr');

    rows.forEach(row => {
        const id = row.cells[0].textContent.toLowerCase();
        const name = row.cells[1].textContent.toLowerCase();
        const area = row.cells[2].textContent.toLowerCase();
        if (id.includes(query) || name.includes(query) || area.includes(query)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
});

/**
 * =====================
 * Funcionalidades de Asistencia
 * =====================
 */

/**
 * Manejar el envío del formulario para subir un archivo de asistencia.
 */
document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('attendanceFile');
    const dateInput = document.getElementById('attendanceDate');
    const messageDiv = document.getElementById('upload-message');

    if (fileInput.files.length === 0) {
        messageDiv.textContent = 'Por favor, selecciona un archivo para subir.';
        messageDiv.style.color = 'red';
        return;
    }

    const formData = new FormData();
    formData.append('attendanceFile', fileInput.files[0]);
    formData.append('attendance_date', dateInput.value);

    try {
        const response = await fetch(`${apiBaseUrl}/upload`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            messageDiv.textContent = result.message;
            messageDiv.style.color = 'green';
            loadAttendanceFiles();
            // Limpiar el formulario
            document.getElementById('upload-form').reset();
        } else {
            messageDiv.textContent = result.error || 'Error al subir el archivo.';
            messageDiv.style.color = 'red';
        }
    } catch (error) {
        console.error(error);
        messageDiv.textContent = 'Error al conectar con el servidor.';
        messageDiv.style.color = 'red';
    }
});

/**
 * Cargar y mostrar la lista de archivos de asistencia almacenados.
 */
async function loadAttendanceFiles() {
    try {
        const response = await fetch(`${apiBaseUrl}/attendance-files`);
        const files = await response.json();
        const tableBody = document.querySelector('#attendance-files-table tbody');
        tableBody.innerHTML = '';

        files.forEach(file => {
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td data-label="ID Archivo">${file.file_id}</td>
                <td data-label="Nombre Archivo">${file.file_name}</td>
                <td data-label="Fecha Asistencia">${file.attendance_date}</td>
                <td data-label="Fecha de Subida">${new Date(file.upload_date).toLocaleString()}</td>
                <td data-label="Acciones"><button class="export-btn" data-file-id="${file.file_id}">Ver Detalles</button></td>
            `;

            tableBody.appendChild(tr);
        });

        // Agregar event listeners a los botones de ver detalles
        document.querySelectorAll('.export-btn').forEach(button => {
            button.addEventListener('click', () => {
                const fileId = button.getAttribute('data-file-id');
                loadMatchedResults(fileId);
            });
        });

        // Resetear cualquier búsqueda previa
        document.getElementById('search-files-input').value = '';
    } catch (error) {
        console.error('Error al cargar los archivos de asistencia:', error);
    }
}

/**
 * Cargar y mostrar los resultados emparejados de un archivo de asistencia específico.
 * @param {number} fileId - El ID del archivo de asistencia.
 */
async function loadMatchedResults(fileId) {
    const container = document.getElementById('matched-results-container');
    container.innerHTML = '<p>Cargando resultados...</p>';

    try {
        const response = await fetch(`${apiBaseUrl}/matched-results/${fileId}`);
        const results = await response.json();

        if (results.length === 0) {
            container.innerHTML = '<p>No hay resultados emparejados para este archivo.</p>';
            return;
        }

        // Crear la tabla de resultados emparejados
        let tableHtml = `
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Área</th>
                            <th>Check In</th>
                            <th>Check Out</th>
                            <th>Estado</th>
                            <th>Horas Trabajadas</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        results.forEach(row => {
            tableHtml += `
                <tr>
                    <td data-label="ID">${row.id_number}</td>
                    <td data-label="Nombre">${row.name}</td>
                    <td data-label="Área">${row.area}</td>
                    <td data-label="Check In">${row.check_in}</td>
                    <td data-label="Check Out">${row.check_out || 'N/A'}</td>
                    <td data-label="Estado">${row.status}</td>
                    <td data-label="Horas Trabajadas">${row.hours_worked}</td>
                </tr>
            `;
        });

        tableHtml += `
                    </tbody>
                </table>
            </div>
        `;

        // Agregar botón para descargar resultados en Excel
        tableHtml += `<button class="export-btn" onclick="exportToExcel(${fileId})">Descargar Resultados en Excel</button>`;

        container.innerHTML = tableHtml;

        // Resetear cualquier búsqueda previa
        document.getElementById('search-results-input').value = '';
    } catch (error) {
        console.error('Error al cargar los resultados emparejados:', error);
        container.innerHTML = '<p>Error al cargar los resultados emparejados.</p>';
    }
}

/**
 * Exportar los resultados emparejados de un archivo específico a Excel.
 * @param {number} fileId - El ID del archivo de asistencia.
 */
async function exportToExcel(fileId) {
    try {
        const response = await fetch(`${apiBaseUrl}/matched-results/${fileId}`);
        const results = await response.json();

        if (results.length === 0) {
            alert('No hay resultados para exportar.');
            return;
        }

        // Crear una hoja de trabajo con los datos
        const wsData = [
            ['ID', 'Nombre', 'Área', 'Check In', 'Check Out', 'Estado', 'Horas Trabajadas']
        ];

        results.forEach(row => {
            wsData.push([
                row.id_number,
                row.name,
                row.area,
                row.check_in,
                row.check_out || 'N/A',
                row.status,
                row.hours_worked
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Ajustar el ancho de las columnas
        ws['!cols'] = [
            { wch: 15 }, // ID
            { wch: 30 }, // Nombre
            { wch: 20 }, // Área
            { wch: 20 }, // Check In
            { wch: 20 }, // Check Out
            { wch: 15 }, // Estado
            { wch: 15 }  // Horas Trabajadas
        ];

        // Aplicar estilos básicos a la primera fila (encabezados)
        const header = wsData[0];
        header.forEach((cell, index) => {
            const cellAddress = XLSX.utils.encode_cell({ c: index, r: 0 });
            if (!ws[cellAddress]) return;
            ws[cellAddress].s = {
                font: { bold: true },
                fill: { fgColor: { rgb: "FFFFAA00" } }, // Color de fondo amarillo
                alignment: { horizontal: "center" }
            };
        });

        // Agregar filtros a la primera fila
        ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: 6, r: 0 } }) };

        // Congelar la primera fila
        ws['!freeze'] = { xSplit: 0, ySplit: 1 };

        // Aplicar alineación a todas las celdas
        Object.keys(ws).forEach(cell => {
            if (cell.startsWith('!')) return; // Ignorar propiedades especiales
            ws[cell].s = ws[cell].s || {};
            ws[cell].s.alignment = { vertical: "center", horizontal: "center" };
        });

        // Crear un libro de trabajo y añadir la hoja
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Resultados');

        // Generar el archivo Excel y descargarlo
        XLSX.writeFile(wb, `Resultados_${fileId}.xlsx`);
    } catch (error) {
        console.error('Error al exportar a Excel:', error);
        alert('Ocurrió un error al exportar los resultados a Excel.');
    }
}

/**
 * Exportar todos los resultados emparejados a un archivo Excel.
 */
document.getElementById('export-all-btn').addEventListener('click', async () => {
    try {
        const response = await fetch(`${apiBaseUrl}/all-results`);
        const results = await response.json();

        if (results.length === 0) {
            alert('No hay resultados para exportar.');
            return;
        }

        // Crear una hoja de trabajo con los datos
        const wsData = [
            ['ID Archivo', 'Nombre Archivo', 'Fecha Asistencia', 'ID', 'Nombre', 'Área', 'Check In', 'Check Out', 'Estado', 'Horas Trabajadas']
        ];

        results.forEach(row => {
            wsData.push([
                row.file_id,
                row.file_name,
                row.attendance_date,
                row.id_number,
                row.name,
                row.area,
                row.check_in,
                row.check_out || 'N/A',
                row.status,
                row.hours_worked
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Ajustar el ancho de las columnas
        ws['!cols'] = [
            { wch: 12 }, // ID Archivo
            { wch: 30 }, // Nombre Archivo
            { wch: 15 }, // Fecha Asistencia
            { wch: 15 }, // ID
            { wch: 30 }, // Nombre
            { wch: 20 }, // Área
            { wch: 20 }, // Check In
            { wch: 20 }, // Check Out
            { wch: 15 }, // Estado
            { wch: 15 }  // Horas Trabajadas
        ];

        // Aplicar estilos básicos a la primera fila (encabezados)
        const header = wsData[0];
        header.forEach((cell, index) => {
            const cellAddress = XLSX.utils.encode_cell({ c: index, r: 0 });
            if (!ws[cellAddress]) return;
            ws[cellAddress].s = {
                font: { bold: true },
                fill: { fgColor: { rgb: "FFFFAA00" } }, // Color de fondo amarillo
                alignment: { horizontal: "center" }
            };
        });

        // Agregar filtros a la primera fila
        ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: 9, r: 0 } }) };

        // Congelar la primera fila
        ws['!freeze'] = { xSplit: 0, ySplit: 1 };

        // Aplicar alineación a todas las celdas
        Object.keys(ws).forEach(cell => {
            if (cell.startsWith('!')) return; // Ignorar propiedades especiales
            ws[cell].s = ws[cell].s || {};
            ws[cell].s.alignment = { vertical: "center", horizontal: "center" };
        });

        // Crear un libro de trabajo y añadir la hoja
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Todos los Resultados');

        // Generar el archivo Excel y descargarlo
        XLSX.writeFile(wb, `Todos_Los_Resultados.xlsx`);
    } catch (error) {
        console.error('Error al exportar todos los resultados a Excel:', error);
        alert('Ocurrió un error al exportar todos los resultados a Excel.');
    }
});

/**
 * Funcionalidad de búsqueda para archivos de asistencia.
 * Filtra la tabla de archivos en tiempo real según el término ingresado.
 */
document.getElementById('search-files-input').addEventListener('input', function() {
    const query = this.value.toLowerCase();
    const rows = document.querySelectorAll('#attendance-files-table tbody tr');

    rows.forEach(row => {
        const id = row.cells[0].textContent.toLowerCase();
        const name = row.cells[1].textContent.toLowerCase();
        if (id.includes(query) || name.includes(query)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
});

/**
 * Funcionalidad de búsqueda para resultados emparejados.
 * Filtra la tabla de resultados en tiempo real según el término ingresado.
 */
document.getElementById('search-results-input').addEventListener('input', function() {
    const query = this.value.toLowerCase();
    const container = document.getElementById('matched-results-container');
    const rows = container.querySelectorAll('tbody tr');

    rows.forEach(row => {
        const id = row.cells[0].textContent.toLowerCase();
        const name = row.cells[1].textContent.toLowerCase();
        const area = row.cells[2].textContent.toLowerCase();
        if (id.includes(query) || name.includes(query) || area.includes(query)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
});

/**
 * =====================
 * Inicialización de la Aplicación
 * =====================
 */

// Cargar los archivos de asistencia al iniciar la aplicación
loadAttendanceFiles();

// Cargar la lista de empleados al iniciar la aplicación
loadEmployees();
