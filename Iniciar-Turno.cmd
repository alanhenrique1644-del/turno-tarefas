@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "ROOT=%~dp0"
title Turno - Gerenciador de tarefas

where node >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js nao foi encontrado. Instale a versao LTS do Node.js e tente novamente.
  pause
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo [ERRO] npm nao foi encontrado. Reinstale o Node.js com o npm incluido.
  pause
  exit /b 1
)

if not exist "%ROOT%backend\package.json" (
  echo [ERRO] Nao encontrei backend\package.json.
  echo Coloque este CMD na pasta principal do projeto, onde ficam backend e frontend.
  pause
  exit /b 1
)
if not exist "%ROOT%frontend\package.json" (
  echo [ERRO] Nao encontrei frontend\package.json.
  echo Coloque este CMD na pasta principal do projeto, onde ficam backend e frontend.
  pause
  exit /b 1
)

if not exist "%ROOT%backend\.env" (
  if exist "%ROOT%backend\.env.example" (
    copy /Y "%ROOT%backend\.env.example" "%ROOT%backend\.env" >nul
    echo.
    echo Foi criado backend\.env com valores iniciais.
    echo Confira DB_USER, DB_PASSWORD e DB_NAME no arquivo que sera aberto.
    start "" notepad "%ROOT%backend\.env"
    echo Salve o arquivo e execute Iniciar-Turno.cmd novamente.
    pause
    exit /b 2
  ) else (
    echo [ERRO] backend\.env nao existe e backend\.env.example nao foi encontrado.
    pause
    exit /b 1
  )
)

if not exist "%ROOT%frontend\.env.local" if exist "%ROOT%frontend\.env.local.example" copy /Y "%ROOT%frontend\.env.local.example" "%ROOT%frontend\.env.local" >nul

echo.
echo ========================================
echo  TURNO - verificando dependencias
echo ========================================

if exist "%ROOT%package.json" (
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERRO] A instalacao das dependencias falhou.
    pause
    exit /b 1
  )
  echo.
  echo Iniciando API e frontend...
  call npm run dev
  exit /b %errorlevel%
)

pushd "%ROOT%backend"
echo [1/2] Instalando dependencias da API...
call npm install
if errorlevel 1 (
  popd
  echo [ERRO] Nao foi possivel instalar as dependencias da API.
  pause
  exit /b 1
)
popd

pushd "%ROOT%frontend"
echo [2/2] Instalando dependencias do frontend...
call npm install
if errorlevel 1 (
  popd
  echo [ERRO] Nao foi possivel instalar as dependencias do frontend.
  pause
  exit /b 1
)
popd

echo.
echo Iniciando a API e o frontend em terminais separados...
start "Turno - API" /D "%ROOT%backend" cmd.exe /k "npm run dev"
timeout /t 2 /nobreak >nul
start "Turno - Frontend" /D "%ROOT%frontend" cmd.exe /k "npm run dev"
echo.
echo Site: http://localhost:3000
echo API:  http://localhost:3333
pause
