// Carreras organizadas por categoría para el dropdown del perfil
const careerCategories = [
    {
        category: 'Ciencias Sociales, Derecho y Humanidades',
        careers: [
            'Administración y gestión de empresas', 'Contabilidad', 'Finanzas', 'Mercadotecnia',
            'Economía', 'Psicología', 'Sociología', 'Ciencias políticas', 'Antropología',
            'Trabajo social', 'Derecho', 'Comunicación', 'Periodismo', 'Historia', 'Filosofía',
            'Lingüística', 'Letras', 'Educación', 'Pedagogía', 'Relaciones Internacionales',
            'Recursos Humanos', 'Administración Pública',
        ],
    },
    {
        category: 'Ciencias Naturales y Exactas',
        careers: [
            'Biología', 'Bioquímica', 'Química', 'Física', 'Matemáticas', 'Ciencia de Datos',
            'Ciencias ambientales', 'Nutrición', 'Biotecnología', 'Ciencia de materiales',
            'Forense', 'Agroforestales', 'Agrogenómica', 'Ciencia de la tierra',
        ],
    },
    {
        category: 'Ingenierías y Tecnología',
        careers: [
            'Ingeniería Civil', 'Ingeniería Industrial', 'Ingeniería Mecánica',
            'Ingeniería Eléctrica', 'Ingeniería Electrónica', 'Ingeniería Química',
            'Ingeniería Ambiental', 'Ingeniería de Software / Informática',
            'Ingeniería Biomédica', 'Ingeniería en Sistemas Computacionales',
            'Ingeniería Mecatrónica', 'Ingeniería de Alimentos',
            'Sistemas de Información', 'Tecnología de la Información', 'Robótica',
        ],
    },
    {
        category: 'Arquitectura, Construcción y Diseño',
        careers: [
            'Arquitectura', 'Arquitectura de interiores', 'Diseño Industrial',
            'Diseño gráfico', 'Diseño de moda', 'Urbanismo', 'Planeación territorial',
        ],
    },
    {
        category: 'Ciencias de la Salud',
        careers: [
            'Medicina', 'Enfermería', 'Fisioterapia', 'Odontología', 'Farmacia',
            'Psicología clínica', 'Biomedicina', 'Salud pública', 'Nutrición humana', 'Veterinaria',
        ],
    },
    {
        category: 'Artes y Creatividad',
        careers: [
            'Artes visuales', 'Música', 'Teatro', 'Danza',
            'Cine y medios audiovisuales', 'Producción musical', 'Artes plásticas',
        ],
    },
    {
        category: 'Administración, Negocio y Economía',
        careers: [
            'Administración de negocios', 'Comercio internacional', 'Finanzas y banca',
            'Contabilidad pública', 'Emprendimiento empresarial', 'Marketing digital',
            'Gestión empresarial', 'Administración turística',
        ],
    },
    {
        category: 'Tecnologías Aplicadas',
        careers: [
            'Desarrollo de software', 'Analista programador', 'Inteligencia artificial',
            'Ciberseguridad', 'Big Data', 'Multimedia digital', 'Animación digital',
        ],
    },
    {
        category: 'Agronomía y Ciencias del Medio Ambiente',
        careers: [
            'Agronomía', 'Ingeniería forestal', 'Agricultura sustentable',
            'Gestión ambiental', 'Recursos naturales',
        ],
    },
    {
        category: 'Especialidades Técnicas y Profesionales',
        careers: [
            'Arquitectura técnica', 'Electromecánica', 'Telecomunicaciones',
            'Logística', 'Calidad e innovación', 'Gestión de proyectos',
        ],
    },
    {
        category: 'Áreas Misceláneas o Transversales',
        careers: [
            'Ciencias religiosas', 'Ciencias teológicas', 'Turismo', 'Hotelería',
            'Deportes y educación física', 'Gastronomía', 'Idiomas y traducción',
        ],
    },
];

// Helper: find the category name for a given career
export function getCareerCategory(career) {
    if (!career) return null;
    for (const cat of careerCategories) {
        if (cat.careers.includes(career)) return cat.category;
    }
    return null;
}

export default careerCategories;
