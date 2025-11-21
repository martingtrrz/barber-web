import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from "../config";

const API_REPORTS_URL = `${API_BASE_URL}/reportes/stats`;
// Componente para tarjeta individual
function StatCard({ titulo, valor, subtitulo, colorSubtitulo = '#28a745', icono }) {
  return (
    <div className="stat-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <h3 className="stat-card-title">{titulo}</h3>
        <p className="stat-card-value">{valor}</p>
        {subtitulo && (
          <span className="stat-card-subtitle" style={{ color: colorSubtitulo, fontWeight: '600' }}>
            {subtitulo}
          </span>
        )}
      </div>
      {icono && (
        <div style={{ fontSize: '3rem', opacity: 0.15, color: 'var(--color-azul-profundo)' }}>
          {icono}
        </div>
      )}
    </div>
  );
}

function ReportesManager() {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(API_REPORTS_URL);
                if (!response.ok) {
                    throw new Error('No se pudieron cargar las estadísticas');
                }
                const data = await response.json();
                setStats(data.stats); 
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (isLoading) {
        return (
            <div className="admin-manager-container" style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ fontSize: '1.2rem', color: '#666' }}>⌛ Calculando métricas...</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="admin-manager-container">
                <p className="mensaje-error">{error}</p>
                <button onClick={() => window.location.reload()} className="btn-cancelar">Reintentar</button>
            </div>
        );
    }

    if (!stats) {
        return <div className="admin-manager-container"><p>No hay datos disponibles.</p></div>;
    }

    return (
        <div className="admin-manager-container">
            <h1>Reportes y Métricas</h1>
            <p>Visión general del rendimiento del negocio.</p>
            
            {/* --- SECCIÓN 1: GRID DE TARJETAS --- */}
            {/* No necesita envolverse en .dashboard-card porque ya son tarjetas individuales */}
            <div className="stat-cards-container">
                
                <StatCard 
                    titulo="Ingresos Hoy"
                    valor={`$${parseFloat(stats.ingresosHoy).toFixed(2)}`}
                    subtitulo={`📅 ${stats.citasHoy} citas completadas`}
                    colorSubtitulo="var(--estado-exito)"
                    icono="💰"
                />
                
                <StatCard 
                    titulo="Ingresos Mensuales"
                    valor={`$${parseFloat(stats.ingresosMes).toFixed(2)}`}
                    subtitulo={`📆 ${stats.citasMes} citas este mes`}
                    colorSubtitulo="var(--color-azul-acento)"
                    icono="📈"
                />
                
                <StatCard 
                    titulo="Servicio Top"
                    valor={stats.servicioPopular.nombre_servicio || "N/A"}
                    subtitulo={`🔥 ${stats.servicioPopular.total_citas} solicitudes`}
                    colorSubtitulo="#d4af37"
                    icono="🏆"
                />
                
            </div>
            
           
            </div>
        
    );
}

export default ReportesManager;