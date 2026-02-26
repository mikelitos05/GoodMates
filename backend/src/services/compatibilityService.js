function parseHobbies(hobbies) {
    if (!hobbies) return [];
    if (Array.isArray(hobbies)) return hobbies;
    if (typeof hobbies === 'string') {
        try {
            return JSON.parse(hobbies);
        } catch {
            return [];
        }
    }
    return [];
}

function tieneDatosMinimosCompatibilidad(perfil) {
    if (!perfil || typeof perfil !== 'object') return false;

    const hobbies = parseHobbies(perfil.hobbies);

    return Boolean(
        (typeof perfil.ciudad === 'string' && perfil.ciudad.trim()) ||
        (perfil.presupuesto !== null && perfil.presupuesto !== undefined && Number(perfil.presupuesto) > 0) ||
        (typeof perfil.horario === 'string' && perfil.horario.trim()) ||
        (typeof perfil.visitantes === 'string' && perfil.visitantes.trim()) ||
        hobbies.length > 0
    );
}

// Algoritmo de compatibilidad basado en puntos con pesos configurables
// Compara los perfiles de dos tenants y devuelve un porcentaje de 0 a 100
function calcularCompatibilidad(perfil1, perfil2) {
    let puntos = 0;
    let maxPuntos = 0;

    // 1. Ciudad (peso: 20 puntos) - Misma ciudad es importante para compartir vivienda
    maxPuntos += 20;
    if (perfil1.ciudad && perfil2.ciudad) {
        if (perfil1.ciudad.toLowerCase() === perfil2.ciudad.toLowerCase()) {
            puntos += 20;
        }
    }

    // 2. Presupuesto (peso: 15 puntos) - Rango similar de presupuesto
    maxPuntos += 15;
    if (perfil1.presupuesto && perfil2.presupuesto) {
        const diff = Math.abs(perfil1.presupuesto - perfil2.presupuesto);
        const promedio = (perfil1.presupuesto + perfil2.presupuesto) / 2;
        if (promedio > 0) {
            const porcentajeDiff = diff / promedio;
            if (porcentajeDiff <= 0.1) puntos += 15; // Dentro del 10%
            else if (porcentajeDiff <= 0.25) puntos += 10; // Dentro del 25%
            else if (porcentajeDiff <= 0.5) puntos += 5; // Dentro del 50%
        }
    }

    // 3. Horario (peso: 15 puntos) - Horarios compatibles
    maxPuntos += 15;
    if (perfil1.horario && perfil2.horario) {
        if (perfil1.horario === perfil2.horario) {
            puntos += 15;
        } else if (perfil1.horario === 'Mixto' || perfil2.horario === 'Mixto') {
            puntos += 10;
        }
    }

    // 4. Limpieza (peso: 15 puntos) - Nivel de limpieza similar
    maxPuntos += 15;
    if (perfil1.limpieza && perfil2.limpieza) {
        const diff = Math.abs(perfil1.limpieza - perfil2.limpieza);
        if (diff === 0) puntos += 15;
        else if (diff === 1) puntos += 10;
        else if (diff === 2) puntos += 5;
    }

    // 5. Ruido (peso: 10 puntos) - Tolerancia al ruido similar
    maxPuntos += 10;
    if (perfil1.ruido && perfil2.ruido) {
        const diff = Math.abs(perfil1.ruido - perfil2.ruido);
        if (diff === 0) puntos += 10;
        else if (diff === 1) puntos += 7;
        else if (diff === 2) puntos += 3;
    }

    // 6. Mascotas (peso: 10 puntos) - Compatibilidad con mascotas
    maxPuntos += 10;
    if (perfil1.mascotas === perfil2.mascotas) {
        puntos += 10;
    }

    // 7. Fumador (peso: 10 puntos) - Compatibilidad con fumadores
    maxPuntos += 10;
    if (perfil1.fumador === perfil2.fumador) {
        puntos += 10;
    }

    // 8. Visitantes (peso: 5 puntos) - Frecuencia de visitantes similar
    maxPuntos += 5;
    if (perfil1.visitantes && perfil2.visitantes) {
        if (perfil1.visitantes === perfil2.visitantes) {
            puntos += 5;
        }
    }

    // 9. Hobbies en comun (peso: bonus hasta 10 puntos adicionales)
    const hobbies1 = parseHobbies(perfil1.hobbies);
    const hobbies2 = parseHobbies(perfil2.hobbies);
    if (hobbies1.length > 0 && hobbies2.length > 0) {
        const comunes = hobbies1.filter((h) => hobbies2.includes(h)).length;
        const bonusHobbies = Math.min(comunes * 2, 10);
        puntos += bonusHobbies;
        maxPuntos += 10;
    }

    // Calcular porcentaje final
    if (maxPuntos === 0) return 50; // Si no hay datos suficientes, devolver 50%
    return Math.round((puntos / maxPuntos) * 100);
}

function calcularCompatibilidadSiPosible(perfil1, perfil2) {
    if (!tieneDatosMinimosCompatibilidad(perfil1) || !tieneDatosMinimosCompatibilidad(perfil2)) {
        return null;
    }

    return calcularCompatibilidad(perfil1, perfil2);
}

module.exports = {
    parseHobbies,
    calcularCompatibilidad,
    calcularCompatibilidadSiPosible,
    tieneDatosMinimosCompatibilidad,
};
