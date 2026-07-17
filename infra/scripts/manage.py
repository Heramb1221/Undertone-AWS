"""
Undertone infrastructure manager.
Mirrors the up / status / down pattern from CineBook.

Usage:
    python manage.py up        # provision Cognito User Pool + DynamoDB table + ECR repo
    python manage.py status    # check what's currently running and its billing risk
    python manage.py down      # tear down everything billable

Requires AWS credentials configured locally (aws configure / environment vars)
with permissions for cognito-idp, dynamodb, ecr, ecs, sts.

Region: ap-south-1 (default). Rekognition/Polly/DiceBear-related resources,
if ever provisioned via this script, should use us-east-1 per Architecture.md.
"""

import sys
import os
import json
import boto3
from botocore.exceptions import ClientError

REGION = "ap-south-1"
PROJECT_TAG = {"Key": "Project", "Value": "Undertone"}
TABLE_NAME = "Undertone"
USER_POOL_NAME = "undertone-user-pool"
ECR_REPO_NAME = "undertone-backend"
BUCKET_NAME = "undertone-media"  # must be globally unique — see note in create_bucket()

cognito = boto3.client("cognito-idp", region_name=REGION)
dynamodb = boto3.client("dynamodb", region_name=REGION)
ecr = boto3.client("ecr", region_name=REGION)
s3 = boto3.client("s3", region_name=REGION)
lambda_client = boto3.client("lambda", region_name=REGION)
apigatewayv2 = boto3.client("apigatewayv2", region_name=REGION)
iam = boto3.client("iam", region_name=REGION)
ecs = boto3.client("ecs", region_name=REGION)
ec2 = boto3.client("ec2", region_name=REGION)
logs_client = boto3.client("logs", region_name=REGION)
sts = boto3.client("sts", region_name=REGION)


def _account_id():
    return sts.get_caller_identity()["Account"]


def create_user_pool():
    """Cognito User Pool — email/phone signup, no real-name field collected."""
    try:
        pool_id = None
        existing = cognito.list_user_pools(MaxResults=60)
        for pool in existing["UserPools"]:
            if pool["Name"] == USER_POOL_NAME:
                pool_id = pool["Id"]
                print(f"[skip] User pool '{USER_POOL_NAME}' already exists: {pool_id}")
                break

        if not pool_id:
            response = cognito.create_user_pool(
                PoolName=USER_POOL_NAME,
                AutoVerifiedAttributes=["email"],
                UsernameAttributes=["email"],
                Policies={
                    "PasswordPolicy": {
                        "MinimumLength": 8,
                        "RequireUppercase": True,
                        "RequireLowercase": True,
                        "RequireNumbers": True,
                        "RequireSymbols": False,
                    }
                },
                Schema=[
                    {"Name": "email", "Required": True, "Mutable": True},
                ],
                UserPoolTags={"Project": "Undertone"},
            )
            pool_id = response["UserPool"]["Id"]
            print(f"[created] User pool: {pool_id}")

        # Check if client exists
        existing_clients = cognito.list_user_pool_clients(UserPoolId=pool_id, MaxResults=60).get("UserPoolClients", [])
        client_id = None
        for client in existing_clients:
            if client["ClientName"] == "undertone-web-mobile-client":
                client_id = client["ClientId"]
                cognito.update_user_pool_client(
                    UserPoolId=pool_id,
                    ClientId=client_id,
                    ClientName="undertone-web-mobile-client",
                    ExplicitAuthFlows=["ALLOW_USER_SRP_AUTH", "ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"],
                )
                print(f"[skip] App client '{client['ClientName']}' already exists: {client_id} (updated with ALLOW_USER_SRP_AUTH)")
                break

        if not client_id:
            client_response = cognito.create_user_pool_client(
                UserPoolId=pool_id,
                ClientName="undertone-web-mobile-client",
                GenerateSecret=False,
                ExplicitAuthFlows=["ALLOW_USER_SRP_AUTH", "ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"],
            )
            print(f"[created] App client: {client_response['UserPoolClient']['ClientId']}")

        return pool_id
    except ClientError as e:
        print(f"[error] Cognito setup failed: {e}")
        raise


