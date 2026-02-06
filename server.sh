#!/data/data/com.termux/files/usr/bin/bash

# Puertos
PORT_3000=3000
PORT_8080=8080

# Generar versión única (como en tu .bat) para saltar la caché del móvil
VERSION=$(date +%Y%m%d%H%M%S)
URL="http://localhost:$PORT_3000/?v=$VERSION"

echo "========================================================="
echo "VortexSpira: Modo Móvil (Termux)"
echo "Lanzando servidores en puertos $PORT_3000 y $PORT_8080..."
echo "========================================================="

# Abrir el navegador de Android automáticamente
# Requiere tener instalado 'termux-api' en Termux
if command -v termux-open-url &> /dev/null; then
    termux-open-url "$URL"
else
    echo "URL para el navegador: $URL"
fi

# Arrancar servidor en 8080 en segundo plano
python -m http.server $PORT_8080 &

# Arrancar servidor en 3000 en primer plano
echo "Servidor principal activo en puerto $PORT_3000"
python -m http.server $PORT_3000