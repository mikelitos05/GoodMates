import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-grid">
                    <div className="footer-brand">
                        <div className="footer-logo">
                            <img src="/GoodMatesIcon.png" alt="GoodMates" className="logo-img" />
                            <span className="logo-text">Good<span className="logo-accent">Mates</span></span>
                        </div>
                        <p className="footer-tagline">
                            Encuentra tu roommate ideal y vive la mejor experiencia de convivencia.
                        </p>
                    </div>

                    <div className="footer-column">
                        <h4 className="footer-heading">Plataforma</h4>
                        <Link to="/tenant/properties" className="footer-link">Buscar Propiedades</Link>
                        <Link to="/register" className="footer-link">Registrarse</Link>
                        <Link to="/login" className="footer-link">Iniciar Sesión</Link>
                    </div>

                    <div className="footer-column">
                        <h4 className="footer-heading">Herramientas</h4>
                        <Link to="/roommate/tasks" className="footer-link">Task Manager</Link>
                        <Link to="/roommate/board" className="footer-link">Mates Board</Link>
                        <Link to="/tenant/matches" className="footer-link">Compatibilidad</Link>
                    </div>

                    <div className="footer-column">
                        <h4 className="footer-heading">Soporte</h4>
                        <span className="footer-link">Términos y Condiciones</span>
                        <span className="footer-link">Privacidad</span>
                        <span className="footer-link">Contacto</span>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p className="footer-copyright">
                        © 2026 GoodMates. Todos los derechos reservados.
                    </p>
                    <p className="footer-disclaimer">
                        GoodMates es una plataforma tecnológica intermediaria. No participa en procesos legales, contractuales o financieros.
                    </p>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
