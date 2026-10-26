/* Pinta las tarjetas del hub a partir de window.TABLEROS con el mismo
   marcado que las tarjetas de la home (.tile / .idx / .arrow). */
(function () {
  function renderHub(contenedor, tableros) {
    contenedor.textContent = "";
    tableros.forEach(function (t, i) {
      var a = document.createElement("a");
      a.className = "tile";
      a.href = t.url;
      a.dataset.id = t.id;

      var idx = document.createElement("span");
      idx.className = "idx";
      idx.textContent = String(i + 1).padStart(2, "0") + " · " + t.fuente + " · " + t.estado;

      var h3 = document.createElement("h3");
      h3.textContent = t.titulo;

      var p = document.createElement("p");
      p.textContent = t.descripcion;

      var flecha = document.createElement("span");
      flecha.className = "arrow";
      flecha.textContent = "↗";

      a.append(idx, h3, p, flecha);
      contenedor.appendChild(a);
    });
  }

  window.renderHub = renderHub;

  document.addEventListener("DOMContentLoaded", function () {
    var contenedor = document.getElementById("tableros");
    if (contenedor && window.TABLEROS) renderHub(contenedor, window.TABLEROS);
  });
})();
