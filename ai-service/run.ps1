# Runs the AI service locally with a dedicated virtual environment.
# First-time setup:
#   cd ai-service
#   py -3.13 -m venv .venv
#   .\run.ps1 -Setup
# Subsequent runs:
#   .\run.ps1
param(
    [switch]$Setup
)

$venvPython = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "No .venv found - creating one with 'py -3.13 -m venv .venv' ..."
    py -3.13 -m venv (Join-Path $PSScriptRoot ".venv")
}

if ($Setup) {
    & $venvPython -m pip install --upgrade pip
    & $venvPython -m pip install -r (Join-Path $PSScriptRoot "requirements.txt")
    if (-not (Test-Path (Join-Path $PSScriptRoot ".env"))) {
        Copy-Item (Join-Path $PSScriptRoot ".env.example") (Join-Path $PSScriptRoot ".env")
        Write-Host "Created .env from .env.example - edit INTERNAL_API_KEY before running Express against this service."
    }
    Write-Host "Setup complete. Run '.\build_index.py' to build the index, then '.\run.ps1' to start the server."
    exit 0
}

if (-not (Test-Path (Join-Path $PSScriptRoot "artifacts\engine_meta.json"))) {
    Write-Host "No artifacts found under .\artifacts - run:"
    Write-Host "  $venvPython build_index.py"
    Write-Host "before starting the server, or /health and /match will report the index as not loaded."
}

& $venvPython -m uvicorn main:app --host 127.0.0.1 --port 8000 --app-dir $PSScriptRoot
