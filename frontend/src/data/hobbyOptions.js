// Hobbies e intereses organizados por categoría para el perfil
const hobbyCategories = [
    {
        category: 'Actividades Físicas y Ejercicio',
        hobbies: ['Gimnasio', 'Yoga', 'Correr', 'Deportes', 'Actividades al aire libre'],
    },
    {
        category: 'Intereses Artísticos y Creativos',
        hobbies: ['Arte', 'Fotografía', 'Baile', 'Música', 'Escritura', 'Diseño gráfico', 'Proyectos DIY / Mejora del hogar'],
    },
    {
        category: 'Tecnología y Videojuegos',
        hobbies: ['Videojuegos', 'Tecnología y gadgets', 'Programación', 'Juegos de mesa / Juegos de cartas', 'Preferencias de juegos'],
    },
    {
        category: 'Comida y Bebida',
        hobbies: ['Cocina', 'Repostería', 'Exploración gastronómica'],
    },
    {
        category: 'Actividades Sociales y Culturales',
        hobbies: ['Películas', 'Netflix', 'Viajes', 'Activismo social', 'Eventos culturales'],
    },
    {
        category: 'Naturaleza y Sostenibilidad',
        hobbies: ['Jardinería / Cuidado de plantas', 'Sostenibilidad'],
    },
    {
        category: 'Pasatiempos para Relajación y Ocio',
        hobbies: ['Lectura', 'Series', 'Ver deportes', 'Fotografía como pasatiempo', 'Viajar'],
    },
    {
        category: 'Crecimiento Personal y Aprendizaje',
        hobbies: ['Prácticas de mindfulness', 'Aprender nuevas habilidades', 'Desarrollo personal'],
    },
];

// Helper: get a flat list of all hobbies
export function getAllHobbiesFlat() {
    return hobbyCategories.flatMap(cat => cat.hobbies);
}

export default hobbyCategories;
