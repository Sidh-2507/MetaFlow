const { EC2Client, RunInstancesCommand } = require("@aws-sdk/client-ec2");

const region = process.env.REGION;
const ec2 = new EC2Client({ region: region });

const bucketName = process.env.BUCKET_NAME;
const dbName = process.env.TABLE_NAME;

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    if (record.eventName === "INSERT") {
      const id = record.dynamodb.NewImage.id.S;
      const email = record.dynamodb.NewImage.email.S;

      console.log("Processing new record with ID:", id);

      const flag = event.Records[0].dynamodb.NewImage.flag.S;

      if (flag === "False") {
        return {
          statusCode: 200,
          body: JSON.stringify({ message: "Failed" }),
        };
      }

      const userDataScript = `#!/bin/bash
      pip3 install boto3
      aws s3 cp s3://${bucketName}/scripts/script.py /tmp
      chmod +x /tmp/script.py
      python3 /tmp/script.py ${id} ${bucketName} ${dbName} ${email} ${region} >output.txt
      sudo shutdown -h now`;

      const encodedUserData = Buffer.from(userDataScript).toString("base64");

      const params = new RunInstancesCommand({
        ImageId: process.env.IMAGE_ID,
        InstanceType: "t2.micro",
        MinCount: 1,
        MaxCount: 1,
        InstanceInitiatedShutdownBehavior: "terminate",
        IamInstanceProfile: {
          Name: "FovusEc2InstanceProfile",
        },
        //KeyName: "dev",
        NetworkInterfaces: [
          {
            DeviceIndex: 0,
            SubnetId: process.env.SUBNET_ID,
            Groups: [process.env.SG_ID],
            AssociatePublicIpAddress: true,
          },
        ],
        UserData: encodedUserData,
        TagSpecifications: [
          {
            ResourceType: "instance",
            Tags: [{ Key: "Name", Value: "FovusEc2" }],
          },
        ],
      });

      try {
        const result = await ec2.send(params);
        console.log(
          "EC2 instance launched successfully:",
          JSON.stringify(result)
        );
      } catch (error) {
        console.error("Error launching EC2 instance:", error);
      }
    } else {
      console.log("Skipped non-INSERT event.");
    }
  }

  return { statusCode: 200, body: "Trigger processed" };
};