def create_table():
    """Single-table DynamoDB design per Architecture.md — provisioned capacity, not on-demand, to stay in free tier.

    GSI1: list/browse all Circles, sorted by name (GSI1PK="CIRCLE", GSI1SK=circle_name).
    GSI2: a user's post history (GSI2PK="USER#<authorId>", GSI2SK=created_at).

    Circle-name UNIQUENESS is deliberately NOT enforced via a GSI (GSIs are eventually
    consistent — a race could let two identically-named Circles slip through). Instead,
    uniqueness uses an atomic conditional write on a CIRCLENAME# item, the same pattern
    used for concurrency-safety in the CineBook seat-booking logic. See models/circle.py.
    """
    try:
        dynamodb.describe_table(TableName=TABLE_NAME)
        print(f"[skip] Table '{TABLE_NAME}' already exists")
        return
    except ClientError as e:
        if e.response["Error"]["Code"] != "ResourceNotFoundException":
            raise

    dynamodb.create_table(
        TableName=TABLE_NAME,
        AttributeDefinitions=[
            {"AttributeName": "PK", "AttributeType": "S"},
            {"AttributeName": "SK", "AttributeType": "S"},
            {"AttributeName": "GSI1PK", "AttributeType": "S"},
            {"AttributeName": "GSI1SK", "AttributeType": "S"},
            {"AttributeName": "GSI2PK", "AttributeType": "S"},
            {"AttributeName": "GSI2SK", "AttributeType": "S"},
        ],
        KeySchema=[
            {"AttributeName": "PK", "KeyType": "HASH"},
            {"AttributeName": "SK", "KeyType": "RANGE"},
        ],
        GlobalSecondaryIndexes=[
            {
                "IndexName": "GSI1-circle-listing",
                "KeySchema": [
                    {"AttributeName": "GSI1PK", "KeyType": "HASH"},
                    {"AttributeName": "GSI1SK", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
                "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
            },
            {
                "IndexName": "GSI2-user-posts",
                "KeySchema": [
                    {"AttributeName": "GSI2PK", "KeyType": "HASH"},
                    {"AttributeName": "GSI2SK", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
                "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
            },
        ],
        ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        Tags=[PROJECT_TAG],
    )
    print(f"[created] Table: {TABLE_NAME} with GSI1 (circle listing) + GSI2 (user post history)")
    print("  Provisioned 5/5 RCU/WCU per index — well under the 25/25 free tier ceiling.")


def create_bucket():
    """Private bucket — Block Public Access on, every read goes through a presigned
    URL (see backend/app/services/s3.py). S3 bucket names are globally unique across
    ALL of AWS, so if BUCKET_NAME is taken, edit it in this file AND in
    backend/app/services/s3.py (UNDERTONE_BUCKET env var) to match."""
    try:
        s3.head_bucket(Bucket=BUCKET_NAME)
        print(f"[skip] Bucket '{BUCKET_NAME}' already exists")
        return
    except ClientError:
        pass

    kwargs = {"Bucket": BUCKET_NAME}
    if REGION != "us-east-1":
        kwargs["CreateBucketConfiguration"] = {"LocationConstraint": REGION}

    s3.create_bucket(**kwargs)
    s3.put_public_access_block(
        Bucket=BUCKET_NAME,
        PublicAccessBlockConfiguration={
            "BlockPublicAcls": True,
            "IgnorePublicAcls": True,
            "BlockPublicPolicy": True,
            "RestrictPublicBuckets": True,
        },
    )
    s3.put_bucket_tagging(Bucket=BUCKET_NAME, Tagging={"TagSet": [PROJECT_TAG]})
    print(f"[created] Bucket: {BUCKET_NAME} (private, all public access blocked)")


def create_websocket_api():
    """
    Provisions the realtime layer: IAM role, Lambda function (from
    infra/lambda/websocket_handler.py), API Gateway WebSocket API with $connect/
    $disconnect/$default routes, and a deployed stage.

    UNVERIFIED FROM THIS SANDBOX — no network path to AWS here (see Phase 11 notes
    in README.md). This function is written carefully but you are the first to
    actually run it. If something's off, the most likely culprits are IAM
    propagation delay (the role needs a few seconds before Lambda can assume it —
    this function retries once) or a region-specific API shape difference.
    """
    import zipfile
    import io
    import time as _time

    role_name = "undertone-websocket-lambda-role"
    function_name = "undertone-websocket-handler"
    api_name = "undertone-websocket-api"

    # --- IAM role ---
    try:
        role = iam.get_role(RoleName=role_name)
        role_arn = role["Role"]["Arn"]
        print(f"[skip] IAM role '{role_name}' already exists")
    except ClientError:
        trust_policy = {
            "Version": "2012-10-17",
            "Statement": [{"Effect": "Allow", "Principal": {"Service": "lambda.amazonaws.com"}, "Action": "sts:AssumeRole"}],
        }
        role = iam.create_role(RoleName=role_name, AssumeRolePolicyDocument=json.dumps(trust_policy), Tags=[PROJECT_TAG])
        role_arn = role["Role"]["Arn"]
        iam.attach_role_policy(RoleName=role_name, PolicyArn="arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole")
        iam.attach_role_policy(RoleName=role_name, PolicyArn="arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess")
        print(f"[created] IAM role: {role_arn}")
        print("  Waiting 10s for IAM role propagation before creating the Lambda...")
        _time.sleep(10)

    # --- Lambda function ---
    lambda_source_path = os.path.join(os.path.dirname(__file__), "..", "lambda", "websocket_handler.py")
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.write(lambda_source_path, arcname="websocket_handler.py")
    zip_bytes = buf.getvalue()

    try:
        existing = lambda_client.get_function(FunctionName=function_name)
        function_arn = existing["Configuration"]["FunctionArn"]
        lambda_client.update_function_code(FunctionName=function_name, ZipFile=zip_bytes)
        print(f"[updated] Lambda function code: {function_name}")
    except ClientError:
        created = lambda_client.create_function(
            FunctionName=function_name,
            Runtime="python3.12",
            Role=role_arn,
            Handler="websocket_handler.lambda_handler",
            Code={"ZipFile": zip_bytes},
            Timeout=10,
            MemorySize=128,
            Environment={"Variables": {"UNDERTONE_TABLE": TABLE_NAME}},
            Tags={"Project": "Undertone"},
        )
        function_arn = created["FunctionArn"]
        print(f"[created] Lambda function: {function_arn}")

    # --- API Gateway WebSocket API ---
    existing_apis = apigatewayv2.get_apis()["Items"]
    api = next((a for a in existing_apis if a["Name"] == api_name), None)

    if api:
        api_id = api["ApiId"]
        print(f"[skip] WebSocket API '{api_name}' already exists: {api_id}")
    else:
        api = apigatewayv2.create_api(Name=api_name, ProtocolType="WEBSOCKET", RouteSelectionExpression="$request.body.action")
        api_id = api["ApiId"]
        print(f"[created] WebSocket API: {api_id}")

        integration = apigatewayv2.create_integration(
            ApiId=api_id,
            IntegrationType="AWS_PROXY",
            IntegrationUri=f"arn:aws:apigateway:{REGION}:lambda:path/2015-03-31/functions/{function_arn}/invocations",
        )
        integration_id = integration["IntegrationId"]

        for route_key in ("$connect", "$disconnect", "$default"):
            apigatewayv2.create_route(ApiId=api_id, RouteKey=route_key, Target=f"integrations/{integration_id}")

        lambda_client.add_permission(
            FunctionName=function_name,
            StatementId=f"apigateway-invoke-{api_id}",
            Action="lambda:InvokeFunction",
            Principal="apigateway.amazonaws.com",
            SourceArn=f"arn:aws:execute-api:{REGION}:{_account_id()}:{api_id}/*",
        )

        apigatewayv2.create_stage(ApiId=api_id, StageName="prod", AutoDeploy=True)
        print("[created] Stage 'prod' (auto-deploy on)")

    ws_url = f"wss://{api_id}.execute-api.{REGION}.amazonaws.com/prod"
    management_url = f"https://{api_id}.execute-api.{REGION}.amazonaws.com/prod"
    print(f"\nWebSocket URL (for web/mobile clients, NEXT_PUBLIC_WS_URL): {ws_url}")
    print(f"Management API endpoint (for the Flask backend, WEBSOCKET_API_ENDPOINT env var): {management_url}")


def create_ecs_service():
    """
    Provisions the backend's actual runtime: ECS cluster, task execution role,
    CloudWatch log group, task definition, and a Fargate service with a public
    IP (no Application Load Balancer — ALB has an hourly charge with no free
    tier; a bare public IP costs nothing extra but means the backend's address
    changes on every redeploy. Documented trade-off, not an oversight — the
    upgrade path to ALB + Route53 is a one-paragraph note in README.md, not
    built here, since it would break the free-tier story for a portfolio project).

    Smallest possible Fargate task size (0.25 vCPU / 0.5 GB) per
    infra/free-tier-limits.md's cost-risk flag on ECS.

    UNVERIFIED FROM THIS SANDBOX — no network path to AWS here. Written
    carefully against documented ECS/EC2 API shapes; you are the first to
    actually run it.
    """
    cluster_name = "undertone-cluster"
    service_name = "undertone-backend-service"
    task_family = "undertone-backend"
    log_group = "/ecs/undertone-backend"
    exec_role_name = "undertone-ecs-execution-role"

    # --- Cluster ---
    clusters = ecs.describe_clusters(clusters=[cluster_name])["clusters"]
    if clusters and clusters[0]["status"] == "ACTIVE":
        print(f"[skip] ECS cluster '{cluster_name}' already exists")
    else:
        ecs.create_cluster(clusterName=cluster_name, tags=[{"key": "Project", "value": "Undertone"}])
        print(f"[created] ECS cluster: {cluster_name}")

    # --- Task execution role ---
    try:
        role = iam.get_role(RoleName=exec_role_name)
        exec_role_arn = role["Role"]["Arn"]
        print(f"[skip] IAM role '{exec_role_name}' already exists")
    except ClientError:
        trust_policy = {
            "Version": "2012-10-17",
            "Statement": [{"Effect": "Allow", "Principal": {"Service": "ecs-tasks.amazonaws.com"}, "Action": "sts:AssumeRole"}],
        }
        role = iam.create_role(RoleName=exec_role_name, AssumeRolePolicyDocument=json.dumps(trust_policy), Tags=[PROJECT_TAG])
        exec_role_arn = role["Role"]["Arn"]
        iam.attach_role_policy(RoleName=exec_role_name, PolicyArn="arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy")
        # Task itself needs DynamoDB/S3/Rekognition/Polly access too — reusing the
        # execution role for simplicity at this scale rather than a separate task role.
        iam.attach_role_policy(RoleName=exec_role_name, PolicyArn="arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess")
        iam.attach_role_policy(RoleName=exec_role_name, PolicyArn="arn:aws:iam::aws:policy/AmazonS3FullAccess")
        iam.attach_role_policy(RoleName=exec_role_name, PolicyArn="arn:aws:iam::aws:policy/AmazonRekognitionFullAccess")
        iam.attach_role_policy(RoleName=exec_role_name, PolicyArn="arn:aws:iam::aws:policy/AmazonPollyFullAccess")
        print(f"[created] IAM role: {exec_role_arn}")
        print("  Waiting 10s for IAM role propagation...")
        import time as _time
        _time.sleep(10)

    # --- CloudWatch log group ---
    try:
        logs_client.create_log_group(logGroupName=log_group)
        print(f"[created] Log group: {log_group}")
    except ClientError as e:
        if e.response["Error"]["Code"] != "ResourceAlreadyExistsException":
            raise
        print(f"[skip] Log group '{log_group}' already exists")

    # --- Networking: default VPC, its subnets, and a security group for port 5000 ---
    vpcs = ec2.describe_vpcs(Filters=[{"Name": "is-default", "Values": ["true"]}])["Vpcs"]
    if not vpcs:
        print("[error] No default VPC found — create one or adjust this script to use a specific VPC.")
        return
    vpc_id = vpcs[0]["VpcId"]
    subnets = [s["SubnetId"] for s in ec2.describe_subnets(Filters=[{"Name": "vpc-id", "Values": [vpc_id]}])["Subnets"]]

    sg_name = "undertone-backend-sg"
    existing_sgs = ec2.describe_security_groups(
        Filters=[{"Name": "group-name", "Values": [sg_name]}, {"Name": "vpc-id", "Values": [vpc_id]}]
    )["SecurityGroups"]
    if existing_sgs:
        sg_id = existing_sgs[0]["GroupId"]
        print(f"[skip] Security group '{sg_name}' already exists: {sg_id}")
    else:
        sg = ec2.create_security_group(GroupName=sg_name, Description="Undertone backend - inbound 5000", VpcId=vpc_id)
        sg_id = sg["GroupId"]
        ec2.authorize_security_group_ingress(
            GroupId=sg_id,
            IpPermissions=[{"IpProtocol": "tcp", "FromPort": 5000, "ToPort": 5000, "IpRanges": [{"CidrIp": "0.0.0.0/0"}]}],
        )
        print(f"[created] Security group: {sg_id} (inbound 5000 open — fine for a portfolio demo, tighten for real production)")

    # --- Task definition ---
    account_id = _account_id()
    image_uri = f"{account_id}.dkr.ecr.{REGION}.amazonaws.com/{ECR_REPO_NAME}:latest"

    ecs.register_task_definition(
        family=task_family,
        requiresCompatibilities=["FARGATE"],
        networkMode="awsvpc",
        cpu="256",  # 0.25 vCPU — smallest Fargate size
        memory="512",  # 0.5 GB
        executionRoleArn=exec_role_arn,
        taskRoleArn=exec_role_arn,
        containerDefinitions=[
            {
                "name": "undertone-backend",
                "image": image_uri,
                "portMappings": [{"containerPort": 5000, "protocol": "tcp"}],
                "environment": [
                    {"name": "AWS_REGION", "value": REGION},
                    {"name": "UNDERTONE_TABLE", "value": TABLE_NAME},
                    {"name": "UNDERTONE_BUCKET", "value": BUCKET_NAME},
                ],
                "logConfiguration": {
                    "logDriver": "awslogs",
                    "options": {
                        "awslogs-group": log_group,
                        "awslogs-region": REGION,
                        "awslogs-stream-prefix": "backend",
                    },
                },
            }
        ],
    )
    print(f"[registered] Task definition: {task_family} -> {image_uri}")

    # --- Service ---
    services = ecs.describe_services(cluster=cluster_name, services=[service_name])["services"]
    active = [s for s in services if s["status"] == "ACTIVE"]
    if active:
        ecs.update_service(cluster=cluster_name, service=service_name, taskDefinition=task_family, forceNewDeployment=True)
        print(f"[updated] Service '{service_name}' — new deployment forced with latest task definition")
    else:
        ecs.create_service(
            cluster=cluster_name,
            serviceName=service_name,
            taskDefinition=task_family,
            desiredCount=1,
            launchType="FARGATE",
            networkConfiguration={
                "awsvpcConfiguration": {"subnets": subnets, "securityGroups": [sg_id], "assignPublicIp": "ENABLED"}
            },
        )
        print(f"[created] ECS service: {service_name} (1 task, Fargate, public IP)")

    print("\n  Find the running task's public IP via: aws ecs list-tasks --cluster undertone-cluster")
    print("  then: aws ecs describe-tasks ... and look up the ENI's public IP via EC2.")
    print("  That IP is what web/mobile's NEXT_PUBLIC_API_URL / apiUrl should point to.")


def deploy_backend_image(image_tag: str):
    """
    Called by the GitHub Actions backend workflow after pushing a new image.
    Registers a new task definition revision pointing at the SHA-tagged image
    (not ':latest' — traceable, and a bad deploy can be rolled back by pointing
    the service at the previous task definition revision) and updates the
    service to use it.
    """
    account_id = _account_id()
    image_uri = f"{account_id}.dkr.ecr.{REGION}.amazonaws.com/{ECR_REPO_NAME}:{image_tag}"

    current = ecs.describe_task_definition(taskDefinition="undertone-backend")["taskDefinition"]
    container = current["containerDefinitions"][0]
    container["image"] = image_uri

    new_def = ecs.register_task_definition(
        family="undertone-backend",
        requiresCompatibilities=["FARGATE"],
        networkMode="awsvpc",
        cpu=current["cpu"],
        memory=current["memory"],
        executionRoleArn=current["executionRoleArn"],
        taskRoleArn=current.get("taskRoleArn", current["executionRoleArn"]),
        containerDefinitions=[container],
    )
    revision = new_def["taskDefinition"]["revision"]
    print(f"[registered] undertone-backend:{revision} -> {image_uri}")

    ecs.update_service(
        cluster="undertone-cluster",
        service="undertone-backend-service",
        taskDefinition=f"undertone-backend:{revision}",
        forceNewDeployment=True,
    )
    print(f"[deployed] Service updated to task definition revision {revision}")


def create_ecr_repo():
    try:
        ecr.describe_repositories(repositoryNames=[ECR_REPO_NAME])
        print(f"[skip] ECR repo '{ECR_REPO_NAME}' already exists")
        return
    except ClientError as e:
        if e.response["Error"]["Code"] != "RepositoryNotFoundException":
            raise

    ecr.create_repository(
        repositoryName=ECR_REPO_NAME,
        tags=[PROJECT_TAG],
        imageScanningConfiguration={"scanOnPush": True},
    )
    print(f"[created] ECR repo: {ECR_REPO_NAME}")


def up():
    print(f"Provisioning Undertone infra in {REGION} (account {_account_id()})...\n")
    create_user_pool()
    create_table()
    create_bucket()
    create_ecr_repo()
    create_ecs_service()
    create_websocket_api()
    print("\nDone. Remember to set a $1 AWS Budget alert if you haven't already — see infra/free-tier-limits.md")
    print("Note: create_ecs_service() registers a task definition pointing at the ':latest' ECR image tag.")
    print("If this is a fresh account, push an image via the GitHub Actions backend workflow (or manually)")
    print("before the service's task can actually start — an empty ECR repo means the task will fail to launch.")


def status():
    print(f"Undertone infra status — {REGION} (account {_account_id()})\n")

    try:
        pools = cognito.list_user_pools(MaxResults=60)["UserPools"]
        match = next((p for p in pools if p["Name"] == USER_POOL_NAME), None)
        print(f"Cognito User Pool: {'RUNNING — ' + match['Id'] if match else 'not created'}")
    except ClientError as e:
        print(f"Cognito: error checking status ({e})")

    try:
        dynamodb.describe_table(TableName=TABLE_NAME)
        print(f"DynamoDB table '{TABLE_NAME}': RUNNING (billing: within free tier at current provisioned capacity)")
    except ClientError:
        print(f"DynamoDB table '{TABLE_NAME}': not created")

    try:
        s3.head_bucket(Bucket=BUCKET_NAME)
        print(f"S3 bucket '{BUCKET_NAME}': RUNNING (billing: free under 5GB/12mo)")
    except ClientError:
        print(f"S3 bucket '{BUCKET_NAME}': not created")

    try:
        ecr.describe_repositories(repositoryNames=[ECR_REPO_NAME])
        print(f"ECR repo '{ECR_REPO_NAME}': RUNNING (billing: free under 500MB)")
    except ClientError:
        print(f"ECR repo '{ECR_REPO_NAME}': not created")

    try:
        lambda_client.get_function(FunctionName="undertone-websocket-handler")
        apis = apigatewayv2.get_apis()["Items"]
        api = next((a for a in apis if a["Name"] == "undertone-websocket-api"), None)
        print(f"WebSocket API + Lambda: RUNNING{' — ' + api['ApiId'] if api else ''} (billing: Lambda free tier is generous, watch API Gateway WebSocket message volume)")
    except ClientError:
        print("WebSocket API + Lambda: not created")

    try:
        services = ecs.describe_services(cluster="undertone-cluster", services=["undertone-backend-service"])["services"]
        active = [s for s in services if s["status"] == "ACTIVE"]
        if active:
            running = active[0]["runningCount"]
            print(f"ECS service 'undertone-backend-service': RUNNING ({running}/{active[0]['desiredCount']} tasks) — billing: Fargate has no free tier, this is the main cost driver, keep desiredCount at 1")
        else:
            print("ECS service 'undertone-backend-service': not created")
    except ClientError:
        print("ECS service 'undertone-backend-service': not created (cluster may not exist)")


def down():
    confirm = input("This will delete the Cognito pool, DynamoDB table, and ECR repo. Type 'yes' to confirm: ")
    if confirm.strip().lower() != "yes":
        print("Aborted.")
        return

    try:
        pools = cognito.list_user_pools(MaxResults=60)["UserPools"]
        match = next((p for p in pools if p["Name"] == USER_POOL_NAME), None)
        if match:
            cognito.delete_user_pool(UserPoolId=match["Id"])
            print(f"[deleted] User pool: {match['Id']}")
    except ClientError as e:
        print(f"[error] Cognito teardown: {e}")

    try:
        dynamodb.delete_table(TableName=TABLE_NAME)
        print(f"[deleted] Table: {TABLE_NAME}")
    except ClientError as e:
        print(f"[error] DynamoDB teardown: {e}")

    try:
        objects = s3.list_objects_v2(Bucket=BUCKET_NAME).get("Contents", [])
        if objects:
            s3.delete_objects(Bucket=BUCKET_NAME, Delete={"Objects": [{"Key": o["Key"]} for o in objects]})
        s3.delete_bucket(Bucket=BUCKET_NAME)
        print(f"[deleted] Bucket: {BUCKET_NAME}")
    except ClientError as e:
        print(f"[error] S3 teardown: {e}")

    try:
        ecr.delete_repository(repositoryName=ECR_REPO_NAME, force=True)
        print(f"[deleted] ECR repo: {ECR_REPO_NAME}")
    except ClientError as e:
        print(f"[error] ECR teardown: {e}")

    try:
        apis = apigatewayv2.get_apis()["Items"]
        api = next((a for a in apis if a["Name"] == "undertone-websocket-api"), None)
        if api:
            apigatewayv2.delete_api(ApiId=api["ApiId"])
            print(f"[deleted] WebSocket API: {api['ApiId']}")
        lambda_client.delete_function(FunctionName="undertone-websocket-handler")
        print("[deleted] Lambda function: undertone-websocket-handler")
    except ClientError as e:
        print(f"[error] WebSocket/Lambda teardown: {e}")
    print("  Note: the IAM role 'undertone-websocket-lambda-role' is NOT auto-deleted — remove it manually via IAM console if you want it fully gone.")

    try:
        services = ecs.describe_services(cluster="undertone-cluster", services=["undertone-backend-service"])["services"]
        if services and services[0]["status"] == "ACTIVE":
            ecs.update_service(cluster="undertone-cluster", service="undertone-backend-service", desiredCount=0)
            ecs.delete_service(cluster="undertone-cluster", service="undertone-backend-service")
            print("[deleted] ECS service: undertone-backend-service (this is the important one for cost — Fargate has no free tier)")
        ecs.delete_cluster(cluster="undertone-cluster")
        print("[deleted] ECS cluster: undertone-cluster")
    except ClientError as e:
        print(f"[error] ECS teardown: {e}")
    print("  Note: the IAM role 'undertone-ecs-execution-role' and the security group 'undertone-backend-sg' are NOT auto-deleted.")

    print("\nDone. Remember to also check the ECS console for any running Fargate tasks (Phase 19+).")


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "deploy":
        deploy_backend_image(sys.argv[2])
        sys.exit(0)

    if len(sys.argv) != 2 or sys.argv[1] not in ("up", "status", "down"):
        print(__doc__)
        print("\nAlso: python manage.py deploy <image_tag>  — used by the backend GitHub Actions workflow")
        sys.exit(1)

    {"up": up, "status": status, "down": down}[sys.argv[1]]()
