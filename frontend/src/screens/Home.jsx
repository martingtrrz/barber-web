import React from "react";
import { Button, Container } from "react-bootstrap";
//import "./home.css";
import { useNavigate } from "react-router-dom"; // 1. Importar el hook

// 2. Quitar la prop 'navigation'
function Home() {
  const navigate = useNavigate(); // 3. Inicializar el hook

  // 4. Lógica para el botón, igual a la del Navbar
  const handleReserveClick = () => {
    const usuarioGuardado = localStorage.getItem("usuario");
    let isCliente = false;
    
    if (usuarioGuardado) {
      try {
        const user = JSON.parse(usuarioGuardado);
        if (user.tipo === "Cliente") {
          isCliente = true;
        }
      } catch (e) {
        // Si hay un error en JSON, se trata como si no estuviera logueado
        localStorage.removeItem("usuario");
      }
    }

    // 5. Redirigir según el estado de sesión
    if (isCliente) {
      navigate("/Reservar"); // Si es cliente, va a reservar
    } else {
      navigate("/Login"); // Si no es cliente (o no hay sesión), va a login
    }
  };

  return (
    <section className="home-section">
      <Container className="text-center">
        <h1 className="home-title">The Barber Stop</h1>
        <h3 className="home-subtitle">Tradición y Estilo Desde 2020</h3>
        <Button
          className="home-button"
          size="lg"
          onClick={handleReserveClick} // 6. Usar el nuevo manejador
        >
          Reserva tu lugar ahora
        </Button>
      </Container>
    </section>
  );
}

export default Home;