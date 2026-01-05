@echo off
echo Testing compilation...
go build -o test.exe
if %ERRORLEVEL% EQU 0 (
    echo SUCCESS: Compilation successful!
    del test.exe
) else (
    echo FAILED: Compilation errors found
)
