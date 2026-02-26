import React from 'react';
import { Link } from 'react-router-dom';
import './LegalPages.css';

function TermsPage() {
    return (
        <div className="legal-page">
            <div className="container">
                <div className="legal-header animate-fade-in-up">
                    <h1 className="section-title">Términos y Condiciones</h1>
                    <p className="legal-subtitle">
                        Al utilizar GoodMates, aceptas los siguientes términos y condiciones que regulan el uso de nuestra plataforma.
                    </p>
                    <span className="legal-last-updated">Última actualización: 25 de febrero de 2026</span>
                </div>

                {/* Tabla de contenido */}
                <div className="legal-content animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="legal-toc">
                        <h2 className="legal-toc-title">Contenido</h2>
                        <ul className="legal-toc-list">
                            <li><a href="#t1"><span className="legal-toc-number">1.</span> Naturaleza de la plataforma</a></li>
                            <li><a href="#t2"><span className="legal-toc-number">2.</span> Registro y cuentas</a></li>
                            <li><a href="#t3"><span className="legal-toc-number">3.</span> Uso aceptable</a></li>
                            <li><a href="#t4"><span className="legal-toc-number">4.</span> Publicaciones y propiedades</a></li>
                            <li><a href="#t5"><span className="legal-toc-number">5.</span> Compatibilidad y matches</a></li>
                            <li><a href="#t6"><span className="legal-toc-number">6.</span> Limitación de responsabilidad</a></li>
                            <li><a href="#t7"><span className="legal-toc-number">7.</span> Propiedad intelectual</a></li>
                            <li><a href="#t8"><span className="legal-toc-number">8.</span> Resolución de conflictos</a></li>
                            <li><a href="#t9"><span className="legal-toc-number">9.</span> Modificaciones</a></li>
                            <li><a href="#t10"><span className="legal-toc-number">10.</span> Contacto</a></li>
                        </ul>
                    </div>

                    {/* 1 */}
                    <div className="legal-card" id="t1">
                        <div className="legal-card-header">
                            <div className="legal-card-icon">§</div>
                            <div>
                                <h2 className="legal-card-title">1. Naturaleza de la Plataforma</h2>
                                <p className="legal-card-subtitle">Rol y alcance de GoodMates</p>
                            </div>
                        </div>
                        <div className="legal-text">
                            <p>
                                GoodMates es una <strong>plataforma tecnológica intermediaria</strong> diseñada para facilitar la búsqueda de roommates y propiedades compartidas.
                                La plataforma actúa exclusivamente como un canal de conexión entre usuarios y <strong>no participa</strong> en procesos legales, contractuales o financieros derivados de los acuerdos entre usuarios.
                            </p>
                            <div className="legal-highlight">
                                <p>
                                    <strong>Importante:</strong> GoodMates no es una inmobiliaria, agencia de bienes raíces, ni proveedor de servicios de arrendamiento.
                                    Todos los acuerdos de renta, contratos y transacciones financieras se realizan directamente entre los usuarios involucrados, fuera de la plataforma.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 2 */}
                    <div className="legal-card" id="t2">
                        <div className="legal-card-header">
                            <div className="legal-card-icon">Cuenta</div>
                            <div>
                                <h2 className="legal-card-title">2. Registro y Cuentas de Usuario</h2>
                                <p className="legal-card-subtitle">Requisitos y responsabilidades</p>
                            </div>
                        </div>
                        <div className="legal-text">
                            <p>Para utilizar GoodMates, los usuarios deben:</p>
                            <ul className="legal-list">
                                <li>Ser mayores de 18 años o contar con autorización de un tutor legal.</li>
                                <li>Proporcionar información <strong>verídica y actualizada</strong> en su perfil de registro, incluyendo nombre, correo electrónico y datos personales.</li>
                                <li>Mantener la confidencialidad de sus credenciales de acceso (nombre de usuario y contraseña).</li>
                                <li>Notificar inmediatamente a GoodMates ante cualquier uso no autorizado de su cuenta.</li>
                            </ul>
                            <p>
                                GoodMates se reserva el derecho de suspender o cancelar cuentas que proporcionen información falsa, incompleta o que violen estos términos.
                            </p>
                        </div>
                    </div>

                    {/* 3 */}
                    <div className="legal-card" id="t3">
                        <div className="legal-card-header">
                            <div className="legal-card-icon">Reglas</div>
                            <div>
                                <h2 className="legal-card-title">3. Uso Aceptable de la Plataforma</h2>
                                <p className="legal-card-subtitle">Normas de conducta</p>
                            </div>
                        </div>
                        <div className="legal-text">
                            <p>Los usuarios se comprometen a:</p>
                            <ul className="legal-list">
                                <li>Utilizar la plataforma de forma respetuosa, honesta y colaborativa.</li>
                                <li>No publicar contenido ofensivo, difamatorio, discriminatorio o ilegal.</li>
                                <li>No utilizar la plataforma para fines distintos a los previstos (búsqueda de roommates, publicación de propiedades, herramientas de convivencia).</li>
                                <li>No intentar acceder a cuentas de otros usuarios ni comprometer la seguridad del sistema.</li>
                                <li>Utilizar las herramientas de convivencia (Task Manager y Mates Board) de manera colaborativa y respetuosa.</li>
                                <li>No realizar spam, publicidad no autorizada o actividades comerciales no relacionadas con el propósito de la plataforma.</li>
                            </ul>
                        </div>
                    </div>

                    {/* 4 */}
                    <div className="legal-card" id="t4">
                        <div className="legal-card-header">
                            <div className="legal-card-icon"><img src="/house-icon.png" alt="propiedad" style={{ width: 32, height: 32, objectFit: 'contain' }} /></div>
                            <div>
                                <h2 className="legal-card-title">4. Publicaciones y Propiedades</h2>
                                <p className="legal-card-subtitle">Responsabilidades de los arrendadores</p>
                            </div>
                        </div>
                        <div className="legal-text">
                            <p>Los usuarios con rol de <strong>Arrendador (Landlord)</strong> que publiquen propiedades se comprometen a:</p>
                            <ul className="legal-list">
                                <li>Proporcionar información <strong>real y precisa</strong> sobre las características, condiciones, precio y disponibilidad de las propiedades ofrecidas.</li>
                                <li>Mantener actualizada la información de sus publicaciones.</li>
                                <li>Ser los legítimos propietarios o representantes autorizados de las propiedades publicadas.</li>
                                <li>No publicar propiedades inexistentes o con información engañosa.</li>
                            </ul>
                            <p>
                                GoodMates no verifica la veracidad de las publicaciones y no se hace responsable por discrepancias entre lo publicado y las condiciones reales de las propiedades.
                            </p>
                        </div>
                    </div>

                    {/* 5 */}
                    <div className="legal-card" id="t5">
                        <div className="legal-card-header">
                            <div className="legal-card-icon">Algoritmo</div>
                            <div>
                                <h2 className="legal-card-title">5. Índice de Compatibilidad y Matches</h2>
                                <p className="legal-card-subtitle">Funcionamiento del algoritmo</p>
                            </div>
                        </div>
                        <div className="legal-text">
                            <p>
                                El sistema de compatibilidad de GoodMates genera sugerencias basadas en la información proporcionada por los usuarios en sus perfiles (preferencias de convivencia, horarios, hobbies, etc.).
                            </p>
                            <ul className="legal-list">
                                <li>El <strong>Índice de Compatibilidad</strong> es una herramienta orientativa y no garantiza una convivencia exitosa.</li>
                                <li>La precisión del cálculo depende de la veracidad y detalle de la información proporcionada por los usuarios.</li>
                                <li>GoodMates no se responsabiliza de los resultados de convivencia entre usuarios que hayan sido conectados a través de la plataforma.</li>
                            </ul>
                        </div>
                    </div>

                    {/* 6 */}
                    <div className="legal-card" id="t6">
                        <div className="legal-card-header">
                            <div className="legal-card-icon">Legal</div>
                            <div>
                                <h2 className="legal-card-title">6. Limitación de Responsabilidad</h2>
                                <p className="legal-card-subtitle">Alcance de la responsabilidad de la plataforma</p>
                            </div>
                        </div>
                        <div className="legal-text">
                            <p>GoodMates <strong>no será responsable</strong> por:</p>
                            <ul className="legal-list">
                                <li>Conflictos, disputas o desacuerdos que surjan entre los usuarios de la plataforma.</li>
                                <li>Pérdidas económicas, daños materiales o perjuicios de cualquier índole derivados de acuerdos entre usuarios.</li>
                                <li>La veracidad, exactitud o integridad de la información proporcionada por los usuarios.</li>
                                <li>Interrupciones del servicio, fallos técnicos o pérdida de datos.</li>
                                <li>Actos ilícitos o fraudulentos realizados por los usuarios dentro o fuera de la plataforma.</li>
                            </ul>
                            <div className="legal-highlight">
                                <p>
                                    <strong>Acuerdos externos:</strong> Se asume que los acuerdos legales, contractuales y financieros derivados de la renta serán gestionados completamente fuera de la plataforma.
                                    GoodMates no podrá participar en procesos legales derivados de dichos acuerdos.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 7 */}
                    <div className="legal-card" id="t7">
                        <div className="legal-card-header">
                            <div className="legal-card-icon">©</div>
                            <div>
                                <h2 className="legal-card-title">7. Propiedad Intelectual</h2>
                                <p className="legal-card-subtitle">Derechos sobre el contenido</p>
                            </div>
                        </div>
                        <div className="legal-text">
                            <p>
                                Todo el contenido de la plataforma GoodMates, incluyendo su diseño, logotipos, código fuente, algoritmos y marca, son propiedad de GoodMates y están protegidos por las leyes de propiedad intelectual aplicables.
                            </p>
                            <p>
                                Los usuarios conservan los derechos sobre el contenido que publican (textos, imágenes de perfil), pero otorgan a GoodMates una licencia no exclusiva para mostrar dicho contenido dentro de la plataforma.
                            </p>
                        </div>
                    </div>

                    {/* 8 */}
                    <div className="legal-card" id="t8">
                        <div className="legal-card-header">
                            <div className="legal-card-icon">Conflictos</div>
                            <div>
                                <h2 className="legal-card-title">8. Resolución de Conflictos</h2>
                                <p className="legal-card-subtitle">Mecanismos de mediación</p>
                            </div>
                        </div>
                        <div className="legal-text">
                            <p>
                                En caso de disputas entre usuarios, GoodMates podrá ofrecer herramientas de mediación voluntaria a través de la plataforma, pero <strong>no tiene obligación</strong> de intervenir ni resolver conflictos entre usuarios.
                            </p>
                            <p>
                                Para conflictos relacionados con el uso de la plataforma, los usuarios podrán contactar al equipo de soporte de GoodMates a través del formulario de contacto.
                            </p>
                        </div>
                    </div>

                    {/* 9 */}
                    <div className="legal-card" id="t9">
                        <div className="legal-card-header">
                            <div className="legal-card-icon">Cambios</div>
                            <div>
                                <h2 className="legal-card-title">9. Modificaciones a los Términos</h2>
                                <p className="legal-card-subtitle">Actualización de condiciones</p>
                            </div>
                        </div>
                        <div className="legal-text">
                            <p>
                                GoodMates se reserva el derecho de modificar estos Términos y Condiciones en cualquier momento. Los cambios serán notificados a los usuarios a través de la plataforma y/o por correo electrónico.
                            </p>
                            <p>
                                El uso continuado de la plataforma después de la publicación de cambios constituirá la aceptación de los nuevos términos.
                            </p>
                        </div>
                    </div>

                    {/* 10 */}
                    <div className="legal-card" id="t10">
                        <div className="legal-card-header">
                            <div className="legal-card-icon">Contacto</div>
                            <div>
                                <h2 className="legal-card-title">10. Contacto</h2>
                                <p className="legal-card-subtitle">Comunicaciones y consultas</p>
                            </div>
                        </div>
                        <div className="legal-text">
                            <p>
                                Para cualquier consulta relacionada con estos Términos y Condiciones, los usuarios pueden contactar al equipo de GoodMates a través de:
                            </p>
                            <ul className="legal-list">
                                <li>Correo electrónico: <strong>soporte@goodmates.mx</strong></li>
                                <li>Formulario de contacto disponible en la sección de <Link to="/contacto">Contacto</Link></li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Navegación entre páginas legales */}
                <div className="legal-nav animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                    <Link to="/terminos" className="legal-nav-link active">Términos y Condiciones</Link>
                    <Link to="/privacidad" className="legal-nav-link">Aviso de Privacidad</Link>
                    <Link to="/contacto" className="legal-nav-link">Contacto</Link>
                </div>
            </div>
        </div>
    );
}

export default TermsPage;
