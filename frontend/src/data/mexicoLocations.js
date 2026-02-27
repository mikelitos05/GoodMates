/**
 * Estados y ciudades principales de México
 * Usado en dropdowns de formularios de propiedades y perfiles
 */

const MEXICO_LOCATIONS = {
    'Aguascalientes': ['Aguascalientes', 'Jesús María', 'San Francisco de los Romo', 'Calvillo'],
    'Baja California': ['Tijuana', 'Mexicali', 'Ensenada', 'Rosarito', 'Tecate', 'San Quintín'],
    'Baja California Sur': ['La Paz', 'Los Cabos', 'San José del Cabo', 'Cabo San Lucas', 'Loreto'],
    'Campeche': ['Campeche', 'Ciudad del Carmen', 'Champotón', 'Escárcega', 'Calkiní'],
    'Chiapas': ['Tuxtla Gutiérrez', 'San Cristóbal de las Casas', 'Tapachula', 'Comitán', 'Palenque'],
    'Chihuahua': ['Chihuahua', 'Ciudad Juárez', 'Delicias', 'Cuauhtémoc', 'Parral'],
    'Ciudad de México': ['Álvaro Obregón', 'Azcapotzalco', 'Benito Juárez', 'Coyoacán', 'Cuajimalpa', 'Cuauhtémoc', 'Gustavo A. Madero', 'Iztacalco', 'Iztapalapa', 'Miguel Hidalgo', 'Milpa Alta', 'Tlalpan', 'Tláhuac', 'Venustiano Carranza', 'Xochimilco'],
    'Coahuila': ['Saltillo', 'Torreón', 'Monclova', 'Piedras Negras', 'Acuña', 'Ramos Arizpe'],
    'Colima': ['Colima', 'Manzanillo', 'Tecomán', 'Villa de Álvarez', 'Comala'],
    'Durango': ['Durango', 'Gómez Palacio', 'Lerdo', 'Santiago Papasquiaro', 'El Salto'],
    'Estado de México': ['Toluca', 'Naucalpan', 'Ecatepec', 'Tlalnepantla', 'Nezahualcóyotl', 'Huixquilucan', 'Metepec', 'Atizapán', 'Coacalco', 'Cuautitlán Izcalli', 'Texcoco'],
    'Guanajuato': ['León', 'Guanajuato', 'Irapuato', 'Celaya', 'Salamanca', 'San Miguel de Allende', 'Silao'],
    'Guerrero': ['Acapulco', 'Chilpancingo', 'Iguala', 'Zihuatanejo', 'Taxco', 'Coyuca de Benítez'],
    'Hidalgo': ['Pachuca', 'Tulancingo', 'Tula', 'Huejutla', 'Actopan', 'Mineral de la Reforma'],
    'Jalisco': ['Guadalajara', 'Zapopan', 'Tlaquepaque', 'Tonalá', 'Puerto Vallarta', 'Lagos de Moreno', 'Tlajomulco'],
    'Michoacán': ['Morelia', 'Uruapan', 'Zamora', 'Lázaro Cárdenas', 'Pátzcuaro', 'Apatzingán'],
    'Morelos': ['Cuernavaca', 'Jiutepec', 'Temixco', 'Cuautla', 'Yautepec'],
    'Nayarit': ['Tepic', 'Bahía de Banderas', 'Compostela', 'Santiago Ixcuintla', 'Xalisco'],
    'Nuevo León': ['Monterrey', 'San Pedro Garza García', 'San Nicolás de los Garza', 'Guadalupe', 'Apodaca', 'Santa Catarina', 'Escobedo', 'García', 'Santiago', 'Cadereyta'],
    'Oaxaca': ['Oaxaca de Juárez', 'Salina Cruz', 'Juchitán', 'Huatulco', 'Tuxtepec', 'Puerto Escondido'],
    'Puebla': ['Puebla', 'Tehuacán', 'San Andrés Cholula', 'San Pedro Cholula', 'Atlixco', 'Amozoc'],
    'Querétaro': ['Santiago de Querétaro', 'San Juan del Río', 'El Marqués', 'Corregidora', 'Tequisquiapan'],
    'Quintana Roo': ['Cancún', 'Playa del Carmen', 'Chetumal', 'Cozumel', 'Tulum', 'Felipe Carrillo Puerto'],
    'San Luis Potosí': ['San Luis Potosí', 'Ciudad Valles', 'Soledad de Graciano Sánchez', 'Matehuala', 'Rioverde'],
    'Sinaloa': ['Culiacán', 'Mazatlán', 'Los Mochis', 'Guasave', 'Navolato'],
    'Sonora': ['Hermosillo', 'Ciudad Obregón', 'Nogales', 'Guaymas', 'Navojoa', 'San Luis Río Colorado'],
    'Tabasco': ['Villahermosa', 'Cárdenas', 'Comalcalco', 'Paraíso', 'Macuspana'],
    'Tamaulipas': ['Tampico', 'Ciudad Victoria', 'Reynosa', 'Matamoros', 'Nuevo Laredo', 'Altamira'],
    'Tlaxcala': ['Tlaxcala', 'Apizaco', 'Huamantla', 'San Pablo del Monte', 'Chiautempan'],
    'Veracruz': ['Veracruz', 'Xalapa', 'Coatzacoalcos', 'Poza Rica', 'Córdoba', 'Orizaba', 'Boca del Río'],
    'Yucatán': ['Mérida', 'Valladolid', 'Progreso', 'Tizimín', 'Umán', 'Kanasín'],
    'Zacatecas': ['Zacatecas', 'Fresnillo', 'Guadalupe', 'Jerez', 'Río Grande'],
};

/**
 * Retorna la lista de estados (keys) ordenada alfabéticamente
 */
export const getEstados = () => {
    return Object.keys(MEXICO_LOCATIONS).sort();
};

/**
 * Retorna las ciudades de un estado dado
 */
export const getCiudades = (estado) => {
    return MEXICO_LOCATIONS[estado] || [];
};

export default MEXICO_LOCATIONS;
