
const express = require('express'); 
const cors = require('cors');     
const mysql = require('mysql2'); 
const axios = require('axios'); 
const bcrypt = require('bcrypt');
const saltRounds = 10;

const app = express(); 


app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    console.log(`[LOG] Solicitud entrante: ${req.method} ${req.path}`);
    next(); 
});

// Configuración de la conexión
const dbConfig = {
    host: '82.197.82.72', 
    user: 'u134971130_Barber22', 
    password: 'FabricaDeMunecos1',
    database: 'u134971130_BarberStop',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0 
};
const pool = mysql.createPool(dbConfig);

// Keep-alive
setInterval(() => {
  pool.query('SELECT 1', (err) => {
    if (err) console.error('Error al mantener la conexión activa:', err.code);
  });
}, 300000); 

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err.code);
        return;
    }
    console.log('Conexión exitosa a la base de datos MySQL.');
    connection.release(); 
});


app.get('/', (req, res) => res.send('Servidor en funcionamiento.'));
app.get('/test-db', (req, res) => {
    pool.query('SELECT 1 + 1 AS solution', (error, results) => {
        if (error) {
            console.error('Error en la consulta de prueba:', error);
            return res.status(500).json({ error: 'Error al ejecutar la consulta en la base de datos', details: error.message });
        }
        res.json({ message: 'Consulta de prueba exitosa', result: results[0].solution });
    });
});


// --- ENDPOINT UNIFICADO DE LOGIN (CON BCRYPT) ---
app.post('/api/login', async (req, res) => {
    const { correo, contrasena } = req.body;
    if (!correo || !contrasena) {
        return res.status(400).json({ error: 'Faltan campos: Por favor, introduce correo y contraseña.' });
    }
    console.log(`\nIntento de login para correo: ${correo}`);

    const sqlQuery = `
        (SELECT 'Cliente' as tipo_usuario, id_cliente as id_usuario, nombre, contrasena, NULL as rol
         FROM Clientes WHERE correo = ?)
        UNION
        (SELECT 'Personal' AS tipo_usuario, id_personal AS id_usuario, nombre, contrasena, rol
         FROM Personal WHERE correo = ?);
    `;

    pool.query(sqlQuery, [correo, correo], async (error, results) => {
        if (error) {
            console.error('Error en la consulta de login unificado:', error);
            return res.status(500).json({ error: 'Error del servidor al intentar verificar credenciales.' });
        }
        if (results.length === 0) {
            console.log(`Login fallido: Usuario no encontrado para el correo: ${correo}`);
            return res.status(401).json({ error: 'Credenciales inválidas. Usuario no encontrado.' });
        }

        const user = results[0];
        try {
            const match = await bcrypt.compare(contrasena, user.contrasena);
            if (match) {
                console.log(`Login exitoso: ${user.tipo_usuario} - ${user.nombre} (ID: ${user.id_usuario})`);
                const userResponse = { id: user.id_usuario, nombre: user.nombre, tipo: user.tipo_usuario };
                if (user.tipo_usuario === 'Personal') {
                    userResponse.rol = user.rol;
                    userResponse.sesion = true;
                }
                return res.json({ message: 'Login exitoso', user: userResponse });
            } else {
                 // Fallback inseguro si la contraseña de la BD no está hasheada
                 if (user.contrasena === contrasena) {
                    console.log(`Login exitoso (MODO INSEGURO): ${user.tipo_usuario} - ${user.nombre}`);
                    const userResponse = { id: user.id_usuario, nombre: user.nombre, tipo: user.tipo_usuario };
                    if (user.tipo_usuario === 'Personal') { userResponse.rol = user.rol; userResponse.sesion = true; }
                    return res.json({ message: 'Login exitoso', user: userResponse });
                 }
                console.log(`Login fallido: Contraseña incorrecta para el usuario ID: ${user.id_usuario}`);
                return res.status(401).json({ error: 'Credenciales inválidas. Contraseña incorrecta.' });
            }
        } catch (compareError) {
            console.error('Error al comparar contraseñas:', compareError);
            return res.status(500).json({ error: 'Error del servidor al verificar credenciales.' });
        }
    });
});
// --- ENDPOINT PARA CAMBIAR CONTRASEÑA DEL CLIENTE (CON BCRYPT) ---
app.put('/api/clientes/cambiar-contrasena', (req, res) => {
    console.log("Datos recibidos:", req.body); 
    const { id_cliente, contrasena_actual, nueva_contrasena } = req.body;

    // 1. Validaciones iniciales
    if (!id_cliente || !contrasena_actual || !nueva_contrasena) {
        return res.status(400).json({ error: 'Faltan campos: ID de cliente, contraseña actual y nueva contraseña son requeridos.' });
    }
    if (contrasena_actual === nueva_contrasena) {
        return res.status(400).json({ error: 'La nueva contraseña no puede ser igual a la actual.' });
    }

    console.log("--- DEP. CAMBIO DE CONTRASEÑA CLIENTE ---");
    console.log(`ID Cliente: ${id_cliente}`);

    // 2. Obtener la contraseña hasheada actual de la DB
    // NOTA: La columna de contraseña del cliente es 'contrasena'.
    const selectQuery = 'SELECT contrasena FROM Clientes WHERE id_cliente = ?';
    
    pool.query(selectQuery, [id_cliente], (selectError, selectResults) => {
        if (selectError) {
            console.error("Error al buscar cliente:", selectError);
            return res.status(500).json({ error: 'Error interno del servidor.' });
        }
        if (selectResults.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado.' });
        }

        const contrasenaHasheadaActual = selectResults[0].contrasena;
        
        // 3. Comparar contraseñas
        bcrypt.compare(contrasena_actual, contrasenaHasheadaActual, (compareError, match) => {
            if (compareError) {
                console.error("Error al comparar contraseñas:", compareError);
                return res.status(500).json({ error: 'Error interno del servidor.' });
            }

            if (!match) {
                // Fallback (solo si aún tienes contraseñas sin hashear)
                if (contrasenaHasheadaActual === contrasena_actual) {
                    console.warn(` [WARN] Cambio de contraseña en modo INSEGURO para ID: ${id_cliente} (Contraseña sin hashear).`);
                } else {
                    console.log(`[DEP] FALLO: Contraseña actual incorrecta para el cliente ID: ${id_cliente}.`);
                    return res.status(401).json({ error: "La contraseña actual es incorrecta." });
                }
            }
            
            // --- Punto de éxito de comparación ---
            console.log("[DEP] ÉXITO: Contraseña actual verificada. Generando nuevo hash...");

            // 4. Hashear la nueva contraseña
            const saltRounds = 10;
            bcrypt.hash(nueva_contrasena, saltRounds, (hashError, nuevaContrasenaHasheada) => {
                if (hashError) {
                    console.error("Error al hashear la nueva contraseña:", hashError);
                    return res.status(500).json({ error: 'Error al procesar la nueva contraseña.' });
                }

                console.log("[DEP] ÉXITO: Nuevo hash generado. Preparando UPDATE a DB.");

                // 5. Actualizar la nueva contraseña en la DB
                const updateQuery = 'UPDATE Clientes SET contrasena = ? WHERE id_cliente = ?';
                const updateValues = [nuevaContrasenaHasheada, id_cliente];

                pool.query(updateQuery, updateValues, (updateError, updateResults) => {
                    if (updateError) {
                        console.error("[DEP] ¡ERROR GRAVE EN UPDATE SQL! Detalle del error:", updateError);
                        return res.status(500).json({ error: 'Error interno al actualizar la contraseña.' });
                    }

                    if (updateResults.affectedRows === 0) {
                         return res.status(404).json({ error: 'Cliente no encontrado o no hubo cambios.' });
                    }
                    
                    // 6. Respuesta exitosa
                    console.log("[DEP] ÉXITO: Actualización de DB completada y respuesta enviada.");
                    res.status(200).json({ mensaje: "Contraseña actualizada exitosamente." });
                });
            });
        });
    });
});
app.put('/api/personal/cambiar-contrasena', (req, res) => {
    const { id_personal, contrasena_actual, nueva_contrasena } = req.body;
    const selectQuery = 'SELECT contrasena FROM Personal WHERE id_personal = ?';
    pool.query(selectQuery, [id_personal], (selectError, selectResults) => {
        const contrasenaHasheadaActual = selectResults[0].contrasena;
        
        console.log("--- DEP. CAMBIO DE CONTRASEÑA PERSONAL ---");
        console.log(`ID Personal: ${id_personal}`);
        console.log(`Contraseña ingresada (Actual): ${contrasena_actual}`);
        console.log(`Contraseña de DB (Hasheada): ${contrasenaHasheadaActual}`);
        console.log("------------------------------------------");

        // 3. Comparar contraseñas
        bcrypt.compare(contrasena_actual, contrasenaHasheadaActual, (compareError, match) => {
            if (compareError) {
                console.error("Error al comparar contraseñas:", compareError);
                return res.status(500).json({ error: 'Error interno del servidor.' });
            }

            if (!match) {
                console.log("[DEP] FALLO: Las contraseñas no coinciden (esto ya no debería pasar).");
                return res.status(401).json({ error: "La contraseña actual es incorrecta." });
            }
            
            // --- Punto de éxito de comparación ---
            console.log("[DEP] ÉXITO: Contraseña actual verificada. Generando nuevo hash...");


            // 4. Hashear la nueva contraseña
            const saltRounds = 10;
            bcrypt.hash(nueva_contrasena, saltRounds, (hashError, nuevaContrasenaHasheada) => {
                if (hashError) {
                    console.error("Error al hashear la nueva contraseña:", hashError);
                    return res.status(500).json({ error: 'Error al procesar la nueva contraseña.' });
                }

                console.log("[DEP] ÉXITO: Nuevo hash generado. Preparando UPDATE a DB.");

                // 5. Actualizar la nueva contraseña en la DB
                const updateQuery = 'UPDATE Personal SET contrasena = ? WHERE id_personal = ?';
                const updateValues = [nuevaContrasenaHasheada, id_personal];

                pool.query(updateQuery, updateValues, (updateError, updateResults) => {
                    if (updateError) {
                        // --- PUNTO CRÍTICO DE FALLO ---
                        console.error("[DEP] ¡ERROR GRAVE EN UPDATE SQL! Detalle del error:", updateError);
                        return res.status(500).json({ error: 'Error interno al actualizar la contraseña.' });
                    }

                    // 6. Respuesta exitosa
                    console.log("[DEP] ÉXITO: Actualización de DB completada y respuesta enviada.");
                    res.status(200).json({ mensaje: "Contraseña actualizada exitosamente." });
                });
            });
        });
    });
});
// --- ENDPOINT DE REGISTRO DE CLIENTES (CON BCRYPT) ---
app.post('/api/register', async (req, res) => {
    const { nombre_completo, edad, email, password, condicion_especial } = req.body;
    if (!nombre_completo || !edad || !email || !password) {
        return res.status(400).json({ error: 'Faltan campos obligatorios para el registro.' });
    }
    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, saltRounds);
    } catch (hashError) {
        return res.status(500).json({ error: 'Error interno al procesar el registro.' });
    }
    const sqlQuery = `
        INSERT INTO Clientes (nombre, edad, correo, contrasena, condicion_especial) 
        VALUES (?, ?, ?, ?, ?);
    `;
    const values = [nombre_completo, edad, email, hashedPassword, condicion_especial || null];
    pool.query(sqlQuery, values, (error, results) => {
        if (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'El correo electrónico ya está registrado.' });
            }
            return res.status(500).json({ error: 'Error interno del servidor al registrar.' });
        }
        res.status(201).json({ message: 'Registro exitoso. Ahora puedes iniciar sesión.', clientId: results.insertId });
    });
});

