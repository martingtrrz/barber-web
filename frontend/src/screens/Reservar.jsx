import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
//import "./reservar.css";

const API_BASE_URL = "http://localhost:3001/api";

function Reservar() {
    const navigate = useNavigate();
    const [usuario, setUsuario] = useState(null);
    
    // 1. Verificar sesión y obtener ID de cliente
    useEffect(() => {
        const usuarioGuardado = localStorage.getItem("usuario");
        if (!usuarioGuardado) {
            console.error("Redirigiendo a login: No hay sesión.");
            navigate("/login");
            return;
        }
        const user = JSON.parse(usuarioGuardado);
        if (user.tipo === 'Personal') {
            console.error("Redirigiendo a inicio: Personal no puede reservar.");
            navigate("/");
            return;
        }
        setUsuario(user);
        // Establecer el ID de cliente real en el formulario
        setFormData(prev => ({ ...prev, id_cliente: user.id }));
    }, [navigate]);
    
    // --- Estados del Formulario ---
    const [servicios, setServicios] = useState([]);
    const [trabajadores, setTrabajadores] = useState([]);
    const [formData, setFormData] = useState({
        id_cliente: '', // Se llena desde el useEffect
        id_servicio: '',
        id_trabajador: '',
        fecha: '',
        hora_inicio: '',
        notas: '',
    });

    // --- ESTADOS NUEVOS PARA LA FUNCIÓN REQUERIDA ---
    // Almacena el día de la semana que descansa el trabajador seleccionado (Ej: 'Jueves')
    const [diaDescansoTrabajador, setDiaDescansoTrabajador] = useState(null); 
    // Mantiene un error específico para el día de descanso
    const [errorDiaDescanso, setErrorDiaDescanso] = useState(null);

    // --- Estados de UI y Horarios ---
    const [isLoading, setIsLoading] = useState(true); // Carga inicial
    const [isSubmitting, setIsSubmitting] = useState(false); // Envío de formulario
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // --- 2. LÓGICA DE HORARIOS DISPONIBLES ---
    const [isFetchingHorarios, setIsFetchingHorarios] = useState(false);
    const [horariosDisponibles, setHorariosDisponibles] = useState([]); // El backend nos dará esta lista
    
    // --- 3. Cargar Servicios y Trabajadores (Datos iniciales) ---
    useEffect(() => {
        const fetchDatosIniciales = async () => {
            if (!usuario) return; 

            setIsLoading(true);
            try {
                // Hacemos las llamadas en paralelo
                const [serviciosRes, trabajadoresRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/servicios`),
                    fetch(`${API_BASE_URL}/trabajadores`)
                ]);
                const serviciosData = await serviciosRes.json();
                const trabajadoresData = await trabajadoresRes.json();

                if (serviciosRes.ok && serviciosData.servicios.length > 0) {
                    setServicios(serviciosData.servicios);
                } else { 
                    setError("No se encontraron servicios."); 
                }

                if (trabajadoresRes.ok && trabajadoresData.trabajadores.length > 0) {
                    setTrabajadores(trabajadoresData.trabajadores);
                } else { 
                    setError(prev => prev ? prev + " Y no se encontraron trabajadores." : "No se encontraron trabajadores."); 
                }

            } catch (err) {
                setError("No se pudo conectar al servidor para cargar datos.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchDatosIniciales(); 
    }, [usuario]); 

    // --- 4. NUEVA LÓGICA: OBTENER DÍA DE DESCANSO AL SELECCIONAR TRABAJADOR ---
    useEffect(() => {
        const fetchDiaDescanso = async () => {
            const id_trabajador = formData.id_trabajador;
            if (id_trabajador) {
                try {
                    // Llamada al NUEVO endpoint para obtener solo el día de descanso
                    const response = await fetch(`${API_BASE_URL}/trabajador/${id_trabajador}/dia-descanso`);
                    const data = await response.json();

                    if (response.ok && data.dia_descanso) {
                        setDiaDescansoTrabajador(data.dia_descanso);
                    } else {
                        // En caso de error, asumimos que siempre trabaja, pero limpiamos por precaución
                        console.error("No se pudo obtener el día de descanso, asumiendo sin restricción.");
                        setDiaDescansoTrabajador(null);
                    }
                } catch (err) {
                    console.error("Error de red al obtener día de descanso:", err);
                    setDiaDescansoTrabajador(null);
                }
            } else {
                // Si no hay trabajador seleccionado, resetear el día de descanso
                setDiaDescansoTrabajador(null);
            }
            // Limpiar el error de descanso si cambiamos de trabajador
            setErrorDiaDescanso(null);
        };
        fetchDiaDescanso();
    }, [formData.id_trabajador]); // Se activa al cambiar el trabajador

    // --- 5. LÓGICA DE ACTUALIZACIÓN DE HORARIOS ---
    // Se activa cuando cambia el servicio, el trabajador o la fecha
    useEffect(() => {
        const fetchHorariosDisponibles = async () => {
            // No buscar si la fecha es un día de descanso (ya validado en handleChange)
            if (errorDiaDescanso) {
                setHorariosDisponibles([]); 
                return;
            }

            if (formData.fecha && formData.id_trabajador && formData.id_servicio) {
                
                // 1. Encontrar la duración del servicio seleccionado
                const idServicioInt = parseInt(formData.id_servicio);
                const selectedService = servicios.find(s => s.id_servicio === idServicioInt); 
                
                if (!selectedService) { return; }
                const duracion = selectedService.duracion_minutos;

                setIsFetchingHorarios(true);
                setHorariosDisponibles([]); 
                setError(null); 
                
                try {
                    // 2. Llamar al endpoint de horarios disponibles
                    const response = await fetch(`${API_BASE_URL}/citas/horarios-disponibles`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id_trabajador: parseInt(formData.id_trabajador),
                            fecha: formData.fecha,
                            duracion: parseInt(duracion) 
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        setHorariosDisponibles(data.horariosDisponibles || []);
                        if ((data.horariosDisponibles || []).length === 0) {
                            // Usamos data.error si viene del backend (ej: "El trabajador descansa el Jueves.")
                            // Si no, usamos el mensaje genérico.
                            setError(data.error || "No hay horarios disponibles para este servicio/día. Prueba otro día o barbero.");
                        }
                    } else {
                        setError(data.error || "No se pudo verificar la disponibilidad horaria.");
                    }
                } catch (err) {
                    setError("Error de red al verificar horarios.");
                } finally {
                    setIsFetchingHorarios(false);
                }
            }
        };
        
        fetchHorariosDisponibles();
    }, [formData.fecha, formData.id_trabajador, formData.id_servicio, servicios, errorDiaDescanso]); // Depende del nuevo estado de error

    // Función Helper para obtener el nombre del día de la semana (Español)
    const getDayName = (dateString) => {
        const date = new Date(dateString + 'T00:00:00'); 
        const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return dias[date.getDay()];
    };

    // Manejar cambios en los inputs/selects (Modificado para validar la fecha)
    const handleChange = (e) => {
        const { name, value } = e.target;
        
        setError(null); 
        setSuccess(null);
        setErrorDiaDescanso(null); // Limpiar error de descanso al cambiar cualquier cosa
        
        // 1. Lógica de validación de FECHA
        if (name === 'fecha' && diaDescansoTrabajador && value) {
            const diaSeleccionado = getDayName(value);
            
            if (diaSeleccionado === diaDescansoTrabajador) {
                const mensaje = `El ${diaDescansoTrabajador} es el día de descanso de este trabajador. Por favor, selecciona otra fecha.`;
                setErrorDiaDescanso(mensaje); // Almacena el error
                setFormData(prev => ({ ...prev, [name]: value, hora_inicio: '' })); // Guarda la fecha pero limpia la hora
                setHorariosDisponibles([]); // Limpia la lista de horarios
                return; // Detiene el flujo para que no se busquen horarios.
            }
        }

        // 2. Flujo normal de cambio de formulario
        setFormData(prev => ({ ...prev, [name]: value }));

        // 3. Resetear hora si cambia algo que afecta la disponibilidad
        if (name === 'fecha' || name === 'id_trabajador' || name === 'id_servicio') {
            setFormData(prev => ({ ...prev, hora_inicio: '' }));
            setHorariosDisponibles([]); 
        }
    };

    // --- 6. Enviar la Cita (handleSubmit) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        // Verificar si existe el error de día de descanso antes de enviar
        if (errorDiaDescanso) {
            setError(errorDiaDescanso);
            return;
        }

        setError(null);
        setSuccess(null);
        setIsSubmitting(true);

        const dataToSend = { 
            ...formData,
            id_cliente: parseInt(formData.id_cliente),
            id_servicio: parseInt(formData.id_servicio),
            id_trabajador: parseInt(formData.id_trabajador),
        };
        
        try {
            const response = await fetch(`${API_BASE_URL}/citas/agendar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend),
            });
            const data = await response.json();

            if (response.ok) {
                setSuccess(`Cita agendada con éxito!`);
                setTimeout(() => navigate("/Citas"), 2500);
            } else {
                setError(data.error || "Error al agendar la cita.");
                setIsSubmitting(false);
            }
        } catch (err) {
            setError("No se pudo conectar al servidor para agendar la cita.");
            setIsSubmitting(false);
        }
    };
    
    // --- Renderizado ---
    if (!usuario) return <div className="agendar-container"><p>Verificando sesión...</p></div>;
    if (isLoading) return <div className="agendar-container"><p>Cargando servicios y personal...</p></div>;
    if (error && servicios.length === 0) {
        return <div className="agendar-container"><p className="error-message">Error: {error}</p></div>;
    }

    return (
        <div className="agendar-container">
            <h1 className="agendar-title">Agendar Cita</h1>
            <p className="agendar-subtitle">Cliente: <strong>{usuario.nombre}</strong></p>
            
            <form onSubmit={handleSubmit} className="agendar-form">
                
                {/* Muestra error de horario general o error de día de descanso */}
                {(error || errorDiaDescanso) && !success && <p className="error-message">{error || errorDiaDescanso}</p>}
                {success && <p className="success-message">{success}</p>}
                
                <input type="hidden" name="id_cliente" value={formData.id_cliente} />

                {/* 1. SELECCIÓN DE SERVICIO */}
                <label htmlFor="id_servicio">Servicio:</label>
                <select 
                    name="id_servicio" 
                    id="id_servicio" 
                    value={formData.id_servicio} 
                    onChange={handleChange} 
                    required
                >
                    <option value="" disabled>1. Selecciona un servicio</option>
                    {servicios.map(s => (
                        <option key={s.id_servicio} value={s.id_servicio}>
                            {s.nombre} ({s.duracion_minutos} min - ${s.precio})
                        </option>
                    ))}
                </select>

                {/* 2. SELECCIÓN DE TRABAJADOR */}
                <label htmlFor="id_trabajador">Barbero/Estilista (Descansa: {diaDescansoTrabajador || 'N/A'}):</label>
                <select 
                    name="id_trabajador" 
                    id="id_trabajador" 
                    value={formData.id_trabajador} 
                    onChange={handleChange} 
                    required
                >
                    <option value="" disabled>2. Selecciona un barbero</option>
                    {trabajadores.map(t => (
                        <option key={t.id_personal} value={t.id_personal}>
                            {t.nombre}
                        </option>
                    ))}
                </select>

                {/* 3. SELECCIÓN DE FECHA */}
                <label htmlFor="fecha">Fecha:</label>
                <input 
                    type="date" 
                    name="fecha" 
                    id="fecha" 
                    value={formData.fecha} 
                    onChange={handleChange} 
                    required 
                    min={new Date().toISOString().split('T')[0]} 
                    disabled={!formData.id_servicio || !formData.id_trabajador}
                    style={{ 
                        // Destacar visualmente si hay un error de día de descanso
                        borderColor: errorDiaDescanso ? 'red' : undefined,
                        borderWidth: errorDiaDescanso ? '2px' : undefined
                    }}
                />
                
                {/* 4. SELECCIÓN DE HORA (SELECT DINÁMICO) */}
                <label htmlFor="hora_inicio">Hora de Inicio:</label>
                <select 
                    name="hora_inicio" 
                    id="hora_inicio" 
                    value={formData.hora_inicio} 
                    onChange={handleChange} 
                    required
                    disabled={isFetchingHorarios || !formData.fecha || !!errorDiaDescanso} 
                >
                    <option value="" disabled>
                        {isFetchingHorarios 
                            ? "Buscando horarios..." 
                            : (formData.fecha 
                                ? (errorDiaDescanso ? "Día de descanso. Elige otra fecha." : "4. Selecciona una hora") 
                                : "Elige una fecha primero")
                        }
                    </option>
                    
                    {/* Renderizar solo si no está buscando Y hay horarios */}
                    {!isFetchingHorarios && horariosDisponibles.length > 0 && (
                        horariosDisponibles.map(hora => (
                            <option key={hora} value={hora}>
                                {hora}
                            </option>
                        ))
                    )}
                </select>

                {/* 5. NOTAS ADICIONALES */}
                <label htmlFor="notas">Notas (Opcional):</label>
                <textarea 
                    name="notas" 
                    id="notas" 
                    value={formData.notas} 
                    onChange={handleChange} 
                    maxLength="255" 
                />

                {/* 6. BOTÓN DE ENVÍO */}
                <button 
                    type="submit" 
                    className="agendar-btn" 
                    // Deshabilitado si hay error de descanso, se está enviando, está buscando, etc.
                    disabled={isSubmitting || isFetchingHorarios || !!success || !formData.hora_inicio || !!errorDiaDescanso} 
                >
                    {isSubmitting ? 'Agendando...' : 'Confirmar Cita'}
                </button>
            </form>
        </div>
    );
}

export default Reservar;