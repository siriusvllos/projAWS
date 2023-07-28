"use strict";
const pulumi = require("@pulumi/pulumi");
const fs = require("fs");
const aws = require("@pulumi/aws");
const awsx = require("@pulumi/awsx");
const classic = require("@pulumi/awsx/classic");
const { SizeConstraintSet } = require("@pulumi/aws/waf");

const deployer = new aws.ec2.KeyPair("deployer", {
  publicKey:
    "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPU0SkQsSV1nUypP4lRJ2ASTDZCCpFSMNu06pPEoU4Ry siriusvzevallos@ip-10-0-1-207.sa-east-1.compute.internal",
});
const bucket = new aws.s3.Bucket("images");
exports.bucketName = bucket.id;

const vpc = new awsx.ec2.DefaultVpc("default-vpc");
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
  //aws ec2 describe-images --owner 'aws-marketplace' --filters 'Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*' 'Name=virtualization-type,Values=hvm' --region 'sa-east-1'
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

const userData = fs.readFileSync("./userdata.sh", "ascii");

let server = new aws.ec2.Instance("webserver-catinder", {
  instanceType: size,
  keyName: deployer.keyName,
  vpcSecurityGroupIds: [group.id],
  subnetId: publicSubnetIds[1],
  ami: ami.then((ami) => ami.id),
  userData: userData,
});

const rota = new aws.route53.Record("route-catinder", {
  // isirius.link ID ----->>>>> Z02274863NULTFNYSASLO :) <3
  // registro tipo A  ---> https://catinder.isirius.link/
  zoneId: "Z02274863NULTFNYSASLO",
  name: "catinder",
  type: "A",
  ttl: 300,
  aliases: [{
    evaluateTargetHealth: true,
    name: catinderALB.dnsname,
    zoneId: catinderALB.zoneId,
  },],
  // records: [server.publicIp], // ip publio do ELB
});

const catinderALB = new awsx.lb.ApplicationLoadBalancer("web-traffic", {
  securityGroups: [group.id],
  enableCrossZoneLoadBalancing: true, // se uma zona cair terá servidores em outra :)
});
const listener = alb.createListener("web-listener", {
  port: 80,
  defaultAction: {
    //?
  },
});
export const endpoint = listener.endpoint;

const template = new aws.ec2.LaunchTemplate("template", {
  namePrefix: "webserver-catinder-",
  keyName: deployer.keyName,
  imageId: ami.then((ami) => ami.id),
  instanceType: size,
  subnetId: publicSubnetIds[1],
  networkInterfaces: [
    { associatePublicIpAddress: "true", securityGroups: [group.id] },
  ],
  userData: Buffer.from(fs.readFileSync(`./userdata.sh`), "binary").toString(
    "base64"
  ),
});
const available = aws.getAvailabilityZones({
  state: "available",
});
const names = available.then((available) => available.names);
const autoScalingGroup = new aws.autoscaling.Group("teste-asg", {
  // vpcZoneIdentifiers: vpc.privateSubnetIds, // replace with the IDs of your VPC Subnets
  // availabilityZones: ["sa-east-1a"],
  availabilityZones: names,
  maxSize: 3,
  minSize: 1,
  launchTemplate: {
    id: template.id,
    version: "$Latest",
  },
});
// ISSO EH REFERENTE AO AWSX \/
/* autoScalingGroup.scaleOnSchedule("scaleUpOnThursday", {
  desiredCapacity: 2,
  recurrence: { dayOfWeek: "Thursday" },
});
autoScalingGroup.scaleOnSchedule("scaleDownOnFriday", {
  desiredCapacity: 1,
  recurrence: { dayOfWeek: "Friday" },
}); */

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
  { protect: true }
);

exports.cost = cost.name;
exports.publicIp = server.publicIp; // desse cara*
exports.publicHostName = server.publicDns;
exports.az = names;