// --- ENDPOINT DE REGISTRO DE PERSONAL (CON BCRYPT) ---
// --- ENDPOINT DE REGISTRO DE PERSONAL Y CREACIÓN DE HORARIO (CON BCRYPT Y TRANSACCIÓN) ---
app.post('/api/personal/registro', async (req, res) => {
    // 1. Campos de Personal
    const { nombre, correo, contrasena, rol, activo } = req.body;
    // 2. Campos de Horario
    const { 
        hora_entrada, 
        hora_salida, 
        hora_descanso_inicio, 
        hora_descanso_fin, 
        dia_descanso 
    } = req.body;

    // Validación de campos obligatorios (Personal + Horario)
    if (!nombre || !correo || !contrasena || !rol || !hora_entrada || !hora_salida) {
        return res.status(400).json({ 
            error: 'Faltan campos obligatorios. Asegúrate de incluir: nombre, correo, contrasena, rol, hora_entrada y hora_salida.' 
        });
    }

    let connection;
    try {
        // 1. Hashear la contraseña
        const hashedPassword = await bcrypt.hash(contrasena, saltRounds);

        // 2. Obtener una conexión para la transacción
        // El pool en tu archivo necesita la capacidad de promesas (ya la usas en otros puntos)
        connection = await pool.promise().getConnection(); 
        await connection.beginTransaction();

        // 3. Insertar en la tabla Personal
        const personalSqlQuery = `
            INSERT INTO Personal (nombre, correo, contrasena, rol, activo) 
            VALUES (?, ?, ?, ?, ?);
        `;
        const personalValues = [nombre, correo, hashedPassword, rol, activo || 1];
        
        const [personalResult] = await connection.query(personalSqlQuery, personalValues);
        const id_personal_nuevo = personalResult.insertId;

        // 4. Insertar en la tabla Horarios (usando el ID recién creado)
        const horarioSqlQuery = `
            INSERT INTO Horarios (
                id_personal, 
                hora_entrada, 
                hora_salida, 
                hora_descanso_inicio, 
                hora_descanso_fin, 
                dia_descanso
            ) VALUES (?, ?, ?, ?, ?, ?);
        `;
        const horarioValues = [
            id_personal_nuevo,
            hora_entrada,
            hora_salida,
            hora_descanso_inicio || null,
            hora_descanso_fin || null, 
            dia_descanso || null
        ];
        
        await connection.query(horarioSqlQuery, horarioValues);

        // 5. Confirmar la transacción
        await connection.commit();
        
        console.log(`[LOG-DB] Personal (ID: ${id_personal_nuevo}) y Horario creados exitosamente.`);
        
        res.status(201).json({ 
            message: 'Personal y Horario registrados con éxito.', 
            id_personal: id_personal_nuevo 
        });

    } catch (error) {
        // 6. Revertir la transacción en caso de error
        if (connection) {
            await connection.rollback();
        }
        
        console.error('Error en la transacción de registro de personal/horario:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'El correo electrónico ya está registrado.' });
        }
        
        return res.status(500).json({ 
            error: 'Error interno del servidor al registrar el personal y su horario.',
            details: error.message
        });
        
    } finally {
        // 7. Liberar la conexión
        if (connection) {
            connection.release();
        }
    }
});

// --- GETS IMPORTANTES (SERVICIOS Y TRABAJADORES) ---
app.get('/api/servicios', (req, res) => {
    const sqlQuery = 'SELECT id_servicio, nombre, duracion_minutos, precio FROM Servicios';
    pool.query(sqlQuery, (error, results) => {
        if (error) return res.status(500).json({ error: 'Error interno al obtener servicios.' });
        res.json({ servicios: results });
    });
});

app.get('/api/trabajadores', (req, res) => {
    const sqlQuery = "SELECT id_personal, nombre FROM Personal WHERE activo = 1 AND (rol = 'TRABAJADOR' OR rol = 'ADMIN')";
    pool.query(sqlQuery, (error, results) => {
        if (error) return res.status(500).json({ error: 'Error interno al obtener trabajadores.' });
        res.json({ trabajadores: results });
    });
});

// --- ENDPOINTS DE GESTIÓN DE CITAS ---

// --- Helper para obtener el horario de trabajo del personal para una fecha ---
async function obtenerHorarioDeTrabajo(id_trabajador, fecha) {
    // 1. Determinar el día de la semana (Lunes, Martes, ...) a partir de la fecha
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    // Convertir la fecha string (YYYY-MM-DD) a objeto Date
    const fechaObj = new Date(fecha + 'T00:00:00'); // Usar T00:00:00 para evitar problemas de timezone
    const diaSemanaIndex = fechaObj.getDay();
    const diaSemanaString = dias[diaSemanaIndex]; // Ej: 'Lunes'

    // 2. Consulta a la tabla Horarios
    const sqlQuery = `
        SELECT hora_entrada, hora_salida, hora_descanso_inicio, hora_descanso_fin, dia_descanso
        FROM Horarios
        WHERE id_personal = ?
    `;

    try {
        const [results] = await pool.promise().query(sqlQuery, [id_trabajador]);

        if (results.length === 0) {
            // No hay horario configurado para este personal
            return {
                estado: 'ERROR',
                mensaje: 'Horario no configurado para este personal.'
            };
        }
        
        const horario = results[0];

        // 3. Verificar si el día consultado es el día de descanso
        if (horario.dia_descanso === diaSemanaString) {
            return {
                estado: 'DESCANSO',
                mensaje: `El trabajador descansa el ${diaSemanaString}.`,
                dia_descanso: diaSemanaString
            };
        }

        // 4. Devolver el horario de trabajo válido para ese día
        return {
            estado: 'OK',
            dia: diaSemanaString,
            entrada: horario.hora_entrada,         // TIME
            salida: horario.hora_salida,           // TIME
            descansoInicio: horario.hora_descanso_inicio, // TIME o NULL
            descansoFin: horario.hora_descanso_fin        // TIME o NULL
        };
    } catch (error) {
        console.error('Error al obtener horario de trabajo:', error);
        return {
            estado: 'ERROR',
            mensaje: 'Error interno al consultar el horario de trabajo.'
        };
    }
}

