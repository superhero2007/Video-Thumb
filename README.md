# node-contentapi
Node.js based Content APIs

# Lambda Functions

We use AWS Lamba functions for asynchronous processing.
The node-contentapi code calls lambdas through the AWS API Gateway

## Packaging Lambda functions

## Configuring Lambdas in AWS

In this example we'll show the setup for the video thumbnail through the UI.  There is a way to use a **yaml** file to declare it, which should be explored

- Upload the packaged zip file to S3.  Currently using the hashplay-filestorage/lambda location
- Go to Lambda and select **Create A Lambda Function**

    - Select **Blank Function**
    - Hit **Next**
    - Enter Deatils

        - Name: lamda_video_thumbnail_generation
        - Description: Generates a thumbnail for mp4 videos
        - Runtime: Latest Node.js
        - Code entry type: Upload a file from Amazon S3
        - S3 link URL: Enter from wherever you uploaded it in S3
        - Handler: video_thumbnail_handler.handler
        - Role: Choose an existing role
        - Existing Role: iam_fastload_lambda_execution
        - Memory: 256
        - Timeout: 45
        - DLQ Resource: SNS
        - SNS Topic: ElasticBeanstalkNotification-Environment-dev
        - VPC: No VPC
        - KMS key: (default) aws/lambda
        - Hit **Next**

- Test the lambda
- Select Actions->Configure Test Event
- Enter the following json

```json
{
  "resource": "/videothumb",
  "path": "/videothumb",
  "httpMethod": "POST",
  "headers": null,
  "queryStringParameters": null,
  "pathParameters": null,
  "stageVariables": null,
  "requestContext": {
    "accountId": "976063035409",
    "resourceId": "oz0c80",
    "stage": "test-invoke-stage",
    "requestId": "test-invoke-request",
    "identity": {
      "cognitoIdentityPoolId": null,
      "accountId": "976063035409",
      "cognitoIdentityId": null,
      "caller": "976063035409",
      "apiKey": "test-invoke-api-key",
      "sourceIp": "test-invoke-source-ip",
      "cognitoAuthenticationType": null,
      "cognitoAuthenticationProvider": null,
      "userArn": "arn:aws:iam::976063035409:root",
      "userAgent": "Apache-HttpClient/4.5.x (Java/1.8.0_102)",
      "user": "976063035409"
    },
    "resourcePath": "/videothumb",
    "httpMethod": "POST",
    "apiId": "mhxkv2pjs5"
  },
  "body": "{\"bucket_name\":\"hashplay-capi-dev\",\"media_key\":\"mediadev/pete_1482443305526.mp4\"}"
}
```

It's important that in the body json, the media_key points to a valid S3 item.

## Configuring the API Gateway

The API Gateway provides the method for calling our lambda functions.

- Within the AWS console, navigate to Application Services -> API Gateway
- Select **Create API**
- Select **New API**

    - API name: VideoThumbnailGeneration
    - Description: Proxy for calling Video Thumbnail Generation Lambda
    - Hit **Create API**

- Locate the / entry in the Resources section of the UI and select Actions-> Create Resource

    - Resource Name: videothumb
    - It should auto-populate Resource Path with /videothummb
    - Hit **Create Resource**

- /videothumb should now be selected, select Actions->Create Method

    - Find POST in the dropdown, and hit the checkbox
    - Integration type: Lambda Function
    - Lambda Region: us-east-1
    - Lambda Function: lambda_video_thumbnail_generation

- Test the API with a sample document (TBD)
- Deploy the API
- Create a "dev" stage
- Create a "beta" stage
- Take the ARN for those stages and add them to the IAM policy so that the users used by the BE can make api gateway calls successfully

## Fastload Image Generation

## Video Thumbnail Generation


# Build and Release Process
**Note: below are the old instructions**; they are left here for reference only. Now, Jenkins does the build automatically, so the way to deploy a new release is to do the following:

1. Wait until Jenkins finishes building.
2. In the github web interface, navigate to the node-contentapi repo (you are probably already there if you are reading this) and click on "Releases" near the top.
3. Download the node-hashplay-contentapi-xxx.zip file by clicking on it.
4. Go to the "Releasing" section of the old instructions below, but skip step 5 completely.

### OLD BUILD NOTES - Start Here for Reference Only
## Packaging and Releasing a Build

#### Prerequisites
1. You can access github (i.e. you have your keys setup and can clone a repository)
2. You have some tool to create zip files

#### Packaging
This assumes you're using ~/src as your working folder

1. Get the latest **node-contenapi** 
  1. clone the repo if you dont have it: `git clone git@github.com:HashplayInc/node-contentapi.git`
  2. if you already have it: 
    * `cd node-contentapi`
    * `git checkout master`
    * `git fetch; git merge`
2. Get the latest **data-democontent**
  1. clone the repo if you dont have it: `git clone git@github.com:HashplayInc/data-democontent.git`
  2. if you already have it: 
    * `cd data-democontent`
    * `git checkout master`
    * `git fetch; git merge`
3. Copy the contents of the **data-democontent** into **node-contentapi/data/**
  * `cd ~/node-contentapi`
  * if there is no data dir, then `mkdir data`
  * if there is a data dir, delete it `rm -rf data`, then `mkdir data`. This insures you dont have any data in the directory that got deleted
  * `cp -R ~/data-democontent/* data/`
4. Generate the zip file named **com-hashplay-contentapi.zip**
  * Include the following files:
    * app.js
    * broadcast_provider.js
    * broadcasts_dirprovider.js
    * cached_renderer.js
    * data/
    * package.json
    * titles_dirprovider.js
  * If you have zip in your command line you can use this: `zip -r com-hashplay-contentapi-0.0.6-3.zip *.js data/ package.json`
5. You should now have a zip file called **com-hashplay-contentapi.zip**

#### Releasing
  
1. Log into https://console.aws.amazon.com
2. Go into Elastic Beanstalk
3. Select **hashplay-dev** environment
4. Look at what is listed under "Running Version". It should be something like "com-hashplay-contentapi-0.0.6-1"
5. Now look in node-contentapi/app.js at the top line: var version = 'x.y.z'.  If the version is the same as the version that is already released, then you're really just updating content, so do not change the version number, instead, just increment the number after the dash, and rename your zip file: com-hashplay-contentapi-0.0.6-2.zip
6. Click the "Upload and Deploy", then click "Choose File" in the dialog that pops up.
7. Browse to your zip file and select it and hit ok. The dialog will disappear
8. The Version Label field should auto-populate with the name of your zip file, but without the extension
9. Hit Deploy and wait for AWS magic.
10. Now verify all the apis work.
