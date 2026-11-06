@echo off
title AgentOS Backend
cd /d "%~dp0"
echo ===================================================
echo           Starting AgentOS Backend Server          
echo ===================================================
call .venv\Scripts\activate.bat
python run.py
pause