// --- Helper CORREGIDO para generar intervalos (usa TIME strings) ---
function generarIntervalosDeTiempo(horaInicioStr, horaFinStr, intervalo = 30) {
    const horarios = [];
    const [startHour, startMin] = horaInicioStr.split(':').map(Number);
    const [endHour, endMin] = horaFinStr.split(':').map(Number);
    
    // Convertir todo a minutos para facilitar el cálculo
    let currentTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    while (currentTime < endTime) {
        const hour = Math.floor(currentTime / 60);
        const min = currentTime % 60;

        // Asegurarse de que el formato sea HH:MM
        const horaStr = hour.toString().padStart(2, '0');
        const minStr = min.toString().padStart(2, '0');
        
        horarios.push(`${horaStr}:${minStr}`);
        
        currentTime += intervalo;
    }
    return horarios;
}
// --- NUEVO ENDPOINT DE HORARIOS DISPONIBLES (INTEGRA HORARIOS DE TRABAJO) ---
app.post('/api/citas/horarios-disponibles', async (req, res) => {
    const { id_trabajador, fecha, duracion } = req.body;
    
    if (!id_trabajador || !fecha || !duracion) {
        return res.status(400).json({ error: 'Faltan id_trabajador, fecha o duracion.' });
    }
    
    const interval = 30; // Intervalo de slot fijo para cálculos de disponibilidad
    
    // 1. Obtener el horario de trabajo (usando el nuevo helper)
    const horarioTrabajo = await obtenerHorarioDeTrabajo(id_trabajador, fecha);

    if (horarioTrabajo.estado === 'ERROR') {
         return res.status(500).json({ error: horarioTrabajo.mensaje });
    }
    if (horarioTrabajo.estado === 'DESCANSO') {
        // Enviar respuesta exitosa con lista vacía y mensaje de error para el frontend
        return res.json({ 
            horariosDisponibles: [], 
            error: horarioTrabajo.mensaje 
        });
    }

    // 2. Generar todos los slots posibles según el horario de entrada/salida
    let todosLosHorarios = generarIntervalosDeTiempo(
        horarioTrabajo.entrada, 
        horarioTrabajo.salida, 
        interval
    );

    // 3. Eliminar slots que caen en el descanso de comida
    if (horarioTrabajo.descansoInicio && horarioTrabajo.descansoFin) {
        const slotsDescanso = generarIntervalosDeTiempo(
            horarioTrabajo.descansoInicio, 
            horarioTrabajo.descansoFin, 
            interval
        );
        // Filtrar los horarios de trabajo, excluyendo los de descanso
        todosLosHorarios = todosLosHorarios.filter(hora => !slotsDescanso.includes(hora));
    }
    
    // 4. Consultar citas ocupadas para el trabajador en esa fecha
    const sqlQuery = `
        SELECT 
            TIME_FORMAT(C.fecha_reserva, '%H:%i') AS hora_inicio,
            S.duracion_minutos
        FROM Citas C
        JOIN Servicios S ON C.id_servicio = S.id_servicio
        WHERE 
            C.id_trabajador = ?
            AND DATE(C.fecha_reserva) = ?
            AND C.estado IN ('PENDIENTE', 'CONFIRMADA');
    `;
    
    const [citasOcupadas] = await pool.promise().query(sqlQuery, [id_trabajador, fecha]);

    // Lógica para marcar slots ocupados (similar a tu código original)
    const occupiedSlots = new Set(); 
    citasOcupadas.forEach(cita => {
        const [startHour, startMinute] = cita.hora_inicio.split(':').map(Number);
        const totalSlots = Math.ceil(cita.duracion_minutos / interval);
        
        let currentHour = startHour;
        let currentMinute = startMinute;

        for (let i = 0; i < totalSlots; i++) {
            const slot = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
            occupiedSlots.add(slot);

            currentMinute += interval;
            if (currentMinute >= 60) {
                currentHour++;
                currentMinute -= 60; // Corregir el minuto
            }
        }
    });

    // 5. Filtrar horarios disponibles (comprobando si caben)
    const slotsNecesarios = Math.ceil(duracion / interval); 

    const horariosDisponibles = todosLosHorarios.filter(horaInicio => {
        let [currentHour, currentMinute] = horaInicio.split(':').map(Number);
        let tieneEspacio = true;

        for (let i = 0; i < slotsNecesarios; i++) {
            const slotToCheck = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
            
            // Si el slot a revisar es el de la hora de salida o está ocupado
            // Y SI el slot está fuera de la jornada laboral
            const slotInMinutes = currentHour * 60 + currentMinute;
            const salidaInMinutes = horarioTrabajo.salida.split(':').map(Number);
            const salidaTotalMinutes = salidaInMinutes[0] * 60 + salidaInMinutes[1];


            if (occupiedSlots.has(slotToCheck) || slotInMinutes >= salidaTotalMinutes) {
                tieneEspacio = false;
                break;
            }
            
            currentMinute += interval;
            if (currentMinute >= 60) {
                currentHour++;
                currentMinute -= 60;
            }
        }
        return tieneEspacio;
    });

    res.json({ horariosDisponibles: horariosDisponibles });
});
//nuevo endpoint de descanso
app.get('/api/trabajador/:id_trabajador/dia-descanso', async (req, res) => {
    const { id_trabajador } = req.params;

    if (!id_trabajador) {
        return res.status(400).json({ error: 'Falta el id_trabajador.' });
    }

    // Consulta simple para obtener solo el día de descanso
    const sqlQuery = `
        SELECT dia_descanso
        FROM Horarios
        WHERE id_personal = ?
    `;

    try {
        const [results] = await pool.promise().query(sqlQuery, [id_trabajador]);

        if (results.length === 0) {
            // Si no hay un horario configurado, no hay restricción conocida.
            return res.json({ dia_descanso: null, mensaje: "Horario no configurado." });
        }
        
        // Devolvemos el día de descanso (Ej: "Jueves")
        return res.json({ dia_descanso: results[0].dia_descanso });

    } catch (error) {
        console.error('Error al obtener día de descanso:', error);
        return res.status(500).json({ error: 'Error interno al consultar el día de descanso.' });
    }
});

// POST /api/citas/agendar
app.post('/api/citas/agendar', async (req, res) => {
    const { id_cliente, id_servicio, id_trabajador, fecha, hora_inicio, notas } = req.body;
    if (!id_cliente || !id_servicio || !id_trabajador || !fecha || !hora_inicio) {
        return res.status(400).json({ error: 'Faltan campos obligatorios para agendar la cita.' });
    }
    const fechaReserva = `${fecha} ${hora_inicio}:00`; 

    let duracion_minutos;
    try {
        const [servicioResult] = await pool.promise().query(
            'SELECT duracion_minutos FROM Servicios WHERE id_servicio = ?', [id_servicio]
        );
        if (servicioResult.length === 0) return res.status(404).json({ error: 'Servicio no encontrado.' });
        duracion_minutos = servicioResult[0].duracion_minutos;
    } catch (error) {
        return res.status(500).json({ error: 'Error al verificar la duración del servicio.' });
    }

    const conflictQuery = `
        SELECT id_cita FROM Citas
        WHERE 
            id_trabajador = ?
            AND estado IN ('PENDIENTE', 'CONFIRMADA')
            AND (
                ? < ADDTIME(Citas.fecha_reserva, SEC_TO_TIME((SELECT duracion_minutos FROM Servicios WHERE id_servicio = Citas.id_servicio) * 60))
                AND ADDTIME(?, SEC_TO_TIME(? * 60)) > Citas.fecha_reserva
            )
            AND DATE(Citas.fecha_reserva) = ?;
    `;
    const conflictValues = [id_trabajador, fechaReserva, fechaReserva, duracion_minutos, fecha];

    try {
        const [conflictResult] = await pool.promise().query(conflictQuery, conflictValues);
        if (conflictResult.length > 0) {
            return res.status(409).json({ error: 'Conflicto de horario. El personal ya tiene una cita agendada.' });
        }
    } catch (error) {
        console.error('Error al verificar conflictos de citas:', error);
        return res.status(500).json({ error: 'Error interno del servidor al verificar el horario.' });
    }

    const insertQuery = `
        INSERT INTO Citas 
        (id_cliente, id_trabajador, id_servicio, fecha, hora_inicio, fecha_reserva, notas) 
        VALUES (?, ?, ?, ?, ?, ?, ?);
    `;
    const insertValues = [id_cliente, id_trabajador, id_servicio, fecha, `${hora_inicio}:00`, fechaReserva, notas || null];
    
    try {
        const [results] = await pool.promise().query(insertQuery, insertValues);
        res.status(201).json({ 
            message: 'Cita agendada con éxito.', 
            id_cita: results.insertId,
            id_personal: id_trabajador,
            fecha_hora_inicio: fechaReserva,
            estado: 'PENDIENTE' 
        });
    } catch (error) {
        console.error('Error al insertar la cita en la base de datos:', error);
        return res.status(500).json({ error: 'Error interno del servidor al agendar la cita.' });
    }
});


