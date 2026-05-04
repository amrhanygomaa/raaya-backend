# ============================================
# Raaya Sprint 1 - Test Script for Windows
# شغّله في PowerShell
# ============================================

$PASS = 0; $FAIL = 0; $WARN = 0

function ok($msg) { Write-Host "  [PASS] $msg" -ForegroundColor Green; $global:PASS++ }
function fail($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red; $global:FAIL++ }
function warn($msg) { Write-Host "  [WARN] $msg" -ForegroundColor Yellow; $global:WARN++ }
function info($msg) { Write-Host "  [INFO] $msg" -ForegroundColor Cyan }
function section($msg) {
  Write-Host ""
  Write-Host "==============================" -ForegroundColor Blue
  Write-Host " $msg"                          -ForegroundColor Blue
  Write-Host "==============================" -ForegroundColor Blue
}

Write-Host ""
Write-Host "  Raaya Sprint 1 - Test Runner (Windows)" -ForegroundColor Cyan
Write-Host ""

$EC2_IP = Read-Host "  EC2 Public IP او Elastic IP"
$AWS_REGION = Read-Host "  AWS Region (Enter = us-east-1)"
if (!$AWS_REGION) { $AWS_REGION = "us-east-1" }
$ECR_REPO = Read-Host "  ECR repo name (Enter = raaya-backend)"
if (!$ECR_REPO) { $ECR_REPO = "raaya-backend" }

# ── 1. AWS CLI ─────────────────────────────
section "1 - AWS CLI & Credentials"

if (Get-Command aws -ErrorAction SilentlyContinue) {
  ok "AWS CLI متثبت"
  $identity = aws sts get-caller-identity 2>&1
  if ($identity -match "Account") {
    $account = ($identity | ConvertFrom-Json).Account
    ok "AWS Credentials شغالة — Account: $account"
    $ECR_REGISTRY = "$account.dkr.ecr.$AWS_REGION.amazonaws.com"
  }
  else {
    fail "AWS Credentials مش شغالة — $identity"
    $ECR_REGISTRY = "ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com"
  }
}
else {
  fail "AWS CLI مش متثبت — حمّله من https://aws.amazon.com/cli/"
  $ECR_REGISTRY = ""
}

# ── 2. ECR ─────────────────────────────────
section "2 - ECR Repository"

$ecr = aws ecr describe-repositories --repository-names $ECR_REPO --region $AWS_REGION 2>&1
if ($ecr -match "repositoryUri") {
  ok "ECR repository موجود"
  $imgs = aws ecr list-images --repository-name $ECR_REPO --region $AWS_REGION 2>&1
  if ($imgs -match "imageTag") {
    ok "في Docker images في ECR — CI/CD اشتغل"
  }
  else {
    warn "ECR موجود بس فاضي — CI/CD لسه ما اشتغلش"
  }
}
else {
  fail "ECR repository '$ECR_REPO' مش موجود"
  info "اعمله: aws ecr create-repository --repository-name $ECR_REPO --region $AWS_REGION"
}

# ── 3. EC2 Ports ───────────────────────────
section "3 - EC2 Connectivity"

if (!$EC2_IP) {
  fail "ما حطيتش IP"
}
else {
  # Port 22
  $tcp22 = New-Object System.Net.Sockets.TcpClient
  try {
    $tcp22.Connect($EC2_IP, 22); $tcp22.Close()
    ok "Port 22 (SSH) مفتوح"
  }
  catch { fail "Port 22 مغلق — Security Group او EC2 مش شغال" }

  # Port 3000
  $tcp3000 = New-Object System.Net.Sockets.TcpClient
  try {
    $tcp3000.Connect($EC2_IP, 3000); $tcp3000.Close()
    ok "Port 3000 مفتوح"
  }
  catch { fail "Port 3000 مغلق — Security Group او App مش شغال" }
}

# ── 4. Health Endpoint ─────────────────────
section "4 - /health Endpoint"

if ($EC2_IP) {
  try {
    $resp = Invoke-WebRequest -Uri "http://$EC2_IP`:3000/health" `
      -TimeoutSec 5 -ErrorAction Stop
    ok "/health رجّع $($resp.StatusCode) — $($resp.Content)"
  }
  catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code) { fail "/health رجّع HTTP $code" }
    else { fail "/health: Connection refused — App مش شغال" }
  }
}

# ── 5. Dockerfile ──────────────────────────
section "5 - Dockerfile"

if (Test-Path "Dockerfile") {
  ok "Dockerfile موجود"
  $content = Get-Content "Dockerfile" -Raw
  if ($content -match "FROM node") { ok "بيستخدم Node base image" }
  if ($content -match "npm run build") { ok "فيه build step" }
  else { warn "مفيش 'npm run build' — تأكد إن الـ NestJS بيتبني" }
  if ($content -match "EXPOSE") { ok "EXPOSE موجود" }
}
else {
  fail "Dockerfile مش موجود — شغّل السكريبت من جوه الـ repo"
}

# ── 6. Workflow File ───────────────────────
section "6 - GitHub Actions Workflow"

$wf1 = ".github\workflows\deploy.yml"
$wf2 = ".github\workflows\deploy-workflow.yml"
$wfFile = if (Test-Path $wf1) { $wf1 } elseif (Test-Path $wf2) { $wf2 } else { $null }

if ($wfFile) {
  ok "Workflow موجود: $wfFile"
  $wfc = Get-Content $wfFile -Raw
  foreach ($s in @("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "EC2_HOST", "EC2_SSH_KEY", "ECR_REGISTRY")) {
    if ($wfc -match $s) { ok "Secret مستخدم: $s" }
    else { warn "Secret مش موجود في الـ workflow: $s" }
  }
}
else {
  fail ".github/workflows/deploy.yml مش موجود"
}

# ── 7. gitignore Security ──────────────────
section "7 - Security: .gitignore"

if (Test-Path ".gitignore") {
  ok ".gitignore موجود"
  $gi = Get-Content ".gitignore" -Raw
  foreach ($p in @(".env", "*.pem", "*.csv", "node_modules")) {
    if ($gi -match [regex]::Escape($p)) { ok ".gitignore بيتجاهل $p" }
    else { fail ".gitignore مش بيتجاهل $p — خطر!" }
  }
  # Check if sensitive files are tracked in git
  $trackedPem = git ls-files "*.pem" 2>$null
  $trackedCsv = git ls-files "*.csv" 2>$null
  if ($trackedPem) { fail "ملفات .pem متتبعة في git: $trackedPem" }
  else { ok "مفيش .pem في git" }
  if ($trackedCsv) { fail "ملفات .csv متتبعة في git: $trackedCsv" }
  else { ok "مفيش .csv في git" }
}
else {
  fail ".gitignore مش موجود"
}

# ── Summary ────────────────────────────────
section "النتيجة النهائية"
Write-Host ""
Write-Host "  PASS: $PASS" -ForegroundColor Green
Write-Host "  FAIL: $FAIL" -ForegroundColor Red
Write-Host "  WARN: $WARN" -ForegroundColor Yellow
Write-Host ""
if ($FAIL -eq 0 -and $WARN -eq 0) { Write-Host "  Sprint 1 اتكملت!" -ForegroundColor Green }
elseif ($FAIL -eq 0) { Write-Host "  قريب — في تحذيرات بس مفيش errors" -ForegroundColor Yellow }
else { Write-Host "  في $FAIL حاجة محتاج تصلحها" -ForegroundColor Red }
Write-Host ""