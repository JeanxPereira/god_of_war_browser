@echo off
echo ========================================
echo  God of War Browser - Inicializacao
echo ========================================
echo.

REM Verificar se pnpm está instalado
where pnpm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] pnpm nao encontrado!
    echo Por favor instale: npm install -g pnpm
    pause
    exit /b 1
)

REM Verificar se node_modules existe
if not exist "webui\node_modules" (
    echo [INFO] Instalando dependencias do Next.js...
    cd webui
    call pnpm install
    cd ..
    echo.
)

echo [INFO] Iniciando Backend Go (porta 8000)...
echo.
echo Por favor, execute manualmente em outro terminal:
echo go run god_of_war_browser.go -iso "PATH_TO_ISO" -ps ps2 -gowversion 2
echo.
echo Aguardando 5 segundos antes de iniciar o Next.js...
timeout /t 5 /nobreak

echo.
echo [INFO] Iniciando Next.js Dev Server (porta 3000)...
cd webui
call pnpm dev