// ===================================================================
// === ENDPOINT CORREGIDO PARA ACEPTAR SOLICITUDES DE ADMIN/TRABAJADOR ===
// ===================================================================
app.post('/api/citas/personal/citas-del-dia', (req, res) => {
    console.log(`[LOG] Endpoint /citas-del-dia alcanzado. Body:`, req.body);
    
    // id_personal ahora es OPCIONAL
    const { id_personal, fecha } = req.body; 
    
    // *** ¡LA CORRECCIÓN ESTÁ AQUÍ! ***
    // Solo validamos la FECHA, que es el único campo siempre requerido.
    if (!fecha) {
        console.log("[ERROR] Petición fallida: No se proporcionó fecha.");
        return res.status(400).json({ error: 'Faltan campos: Se requiere fecha.' });
    }

    let sqlQuery = '';
    let queryParams = [];

    // Esta consulta ahora incluye el JOIN con Personal (P) para obtener el nombre
    const baseQuery = `
        SELECT
            C.id_cita,
            DATE_FORMAT(C.fecha_reserva, '%Y-%m-%d') AS fecha_cita,
            TIME_FORMAT(C.fecha_reserva, '%H:%i') AS hora_de_la_cita,
            C.estado AS estado_cita, C.notas AS notas_cita,
            S.nombre AS nombre_servicio, S.duracion_minutos, S.precio AS precio_servicio,
            CL.nombre AS nombre_cliente,
            P.nombre AS nombre_personal 
        FROM Citas C
        JOIN Servicios S ON C.id_servicio = S.id_servicio
        JOIN Clientes CL ON C.id_cliente = CL.id_cliente
        JOIN Personal P ON C.id_trabajador = P.id_personal
    `;

    if (id_personal) {
        // VISTA TRABAJADOR: Si se provee un ID, filtramos por ese trabajador
        console.log(`\nConsultando citas para UN Personal ID: ${id_personal} en la fecha: ${fecha}`);
        sqlQuery = `
            ${baseQuery}
            WHERE 
                C.id_trabajador = ? 
                AND DATE(C.fecha_reserva) = ?
            ORDER BY hora_de_la_cita ASC;
        `;
        queryParams = [id_personal, fecha];

    } else {
        // VISTA ADMIN: Si NO se provee ID, traemos todas las de la fecha
        console.log(`\nConsultando citas para TODO el personal (ADMIN) en la fecha: ${fecha}`);
        sqlQuery = `
            ${baseQuery}
            WHERE 
                DATE(C.fecha_reserva) = ?
            ORDER BY P.nombre, hora_de_la_cita ASC;
        `;
        queryParams = [fecha];
    }

    // Ejecutamos la consulta
    pool.query(sqlQuery, queryParams, (error, results) => {
        if (error) {
            console.error('[ERROR] Error al consultar citas en la DB:', error);
            return res.status(500).json({ error: 'Error del servidor al obtener las citas.' });
        }
        console.log(`[SUCCESS] Consulta exitosa. Encontradas ${results.length} citas.`);
        return res.json({
            message: 'Citas obtenidas correctamente', data: results,
            id_personal_consultado: id_personal || 'TODOS (ADMIN)',
            fecha_consultada: fecha
        });
    });
});


// GET /api/citas/cliente/:id_cliente
app.get('/api/citas/cliente/:id_cliente', async (req, res) => {
    const { id_cliente } = req.params;
    if (!id_cliente) {
        return res.status(400).json({ error: 'Faltan campos: Se requiere id_cliente.' });
    }
    console.log(`\nConsultando TODAS las citas para el Cliente ID: ${id_cliente}`);

    const sqlQuery = `
        SELECT
            C.id_cita,
            DATE_FORMAT(C.fecha_reserva, '%Y-%m-%d') AS fecha_cita,
            TIME_FORMAT(C.fecha_reserva, '%H:%i') AS hora_inicio,
            C.estado, C.notas,
            S.nombre AS nombre_servicio, S.duracion_minutos, S.precio,
            P.nombre AS nombre_personal
        FROM Citas C
        JOIN Servicios S ON C.id_servicio = S.id_servicio
        JOIN Personal P ON C.id_trabajador = P.id_personal
        WHERE C.id_cliente = ?
        ORDER BY C.fecha_reserva DESC;
    `;

    try {
        const [results] = await pool.promise().query(sqlQuery, [id_cliente]);
        console.log(`Consulta exitosa. Encontradas ${results.length} citas.`);
        return res.json({ message: 'Todas las citas obtenidas correctamente', citas: results });
    } catch (error) {
        console.error('Error al consultar citas del Cliente:', error);
        return res.status(500).json({ error: 'Error del servidor al obtener las citas.' });
    }
});

