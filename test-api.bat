@echo off
echo Testing backend API...
echo.

echo Testing /api/v2/filesystem...
curl -v http://localhost:8000/api/v2/filesystem
echo.
echo.

echo Testing old API /json/pack...
curl -v http://localhost:8000/json/pack
echo.
echo.

pause
