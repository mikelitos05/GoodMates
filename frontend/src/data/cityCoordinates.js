/**
 * Coordenadas aproximadas de ciudades principales de México
 * Usadas para posicionar marcadores en el mapa de propiedades
 */

const CITY_COORDINATES = {
    // Aguascalientes
    'Aguascalientes': [21.8818, -102.2916],
    // Baja California
    'Tijuana': [32.5149, -117.0382],
    'Mexicali': [32.6245, -115.4523],
    'Ensenada': [31.8667, -116.5964],
    'Rosarito': [32.3634, -117.0581],
    'Tecate': [32.5722, -116.6264],
    // Baja California Sur
    'La Paz': [24.1426, -110.3128],
    'Los Cabos': [22.8905, -109.9167],
    'San José del Cabo': [23.0597, -109.7000],
    'Cabo San Lucas': [22.8905, -109.9167],
    'Loreto': [26.0126, -111.3479],
    // Campeche
    'Campeche': [19.8301, -90.5349],
    'Ciudad del Carmen': [18.6500, -91.8300],
    // Chiapas
    'Tuxtla Gutiérrez': [16.7528, -93.1152],
    'San Cristóbal de las Casas': [16.7370, -92.6376],
    'Tapachula': [14.9000, -92.2600],
    'Comitán': [16.2500, -92.1300],
    'Palenque': [17.5100, -91.9800],
    // Chihuahua
    'Chihuahua': [28.6353, -106.0889],
    'Ciudad Juárez': [31.6904, -106.4245],
    'Delicias': [28.1900, -105.4700],
    'Cuauhtémoc': [28.4053, -106.8668],
    'Parral': [26.9333, -105.6667],
    // Ciudad de México (delegaciones / alcaldías con coordenadas centralizadas)
    'Álvaro Obregón': [19.3574, -99.2208],
    'Azcapotzalco': [19.4869, -99.1839],
    'Benito Juárez': [19.3717, -99.1585],
    'Coyoacán': [19.3467, -99.1617],
    'Cuajimalpa': [19.3578, -99.2978],
    'Gustavo A. Madero': [19.4742, -99.1139],
    'Iztacalco': [19.3953, -99.0978],
    'Iztapalapa': [19.3550, -99.0531],
    'Miguel Hidalgo': [19.4342, -99.2036],
    'Milpa Alta': [19.1928, -99.0228],
    'Tlalpan': [19.2847, -99.1678],
    'Tláhuac': [19.2847, -99.0078],
    'Venustiano Carranza': [19.4242, -99.1069],
    'Xochimilco': [19.2600, -99.1042],
    // Coahuila
    'Saltillo': [25.4232, -100.9924],
    'Torreón': [25.5428, -103.4068],
    'Monclova': [26.9069, -101.4208],
    'Piedras Negras': [28.7000, -100.5231],
    'Acuña': [29.3236, -100.9319],
    'Ramos Arizpe': [25.5400, -100.9500],
    // Colima
    'Colima': [19.2433, -103.7247],
    'Manzanillo': [19.1136, -104.3361],
    'Tecomán': [18.9100, -103.8700],
    'Villa de Álvarez': [19.2700, -103.7400],
    'Comala': [19.3200, -103.7600],
    // Durango
    'Durango': [24.0277, -104.6532],
    'Gómez Palacio': [25.5600, -103.4900],
    'Lerdo': [25.5300, -103.5200],
    // Estado de México
    'Toluca': [19.2826, -99.6557],
    'Naucalpan': [19.4753, -99.2397],
    'Ecatepec': [19.6019, -99.0500],
    'Tlalnepantla': [19.5367, -99.1947],
    'Nezahualcóyotl': [19.4008, -99.0142],
    'Huixquilucan': [19.3600, -99.3500],
    'Metepec': [19.2600, -99.6000],
    'Atizapán': [19.5600, -99.2600],
    'Coacalco': [19.6300, -99.1100],
    'Cuautitlán Izcalli': [19.6400, -99.2100],
    'Texcoco': [19.5147, -98.8842],
    // Guanajuato
    'León': [21.1221, -101.6821],
    'Guanajuato': [21.0190, -101.2574],
    'Irapuato': [20.6767, -101.3558],
    'Celaya': [20.5236, -100.8157],
    'Salamanca': [20.5700, -101.1900],
    'San Miguel de Allende': [20.9144, -100.7452],
    'Silao': [20.9400, -101.4300],
    // Guerrero
    'Acapulco': [16.8531, -99.8237],
    'Chilpancingo': [17.5506, -99.5025],
    'Iguala': [18.3449, -99.5337],
    'Zihuatanejo': [17.6383, -101.5514],
    'Taxco': [18.5564, -99.6050],
    // Hidalgo
    'Pachuca': [20.1011, -98.7591],
    'Tulancingo': [20.0844, -98.3664],
    'Tula': [20.0539, -99.3467],
    'Mineral de la Reforma': [20.0700, -98.6900],
    // Jalisco
    'Guadalajara': [20.6597, -103.3496],
    'Zapopan': [20.7231, -103.3844],
    'Tlaquepaque': [20.6411, -103.3103],
    'Tonalá': [20.6231, -103.2347],
    'Puerto Vallarta': [20.6534, -105.2253],
    'Lagos de Moreno': [21.3544, -101.9308],
    'Tlajomulco': [20.4746, -103.4438],
    // Michoacán
    'Morelia': [19.7060, -101.1950],
    'Uruapan': [19.4178, -102.0636],
    'Zamora': [19.9850, -102.2836],
    'Lázaro Cárdenas': [17.9578, -102.2003],
    'Pátzcuaro': [19.5166, -101.6097],
    'Apatzingán': [19.0878, -102.3508],
    // Morelos
    'Cuernavaca': [18.9186, -99.2342],
    'Jiutepec': [18.8836, -99.1731],
    'Temixco': [18.8500, -99.2300],
    'Cuautla': [18.8131, -98.9508],
    'Yautepec': [18.8800, -99.0700],
    // Nayarit
    'Tepic': [21.5042, -104.8953],
    'Bahía de Banderas': [20.8000, -105.2900],
    'Compostela': [21.2364, -104.9000],
    'Xalisco': [21.4700, -104.8900],
    // Nuevo León
    'Monterrey': [25.6866, -100.3161],
    'San Pedro Garza García': [25.6500, -100.4028],
    'San Nicolás de los Garza': [25.7461, -100.2831],
    'Guadalupe': [25.6778, -100.2567],
    'Apodaca': [25.7808, -100.1883],
    'Santa Catarina': [25.6733, -100.4594],
    'Escobedo': [25.7953, -100.3253],
    'García': [25.8200, -100.5900],
    'Santiago': [25.4300, -100.1500],
    'Cadereyta': [25.5900, -99.9800],
    // Oaxaca
    'Oaxaca de Juárez': [17.0732, -96.7266],
    'Salina Cruz': [16.1831, -95.1986],
    'Juchitán': [16.4319, -95.0222],
    'Huatulco': [15.7691, -96.1500],
    'Tuxtepec': [18.0833, -96.1233],
    'Puerto Escondido': [15.8617, -97.0680],
    // Puebla
    'Puebla': [19.0414, -98.2063],
    'Tehuacán': [18.4617, -97.3928],
    'San Andrés Cholula': [19.0559, -98.3063],
    'San Pedro Cholula': [19.0600, -98.3030],
    'Atlixco': [18.9064, -98.4350],
    'Amozoc': [19.0400, -98.0500],
    // Querétaro
    'Santiago de Querétaro': [20.5888, -100.3899],
    'San Juan del Río': [20.3861, -99.9956],
    'El Marqués': [20.6200, -100.3100],
    'Corregidora': [20.5300, -100.4600],
    'Tequisquiapan': [20.5200, -99.8900],
    // Quintana Roo
    'Cancún': [21.1619, -86.8515],
    'Playa del Carmen': [20.6296, -87.0739],
    'Chetumal': [18.5001, -88.2968],
    'Cozumel': [20.4318, -86.9223],
    'Tulum': [20.2098, -87.4655],
    // San Luis Potosí
    'San Luis Potosí': [22.1565, -100.9855],
    'Ciudad Valles': [21.9964, -99.0136],
    'Soledad de Graciano Sánchez': [22.1831, -100.9331],
    'Matehuala': [23.6528, -100.6444],
    'Rioverde': [21.9300, -100.0000],
    // Sinaloa
    'Culiacán': [24.7994, -107.3897],
    'Mazatlán': [23.2494, -106.4111],
    'Los Mochis': [25.7908, -108.9939],
    'Guasave': [25.5667, -108.4700],
    'Navolato': [24.7700, -107.7000],
    // Sonora
    'Hermosillo': [29.0729, -110.9559],
    'Ciudad Obregón': [27.4828, -109.9303],
    'Nogales': [31.3086, -110.9456],
    'Guaymas': [27.9208, -110.9000],
    'Navojoa': [27.0700, -109.4400],
    'San Luis Río Colorado': [32.4566, -114.7722],
    // Tabasco
    'Villahermosa': [17.9869, -92.9303],
    'Cárdenas': [18.0000, -93.3700],
    'Comalcalco': [18.2800, -93.2000],
    'Paraíso': [18.3900, -93.2100],
    'Macuspana': [17.7600, -92.5900],
    // Tamaulipas
    'Tampico': [22.2331, -97.8611],
    'Ciudad Victoria': [23.7369, -99.1411],
    'Reynosa': [26.0508, -98.2975],
    'Matamoros': [25.8697, -97.5028],
    'Nuevo Laredo': [27.4767, -99.5069],
    'Altamira': [22.3928, -97.9300],
    // Tlaxcala
    'Tlaxcala': [19.3181, -98.2375],
    'Apizaco': [19.4200, -98.1400],
    'Huamantla': [19.3100, -97.9200],
    'San Pablo del Monte': [19.2100, -98.1600],
    'Chiautempan': [19.3200, -98.1900],
    // Veracruz
    'Veracruz': [19.1738, -96.1342],
    'Xalapa': [19.5438, -96.9102],
    'Coatzacoalcos': [18.1342, -94.4583],
    'Poza Rica': [20.5330, -97.4596],
    'Córdoba': [18.8836, -96.9244],
    'Orizaba': [18.8500, -97.1000],
    'Boca del Río': [19.1092, -96.1086],
    // Yucatán
    'Mérida': [20.9674, -89.5926],
    'Valladolid': [20.6894, -88.2017],
    'Progreso': [21.2817, -89.6633],
    'Tizimín': [21.1422, -88.1508],
    'Umán': [20.8867, -89.7500],
    'Kanasín': [20.9300, -89.5600],
    // Zacatecas
    'Zacatecas': [22.7709, -102.5832],
    'Fresnillo': [23.1728, -102.8697],
    'Jerez': [22.6500, -103.0000],
    'Río Grande': [23.8200, -103.0300],
};

/**
 * Gets coordinates for a city. Falls back to state capital or Mexico City center.
 */
export const getCoordinates = (city, state) => {
    if (city && CITY_COORDINATES[city]) {
        return CITY_COORDINATES[city];
    }
    // Try state capital (first city in the state)
    if (state && CITY_COORDINATES[state]) {
        return CITY_COORDINATES[state];
    }
    // Default: Mexico City center
    return [19.4326, -99.1332];
};

/**
 * Get default map center for Mexico
 */
export const MEXICO_CENTER = [23.6345, -102.5528];
export const MEXICO_ZOOM = 5;

export default CITY_COORDINATES;