// PATCH /api/citas/estado/:id_cita
app.patch('/api/citas/estado/:id_cita', (req, res) => {
    const { id_cita } = req.params;
    const { nuevo_estado } = req.body;
    if (!nuevo_estado) {
        return res.status(400).json({ error: 'Se requiere el campo "nuevo_estado".' });
    }
    const sqlQuery = `UPDATE Citas SET estado = ? WHERE id_cita = ?;`;
    pool.query(sqlQuery, [nuevo_estado, id_cita], (error, results) => {
        if (error) {
            console.error('Error al actualizar el estado de la cita:', error);
            return res.status(500).json({ error: 'Error interno del servidor.' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Cita no encontrada.' });
        }
        console.log(`Cita ID ${id_cita} actualizada al estado: ${nuevo_estado}`);
        res.json({
            message: 'Estado de la cita actualizado correctamente.',
            id_cita: id_cita,
            nuevo_estado: nuevo_estado
        });
    });
});
// POST /api/servicios (Crear un nuevo servicio)
app.post('/api/servicios', async (req, res) => {
    const { nombre, duracion_minutos, precio } = req.body;

    if (!nombre || !duracion_minutos || !precio) {
        return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    const sqlQuery = `
        INSERT INTO Servicios (nombre, duracion_minutos, precio) 
        VALUES (?, ?, ?);
    `;
    const values = [nombre, duracion_minutos, precio];

    pool.query(sqlQuery, values, (error, results) => {
        if (error) {
            console.error("Error al crear servicio:", error);
            return res.status(500).json({ error: 'Error interno al crear el servicio.' });
        }
        res.status(201).json({ 
            message: 'Servicio creado con éxito', 
            id_servicio: results.insertId 
        });
    });
});

// PUT /api/servicios/:id (Actualizar un servicio)
app.put('/api/servicios/:id_servicio', async (req, res) => {
    const { id_servicio } = req.params;
    const { nombre, duracion_minutos, precio } = req.body;

    if (!nombre || !duracion_minutos || !precio) {
        return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    const sqlQuery = `
        UPDATE Servicios 
        SET nombre = ?, duracion_minutos = ?, precio = ?
        WHERE id_servicio = ?;
    `;
    const values = [nombre, duracion_minutos, precio, id_servicio];

    pool.query(sqlQuery, values, (error, results) => {
        if (error) {
            console.error("Error al actualizar servicio:", error);
            return res.status(500).json({ error: 'Error interno al actualizar el servicio.' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Servicio no encontrado.' });
        }
        res.json({ message: 'Servicio actualizado con éxito.' });
    });
});

// DELETE /api/servicios/:id (Borrar un servicio)
app.delete('/api/servicios/:id_servicio', async (req, res) => {
    const { id_servicio } = req.params;

    const sqlQuery = `DELETE FROM Servicios WHERE id_servicio = ?;`;

    pool.query(sqlQuery, [id_servicio], (error, results) => {
        if (error) {
            if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                 return res.status(400).json({ error: 'Error: Este servicio no se puede borrar porque ya está asociado a citas existentes.' });
            }
            console.error("Error al borrar servicio:", error);
            return res.status(500).json({ error: 'Error interno al borrar el servicio.' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Servicio no encontrado.' });
        }
        res.json({ message: 'Servicio borrado con éxito.' });
    });
});

// GET /api/clientes (Leer todos los clientes)
app.get('/api/clientes', async (req, res) => {
    const sqlQuery = `SELECT id_cliente, nombre, correo, edad, condicion_especial FROM Clientes ORDER BY nombre ASC;`;
    
    pool.query(sqlQuery, (error, results) => {
        if (error) {
            console.error("Error al obtener clientes:", error);
            return res.status(500).json({ error: 'Error interno al obtener clientes.' });
        }
        res.json({ clientes: results });
    });
});

// POST /api/clientes (Crear un nuevo cliente)
app.post('/api/clientes', async (req, res) => {
    const { nombre, correo, edad, condicion_especial, password } = req.body;

    if (!nombre || !correo || !edad || !password) {
        return res.status(400).json({ error: 'Faltan campos obligatorios (nombre, correo, edad, password).' });
    }

    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, saltRounds);
    } catch (hashError) {
        return res.status(500).json({ error: 'Error interno al procesar el registro.' });
    }

    const sqlQuery = `
        INSERT INTO Clientes (nombre, correo, contrasena, edad, condicion_especial) 
        VALUES (?, ?, ?, ?, ?);
    `;
    const values = [nombre, correo, hashedPassword, edad, condicion_especial || null];

    pool.query(sqlQuery, values, (error, results) => {
        if (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'El correo electrónico ya está registrado.' });
            }
            console.error("Error al crear cliente:", error);
            return res.status(500).json({ error: 'Error interno al crear el cliente.' });
        }
        res.status(201).json({ 
            message: 'Cliente creado con éxito', 
            id_cliente: results.insertId 
        });
    });
});

// PUT /api/clientes/:id_cliente (Actualizar un cliente)
app.put('/api/clientes/:id_cliente', async (req, res) => {
    const { id_cliente } = req.params;
    const { nombre, correo, edad, condicion_especial } = req.body;

    if (!nombre || !correo || !edad) {
        return res.status(400).json({ error: 'Faltan campos obligatorios (nombre, correo, edad).' });
    }

    const sqlQuery = `
        UPDATE Clientes 
        SET nombre = ?, correo = ?, edad = ?, condicion_especial = ?
        WHERE id_cliente = ?;
    `;
    const values = [nombre, correo, edad, condicion_especial || null, id_cliente];

    pool.query(sqlQuery, values, (error, results) => {
        if (error) {
             if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'El correo electrónico ya está registrado para otro usuario.' });
            }
            console.error("Error al actualizar cliente:", error);
            return res.status(500).json({ error: 'Error interno al actualizar el cliente.' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado.' });
        }
        res.json({ message: 'Cliente actualizado con éxito.' });
    });
});

// DELETE /api/clientes/:id_cliente (Borrar un cliente)
app.delete('/api/clientes/:id_cliente', async (req, res) => {
    const { id_cliente } = req.params;

    const deleteCitasQuery = `DELETE FROM Citas WHERE id_cliente = ?;`;
    
    pool.query(deleteCitasQuery, [id_cliente], (error, citasResults) => {
        if (error) {
            console.error("Error al borrar citas del cliente:", error);
            return res.status(500).json({ error: 'Error interno al borrar las citas asociadas.' });
        }

        const deleteClienteQuery = `DELETE FROM Clientes WHERE id_cliente = ?;`;
        pool.query(deleteClienteQuery, [id_cliente], (error, clienteResults) => {
             if (error) {
                console.error("Error al borrar cliente:", error);
                return res.status(500).json({ error: 'Error interno al borrar el cliente.' });
            }
            if (clienteResults.affectedRows === 0) {
                return res.status(404).json({ error: 'Cliente no encontrado.' });
            }
            res.json({ message: `Cliente y ${citasResults.affectedRows} citas asociadas borrados con éxito.` });
        });
    });
});

// --- FIN: ENDPOINTS CRUD PARA CLIENTES ---


// --- INICIO: ENDPOINT PARA REPORTES ---
app.get('/api/reportes/stats', async (req, res) => {
    console.log("Generando reportes...");
    try {
        const queryHoy = `
            SELECT 
                COUNT(C.id_cita) AS citasHoy,
                SUM(S.precio) AS ingresosHoy
            FROM Citas C
            JOIN Servicios S ON C.id_servicio = S.id_servicio
            WHERE 
                C.estado = 'COMPLETADA'
                AND DATE(C.fecha_reserva) = CURDATE();
        `;

        const queryMes = `
            SELECT 
                COUNT(C.id_cita) AS citasMes,
                SUM(S.precio) AS ingresosMes
            FROM Citas C
            JOIN Servicios S ON C.id_servicio = S.id_servicio
            WHERE 
                C.estado = 'COMPLETADA'
                AND MONTH(C.fecha_reserva) = MONTH(CURDATE())
                AND YEAR(C.fecha_reserva) = YEAR(CURDATE());
        `;

        const queryPopular = `
            SELECT 
                S.nombre AS nombre_servicio,
                COUNT(C.id_cita) AS total_citas
            FROM Citas C
            JOIN Servicios S ON C.id_servicio = S.id_servicio
            WHERE 
                MONTH(C.fecha_reserva) = MONTH(CURDATE())
                AND YEAR(C.fecha_reserva) = YEAR(CURDATE())
            GROUP BY S.nombre
            ORDER BY total_citas DESC
            LIMIT 1;
        `;

        const [hoyResults] = await pool.promise().query(queryHoy);
        const [mesResults] = await pool.promise().query(queryMes);
        const [popularResults] = await pool.promise().query(queryPopular);

        const stats = {
            citasHoy: hoyResults[0].citasHoy || 0,
            ingresosHoy: hoyResults[0].ingresosHoy || 0,
            citasMes: mesResults[0].citasMes || 0,
            ingresosMes: mesResults[0].ingresosMes || 0,
            servicioPopular: popularResults[0] || { nombre_servicio: 'N/A', total_citas: 0 }
        };

        res.json({ stats: stats });

    } catch (error) {
        console.error("Error al generar reportes:", error);
        return res.status(500).json({ error: 'Error interno al generar los reportes.' });
    }
});
//Admin
app.get('/api/horarios', (req, res) => {
    // La consulta clave: JOIN con Personal y filtrar activo = 1
    const sqlQuery = `
        SELECT 
            H.*, 
            P.nombre AS nombre_personal, 
            P.activo
        FROM 
            Horarios H
        JOIN 
            Personal P ON H.id_personal = P.id_personal
        WHERE 
            P.activo = 1; 
    `;

    pool.query(sqlQuery, (error, results) => {
        if (error) {
            console.error('Error al obtener horarios de personal activo:', error);
            return res.status(500).json({ 
                success: false, 
                mensaje: 'Error interno del servidor al obtener horarios.',
                error: error.message
            });
        }
        
        // Si no hay errores, devuelve la lista filtrada
        res.status(200).json({ 
            success: true, 
            mensaje: 'Horarios de personal activo obtenidos con éxito.', 
            data: results 
        });
    });
});
//admin editar horarios
app.put('/api/horarios/:id_horario', (req, res) => {
    const id_horario = req.params.id_horario;
    const { 
        hora_entrada, 
        hora_salida, 
        hora_descanso_inicio, 
        hora_descanso_fin, 
        dia_descanso 
    } = req.body;

    if (!hora_entrada && !hora_salida && !hora_descanso_inicio && !hora_descanso_fin && !dia_descanso) {
        return res.status(400).json({ 
            error: 'Se requiere al menos un campo de horario para la actualización.' 
        });
    }

    let fields = [];
    let values = [];

    if (hora_entrada !== undefined) {
        fields.push('hora_entrada = ?');
        values.push(hora_entrada);
    }
    if (hora_salida !== undefined) {
        fields.push('hora_salida = ?');
        values.push(hora_salida);
    }
    if (hora_descanso_inicio !== undefined) {
        fields.push('hora_descanso_inicio = ?');
        values.push(hora_descanso_inicio);
    }
    if (hora_descanso_fin !== undefined) {
        fields.push('hora_descanso_fin = ?');
        values.push(hora_descanso_fin);
    }
    if (dia_descanso !== undefined) {
        fields.push('dia_descanso = ?');
        values.push(dia_descanso);
    }

    const setClause = fields.join(', ');

    const sqlQuery = `
        UPDATE Horarios 
        SET ${setClause}
        WHERE id_horario = ?;
    `;
    
    values.push(id_horario);

    pool.query(sqlQuery, values, (error, result) => {
        if (error) {
            console.error('Error al actualizar horario:', error);
            return res.status(500).json({ 
                error: 'Error interno del servidor al actualizar el horario.',
                details: error.message 
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                mensaje: `Horario con ID ${id_horario} no encontrado o no hubo cambios.` 
            });
        }

        res.json({ 
            mensaje: `Horario con ID ${id_horario} actualizado correctamente.`,
            filas_afectadas: result.affectedRows 
        });
    });
});
//delete usuario
app.delete('/api/horarios/:id_horario', (req, res) => {
    const id_horario = req.params.id_horario;
    const sqlQuery = `DELETE FROM Horarios WHERE id_horario = ?`;
    const values = [id_horario];

    pool.query(sqlQuery, values, (error, result) => {
        if (error) {
            console.error('Error al eliminar horario:', error);
            return res.status(500).json({ 
                error: 'Error interno del servidor al eliminar el horario.',
                details: error.message 
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                mensaje: `Horario con ID ${id_horario} no encontrado.` 
            });
        }

        res.json({ 
            mensaje: `Horario con ID ${id_horario} eliminado correctamente.`,
            filas_afectadas: result.affectedRows 
        });
    });
});

//Personal
app.get('/api/personal', (req, res) => {
    const sqlQuery = `SELECT id_personal, nombre, correo, rol, activo FROM Personal WHERE activo = 1 ORDER BY nombre;`;

    pool.query(sqlQuery, (error, results) => {
        if (error) {
            console.error('Error al obtener la lista de personal:', error);
            return res.status(500).json({ 
                error: 'Error interno del servidor al consultar el personal.',
                details: error.message 
            });
        }

        if (results.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                mensaje: 'La tabla de personal está vacía.'
            });
        }

        res.status(200).json({ 
            success: true,
            data: results,
            mensaje: 'Lista de personal obtenida correctamente.'
        });
    });
});
//nuevo endpoint para poner inactivo
app.put('/api/personal/:id_personal/activo', (req, res) => {
    // ... (Tu lógica de PUT) ...
    const id_personal = req.params.id_personal;
    const nuevoEstadoActivo = req.body.activo;

    if (nuevoEstadoActivo === undefined || (nuevoEstadoActivo !== 0 && nuevoEstadoActivo !== 1)) {
        return res.status(400).json({
            error: 'Solicitud inválida. Se requiere un valor para "activo" (0 o 1).'
        });
    }

    const sqlQuery = `UPDATE Personal SET activo = ? WHERE id_personal = ?`;
    const values = [nuevoEstadoActivo, id_personal];

    pool.query(sqlQuery, values, (error, result) => {
        if (error) {
            console.error('Error al actualizar el estado activo:', error);
            return res.status(500).json({ 
                error: 'Error interno del servidor al actualizar el estado.',
                details: error.message 
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                mensaje: `Personal con ID ${id_personal} no encontrado.` 
            });
        }

        res.json({ 
            mensaje: `Estado 'activo' del personal con ID ${id_personal} actualizado a ${nuevoEstadoActivo} correctamente.`,
            filas_afectadas: result.affectedRows 
        });
    });
}); 


