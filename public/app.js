const expected_schedules = {
    "ASEO": { "check_in": "06:15", "check_out": "15:00" },
    "MANTENIMIENTO": { "check_in": "07:15", "check_out": "17:00" },
    "ADMINISTRACIÓN": { "check_in": "07:45", "check_out": "17:00" },
    "POSCOSECHA": { "check_in": "06:40", "check_out": "15:30" }
};
  
  
const records_data = [
    ['1088327667', 'ERIKA TATIANA GALLEGO VINASCO', 'POSCOSECHA'],
    ['1004520909', 'ANGIE VANESSA ARCE LOPEZ', 'POSCOSECHA'],
    ['94509907', 'JUAN ESTEBAN TORO VARGAS', 'ADMINISTRACIÓN'],
    ['1088327667', 'ERIKA TATIANA GALLEGO VINASCO', 'POSCOSECHA'],
    ['1004520909','ANGIE VANESSA ARCE LOPEZ','POSCOSECHA'],
    ['94509907','JULIÁN ANDRÉS PÉREZ BETANCUR','ADMINISTRACIÓN'],
    ['22131943','ROSA AMELIA SOLORZANO SAMPEDRO','ASEO'],
    ['1089747022','JUAN ESTEBAN TORO VARGAS','MANTENIMIENTO'],
    ['1004733786','STEVEN ARCE VALLE','POSCOSECHA'],
    ['1004756825','LAURA RAMIREZ QUINTERO','ADMINISTRACIÓN'],
    ['1088305975','PAOLA ANDREA OSORIO GRISALES','POSCOSECHA'],
    ['1004751727',"LAURA VANESSA LONDOÑO SILVA","POSCOSECHA"],
    ['1088256932',"YEISON LEANDRO ARIAS MONTES","OPERACIONES"],
    ['1088346284',"NATALIA VALENCIA CORTES","ADMINISTRACIÓN"],
    ['1117964380',"YAMILETH HILARION OLAYA","POSCOSECHA"],
    ['5760588',"JOSE AUGUSTO CORDOVEZ CHARAMA","POSCOSECHA"],
    ['1112770658',"LUIS ALBERTO OROZCO RODRIGUEZ","POSCOSECHA"],
    ['1110480331',"CLAUDIA YULIMA CUTIVA BETANCOURTH","POSCOSECHA"],
    ['25038229',"YORME DE JESUS LOPEZ IBARRA","POSCOSECHA"],
    ['1128844585',"YENIFFER MOSQUERA PEREA","POSCOSECHA"],
    ['1089930892',"ALEXANDRA RIOS BUENO","POSCOSECHA"],
    ['1088295574',"ANDRES FELIPE BEDOYA ROJAS","POSCOSECHA"],
    ['1088316215',"SERGIO MUÑOZ RAMIREZ","ADMINISTRACIÓN"],
    ['1128844863',"BIVIAN YISET MOSQUERA PEREA","POSCOSECHA"],
    ['30356482',"MAGOLA PATIÑO ECHEVERRY","POSCOSECHA"],
    ['1085816021',"LEIDY CAROLINA JIMENEZ BERMUDEZ","POSCOSECHA"],
    ['1089599713',"MARIA CAMILA COLORADO LONDOÑO","POSCOSECHA"],
    ['1007367459',"FLOR NORELA VARGAS SERNA","POSCOSECHA"],
    ['1004668536',"LAURA CAMILA ARIAS HERNANDEZ","ADMINISTRACIÓN"],
    ['1054926615',"MARIA PAULA AGUIRRE OCHOA","ADMINISTRACIÓN"],
    ['1060270203',"MARCELA LOPEZ RAMIREZ","POSCOSECHA"],
    ['1274327',"WYNDIMAR YALUZ SANCHEZ HERRERA","POSCOSECHA"],
    ['1118287112',"MARTHA LUCIA LOPEZ ARBOLEDA","POSCOSECHA"],
    ['5472144',"NERYS CAROLINA HERNANDEZ GARCIA","POSCOSECHA"],
    ['63530730',"NORIZA NIÑO PEDRAZA","POSCOSECHA"],
    ['1004755939',"FABIO ANDRES GOMEZ OSPINA","ADMINISTRACIÓN"],
    ['1089601326',"LEIDY LAURA ESPINOZA OSPINA","POSCOSECHA"],
    ['1007554110',"ANGIE PAOLA OCAMPO HENAO","POSCOSECHA"],
    ['1032936469',"DANA CAROLINA SUAREZ GALEANO","POSCOSECHA"],
    ['42146393',"ANGELA MARIA ALARCON ESCOBAR","POSCOSECHA"],
    ['42146393', 'ANGELA MARIA ALARCON ESCOBAR', 'POSCOSECHA'],
    ['1007745486', 'ALEXANDRA CUELLAR ARTUNDUAGA', 'POSCOSECHA'],
    ['6060045', 'OSCARIANI DEL CARMEN AMARISTA GUZMAN', 'POSCOSECHA'],
    ['1088352316', 'ANGIE KATHERINE VALENCIA HEREDIA', 'POSCOSECHA'],
    ['1088282768', 'ELIANA VALENCIA GARCIA', 'ADMINISTRACIÓN'],
    ['1143384637', 'KELLY JOHANA DELGADO CASTILLO', 'ADMINISTRACIÓN'],
    ['1089930256', 'PAULINA GUERRERO CARVAJAL', 'ADMINISTRACIÓN'],
    ['1060010197', 'JUAN PABLO OSPINA VILLADA', 'POSCOSECHA'],
    ['1088034548', 'YURI LORENA GIRALDO BERRIO', 'POSCOSECHA'],
    ['1193263534','KAREN DAHIANA BERMUDEZ','POSCOSECHA'],
    ['1088325129','ROSA MARIA LOZANO TORRES','POSCOSECHA'],
    ['1004683651','SEBASTIAN OROZCO ECHEVERRY','POSCOSECHA'],
    ['6620175', 'JESUS DANIEL AMATIMA ASOCAR', 'POSCOSECHA'],
    ['1088029552', 'JAMES MORALES AGUADO', 'MANTENIMIENTO'],
    ['1004686441', 'ANA YASMIN VELEZ GARCIA', 'POSCOSECHA'],
    ['1087560062', 'KELLY JOHANA LOPEZ GONZALEZ', 'POSCOSECHA'],
    ['1005021274', 'MANUELA HOLGUIN ARANGO', 'POSCOSECHA'],
    ['1088353499', 'MARIA ESMERALDA PAVAS BATERO', 'POSCOSECHA'],
    ['1059698941', 'JENIFER BAÑOL PESCADORS', 'POSCOSECHA'],
    ['1024592442','DAVID ANDRES BLANCO GALEANO','POSCOSECHA'],
    ['1088824868','LAURA VALENTINA MOTATO BETANCOUR','POSCOSECHA'],
    ['6272421','GENESIS DE NAZARETH LOYO PASTRANA','POSCOSECHA'],
    ['3215025','HENYERLY YISMERY MONTOYA LOYO','POSCOSECHA'],
    ['1056781915','CLAUDIA MIRLAYS RONDON OCAMPO','POSCOSECHA'],
    ['1056786801','KARINA VANESA RUBIO CAICEDO','POSCOSECHA']
];
  
