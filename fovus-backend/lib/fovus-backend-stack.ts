import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cognito from "aws-cdk-lib/aws-cognito"; //If Cognito is not used, remove this line
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as path from "path";

export class FovusBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Cognito User Pool
    const userPool = new cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      userVerification: {
        emailSubject: "Verify your email for Fovus",
        emailBody:
          "Hello! Thanks for signing up to Fovus! Your verification code is {####}",
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
    });

    const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
    });

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "FovusAuthorizer",
      {
        cognitoUserPools: [userPool],
        identitySource: "method.request.header.Authorization",
      }
    );

    // 1. S3 Bucket for File Uploads
    const inputBucket = new s3.Bucket(this, "FovusInputBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedOrigins: ["*"],
          allowedMethods: [s3.HttpMethods.PUT],
          allowedHeaders: ["*"],
          exposedHeaders: ["ETag"],
        },
      ],
    });

    // Deploy the scripts to the S3 bucket
    new s3deploy.BucketDeployment(this, "DeployScriptToS3", {
      sources: [s3deploy.Source.asset(path.join(__dirname, "../scripts"))],
      destinationBucket: inputBucket,
      destinationKeyPrefix: "scripts", // Folder path in the bucket
    });

    // 2. DynamoDB Table for storing file metadata
    const fileTable = new dynamodb.Table(this, "FileTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      stream: dynamodb.StreamViewType.NEW_IMAGE,
    });

    // Look up the default VPC
    const vpc = new ec2.Vpc(this, "FovusVpc", {
      maxAzs: 2, // Availability Zones
      natGateways: 0, // Simplify if you're not using private subnets
      subnetConfiguration: [
        {
          name: "public-subnet",
          subnetType: ec2.SubnetType.PUBLIC,
          mapPublicIpOnLaunch: true,
        },
      ],
    });

    // Create a basic security group for EC2
    const ec2SG = new ec2.SecurityGroup(this, "EC2SecurityGroup", {
      vpc,
      description: "Allow EC2 outbound access",
      allowAllOutbound: true,
    });

    ec2SG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      "Allow SSH for EC2 Instance Connect"
    );

    // Create policy with s3 access
    const ec2Policy = new iam.PolicyStatement({
      actions: ["s3:PutObject", "s3:GetObject", "s3:ListBucket"],
      resources: [inputBucket.arnForObjects("*")],
    });

    // Create Policy with dynamodb access
    const ec2Policy2 = new iam.PolicyStatement({
      actions: ["dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:GetItem"],
      resources: [fileTable.tableArn],
    });

    const ec2InstanceRole = new iam.Role(this, "FovusEc2ExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      description: "IAM role for EC2 to access S3 and DynamoDB",
    });
    ec2InstanceRole.addToPrincipalPolicy(ec2Policy);
    ec2InstanceRole.addToPrincipalPolicy(ec2Policy2);

    const instanceProfile = new iam.CfnInstanceProfile(
      this,
      "EC2InstanceProfile",
      {
        roles: [ec2InstanceRole.roleName],
        instanceProfileName: "FovusEc2InstanceProfile",
      }
    );

    // 3. Lambda Function to save metadata to DynamoDB
    const saveMetadataFunction = new lambda.Function(
      this,
      "SaveMetadataFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../lambda/saveMetadata")
        ),
        environment: {
          TABLE_NAME: fileTable.tableName,
        },
      }
    );

    // Grant Lambda permissions to write to DynamoDB
    fileTable.grantWriteData(saveMetadataFunction);

    const presignFunction = new lambda.Function(
      this,
      "GeneratePresignUrlFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../lambda/generatePresignedUrl")
        ),
        environment: {
          BUCKET_NAME: inputBucket.bucketName,
          REGION: this.region,
        },
      }
    );
    inputBucket.grantPut(presignFunction);

    const triggerEc2Function = new lambda.Function(this, "TriggerEc2Function", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../lambda/triggerEc2")),
      environment: {
        BUCKET_NAME: inputBucket.bucketName,
        TABLE_NAME: fileTable.tableName,
        REGION: this.region,
        SUBNET_ID: vpc.publicSubnets[0].subnetId,
        SG_ID: ec2SG.securityGroupId,
      },
    });

    // Grant Lambda permissions to write to DynamoDB
    triggerEc2Function.addEventSource(
      new lambdaEventSources.DynamoEventSource(fileTable, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 1,
        retryAttempts: 2,
      })
    );

    triggerEc2Function.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "ec2:RunInstances",
          "ec2:CreateTags",
          "ec2:DescribeInstances",
          "ec2:TerminateInstances",
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeSubnets",
          "ec2:DescribeVpcs",
          "iam:PassRole",
        ],
        resources: ["*"],
      })
    );

    // Create API Gateway instance
    const api = new apigateway.RestApi(this, "FovusAPI", {
      restApiName: "Fovus Service",
      description: "API for presigned upload and metadata save",
    });

    // /save endpoint
    const saveResource = api.root.addResource("save");

    saveResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(saveMetadataFunction),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
        methodResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
            },
          },
        ],
      }
    );

    saveResource.addCorsPreflight({
      allowOrigins: ["*"],
      allowMethods: ["POST"],
      allowHeaders: ["Content-Type", "Authorization"],
    });

    // /presign endpoint
    const presignResource = api.root.addResource("presign");
    presignResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(presignFunction),
      {
        methodResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
            },
          },
        ],
      }
    );
    presignResource.addCorsPreflight({
      allowOrigins: ["*"],
      allowMethods: ["GET"],
    });

    // Output resources
    new cdk.CfnOutput(this, "S3BucketName", {
      value: inputBucket.bucketName,
    });

    new cdk.CfnOutput(this, "DynamoDBTableName", {
      value: fileTable.tableName,
    });

    new cdk.CfnOutput(this, "APIEndpoint", {
      value: api.url,
    });

    new cdk.CfnOutput(this, "EC2InstanceRoleName", {
      value: ec2InstanceRole.roleName,
    });

    new cdk.CfnOutput(this, "EC2InstanceProfileName", {
      value: instanceProfile.instanceProfileName!,
    });

    new cdk.CfnOutput(this, "SubnetId", {
      value: vpc.publicSubnets[0].subnetId,
    });

    new cdk.CfnOutput(this, "SecurityGroupId", {
      value: ec2SG.securityGroupId,
    });

    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
    });
    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
    });
  }
}