// --- Configuración de Nodemailer (VA AQUÍ, FUERA DE CUALQUIER RUTA) ---
const nodemailer = require('nodemailer');

// ⚠️ ADVERTENCIA: Credenciales hardcodeadas. ¡NO SEGURO! 
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'martingtrrz.iot@gmail.com',
    pass: 'futs elfi oaet tceh',
  },
  tls: {
    rejectUnauthorized: false
  }
});

// --- ENDPOINT PARA GENERAR TOKEN ---
app.post('/api/generar-token', (req, res) => {
  const { correo } = req.body;

  // DEPURACIÓN CLAVE 1: Muestra el cuerpo completo y el correo extraído
  console.log(' [DEBUG] Cuerpo de solicitud (req.body):', req.body);
  console.log(' [LOG] Recibida solicitud para generar token para correo:', correo);

  if (!correo) {
    console.warn(' [WARN] Correo requerido para generar token. Body Parser puede estar fallando.');
    return res.status(400).json({ error: 'Correo requerido.' });
  }

  // 1. Generar un token de 4 dígitos (0000-9999)
  const token = Math.floor(1000 + Math.random() * 9000).toString();
  const ahora = new Date();

  // 2. Definir expiración en 10 minutos (10 * 60 * 1000 milisegundos)
  const expira = new Date(ahora.getTime() + 10 * 60 * 1000);

  // 3. Guardar en la BD (asumiendo tabla 'Clientes')
  // Usamos los nombres de columna que solicitaste: Token4Digitos y TokenExpiracion
  const sql = 'UPDATE Clientes SET Token4Digitos = ?, TokenExpiracion = ? WHERE correo = ?';

  // Array de valores para la consulta SQL
  const params = [token, expira, correo];

  // DEPURACIÓN CLAVE 2: Muestra la consulta SQL y los valores que se usarán
  console.log(' [DEBUG-DB] SQL a ejecutar:', sql);
  console.log(' [DEBUG-DB] Parámetros:', params);
  console.log(' [DEBUG-DB] Token generado:', token);
  console.log(' [DEBUG-DB] Tiempo de Expiración (JS Date):', expira);

  // Utiliza 'pool.query' aquí para ejecutar la consulta
  pool.query(sql, params, async (err, result) => {
    if (err) {
      console.error(' [ERROR-DB] Error al guardar token:', err.message, err.sqlMessage);
      return res.status(500).json({ error: 'No se pudo guardar el token en la base de datos.' });
    }

    // Comprobamos si alguna fila fue afectada (si el correo existe)
    if (result.affectedRows === 0) {
      console.warn(' [WARN-DB] Correo no encontrado en la BD al intentar guardar token:', correo);
      return res.status(404).json({ error: 'Correo no encontrado en el sistema.' });
    }

    console.log(` [LOG-DB] Token guardado exitosamente. Filas afectadas: ${result.affectedRows}.`);

    // 4. Configurar el correo
    const mailOptions = {
      from: transporter.options.auth.user,
      to: correo,
      subject: 'Código de Recuperación de Contraseña para The Barber Stop',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Recuperación de Contraseña</h2>
          <p>Hola,</p>
          <p>Has solicitado un código para restablecer tu contraseña en <strong>The Barber Stop</strong>.</p>
          <p>Tu código de recuperación es:</p>
          <p style="font-size: 24px; font-weight: bold; color: #007bff; background-color: #f0f8ff; padding: 10px; border-radius: 5px; display: inline-block;">${token}</p>
          <p>Este código es válido por 10 minutos (expira a las: ${expira.toLocaleString()}).</p>
          <p>Si no solicitaste este cambio, por favor ignora este correo.</p>
          <p>Gracias,</p>
          <p>El equipo de The Barber Stop</p>
        </div>
      `,
    };

    // 5. Enviar el correo
    try {
      await transporter.sendMail(mailOptions);
      console.log(' [LOG-EMAIL] Correo enviado exitosamente a:', correo);
      res.json({ success: true, message: 'Código de recuperación enviado a tu correo.' });
    } catch (emailErr) {
      console.error(' [ERROR-EMAIL] Error al enviar correo con Nodemailer:', emailErr.message);
      // Enviamos un 500 pero indicando que la DB funcionó.
      res.status(500).json({ error: 'Token generado, pero hubo un problema al enviar el correo. Intenta de nuevo.' });
    }
  });
});

// --- NUEVO ENDPOINT PARA VERIFICAR TOKEN Y LIMPIAR DB ---
app.post('/api/verificar-token', (req, res) => {
    const { correo, token } = req.body;

    console.log(' [LOG] Solicitud para verificar token. Correo:', correo, 'Token:', token);

    if (!correo || !token) {
        return res.status(400).json({ error: 'Correo y token son requeridos.' });
    }

    // 1. Consulta para encontrar el cliente y validar token/expiración
    const sql = `
        SELECT Token4Digitos, TokenExpiracion 
        FROM Clientes 
        WHERE correo = ?;
    `;

    pool.query(sql, [correo], (err, results) => {
        if (err) {
            console.error(' [ERROR-DB] Error al consultar token:', err.message);
            return res.status(500).json({ error: 'Error interno del servidor.' });
        }
        
        if (results.length === 0) {
            console.warn(' [WARN-DB] Correo no encontrado.');
            return res.status(404).json({ error: 'Cliente no encontrado.' });
        }

        const client = results[0];
        const dbToken = client.Token4Digitos;
        const dbExpiration = client.TokenExpiracion;

        // 2. Validación de Expiración
        if (!dbToken || !dbExpiration || new Date() > dbExpiration) {
            console.warn(' [WARN] Token expirado o nulo.');
            // Limpiamos el token expirado/nulo para mayor seguridad (aunque expire solo)
            const cleanSql = 'UPDATE Clientes SET Token4Digitos = NULL, TokenExpiracion = NULL WHERE correo = ?';
            pool.query(cleanSql, [correo], () => {}); // Ejecutar sin esperar el resultado
            return res.status(401).json({ error: 'El código de verificación ha expirado. Solicita uno nuevo.' });
        }

        // 3. Validación del Token
        if (dbToken !== token) {
            console.warn(' [WARN] Token incorrecto ingresado.');
            return res.status(401).json({ error: 'Código de verificación incorrecto.' });
        }

        // 4. ÉXITO: Limpiar la base de datos (CRUCIAL)
        const cleanSql = 'UPDATE Clientes SET Token4Digitos = NULL, TokenExpiracion = NULL WHERE correo = ?';
        pool.query(cleanSql, [correo], (cleanErr, cleanResult) => {
            if (cleanErr) {
                console.error(' [ERROR-DB] Error al limpiar token:', cleanErr.message);
                // NOTA: Aunque falle la limpieza, el token es válido y debe continuar.
            }
            console.log(' [LOG-DB] Token y expiración limpiados de la DB.');

            // 5. Respuesta Exitosa
            res.status(200).json({ 
                success: true, 
                message: 'Token verificado. Procede al cambio de contraseña.' 
            });
        });
    });
});


// --- ENDPOINT CORREGIDO PARA RESTABLECER CONTRASEÑA ---
app.post('/api/restablecer-password', async (req, res) => {
    const { correo, nuevaPassword } = req.body;
    
    console.log(' [LOG] Solicitud para restablecer contraseña para correo:', correo);

    if (!correo || !nuevaPassword) {
        console.warn(' [WARN] Correo o nuevaPassword faltante en la solicitud.');
        return res.status(400).json({ error: 'Correo y nueva contraseña son requeridos.' });
    }

    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(nuevaPassword, saltRounds);

        // *** CAMBIO CLAVE: Usamos 'contrasena' en lugar de 'password' ***
        const sql = 'UPDATE Clientes SET contrasena = ? WHERE correo = ?'; 
        const params = [hashedPassword, correo];

        pool.query(sql, params, (err, result) => {
            if (err) {
                console.error(' [ERROR-DB] Error al actualizar la contraseña:', err.message, err.sqlMessage);
                return res.status(500).json({ error: 'Error interno del servidor al actualizar la contraseña.' });
            }

            if (result.affectedRows === 0) {
                console.warn(' [WARN-DB] Correo no encontrado al intentar actualizar la contraseña:', correo);
                return res.status(404).json({ error: 'El proceso no pudo completarse. Cliente no encontrado o no autorizado.' });
            }

            console.log(` [LOG-DB] Contraseña actualizada exitosamente. Filas afectadas: ${result.affectedRows}.`);

            res.status(200).json({ 
                success: true, 
                message: 'Contraseña restablecida exitosamente. Ahora puedes iniciar sesión.' 
            });
        });

    } catch (error) {
        console.error(' [ERROR] Error durante el hashing o la conexión:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }

});
// --- ENDPOINT PARA LEER CLIENTES INACTIVOS ---
app.get('/api/clientes-inactivos', (req, res) => {
    console.log(' [LOG] Solicitud para obtener la lista de Clientes Inactivos.');

    const sqlQuery = `
        SELECT 
            id_cliente, 
            nombre, 
            correo, 
            edad, 
            condicion_especial,
            DATE_FORMAT(fecha_eliminacion, '%Y-%m-%d %H:%i:%s') AS fecha_eliminacion
        FROM ClientesInactivo
        ORDER BY fecha_eliminacion DESC;
    `;

    pool.query(sqlQuery, (error, results) => {
        if (error) {
            console.error(' [ERROR-DB] Error al obtener clientes inactivos:', error);
            return res.status(500).json({ 
                error: 'Error interno del servidor al consultar la tabla de clientes inactivos.' 
            });
        }
        
        console.log(` [SUCCESS-DB] Encontrados ${results.length} clientes inactivos.`);
        
        res.status(200).json({ 
            success: true,
            clientes_inactivos: results,
            mensaje: `Se obtuvieron ${results.length} registros de clientes inactivos.`
        });
    });
});
// --- ENDPOINT PARA RESTAURAR CLIENTES INACTIVOS ---
// --- ENDPOINT PARA RESTAURAR CLIENTES INACTIVOS (server.js) ---
app.post('/api/clientes-inactivos/restaurar', async (req, res) => {
    const { id_cliente } = req.body;
    
    console.log(' [LOG] Solicitud para restaurar cliente ID:', id_cliente);

    if (!id_cliente) {
        return res.status(400).json({ error: 'El id_cliente es requerido para la restauración.' });
    }

    let connection;
    try {
        // 1. Obtener una conexión transaccional
        // NOTA: NECESITAS QUE TU POOL DE MYSQL ESTÉ CONFIGURADO CON .promise()
        connection = await pool.promise().getConnection(); 
        await connection.beginTransaction();

        // A. Seleccionar los datos del cliente inactivo
        const [inactiveClientResult] = await connection.query(
            'SELECT id_cliente, nombre, edad, correo, contrasena, condicion_especial, Token4Digitos, TokenExpiracion FROM ClientesInactivo WHERE id_cliente = ?', 
            [id_cliente]
        );

        if (inactiveClientResult.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Cliente inactivo no encontrado.' });
        }

        const clientData = inactiveClientResult[0];

        // B. Insertar los datos en la tabla Clientes (restauración)
        const insertQuery = `
            INSERT INTO Clientes 
            (id_cliente, nombre, edad, correo, contrasena, condicion_especial, Token4Digitos, TokenExpiracion) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const insertValues = [
            clientData.id_cliente,
            clientData.nombre,
            clientData.edad,
            clientData.correo,
            clientData.contrasena,
            clientData.condicion_especial,
            clientData.Token4Digitos,
            clientData.TokenExpiracion
        ];
        
        await connection.query(insertQuery, insertValues);

        // C. Eliminar el registro de la tabla ClientesInactivo
        const deleteQuery = 'DELETE FROM ClientesInactivo WHERE id_cliente = ?';
        await connection.query(deleteQuery, [id_cliente]);

        // 2. Confirmar la transacción
        await connection.commit();

        console.log(` [LOG-DB] Cliente ID ${id_cliente} restaurado exitosamente.`);
        res.status(200).json({ 
            success: true, 
            message: `Cliente ${id_cliente} restaurado y movido de vuelta a la lista activa.` 
        });

    } catch (error) {
        // 3. Revertir la transacción en caso de error
        if (connection) {
            await connection.rollback();
        }
        console.error(' [ERROR] Error durante la restauración del cliente:', error.message);
        
        // Manejo de error de clave duplicada
        if (error.code === 'ER_DUP_ENTRY') {
             return res.status(409).json({ error: 'El cliente ya existe en la lista activa. La restauración falló.' });
        }
        // Asegura que el backend siempre envíe JSON en caso de error
        res.status(500).json({ error: 'Error interno del servidor al restaurar el cliente.' });
        
    } finally {
        // 4. Liberar la conexión
        if (connection) {
            connection.release();
        }
    }
});

app.put('/api/personal/:id_personal', (req, res) => {
    const { id_personal } = req.params;
    const { nombre, correo, rol } = req.body;

    console.log(`[LOG] Solicitud PUT para editar Personal ID: ${id_personal}`);

    if (!nombre || !correo || !rol) {
        return res.status(400).json({ 
            error: 'Solicitud inválida. Se requiere nombre, correo y rol.' 
        });
    }

    // Omitimos la contraseña intencionalmente. 
    // La edición de contraseña debería ser un proceso separado.
    const sqlQuery = `
        UPDATE Personal 
        SET nombre = ?, correo = ?, rol = ?
        WHERE id_personal = ?
    `;
    const values = [nombre, correo, rol, id_personal];

    pool.query(sqlQuery, values, (error, result) => {
        if (error) {
            // Manejar error de correo duplicado
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'El correo electrónico ya está registrado para otro usuario.' });
            }
            console.error('Error al actualizar el personal:', error);
            return res.status(500).json({ 
                error: 'Error interno del servidor al actualizar el personal.',
                details: error.message 
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                mensaje: `Personal con ID ${id_personal} no encontrado.` 
            });
        }

        res.json({ 
            mensaje: `Personal ID ${id_personal} actualizado correctamente.`,
            filas_afectadas: result.affectedRows 
        });
    });
});

