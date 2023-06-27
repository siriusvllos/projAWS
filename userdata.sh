#!/bin/bash
set -x

sudo apt update
sudo apt install nodejs -y
sudo apt install git -y
sudo apt install npm -y

curl -fsSL https://www.mongodb.org/static/pgp/server-4.4.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list
sudo apt update
sudo apt install mongodb-org -y
sudo systemctl start mongod.service
sudo rm /etc/mongod.conf

cat >'/home/ubuntu/.ssh/id_ed25519' <<EOT
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACDqAVUdlFK42+RdcClBPZKzCxYExndvgHpQy76NwEf/0wAAAJhml3lTZpd5
UwAAAAtzc2gtZWQyNTUxOQAAACDqAVUdlFK42+RdcClBPZKzCxYExndvgHpQy76NwEf/0w
AAAEBoWvJiXcF2mqNLQhmqcIUbY3Dn284TZ55KB2U/y1irxeoBVR2UUrjb5F1wKUE9krML
FgTGd2+AelDLvo3AR//TAAAAFXNpcml1c3ZsbG9zQGdtYWlsLmNvbQ==
-----END OPENSSH PRIVATE KEY-----
EOT

cat >'/etc/mongod.conf' << EOT 
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log
net:
  port: 44805
  bindIp: 127.0.0.1
processManagement:
  timeZoneInfo: /usr/share/zoneinfo
EOT
sudo service mongod restart

cat >'/home/ubuntu/.ssh/config' <<EOT
Host github.com            
   StrictHostKeyChecking no
   UserKnownHostsFile=/dev/null    
EOT

sudo chmod 700 /home/ubuntu/.ssh
sudo chmod 600 /home/ubuntu/.ssh/id_ed25519
sudo chown ubuntu:ubuntu -R /home/ubuntu/.ssh

mkdir /home/ubuntu/app
sudo chown ubuntu:ubuntu -R /home/ubuntu/app

id
sudo -u ubuntu git clone git@github.com:siriusvllos/catinder.git /home/ubuntu/app/catinder

cd /home/ubuntu/app/catinder
npm install

cat >'/etc/systemd/system/catinder.service' << EOT 
[Unit]
Description=Esse eh o catinder

[Service]
WorkingDirectory=/home/ubuntu/app/catinder
ExecStart=node server.js

[Install]
WantedBy=multi-user.target
EOT

sudo chmod 664 /etc/systemd/system/catinder.service

sudo systemctl daemon-reload
systemctl start catinder