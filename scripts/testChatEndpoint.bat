@echo off
REM Quick test script for the new chat endpoint (Windows)

echo Testing Chat Endpoint...
echo.

REM Configuration
set ENDPOINT=%1
if "%ENDPOINT%"=="" set ENDPOINT=http://localhost:8888/.netlify/functions/chat

set USER_ID=%2
if "%USER_ID%"=="" set USER_ID=TEST_USER

echo Endpoint: %ENDPOINT%
echo User ID: %USER_ID%
echo.

REM Test 1: Simple greeting
echo Test 1: Simple Greeting
echo ========================================

curl -N -X POST "%ENDPOINT%" -H "Content-Type: application/json" -d "{\"userId\":\"%USER_ID%\",\"employeeSlug\":\"prime-boss\",\"message\":\"Hello, are you there?\",\"stream\":true}"

echo.
echo.

REM Test 2: Non-streaming  
echo Test 2: Non-Streaming Response
echo ========================================

curl -X POST "%ENDPOINT%" -H "Content-Type: application/json" -d "{\"userId\":\"%USER_ID%\",\"employeeSlug\":\"byte-doc\",\"message\":\"What can you help me with?\",\"stream\":false}"

echo.
echo.
echo Tests complete!

