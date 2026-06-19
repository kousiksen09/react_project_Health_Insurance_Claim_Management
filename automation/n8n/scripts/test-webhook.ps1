# Test the Bugfix Webhook Demo workflow (n8n must be running and workflow ACTIVE).
#
# Usage:
#   .\test-webhook.ps1
#   .\test-webhook.ps1 -Message "status run_20260618_120000_abc123"

param(
  [string]$WebhookUrl = "http://localhost:5678/webhook/bugfix-demo",
  [string]$Message = @"
[BUG] Notification label shows ClaimSubmitted

component: frontend
area: healthinsuranceclaim_frontend/src/features/notifications/components/NotificationsPage.tsx

On /notifications the type chip shows ClaimSubmitted instead of Claim Submitted.
"@
)

$body = @{ message = $Message } | ConvertTo-Json -Depth 5

Write-Host "POST $WebhookUrl"
Write-Host ""

$response = Invoke-RestMethod -Method Post -Uri $WebhookUrl -ContentType "application/json" -Body $body

if ($response.response) {
  Write-Host $response.response
} else {
  $response | ConvertTo-Json -Depth 10
}
