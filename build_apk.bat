@echo off
echo ====================================================
echo  Compilation locale de l'APK NT Albey (Android)
echo ====================================================
echo.

cd /d "%~dp0\app\android"
if not exist "gradlew.bat" (
    echo [ERREUR] gradlew.bat introuvable dans app\android !
    pause
    exit /b 1
)

echo Demarrage de Gradle assembleRelease...
call gradlew.bat assembleRelease

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ====================================================
    echo [SUCCES] APK compile avec succes !
    echo Emplacement : app\android\app\build\outputs\apk\release\app-release.apk
    echo ====================================================
    explorer "%~dp0\app\android\app\build\outputs\apk\release"
) else (
    echo.
    echo [ERREUR] La compilation a echoue. Verifiez les logs ci-dessus.
)

pause
