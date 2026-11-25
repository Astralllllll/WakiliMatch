<#
  scripts/demo_queries.ps1 (brief section A6)

  Runs the six demo-flow queries from docs/DEMO.md and prints the status
  each one returns. Steps 1, 2, 4, 5, 6 go through the real Express
  pipeline (POST /api/issues -> POST /api/matches/generate), exactly as the
  web app does. Step 3 (empty input) calls the AI service's own
  POST /api/match-lawyers directly, because the web app's own case-
  submission form already rejects an empty description before it would
  ever reach the AI service - see docs/DEMO.md for why that's correct
  behaviour, not a gap this script is working around.

  Requires the full local stack already running:
    - PostgreSQL with legalmatch/database/database.sql (+ migrations) applied
    - ai-service:  python -m uvicorn main:app --host 127.0.0.1 --port 8000
    - legalmatch:  node server.js
  and INTERNAL_API_KEY set in the current session to the same value as
  ai-service/.env (only needed for step 3, which talks to the AI service
  directly; steps 1/2/4/5/6 go through Express, which already knows the key).
#>

param(
    [string]$ExpressUrl = "http://localhost:5000",
    [string]$AiServiceUrl = "http://localhost:8000"
)

$ErrorActionPreference = "Stop"

$DemoEmail = "demo.client@wakilimatch.test"
$DemoPassword = "DemoPassword123!"

function Get-DemoClient {
    $registerBody = @{
        fullName = "Demo Client"
        email    = $DemoEmail
        phone    = "0700000000"
        password = $DemoPassword
    } | ConvertTo-Json

    try {
        $res = Invoke-RestMethod -Uri "$ExpressUrl/api/auth/client/register" -Method Post -Body $registerBody -ContentType "application/json"
        return $res.user
    } catch {
        # Already registered from a previous demo run - log in instead.
        $loginBody = @{ email = $DemoEmail; password = $DemoPassword } | ConvertTo-Json
        $res = Invoke-RestMethod -Uri "$ExpressUrl/api/auth/client/login" -Method Post -Body $loginBody -ContentType "application/json"
        return $res.user
    }
}

function Show-ExpressQuery {
    param($Label, $Text, $Category, $ClientId)

    Write-Host "=== $Label ===" -ForegroundColor Cyan
    Write-Host "Query: `"$Text`""

    $issueBody = @{
        client_id          = $ClientId
        issue_title        = $Label
        issue_description  = $Text
        legal_category     = $Category
    } | ConvertTo-Json

    try {
        $issueRes = Invoke-RestMethod -Uri "$ExpressUrl/api/issues" -Method Post -Body $issueBody -ContentType "application/json"
        $issueId = $issueRes.issue.issue_id

        $matchBody = @{
            client_id  = $ClientId
            issue_id   = $issueId
            issue_text = $Text
        } | ConvertTo-Json

        $matchRes = Invoke-RestMethod -Uri "$ExpressUrl/api/matches/generate" -Method Post -Body $matchBody -ContentType "application/json"

        $status = if ($matchRes.status) { $matchRes.status } else { "success" }
        Write-Host "Status: $status"
        if ($matchRes.message) { Write-Host "Message: $($matchRes.message)" }
        if ($matchRes.matches) { Write-Host "Matches returned: $($matchRes.matches.Count)" }
        if ($matchRes.xai -and $matchRes.xai.explanation) { Write-Host "XAI: $($matchRes.xai.explanation)" }
    } catch {
        Write-Host "Request failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

function Show-AiServiceQuery {
    param($Label, $Text)

    Write-Host "=== $Label (calling the AI service directly) ===" -ForegroundColor Cyan
    Write-Host "Query: `"$Text`""

    if (-not $env:INTERNAL_API_KEY) {
        Write-Host "INTERNAL_API_KEY is not set in this session - set it to the same value as ai-service/.env and re-run." -ForegroundColor Red
        Write-Host ""
        return
    }

    $body = @{ user_query = $Text } | ConvertTo-Json
    try {
        $res = Invoke-RestMethod -Uri "$AiServiceUrl/api/match-lawyers" -Method Post `
            -Headers @{ "X-Internal-Key" = $env:INTERNAL_API_KEY } -Body $body -ContentType "application/json"
        Write-Host "Status: $($res.status)"
        if ($res.message) { Write-Host "Message: $($res.message)" }
    } catch {
        Write-Host "Request failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "Logging in demo client..."
$client = Get-DemoClient
Write-Host "Demo client id: $($client.id)"
Write-Host ""

Show-ExpressQuery -Label "1. Valid query (Employment)" `
    -Text "I was dismissed from my job without notice and they refused to pay my terminal dues" `
    -Category "employment" -ClientId $client.id

Show-ExpressQuery -Label "2. Valid query, different area (Family & Succession)" `
    -Text "My father died without a will and my uncles are taking his property" `
    -Category "family" -ClientId $client.id

Show-AiServiceQuery -Label "3. Empty input" -Text ""

Show-ExpressQuery -Label "4. Gibberish" `
    -Text "asdfgh qwerty zxcvb" -Category "employment" -ClientId $client.id

Show-ExpressQuery -Label "5. Off-topic" `
    -Text "How do I cook pilau for ten people" -Category "employment" -ClientId $client.id

Show-ExpressQuery -Label "6. Valid query (XAI card walkthrough)" `
    -Text "My landlord locked my shop because I was late with rent" -Category "property" -ClientId $client.id
