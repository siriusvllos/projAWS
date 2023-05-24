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
  ],
});

let server = new aws.ec2.Instance("webserver-www", {
  instanceType: size,
  keyName: deployer.keyName,
  vpcSecurityGroupIds: [group.id],
  subnetId: publicSubnetIds[1],
  ami: ami.then((ami) => ami.id),
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

exports.publicIp = server.publicIp; // desse cara*
exports.publicHostName = server.publicDns;
