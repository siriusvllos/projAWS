"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const awsx = require("@pulumi/awsx");
// tentar remover linhas 1 & 4 dps q estiver funcionando

// S3 BUCKET --- IMAGES
const bucket = new aws.s3.Bucket("images");
exports.bucketName = bucket.id;

// VPC --- MAIN
// https://www.pulumi.com/docs/clouds/aws/guides/vpc/
import * as awsx from "@pulumi/awsx";
const vpc = new awsx.ec2.Vpc("main");
export const vpcId = vpc.vpcId;
export const privateSubnetIds = vpc.privateSubnetIds;
export const publicSubnetIds = vpc.publicSubnetIds;

// EC2 --- BASTION
// https://github.com/pulumi/examples/tree/master/aws-js-webserver
let size = "t2.micro"; // eh free ta danado :)
let ami = aws.getAmiOutput({
  filters: [
    {
      name: "name",
      values: ["amzn-ami-hvm-*"],
    },
  ],
  owners: ["537450123218"], // id SiriusADM
  mostRecent: true,
});

// EC2 SECURITY GROUP --- MAIN
let group = new aws.ec2.SecurityGroup("main", {
  ingress: [
    { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
  ],
});

let server = new aws.ec2.Instance("webserver-www", {
  instanceType: size,
  vpcSecurityGroupIds: [group.id], // reference the security group resource above
  ami: ami.id,
});
exports.publicIp = server.publicIp;
exports.publicHostName = server.publicDns;