// Función para comparar las cédulas recortando el último dígito si tiene 9 dígitos en el archivo .dat
function matchIdWithArea(id_number) {
    id_number = id_number.trim();
  
    // Si la cédula en .dat tiene 9 dígitos, buscamos la cédula de 10 dígitos en records_data
    if (id_number.length === 9) {
      for (let record of records_data) {
        if (record[0].slice(0, -1) === id_number) { // Comparar los primeros 9 dígitos
          return { 
            area: record[2], 
            fullId: record[0], 
            name: record[1] // Agregar el nombre
          };  
        }
      }
    }
  
    // Si no se encuentra, retornar null
    return null;
}


  
// Función para manejar la carga del archivo
document.getElementById('inputFile').addEventListener('change', handleFileUpload);
  
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
      // Mostrar el mensaje de "Cargando..."
      document.getElementById('statusMessage').innerText = 'Cargando archivo...';
      document.getElementById('statusMessage').style.display = 'block';
      processDATFile(file);
    }
}
  
// Función para procesar el archivo .dat
function processDATFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const fileContent = e.target.result;
        const lines = fileContent.split('\n'); // Dividir el contenido en líneas
        processAttendanceData(lines);
    };
    reader.readAsText(file); // Leer el archivo como texto
}

  
// Función para procesar los datos de asistencia del archivo .dat
// Función para procesar los datos de asistencia del archivo .dat
function processAttendanceData(lines) {
  const tableBody = document.querySelector('#attendanceTable tbody');
  tableBody.innerHTML = ''; // Limpiar la tabla antes de llenarla

  let users = {};

  // Organizar los datos por cédula y fecha
  lines.forEach(line => {
    const fields = line.split('\t'); // Dividir por tabuladores
    
    if (fields.length >= 2) {
      const id = fields[0].trim();
      const timestamp = fields[1].trim();

      const checkIn = timestamp;  // Suponemos que el archivo tiene solo un timestamp por registro
      const checkOut = checkIn; // Para este ejemplo, usaremos el mismo check-out que el check-in

      // Extraemos solo la fecha (sin hora) de la marca de tiempo
      const date = checkIn.split(' ')[0];

      const result = matchIdWithArea(id); // Obtener el área, la cédula completa y el nombre

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
      }
    }
  });

  // Procesar los registros agrupados por cédula y fecha
  Object.keys(users).forEach(fullId => {
    const user = users[fullId];
    
    Object.keys(user).forEach(date => {
      const dayRecords = user[date];
      const { area, name, timestamps } = dayRecords;

      // Tomar el primer y último timestamp del día
      const firstTimestamp = timestamps[0];
      const lastTimestamp = timestamps[timestamps.length - 1];

      // Comparar la hora de entrada con el horario máximo permitido
      const schedule = expected_schedules[area];
      const checkInTime = firstTimestamp.slice(11, 16); // '07:35' por ejemplo
      const expectedCheckInTime = schedule.check_in; // '07:45' por ejemplo

      let arrivalStatus = '';
      if (checkInTime <= expectedCheckInTime) {
        arrivalStatus = 'Temprano';  // Llegó antes o a tiempo
      } else {
        arrivalStatus = 'Tarde';  // Llegó después del horario máximo permitido
      }

      // Calcular las horas trabajadas (checkOut y checkIn)
      const checkInDate = new Date(`1970-01-01T${firstTimestamp.slice(11, 16)}:00Z`);
      const checkOutDate = new Date(`1970-01-01T${lastTimestamp.slice(11, 16)}:00Z`);
      let workedMinutes = (checkOutDate - checkInDate) / (1000 * 60); // Diferencia en minutos
      let workedHours = workedMinutes / 60;  // Convertir minutos a horas

      // Asegurarse de que no haya NaN en el cálculo de horas trabajadas
      if (isNaN(workedHours)) {
        workedHours = 0;  // Si NaN, asignar 0 horas
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${fullId}</td>  <!-- Mostrar la cédula de 10 dígitos -->
        <td>${name}</td> <!-- Mostrar el nombre -->
        <td>${area}</td>
        <td>${firstTimestamp}</td> <!-- Mostrar el check-in -->
        <td>${lastTimestamp}</td> <!-- Mostrar el check-out -->
        <td>${arrivalStatus}</td> <!-- Mostrar el estado (Temprano/Tarde) -->
        <td>${workedHours.toFixed(2)} horas</td> <!-- Mostrar las horas trabajadas -->
      `;
      tableBody.appendChild(row);
    });
  });

  // Cambiar el mensaje de estado
  document.getElementById('statusMessage').innerText = 'Subido exitosamente';
  setTimeout(() => {
    document.getElementById('statusMessage').style.display = 'none';
  }, 3000);  // Ocultar el mensaje después de 3 segundos
}






