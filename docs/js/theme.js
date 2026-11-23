(function () {
  var root = document.documentElement;
  document.getElementById("theme-btn").addEventListener("click", function () {
    var t = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("sn-site-theme", t); } catch (e) {}
    document.dispatchEvent(new CustomEvent("themechange"));
  });
})();
