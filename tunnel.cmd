@echo off
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:localhost:5173 nokey@localhost.run > "%TEMP%\tunnel-url.txt" 2>&1
