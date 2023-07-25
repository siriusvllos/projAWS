// I ASKED PULUMI AI:
// Could you please tell me how to use aws.autoscaling.Group to double my number of instances on the first ten minutes of every hour?

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// Note: You'll need to provide the desired initialCapacity and maxCapacity for your use case
let initial = 2;
let maxCapacity = 20;

// Create a security group that allows inbound SSH.
let group = new aws.ec2.SecurityGroup("web-secgrp", {
    ingress: [
        { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
    ],
});

// Create a launch configuration using an Amazon Linux AMI.
let launchConfig = new aws.ec2.LaunchConfiguration("web-launchconfig", {
    instanceType: "t2.micro",
    securityGroups: [ group.id ],
    imageId: pulumi.output(aws.getAmi({
        filters: [
            { name: "name", values: ["amzn-ami-hvm-*-x86_64-ebs"] },
        ],
        owners: ["137112412989"], // This owner ID is Amazon
        mostRecent: true,
    }, { async: true })).imageId,
});

// Create an autoscaling group using the previously defined launch configuration
 autoScalingGroup = new aws.autoscaling.Group("web-autoscalinggroup", {
    desiredCapacity: initialCapacity,
    maxSize: maxCapacity,
    minSize: initialCapacity,
    launchConfiguration: launchConfig.id,
    availabilityZones: [ "us-east-1a" ], 
    // you might want to fetch the availability zones dynamically or pass as config
});

// Defines an AWS Lambda function, which will be used to scale your instances.
let scalingLambda = new aws.lambda.Function("scalingLambdaFunction", {
    runtime: aws.lambda.DotnetCore2d1Runtime,
    code: new pulumi.asset.FileArchive("lambda-scaling"), // Your local directory with code
    timeout: 300,
    handler: "AWSLambdaScaling::AWSLambdaScaling.Function::FunctionHandler", 
    // replace this with the correct input for your code
    environment: {
        variables: {
            "autoscaling_group_name": autoScalingGroup.name
        },
    },
    role: lambdaRole.arn, // make sure the IAM Role used by this Lambda function has the necessary permissions
});

// Create a CloudWatch event rule to run every hour
let hourlySchedule = new aws.cloudwatch.EventRule("hourlySchedule", {
    scheduleExpression: "rate(1 hour)",
});

// Set Cloudwatch to trigger the lambda function
let lambdaTarget = new aws.cloudwatch.EventTarget("lambdaTarget", {
    rule: hourlySchedule.name,
    arn: scalingLambda.arn,
});

// Export the name of the bucket
export const bucketName = bucket.id;
