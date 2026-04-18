@echo off
setlocal EnableExtensions

REM One-click Android debug APK builder for this project.
REM Steps:
REM 1) npm install
REM 2) npm run build
REM 3) ensure static out/ exists (try next export if missing)
REM 4) npx cap sync android
REM 5) gradle assembleDebug
REM 6) copy APK to dist/apk/app-debug.apk

cd /d "%~dp0"

set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%"
set "APK_SRC=%~dp0android\app\build\outputs\apk\debug\app-debug.apk"
set "APK_OUT_DIR=%~dp0dist\apk"
set "APK_OUT=%APK_OUT_DIR%\app-debug.apk"
set "GRADLE_USER_HOME=%~dp0android\.gradle-user-home"
set "ANDROID_USER_HOME=%~dp0android\.android-user-home"
set "ANDROID_PREFS_ROOT="
set "ANDROID_SDK_HOME="

echo ========================================
echo Gomoku APK One-Click Build
echo Project: %CD%
echo JAVA_HOME=%JAVA_HOME%
echo ANDROID_HOME=%ANDROID_HOME%
echo ========================================
echo.

where node >nul 2>&1 || (
  echo [ERROR] Node.js not found in PATH.
  goto :fail
)

where npm >nul 2>&1 || (
  echo [ERROR] npm not found in PATH.
  goto :fail
)

if not exist "android\gradlew.bat" (
  echo [ERROR] android\gradlew.bat not found.
  goto :fail
)

if not exist "%JAVA_HOME%\bin\java.exe" (
  echo [ERROR] Java runtime not found at: %JAVA_HOME%\bin\java.exe
  goto :fail
)

echo [1/6] Checking Java...
"%JAVA_HOME%\bin\java.exe" -version || goto :fail
echo.

echo [2/6] Installing dependencies (legacy peer deps mode)...
call npm install --legacy-peer-deps || goto :fail
echo.

echo [3/6] Building web assets...
if "%NEXT_PUBLIC_MULTIPLAYER_SERVER_URL%"=="" (
  for /f "usebackq tokens=1,* delims==" %%A in (".env.local") do (
    if /I "%%A"=="NEXT_PUBLIC_MULTIPLAYER_SERVER_URL" set "NEXT_PUBLIC_MULTIPLAYER_SERVER_URL=%%B"
  )
)

if "%NEXT_PUBLIC_MULTIPLAYER_SERVER_URL%"=="" (
  echo [ERROR] NEXT_PUBLIC_MULTIPLAYER_SERVER_URL is not set.
  echo         Example:
  echo         set NEXT_PUBLIC_MULTIPLAYER_SERVER_URL=https://your-server.example.com
  goto :fail
)

call node scripts\toggle-static-export.mjs enable || goto :fail
for /f %%i in ('node -p "require('./package.json').version"') do set "NEXT_PUBLIC_APP_VERSION=%%i"
for /f %%i in ('powershell -NoProfile -Command "(Get-Date).ToString('yyyyMMdd-HHmm')"') do set "NEXT_PUBLIC_BUILD_STAMP=%%i"
set "NEXT_OUTPUT_MODE=export"
call npm run build || goto :restore_fail
set "NEXT_OUTPUT_MODE="
set "NEXT_PUBLIC_APP_VERSION="
set "NEXT_PUBLIC_BUILD_STAMP="
call node scripts\toggle-static-export.mjs restore || goto :fail

if not exist "out\index.html" (
  echo [ERROR] Static web dir out\ is missing.
  echo         Ensure NEXT_OUTPUT_MODE=export is applied during APK build.
  goto :fail
)
echo.

echo [4/6] Syncing Capacitor Android project...
call npx cap sync android || goto :fail
echo.

echo [5/6] Building debug APK with Gradle...
if not exist "%GRADLE_USER_HOME%" mkdir "%GRADLE_USER_HOME%"
if not exist "%ANDROID_USER_HOME%" mkdir "%ANDROID_USER_HOME%"
cd /d "%~dp0android"
call gradlew.bat clean --no-daemon || goto :fail
call gradlew.bat assembleDebug --no-daemon --warning-mode all || goto :fail
cd /d "%~dp0"
echo.

echo [6/6] Collecting APK artifact...
if not exist "%APK_SRC%" (
  echo [ERROR] APK not found: %APK_SRC%
  goto :fail
)

if not exist "%APK_OUT_DIR%" mkdir "%APK_OUT_DIR%"
copy /Y "%APK_SRC%" "%APK_OUT%" >nul || goto :fail

echo.
echo ========================================
echo BUILD SUCCESSFUL
echo ========================================
echo APK:
echo   %APK_SRC%
echo Copied to:
echo   %APK_OUT%
echo.
pause
exit /b 0

:fail
set "NEXT_OUTPUT_MODE="
set "NEXT_PUBLIC_APP_VERSION="
set "NEXT_PUBLIC_BUILD_STAMP="
call node scripts\toggle-static-export.mjs restore >nul 2>&1
echo.
echo ========================================
echo BUILD FAILED
echo ========================================
echo Check logs above and fix the first error.
echo.
pause
exit /b 1

:restore_fail
set "NEXT_OUTPUT_MODE="
set "NEXT_PUBLIC_APP_VERSION="
set "NEXT_PUBLIC_BUILD_STAMP="
call node scripts\toggle-static-export.mjs restore >nul 2>&1
goto :fail
