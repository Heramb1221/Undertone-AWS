# k8s-equivalent/

This folder is a **documented translation layer, not a live deployment**. Undertone runs on ECS/Fargate (see `infra/scripts/manage.py::create_ecs_service`), not Kubernetes — EKS has no free tier (the control plane bills hourly regardless of usage), which conflicts with this project's free-tier-first discipline (see `infra/free-tier-limits.md`). This decision was made explicitly in Phase 11.

These manifests exist so the ECS→Kubernetes translation is real and specific, not hand-waved, for interview conversations about "how would this run on Kubernetes instead":

| File | ECS equivalent | Notes |
|---|---|---|
| `deployment.yaml` | Task definition + service's pod-level config | Same 0.25 vCPU / 0.5 GB sizing, translated to k8s's resource unit conventions |
| `service.yaml` | The service's networking config | Deliberately shows the *better* production pattern (ClusterIP), not a literal mirror of ECS's cost-driven "public IP, no load balancer" setup |
| `ingress.yaml` | Nothing — no ECS equivalent exists in this project | Shows what a stable domain + TLS would look like, since ECS's setup here is a raw IP that changes on redeploy |
| `hpa.yaml` | Nothing — ECS Service Auto Scaling exists but isn't configured | `desiredCount` is pinned at 1 everywhere in this project for free-tier cost control; this shows the k8s-native scaling mechanism for the conversation about how it *would* scale |

## What's NOT translated here, and why

- **IAM**: ECS's task execution role (`undertone-ecs-execution-role`) has no direct k8s equivalent — EKS uses IRSA (IAM Roles for Service Accounts), which requires an OIDC provider association that doesn't exist without a real cluster to attach it to. Not fakeable without EKS actually running.
- **Logging**: ECS's `awslogs` driver ships container logs straight to CloudWatch. Kubernetes containers just write to stdout/stderr; a cluster-level agent (Fluent Bit, Fluentd) does the shipping — that agent's config isn't included here since it's infrastructure-level, not application-level.
- **Secrets**: this project's Flask app currently reads config from plain environment variables (see the Deployment's `env:` block). A real k8s setup would likely use `Secret` objects or an external-secrets operator instead — not shown since the ECS side doesn't do this either yet (also plain environment variables in the task definition).

## If you actually wanted to run this on Kubernetes

You'd need: a real cluster (EKS, or a cheaper option like a self-managed k3s on an EC2 instance — the same idea Phase 1 considered for the WebSocket Lambda's compute, before Lambda made more sense there), `kubectl` configured against it, an image pushed somewhere the cluster can pull from (same ECR repo works fine), and `kubectl apply -f infra/k8s-equivalent/` after replacing `<ACCOUNT_ID>` in `deployment.yaml` and the placeholder domain in `ingress.yaml`.
