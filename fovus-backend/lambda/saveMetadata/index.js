const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const dbClient = new DynamoDBClient({});
const dbDocclient = DynamoDBDocumentClient.from(dbClient);

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { id, inputText, inputFilePath, email } = body;

    if (!id || !inputText || !inputFilePath) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ message: "Missing fields in request" }),
      };
    }

    const params = {
      TableName: process.env.TABLE_NAME,
      Item: {
        id: id,
        email: email,
        inputText: inputText,
        inputFilePath: inputFilePath,
        flag: "True",
      },
    };

    //await dbClient.send(new PutItemCommand(params)); //To use dbClient
    await dbDocclient.send(new PutCommand(params)); //To use dbDocumentClient

    const response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ message: "Metadata saved successfully" }),
    };

    console.log("Lambda Success Response:", response);

    return response;
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
