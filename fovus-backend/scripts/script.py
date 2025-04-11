import boto3
import sys
import uuid


#Fetch input metadata from DynamoDB
def getDBItem(id,table,region):
    tableName = table
    dynamodb_client = boto3.client('dynamodb', region_name=region)
    response = dynamodb_client.get_item(
        TableName=tableName,
        Key={'id': {'S': id}}
    )
    return response['Item']

#download file from s3 bucket
def downloadFiles3(item,bucket):
    s3 = boto3.resource('s3')
    s3_url = item['inputFilePath']['S']
    if s3_url.startswith("http"):
        fullKey = s3_url.split(".com/")[-1]
    else:
        fullKey = s3_url
    
    bucket_name = bucket
    
    local_path = '/tmp/input.input'
    s3.Bucket(bucket_name).download_file(fullKey, local_path)
    return fullKey, local_path


def updateFiles3( bucket, item):
    s3 = boto3.client('s3')
    input_text = item['inputText']['S']
    input_path = item['inputFilePath']['S']

    # Extract folder from inputFilePath 
    folder = input_path.split("/")[-2] if "/" in input_path else ""

    # Build output file name
    output_file_name = input_text.replace(" ", "") + ".output"

    # Combine to full key
    full_output_key = f"{folder}/{output_file_name}"

    # Write local output file
    local_output_path = f"/tmp/{output_file_name}"
    content = input_text + f" and length: {len(input_text)}"
    with open(local_output_path, "w") as f:
        f.write(content)

    # Upload to S3
    s3.upload_file(local_output_path, bucket, full_output_key)

    return full_output_key

#insert updation into dynamodb table
def insertDB(full_output_key,table,bucket,email,region):
    table_name =table
    
    full_path = f'{bucket}/{full_output_key}'
    dynamodb_client = boto3.client('dynamodb', region_name=region)
    data = dynamodb_client.put_item(
        TableName=table_name,
        Item={
            'id': {'S': str(uuid.uuid4())},
            'email': {'S': email},
            'outputFilePath': {'S': full_path},
            'flag' : {'S': 'False'}
        }
    )


if __name__ == "__main__":
    if len(sys.argv) != 6:
        print("Usage: python script.py <id> <bucket> <table> <email> <region>")
        sys.exit(1)
    id = sys.argv[1]
    bucket=sys.argv[2]
    table=sys.argv[3]
    email = sys.argv[4]
    region = sys.argv[5]
    print(id,bucket,table,email,region)

    # Invoking Function
    # Get DB item
    item = getDBItem(id,table,region)
    
    # Download file
    s3_key, local_input_file = downloadFiles3(item, bucket)
    
    # Update file
    output_key = updateFiles3(bucket, item)
    
    # Insert into DB for output
    insertDB(output_key, table, bucket,email,region)