"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const awsx = require("@pulumi/awsx");
// tentar remover linhas 1 & 4 dps q estiver funcionando

const deployer = new aws.ec2.KeyPair("deployer", {
  publicKey:
    "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPU0SkQsSV1nUypP4lRJ2ASTDZCCpFSMNu06pPEoU4Ry siriusvzevallos@ip-10-0-1-207.sa-east-1.compute.internal",
});
// S3 BUCKET --- IMAGES
const bucket = new aws.s3.Bucket("images");
exports.bucketName = bucket.id;

// VPC --- MAIN
// https://www.pulumi.com/docs/clouds/aws/guides/vpc/
const vpc = new awsx.ec2.Vpc("main");
const vpcId = vpc.vpcId;
const privateSubnetIds = vpc.privateSubnetIds;
const publicSubnetIds = vpc.publicSubnetIds;

// EC2 --- BASTION
// https://github.com/pulumi/examples/tree/master/aws-js-webserver
let size = "t2.micro"; // eh free ta danado :)

let amiPromise = aws.ec2.getAmi(
  {
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
// aws ec2 describe-images --owner "aws-marketplace" --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*" "Name=virtualization-type,Values=hvm" --region "sa-east-1"
    mostRecent: true,
    owners: ["aws-marketplace"], // Canonical is the owner of official Ubuntu AMIs 
  },
   // { provider: new aws.Provider("aws-sa-east-1", { region: "sa-east-1" }) }
);
var amiFinal = amiPromise.then((ami) => ami); // istoe funcao anonima ou lambda

// EC2 SECURITY GROUP --- MAIN
let group = new aws.ec2.SecurityGroup("main", {
  vpcId: vpcId,
  ingress: [
    { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
  ],
});

let server = new aws.ec2.Instance("webserver-www", {
  instanceType: size,
  keyName: deployer.keyName,
  vpcSecurityGroupIds: [group.id],
  subnetId: privateSubnetIds[1],
  // ami: "ami-0b7af114fb404cd23",
  ami: amiFinal.id,
});
exports.publicIp = server.publicIp;
exports.publicHostName = server.publicDns;
