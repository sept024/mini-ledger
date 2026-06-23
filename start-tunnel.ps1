$log = "$env:TEMP\serveo-tunnel.log"
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:localhost:5173 serveo.net > $log 2>&1
