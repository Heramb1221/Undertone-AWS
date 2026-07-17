1. Amazon Cognito (User Pools)
Replaced Technologies: Auth libraries (e.g., Passport.js, NextAuth.js, Python Flask-Login), self-hosted identity managers (Keycloak, Ory Hydra), and custom database-backed user/password tables (hashing with bcrypt or Argon2).
Advantages:
Built-in Security: Handles password recovery, email/phone verification, multi-factor authentication (MFA), and token signing automatically.
Less Maintenance: No need to manage session tables or worry about secure password storage compliance.
Disadvantages:
Vendor Lock-in: Migrating user accounts (specifically password hashes) out of Cognito to another provider is very difficult.
Customization Limits: Modifying sign-up email templates or styling custom UI flows is highly restricted compared to custom code.
2. Amazon DynamoDB
Replaced Technologies: Relational databases (PostgreSQL, MySQL) using ORMs (like SQLAlchemy or Prisma), or self-hosted NoSQL databases (MongoDB, Cassandra).
Advantages:
Serverless & Scalable: Zero database administration, backup management, or patch installations.
Consistent Performance: Single-digit millisecond response times regardless of data size.
Cost (Free Tier): Provisioned capacity stays completely free under AWS's 25 RCU/WCU threshold.
Disadvantages:
Strict Access Patterns: No relational joins. Requires complex Single-Table Design patterns (like the GSI indexing used here) which makes changing your database schema or running ad-hoc queries later difficult.
Learning Curve: Querying DynamoDB via the AWS SDK requires verbose expression structures rather than simple SQL.
3. Amazon S3
Replaced Technologies: Local server file storage (saving uploads to a /public/uploads folder on your server's SSD) or self-hosted file storage solutions (like MinIO or FTP servers).
Advantages:
Server Load Offloading: Media uploads/downloads bypass the Flask backend entirely, saving your server's network bandwidth and RAM.
Infinite Capacity: No risk of running out of disk space on your web server.
Access Control: Supports short-lived presigned URLs to prevent direct image hotlinking or scraping.
Disadvantages:
Latency: Marginally slower to read/write files than direct local SSD storage.
Egress Costs: Charges are incurred for transferring large amounts of data out of the AWS network.
4. AWS Lambda & API Gateway (WebSockets)
Replaced Technologies: Persistent Node.js/Python socket servers (using Socket.io, ws, or Flask-SocketIO).
Advantages:
Idle Connection Offloading: API Gateway handles keeping the TCP connection open for thousands of connected users, freeing your backend container from keeping threads open.
Serverless Scaling: You only pay when messages are sent (Lambda execution time), rather than paying for a server running 24/7.
Disadvantages:
Stateless Complexity: Because Lambda is stateless, you must store active connections in an external database (DynamoDB) to track who is connected, making broadcasts more complex.
Cold Starts: Initial WebSocket requests can face minor latency spikes if the Lambda hasn't run recently.
5. Amazon ECS with AWS Fargate
Replaced Technologies: Self-managed Virtual Private Servers (VPS) like DigitalOcean Droplets, Linode, AWS EC2 running Docker Compose, or self-hosted Kubernetes clusters.
Advantages:
Serverless Container Orchestration: No physical or virtual servers to manage, patch, secure, or monitor.
Reliability: Replaces failing tasks automatically and distributes them across multiple availability zones.
Disadvantages:
Cost: Fargate charges hourly for vCPU and RAM usage and does not have a perpetual free tier, making it more expensive than a basic $5/month VPS.
Configuration Overhead: Setting up VPCs, subnets, target groups, and security groups is significantly more complex than standard VPS hosting.
6. Amazon Rekognition
Replaced Technologies: Self-hosted Machine Learning frameworks (TensorFlow, PyTorch, or OpenCV) running on GPU-enabled servers, or third-party computer vision APIs (like Clarifai).
Advantages:
Pre-Trained AI: Instant access to advanced image moderation and computer vision without training custom ML models.
No Hardware Costs: No need to lease expensive GPU-equipped server instances.
Disadvantages:
Black Box: You cannot retrain or customize the model; you can only tune confidence thresholds.
Cost at Scale: Standard API calls can become expensive once processing large numbers of daily uploads.
7. Amazon Polly
Replaced Technologies: Open-source text-to-speech engines (e.g., Coqui TTS, eSpeak), or client-side APIs (like the browser's native Web Speech API).
Advantages:
Consistent Audio: Unlike the browser's Web Speech API (which sounds different on Chrome, Safari, iOS, and Android), Polly delivers identical voice synthesis to all users.
Resource Friendly: Offloads speech synthesis processing from your servers.
Disadvantages:
Storage Requirements: Audio files must be stored (cached) in S3 to prevent duplicate billing charges for repeat listens.
Cost for Neural Voices: Premium, human-like neural voices are significantly more expensive than standard voices.