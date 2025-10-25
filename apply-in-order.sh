#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-skillbridge}"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project)}"

# Helper: wait for a pod with label to be Ready
wait_for_pod_ready() {
  local label="$1"
  local ns="$2"
  local timeout=${3:-300} # seconds
  echo "Waiting up to ${timeout}s for a pod with label ${label} in namespace ${ns} to be Ready..."
  end=$((SECONDS + timeout))
  while [ $SECONDS -lt $end ]; do
    pod=$(kubectl -n "$ns" get pods -l "$label" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
    if [ -n "$pod" ]; then
      ready=$(kubectl -n "$ns" get pod "$pod" -o jsonpath='{.status.containerStatuses[0].ready}' 2>/dev/null || echo "false")
      status=$(kubectl -n "$ns" get pod "$pod" -o jsonpath='{.status.phase}' 2>/dev/null || echo "Unknown")
      if [ "$ready" = "true" ] && [ "$status" = "Running" ]; then
        echo "Pod $pod is Ready."
        return 0
      else
        echo "Pod $pod status=$status ready=$ready — sleeping 5s..."
      fi
    else
      echo "No pod found for label ${label} yet — sleeping 5s..."
    fi
    sleep 5
  done
  echo "Timeout waiting for pod with label ${label} to be ready" >&2
  return 1
}

# 0) Ensure namespace exists (idempotent)
kubectl apply -f k8s/namespace.yaml

# 1) Build and push images (Cloud Build)
echo "=== Starting Cloud Build: building & pushing images and applying manifests via cloudbuild.yaml ==="
gcloud builds submit --config cloudbuild.yaml --project="$PROJECT_ID" .

echo "Cloud Build finished. Proceeding to apply k8s in order."

# 2) Apply DB+app bundles (per-service files)
SERVICES=(users availability booking messaging code-review)
for s in "${SERVICES[@]}"; do
  echo "Applying k8s/${s}.yaml ..."
  kubectl apply -f "k8s/${s}.yaml"
done

# 3) Wait for DB pods to be running (headless/statefulsets)
# We assume statefulsets label naming: app: <service>-db
for s in "${SERVICES[@]}"; do
  db_label="app=${s}-db"
  if ! wait_for_pod_ready "$db_label" "$NAMESPACE" 420; then
    echo "DB pod for ${s} did not become ready. Fetching debug info..."
    kubectl -n "$NAMESPACE" get pods -l "$db_label" -o wide || true
    kubectl -n "$NAMESPACE" describe pods -l "$db_label" || true
    exit 1
  fi
done

# 4) Ensure migrations Jobs run (they are included in each file as Job resources)
echo "Applying migration jobs (jobs included in each service file). If jobs already exist, they will be applied again (idempotent)."
for s in "${SERVICES[@]}"; do
  # The Job names are <service>-migrate (users-migrate etc.)
  job_name="${s}-migrate"
  echo "Creating / ensuring job ${job_name} ..."
  # Use apply so it's idempotent
  kubectl apply -f "k8s/${s}.yaml"
  # Wait for job completion
  echo "Waiting for job ${job_name} to complete (timeout 300s)..."
  if ! kubectl -n "$NAMESPACE" wait --for=condition=complete --timeout=300s job/"${job_name}"; then
    echo "Job ${job_name} did not complete. Showing job pods & logs for debugging:"
    kubectl -n "$NAMESPACE" get pods -l job-name="${job_name}" -o wide || true
    pods=$(kubectl -n "$NAMESPACE" get pods -l job-name="${job_name}" -o jsonpath='{.items[*].metadata.name}' || echo "")
    for p in $pods; do
      echo "=== Logs for pod $p ==="
      kubectl -n "$NAMESPACE" logs "$p" || true
    done
    # continue rather than exit to let other jobs run — comment out if you want to fail fast
    # exit 1
  else
    echo "Job ${job_name} completed successfully."
  fi
done

# 5) Re-apply service bundles (deployments exist in bundles, but ensure they are updated)
for s in "${SERVICES[@]}"; do
  echo "Applying k8s/${s}.yaml (to ensure Deployments exist or are updated)..."
  kubectl apply -f "k8s/${s}.yaml"
done

# 6) Wait for app deployments to roll out
for s in "${SERVICES[@]}"; do
  deploy_name="${s}-deployment"
  echo "Waiting for deployment ${deploy_name} rollout..."
  kubectl -n "$NAMESPACE" rollout status deployment/"${deploy_name}" --timeout=300s || {
    echo "Deployment ${deploy_name} failed to rollout. Showing pods & logs:"
    kubectl -n "$NAMESPACE" get pods -l "app=${s}" -o wide || true
    pods=$(kubectl -n "$NAMESPACE" get pods -l "app=${s}" -o jsonpath='{.items[*].metadata.name}' || echo "")
    for p in $pods; do
      echo "=== Logs for pod $p ==="
      kubectl -n "$NAMESPACE" logs "$p" || true
      kubectl -n "$NAMESPACE" describe pod "$p" || true
    done
    # continue to next service
  }
done

# 7) Deploy frontend (apply frontend)
echo "Applying frontend..."
kubectl apply -f k8s/frontend.yaml
kubectl -n "$NAMESPACE" rollout status deployment/frontend-deployment --timeout=300s || true

# 8) Show cluster status summary
echo "=== SUMMARY: pods, services, deployments in namespace ${NAMESPACE} ==="
kubectl -n "$NAMESPACE" get all -o wide

# Show frontend external IP if assigned
echo "Frontend Service (LoadBalancer) status:"
kubectl -n "$NAMESPACE" get svc frontend-lb -o wide

echo "Done. If any step failed, check the logs above and use the debug commands below."
