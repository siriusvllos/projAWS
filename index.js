"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const awsx = require("@pulumi/awsx");

const deployer = new aws.ec2.KeyPair("deployer", {
  publicKey:
    "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPU0SkQsSV1nUypP4lRJ2ASTDZCCpFSMNu06pPEoU4Ry siriusvzevallos@ip-10-0-1-207.sa-east-1.compute.internal",
});
const bucket = new aws.s3.Bucket("images");
exports.bucketName = bucket.id;

const vpc = new awsx.ec2.Vpc("main");
const vpcId = vpc.vpcId;
const privateSubnetIds = vpc.privateSubnetIds;
const publicSubnetIds = vpc.publicSubnetIds;

let size = "t2.micro"; // eh free ta danado :)

let ami = aws.ec2.getAmi({
  filters: [
    {
      name: "name",
      values: ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"],
    },
    {
      name: "virtualization-type",
      values: ["hvm"],
    },
  ],
  //aws ec2 describe-images --owner "aws-marketplace" --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*" "Name=virtualization-type,Values=hvm" --region "sa-east-1"
  owners: ["aws-marketplace"],
  mostRecent: true,
});

let group = new aws.ec2.SecurityGroup("main", {
  vpcId: vpcId,
  ingress: [
    { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
    {
      protocol: "tcp",
      fromPort: 3030,
      toPort: 3030,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  egress: [
    { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
    { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
    { protocol: "tcp", fromPort: 443, toPort: 443, cidrBlocks: ["0.0.0.0/0"] },
  ],
});

// -------------------- CONST USER DATA -----------------------------

const userData = `#!/bin/bash
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
`;
// sudo npm install express ----> instalar todos os pacotes q o catinder requer instead
// tee le uma coisa do teclado e grava num arquivo q eu passei como param

// ------------------- FIM USER DATA -------------------------------

let server = new aws.ec2.Instance("webserver-www", {
  instanceType: size,
  keyName: deployer.keyName,
  vpcSecurityGroupIds: [group.id],
  subnetId: publicSubnetIds[1],
  ami: ami.then((ami) => ami.id),
  userData: userData,
}); // o ip desse cara* vai dentro do route53

const bastion = new aws.route53.Record("bastion", {
  // isirius.link ID ----->>>>> Z02274863NULTFNYSASLO :) <#
  // registro tipo A  ---> https://bastion.isirius.link/
  zoneId: "Z02274863NULTFNYSASLO",
  name: "bastion",
  type: "A",
  ttl: 300,
  records: [server.publicIp], //desse cara*
});

const cost = new aws.budgets.Budget(
  "cost",
  {
    budgetType: "COST",
    limitAmount: "30",
    limitUnit: "USD",
    startTime: "2033-05-25_00:00",
    timeUnit: "MONTHLY",
    notifications: [
      {
        threshold: 100,
        thresholdType: "PERCENTAGE",
        notificationType: "ACTUAL",
        comparisonOperator: "GREATER_THAN",
        subscriberEmailAddresses: [
          "sirusvllos@gmail.com",
          "lrfurtado@gmail.com",
        ],
      },
    ],
  },
  {protect: true}
);

exports.cost = cost.name;
exports.publicIp = server.publicIp; // desse cara*
exports.publicHostName = server.publicDns;
