const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");

const dbClient = new DynamoDBClient({});

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
        id: { S: id },
        email: { S: email },
        inputText: { S: inputText },
        inputFilePath: { S: inputFilePath },
        flag: { S: "True" },
      },
    };

    await dbClient.send(new PutItemCommand(params));

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
