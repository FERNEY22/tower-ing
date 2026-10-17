// Modificado por Ferney Torres Ome: diccionario de textos en español e inglés
var textos = {
    es: {
        titulo: "CONTROL DE VARIABLES DEL INVERNADERO",
        subtitulo: "Monitoreo de cultivo de rosas con reporte en lenguaje natural",
        lblIdioma: "Idioma del reporte:",
        lblTemp: "Temperatura:",
        lblHume: "Humedad:",
        lblPh: "pH de la tierra:",
        lblTexto: "Reporte escrito:",
        datos: "Leer datos",
        hablar: "Reporte",
        tBaja: "temperatura baja", tNormal: "temperatura normal", tAlta: "temperatura alta",
        hBaja: "humedad baja", hNormal: "humedad normal", hAlta: "humedad alta",
        pAcido: "suelo ácido", pNormal: "pH normal", pAlcalino: "suelo alcalino",
        inicio: "El invernadero tiene",
        voz: "es-ES",
        instrucciones: '<p><strong>¿Qué es?</strong> Prototipo que convierte las lecturas de los sensores de un invernadero de rosas en un reporte en lenguaje natural, escrito y hablado, mediante la API Text-to-Speech del navegador.</p>' +
            '<ol><li>Pulse <strong>Leer datos</strong>: simula la lectura de la red de sensores y genera valores aleatorios de temperatura, humedad y pH. Cada clic es una nueva lectura.</li>' +
            '<li>Revise el <strong>reporte escrito</strong> con el estado del invernadero.</li>' +
            '<li>Pulse <strong>Reporte</strong> para escucharlo en voz.</li>' +
            '<li>Cambie el idioma a <strong>English</strong> para obtener el reporte en inglés.</li></ol>' +
            '<p class="rangos">Rangos normales: temperatura 21–35 °C · humedad 41–80 % · pH 5,5–6,5</p>'
    },
    en: {
        titulo: "GREENHOUSE VARIABLE CONTROL",
        subtitulo: "Rose crop monitoring with natural-language reports",
        lblIdioma: "Report language:",
        lblTemp: "Temperature:",
        lblHume: "Humidity:",
        lblPh: "Soil pH:",
        lblTexto: "Written report:",
        datos: "Read data",
        hablar: "Report",
        tBaja: "low temperature", tNormal: "normal temperature", tAlta: "high temperature",
        hBaja: "low humidity", hNormal: "normal humidity", hAlta: "high humidity",
        pAcido: "acidic soil", pNormal: "normal pH", pAlcalino: "alkaline soil",
        inicio: "The greenhouse has",
        voz: "en-US",
        instrucciones: '<p><strong>What is it?</strong> A prototype that turns the sensor readings of a rose greenhouse into a natural-language report, written and spoken, using the browser\'s Text-to-Speech API.</p>' +
            '<ol><li>Press <strong>Read data</strong>: it simulates the sensor network and generates random temperature, humidity and pH values. Each click is a new reading.</li>' +
            '<li>Check the <strong>written report</strong> with the greenhouse status.</li>' +
            '<li>Press <strong>Report</strong> to hear it aloud.</li>' +
            '<li>Switch the language to <strong>Español</strong> to get the report in Spanish.</li></ol>' +
            '<p class="rangos">Normal ranges: temperature 21–35 °C · humidity 41–80 % · pH 5.5–6.5</p>'
    }
};

var temperatura, humedad, ph;

// Modificado por Ferney Torres Ome: simulación de lectura de sensores en una función
function leer_sensores() {
    temperatura = Math.round(Math.random() * (40 - 15) + 15);      // 15 a 40 °C
    humedad = Math.round(Math.random() * (100 - 10) + 10);         // 10 a 100 %
    ph = Math.round((Math.random() * (8.0 - 4.0) + 4.0) * 10) / 10; // 4,0 a 8,0 (un decimal)
}

// Modificado por Ferney Torres Ome: condiciones de rango corregidas (antes 14<temperatura<=20)
function estado_temperatura(L) {
    if (temperatura <= 20) return L.tBaja;
    if (temperatura <= 35) return L.tNormal;
    return L.tAlta;
}

function estado_humedad(L) {
    if (humedad <= 40) return L.hBaja;
    if (humedad <= 80) return L.hNormal;
    return L.hAlta;
}

// Modificado por Ferney Torres Ome: interpretación del pH para cultivo de rosas
function estado_ph(L) {
    if (ph < 5.5) return L.pAcido;
    if (ph <= 6.5) return L.pNormal;
    return L.pAlcalino;
}

// Modificado por Ferney Torres Ome: idioma seleccionado por el usuario
function idioma() {
    return textos[document.getElementById("idioma").value];
}

// Modificado por Ferney Torres Ome: traduce la interfaz al cambiar de idioma
function traducir_interfaz() {
    var L = idioma();
    ["titulo", "subtitulo", "lblIdioma", "lblTemp", "lblHume", "lblPh", "lblTexto"].forEach(function (id) {
        document.getElementById(id).textContent = L[id];
    });
    document.getElementById("datos").value = L.datos;
    // Modificado por Ferney Torres Ome: traducción del cuadro de instrucciones
    document.getElementById("instrucciones").innerHTML = L.instrucciones;
    document.getElementById("hablar").value = L.hablar;
    if (temperatura !== undefined) escribir_reporte(); // rehace el reporte en el nuevo idioma
}

// Modificado por Ferney Torres Ome: reporte en lenguaje natural con las tres variables
function escribir_reporte() {
    var L = idioma();
    document.getElementById("texto").value =
        L.inicio + " " + estado_temperatura(L) + ", " + estado_humedad(L) +
        (L === textos.es ? " y " : " and ") + estado_ph(L) + ".";
}

// Modificado por Ferney Torres Ome: nuevas lecturas simuladas en cada clic y se muestra el pH
function leer_datos() {
    leer_sensores();
    document.getElementById("temp").value = temperatura + " °C";
    document.getElementById("hume").value = humedad + " %";
    document.getElementById("ph").value = ph.toFixed(1);
    escribir_reporte();
}

// Modificado por Ferney Torres Ome: la voz usa el idioma seleccionado
function decir(texto) {
    var mensaje = new SpeechSynthesisUtterance(texto);
    mensaje.lang = idioma().voz;
    speechSynthesis.cancel();
    speechSynthesis.speak(mensaje);
}

document.getElementById("hablar").addEventListener("click", function () {
    decir(document.getElementById("texto").value);
});

document.getElementById("datos").addEventListener("click", leer_datos);

// Modificado por Ferney Torres Ome: evento del selector de idioma
document.getElementById("idioma").addEventListener("change", traducir_interfaz);
