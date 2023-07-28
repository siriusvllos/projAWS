import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const defaultVpc = aws.ec2.getDefaultVpc({});
const defaultSubnet = defaultVpc.then(defaultVpc => aws.ec2.getSubnetIds({vpcId: defaultVpc.id}));
const exampleSecurityGroup = new aws.ec2.SecurityGroup("exampleSecurityGroup", {vpcId: defaultVpc.id});

const exampleAlb = new aws.lb.LoadBalancer("exampleAlb", {
        internal: false, // This will be a public-facing load balancer
        securityGroups: [exampleSecurityGroup.id], // Attach the previously created Security Group
        subnets: defaultSubnet.then(defaultSubnet => defaultSubnet.ids), // Use all Subnets from the default VPC
        loadBalancerType: "application",
    });

const exampleTargetGroup = new aws.lb.TargetGroup("exampleTg", {
    port: 80,
    protocol: "HTTP",
    targetType: "instance",
    vpcId: defaultVpc.id,
});
  
const exampleListener = new aws.lb.Listener("example", {
    loadBalancerArn: exampleAlb.arn,
    port: 80,
    defaultActions: [{
        type: "forward",
        targetGroupArn: exampleTargetGroup.arn,
    }],
});

// Create Route 53 record
const exampleId = aws.route53.getZone({ name: "example.com" }, { async: true }).then(zone => zone.zoneId);
new aws53.Record("exampleRecord", {
    name: "www.example.com",
    type: "A",
    zoneId: exampleZoneId,
    aliases:[{
        evaluateTargetHealth: true,
        name: exampleAlb.dnsName,
        zoneId: exampleAlb.zoneId,
    }],
});

// Export the DNS name of the ALB 
export const dnsName = exampleAlb.dnsName;