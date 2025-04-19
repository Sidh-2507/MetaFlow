# Fovus Coding Challenge Submission — Siddharth Trivedi

This is a full-stack serverless web application built using AWS CDK, Cognito, Lambda, EC2, S3, DynamoDB, and React. It enables authenticated users to upload a file via a secure web interface. The file is stored in S3, metadata is saved in DynamoDB, and an EC2 instance is triggered to process the input and generate an output file — all without any manual intervention.

---

## Project Structure

fovus-Task/
├── backend/ # AWS CDK + Lambda functions
├── frontend/ # React app with Cognito authentication
├── README.md # ← You're here

## Technologies Used

- AWS CDK (TypeScript)
- AWS Cognito (User Pool for login)
- S3 (private storage for input/output files)
- DynamoDB (metadata storage)
- EC2 (dynamically launched to process input)
- Lambda (API backend + DynamoDB stream trigger)
- API Gateway (protected with Cognito Authorizer)
- React (frontend UI)
- TailwindCSS + Flowbite (responsive UI components)

## Setup & Deployment Guide (from Scratch)

### Prerequisites

- Node.js & npm
- AWS CLI configured (`aws configure`)
- AWS CDK installed globally:
  ```bash
  npm install -g aws-cdk
  ```

### Steps of deployement

1. Clone the Project

--git clone https://github.com/Sidh-2507/Fovus-Task-Code.git
--cd fovus-challenge

2. Deploy Backend with CDK

--cd backend/
--npm install
--cdk bootstrap
--cdk deploy --all

3. Create Cognito Test User (in AWS Console)
   Go to the Cognito User Pool created by CDK → "Users and Groups" → Create user:

   Username: fovustester

   Temporary Password: Fovus@123

   Uncheck "Send invitation email"

   Confirm user manually if needed

4. go to the frontend

   cd ../frontend/

   Change the environment variables in .env file

   like this all:
   REACT_APP_USER_POOL_ID=your_user_pool_id
   REACT_APP_USER_POOL_CLIENT_ID=your_app_client_id
   REACT_APP_API_BASE_URL=https://your-api-gateway-id.execute-api.region.amazonaws.com/prod

5. install dependencies and run the app:

   npm install
   npm start

6. Full Application Flow

   1. User logs in with Cognito (username: fovustester)

   2. Enters text input and uploads .input file (e.g., test.input)

   3. File is uploaded directly to S3:
      s3://[bucket-name]/[username]/test.input

   4. Metadata is saved in DynamoDB:
      {
      id: "auto-generated",
      inputText: "your-fullName",
      inputFilePath: "bucket/username/yourfile.input"
      }

   5. DynamoDB stream triggers Lambda → Launches EC2

   6. EC2:

      Fetches file and text

      Appends: [File Content] + [FullName] and length

      Uploads output to: s3://[bucket-name]/[username]/Krima.output

      Updates DynamoDB with:

      {
      id: "user@example.com",
      outputFilePath: "bucket/username/user.output"
      }

   7. Test User Credentials
      Use this test user to verify the application:

      Username: fovustester
      Password: Fovus@123

   8. inside the DemoOutput folder every output photoes are attached.
      Inside the /demo folder:

      Screenshots of
      S3 files
      DynamoDB entry samples
      Output file example
      Ec2 instance instialization and termination
      amplify hosted frontend only for CI/CD

7. The implemented bonus points:

   - **AWS Cognito as API Gateway Authorizer**  
     All API routes are protected using Cognito User Pool-based authorization. Only authenticated users can access the backend.

   - **Frontend Hosted with Amplify (CI/CD Enabled)**  
     The React frontend is deployed on AWS Amplify Hosting. CI/CD is configured to trigger deployments from the `main` branch automatically.

   - **One Folder Per User in S3**  
     Each user has their own folder inside the S3 bucket, named by their Cognito identity or username. Input and output files are scoped to their folder only.

   - **Responsive UI Built with TailwindCSS + React**  
     The frontend uses TailwindCSS with Flowbite components to provide a clean, modern, and fully responsive user experience across devices.

8. Full screen recording of app flow, Code Process and implementation is here uploaded on drive

   - Screen Recorder Video Link - :https://drive.google.com/file/d/17AH9-RVG6NsVhbt7AIrkK2VUE4Pa8SAR/view?usp=sharing

9. Security Best Practices Followed
   No AWS credentials in frontend/backend code
   All file uploads use secure, temporary credentials
   API Gateway protected by Cognito Authorizer
   One folder per user in S3 (no public access)/(no shared)
   EC2 auto-terminated after job is done

10. Citations

- AWS Documentation – [Amazon Cognito Developer Guide](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)
- AWS Documentation – [CDK API Reference (TypeScript)](https://docs.aws.amazon.com/cdk/api/v2/)
- AWS Documentation – [S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html)
- Stack Overflow – [How to trigger EC2 from Lambda using SDK](https://stackoverflow.com/questions/59061867/aws-lambda-to-launch-ec2-instance)
- Medium – [Using AWS CDK to deploy Cognito + API Gateway + Lambda](https://medium.com/geekculture/aws-cdk-cognito-lambda-api-gateway-9292ee9b9855)
- Stack Overflow – [How to upload a file to S3 using JavaScript in browser](https://stackoverflow.com/questions/42956250/uploading-a-file-to-aws-s3-using-javascript)
- Medium – [How to generate and use pre-signed S3 URLs in Node.js](https://medium.com/@pauloddr/aws-s3-upload-files-securely-using-pre-signed-urls-5ffb7e1a83e)
