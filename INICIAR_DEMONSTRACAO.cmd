@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale Node.js 24.22.1 ou atualizacao compativel da serie 24.
  pause
  exit /b 1
)
echo Abra http://localhost:8788 no navegador.
echo Mantenha esta janela aberta durante a demonstracao.
node scripts/serve.mjs
pause
