import React from 'react';
import { Link } from 'react-router-dom';
import './LegalPages.css';

function PrivacyPage() {
    return (
        <div className="legal-page">
            <div className="container">
                <div className="legal-header animate-fade-in-up">
                    <h1 className="section-title">Aviso de Privacidad</h1>
                    <p className="legal-subtitle">
                        En GoodMates nos comprometemos a proteger tu información personal. Este aviso describe cómo recopilamos, usamos y protegemos tus datos.
                    </p>
                    <span className="legal-last-updated">Última actualización: 25 de febrero de 2026</span>
                </div>

                <div className="legal-content animate-fade-in-up" style={{ animationDelay: '0.1s' }}>

                    <div className="legal-toc">
                        <h2 className="legal-toc-title">Contenido</h2>
                        <ul className="legal-toc-list">
                            <li><a href="#p1"><span className="legal-toc-number">1.</span> Responsable del tratamiento</a></li>
                            <li><a href="#p2"><span className="legal-toc-number">2.</span> Datos que recopilamos</a></li>
                            <li><a href="#p3"><span className="legal-toc-number">3.</span> Finalidad del tratamiento</a></li>
                            <li><a href="#p4"><span className="legal-toc-number">4.</span> Base legal</a></li>
                            <li><a href="#p5"><span className="legal-toc-number">5.</span> Compartición de datos</a></li>
                            <li><a href="#p6"><span className="legal-toc-number">6.</span> Seguridad de los datos</a></li>
                            <li><a href="#p7"><span className="legal-toc-number">7.</span> Derechos ARCO</a></li>
                            <li><a href="#p8"><span className="legal-toc-number">8.</span> Retención de datos</a></li>
                            <li><a href="#p9"><span className="legal-toc-number">9.</span> Cookies y tecnologías</a></li>
                            <li><a href="#p10"><span className="legal-toc-number">10.</span> Cambios al aviso</a></li>
                        </ul>
                    </div>

                    {/* 1 */}
                    <div className="legal-card" id="p1">
                        <div className="legal-card-header">
                            <div className="legal-card-icon">Entidad</div>
                            <div>
                                <h2 className="legal-card-title">1. Responsable del Tratamiento</h2>
                                <p className="legal-card-subtitle">Quién gestiona tus datos</p>
                            </div>
                        </div>
                        <div className="legal-text">
                            <p>
                                <strong>GoodMates</strong> es el responsable del tratamiento de los datos personales recabados a través de esta plataforma, de conformidad con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento.
                            </p>
                            <p>
                                Domicilio para efectos del presente aviso: Monterrey, Nuevo León, México.<br />
                                Correo de contacto: <strong>privacidad@goodmates.mx</strong>
                            </p>
                        </div>
                    </div>

                    {/* 2 */}
                    <div className="legal-card" id="p2">
                        <div className="legal-card-header">
                            <div className="legal-card-icon">Datos</div>
                            <div>
                                <h2 className="legal-card-title">2. Datos Personales que Recopilamos</h2>
                                <p className="legal-card-subtitle">Información que solicitamos</p>
                            </div>
                        </div>
                        <div className="legal-text">
                            <p>Para el funcionamiento de la plataforma, recopilamos las siguientes categorías de datos:</p>

                            <p><strong>Datos de identificación:</strong></p>
                            <ul className="legal-list">
                                <li>Nombre completo (nombre y apellido)</li>
                                <li>Nombre de usuario</li>
                                <li>Correo electrónico</li>
                                <li>Fecha de nacimiento</li>
                                <li>Género</li>
                            </ul>

                            <p><strong>Datos de perfil extendido (Tenants):</strong></p>
                            <ul className="legal-list">
                                <li>Edad, ciudad y presupuesto mensual</li>
                                <li>Universidad, carrera y semestre</li>
                                <li>Preferencias de convivencia (horario, limpieza, ruido, visitantes)</li>
                                <li>Hábitos personales (mascotas, fumar)</li>
                                <li>Hobbies e intereses</li>
                                <li>Biografía personal</li>
                            </ul>

                            <p><strong>Datos de uso:</strong></p>
                            <ul className="legal-list">
                                <li>Historial de matches y compatibilidad</li>
                                <li>Calificaciones otorgadas y recibidas</li>
                                <li>Publicaciones en el Mates Board</li>
                                <li>Tareas creadas y completadas</li>
                            </ul>

                            <div className="legal-highlight">
                                <p>
                                    <strong>Datos sensibles:</strong> GoodMates no recopila datos sensibles como orientación sexual, religión, estado de salud ni información financiera (números de tarjeta, cuentas bancarias).
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 3 */}
                    <div className="legal-card" id="p3">
                        <div className="legal-card-header">
                            <div className="legal-card-icon">Finalidad</div>
                            <div>
                                <h2 className="legal-card-title">3. Finalidad del Tratamiento</h2>
                                <p className="legal-card-subtitle">Para qué usamos tus datos</p>
                            </div>
                        </div>
                        <div className="legal-text">
                            <p>Los datos personales recopilados serán utilizados para las siguientes finalidades:</p>

                            <p><strong>Finalidades primarias (necesarias para el servicio):</strong></p>
                            <ul className="legal-list">
                                <li>Creación y gestión de tu cuenta de usuario.</li>
                                <li>Autenticación y seguridad de acceso a la plataforma.</li>
                                <li>Cálculo del Índice de Compatibilidad entre usuarios Tenants.</li>
                                <li>Generación de matches con roommates potenciales.</li>
                                <li>Funcionamiento de las herramientas de convivencia (Task Manager, Mates Board).</li>
                                <li>Sistema de calificaciones y reputación entre usuarios.</li>
                                <li>Publicación y búsqueda de propiedades disponibles.</li>
                            </ul>

                            <p><strong>Finalidades secundarias (opcionales):</strong></p>
                            <ul className="legal-list">
                                <li>Envío de notificaciones sobre actividad relevante en la plataforma.</li>
                                <li>Mejora continua del algoritmo de compatibilidad.</li>
                                <li>Generación de estadísticas anónimas de uso.</li>
                            </ul>
                        </div>
                    </div>

                    {/* 4 */}
                    <div className="legal-card" id="p4">
                        <div className="legal-card-header">
                            <div className="legal-card-icon">Base legal</div>
                            <div>
                                <h2 className="legal-card-title">4. Base Legal del Tratamiento</h2>
                                <p className="legal-card-subtitle">Fundamento jurídico</p>
                            </div>
                        </div>
                        <div className="legal-text">
                            <p>
                                El tratamiento de tus datos personales se fundamenta en el <strong>consentimiento</strong> que otorgas al aceptar estos términos durante el registro en la plataforma, así como en la <strong>necesidad contractual</strong> para la prestación del servicio.
                            </p>
                            <p>
                                El marco legal aplicable incluye la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y demás normativas vigentes en materia de protección de datos en México.
                            </p>
                        </div>
                    </div>

                    {/* 5 */}
                    <div className="legal-card" id="p5">
                        <div className="legal-card-header">
                            <div className="legal-card-icon">Uso</div>
                            <div>
                                <h2 className="legal-card-title">5. Compartición de Datos</h2>
                                <p className="legal-card-subtitle">Con quién compartimos tu información</p>
                            </div>
                        </div>
                        <div className="legal-text">
                            <p>GoodMates <strong>no vende, alquila ni comparte</strong> tus datos personales con terceros con fines comerciales.</p>

                            <p>Tu información únicamente podrá ser compartida en los siguientes casos:</p>
                            <ul className="legal-list">
                                <li><strong>Entre usuarios de la plataforma:</strong> Información limitada de tu perfil será visible para otros usuarios cuando se genere un match o dentro de tu grupo de roommates (nombre, avatar, preferencias de convivencia).</li>
                                <li><strong>Obligaciones legales:</strong> Cuando sea requerido por autoridades competentes mediante orden judicial o solicitud formal.</li>
                                <li><strong>Protección de derechos:</strong> Para proteger los derechos, propiedad o seguridad de GoodMates, sus usuarios u otros.</li>
                            </ul>

                            <div className="legal-highlight">
                                <p>
                                    <strong>Privacidad de perfiles:</strong> La información detallada contenida en los perfiles de los Tenants se mantiene privada y protegida. Solo se comparte información esencial para el funcionamiento del sistema de compatibilidad y las herramientas de convivencia.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 6 */}
                    <div className="legal-card" id="p6">
                        <div className="legal-card-header">
                            <div className="legal-card-icon">Seguridad</div>
                            <div>
                                <h2 className="legal-card-title">6. Seguridad de los Datos</h2>
                                <p className="legal-card-subtitle">Medidas de protección implementadas</p>
                            </div>
                        </div>
                        <div className="legal-text">
                            <p>GoodMates implementa medidas de seguridad técnicas, administrativas y físicas para proteger tus datos personales, incluyendo:</p>
                            <ul className="legal-list">
                                <li><strong>Cifrado de contraseñas:</strong> Las contraseñas se almacenan de forma segura mediante el algoritmo bcrypt con salt, imposibilitando su lectura.</li>
                                <li><strong>Autenticación JWT:</strong> Las sesiones de usuario están protegidas mediante JSON Web Tokens con expiración automática.</li>
                                <li><strong>Control de acceso:</strong> Middleware de autorización que verifica permisos y roles para cada operación.</li>
                                <li><strong>Validación de datos:</strong> Sanitización y validación de toda información recibida antes de su procesamiento.</li>
                                <li><strong>Comunicaciones seguras:</strong> Se recomienda el uso de HTTPS para cifrar la comunicación entre el navegador y el servidor.</li>
                            </ul>
                        </div>
                    </div>

                    {/* 7 */}
                    <div className="legal-card" id="p7">
                        <div className="legal-card-header">
                            <div className="legal-card-icon">ARCO</div>
                            <div>
                                <h2 className="legal-card-title">7. Derechos ARCO</h2>
                                <p className="legal-card-subtitle">Acceso, Rectificación, Cancelación y Oposición</p>
                            </div>
                        </div>
                        <div className="legal-text">
                            <p>Como titular de tus datos personales, tienes derecho a:</p>
                            <ul className="legal-list">
                                <li><strong>Acceder</strong> a tus datos personales que poseemos y conocer los detalles de su tratamiento.</li>
                                <li><strong>Rectificar</strong> tus datos cuando sean inexactos o estén incompletos a través de la edición de tu perfil.</li>
                                <li><strong>Cancelar</strong> tus datos cuando consideres que no son necesarios para los fines de la plataforma.</li>
                                <li><strong>Oponerte</strong> al tratamiento de tus datos para finalidades específicas.</li>
                            </ul>
                            <p>
                                Para ejercer tus derechos ARCO, envía una solicitud a <strong>privacidad@goodmates.mx</strong> incluyendo tu nombre completo, correo electrónico registrado y una descripción clara del derecho que deseas ejercer. El plazo de respuesta es de 20 días hábiles.
                            </p>
                        </div>
                    </div>

                    {/* 8 */}
                    <div className="legal-card" id="p8">
                        <div className="legal-card-header">
                            <div className="legal-card-icon">Tiempo</div>
                            <div>
                                <h2 className="legal-card-title">8. Retención de Datos</h2>
                                <p className="legal-card-subtitle">Período de almacenamiento</p>
                            </div>
                        </div>
                        <div className="legal-text">
                            <p>
                                Tus datos personales serán conservados mientras tu cuenta esté activa y sean necesarios para la prestación del servicio.
                            </p>
                            <ul className="legal-list">
                                <li>Al solicitar la baja de tu cuenta, tus datos serán eliminados en un plazo máximo de 30 días.</li>
                                <li>Ciertos datos podrán conservarse de forma anónima con fines estadísticos.</li>
                                <li>Los datos de calificaciones y reputación podrán retenerse de forma anonimizada para mantener la integridad del sistema de calificaciones.</li>
                            </ul>
                        </div>
                    </div>

                    {/* 9 */}
                    <div className="legal-card" id="p9">
                        <div className="legal-card-header">
                            <div className="legal-card-icon">Cookies</div>
                            <div>
                                <h2 className="legal-card-title">9. Cookies y Tecnologías de Rastreo</h2>
                                <p className="legal-card-subtitle">Uso de almacenamiento local</p>
                            </div>
                        </div>
                        <div className="legal-text">
                            <p>
                                GoodMates utiliza <strong>localStorage</strong> del navegador para almacenar tu token de autenticación (JWT), lo cual permite mantener tu sesión activa entre visitas.
                            </p>
                            <p>
                                La plataforma no utiliza cookies de seguimiento de terceros ni tecnologías de rastreo con fines publicitarios.
                            </p>
                        </div>
                    </div>

                    {/* 10 */}
                    <div className="legal-card" id="p10">
                        <div className="legal-card-header">
                            <div className="legal-card-icon">Avisos</div>
                            <div>
                                <h2 className="legal-card-title">10. Cambios al Aviso de Privacidad</h2>
                                <p className="legal-card-subtitle">Actualizaciones futuras</p>
                            </div>
                        </div>
                        <div className="legal-text">
                            <p>
                                GoodMates se reserva el derecho de actualizar este Aviso de Privacidad para reflejar cambios en nuestras prácticas de tratamiento de datos o en las disposiciones legales aplicables.
                            </p>
                            <p>
                                Las actualizaciones serán publicadas en esta página con la nueva fecha de última actualización. Se recomienda revisar periódicamente este aviso.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="legal-nav animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                    <Link to="/terminos" className="legal-nav-link">Términos y Condiciones</Link>
                    <Link to="/privacidad" className="legal-nav-link active">Aviso de Privacidad</Link>
                    <Link to="/contacto" className="legal-nav-link">Contacto</Link>
                </div>
            </div>
        </div>
    );
}

export default PrivacyPage;
