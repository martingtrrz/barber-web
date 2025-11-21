import React, { useState, useEffect, useCallback } from 'react';
// import "./citasdeldia.css"; // YA NO ES NECESARIO, usamos styles.css global

const API_CITAS_DIA = "http://localhost:3001/api/citas/personal/citas-del-dia";
const API_UPDATE_ESTADO = "http://localhost:3001/api/citas/estado";

function CitasDelDia({ usuario }) {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [updating, setUpdating] = useState(null);

  const esAdmin = usuario.rol === 'ADMIN';

  const fetchCitas = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    let bodyPayload = {
      fecha: fecha
    };

    if (!esAdmin) {
      bodyPayload.id_personal = usuario.id;
    }

    try {
      const response = await fetch(API_CITAS_DIA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const result = await response.json();
      setCitas(result.data || []);
      
      if (!result.data || result.data.length === 0) {
        // No es un error técnico, solo informativo
        // setError("No hay citas programadas para esta fecha."); 
      }

    } catch (err) {
      console.error("Error al cargar citas:", err);
      setError('Hubo un problema al cargar las citas.');
    } finally {
      setLoading(false);
    }
  }, [usuario.id, fecha, esAdmin]);

  useEffect(() => {
    fetchCitas();
  }, [fetchCitas]);

  const handleUpdateEstado = async (id_cita, nuevo_estado) => {
    setUpdating(id_cita);
    try {
      const response = await fetch(`${API_UPDATE_ESTADO}/${id_cita}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuevo_estado: nuevo_estado }),
      });

      if (!response.ok) {
        throw new Error('No se pudo actualizar el estado.');
      }

      setCitas(citasActuales => 
        citasActuales.map(cita => 
          cita.id_cita === id_cita ? { ...cita, estado_cita: nuevo_estado } : cita
        )
      );

    } catch (err) {
      console.error("Error al actualizar estado:", err);
      alert(`Error al actualizar: ${err.message}`);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="admin-manager-container">
      <h1>Gestión de Citas</h1>
      <p>
        {esAdmin 
          ? "Visualiza y gestiona la agenda global de la barbería." 
          : "Gestiona tus citas programadas para el día."
        }
      </p>

      {/* --- Filtro de Fecha (Estilo Card) --- */}
      <div className="citas-filtro" style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <label htmlFor="fecha-cita" style={{ fontSize: '1.1rem', color: 'var(--color-azul-profundo)' }}>
                Seleccionar Fecha:
            </label>
            <input 
              type="date" 
              id="fecha-cita"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              style={{ maxWidth: '200px', margin: 0 }} // Override del estilo global de inputs
            />
            <button 
                onClick={fetchCitas} 
                disabled={loading}
                className="btn-editar" // Azul
                style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              {loading ? "🔄..." : "🔍 Buscar"}
            </button>
        </div>
      </div>

      {error && <p className="mensaje-error">{error}</p>}

      {loading && !error && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p>Cargando agenda...</p>
          </div>
      )}

      {!loading && !error && citas.length === 0 && (
          <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              backgroundColor: 'white', 
              borderRadius: '8px', 
              boxShadow: 'var(--shadow-card)',
              color: '#666'
          }}>
              <h3>No hay citas programadas para este día.</h3>
              <p>Intenta seleccionar otra fecha.</p>
          </div>
      )}

      {!loading && citas.length > 0 && (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Cliente</th>
                {esAdmin && <th>Barbero Asignado</th>}
                <th>Servicio</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {citas.map((cita) => (
                <tr key={cita.id_cita} style={{ 
                    backgroundColor: (cita.estado_cita === 'COMPLETADA' || cita.estado_cita === 'CANCELADA') ? '#f9f9f9' : 'white',
                    opacity: (cita.estado_cita === 'CANCELADA') ? 0.6 : 1
                }}>
                  <td style={{ fontWeight: 'bold', color: 'var(--color-azul-profundo)' }}>
                      {cita.hora_de_la_cita}
                  </td>
                  <td>
                      <div style={{ fontWeight: '500' }}>{cita.nombre_cliente}</div>
                      {cita.notas_cita && (
                          <div style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic' }}>
                               "{cita.notas_cita}"
                          </div>
                      )}
                  </td>
                  
                  {esAdmin && (
                      <td>
                          <span style={{ 
                              backgroundColor: '#eef2ff', 
                              color: 'var(--color-azul-acento)', 
                              padding: '4px 8px', 
                              borderRadius: '4px',
                              fontSize: '0.9rem',
                              fontWeight: '500'
                          }}>
                              {cita.nombre_personal || 'Sin asignar'}
                          </span>
                      </td>
                  )}
                  
                  <td>{cita.nombre_servicio}</td>
                  
                  <td>
                    <span className={`estado-badge estado-${cita.estado_cita.toLowerCase()}`}>
                      {cita.estado_cita}
                    </span>
                  </td>
                  
                  <td className="citas-acciones">
                    {(cita.estado_cita === 'PENDIENTE' || cita.estado_cita === 'CONFIRMADA') ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn-guardar" // Verde/Rojo según tu estilo global para éxito
                          style={{ padding: '6px 12px', fontSize: '0.85rem', backgroundColor: 'var(--estado-exito)' }}
                          disabled={updating === cita.id_cita}
                          onClick={() => handleUpdateEstado(cita.id_cita, 'COMPLETADA')}
                          title="Marcar como Completada"
                        >
                          ✅ Completar
                        </button>
                        <button 
                          className="btn-borrar" // Rojo
                          style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                          disabled={updating === cita.id_cita}
                          onClick={() => handleUpdateEstado(cita.id_cita, 'CANCELADA')}
                          title="Cancelar Cita"
                        >
                          🗑️ Cancelar
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: '#999', fontSize: '0.9rem' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default CitasDelDia;