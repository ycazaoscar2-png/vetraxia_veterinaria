@echo off
cd /d "%~dp0"
title Quedamos
where node >nul 2>nul
if errorlevel 1 (
  echo Falta instalar Node.js: https://nodejs.org  ^(version LTS^). Luego reinicia la PC.
  pause
  exit /b 1
)
if not exist node_modules\nodemailer (
  echo Instalando librerias, espera un momento...
  call npm.cmd install --no-audit --no-fund
  if errorlevel 1 (
    echo Fallo la instalacion. Revisa tu internet.
    pause
    exit /b 1
  )
)
if not exist .env (
  node scripts\configurar.js
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo.
echo Iniciando Quedamos... se abrira el navegador en unos segundos.
echo Deja esta ventana abierta mientras lo usas.
start "" cmd /c "timeout /t 5 >nul & start http://localhost:3000"
call npm.cmd start
pause
