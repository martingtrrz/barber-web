import React, { useEffect, useState } from "react";
import { Navbar, Nav, Container } from "react-bootstrap";
import { Link, Outlet, useNavigate } from "react-router-dom";
//import "./navbar.css";
import logo from "../assets/logo.png";

function Ejemplonavbar() {
  const [sesionActiva, setSesionActiva] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const navigate = useNavigate();

  // Función para actualizar el estado de la sesión
  const verificarSesion = () => {
    const usuarioGuardado = localStorage.getItem("usuario");
    if (usuarioGuardado) {
      const user = JSON.parse(usuarioGuardado);
      setSesionActiva(true);
      setUsuario(user);
    } else {
      setSesionActiva(false);
      setUsuario(null);
    }
  };

  // Al montar, verificar sesión y añadir listeners
  useEffect(() => {
    verificarSesion(); // Verificar al cargar
    window.addEventListener("usuario-login", verificarSesion);
    window.addEventListener("usuario-logout", verificarSesion);

    return () => {
      window.removeEventListener("usuario-login", verificarSesion);
      window.removeEventListener("usuario-logout", verificarSesion);
    };
  }, []);

  // Cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem("usuario");
    window.dispatchEvent(new Event("usuario-logout"));
    navigate("/Home");
  };

  // Estilo reutilizable para el botón de emoji 👤
  const profileIconStyle = {
    backgroundColor: "var(--primary-blue, #0E1C36)", // Usar color de CSS global
    color: "white",
    borderRadius: "50%",
    padding: "8px 12px",
    marginLeft: "15px",
    fontSize: "1.3rem",
    border: "2px solid var(--primary-red, #C92B2C)" // Borde rojo
  };

  return (
    <>
      <Navbar className="navBg" expand="lg" sticky="top"> {/* Añadido sticky='top' */}
        <Container>
          <Navbar.Brand as={Link} to="/Home">
            <img src={logo} alt="Logo Barber" className="logo" />
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav" className="collapseNav">
            <Nav className="menu">
              <Nav.Link as={Link} to="/Home">Inicio</Nav.Link>
              <Nav.Link as={Link} to="/Servicios">Servicios</Nav.Link>
              <Nav.Link as={Link} to="/Contacto">Contacto</Nav.Link>

              {/* Botón Agendar (va a Login si no hay sesión, o a Reservar si es Cliente) */}
              {(!sesionActiva || usuario?.tipo === "Cliente") && (
                <Nav.Link 
                  as={Link} 
                  to={sesionActiva ? "/Reservar" : "/Login"} 
                  className="nav-agendar"
                >
                  Agendar
                </Nav.Link>
              )}
            </Nav>

            {/* --- LÓGICA DE PERFIL/SESIÓN MEJORADA --- */}
            <Nav className="d-flex align-items-center">

              {/* 1. Saludo (Nombre) */}
              {sesionActiva && usuario && (
                <div style={{ color: "white", marginRight: "15px", fontSize: "0.9rem", fontWeight: "bold" }}>
                  {usuario.nombre}
                </div>
              )}

              {/* 2. Botón 👤 (Login o Perfil de Cliente) */}
              {!sesionActiva ? (
                // Sin sesión: El 👤 va a /Login
                <Nav.Link as={Link} to="/login" style={profileIconStyle} title="Iniciar Sesión">
                  👤
                </Nav.Link>
              ) : usuario.tipo === 'Cliente' ? (
                // Es Cliente: El 👤 va a /Perfil (su nueva página)
                <Nav.Link 
                  as={Link} 
                  to="/Perfil" // <-- ¡CAMBIO IMPORTANTE AQUÍ!
                  style={profileIconStyle} 
                  title="Ver mi perfil"
                >
                  👤
                </Nav.Link>
              ) : (
                // Es Personal: No mostramos el ícono 👤 (ellos tienen su propio dashboard)
                null 
              )}

              {/* 3. Botón Logout (si hay sesión y NO es cliente) */}
              {/* El cliente ahora cierra sesión desde su /Perfil */}
              {sesionActiva && usuario.tipo !== 'Cliente' && (
                <button
                  onClick={handleLogout}
                  className="btn-borrar" // Usar clase de styles.css
                  style={{
                    padding: "8px 15px",
                    marginLeft: "15px",
                  }}
                >
                  Cerrar sesión
                </button>
              )}

            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* El 'Outlet' renderizará Home, Servicios, Perfil, Citas, etc. */}
      <section> {/* Quitado p-3 para que los contenedores decidan su padding */}
        <Outlet />
      </section>
    </>
  );
}

export default Ejemplonavbar;