1. Amazon Cognito (User Pools)
How it works: Cognito handles user authentication (registration, sign-in, and verification). When a user registers, they are added to the Cognito user pool (undertone-user-pool). The Flask backend verifies the JSON Web Tokens (JWT) issued by Cognito by downloading Cognito's public JSON Web Key Sets (JWKS) and verifying the token signature, expiry, and claims cryptographically.
Why it is used: Using Cognito avoids building custom password storage, hashing algorithms, and session management. More importantly, it aligns with the project's anonymous identity requirements: no real names or sensitive credentials are ever saved in the primary application database. The backend only tracks the unique sub (user ID) issued by Cognito.
2. Amazon DynamoDB
How it works: This is the primary database. It uses a single-table design with a table named Undertone. All application entities (user profiles, circles, posts, comments, connections, reports, rate limits) are stored in this single table, using structured primary keys (e.g., PK = USER#<id>, SK = PROFILE). Two Global Secondary Indexes (GSI1-circle-listing and GSI2-user-posts) allow efficient queries across circles and post history.
Why it is used: DynamoDB is a fully managed NoSQL database that scales automatically. To ensure zero cost during development/testing, the table uses provisioned throughput configured to stay well within the AWS Free Tier (5 RCU / 5 WCU).
3. Amazon S3 (Simple Storage Service)
How it works: S3 hosts the project's media bucket (undertone-media). It stores user-uploaded images and the audio files generated for posts. Public read access to the bucket is completely blocked. When a user uploads or views an image, the backend generates short-lived presigned S3 URLs (put_object for uploads, expiring in 5 minutes; get_object for views, expiring in 1 hour).
Why it is used: S3 is the industry standard for secure object storage. By blocking public access and using short-lived presigned URLs, the project prevents image hotlinking and unauthorized access to media.
4. AWS Lambda & Amazon API Gateway (WebSocket API)
How it works: These power the real-time chat and notifications. API Gateway manages the persistent WebSocket connections ($connect, $disconnect, and $default routes) and routes the traffic to a serverless Lambda function (undertone-websocket-handler). This Lambda records active connection IDs in DynamoDB and broadcasts real-time messages.
Why it is used: Running a persistent WebSocket server in a traditional container (like Flask) consumes significant memory and CPU. Offloading connection management to API Gateway and Lambda is serverless, cost-effective, and fits seamlessly into the AWS Free Tier.
5. Amazon ECS (Elastic Container Service) with AWS Fargate
How it works: ECS runs the Flask backend API. It deploys the container in a Fargate task configured with minimal resources (0.25 vCPU and 0.5 GB RAM) to minimize billing.
Why it is used: AWS Fargate is a serverless container host. It runs your Docker containers without requiring you to manually provision, configure, or patch virtual machines (EC2).
6. Amazon ECR (Elastic Container Registry)
How it works: It acts as the private container registry hosting the built Docker images (undertone-backend).
Why it is used: It provides a secure place to store container images that AWS ECS can easily and securely pull from during deployment.
7. AWS IAM (Identity and Access Management)
How it works: IAM defines roles and policies (such as undertone-ecs-execution-role and undertone-websocket-lambda-role). These roles grant the ECS tasks and Lambda functions permission to call DynamoDB, S3, Rekognition, and Polly.
Why it is used: It enforces the principle of least privilege, allowing AWS resources to securely interact without storing static, hardcoded credentials inside the application code.
8. Amazon CloudWatch Logs
How it works: Standard output and error logs from the Fargate container are streamed to the /ecs/undertone-backend log group.
Why it is used: Provides centralized logging for monitoring application health, diagnosing bugs, and viewing runtime errors.
9. Amazon Rekognition
How it works: Moderates user-uploaded images (app/services/rekognition.py) before they are shown to other users.
Why it is used: Automatically keeps the platform safe by identifying adult or explicit content. To stay within the free tier, the system counts requests and "fails open" (allowing the image but flagging it for manual moderation) if the monthly free tier budget is reached.
10. Amazon Polly
How it works: Powers the "read aloud" text-to-speech feature (app/services/polly.py) using standard voice syntheses (Joanna). The synthesized audio is saved to S3 (audio/<post_id>.mp3) so repeated listens do not consume additional Polly characters.
Why it is used: Enhances platform accessibility and provides an "introvert-friendly" way of consuming posts without reading fatigue. Like Rekognition, it features a built-in character limit counter to prevent exceeding free-tier limitations.