// --- ENDPOINT SEGURO PARA ELIMINAR/ARCHIVAR CUENTA DE CLIENTE (CON DEPURACIÓN) ---
app.delete('/api/clientes/eliminar-cuenta', (req, res) => {
    // El body contiene el id, correo y contraseña para la verificación
    const { id_cliente, correo, contrasena } = req.body;

    // 1. DEPURACIÓN: Mostrar el Body recibido
    console.log(`\n[LOG-DEPURACIÓN] Solicitud DELETE /api/clientes/eliminar-cuenta recibida.`);
    console.log(`[LOG-DEPURACIÓN] ID Cliente recibido: ${id_cliente}`);
    console.log(`[LOG-DEPURACIÓN] Correo recibido: ${correo}`);
    // NO mostramos la contraseña por seguridad.
    
    if (!id_cliente || !correo || !contrasena) {
        return res.status(400).json({ error: 'Faltan datos de verificación (ID, correo o contraseña).' });
    }

    console.log(`\n[LOG] Intento de eliminación de cuenta para ID: ${id_cliente}`);

    // Paso 1: Verificar las credenciales del cliente antes de la eliminación
    const sqlVerify = `
        SELECT contrasena FROM Clientes WHERE id_cliente = ? AND correo = ?
    `;

    // 2. DEPURACIÓN: Mostrar la consulta de verificación
    console.log(`[LOG-DEPURACIÓN] Consulta de Verificación SQL: ${sqlVerify.trim().replace(/\s+/g, ' ')}`);
    console.log(`[LOG-DEPURACIÓN] Parámetros de Verificación: [${id_cliente}, ${correo}]`);
    

    pool.query(sqlVerify, [id_cliente, correo], (err, results) => {
        if (err) {
            console.error(' [ERROR-DB] Error al verificar credenciales para eliminación:', err);
            return res.status(500).json({ error: 'Error interno del servidor.' });
        }
        
        // 3. DEPURACIÓN: Mostrar el resultado de la verificación
        console.log(`[LOG-DEPURACIÓN] Resultados de la Verificación (Filas encontradas): ${results.length}`);
        
        if (results.length === 0) {
            // Este error puede significar que el ID o el Correo ingresado no están en la BD.
            return res.status(401).json({ error: 'Correo o ID de cliente no coinciden.' });
        }

        const storedPassword = results[0].contrasena;

        // Paso 2: Comparar la contraseña proporcionada con la almacenada (hasheada)
        bcrypt.compare(contrasena, storedPassword, (compareErr, match) => {
            if (compareErr) {
                console.error(' [ERROR] Error al comparar contraseñas para eliminación:', compareErr);
                return res.status(500).json({ error: 'Error del servidor al verificar credenciales.' });
            }

            if (!match) {
                 // Fallback (solo si aún tienes contraseñas sin hashear)
                 if (storedPassword === contrasena) {
                     console.warn(` [WARN] Eliminación en modo INSEGURO para ID: ${id_cliente} (Contraseña sin hashear).`);
                 } else {
                    console.log(`Eliminación fallida: Contraseña incorrecta para ID: ${id_cliente}`);
                    return res.status(401).json({ error: 'La contraseña proporcionada es incorrecta.' });
                 }
            }
            
            // Paso 3: Las credenciales son correctas. Proceder a la eliminación (archivado)
            
            const sqlDelete = 'DELETE FROM Clientes WHERE id_cliente = ?';
            
            // 4. DEPURACIÓN: Mostrar la consulta de eliminación
            console.log(`[LOG-DEPURACIÓN] Consulta de Eliminación SQL: ${sqlDelete}`);
            console.log(`[LOG-DEPURACIÓN] Parámetro de Eliminación: [${id_cliente}]`);
            
            pool.query(sqlDelete, [id_cliente], (deleteErr, deleteResult) => {
                if (deleteErr) {
                    console.error(' [ERROR-DB] Error al eliminar (archivar) cliente:', deleteErr);
                    return res.status(500).json({ error: 'Error interno al intentar eliminar la cuenta.' });
                }

                // 5. DEPURACIÓN: Mostrar el resultado de la eliminación
                console.log(`[LOG-DEPURACIÓN] Filas afectadas por DELETE: ${deleteResult.affectedRows}`);
                
                if (deleteResult.affectedRows === 0) {
                    // Este es el error "Cliente no encontrado para eliminación (archivado)".
                    // Si llegamos hasta aquí, significa que el cliente existía, pero se eliminó justo antes.
                    return res.status(404).json({ error: 'Cliente no encontrado para eliminación (archivado).' });
                }

                console.log(` [LOG] Cuenta de cliente ID ${id_cliente} eliminada (archivada) exitosamente.`);
                res.status(200).json({ message: 'Cuenta eliminada y archivada exitosamente.' });
            });
        });
    });
});
// admin crear nuevo horario
app.post('/api/horarios', (req, res) => {
    const { 
        id_personal, 
        hora_entrada, 
        hora_salida, 
        hora_descanso_inicio, 
        hora_descanso_fin, 
        dia_descanso 
    } = req.body;

    if (!id_personal || !hora_entrada || !hora_salida) {
        return res.status(400).json({ 
            error: 'Faltan campos obligatorios: id_personal, hora_entrada y hora_salida son requeridos.'
        });
    }

    const sqlQuery = `
        INSERT INTO Horarios (
            id_personal, 
            hora_entrada, 
            hora_salida, 
            hora_descanso_inicio, 
            hora_descanso_fin, 
            dia_descanso
        ) VALUES (?, ?, ?, ?, ?, ?);
    `;

    const values = [
        id_personal,
        hora_entrada,
        hora_salida,
        hora_descanso_inicio || null,
        hora_descanso_fin || null, 
        dia_descanso || null
    ];

    pool.query(sqlQuery, values, (error, result) => {
        if (error) {
            console.error('Error al crear horario:', error);
            if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                 return res.status(404).json({
                    error: `Error de FK: El ID de personal ${id_personal} no existe.`
                });
            }
            return res.status(500).json({ 
                error: 'Error interno del servidor al crear el horario.',
                details: error.message 
            });
        }

        res.status(201).json({ 
            mensaje: `Horario creado correctamente.`,
            id_horario: result.insertId
        });
    });
});
// GET /api/personal/inactivo
// --- NUEVO ENDPOINT PARA LEER PERSONAL INACTIVO ---
app.get('/api/personal/inactivo', (req, res) => {
    console.log(' [LOG] Solicitud para obtener la lista de Personal Inactivo.');

    // Se corrige la consulta: se elimina 'fecha_eliminacion'
    const sqlQuery = `
        SELECT 
            id_personal, nombre, correo, rol, activo
        FROM Personal 
        WHERE activo = 0 
        ORDER BY nombre;
    `;

    pool.query(sqlQuery, (error, results) => {
        if (error) {
            console.error(' [ERROR-DB] Error al obtener personal inactivo:', error);
            return res.status(500).json({ 
                error: 'Error interno del servidor al consultar el personal inactivo.' 
            });
        }
        
        console.log(` [SUCCESS-DB] Encontrados ${results.length} registros de personal inactivo.`);
        
        res.status(200).json({ 
            success: true,
            personal_inactivo: results,
            mensaje: `Se obtuvieron ${results.length} registros de personal inactivo.`
        });
    });
});
// --- INICIAR SERVIDOR ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Prueba la conexión a la DB en: http://localhost:${PORT}/test-db`);
});