@echo off
setlocal EnableExtensions

REM Versioned one-click Android debug APK builder (standalone script).
REM This file is independent from build-apk.bat.
REM
REM Steps:
REM 1) npm install --legacy-peer-deps
REM 2) clean out/
REM 3) npm run build + force next export
REM 4) npx cap sync android
REM 5) gradle assembleDebug
REM 6) copy APK to dist/apk/gomoku-v<version>-debug-<timestamp>.apk

cd /d "%~dp0"

set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%"

REM Isolated Android/Gradle home to avoid permission/path conflicts.
set "GRADLE_USER_HOME=%~dp0android\.gradle-user-home"
set "ANDROID_USER_HOME=%~dp0android\.android-user-home"
set "ANDROID_PREFS_ROOT="
set "ANDROID_SDK_HOME="

set "APK_SRC=%~dp0android\app\build\outputs\apk\debug\app-debug.apk"
set "APK_OUT_DIR=%~dp0dist\apk"

for /f %%i in ('node -p "require('./package.json').version"') do set "APP_VER=%%i"
if "%APP_VER%"=="" set "APP_VER=unknown"

for /f %%i in ('powershell -NoProfile -Command "(Get-Date).ToString('yyyyMMdd-HHmm')"') do set "BUILD_TS=%%i"
if "%BUILD_TS%"=="" set "BUILD_TS=00000000-0000"

for /f %%i in ('powershell -NoProfile -Command "'1' + (Get-Date).ToString('MMddHHmm')"') do set "APP_VER_CODE=%%i"
if "%APP_VER_CODE%"=="" set "APP_VER_CODE=1"

set "APK_OUT=%APK_OUT_DIR%\gomoku-v%APP_VER%-debug-%BUILD_TS%.apk"
set "NEXT_PUBLIC_APP_VERSION=%APP_VER%"
set "NEXT_PUBLIC_BUILD_STAMP=%BUILD_TS%"

echo ========================================
echo Gomoku APK Versioned Build
echo Project: %CD%
echo JAVA_HOME=%JAVA_HOME%
echo ANDROID_HOME=%ANDROID_HOME%
echo GRADLE_USER_HOME=%GRADLE_USER_HOME%
echo ANDROID_USER_HOME=%ANDROID_USER_HOME%
echo APP_VERSION_NAME=%APP_VER%
echo APP_VERSION_CODE=%APP_VER_CODE%
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

echo [1/7] Checking Java...
"%JAVA_HOME%\bin\java.exe" -version || goto :fail
echo.

echo [2/7] Installing dependencies (legacy peer deps mode)...
call npm install --legacy-peer-deps || goto :fail
echo.

echo [3/7] Building fresh web assets...
if exist "out" (
  echo [INFO] Removing old out\ to prevent stale APK assets...
  rmdir /s /q "out" || goto :fail
)
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

echo [4/7] Syncing Capacitor Android project...
call npx cap sync android || goto :fail
echo.

echo [5/7] Preparing isolated Gradle/Android user dirs...
if not exist "%GRADLE_USER_HOME%" mkdir "%GRADLE_USER_HOME%"
if not exist "%ANDROID_USER_HOME%" mkdir "%ANDROID_USER_HOME%"
if not exist "%ANDROID_USER_HOME%" mkdir "%ANDROID_USER_HOME%"
echo.

echo [6/7] Building debug APK with Gradle...
cd /d "%~dp0android"
call gradlew.bat clean --no-daemon --console=plain || goto :fail
set "ORG_GRADLE_PROJECT_APP_VERSION_NAME=%APP_VER%"
set "ORG_GRADLE_PROJECT_APP_VERSION_CODE=%APP_VER_CODE%"
call gradlew.bat assembleDebug --no-daemon --warning-mode all --console=plain || goto :fail
set "ORG_GRADLE_PROJECT_APP_VERSION_NAME="
set "ORG_GRADLE_PROJECT_APP_VERSION_CODE="
cd /d "%~dp0"
echo.

echo [7/7] Collecting APK artifact...
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
set "ORG_GRADLE_PROJECT_APP_VERSION_NAME="
set "ORG_GRADLE_PROJECT_APP_VERSION_CODE="
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
