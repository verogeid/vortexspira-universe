@echo off
setlocal enableextensions

:: Cambia el directorio actual al de donde se ejecuta el script.
cd /d "%~dp0"

set "PORT=3000"

ECHO =========================================================
ECHO Iniciando servidor web con Python portable...
ECHO =========================================================

:: Inicia el servidor de Python en el puerto 3000 en una nueva ventana.
:: Se usa la ruta completa al ejecutable de Python portable.
start "Python Server" "%~dp0python-3.13.6-embed-win-amd64\python.exe" -m http.server %PORT%

:: Espera 2 segundos para que el servidor arranque.
timeout /t 2 /nobreak >nul

:: ⭐ Genera una version unica basada en la hora actual
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "version=%dt:~0,4%%dt:~4,2%%dt:~6,2%%dt:~8,2%%dt:~10,2%%dt:~12,2%"

:: Abre el curso (index.html) en el navegador predeterminado.
start http://localhost:%PORT%/?v=%version%
