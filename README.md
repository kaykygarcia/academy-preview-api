# AWS PR Preview Environments

A small CI/CD project that creates temporary preview environments for pull requests using GitHub Actions, Amazon ECR, ECS Fargate, and Terraform. A separate dashboard shows active previews and their deployment status.

- **API and infrastructure:** [academy-preview-api](https://github.com/kaykygarcia/academy-preview-api)
- **Dashboard:** [academy-preview-dashboard](https://github.com/kaykygarcia/academy-preview-dashboard)
- **Live dashboard:** [academy.kaykygarcia.dev](https://academy.kaykygarcia.dev)

## How it works

1. A pull request to `main` starts an unprivileged GitHub Actions workflow that tests the Node.js API, builds a Docker image, and uploads the build artifact.
2. A separate deployment controller validates the PR, commit, and artifact. Using GitHub OIDC for temporary AWS credentials, it publishes the image to ECR and creates or updates a PR-specific ECS Fargate service.
3. After the ECS task becomes healthy, the controller records the preview URL and status in GitHub Deployments.
4. The Cloudflare Pages dashboard reads PR and deployment information through a server-side function and the GitHub REST API. It does **not** manage AWS resources or query ECS directly.
5. Closing the PR triggers cleanup of its ECS service and marks the corresponding GitHub Deployments as `inactive`.

Each preview runs one ECS task, tied to a specific image digest. The base ECS service has a desired count of zero, so it is not intended to run continuously.

## Architecture and access

The AWS resources run in `us-east-1`, in a VPC with one public subnet. Preview tasks use Fargate `awsvpc` networking and public IPs, with application logs sent to CloudWatch Logs. Terraform defines the network and ECS baseline; the controller handles individual PR preview services.

Preview endpoints use `http://<task-public-ip>:3000`. The Security Group limits inbound TCP port `3000` to the CIDR configured in Terraform. There is no load balancer, stable preview hostname, or HTTPS endpoint for the preview application.

The dashboard is hosted on Cloudflare Pages. Its `GET /api/overview` function uses a server-side `GITHUB_TOKEN` to read GitHub PRs, deployments, and statuses, with a 25-second cache for successful responses. It reflects GitHub's last recorded deployment status rather than continuously checking task health.

## Security decisions

- The PR build has no AWS credentials; deployment happens in a separate, privileged controller after validating the artifact and PR identity.
- GitHub Actions assumes AWS roles through OIDC instead of storing long-lived AWS access keys.
- The dashboard's GitHub token remains in Cloudflare's server-side environment, and the dashboard has no AWS access.
- Each preview's network exposure is restricted by its Security Group rule.

## Limitations

This is a learning project, not a production-grade hosting platform. A preview has a single task in one Availability Zone, so it is not highly available. Its public IP can change after redeployment, and preview traffic uses HTTP rather than HTTPS.

Terraform does not currently provision every prerequisite: ECR and the GitHub OIDC/IAM roles were set up separately. Closing a PR removes its ECS service but does not automatically purge old ECR images or ECS task-definition revisions. A successful GitHub Deployment records the controller's health check at deployment time; it does not guarantee continued reachability.

## Local use and Terraform

Run the API tests with `npm test` and build the image with `docker build -t academy-preview-api:local .`. In the dashboard repository, run `npm run check`.

For the existing lab, `./scripts/terraform-apply.sh` detects your public IPv4, lets you choose the allowed address, displays a Terraform plan, and asks before applying. It requires an authenticated AWS CLI profile (`academy` by default), Terraform, curl, and the existing `infra/terraform.tfstate`. The script refuses to run without that local state to avoid unintentionally creating duplicate infrastructure. It is **not** a fresh-install/bootstrap script.

The `allowed_cidr` is passed at runtime and is not hard-coded into Git. A `/32` rule authorizes an IPv4 *source address*, not a particular computer; devices behind the same NAT may share that source address. If the public IP changes, update the Security Group using Terraform or an explicitly reviewed manual change.

When the lab is no longer needed, closing a PR removes only that PR's ECS service. The shared Terraform-managed infrastructure, task-definition revisions, and ECR images require a separate teardown/cleanup. Avoid publishing Terraform state or AWS credentials.

## Implementation references

- [PR build](https://github.com/kaykygarcia/academy-preview-api/blob/main/.github/workflows/preview-build.yml)
- [Preview deployment and cleanup controller](https://github.com/kaykygarcia/academy-preview-api/blob/main/.github/workflows/preview-controller.yml)
- [Main CI workflow](https://github.com/kaykygarcia/academy-preview-api/blob/main/.github/workflows/ci.yml)
- [Terraform infrastructure](https://github.com/kaykygarcia/academy-preview-api/tree/main/infra)
- [Dashboard API function](https://github.com/kaykygarcia/academy-preview-dashboard/blob/main/functions/api/overview.js)
