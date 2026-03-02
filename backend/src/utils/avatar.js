function normalizarTexto(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function obtenerInicial(texto) {
    const safe = normalizarTexto(texto);
    return safe.length > 0 ? safe[0].toUpperCase() : '?';
}

function construirAvatar(nombre, apellido) {
    return `${obtenerInicial(nombre)}${obtenerInicial(apellido)}`;
}

function normalizarFotoPerfil(path) {
    const value = normalizarTexto(path);
    return value || null;
}

module.exports = {
    construirAvatar,
    normalizarFotoPerfil,
};
