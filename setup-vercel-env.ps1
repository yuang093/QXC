# QXC Vercel Environment Variables Batch Setup Script
# Usage: .\setup-vercel-env.ps1

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  QXC Vercel Environment Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check vercel CLI
$vercel = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercel) {
  Write-Host "[X] vercel CLI not installed" -ForegroundColor Red
  Write-Host "    Run: npm install -g vercel" -ForegroundColor Yellow
  exit 1
}

# Check login
Write-Host "[1/6] Checking vercel login status..." -ForegroundColor Yellow
$whoami = vercel whoami 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "    Not logged in. Starting login flow..." -ForegroundColor Yellow
  vercel login
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[X] Login failed" -ForegroundColor Red
    exit 1
  }
}
Write-Host "    [V] Logged in: $whoami" -ForegroundColor Green
Write-Host ""

# Link project (skip if already linked via .vercel folder)
Write-Host "[2/6] Checking project link..." -ForegroundColor Yellow
if (Test-Path .vercel/project.json) {
  $projectInfo = Get-Content .vercel/project.json | ConvertFrom-Json
  Write-Host "    [V] Already linked to project: $($projectInfo.projectId)" -ForegroundColor Green
} else {
  Write-Host "    Linking project (interactive, may ask questions)..." -ForegroundColor Yellow
  $linkResult = vercel link --yes 2>&1
  Write-Host "    $linkResult" -ForegroundColor Gray
}
Write-Host ""

# List existing
Write-Host "[3/6] Listing existing environment variables..." -ForegroundColor Yellow
vercel env ls
Write-Host ""

# GITHUB_TOKEN
Write-Host "[4/6] Setting GITHUB_TOKEN" -ForegroundColor Yellow
Write-Host "    Please paste your GitHub Personal Access Token (needs Contents permission)" -ForegroundColor Gray
Write-Host "    Note: input will be hidden" -ForegroundColor Gray
$token = Read-Host "    Token"
if ([string]::IsNullOrWhiteSpace($token)) {
  Write-Host "    [!] Skipped GITHUB_TOKEN (empty)" -ForegroundColor Yellow
} else {
  vercel env rm GITHUB_TOKEN production --yes 2>$null | Out-Null
  $token | vercel env add GITHUB_TOKEN production --yes 2>&1 | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "    [V] GITHUB_TOKEN set" -ForegroundColor Green
  } else {
    Write-Host "    [X] GITHUB_TOKEN failed" -ForegroundColor Red
  }
}
Write-Host ""

# Other env vars
Write-Host "[5/6] Setting other environment variables..." -ForegroundColor Yellow
$envVars = @(
  @{ name = "GITHUB_REPO";     value = "yuang093/QXC";  sensitive = "no" },
  @{ name = "GITHUB_BRANCH";   value = "main";            sensitive = "no" },
  @{ name = "GITHUB_PATH";     value = "data/data.json";  sensitive = "no" },
  @{ name = "ADMIN_PASSWORD";  value = "yuang093";        sensitive = "yes" }
)

foreach ($env in $envVars) {
  $name = $env.name
  $value = $env.value

  Write-Host "    Setting $name..." -ForegroundColor Gray
  vercel env rm $name production --yes 2>$null | Out-Null
  $value | vercel env add $name production --yes 2>&1 | Out-Null

  if ($LASTEXITCODE -eq 0) {
    Write-Host "    [V] $name = $value" -ForegroundColor Green
  } else {
    Write-Host "    [X] $name failed" -ForegroundColor Red
  }
}
Write-Host ""

# Verify
Write-Host "[6/6] Verifying..." -ForegroundColor Yellow
Write-Host "    Current environment variables:" -ForegroundColor Gray
vercel env ls
Write-Host ""

# Deploy
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to cancel, or" -ForegroundColor Gray
$deploy = Read-Host "Deploy to Production now? (y/n)"
if ($deploy -eq "y" -or $deploy -eq "Y") {
  Write-Host "Deploying..." -ForegroundColor Yellow
  vercel --prod
} else {
  Write-Host "Skipped deploy. Run later: vercel --prod" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[V] Done!" -ForegroundColor Green
